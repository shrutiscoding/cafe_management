const { MongoClient } = require("mongodb");

const url = "mongodb://127.0.0.1:27017";
const client = new MongoClient(url);

const dbName = "cafe";

async function connectMongo() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");
    return client.db(dbName);
  } catch (err) {
    console.error("❌ MongoDB Error:", err);
  }
}

module.exports = connectMongo;