const router = require("express").Router();

const authService = require("../services/auth.services");

router.post("/signup", (req, res) => authService.signUp(req, res));
router.post("/signin", (req, res) => authService.signIn(req, res));
router.post("/activate", (req, res) => authService.activateAccount(req, res));
router.post("/resetPassword/:email", (req, res) => authService.resetPassword(req, res));
router.post("/changePassword", (req, res) => authService.changePassword(req, res));

module.exports = router;
