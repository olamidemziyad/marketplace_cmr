const express = require("express");
const router = express.Router();
const orderController = require("../controllers/order.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const {
  validateCheckout,
  validateUpdateStatus,
  validateTrackingNumber,
  validateCancelOrder,
  validateSessionId,
  validateOrderId
} = require("../middlewares/validators/order.validator");

// ROUTES EXISTANTES

/**
 * @route   POST /api/v1/orders
 * @desc    Créer une commande simple (ancienne méthode)
 * @access  Private
 */
router.post("/", authMiddleware, orderController.createOrder);

/**
 * @route   POST /api/v1/orders/:id/pay
 * @desc    Payer une commande via Stripe
 * @access  Private
 */
router.post("/:id/pay", authMiddleware, orderController.payOrder);

// ============================================
//  NOUVELLES ROUTES - CHECKOUT
// ============================================

/**
 * @route   POST /api/v1/orders/checkout
 * @desc    Créer des commandes depuis le panier (multi-vendeurs)
 * @access  Private (Buyer)
 */
router.post(
  "/checkout", 
  authMiddleware, 
  validateCheckout, 
  orderController.createCheckoutSession
);

/**
 * @route   GET /api/v1/orders/session/:sessionId
 * @desc    Récupérer toutes les commandes d'une session
 * @access  Private (Buyer)
 */
router.get(
  "/session/:sessionId", 
  authMiddleware, 
  validateSessionId, 
  orderController.getOrdersBySession
);

// ============================================
// NOUVELLES ROUTES - GESTION DES COMMANDES
// ============================================

/**
 * @route   GET /api/v1/orders/my-orders
 * @desc    Liste de mes commandes (acheteur)
 * @access  Private (Buyer)
 */
router.get("/my-orders", authMiddleware, orderController.getMyOrders);

/**
 * @route   GET /api/v1/orders/seller/orders
 * @desc    Liste des commandes reçues (vendeur)
 * @access  Private (Seller)
 */
router.get("/seller/orders", authMiddleware, orderController.getSellerOrders);

/**
 * @route   GET /api/v1/orders/:orderId
 * @desc    Détails d'une commande spécifique
 * @access  Private (Buyer ou Seller)
 */
router.get(
  "/:orderId", 
  authMiddleware, 
  validateOrderId, 
  orderController.getOrderDetails
);

/**
 * @route   PATCH /api/v1/orders/:orderId/status
 * @desc    Mettre à jour le statut d'une commande
 * @access  Private (Seller)
 */
router.patch(
  "/:orderId/status", 
  authMiddleware, 
  validateUpdateStatus, 
  orderController.updateOrderStatus
);

/**
 * @route   PATCH /api/v1/orders/:orderId/tracking
 * @desc    Ajouter un numéro de suivi
 * @access  Private (Seller)
 */
router.patch(
  "/:orderId/tracking", 
  authMiddleware, 
  validateTrackingNumber, 
  orderController.addTrackingNumber
);

/**
 * @route   POST /api/v1/orders/:orderId/cancel
 * @desc    Annuler une commande
 * @access  Private (Buyer)
 */
router.post(
  "/:orderId/cancel", 
  authMiddleware, 
  validateCancelOrder, 
  orderController.cancelOrder
);

module.exports = router;