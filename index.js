require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

const port = process.env.PORT || 3000; // Change to your desired port

// Middleware to parse JSON and form data
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (if needed)
// app.use(express.static('public'));

// Start the server

const { MongoClient, ObjectId } = require("mongodb");
const e = require("express");

const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@leetcluster.wxjnof1.mongodb.net/?retryWrites=true&w=majority`;
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
    const githubAccessToken = formdata.accessToken;
    const user = await fetchGitHubUser(githubAccessToken);
    if (user.id) {
      // console.log(user);
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
      collection.findOne({ _id: user.id }).then(async (userDocument) => {
        if (userDocument && userDocument.hints) {
          // Check if the hints array has fewer than 3 elements
          if (userDocument.hints.length < 3) {
            // Add the new hint to the hints array
            // userDocument.hints.push(formData.field1);

            // Update the document in the collection
            // console.log(user.id);
            collection
              .updateOne(
                { _id: user.id },
                {
                  $push: {
                    hints: {
                      _id: `${userDocument.hints.length + 1}`,
                      hint: formData.field1,
                    },
                  },
                }
              )
              .then((err) => {
                res.status(201).json(`${userDocument.hints.length}`);
              })
              .catch((e) => {
                res.status(400).send("Unable to add hint");
              });
          } else {
            return res.status(400).send("Max limit of hints reached.");
          }
        } else {
          // Document not found, create a new one
          const newDocument = {
            _id: user.id,
            hints: [{ _id: "1", hint: formData.field1 }],
          };

          // Insert the new document
          collection
            .insertOne(newDocument)
            .then((err) => {
              console.log("success");
              res.status(201).send("Hint added successfully.");
            })
            .catch((e) => {
              res.status(400).send("Unable to add hint");
            });
        }
      });
    } else {
      res.status(401).send("Invalid user credentials");
    }
  } catch (err) {
    console.log("Error saving form data", err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/getRandomDocument", async (req, res) => {
  const queryParameters = req.query.collectionName;

  const db = client.db("123");
  const collection = db.collection(queryParameters);

  const randomDocument = await collection
    .aggregate([{ $sample: { size: 1 } }])
    .toArray();
  if (randomDocument.length > 0) {
    const hintsArray = randomDocument[0].hints;
    if (hintsArray.length > 0) {
      const randomIndex = Math.floor(Math.random() * hintsArray.length);
      const randomHint = hintsArray[randomIndex];
      res.status(201).json({ randomHint });
    } else {
      res.status(401).send("No hints available for the problem.");
    }
  } else {
    res.status(401).send("No hints available for the problem.");
  }
});

app.post("/exchange-code-for-token", (req, res) => {
  const { code } = req.body;
  // console.log(code);
  // Make a request to GitHub's token endpoint to exchange the code for an access token
  fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.access_token) {
        fetchGitHubUser(data.access_token)
          .then((user) => {
            // console.log(user);
          })
          .catch((error) => {
            console.log(error);
          });
        // Authentication succeeded
        res.json({ accessToken: data.access_token });
      } else {
        // Authentication failed, handle the error
        res.status(400).json({ error: "Authentication failed" });
      }
    })
    .catch((error) => {
      // console.error("Error exchanging code for access token:", error);
      res.status(500).json({ error: "Internal server error" });
    });
});

app.post("/userhints", async (req, res) => {
  const formdata = req.body;
  const websiteUrl = formdata.url;
  const githubAccessToken = formdata.accessToken;
  const user = await fetchGitHubUser(githubAccessToken);
  if (user.id) {
    const db = client.db("123");
    const collection = db.collection(websiteUrl);
    collection
      .findOne({ _id: user.id })
      .then((userDocument) => {
        // console.log(userDocument.hints.length);
        if (userDocument.hints.length > 0) {
          res.status(201).json(userDocument.hints);
        } else {
          res.status(401).send("Unable to find your submitted hints.");
        }
      })
      .catch((e) => {
        console.log("Unable to find your submitted hints.");
        res.status(401).send("Unable to find your submitted hints.");
      });
  } else {
    res.status(401).send("Invalid user credentials");
  }
});

app.post("/deleteuserhint", async (req, res) => {
  const formdata = req.body;
  const websiteUrl = formdata.url;
  const githubAccessToken = formdata.accessToken;
  const hintIndex = formdata.hintIndex;
  const user = await fetchGitHubUser(githubAccessToken);
  if (user.id) {
    const db = client.db("123");
    const collection = db.collection(websiteUrl);
    // console.log(hintIndex);
    collection
      .updateOne(
        { _id: user.id },
        {
          $pull: {
            hints: { _id: hintIndex },
          },
        }
      )
      .then((err) => {
        // console.log("delete success");
        res.status(201).send("Hint deleted successfully.");
      })
      .catch((e) => {
        res.status(400).send("Error updating your hints");
      });
  } else {
    res.status(401).send("Invalid user credentials");
  }
});

app.post("/authenticateuser", async (req, res) => {
  const formdata = req.body;
  const githubAccessToken = formdata.accessToken;
  const user = await fetchGitHubUser(githubAccessToken);
  // console.log(user.message);
  if (user.id) {
    res.status(201).send("Authenticated");
  } else {
    res.status(401).send("Not authenticated");
  }
});

async function fetchGitHubUser(token) {
  try {
    const request = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: "token " + token,
      },
    });
    return await request.json();
  } catch (e) {
    res.status(401).json({ error: "Unable to fetch user" });
  }
}
