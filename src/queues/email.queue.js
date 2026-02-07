'use strict';

const { Queue } = require('bullmq');
const redis = require('../config/redis');

console.log(' Initialisation de la email queue...');

/* ------------------------- QUEUE (PROTÉGÉE) ------------------------- */

let emailQueue = null;

if (redis) {
  emailQueue = new Queue('emailQueue', {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        age: 3600,
        count: 100,
      },
      removeOnFail: {
        age: 86400,
      },
    },
  });

  console.log(' Email queue connectée à Redis');
} else {
  console.log(' Redis indisponible — Email queue désactivée');
}

/* ------------------------- HELPERS ------------------------- */

const safeAddJob = async (name, data) => {
  if (!emailQueue) {
    console.warn(`Impossible d’ajouter le job "${name}" : Redis indisponible`);
    return null;
  }
  return await emailQueue.add(name, data);
};

const sendPaymentSuccessEmail = async (data) =>
  safeAddJob('paymentSuccess', data);

const sendPaymentFailedEmail = async (data) =>
  safeAddJob('paymentFailed', data);

const sendNewOrderPaidEmail = async (data) =>
  safeAddJob('newOrderPaid', data);

const sendOrderPaidEmail = async (data) =>
  safeAddJob('orderPaid', data);

const sendNotificationEmail = async (data) =>
  safeAddJob('notificationEmail', data);

/* ------------------------- EVENTS ------------------------- */

if (emailQueue) {
  emailQueue.on('error', (error) => {
    console.error(' Email queue error:', error);
  });
}

/* ------------------------- EXPORTS ------------------------- */

module.exports = {
  emailQueue,
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
  sendNewOrderPaidEmail,
  sendOrderPaidEmail,
  sendNotificationEmail,
};
