'use strict';

const { param, body, validationResult } = require('express-validator');

/**
 * Middleware de validation pour les images de produits
 */
class ProductImageValidator {

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
   * Validation pour récupérer les images d'un produit
   */
  validateGetImages() {
    return [
      param('productId')
        .isUUID(4).withMessage('L\'ID du produit doit être un UUID valide'),

      this.handleValidationErrors
    ];
  }

  /**
   * Validation pour définir une image principale
   */
  validateSetPrimary() {
    return [
      param('productId')
        .isUUID(4).withMessage('L\'ID du produit doit être un UUID valide'),
      
      param('imageId')
        .isUUID(4).withMessage('L\'ID de l\'image doit être un UUID valide'),

      this.handleValidationErrors
    ];
  }

  /**
   * Validation pour réorganiser les images
   */
  validateReorder() {
    return [
      param('productId')
        .isUUID(4).withMessage('L\'ID du produit doit être un UUID valide'),

      body('imageOrders')
        .isArray({ min: 1 }).withMessage('imageOrders doit être un tableau non vide'),

      body('imageOrders.*.imageId')
        .isUUID(4).withMessage('Chaque imageId doit être un UUID valide'),

      body('imageOrders.*.order')
        .isInt({ min: 0 }).withMessage('Chaque order doit être un entier positif'),

      this.handleValidationErrors
    ];
  }

  /**
   * Validation pour supprimer une image
   */
  validateDeleteImage() {
    return [
      param('productId')
        .isUUID(4).withMessage('L\'ID du produit doit être un UUID valide'),
      
      param('imageId')
        .isUUID(4).withMessage('L\'ID de l\'image doit être un UUID valide'),

      this.handleValidationErrors
    ];
  }

  /**
   * Validation pour supprimer toutes les images
   */
  validateDeleteAll() {
    return [
      param('productId')
        .isUUID(4).withMessage('L\'ID du produit doit être un UUID valide'),

      this.handleValidationErrors
    ];
  }

  /**
   * Middleware pour valider l'upload de fichiers
   */
  validateUpload(req, res, next) {
    // Vérifier que productId est un UUID
    const { productId } = req.params;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(productId)) {
      return res.status(400).json({
        success: false,
        message: 'L\'ID du produit doit être un UUID valide'
      });
    }

    next();
  }
}

module.exports = new ProductImageValidator();