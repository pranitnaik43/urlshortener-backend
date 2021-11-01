const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./mongo");

const app = express();
const PORT = (process.env.PORT) ? (process.env.PORT) : 3001;

const authRoutes = require("./routes/auth.routes");
const authService = require("./services/auth.services");
const appService = require("./services/app.services");


(async function load() {
  await db.connect();

  app.use(express.json());
  app.use(cors()); 

  app.use("/auth", authRoutes)

  app.get("/re/:code", (req, res) => appService.redirect(req, res));

  app.use(authService.validateAccessToken);
  app.get("/user", (req, res) => authService.findById(req, res));

  app.get("/app/urls", (req, res) => appService.getURLs(req, res));
  app.get("/app/url/:id", (req, res) => appService.getURLFromId(req, res));
  app.post("/app/url", (req, res) => appService.shorten(req, res));
  app.delete("/app/url/:id", (req, res) => appService.deleteURL(req, res));

  app.listen(PORT, () => {
    console.log(`Server running at port ${PORT}`);
  });

}()); //immediately invoked function

