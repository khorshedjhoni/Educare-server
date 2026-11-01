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






app.get("/", (req, res) => {
  res.send("Educare server is working!");
});


// Get all gallery items endpoint
app.get('/gallery', async (req, res) => {
    const cursor = galleryCollection.find();
    const result = await cursor.toArray();
    res.send(result);
  
});

app.get('/users', async (req, res) => {
  const cursor = users.find();
  const allUsers = await cursor.toArray();
  res.send(allUsers)
})

app.get('/users/:id', async (req, res) => {
  const id = req.params.id;
  const query ={_id:new ObjectId(id) };

  const result = await users.findOne(query);
  res.send(result)

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
