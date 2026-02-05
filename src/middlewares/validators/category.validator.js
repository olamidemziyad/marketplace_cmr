'use strict';

const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware de validation pour les catégories
 */
class CategoryValidator {

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
   * Validation pour la création d'une catégorie
   */
  validateCreate() {
    return [
      body('name')
        .trim()
        .notEmpty().withMessage('Le nom est requis')
        .isLength({ min: 2, max: 100 }).withMessage('Le nom doit contenir entre 2 et 100 caractères'),
      
      body('slug')
        .trim()
        .notEmpty().withMessage('Le slug est requis')
        .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).withMessage('Le slug doit être en minuscules avec des tirets (ex: electronique-phone)')
        .isLength({ max: 120 }).withMessage('Le slug ne peut pas dépasser 120 caractères'),
      
      body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 }).withMessage('La description ne peut pas dépasser 1000 caractères'),
      
      body('parentId')
        .optional({ nullable: true })
        .isUUID(4).withMessage('L\'ID parent doit être un UUID valide'),
      
      body('imageUrl')
        .optional({ nullable: true })
        .isURL().withMessage('L\'URL de l\'image doit être valide'),
      
      body('metadata')
        .optional()
        .isObject().withMessage('Les métadonnées doivent être un objet JSON'),
      
      body('isActive')
        .optional()
        .isBoolean().withMessage('isActive doit être un booléen'),

      this.handleValidationErrors
    ];
  }

  /**
   * Validation pour la mise à jour d'une catégorie
   */
  validateUpdate() {
    return [
      param('id')
        .isUUID(4).withMessage('L\'ID doit être un UUID valide'),

      body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 }).withMessage('Le nom doit contenir entre 2 et 100 caractères'),
      
      body('slug')
        .optional()
        .trim()
        .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).withMessage('Le slug doit être en minuscules avec des tirets'),
      
      body('description')
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 1000 }).withMessage('La description ne peut pas dépasser 1000 caractères'),
      
      body('parentId')
        .optional({ nullable: true })
        .custom((value) => {
          if (value === null) return true;
          // Vérifier si c'est un UUID valide
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(value)) {
            throw new Error('L\'ID parent doit être un UUID valide');
          }
          return true;
        }),
      
      body('imageUrl')
        .optional({ nullable: true })
        .custom((value) => {
          if (value === null || value === '') return true;
          const urlRegex = /^https?:\/\/.+/;
          if (!urlRegex.test(value)) {
            throw new Error('L\'URL de l\'image doit être valide');
          }
          return true;
        }),
      
      body('metadata')
        .optional()
        .isObject().withMessage('Les métadonnées doivent être un objet JSON'),
      
      body('isActive')
        .optional()
        .isBoolean().withMessage('isActive doit être un booléen'),

      this.handleValidationErrors
    ];
  }

  /**
   * Validation pour récupérer une catégorie par ID
   */
  validateGetById() {
    return [
      param('id')
        .isUUID(4).withMessage('L\'ID doit être un UUID valide'),

      this.handleValidationErrors
    ];
  }

  /**
   * Validation pour récupérer une catégorie par slug
   */
  validateGetBySlug() {
    return [
      param('slug')
        .trim()
        .notEmpty().withMessage('Le slug est requis')
        .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).withMessage('Le slug doit être valide'),

      this.handleValidationErrors
    ];
  }

  /**
   * Validation pour la liste des catégories
   */
  validateGetAll() {
    return [
      query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('La page doit être un entier positif'),
      
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('La limite doit être entre 1 et 100'),
      
      query('search')
        .optional()
        .trim(),
      
      query('isActive')
        .optional()
        .isIn(['true', 'false']).withMessage('isActive doit être "true" ou "false"'),
      
      query('includeSubcategories')
        .optional()
        .isIn(['true', 'false']).withMessage('includeSubcategories doit être "true" ou "false"'),

      this.handleValidationErrors
    ];
  }

  /**
   * Validation pour la suppression
   */
  validateDelete() {
    return [
      param('id')
        .isUUID(4).withMessage('L\'ID doit être un UUID valide'),

      this.handleValidationErrors
    ];
  }
}

module.exports = new CategoryValidator();