'use strict';

const { Payment, Order, User } = require('../models');
const { Op } = require('sequelize');
const pawapayService = require('../services/pawapay.service');

/**
 * Initier un paiement pour une commande
 * POST /api/v1/payments/initiate
 */
const initiatePayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId, paymentMethod, phoneNumber } = req.body;

    // Vérifier que la commande existe et appartient à l'utilisateur
    const order = await Order.findOne({
      where: { id: orderId, buyerId: userId }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande introuvable'
      });
    }

    // Vérifier que la commande n'est pas déjà payée
    const existingPayment = await Payment.findOne({
      where: {
        orderId,
        status: 'success'
      }
    });

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: 'Cette commande est déjà payée'
      });
    }

    // Vérifier qu'on n'a pas déjà un paiement en attente
    const pendingPayment = await Payment.findOne({
      where: {
        orderId,
        status: { [Op.in]: ['pending', 'processing'] }
      }
    });

    if (pendingPayment) {
      return res.status(400).json({
        success: false,
        message: 'Un paiement est déjà en cours pour cette commande',
        data: {
          paymentId: pendingPayment.id,
          status: pendingPayment.status
        }
      });
    }

    // Validation spécifique pour mobile money
    if (['mtn', 'orange'].includes(paymentMethod) && !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Le numéro de téléphone est requis pour le paiement mobile money'
      });
    }

    // Créer le paiement avec status pending
    const payment = await Payment.create({
      orderId,
      userId,
      paymentMethod,
      amount: order.totalAmount,
      currency: 'XAF',
      phoneNumber,
      status: 'pending',
      metadata: {
        orderReference: order.id,
        initiatedBy: userId,
        initiatedAt: new Date()
      }
    });

    // ✨ INTÉGRATION PAWAPAY pour MTN et Orange
    if (['mtn', 'orange'].includes(paymentMethod)) {
      const pawapayResult = await pawapayService.initiateDeposit({
        phoneNumber,
        amount: parseFloat(order.totalAmount),
        orderId: order.id,
        userId,
        paymentMethod
      });

      if (pawapayResult.success) {
        // Mettre à jour le paiement avec les infos PawaPay
        await payment.update({
          providerTransactionId: pawapayResult.depositId,
          status: 'processing',
          metadata: {
            ...payment.metadata,
            pawapayDepositId: pawapayResult.depositId,
            correspondentId: pawapayResult.correspondentId,
            pawapayStatus: pawapayResult.status
          }
        });

        return res.status(201).json({
          success: true,
          message: 'Paiement initié avec succès',
          data: {
            paymentId: payment.id,
            depositId: pawapayResult.depositId,
            amount: payment.amount,
            currency: payment.currency,
            paymentMethod: payment.paymentMethod,
            status: payment.status,
            instructions: getPaymentInstructions(paymentMethod, phoneNumber)
          }
        });

      } else {
        // Échec de l'initiation PawaPay
        await payment.update({
          status: 'failed',
          failureReason: pawapayResult.error
        });

        return res.status(400).json({
          success: false,
          message: 'Échec de l\'initiation du paiement',
          error: pawapayResult.error,
          paymentId: payment.id
        });
      }
    }

    // Pour les autres méthodes (card, stripe, etc.) - à implémenter
    return res.status(201).json({
      success: true,
      message: 'Paiement initié avec succès',
      data: {
        paymentId: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        instructions: getPaymentInstructions(paymentMethod, phoneNumber)
      }
    });

  } catch (error) {
    console.error('Erreur lors de l\'initiation du paiement:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'initiation du paiement',
      error: error.message
    });
  }
};

/**
 * Récupérer tous les paiements de l'utilisateur connecté
 * GET /api/v1/payments
 */
