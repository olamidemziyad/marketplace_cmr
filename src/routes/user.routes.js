const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/auth.middleware");
const userController = require("../controllers/user.controller")
const authorize = require("../middlewares/authorize");
const authMiddleware = require("../middlewares/auth.middleware")

router.get("/me", authMiddleware, (req, res) => {
  res.json(req.user);
});

router.post("/register", userController.Register);
router.post("/login", userController.Login);


module.exports = router;
