const { Order, OrderItem, Product, Cart, CartItem, Payment, Address, SellerProfile, User } = require("../models");
const { v4: uuidv4 } = require('uuid');
const { Notification } = require("../models");
const { sendNotificationEmail } = require("../queues/email.queue");
const sequelize = require('../config/database');


// ============================================
// Créer une commande simple
// ============================================
exports.createOrder = async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Order items required" });
    }

    let subtotal = 0;

    // 1️⃣ Récupérer le premier produit
    const firstProduct = await Product.findByPk(items[0].productId);

    if (!firstProduct || !firstProduct.isActive) {
      return res.status(400).json({ message: "Invalid product" });
    }

    // ✅ Utiliser directement le sellerId du produit (qui est un User.id)
    const sellerId = firstProduct.sellerId;

    // 2️⃣ Créer la commande
    const order = await Order.create({
      buyerId: req.user.id,
      sellerId,
      subtotal: 0,
      totalAmount: 0,
      status: 'pending'
    });

    // 3️⃣ Parcourir les items
    for (const item of items) {
      const product = await Product.findByPk(item.productId);

      if (!product || !product.isActive) {
        return res.status(400).json({ message: "Invalid product" });
      }

      // Sécurité multi-vendeur
      if (product.sellerId !== firstProduct.sellerId) {
        return res.status(400).json({
          message: "All products must belong to the same seller"
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ message: "Insufficient stock" });
      }

      const price = product.price * item.quantity;
      subtotal += price;

      await OrderItem.create({
        orderId: order.id,
        productId: product.id,
        quantity: item.quantity,
        price
      });

      await product.update({ stock: product.stock - item.quantity });
    }

    // 4️⃣ Mise à jour des montants
    await order.update({
      subtotal,
      totalAmount: subtotal
    });

    // 5️⃣ Notification acheteur
    const buyerNotification = await Notification.create({
      userId: order.buyerId,
      type: 'order_created',
      channel: 'email',
      payload: {
        orderId: order.id,
        totalAmount: order.totalAmount
      }
    });

    await sendNotificationEmail({
      notificationId: buyerNotification.id
    });

    return res.status(201).json(order);

  } catch (error) {
    console.error('Error createOrder:', error);
    return res.status(500).json({ error: error.message });
  } 
};


// ============================================
// Payer une commande
// ============================================
exports.payOrder = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);

    if (!order || order.buyerId !== req.user.id) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status === "paid") {
      return res.status(400).json({ message: "Order already paid" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.totalAmount * 100),
      currency: "xaf",
      metadata: {
        orderId: order.id,
        buyerId: req.user.id,
      },
    });

    await order.update({
      paymentIntentId: paymentIntent.id,
    });

    // Notification acheteur : commande payée
    const paidNotification = await Notification.create({
      userId: order.buyerId,
      type: 'order_paid',
      channel: 'email',
      payload: {
        orderId: order.id,
        totalAmount: order.totalAmount
      }
    });

    await sendNotificationEmail({
      notificationId: paidNotification.id
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Error payOrder:', error);
    res.status(500).json({ error: error.message });
  }
};


