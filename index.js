const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./mongo");

const app = express();
const PORT = (process.env.PORT) ? (process.env.PORT) : 3000;

const authService = require("./services/auth.services");

(async function load() {
  await db.connect();

  app.use(express.json());
  app.use(cors()); 

  app.post("/auth/signup", (req, res) => authService.signUp(req, res));
  app.post("/auth/signin", (req, res) => authService.signIn(req, res));
  app.post("/auth/resetPassword/:email", (req, res) => authService.resetPassword(req, res));
  app.post("/auth/changePassword", (req, res) => authService.changePassword(req, res));

  app.use(authService.validateAccessToken);
  app.get("/user", (req, res) => authService.findById(req, res));

  app.listen(PORT, () => {
    console.log(`Server running at port ${PORT}`);
  });

}()); //immediately invoked function

