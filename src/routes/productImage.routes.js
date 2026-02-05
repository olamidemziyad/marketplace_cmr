'use strict';

const express = require('express');
const router = express.Router({ mergeParams: true }); 
// mergeParams = true → permet d'accéder à :productId depuis la route parent

const {
  uploadProductImages,
  getProductImages,
  setPrimaryImage,
  reorderImages,
  deleteProductImage,
  deleteAllProductImages
} = require('../controllers/productImage.controller');

const productImageValidator = require('../middlewares/validators/productImage.validator');
const { uploadProductImage } = require('../config/cloudinary.config');
const authMiddleware = require("../middlewares/auth.middleware");

const authorize = require('../middlewares/authorize');


   //ROUTES PUBLIQUES


// Récupérer toutes les images d'un produit (public)
router.get(
  '/',
  productImageValidator.validateGetImages(),
  getProductImages
);


// Uploader une ou plusieurs images (max 5)
router.post(
  '/',
  authMiddleware,
  authorize('admin', 'seller'),
  productImageValidator.validateUpload,
  uploadProductImage.array('images', 5),
  uploadProductImages
);

router.put(
  '/:imageId/set-primary',
  authMiddleware,
  authorize('seller', 'admin'),
  productImageValidator.validateSetPrimary(),
  setPrimaryImage
);


// Réorganiser l’ordre des images
router.put(
  '/reorder',
  authMiddleware,
  authorize('seller', 'admin'),
  productImageValidator.validateReorder(),
  reorderImages
);

// Supprimer une image spécifique
router.delete(
  '/:imageId',
  authMiddleware,
  authorize('seller', 'admin'),
  productImageValidator.validateDeleteImage(),
  deleteProductImage
);

// Supprimer toutes les images d’un produit
router.delete(
  '/',
  authMiddleware,
  authorize('seller', 'admin'), 
  productImageValidator.validateDeleteAll(),
  deleteAllProductImages
);

module.exports = router;