// ============================================
// Checkout depuis le panier
// ============================================
exports.createCheckoutSession = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const userId = req.user.id;
    const { addressId, paymentMethod, phoneNumber, customerNotes } = req.body;

    // 1. Vérifier l'adresse
    const address = await Address.findOne({
      where: { id: addressId, userId }
    });

    if (!address) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Adresse non trouvée'
      });
    }

    // 2. Récupérer le panier avec les items
    const cart = await Cart.findOne({
      where: { userId, status: 'active' },
      include: [
        {
          model: CartItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product'
            }
          ]
        }
      ],
      transaction
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Votre panier est vide'
      });
    }

    // 3. Vérifier la disponibilité des produits
    for (const item of cart.items) {
      if (!item.product || !item.product.isActive) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Le produit "${item.product?.title || 'inconnu'}" n'est plus disponible`
        });
      }

      if (item.product.stock < item.quantity) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Stock insuffisant pour "${item.product.title}" (disponible: ${item.product.stock})`
        });
      }
    }

    // 4. Grouper les items par vendeur
    const itemsBySeller = {};
    cart.items.forEach(item => {
      if (!itemsBySeller[item.sellerId]) {
        itemsBySeller[item.sellerId] = [];
      }
      itemsBySeller[item.sellerId].push(item);
    });

    // 5. Générer un sessionId unique pour cette transaction
    const sessionId = uuidv4();
    const orders = [];
    const platformFeeRate = 0.10; // 10% de commission

    // 6. Créer une commande par vendeur
    for (const [sellerId, items] of Object.entries(itemsBySeller)) {
      // Calculer le sous-total pour ce vendeur
      const subtotal = items.reduce((sum, item) => 
        sum + parseFloat(item.subtotal), 0
      );

      // Calculer les frais
      const shippingFee = 1000; // 1000 XAF par vendeur (à ajuster selon distance)
      const platformFee = subtotal * platformFeeRate;
      const total = subtotal + shippingFee;
      const sellerAmount = subtotal - platformFee;

      // Générer un numéro de commande unique
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      // ✅ Créer la commande avec sellerId (qui est déjà un User.id depuis CartItem)
      const order = await Order.create({
        orderNumber,
        sessionId,
        buyerId: userId,
        sellerId,  // ✅ Ceci est un User.id
        addressId,
        status: 'pending',
        subtotal: subtotal.toFixed(2),
        shippingFee: shippingFee.toFixed(2),
        platformFee: platformFee.toFixed(2),
        totalAmount: total.toFixed(2),
        sellerAmount: sellerAmount.toFixed(2),
        customerNotes
      }, { transaction });

      // Créer les OrderItems
      for (const item of items) {
        await OrderItem.create({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.unitPrice,
        }, { transaction });

        // Déduire du stock
        await Product.decrement('stock', {
          by: item.quantity,
          where: { id: item.productId },
          transaction
        });
      }

      orders.push(order);
    }

    // 7. Calculer le montant total à payer
    const totalAmount = orders.reduce((sum, order) => 
      sum + parseFloat(order.totalAmount), 0
    );
 
    // 8. Créer l'enregistrement Payment
    const payment = await Payment.create({
      userId,
      sessionId,
      amount: totalAmount.toFixed(2),
      currency: 'XAF',
      paymentMethod,
      customerPhoneNumber: phoneNumber,
      transactionFee: 0, // <--- Ajoute ceci explicitement
      status: 'pending',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    }, { transaction });

    // 9. Lier les commandes au paiement
    await Order.update(
      { paymentId: payment.id },
      { 
        where: { sessionId },
        transaction 
      }
    );

    // 10. Marquer le panier comme converti
    await cart.update({ status: 'converted' }, { transaction });

    // 11. Supprimer les items du panier
    await CartItem.destroy({
      where: { cartId: cart.id },
      transaction
    });

    // Commit de la transaction
    await transaction.commit();

    // Notification
    const paymentNotification = await Notification.create({
      userId,
      type: 'payment_success',
      channel: 'email',
      payload: {
        sessionId,
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod
      }
    });

    await sendNotificationEmail({
      notificationId: paymentNotification.id
    });

    // 12. Retourner la réponse
    return res.status(201).json({
      success: true,
      message: 'Commandes créées avec succès',
      data: {
        sessionId,
        payment: {
          id: payment.id,
          amount: payment.amount,
          status: payment.status,
          paymentMethod: payment.paymentMethod
        },
        orders: orders.map(order => ({
          id: order.id,
          orderNumber: order.orderNumber,
          sellerId: order.sellerId,
          total: order.totalAmount,
          status: order.status
        })),
        totalAmount: totalAmount.toFixed(2),
        ordersCount: orders.length
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Checkout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création des commandes',
      error: error.message
    });
  }
};


// ============================================
// Récupérer les commandes par sessionId
// ============================================
exports.getOrdersBySession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const orders = await Order.findAll({
      where: { sessionId, buyerId: userId },
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'title', 'price']
            }
          ]
        },
        {
          // ✅ MODIFIÉ - Récupérer le User (seller) avec son SellerProfile
          model: User,
          as: 'seller',
          attributes: ['id', 'name', 'email'],
          include: [
            {
              model: SellerProfile,
              as: 'sellerProfile',
              attributes: ['id', 'shopName', 'status']
            }
          ]
        },
        {
          model: Address,
          as: 'address'
        },
        {
          model: Payment,
          as: 'payment'
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    if (!orders || orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Aucune commande trouvée pour cette session'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        sessionId,
        orders,
        summary: {
          totalOrders: orders.length,
          totalAmount: orders.reduce((sum, o) => sum + parseFloat(o.totalAmount), 0).toFixed(2),
          paymentStatus: orders[0].payment?.status
        }
      }
    });
  } catch (error) {
    console.error('Error fetching orders by session:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des commandes',
      error: error.message
    });
  }
};


// ============================================
// Mes commandes (acheteur)
// ============================================
exports.getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const orders = await Order.findAll({
      where: { buyerId: userId },
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'title', 'price']
            }
          ]
        },
        {
          // ✅ MODIFIÉ - Récupérer le User (seller) avec son SellerProfile
          model: User,
          as: 'seller',
          attributes: ['id', 'name', 'email'],
          include: [
            {
              model: SellerProfile,
              as: 'sellerProfile',
              attributes: ['id', 'shopName', 'status']
            }
          ]
        },
        {
          model: Payment,
          as: 'payment',
          attributes: ['id', 'status', 'paymentMethod']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: orders,
      count: orders.length
    });
  } catch (error) {
    console.error('Error fetching my orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des commandes',
      error: error.message
    });
  }
};


// ============================================
// Commandes du vendeur
// ============================================
exports.getSellerOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    // ✅ Plus besoin de chercher le SellerProfile, on utilise directement userId
    const orders = await Order.findAll({
      where: { sellerId: userId },  // ✅ sellerId est maintenant un User.id
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'title', 'price']
            }
          ]
        },
        {
          model: User,
          as: 'buyer',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Address,
          as: 'address'
        },
        {
          model: Payment,
          as: 'payment',
          attributes: ['id', 'status', 'paymentMethod']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: orders,
      count: orders.length
    });
  } catch (error) {
    console.error('Error fetching seller orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des commandes',
      error: error.message
    });
  }
};


// ============================================
// Détails d'une commande  
// ============================================
exports.getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const order = await Order.findOne({
      where: { id: orderId },
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product'
            }
          ]
        },
        {
          // ✅ MODIFIÉ - Récupérer le User (seller) avec son SellerProfile
          model: User,
          as: 'seller',
          attributes: ['id', 'name', 'email'],
          include: [
            {
              model: SellerProfile,
              as: 'sellerProfile',
              attributes: ['id', 'shopName', 'status']
            }
          ]
        },
        {
          model: User,
          as: 'buyer',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Address,
          as: 'address'
        },
        {
          model: Payment,
          as: 'payment'
        }
      ]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    // Vérifier les permissions
    const isOwner = order.buyerId === userId;
    const isSeller = order.sellerId === userId;  // ✅ sellerId est maintenant directement comparable

    if (!isOwner && !isSeller) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    return res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des détails',
      error: error.message
    });
  }
};


// ============================================
// Mettre à jour le statut (vendeur)
// ============================================
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    // ✅ Pas besoin de chercher le SellerProfile, on compare directement avec userId
    const order = await Order.findOne({
      where: { id: orderId, sellerId: userId }  // ✅ sellerId est un User.id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée ou vous n\'êtes pas le vendeur'
      });
    }

    // Vérifier les transitions de statut autorisées
    const allowedTransitions = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['processing', 'cancelled'],
      'paid': ['processing'],
      'processing': ['shipped'],
      'shipped': ['delivered']
    };

    if (!allowedTransitions[order.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Transition de statut invalide: ${order.status} -> ${status}`
      });
    }

    // Mettre à jour
    await order.update({ 
      status,
      deliveredAt: status === 'delivered' ? new Date() : order.deliveredAt
    });

    return res.status(200).json({
      success: true,
      message: 'Statut mis à jour',
      data: order
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour',
      error: error.message
    });
  }
};


