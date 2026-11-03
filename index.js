console.log("EDUCARE SERVER FILE IS RUNNING");

import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";
import cors from "cors";
import { createRemoteJWKSet, jwtVerify } from "jose";

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log("Incoming request:", req.method, req.url);
  next();
});

console.log(process.env.DB_USER);

const client = new MongoClient(
  `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@ac-6banjmm-shard-00-00.qbwwzwp.mongodb.net:27017,ac-6banjmm-shard-00-01.qbwwzwp.mongodb.net:27017,ac-6banjmm-shard-00-02.qbwwzwp.mongodb.net:27017/?ssl=true&replicaSet=atlas-kua91i-shard-0&authSource=admin`,
);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const connectedClient = await connectToMongoDB();
const db = connectedClient.db("EducareDB");
console.log("Connected to Database:", db.databaseName);

const users = db.collection("users");
const galleryCollection = db.collection("gallery");
const eventsCollection = db.collection("events");
const joinedEventsCollection = db.collection("joinedEvents");


const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).send({ success: false, message: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).send({ success: false, message: "Unauthorized: Token missing" });
    }

    const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
);

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).send({
        success: false,
        message: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    // Remove trailing slash from CLIENT_URL
const clientUrl = process.env.CLIENT_URL.replace(/\/+$/, "");

// Create JWKS URL
const jwksUrl = `${clientUrl}/api/auth/jwks`;

// Create JWKS once
const JWKS = createRemoteJWKSet(new URL(jwksUrl));

console.log("JWKS URL:", jwksUrl);

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).send({
        success: false,
        message: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).send({
        success: false,
        message: "Token missing",
      });
    }

    // Check whether JWKS endpoint is accessible
    const jwksResponse = await fetch(jwksUrl);

    console.log("JWKS HTTP status:", jwksResponse.status);

    if (!jwksResponse.ok) {
      throw new Error(`JWKS request failed: ${jwksResponse.status}`);
    }

    // Verify JWT
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: clientUrl,
      audience: clientUrl,
    });

    req.user = payload;

    console.log("JWT verified. User email:", payload.email);

    next();
  } catch (error) {
    console.error("JWT ERROR NAME:", error.name);
    console.error("JWT ERROR MESSAGE:", error.message);

    return res.status(403).send({
      success: false,
      message: "Forbidden: Invalid or expired token",
    });
  }
};

app.get("/", (req, res) => {
  res.send("Educare server is working!");
});

// Get all gallery items endpoint (Public)
app.get('/gallery', async (req, res) => {
    const cursor = galleryCollection.find();
    const result = await cursor.toArray();
    res.send(result);
});


app.post('/events', verifyToken, async (req, res) => {
    const newEvent = {
      ...req.body,
      userEmail: req.user.email || req.body.userEmail, // Securely grabbed from token
    };
    
    const eventDate = new Date(newEvent.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (eventDate <= today) {
      return res.status(400).send({ success: false, message: "Event date cannot be in the past." });
    }

    const result = await eventsCollection.insertOne(newEvent);
    res.send({ success: true, insertedId: result.insertedId });
    console.log("New event created by:", newEvent.userEmail);
});


app.get('/events/recent', async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const recentEvents = await db.collection("events")
      .find({ date: { $gte: today.toISOString().split("T")[0] } })
      .sort({ date: 1 })
      .limit(6)
      .toArray();

    res.send(recentEvents);
});


app.get('/events', async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const formattedToday = new Date().toISOString().slice(0, 10);

    const upcomingEvents = await eventsCollection
      .find({ date: { $gte: formattedToday } })
      .sort({ date: 1 })
      .toArray();

    res.send(upcomingEvents);
});


app.get("/events/user", verifyToken, async (req, res) => {
  try {
    const email = req.user.email; // Grab securely from verified token

   const userEvents = await db
     .collection("events")
     .find({ userEmail: email })
     .sort({ createdAt: -1 })
     .toArray();

   res.send(userEvents);
 } catch (error) {
   console.error("Error fetching user events:", error);
   res.status(500).send({
     success: false,
     message: "Failed to fetch events.",
   });
 }
});


app.get('/events/:id', async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };

  const result = await eventsCollection.findOne(query);
  res.send(result);
});


app.post("/joined-events", verifyToken, async (req, res) => {
    const {
      eventId,
      userName,
      eventTitle,
      eventDate,
      location,
      thumbnail,
    } = req.body;

    const userEmail = req.user.email; // Securely verified from token

    const alreadyJoined = await joinedEventsCollection.findOne({
      eventId,
      userEmail,
    });

    if (alreadyJoined) {
      return res.status(400).send({
        success: false,
        message: "You have already joined this event!",
      });
    }

    const joinedEvent = {
      eventId,
      userEmail,
      userName,
      eventTitle,
      eventDate,
      location,
      thumbnail,
      joinedAt: new Date(),
    };

    await joinedEventsCollection.insertOne(joinedEvent);

    res.send({
      success: true,
      message: "You joined the event successfully!",
    });
});


app.get('/joined-events', verifyToken, async (req, res) => {
    const userEmail = req.user.email; 

    const userJoinedEvents = await joinedEventsCollection
      .find({ userEmail })
      .sort({ eventDate: 1 })
      .toArray();

    res.send(userJoinedEvents);
});


app.put('/events/:id', verifyToken, async (req, res) => {
    const id = req.params.id;
    const updatedData = req.body;
    const filter = { _id: new ObjectId(id), userEmail: req.user.email }; // 
    
    const updateDoc = {
      $set: {
        title: updatedData.title,
        eventType: updatedData.eventType,
        date: updatedData.date,
        location: updatedData.location,
        thumbnail: updatedData.thumbnail,
        description: updatedData.description,
      },
    };

    const result = await db.collection("events").updateOne(filter, updateDoc);
    res.send({ success: true, modifiedCount: result.modifiedCount });
});


app.delete('/events/:id', verifyToken, async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id), userEmail: req.user.email }; // Ensure ownership
    const result = await db.collection("events").deleteOne(query);

    if (result.deletedCount === 1) {
      res.send({ success: true, message: "Event deleted successfully" });
    } else {
      res.status(404).send({ success: false, message: "Event not found or unauthorized" });
    }
});



app.get("/test", (req, res) => {
  res.send("Express server is working!");
});
  
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

export default app