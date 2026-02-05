'use strict';

const { Address, User } = require('../models');

const createAddress = async (req, res) => {
  try {
    const userId = req.user.id; // Depuis le middleware authenticate
    const {
      label,
      fullName,
      phone,
      line1,
      line2,
      city,
      region,
      ////postalCode,
      country,
      isDefault,
      deliveryInstructions
    } = req.body;

    // Vérifier si c'est la première adresse (elle sera automatiquement par défaut)
    const existingAddressCount = await Address.count({ where: { userId } });
    const shouldBeDefault = existingAddressCount === 0 ? true : (isDefault || false);

    const address = await Address.create({
      userId,
      label,
      fullName,
      phone,
      line1,
      line2,
      city,
      region,
      ////postalCode,
      country: country || 'Cameroun',
      isDefault: shouldBeDefault,
      deliveryInstructions
    });

    return res.status(201).json({
      success: true,
      message: 'Adresse créée avec succès',
      data: address
    });

  } catch (error) {
    console.error('Erreur lors de la création de l\'adresse:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création de l\'adresse',
      error: error.message
    });
  }
};

/**
 * Récupérer toutes les adresses de l'utilisateur connecté
 * GET /api/v1/addresses
 */
const getUserAddresses = async (req, res) => {
  try {
    const userId = req.user.id;

    const addresses = await Address.findAll({
      where: { userId },
      order: [
        ['isDefault', 'DESC'], // Adresse par défaut en premier
        ['createdAt', 'DESC']
      ]
    });

    return res.status(200).json({
      success: true,
      message: 'Adresses récupérées avec succès',
      data: {
        totalAddresses: addresses.length,
        addresses
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des adresses:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

/**
 * Récupérer une adresse spécifique
 * GET /api/v1/addresses/:id
 */
const getAddressById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const address = await Address.findOne({
      where: { id, userId } // Vérifier que l'adresse appartient à l'utilisateur
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Adresse introuvable'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Adresse récupérée avec succès',
      data: address
    });

  } catch (error) {
    console.error('Erreur lors de la récupération de l\'adresse:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

/**
 * Mettre à jour une adresse
 * PUT /api/v1/addresses/:id
 */
const updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      label,
      fullName,
      phone,
      line1,
      line2,
      city,
      region,
      //postalCode,
      country,
      isDefault,
      deliveryInstructions
    } = req.body;

    // Vérifier que l'adresse existe et appartient à l'utilisateur
    const address = await Address.findOne({
      where: { id, userId }
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Adresse introuvable'
      });
    }

    // Mettre à jour
    await address.update({
      label: label || address.label,
      fullName: fullName || address.fullName,
      phone: phone || address.phone,
      line1: line1 || address.line1,
      line2: line2 !== undefined ? line2 : address.line2,
      city: city || address.city,
      region: region || address.region,
      //postalCode: //postalCode !== undefined ? //postalCode : address.//postalCode, 
      country: country || address.country,
      isDefault: isDefault !== undefined ? isDefault : address.isDefault,
      deliveryInstructions: deliveryInstructions !== undefined ? deliveryInstructions : address.deliveryInstructions
    });

    return res.status(200).json({
      success: true,
      message: 'Adresse mise à jour avec succès',
      data: address
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'adresse:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la mise à jour',
      error: error.message
    });
  }
};

/**
 * Définir une adresse comme adresse par défaut
 * PUT /api/v1/addresses/:id/set-default
 */
const setDefaultAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Vérifier que l'adresse existe et appartient à l'utilisateur
    const address = await Address.findOne({
      where: { id, userId }
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Adresse introuvable'
      });
    }

    // Mettre à jour (le hook beforeUpdate gère la désactivation des autres)
    await address.update({ isDefault: true });

    return res.status(200).json({
      success: true,
      message: 'Adresse définie comme adresse par défaut',
      data: address
    });

  } catch (error) {
    console.error('Erreur lors de la définition de l\'adresse par défaut:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

/**
 * Supprimer une adresse
 * DELETE /api/v1/addresses/:id
 */
const deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Vérifier que l'adresse existe et appartient à l'utilisateur
    const address = await Address.findOne({
      where: { id, userId }
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Adresse introuvable'
      });
    }

    const wasDefault = address.isDefault;

    // Supprimer l'adresse
    await address.destroy();

    // Si c'était l'adresse par défaut, définir une nouvelle adresse par défaut
    if (wasDefault) {
      const firstAddress = await Address.findOne({
        where: { userId },
        order: [['createdAt', 'ASC']]
      });

      if (firstAddress) {
        await firstAddress.update({ isDefault: true });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Adresse supprimée avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la suppression de l\'adresse:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la suppression',
      error: error.message
    });
  }
};

// Exports
module.exports = {
  createAddress,
  getUserAddresses,
  getAddressById,
  updateAddress,
  setDefaultAddress,
  deleteAddress
};