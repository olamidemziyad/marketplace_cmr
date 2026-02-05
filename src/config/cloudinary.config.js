'use strict';

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

//console.log('cloudinary.uploader =', cloudinary.uploader);


// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configuration du storage Cloudinary pour les images de produits 
const productImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'marketplace/products', // Dossier dans Cloudinary 
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'], 
    transformation: [
      {
        width: 1200,
        height: 1200,
        crop: 'limit', // Ne pas agrandir, seulement réduire si nécessaire
        quality: 'auto:good'
      }
    ]
  }
});

// Configuration du storage pour les images de catégories (optionnel, pour plus tard)
const categoryImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'marketplace/categories',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'svg'],
    transformation: [
      {
        width: 500,
        height: 500,
        crop: 'limit',
        quality: 'auto:good'
      }
    ]
  }
});

// Filtre pour valider les types de fichiers
const fileFilter = (req, file, cb) => {
  // Types MIME acceptés
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format de fichier non supporté. Utilisez JPG, PNG, WEBP ou GIF.'), false);
  }
};

// Middleware multer pour upload de produits
const uploadProductImage = multer({
  storage: productImageStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // Limite : 5MB par image
  }
});

// Middleware multer pour upload de catégories
const uploadCategoryImage = multer({
  storage: categoryImageStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // Limite : 2MB
  }
});

// Fonction utilitaire pour supprimer une image de Cloudinary
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'image Cloudinary:', error);
    throw error;
  }
};

// Fonction pour supprimer plusieurs images
const deleteMultipleImages = async (publicIds) => {
  try {
    const result = await cloudinary.api.delete_resources(publicIds);
    return result;
  } catch (error) {
    console.error('Erreur lors de la suppression multiple:', error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  uploadProductImage,
  uploadCategoryImage,
  deleteImage,
  deleteMultipleImages
};