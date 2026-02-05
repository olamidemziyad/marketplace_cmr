'use strict';

const { Notification, User } = require('../models');
const { sendNotificationEmail } = require('../queues/email.queue');

exports.sendTestNotificationEmail = async (req, res) => {
  try {
    // Utilise un user EXISTANT en DB
    const user = await User.findOne(); 

    if (!user) {
      return res.status(400).json({ error: 'No user found in database' });
    }

    const notification = await Notification.create({
      userId: user.id,
      type: 'payment_success',
      channel: 'email',
      payload: {
        buyerName: user.name || 'Test User',
        orderId: 'TEST-ORDER-001',
        amount: 15000,
        paymentMethod: 'mtn'
      }
    });

    await sendNotificationEmail({
      notificationId: notification.id
    });

    return res.json({
      success: true,
      notificationId: notification.id
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};
