'use strict';

const { body, param, validationResult } = require('express-validator');

/**
 * Middleware de validation pour les adresses
 */
class AddressValidator {

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
   * Validation pour la création d'une adresse
   */
  validateCreate() {
    return [
      body('label')
        .trim()
        .notEmpty().withMessage('Le libellé est requis')
        .isLength({ min: 2, max: 50 }).withMessage('Le libellé doit contenir entre 2 et 50 caractères'),
      
      body('fullName')
        .trim()
        .notEmpty().withMessage('Le nom complet est requis')
        .isLength({ min: 2, max: 100 }).withMessage('Le nom doit contenir entre 2 et 100 caractères'),
      
      body('phone')
        .trim()
        .notEmpty().withMessage('Le numéro de téléphone est requis')
        .matches(/^[+]?[0-9\s\-()]+$/).withMessage('Format de téléphone invalide'),
      
      body('line1')
        .trim()
        .notEmpty().withMessage('L\'adresse (ligne 1) est requise')
        .isLength({ min: 5, max: 255 }).withMessage('L\'adresse doit contenir entre 5 et 255 caractères'),
      
      body('line2')
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 255 }).withMessage('La ligne 2 ne peut pas dépasser 255 caractères'),
      
      body('city')
        .trim()
        .notEmpty().withMessage('La ville est requise')
        .isLength({ min: 2, max: 100 }).withMessage('La ville doit contenir entre 2 et 100 caractères'),
      
      body('region')
        .trim()
        .notEmpty().withMessage('La région est requise')
        .isLength({ min: 2, max: 100 }).withMessage('La région doit contenir entre 2 et 100 caractères'),
      
     /*  body('postalCode')
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 10 }).withMessage('Le code postal ne peut pas dépasser 10 caractères'), */
      
      body('country')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 }).withMessage('Le pays doit contenir entre 2 et 50 caractères'),
      
      body('isDefault')
        .optional()
        .isBoolean().withMessage('isDefault doit être un booléen'),
      
      body('deliveryInstructions')
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 1000 }).withMessage('Les instructions ne peuvent pas dépasser 1000 caractères'),

      this.handleValidationErrors
    ];
  }

  /**
   * Validation pour la mise à jour d'une adresse
   */
  validateUpdate() {
    return [
      param('id')
        .isUUID(4).withMessage('L\'ID doit être un UUID valide'),

      body('label')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 }).withMessage('Le libellé doit contenir entre 2 et 50 caractères'),
      
      body('fullName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 }).withMessage('Le nom doit contenir entre 2 et 100 caractères'),
      
      body('phone')
        .optional()
        .trim()
        .matches(/^[+]?[0-9\s\-()]+$/).withMessage('Format de téléphone invalide'),
      
      body('line1')
        .optional()
        .trim()
        .isLength({ min: 5, max: 255 }).withMessage('L\'adresse doit contenir entre 5 et 255 caractères'),
      
      body('line2')
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 255 }).withMessage('La ligne 2 ne peut pas dépasser 255 caractères'),
      
      body('city')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 }).withMessage('La ville doit contenir entre 2 et 100 caractères'),
      
      body('region')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 }).withMessage('La région doit contenir entre 2 et 100 caractères'),
      
     /*  body('postalCode')
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 10 }).withMessage('Le code postal ne peut pas dépasser 10 caractères'), */
      
      body('country')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 }).withMessage('Le pays doit contenir entre 2 et 50 caractères'),
      
      body('isDefault')
        .optional()
        .isBoolean().withMessage('isDefault doit être un booléen'),
      
      body('deliveryInstructions')
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 1000 }).withMessage('Les instructions ne peuvent pas dépasser 1000 caractères'),

      this.handleValidationErrors
    ];
  }

  /**
   * Validation pour récupérer/supprimer une adresse par ID
   */
  validateId() {
    return [
      param('id')
        .isUUID(4).withMessage('L\'ID doit être un UUID valide'),

      this.handleValidationErrors
    ];
  }
}

module.exports = new AddressValidator();