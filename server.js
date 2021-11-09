const { MongoClient } = require("mongodb");
const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 7000;
// jwt token auth
const admin = require("firebase-admin");
// const serviceAccount = require("./doctorsPortalFirebaseAdminsdk.json");
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nu4vl.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const totken = req.headers.authorization.split(" ")[1];
    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedEmail;
    } catch {}
  }
  next();
}

async function run() {
  try {
    await client.connect();
    console.log("db connected");
    const database = client.db("doctors_portal");
    const appointmentsCollection = database.collection("appointments");
    const usersCollection = database.collection("users");

    // get appointments from server and show to client
    app.get("/appointments", async (req, res) => {
      const email = req.query.email;
      const date = new Date(req.query.date).toLocaleDateString();
      const query = { email: email, date: date };
      const cursor = appointmentsCollection.find(query);
      const appointmensts = await cursor.toArray();
      res.json(appointmensts);
    });
    // post appoints from client sidde to server
    app.post("/appointments", verifyToken, async (req, res) => {
      const appointment = req.body;

      const result = await appointmentsCollection.insertOne(appointment);
      console.log(appointment);
      res.json(result);
      // some
    });

    // check user is admin or not
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let isAdmin = false;
      if (user?.role === "admin") {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });
    // post users
    app.post("/users", async (req, res) => {
      const user = req.body;

      const result = await usersCollection.insertOne(user);
      console.log(result);
      res.json(result);
      // some
    });
    app.put("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const options = { upsert: true };
      const updateDoc = { $set: user };
      const result = await usersCollection.updateOne(query, updateDoc, options);
      res.json(result);
    });
    // make exist email as admin
    app.put("/users/admin", verifyToken, async (req, res) => {
      const user = req.body;

      const requester = req.decodedEmail;
      if (requester) {
        const requesterAccount = await usersCollection.findOne({
          email: requester,
        });
        if (requesterAccount.role === "admin") {
          const filter = { email: user.email };
          const updateDoc = { $set: { role: "admin" } };
          const result = await usersCollection.updateOne(filter, updateDoc);
          res.json(result);
        }
      } else {
        res.status(403).json({ message: "you do not have access now" });
      }
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir());

app.get("/", (req, res) => {
  res.send("Hello Doctors Portal!");
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
