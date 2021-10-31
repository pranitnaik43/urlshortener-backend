const { MongoClient } = require("mongodb"); 

const client = new MongoClient(process.env.MONGODB_URL);

const mongo = {
  users: null,
  resetTokens: null,
  urls: null,
  async connect() {
    await client.connect();
    const db = client.db(process.env.MONGODB_NAME);
    console.log("Mongo DB connected");

    this.users = db.collection("users");
    this.resetTokens = db.collection("resetTokens");
    this.urls = db.collection("urls");
  }
}

module.exports = mongo;