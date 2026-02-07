'use strict';
require('dotenv').config();

const { Worker } = require('bullmq');
const redis = require('../config/redis');
const nodemailer = require('nodemailer');
const { Notification, User } = require('../models');

console.log('Email worker starting...');

/* ------------------------- EMAIL TRANSPORTER ------------------------- */

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});

/* ------------------------- WORKER PROCESSOR ------------------------- */

const processor = async (job) => {
  let recipientEmail = job.data.email || 'email inconnu';

  if (job.name === 'notificationEmail' && job.data.notificationId) {
    const notification = await Notification.findByPk(
      job.data.notificationId,
      { include: [{ model: User }] }
    );
    recipientEmail = notification?.User?.email || recipientEmail;
  }

  console.log(` Sending email to: ${recipientEmail}`);
  console.log(` Type: ${job.name}`);
  console.log(' Payload:', job.data);

  try {
    switch (job.name) {
      case 'paymentSuccess':
        await sendPaymentSuccessEmail(job.data);
        break;

      case 'paymentFailed':
        await sendPaymentFailedEmail(job.data);
        break;

      case 'newOrderPaid':
        await sendNewOrderPaidEmail(job.data);
        break;

      case 'orderPaid':
        await sendPaymentSuccessEmail(job.data);
        break;

      case 'notificationEmail':
        await sendNotificationBasedEmail(job.data);
        break;

      default:
        console.warn(`Type d'email inconnu: ${job.name}`);
        await sendGenericEmail(job.data);
    }

    console.log(`Email envoyé avec succès: ${job.name}`);
    return { success: true };
  } catch (error) {
    console.error(` Erreur envoi email ${job.name}:`, error.message);
    throw error; // BullMQ retry
  }
};

/* ------------------------- WORKER (PROTÉGÉ) ------------------------- */

let emailWorker = null;

if (redis) {
  emailWorker = new Worker('emailQueue', processor, {
    connection: redis,
    concurrency: 5,
  });

  console.log('Email worker connecté à Redis');
} else {
  console.log('Redis indisponible — Email worker désactivé');
}

/* ------------------------- EVENTS ------------------------- */

if (emailWorker) {
  emailWorker.on('completed', (job) => {
    console.log(`Job completed: ${job.name} (ID: ${job.id})`);
  });

  emailWorker.on('failed', (job, err) => {
    console.error(`Job failed: ${job?.name} (ID: ${job?.id})`, err.message);
  });

  emailWorker.on('error', (error) => {
    console.error('Worker error:', error);
  });
}

/* ------------------------- EMAIL FUNCTIONS ------------------------- */

const sendPaymentSuccessEmail = async (data) => {
  const { email, buyerName, orderId, amount, currency = 'XAF', paymentMethod } = data;

  const mailOptions = {
    from: `"${process.env.APP_NAME || 'Marketplace'}" <${
      process.env.MAIL_FROM || process.env.MAIL_USER
    }>`,
    to: email,
    subject: `Paiement confirmé - Commande #${orderId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10B981;">Paiement confirmé !</h2>
        <p>Bonjour ${buyerName || 'cher client'},</p>
        <p>Nous avons bien reçu votre paiement pour la commande <strong>#${orderId}</strong>.</p>
        <p><strong>Montant :</strong> ${parseFloat(amount).toLocaleString('fr-FR')} ${currency}</p>
        <p><strong>Méthode :</strong> ${formatPaymentMethod(paymentMethod)}</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

/* ------------------------- UTILITAIRES ------------------------- */

const formatPaymentMethod = (method) => {
  const methods = {
    mtn: 'MTN Mobile Money',
    orange: 'Orange Money',
    card: 'Carte bancaire',
    stripe: 'Carte bancaire (Stripe)',
    paypal: 'PayPal',
    wallet: 'Wallet',
  };
  return methods[method] || method;
};

/* ------------------------- NOTIFICATION EMAIL ------------------------- */

const sendNotificationBasedEmail = async (data) => {
  const { notificationId } = data;

  const notification = await Notification.findByPk(notificationId, {
    include: [{ model: User }],
  });

  if (!notification) throw new Error('Notification not found');
  if (!notification.User?.email) throw new Error('User email not found');

  switch (notification.type) {
    case 'payment_success':
      await sendPaymentSuccessEmail({
        email: notification.User.email,
        ...notification.payload,
      });
      break;

    default:
      await sendGenericEmail({
        email: notification.User.email,
        subject: 'Notification',
        message: notification.payload?.message,
      });
  }

  await notification.update({ emailStatus: 'sent', sentAt: new Date() });
};

module.exports = emailWorker;
