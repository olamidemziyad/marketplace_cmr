const express = require("express");
const router = express.Router();
const authorize = require('../middlewares/authorize');
const authMiddleware = require("../middlewares/auth.middleware")
router.get("/dashboard", authMiddleware, authorize("Seller"), (req, res) => {
  res.json({ message: "Welcome seller", user: req.user });
});

module.exports = router;
