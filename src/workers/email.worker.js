'use strict';
require('dotenv').config();

const { Worker } = require('bullmq');
const redis = require('../config/redis');
const nodemailer = require('nodemailer');
const { Notification, User } = require('../models');

console.log('Email worker started and waiting for jobs...');

// Configuration du transporteur email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD
  }
});

/**
 * Worker BullMQ pour traiter les emails
 */
const emailWorker = new Worker(
  'emailQueue',
  async (job) => {
    // Déterminer l'email du destinataire pour un log correct
    let recipientEmail = job.data.email || 'email inconnu';
    if (job.name === 'notificationEmail' && job.data.notificationId) {
      const notification = await Notification.findByPk(job.data.notificationId, {
        include: [{ model: User }]
      });
      recipientEmail = notification?.User?.email || recipientEmail;
    }

    console.log(`📧 Sending email to: ${recipientEmail}`);
    console.log(`📋 Type: ${job.name}`);
    console.log('📦 Payload:', job.data);

    try {
      // Router vers la bonne fonction selon le type d'email
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
      throw error; // BullMQ va réessayer automatiquement
    }
  },
  {
    connection: redis,
    concurrency: 5
  }
);

/* ------------------------- FONCTIONS EMAIL ------------------------- */

const sendPaymentSuccessEmail = async (data) => {
  const { email, buyerName, orderId, amount, currency = 'XAF', paymentMethod } = data;

  const mailOptions = {
    from: `"${process.env.APP_NAME || 'Marketplace'}" <${process.env.MAIL_FROM || process.env.MAIL_USER}>`,
    to: email,
    subject: 'Paiement confirmé - Commande #' + orderId,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10B981;">✅ Paiement confirmé !</h2>
        <p>Bonjour ${buyerName || 'cher client'},</p>
        <p>Nous avons bien reçu votre paiement pour la commande <strong>#${orderId}</strong>.</p>
        <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Détails du paiement</h3>
          <p><strong>Montant :</strong> ${parseFloat(amount).toLocaleString('fr-FR')} ${currency}</p>
          <p><strong>Méthode :</strong> ${formatPaymentMethod(paymentMethod)}</p>
          <p><strong>Date :</strong> ${new Date().toLocaleDateString('fr-FR', { 
            day: 'numeric', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })}</p>
        </div>
        <p>Votre commande est maintenant en cours de traitement.</p>
        <p style="margin-top: 30px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/${orderId}" 
             style="background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Suivre ma commande
          </a>
        </p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
        <p style="color: #6B7280; font-size: 14px;">
          Merci de votre confiance !<br>
          L'équipe ${process.env.APP_NAME || 'Marketplace'}
        </p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

// sendPaymentFailedEmail, sendNewOrderPaidEmail, sendGenericEmail restent identiques à ta version actuelle

/* ------------------------- UTILITAIRES ------------------------- */

const formatPaymentMethod = (method) => {
  const methods = {
    'mtn': 'MTN Mobile Money',
    'orange': 'Orange Money',
    'card': 'Carte bancaire',
    'stripe': 'Carte bancaire (Stripe)',
    'paypal': 'PayPal',
    'wallet': 'Wallet'
  };
  return methods[method] || method;
};

/* ------------------------- EVENTS ------------------------- */

emailWorker.on('completed', (job) => {
  console.log(`Job completed: ${job.name} (ID: ${job.id})`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`Job failed: ${job?.name} (ID: ${job?.id})`, err.message);
});

emailWorker.on('error', (error) => {
  console.error(' Worker error:', error);
});

/* ------------------------- NOTIFICATION EMAIL ------------------------- */

const sendNotificationBasedEmail = async (data) => {
  const { notificationId } = data;

  const notification = await Notification.findByPk(notificationId, { include: [{ model: User }] });

  if (!notification) throw new Error('Notification not found');
  if (!notification.User || !notification.User.email) throw new Error('User or email not found');

  switch (notification.type) {
    case 'payment_success':
      await sendPaymentSuccessEmail({ email: notification.User.email, ...notification.payload });
      break;
    case 'payment_failed':
      await sendPaymentFailedEmail({ email: notification.User.email, ...notification.payload });
      break;
    case 'new_order_paid':
      await sendNewOrderPaidEmail({ email: notification.User.email, ...notification.payload });
      break;
    default:
      await sendGenericEmail({ email: notification.User.email, subject: 'Notification', message: notification.payload?.message });
  }

  await notification.update({ emailStatus: 'sent', sentAt: new Date() });
};

console.log('Email worker ready and listening...');

module.exports = emailWorker;
