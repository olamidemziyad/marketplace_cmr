'use strict';

const crypto = require('crypto');

/**
 * Génère une référence unique pour les transactions
 * Format: PREFIX-TIMESTAMP-RANDOM
 * Exemple: PAY-1704104400000-A1B2C3
 */
const generatePaymentReference = (prefix = 'PAY') => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${randomString}`;
};

/**
 * Génère un depositId compatible PawaPay
 * PawaPay requiert: max 64 caractères, alphanumerique + tirets/underscores
 */
const generateDepositId = () => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  return `deposit_${timestamp}_${randomString}`;
};

/**
 * Génère un correspondentId (identifiant unique du client)
 * Basé sur l'userId et un hash
 */
const generateCorrespondentId = (userId) => {
  const hash = crypto.createHash('sha256').update(userId).digest('hex').substring(0, 8);
  return `customer_${hash}`;
};

module.exports = {
  generatePaymentReference,
  generateDepositId,
  generateCorrespondentId
};