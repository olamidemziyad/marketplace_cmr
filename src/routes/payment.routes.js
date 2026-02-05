'use strict';

const express = require('express');
const router = express.Router();
const {
  initiatePayment,
  getUserPayments,
  getPaymentById,
  verifyPayment,
  cancelPayment,
  getAllPayments
} = require('../controllers/payment.controller');
const paymentValidator = require('../middlewares/validators/payment.validator');


const authMiddleware = require("../middlewares/auth.middleware");

// Initier un paiement pour une commande
router.post(
  '/initiate',
  authMiddleware,
  paymentValidator.validateInitiate(),
  initiatePayment
);

// Récupérer tous les paiements de l'utilisateur connecté
router.get(
  '/',
  authMiddleware,
  paymentValidator.validateGetUserPayments(),
  getUserPayments
);

// Récupérer un paiement spécifique
router.get(
  '/:id',
  authMiddleware,
  paymentValidator.validateId(),
  getPaymentById
);

// Vérifier le statut d'un paiement
router.get(
  '/:id/verify',
  authMiddleware,
  paymentValidator.validateId(),
  verifyPayment
);

// Annuler un paiement en attente
router.put(
  '/:id/cancel',
  authMiddleware,
  paymentValidator.validateId(),
  cancelPayment
);

// Récupérer tous les paiements (admin)
router.get(
  '/admin/all',
  authMiddleware,
  // authorize('admin'),
  paymentValidator.validateGetAllPayments(),
  getAllPayments
);

module.exports = router;