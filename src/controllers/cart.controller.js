'use strict';

const { Cart, CartItem, Product, ProductImage, User, SellerProfile } = require('../models');

/**
 * Helper : récupérer ou créer le panier status
 */
const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ where: { userId } });

  if (!cart) {
    cart = await Cart.create({
      userId,
      totalItems: 0,
      totalAmount: 0
    });
  }

  return cart;
};

/**
 * GET /api/v1/cart
 * Récupérer le panier de l'utilisateur connecté
 */
const getCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({
      where: { userId },
      include: [
        {
          model: CartItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'title', 'price', 'stock', 'isActive'],
              include: [
                {
                  model: ProductImage,
                  as: 'images',
                  where: { isPrimary: true },
                  required: false,
                  attributes: ['id', 'url']
                }
              ]
            },
            // ✅ Ajouter l'inclusion du seller (User)
            {
              model: User,
              as: 'seller',
              attributes: ['id', 'name', 'email'],
              include: [
                {
                  model: SellerProfile,
                  as: 'sellerProfile',
                  attributes: ['shopName', 'status']
                }
              ]
            }
          ]
        }
      ]
    });

    if (!cart) {
      const newCart = await getOrCreateCart(userId);
      return res.status(200).json({
        success: true,
        message: 'Panier vide',
        data: {
          ...newCart.toJSON(),
          items: []
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Panier récupéré avec succès',
      data: cart
    });

  } catch (error) {
    console.error('Erreur getCart:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};


/**
 * POST /api/v1/cart/items
 * Ajouter un produit au panier
 */
const addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity = 1 } = req.body;

    const product = await Product.findByPk(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Produit introuvable' });
    if (!product.isActive) return res.status(400).json({ success: false, message: 'Produit non disponible' });
    if (product.stock < quantity) return res.status(400).json({ success: false, message: `Stock insuffisant (${product.stock})` });

    const cart = await getOrCreateCart(userId);

    let cartItem = await CartItem.findOne({ where: { cartId: cart.id, productId } });

    if (cartItem) {
      const newQty = cartItem.quantity + quantity;
      if (newQty > product.stock) return res.status(400).json({ success: false, message: `Stock insuffisant (${product.stock})` });

      await cartItem.update({ quantity: newQty, subtotal: newQty * product.price });
    } else {
      cartItem = await CartItem.create({
        cartId: cart.id,
        productId,
        sellerId: product.sellerId,
        quantity,
        unitPrice: product.price,
        subtotal: quantity * product.price
      });
    }

    // Recalculer les totaux du panier
    const items = await CartItem.findAll({ where: { cartId: cart.id } });
    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = items.reduce((sum, i) => sum + parseFloat(i.subtotal), 0);

    await cart.update({ totalItems, subtotal });

    return res.status(cartItem.isNewRecord ? 201 : 200).json({
      success: true,
      message: cartItem.isNewRecord ? 'Produit ajouté au panier' : 'Quantité mise à jour',
      data: cartItem
    });
  } catch (error) {
    console.error('Erreur addToCart:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

/**
 * PUT /api/v1/cart/items/:itemId
 * Mettre à jour la quantité d'un item
 */
const updateCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;
    const { quantity } = req.body;

    const cart = await Cart.findOne({ where: { userId } });
    if (!cart) return res.status(404).json({ success: false, message: 'Panier introuvable' });

    const cartItem = await CartItem.findOne({
      where: { id: itemId, cartId: cart.id },
      include: [{ model: Product, as: 'product' }]
    });
    if (!cartItem) return res.status(404).json({ success: false, message: 'Article introuvable' });
    if (!cartItem.product.isActive) return res.status(400).json({ success: false, message: 'Produit non disponible' });
    if (quantity > cartItem.product.stock) return res.status(400).json({ success: false, message: `Stock insuffisant (${cartItem.product.stock})` });

    await cartItem.update({ quantity, subtotal: quantity * cartItem.product.price });

    // Recalculer le panier
    const items = await CartItem.findAll({ where: { cartId: cart.id } });
    await cart.update({
      totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: items.reduce((sum, i) => sum + parseFloat(i.subtotal), 0)
    });

    return res.status(200).json({ success: true, message: 'Quantité mise à jour', data: cartItem });
  } catch (error) {
    console.error('Erreur updateCartItem:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

/**
 * DELETE /api/v1/cart/items/:itemId
 * Supprimer un item du panier
 */
const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    const cart = await Cart.findOne({ where: { userId } });
    if (!cart) return res.status(404).json({ success: false, message: 'Panier introuvable' });

    const cartItem = await CartItem.findOne({ where: { id: itemId, cartId: cart.id } });
    if (!cartItem) return res.status(404).json({ success: false, message: 'Article introuvable' });

    await cartItem.destroy();

    // Recalculer les totaux du panier
    const items = await CartItem.findAll({ where: { cartId: cart.id } });
    await cart.update({
      totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: items.reduce((sum, i) => sum + parseFloat(i.subtotal), 0)
    });

    return res.status(200).json({ success: true, message: 'Article retiré du panier' });
  } catch (error) {
    console.error('Erreur removeFromCart:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

/**
 * DELETE /api/v1/cart
 * Vider le panier
 */
const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({ where: { userId } });
    if (!cart) return res.status(404).json({ success: false, message: 'Panier introuvable' });

    await CartItem.destroy({ where: { cartId: cart.id } });
    await cart.update({ totalItems: 0, subtotal: 0 });

    return res.status(200).json({ success: true, message: 'Panier vidé avec succès' });
  } catch (error) {
    console.error('Erreur clearCart:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

/**
 * GET /api/v1/cart/count
 * Obtenir le nombre d'articles dans le panier
 */
const getCartCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({ where: { userId } });

    return res.status(200).json({
      success: true,
      data: { count: cart ? cart.totalItems : 0 }
    });
  } catch (error) {
    console.error('Erreur getCartCount:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartCount
};
