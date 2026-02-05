const express = require("express");
const router = express.Router();
const { sendMail } = require("../services/mailService");

router.post("/test-email", async (req, res) => {
  try {
    await sendMail({
      to: req.body.to,
      subject: "Test email Gmail",
      text: "Si tu reçois cet email, Gmail est bien configuré ",
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Email failed" });
  }
});

module.exports = router;
