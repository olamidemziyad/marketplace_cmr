'use strict';

const { ProductImage, Product } = require('../models');
const { deleteImage, deleteMultipleImages } = require('../config/cloudinary.config');

/**
 * Uploader une ou plusieurs images pour un produit
 * POST /api/v1/products/:productId/images
 */
const uploadProductImages = async (req, res) => {
  try {
    const { productId } = req.params;

    // Vérifier que le produit existe
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit introuvable'
      });
    }

    // Vérifier que des fichiers ont été uploadés
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier image fourni'
      });
    }

    // Limiter à 5 images max par upload
    if (req.files.length > 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 5 images par upload'
      });
    }

    // Compter les images existantes
    const existingImagesCount = await ProductImage.count({
      where: { productId }
    });

    // Vérifier qu'on ne dépasse pas 10 images au total
    if (existingImagesCount + req.files.length > 10) {
      return res.status(400).json({
        success: false,
        message: `Ce produit a déjà ${existingImagesCount} image(s). Maximum 10 images par produit.`
      });
    }

    // Déterminer si c'est la première image (elle sera primaire)
    const isPrimaryImage = existingImagesCount === 0;

    // Créer les enregistrements pour chaque image uploadée
   const imageRecords = await Promise.all(
  req.files.map((file, index) => {
    return ProductImage.create({
      productId,
      url: file.path,
      publicId: file.filename,
      isPrimary: isPrimaryImage && index === 0,
      order: Number(existingImagesCount + index),
      width: file.width ?? null,
      height: file.height ?? null,
      format: file.format ?? null,
      size: file.size ?? null
    });
  })
);


    return res.status(201).json({
      success: true,
      message: `${imageRecords.length} image(s) uploadée(s) avec succès`,
      data: imageRecords
    });

  } catch (error) {
    console.error('Erreur lors de l\'upload des images:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'upload',
      error: error.message
    });
  }
};

/**
 * Récupérer toutes les images d'un produit
 * GET /api/v1/products/:productId/images
 */
const getProductImages = async (req, res) => {
  try {
    const { productId } = req.params;

    // Vérifier que le produit existe
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit introuvable'
      });
    }

    // Récupérer toutes les images
    const images = await ProductImage.findAll({
      where: { productId },
      order: [
        ['isPrimary', 'DESC'], // Image primaire en premier
        ['order', 'ASC']       // Puis par ordre
      ]
    });

    return res.status(200).json({
      success: true,
      message: 'Images récupérées avec succès',
      data: {
        productId,
        totalImages: images.length,
        images
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des images:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

/**
 * Définir une image comme image principale
 * PUT /api/v1/products/:productId/images/:imageId/set-primary
 */
const setPrimaryImage = async (req, res) => {
  try {
    console.log('SET PRIMARY IMAGE HIT', req.params);
    const { productId, imageId } = req.params;

    // Vérifier que l'image existe et appartient au produit
    const image = await ProductImage.findOne({
      where: { id: imageId, productId }
    });

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image introuvable pour ce produit'
      });
    }

    // Mettre à jour (le hook beforeUpdate gère la désactivation des autres)
    await image.update({ isPrimary: true });

    return res.status(200).json({
      success: true,
      message: 'Image principale définie avec succès',
      data: image
    });

  } catch (error) {
    console.error('Erreur lors de la définition de l\'image principale:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

/**
 * Réorganiser l'ordre des images
 * PUT /api/v1/products/:productId/images/reorder
 */
const reorderImages = async (req, res) => {
  try {
    const { productId } = req.params;
    const { imageOrders } = req.body; // Format: [{ imageId, order }, ...]

    // Validation
    if (!Array.isArray(imageOrders) || imageOrders.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Format invalide. Attendu: { imageOrders: [{ imageId, order }, ...] }'
      });
    }

    // Vérifier que le produit existe
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit introuvable'
      });
    }

    // Mettre à jour l'ordre de chaque image
    const updatePromises = imageOrders.map(async ({ imageId, order }) => {
      const image = await ProductImage.findOne({
        where: { id: imageId, productId }
      });

      if (image) {
        return await image.update({ order });
      }
    });

    await Promise.all(updatePromises);

    // Récupérer les images mises à jour
    const updatedImages = await ProductImage.findAll({
      where: { productId },
      order: [['order', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      message: 'Ordre des images mis à jour avec succès',
      data: updatedImages
    });

  } catch (error) {
    console.error('Erreur lors de la réorganisation:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

/**
 * Supprimer une image
 * DELETE /api/v1/products/:productId/images/:imageId
 */
const deleteProductImage = async (req, res) => {
  try {
    const { productId, imageId } = req.params;

    // Vérifier que l'image existe et appartient au produit
    const image = await ProductImage.findOne({
      where: { id: imageId, productId }
    });

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image introuvable pour ce produit'
      });
    }

    // Supprimer de Cloudinary
    try {
      await deleteImage(image.publicId);
    } catch (cloudinaryError) {
      console.error('Erreur Cloudinary:', cloudinaryError);
      // Continue quand même pour supprimer de la DB
    }

    // Supprimer de la base de données
    await image.destroy();

    // Si c'était l'image primaire, définir une nouvelle image primaire
    if (image.isPrimary) {
      const firstImage = await ProductImage.findOne({
        where: { productId },
        order: [['order', 'ASC']]
      });

      if (firstImage) {
        await firstImage.update({ isPrimary: true });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Image supprimée avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la suppression de l\'image:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la suppression',
      error: error.message
    });
  }
};

/**
 * Supprimer toutes les images d'un produit
 * DELETE /api/v1/products/:productId/images
 */
const deleteAllProductImages = async (req, res) => {
  try {
    const { productId } = req.params;

    // Vérifier que le produit existe
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Produit introuvable'
      });
    }

    // Récupérer toutes les images
    const images = await ProductImage.findAll({
      where: { productId }
    });

    if (images.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Aucune image à supprimer'
      });
    }

    // Supprimer de Cloudinary (en batch)
    const publicIds = images.map(img => img.publicId);
    try {
      await deleteMultipleImages(publicIds);
    } catch (cloudinaryError) {
      console.error('Erreur Cloudinary:', cloudinaryError);
      // Continue quand même
    }

    // Supprimer de la base de données
    await ProductImage.destroy({
      where: { productId }
    });

    return res.status(200).json({
      success: true,
      message: `${images.length} image(s) supprimée(s) avec succès`
    });

  } catch (error) {
    console.error('Erreur lors de la suppression des images:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};


// Exports
module.exports = {
  uploadProductImages,
  getProductImages,
  setPrimaryImage,
  reorderImages,
  deleteProductImage,
  deleteAllProductImages
};