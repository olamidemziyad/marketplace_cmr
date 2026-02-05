const { body, param, validationResult } = require('express-validator');

/**
 * Middleware pour vérifier les erreurs de validation
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Erreurs de validation',
      errors: errors.array()
    });
  }
  next();
};

/**
 * Validation pour le checkout
 */
const validateCheckout = [
  body('addressId')
    .notEmpty()
    .withMessage('L\'adresse de livraison est requise')
    .isUUID()
    .withMessage('L\'ID de l\'adresse doit être un UUID valide'),
  
  body('paymentMethod')
    .notEmpty()
    .withMessage('La méthode de paiement est requise')
    .isIn(['mtn_momo', 'orange_money', 'card', 'cash'])
    .withMessage('Méthode de paiement invalide'),
  
  body('phoneNumber')
    .optional()
    .matches(/^237[0-9]{9}$/)
    .withMessage('Numéro de téléphone invalide (format: 237XXXXXXXXX)'),
  
  body('customerNotes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Les notes ne peuvent pas dépasser 500 caractères'),
  
  handleValidationErrors
];

/**
 * Validation pour la mise à jour du statut
 */
const validateUpdateStatus = [
  param('orderId')
    .notEmpty()
    .withMessage('L\'ID de la commande est requis')
    .isUUID()
    .withMessage('L\'ID de la commande doit être un UUID valide'),
  
  body('status')
    .notEmpty()
    .withMessage('Le statut est requis')
    .isIn(['pending', 'paid', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
    .withMessage('Statut invalide'),
  
  handleValidationErrors
];

/**
 * Validation pour l'ajout du numéro de suivi
 */
const validateTrackingNumber = [
  param('orderId')
    .notEmpty()
    .withMessage('L\'ID de la commande est requis')
    .isUUID()
    .withMessage('L\'ID de la commande doit être un UUID valide'),
  
  body('trackingNumber')
    .notEmpty()
    .withMessage('Le numéro de suivi est requis')
    .isLength({ min: 3, max: 100 })
    .withMessage('Le numéro de suivi doit contenir entre 3 et 100 caractères'),
  
  handleValidationErrors
];

/**
 * Validation pour l'annulation
 */
const validateCancelOrder = [
  param('orderId')
    .notEmpty()
    .withMessage('L\'ID de la commande est requis')
    .isUUID()
    .withMessage('L\'ID de la commande doit être un UUID valide'),
  
  body('reason')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La raison ne peut pas dépasser 500 caractères'),
  
  handleValidationErrors
];

/**
 * Validation pour récupérer par sessionId
 */
const validateSessionId = [
  param('sessionId')
    .notEmpty()
    .withMessage('Le sessionId est requis')
    .isUUID()
    .withMessage('Le sessionId doit être un UUID valide'),
  
  handleValidationErrors
];

/**
 * Validation pour récupérer par orderId
 */
const validateOrderId = [
  param('orderId')
    .notEmpty()
    .withMessage('L\'ID de la commande est requis')
    .isUUID()
    .withMessage('L\'ID de la commande doit être un UUID valide'),
  
  handleValidationErrors
];

module.exports = {
  validateCheckout,
  validateUpdateStatus,
  validateTrackingNumber,
  validateCancelOrder,
  validateSessionId,
  validateOrderId
};