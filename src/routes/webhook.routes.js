'use strict';

const express = require('express');
const router = express.Router();
const {
  handlePawapayWebhook,
  handleStripeWebhook,
  handleMTNWebhook,
  handleOrangeWebhook
} = require('../controllers/webhook.controller');

/**
 * Routes webhooks - PAS d'authentification JWT !
 * Ces routes sont appelées par les providers externes (PawaPay, Stripe, MTN, Orange)
 * 
 * Important: Les webhooks sont sécurisés par signature, pas par JWT
 */

// Webhook PawaPay (mobile money)
router.post('/pawapay', handlePawapayWebhook);

// Webhook Stripe (cartes bancaires)
router.post('/stripe', handleStripeWebhook);

// Webhooks futurs (si APIs directes)
router.post('/mtn', handleMTNWebhook);
router.post('/orange', handleOrangeWebhook);

// Route de test (à supprimer en production)
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Webhook routes are working',
    endpoints: {
      pawapay: '/api/v1/webhooks/pawapay',
      stripe: '/api/v1/webhooks/stripe',
      mtn: '/api/v1/webhooks/mtn',
      orange: '/api/v1/webhooks/orange'
    }
  });
});

module.exports = router;