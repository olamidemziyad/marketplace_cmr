'use strict';

const { Queue } = require('bullmq');
const redis = require('../config/redis');


// Créer la queue
const emailQueue = new Queue('emailQueue', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3, // Nombre de tentatives en cas d'échec
    backoff: {
      type: 'exponential',
      delay: 2000 // Délai entre tentatives (ms)
    },
    removeOnComplete: {
      age: 3600, // Garder les jobs complétés pendant 1 heure
      count: 100  // Garder max 100 jobs complétés
    },
    removeOnFail: {
      age: 86400  // Garder les jobs échoués pendant 24h
    }
  }
});

/**
 * Helper : Ajouter un job email de paiement réussi
 */
const sendPaymentSuccessEmail = async (data) => {
  return await emailQueue.add('paymentSuccess', data);
};

/**
 * Helper : Ajouter un job email de paiement échoué
 */
const sendPaymentFailedEmail = async (data) => {
  return await emailQueue.add('paymentFailed', data);
};

/**
 * Helper : Ajouter un job email de nouvelle commande (vendeur)
 */
const sendNewOrderPaidEmail = async (data) => {
  return await emailQueue.add('newOrderPaid', data);
};

/**
 * Helper : Ajouter un job email générique
 * Pour compatibilité avec l'ancien code Stripe
 */
const sendOrderPaidEmail = async (data) => {
  return await emailQueue.add('orderPaid', data);
};

/**
 * Événements de la queue
 */
emailQueue.on('error', (error) => {
  console.error('❌ Queue error:', error);
});

const sendNotificationEmail = async (data) => {
  return await emailQueue.add('notificationEmail', data);
};

// Exports
module.exports = emailQueue;
module.exports.sendPaymentSuccessEmail = sendPaymentSuccessEmail;
module.exports.sendPaymentFailedEmail = sendPaymentFailedEmail;
module.exports.sendNewOrderPaidEmail = sendNewOrderPaidEmail;
module.exports.sendOrderPaidEmail = sendOrderPaidEmail;
module.exports.sendNotificationEmail = sendNotificationEmail;