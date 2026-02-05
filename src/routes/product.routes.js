const express = require("express");
const router = express.Router();
const productController = require("../controllers/product.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const authorize = require('../middlewares/authorize');
// ✨ Import des routes d'images (nouvelle configuration Cloudinary)
const productImageRoutes = require('./productImage.routes');

/**
 * Routes publiques
 */
// Récupérer tous les produits avec filtres
router.get("/", productController.getProducts);

// Récupérer un produit par ID (avec ses images)
//router.get("/:id", productController.getProductById);

/**
 * Routes protégées (seller uniquement)
 */
// Créer un produit
router.post("/", authMiddleware, authorize('seller'), productController.createProduct);

// Mettre à jour un produit
router.put("/:id", authMiddleware, authorize('seller'), productController.updateProduct);

// Supprimer un produit
router.delete("/:id", authMiddleware, authorize('seller'), productController.deleteProduct);

/**
 * Routes pour la gestion des images (nouvelle architecture)
 * Toutes les routes /api/v1/products/:productId/images/* sont gérées ici
 * 
 * Endpoints disponibles :
 * - POST   /products/:productId/images              → Upload 1-5 images
 * - GET    /products/:productId/images              → Liste toutes les images
 * - PUT    /products/:productId/images/:imageId/set-primary → Définir image principale
 * - PUT    /products/:productId/images/reorder      → Réorganiser ordre
 * - DELETE /products/:productId/images/:imageId     → Supprimer une image
 * - DELETE /products/:productId/images              → Supprimer toutes les images
 */
router.use('/:productId/images', productImageRoutes);

module.exports = router;