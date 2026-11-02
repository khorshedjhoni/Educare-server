console.log("EDUCARE SERVER FILE IS RUNNING");

import express from "express";


import { MongoClient,ObjectId } from "mongodb";
import "dotenv/config";

import cors from "cors";


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

const users = db.collection("users")
const galleryCollection = db.collection("gallery");
const eventsCollection = db.collection("events");
const joinedEventsCollection = db.collection("joinedEvents");






app.get("/", (req, res) => {
  res.send("Educare server is working!");
});


// Get all gallery items endpoint
app.get('/gallery', async (req, res) => {
    const cursor = galleryCollection.find();
    const result = await cursor.toArray();
    res.send(result);
  
});

//event crete

app.post('/events', async (req, res) => {
  
    const newEvent = req.body;
    
    
    const eventDate = new Date(newEvent.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (eventDate <= today) {
      return res.status(400).send({ success: false, message: "Event date cannot be in the past." });
    }

    const result = await eventsCollection.insertOne(newEvent);
    res.send({ success: true, insertedId: result.insertedId });
    console.log("New event created by:", newEvent.userEmail);
  } 
  
);

// recent_event show

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

//upcomming-events

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

app.get("/events/user", async (req, res) => {
  try {
    const email = req.query.email;

   if (!email) {
     return res.status(400).send({
       success: false,
       message: "Email is required.",
     });
   }

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

//get single view details
app.get('/events/:id', async (req, res) => {
  const id = req.params.id;
  const query ={_id:new ObjectId(id) };

  const result = await eventsCollection.findOne(query);
  res.send(result)

})

//join event

app.post("/joined-events", async (req, res) => {
 
    const {
      eventId,
      userEmail,
      userName,
      eventTitle,
      eventDate,
      location,
      thumbnail,
    } = req.body;

    if (!userEmail) {
      return res.status(401).send({
        success: false,
        message: "Please log in to join events.",
      });
    }

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

// GET  all events joined 
app.get('/joined-events', async (req, res) => {
  
    const userEmail = req.query.email;

    if (!userEmail) {
      return res.send({ success: false, message: "User email is required to fetch joined events." });
    }

    
    const userJoinedEvents = await joinedEventsCollection
      .find({ userEmail })
      .sort({ eventDate: 1 })
      .toArray();

    res.send(userJoinedEvents);
  
});






// PUT (Update) event data by ID
app.put('/events/:id', async (req, res) => {
  
    const id = req.params.id;
    const updatedData = req.body;
    const filter = { _id: new ObjectId(id) };
    
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

// delete event 
app.delete('/events/:id', async (req, res) => {
  
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await db.collection("events").deleteOne(query);

    if (result.deletedCount === 1) {
      res.send({ success: true, message: "Event deleted successfully" });
    } else {
      res.send({ success: false, message: "Event not found" });
    }
 
});

app.get('/users', async (req, res) => {
  const cursor = users.find();
  const allUsers = await cursor.toArray();
  res.send(allUsers)
})



app.post('/users', async (req, res) => {
  const newUser = req.body;
  const result = await users.insertOne(newUser);
  res.send(result);

  console.log('adding new use',newUser)
})

app.delete('/users/:id', async (req, res)=>{
    const id = req.params.id;
  const query ={_id:new ObjectId(id) };

  const result = await users.deleteOne(query);
  res.send(result)

})




//gallery data get from db
app.get("/gallery", async (req, res) => {
  console.log("Gallery route was called!");

  try {
    const result = await galleryCollection.find().toArray();

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching gallery:", error);

    res.status(500).json({
      message: "Failed to fetch gallery data",
    });
  }
});

app.get("/test", (req, res) => {
  res.send("Express server is working!");
});
  
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
