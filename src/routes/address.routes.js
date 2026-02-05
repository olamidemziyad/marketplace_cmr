'use strict';

const express = require('express');
const router = express.Router();
const {
  createAddress,
  getUserAddresses,
  getAddressById,
  updateAddress,
  setDefaultAddress,
  deleteAddress
} = require('../controllers/address.controller');
const addressValidator = require('../middlewares/validators/address.validator');
const authMiddleware = require("../middlewares/auth.middleware");
const authorize = require('../middlewares/authorize');


/**
 * Toutes les routes nécessitent une authentification
 * Un utilisateur ne peut gérer QUE ses propres adresses
 */

// Récupérer toutes les adresses de l'utilisateur connecté
router.get(
  '/',
  authMiddleware, // ou authenticate
  getUserAddresses
);

// Créer une nouvelle adresse
router.post(
  '/',
  authMiddleware, // ou authenticate
  addressValidator.validateCreate(),
  createAddress
);

// Récupérer une adresse spécifique
router.get(
  '/:id',
  authMiddleware, // ou authenticate
  addressValidator.validateId(),
  getAddressById
);

// Mettre à jour une adresse
router.put(
  '/:id',
  authMiddleware, // ou authenticate
  addressValidator.validateUpdate(),
  updateAddress
);

// Définir une adresse comme adresse par défaut
router.put(
  '/:id/set-default',
  authMiddleware, // ou authenticate
  addressValidator.validateId(),
  setDefaultAddress
);

// Supprimer une adresse
router.delete(
  '/:id',
  authMiddleware, // ou authenticate
  addressValidator.validateId(),
  deleteAddress
);

module.exports = router;