const getUserPayments = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      page = 1,
      limit = 20,
      status,
      paymentMethod
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereClause = { userId };

    if (status) {
      whereClause.status = status;
    }
    if (paymentMethod) {
      whereClause.paymentMethod = paymentMethod;
    }

    const { count, rows: payments } = await Payment.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'totalAmount', 'status', 'createdAt']
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      message: 'Paiements récupérés avec succès',
      data: {
        payments,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des paiements:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

/**
 * Récupérer un paiement par ID
 * GET /api/v1/payments/:id
 */
const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const payment = await Payment.findOne({
      where: { id, userId },
      include: [
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'totalAmount', 'status', 'createdAt']
        }
      ]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Paiement introuvable'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Paiement récupéré avec succès',
      data: payment
    });

  } catch (error) {
    console.error('Erreur lors de la récupération du paiement:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

/**
 * Vérifier le statut d'un paiement auprès de PawaPay
 * GET /api/v1/payments/:id/verify
 */
const verifyPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const payment = await Payment.findOne({
      where: { id, userId }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Paiement introuvable'
      });
    }

    // Si déjà vérifié et success, retourner directement
    if (payment.status === 'success' && payment.verifiedAt) {
      return res.status(200).json({
        success: true,
        message: 'Paiement déjà vérifié',
        data: payment
      });
    }

    // ✨ Vérifier auprès de PawaPay si MTN ou Orange
    if (['mtn', 'orange'].includes(payment.paymentMethod) && payment.providerTransactionId) {
      const result = await pawapayService.getDepositStatus(payment.providerTransactionId);

      if (result.success) {
        const newStatus = pawapayService.mapPawapayStatus(result.status);
        
        // Mettre à jour le paiement
        await payment.update({
          status: newStatus,
          verifiedAt: new Date(),
          metadata: {
            ...payment.metadata,
            lastVerification: new Date(),
            pawapayStatus: result.status,
            pawapayData: result.data
          },
          failureReason: result.data.failureReason ? 
            pawapayService.getReadableFailureReason(result.data.failureReason) : null
        });

        // Si le paiement est success, mettre à jour la commande
        if (newStatus === 'success') {
          await Order.update(
            { status: 'paid', paymentStatus: 'success' },
            { where: { id: payment.orderId } }
          );
        }

        return res.status(200).json({
          success: true,
          message: 'Statut du paiement vérifié',
          data: payment
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Statut du paiement',
      data: payment
    });

  } catch (error) {
    console.error('Erreur lors de la vérification du paiement:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la vérification',
      error: error.message
    });
  }
};

/**
 * Annuler un paiement en attente
 * PUT /api/v1/payments/:id/cancel
 */
const cancelPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const payment = await Payment.findOne({
      where: { id, userId }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Paiement introuvable'
      });
    }

    if (!['pending', 'processing'].includes(payment.status)) {
      return res.status(400).json({
        success: false,
        message: `Impossible d'annuler un paiement avec le statut: ${payment.status}`
      });
    }

    await payment.update({
      status: 'cancelled',
      metadata: {
        ...payment.metadata,
        cancelledAt: new Date(),
        cancelledBy: userId
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Paiement annulé avec succès',
      data: payment
    });

  } catch (error) {
    console.error('Erreur lors de l\'annulation du paiement:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

/**
 * Admin: Récupérer tous les paiements
 * GET /api/v1/payments/admin/all
 */
const getAllPayments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      paymentMethod,
      startDate,
      endDate
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereClause = {};

    if (status) {
      whereClause.status = status;
    }
    if (paymentMethod) {
      whereClause.paymentMethod = paymentMethod;
    }
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt[Op.lte] = new Date(endDate);
      }
    }

    const { count, rows: payments } = await Payment.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'totalAmount', 'status']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    // Statistiques
    const stats = await Payment.findAll({
      attributes: [
        'status',
        [Payment.sequelize.fn('COUNT', Payment.sequelize.col('id')), 'count'],
        [Payment.sequelize.fn('SUM', Payment.sequelize.col('amount')), 'totalAmount']
      ],
      group: ['status']
    });

    return res.status(200).json({
      success: true,
      message: 'Paiements récupérés avec succès',
      data: {
        payments,
        stats,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des paiements:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// Fonction utilitaire pour les instructions de paiement
const getPaymentInstructions = (method, phoneNumber) => {
  switch (method) {
    case 'mtn':
      return `Un message de confirmation MTN Mobile Money va être envoyé au ${phoneNumber}. Entrez votre code PIN pour valider le paiement.`;
    case 'orange':
      return `Un message de confirmation Orange Money va être envoyé au ${phoneNumber}. Composez #150*1*1*CODE_PIN# pour valider.`;
    case 'card':
    case 'stripe':
      return 'Vous allez être redirigé vers la page de paiement sécurisée.';
    default:
      return 'Suivez les instructions pour finaliser le paiement.';
  }
};

// Exports
module.exports = {
  initiatePayment,
  getUserPayments,
  getPaymentById,
  verifyPayment,
  cancelPayment,
  getAllPayments
};