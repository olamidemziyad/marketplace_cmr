'use strict';

const express = require('express');
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartCount
} = require('../controllers/cart.controller');
const cartValidator = require('../middlewares/validators/cart.validator');
const authMiddleware = require('../middlewares/auth.middleware');

/**
 * Toutes les routes nécessitent une authentification
 * Un utilisateur ne peut gérer QUE son propre panier
 */

// Récupérer le panier de l'utilisateur connecté
router.get(
  '/',
  authMiddleware,
  getCart
);

// Obtenir le nombre d'articles (pour badge)
router.get(
  '/count',
  authMiddleware,
  getCartCount
);

// Ajouter un produit au panier
router.post(
  '/items',
  authMiddleware,
  cartValidator.validateAddToCart(),
  addToCart
);

// Mettre à jour la quantité d'un item
router.put(
  '/items/:itemId',
  authMiddleware,
  cartValidator.validateUpdateCartItem(),
  updateCartItem
);

// Supprimer un item du panier
router.delete(
  '/items/:itemId',
  authMiddleware,
  cartValidator.validateRemoveFromCart(),
  removeFromCart
);

// Vider le panier
router.delete(
  '/',
  authMiddleware,
  clearCart
);

module.exports = router;