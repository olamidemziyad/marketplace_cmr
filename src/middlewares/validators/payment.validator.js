'use strict';

const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware de validation pour les paiements
 */
class PaymentValidator {

  /**
   * Gestion des erreurs de validation
   */
  handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Erreurs de validation',
        errors: errors.array().map(err => ({
          field: err.path,
          message: err.msg
        }))
      });
    }
    next();
  }

  /**
   * Validation pour initier un paiement
   */
  validateInitiate() {
    return [
      body('orderId')
        .notEmpty().withMessage('L\'ID de commande est requis')
        .isUUID(4).withMessage('L\'ID de commande doit être un UUID valide'),
      
      body('paymentMethod')
        .notEmpty().withMessage('La méthode de paiement est requise')
        .isIn(['mtn', 'orange', 'card', 'stripe', 'paypal', 'wallet'])
        .withMessage('Méthode de paiement invalide. Valeurs autorisées: mtn, orange, card, stripe, paypal, wallet'),
      
      body('phoneNumber')
        .optional()
        .trim()
        .matches(/^[+]?[0-9\s\-()]+$/).withMessage('Format de téléphone invalide')
        .custom((value, { req }) => {
          // Si méthode = mtn ou orange, phoneNumber est requis
          if (['mtn', 'orange'].includes(req.body.paymentMethod) && !value) {
            throw new Error('Le numéro de téléphone est requis pour le paiement mobile money');
          }
          return true;
        }),

      this.handleValidationErrors
    ];
  }

  /**
   * Validation pour récupérer un paiement par ID
   */
  validateId() {
    return [
      param('id')
        .isUUID(4).withMessage('L\'ID doit être un UUID valide'),

      this.handleValidationErrors
    ];
  }

  /**
   * Validation pour la liste des paiements utilisateur
   */
  validateGetUserPayments() {
    return [
      query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('La page doit être un entier positif'),
      
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('La limite doit être entre 1 et 100'),
      
      query('status')
        .optional()
        .isIn(['pending', 'processing', 'success', 'failed', 'cancelled', 'refunded'])
        .withMessage('Statut invalide'),
      
      query('paymentMethod')
        .optional()
        .isIn(['mtn', 'orange', 'card', 'stripe', 'paypal', 'wallet'])
        .withMessage('Méthode de paiement invalide'),

      this.handleValidationErrors
    ];
  }

  /**
   * Validation pour la liste des paiements admin
   */
  validateGetAllPayments() {
    return [
      query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('La page doit être un entier positif'),
      
      query('limit')
        .optional()
        .isInt({ min: 1, max: 200 }).withMessage('La limite doit être entre 1 et 200'),
      
      query('status')
        .optional()
        .isIn(['pending', 'processing', 'success', 'failed', 'cancelled', 'refunded'])
        .withMessage('Statut invalide'),
      
      query('paymentMethod')
        .optional()
        .isIn(['mtn', 'orange', 'card', 'stripe', 'paypal', 'wallet'])
        .withMessage('Méthode de paiement invalide'),
      
      query('startDate')
        .optional()
        .isISO8601().withMessage('Format de date invalide (ISO 8601 requis)'),
      
      query('endDate')
        .optional()
        .isISO8601().withMessage('Format de date invalide (ISO 8601 requis)'),

      this.handleValidationErrors
    ];
  }
}

module.exports = new PaymentValidator();