require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

const port = 3000; // Change to your desired port

// Middleware to parse JSON and form data
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (if needed)
// app.use(express.static('public'));

// Start the server

const { MongoClient } = require("mongodb");

const uri = `mongodb+srv://fifa14gamer2016:${process.env.MONGO_PASS}@leetcluster.wxjnof1.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri);

async function connectToDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
  }
}

connectToDB();

app.post("/submit", async (req, res) => {
  try {
    const formdata = req.body;
    const websiteUrl = formdata.url;
    const db = client.db("123");
    const collection = db.collection(websiteUrl);

    const formData = {
      field1: req.body.field1,
    };
    if (!formData.field1.trim()) {
      return res.status(400).send("Text cannot be empty");
    }
    if (formData.field1.length > 250) {
      return res
        .status(400)
        .send("Text exceeds the maximum length of 250 characters");
    }

    await collection.insertOne(formData);
    res.status(201).send("Form data saved to MongoDB");
  } catch (err) {
    console.error("Error saving form data:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/getRandomDocument", async (req, res) => {
  try {
    const queryParameters = req.query.collectionName;

    const db = client.db("123");
    const collection = db.collection(queryParameters);

    const randomDocument = await collection
      .aggregate([{ $sample: { size: 1 } }])
      .toArray();
    // console.log(randomDocument);
    res.json(randomDocument);
  } catch (error) {
    // console.error("Error fetching random document:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
