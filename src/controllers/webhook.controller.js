'use strict';

const { Payment, Order, User, SellerProfile } = require('../models');
const pawapayService = require('../services/pawapay.service');
const emailQueue = require('../queues/email.queue');

/**
 * Gérer le webhook PawaPay
 * POST /api/v1/webhooks/pawapay
 * 
 * PawaPay envoie des notifications pour :
 * - ACCEPTED: Transaction acceptée par PawaPay
 * - SUBMITTED: Soumise à l'opérateur mobile
 * - COMPLETED: Paiement réussi
 * - FAILED: Paiement échoué
 */
const handlePawapayWebhook = async (req, res) => {
  try {
    console.log('📨 Webhook PawaPay reçu');
    console.log('Headers:', req.headers);
    console.log('Body:', JSON.stringify(req.body, null, 2));

    // 1. Vérifier la signature (sécurité)
    const signature = req.headers['x-pawapay-signature'];
    const rawBody = JSON.stringify(req.body);

    if (signature) {
      const isValid = pawapayService.verifyWebhookSignature(rawBody, signature);
      
      if (!isValid) {
        console.error('❌ Signature webhook invalide');
        return res.status(401).json({
          success: false,
          message: 'Invalid signature'
        });
      }
      console.log('✅ Signature webhook valide');
    }

    // 2. Extraire les données du webhook
    const {
      depositId,
      status,
      receivedAmount,
      failureReason,
      correspondentId
    } = req.body;

    if (!depositId) {
      console.error('❌ depositId manquant dans le webhook');
      return res.status(400).json({
        success: false,
        message: 'depositId is required'
      });
    }

    // 3. Trouver le paiement correspondant
    const payment = await Payment.findOne({
      where: { providerTransactionId: depositId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!payment) {
      console.error(`❌ Paiement introuvable pour depositId: ${depositId}`);
      
      // On retourne 200 pour éviter que PawaPay ne renvoie
      return res.status(200).json({
        success: false,
        message: 'Payment not found'
      });
    }

    console.log(`✅ Paiement trouvé: ${payment.id}`);

    // 4. Mapper le statut PawaPay vers notre statut
    const newStatus = pawapayService.mapPawapayStatus(status);
    
    console.log(`📊 Statut: ${payment.status} → ${newStatus} (PawaPay: ${status})`);

    // 5. Mettre à jour le paiement
    await payment.update({
      status: newStatus,
      webhookPayload: req.body,
      processedAt: newStatus === 'success' ? new Date() : payment.processedAt,
      failureReason: failureReason ? 
        pawapayService.getReadableFailureReason(failureReason) : null,
      metadata: {
        ...payment.metadata,
        pawapayStatus: status,
        receivedAmount,
        webhookReceivedAt: new Date()
      }
    });

    console.log(`✅ Paiement mis à jour: status=${newStatus}`);

    // 6. Si le paiement est réussi
    if (newStatus === 'success') {
      const order = await Order.findOne({
        where: { id: payment.orderId },
        include: [
          {
            model: User,
            as: 'buyer',
            attributes: ['id', 'name', 'email']
          },
          {
            model: SellerProfile,
            as: 'seller',
            attributes: ['id', 'name'],
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'email']
              }
            ]
          }
        ]
      });
      
      if (order) {
        // Mettre à jour la commande
        await order.update({
          status: 'paid',
          paymentStatus: 'success'
        });
        
        console.log(`✅ Commande ${order.id} marquée comme payée`);

        // 📧 Envoyer email de confirmation à l'acheteur
        try {
          await emailQueue.add('paymentSuccess', {
            email: order.buyer.email || payment.user.email,
            buyerName: order.buyer.name || payment.user.name,
            orderId: order.id,
            amount: payment.amount,
            currency: payment.currency,
            paymentMethod: payment.paymentMethod
          });
          console.log(`📧 Email de confirmation envoyé à l'acheteur`);
        } catch (emailError) {
          console.error('❌ Erreur envoi email acheteur:', emailError);
        }

        // 📧 Notifier le vendeur de la nouvelle commande payée
        if (order.seller && order.seller.user) {
          try {
            await emailQueue.add('newOrderPaid', {
              email: order.seller.user.email,
              sellerName: order.seller.name,
              orderId: order.id,
              amount: order.totalAmount,
              buyerName: order.buyer.name
            });
            console.log(`📧 Notification envoyée au vendeur`);
          } catch (emailError) {
            console.error('❌ Erreur envoi email vendeur:', emailError);
          }
        }
      }
    }

    // 7. Si le paiement a échoué
    if (newStatus === 'failed') {
      const order = await Order.findOne({
        where: { id: payment.orderId },
        include: [
          {
            model: User,
            as: 'buyer',
            attributes: ['id', 'name', 'email']
          }
        ]
      });
      
      if (order) {
        // Mettre à jour la commande
        await order.update({
          paymentStatus: 'failed'
        });
        
        console.log(`❌ Commande ${order.id} - paiement échoué`);
        
        // 📧 Notifier l'acheteur de l'échec
        try {
          await emailQueue.add('paymentFailed', {
            email: order.buyer.email || payment.user.email,
            buyerName: order.buyer.name || payment.user.name,
            orderId: order.id,
            amount: payment.amount,
            failureReason: payment.failureReason || 'Erreur de paiement',
            paymentMethod: payment.paymentMethod
          });
          console.log(`📧 Email d'échec envoyé à l'acheteur`);
        } catch (emailError) {
          console.error('❌ Erreur envoi email échec:', emailError);
        }
      }
    }

    // 8. Répondre à PawaPay (important pour éviter les retries)
    return res.status(200).json({
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    console.error('❌ Erreur lors du traitement du webhook:', error);
    
    // On retourne 200 quand même pour éviter les retries
    return res.status(200).json({
      success: false,
      message: 'Webhook received but processing failed',
      error: error.message
    });
  }
};

/**
 * Gérer le webhook Stripe (existant)
 * POST /api/v1/webhooks/stripe
 */
const handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const stripe = require("../services/stripe.service");

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('❌ Stripe webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Gérer l'événement payment_intent.succeeded
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata?.orderId;

    if (!orderId) {
      console.log("⚠️ PaymentIntent sans orderId, ignoré");
      return res.json({ received: true });
    }

    try {
      // Mettre à jour la commande
      await Order.update(
        { status: "paid", paymentStatus: "success" },
        { where: { id: orderId } }
      );

      // Trouver la commande avec l'acheteur
      const order = await Order.findOne({
        where: { id: orderId },
        include: [
          {
            model: User,
            as: 'buyer',
            attributes: ['id', 'name', 'email']
          }
        ]
      });

      if (order && order.buyer) {
        // Envoyer email de confirmation
        await emailQueue.add("paymentSuccess", {
          email: order.buyer.email,
          buyerName: order.buyer.name,
          orderId,
          amount: paymentIntent.amount / 100, // Stripe en centimes
          currency: paymentIntent.currency.toUpperCase()
        });
        console.log(`📧 Email Stripe envoyé pour commande ${orderId}`);
      }
    } catch (error) {
      console.error('❌ Erreur traitement Stripe webhook:', error);
    }
  }

  res.json({ received: true });
};

/**
 * Gérer d'autres webhooks (MTN direct, Orange)
 * À implémenter si besoin
 */
const handleMTNWebhook = async (req, res) => {
  // TODO: Implémenter si vous utilisez l'API MTN directe
  return res.status(501).json({
    success: false,
    message: 'MTN webhook not implemented yet'
  });
};

const handleOrangeWebhook = async (req, res) => {
  // TODO: Implémenter si vous utilisez l'API Orange directe
  return res.status(501).json({
    success: false,
    message: 'Orange webhook not implemented yet'
  });
};

// Exports
module.exports = {
  handlePawapayWebhook,
  handleStripeWebhook,
  handleMTNWebhook,
  handleOrangeWebhook
};