// ============================================
// Ajouter numéro de suivi
// ============================================
exports.addTrackingNumber = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { trackingNumber } = req.body;
    const userId = req.user.id;

    // ✅ Pas besoin de chercher le SellerProfile
    const order = await Order.findOne({
      where: { id: orderId, sellerId: userId }  // ✅ sellerId est un User.id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée ou vous n\'êtes pas le vendeur'
      });
    }

    await order.update({ trackingNumber });

    return res.status(200).json({
      success: true,
      message: 'Numéro de suivi ajouté',
      data: order
    });
  } catch (error) {
    console.error('Error adding tracking number:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout du numéro',
      error: error.message
    });
  }
};


// ============================================
// Annuler une commande
// ============================================
exports.cancelOrder = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const order = await Order.findOne({
      where: { id: orderId, buyerId: userId },
      include: [
        {
          model: OrderItem,
          as: 'items'
        }
      ],
      transaction
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    // Vérifier si annulation possible
    if (!['pending', 'confirmed'].includes(order.status)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cette commande ne peut plus être annulée'
      });
    }

    // Restaurer le stock
    for (const item of order.items) {
      await Product.increment('stock', {
        by: item.quantity,
        where: { id: item.productId },
        transaction
      });
    }

    // Mettre à jour le statut
    await order.update({
      status: 'cancelled',
      cancelledAt: new Date(),
      customerNotes: reason ? `${order.customerNotes || ''}\nRaison annulation: ${reason}` : order.customerNotes
    }, { transaction });

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: 'Commande annulée',
      data: order
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error cancelling order:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'annulation',
      error: error.message
    });
  }
};