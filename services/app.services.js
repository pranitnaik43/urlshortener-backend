const validUrl = require('valid-url');
const shortid = require('shortid');
const { ObjectId } = require("mongodb");

const db = require("../mongo");

const service = {
  async getURLFromId(req, res) {
    let id = req.params.id;
    if(!id)
      return res.send({ error: { message: "Failed to fetch the data" } });
    let data = await db.urls.findOne({ _id: new ObjectId(id) });
    console.log(data, id);
    res.send(data);
  },
  async getURLs(req, res) {
    let userId = req.userId; //added during JWT verification
    let data = await db.urls.find({ userId: new ObjectId(userId) }).toArray();
    res.send(data);
  },
  async shorten(req, res) {
    let userId = req.userId; //added during JWT verification
    let longURL = req.body.longURL;
    //check if longURL is valid
    if(!validUrl.isUri(longURL)) {
      return res.send({ error: { message: "The given URL is invalid" } });
    } else {
      //check if the long URL exists
      let longURLexists = await db.urls.findOne({ longURL, userId: new ObjectId(userId) });
      let shortURL; 
      if(longURLexists)
        return res.send({ error: { message: "The given URL already exists" } });
      //else
      shortURLkey = shortid.generate();
      shortURL = process.env.SERVER_URL + "/" + shortURLkey;
      let date = new Date();
      let dateStr = date.toLocaleString();
      await db.urls.insertOne({ userId: new ObjectId(userId), longURL, shortURL, createdAt: dateStr, count: 0 });
      res.send({ success: { message: "URL shortened successfully" } });
    }
  },
  async deleteURL(req, res) {
    let userId = req.userId; //added during JWT verification
    let urlId = req.params.id;

    let urlData = await db.urls.findOne({ _id: new ObjectId(urlId), userId: new ObjectId(userId) });
    if(!urlData)
      return res.send({ error: { message: "URL does not exist" } });
    await db.urls.deleteOne({ _id: new ObjectId(urlId) });
    res.send({ success: { message: "URL deleted successfully" } });
  }
}

module.exports = service;