'use strict';

const axios = require('axios');
const crypto = require('crypto');
const { generateDepositId, generateCorrespondentId } = require('../utils/generateReference');

// Configuration PawaPay
const PAWAPAY_API_TOKEN = process.env.PAWAPAY_API_TOKEN;
const PAWAPAY_BASE_URL = process.env.PAWAPAY_BASE_URL || 'https://api.sandbox.pawapay.cloud';
const PAWAPAY_WEBHOOK_SECRET = process.env.PAWAPAY_WEBHOOK_SECRET;

// Instance axios configurée
const pawapayClient = axios.create({
  baseURL: PAWAPAY_BASE_URL,
  headers: {
    'Authorization': PAWAPAY_API_TOKEN,
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30 secondes
});

/**
 * Initier un dépôt (paiement) via PawaPay
 * 
 * @param {Object} params
 * @param {string} params.phoneNumber - Numéro de téléphone (+237...)
 * @param {number} params.amount - Montant en FCFA
 * @param {string} params.orderId - ID de la commande
 * @param {string} params.userId - ID de l'utilisateur
 * @param {string} params.paymentMethod - 'mtn' ou 'orange'
 * @returns {Promise<Object>} Réponse PawaPay
 */
const initiateDeposit = async ({ phoneNumber, amount, orderId, userId, paymentMethod }) => {
  try {
    // Générer un depositId unique
    const depositId = generateDepositId();
    
    // Générer un correspondentId (identifiant client)
    const correspondentId = generateCorrespondentId(userId);

    // Mapper paymentMethod vers le code PawaPay
    const correspondentCountryMap = {
      'mtn': 'CM', // Cameroon
      'orange': 'CM'
    };

    // Payload pour PawaPay
    const payload = {
      depositId,
      amount: amount.toString(),
      currency: 'XAF', // Franc CFA
      correspondent: correspondentCountryMap[paymentMethod] || 'CM',
      payer: {
        type: 'MSISDN',
        address: {
          value: phoneNumber.replace(/\s/g, '') // Enlever les espaces
        }
      },
      customerTimestamp: new Date().toISOString(),
      statementDescription: `Commande ${orderId}`,
      metadata: [
        {
          fieldName: 'orderId',
          fieldValue: orderId
        },
        {
          fieldName: 'userId',
          fieldValue: userId
        }
      ]
    };

    console.log('📤 PawaPay Request:', JSON.stringify(payload, null, 2));

    // Appel API PawaPay
    const response = await pawapayClient.post('/deposits', payload);

    console.log('✅ PawaPay Response:', response.data);

    return {
      success: true,
      depositId,
      correspondentId,
      status: response.data.status,
      data: response.data
    };

  } catch (error) {
    console.error('❌ PawaPay Error:', error.response?.data || error.message);
    
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      details: error.response?.data
    };
  }
};

/**
 * Vérifier le statut d'un dépôt
 * 
 * @param {string} depositId - ID du dépôt PawaPay
 * @returns {Promise<Object>} Statut du dépôt
 */
const getDepositStatus = async (depositId) => {
  try {
    const response = await pawapayClient.get(`/deposits/${depositId}`);
    
    console.log('✅ Deposit Status:', response.data);

    return {
      success: true,
      status: response.data.status,
      data: response.data
    };

  } catch (error) {
    console.error('❌ Error getting deposit status:', error.response?.data || error.message);
    
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

/**
 * Vérifier la signature du webhook PawaPay
 * 
 * @param {string} payload - Corps du webhook (JSON stringifié)
 * @param {string} signature - Signature reçue dans le header
 * @returns {boolean} True si signature valide
 */
const verifyWebhookSignature = (payload, signature) => {
  if (!PAWAPAY_WEBHOOK_SECRET) {
    console.warn('⚠️ PAWAPAY_WEBHOOK_SECRET non défini, signature non vérifiée');
    return true; // En dev, on accepte sans vérification
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', PAWAPAY_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('❌ Error verifying signature:', error);
    return false;
  }
};

/**
 * Mapper le statut PawaPay vers notre statut Payment
 * 
 * @param {string} pawapayStatus - Statut PawaPay
 * @returns {string} Notre statut
 */
const mapPawapayStatus = (pawapayStatus) => {
  const statusMap = {
    'ACCEPTED': 'processing',      // En cours de traitement
    'SUBMITTED': 'processing',      // Soumis à l'opérateur
    'COMPLETED': 'success',         // Paiement réussi
    'FAILED': 'failed',             // Paiement échoué
    'REJECTED': 'failed',           // Rejeté par PawaPay
    'ENQUEUED': 'processing'        // En file d'attente
  };

  return statusMap[pawapayStatus] || 'pending';
};

/**
 * Obtenir la raison d'échec lisible
 * 
 * @param {string} failureReason - Code d'erreur PawaPay
 * @returns {string} Message lisible
 */
const getReadableFailureReason = (failureReason) => {
  const reasonMap = {
    'INSUFFICIENT_BALANCE': 'Solde insuffisant',
    'INVALID_MSISDN': 'Numéro de téléphone invalide',
    'TIMEOUT': 'Délai d\'attente dépassé',
    'REJECTED_BY_PAYER': 'Transaction rejetée par l\'utilisateur',
    'BLOCKED_MSISDN': 'Numéro bloqué',
    'DUPLICATE_TRANSACTION': 'Transaction en double',
    'GENERAL_ERROR': 'Erreur générale'
  };

  return reasonMap[failureReason] || failureReason || 'Erreur inconnue';
};

/**
 * Refund (remboursement) - PawaPay supporte via API de retrait
 * Note: Nécessite une configuration spéciale avec PawaPay
 * 
 * @param {string} depositId - ID du dépôt original
 * @param {number} amount - Montant à rembourser
 * @returns {Promise<Object>}
 */
const initiateRefund = async (depositId, amount) => {
  try {
    // TODO: Implémenter avec l'API PawaPay /payouts
    console.warn('⚠️ Refund not fully implemented yet');
    
    return {
      success: false,
      error: 'Refund feature not yet implemented'
    };

  } catch (error) {
    console.error('❌ Refund error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  initiateDeposit,
  getDepositStatus,
  verifyWebhookSignature,
  mapPawapayStatus,
  getReadableFailureReason,
  initiateRefund
};