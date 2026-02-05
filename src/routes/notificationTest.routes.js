'use strict';

const express = require('express');
const router = express.Router();
const {
  sendTestNotificationEmail
} = require('../controllers/notificationTest.controller');

router.post('/test-notification-email', sendTestNotificationEmail);

module.exports = router;
