'use strict';

const { body, param, validationResult } = require('express-validator');

/**
 * Middleware de validation pour le panier
 */
class CartValidator {

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
   * Validation pour ajouter un produit au panier
   */
  validateAddToCart() {
    return [
      body('productId')
        .notEmpty().withMessage('L\'ID du produit est requis')
        .isUUID(4).withMessage('L\'ID du produit doit être un UUID valide'),
      
      body('quantity')
        .optional()
        .isInt({ min: 1, max: 999 }).withMessage('La quantité doit être entre 1 et 999'),

      this.handleValidationErrors
    ];
  }

  /**
   * Validation pour mettre à jour un item
   */
  validateUpdateCartItem() {
    return [
      param('itemId')
        .isUUID(4).withMessage('L\'ID de l\'article doit être un UUID valide'),

      body('quantity')
        .notEmpty().withMessage('La quantité est requise')
        .isInt({ min: 1, max: 999 }).withMessage('La quantité doit être entre 1 et 999'),

      this.handleValidationErrors
    ];
  }

  /**
   * Validation pour supprimer un item
   */
  validateRemoveFromCart() {
    return [
      param('itemId')
        .isUUID(4).withMessage('L\'ID de l\'article doit être un UUID valide'),

      this.handleValidationErrors
    ];
  }
}

module.exports = new CartValidator();