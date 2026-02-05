const { Product, SellerProfile, User } = require("../models");

// Create product (seller)
exports.createProduct = async (req, res) => {
  try {
    // 1️⃣ Vérifier que l'utilisateur a un SellerProfile approuvé
    const sellerProfile = await SellerProfile.findOne({
      where: { userId: req.user.id }
    });

    if (!sellerProfile) {
      return res.status(403).json({
        success: false,
        message: 'Vous devez créer un profil vendeur avant de publier des produits'
      });
    }

    // Optionnel : vérifier que le profil est approuvé
    if (sellerProfile.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Votre profil vendeur doit être approuvé par un administrateur'
      });
    }

    // 2️⃣ Créer le produit avec req.user.id (pas sellerProfile.id)
    const product = await Product.create({
      ...req.body,
      sellerId: req.user.id  // ✅ Utiliser l'ID de l'utilisateur
    });

    return res.status(201).json({
      success: true,
      data: product
    });

  } catch (error) {
    console.error('Erreur createProduct:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get all public products
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { isActive: true },
      include: [
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
    });

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update product (seller only)
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      where: { 
        id: req.params.id, 
        sellerId: req.user.id  // ✅ Utiliser req.user.id
      },
    });

    if (!product)
      return res.status(404).json({ message: "Produit non trouvé ou vous n'êtes pas autorisé" });

    await product.update(req.body);
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      where: { 
        id: req.params.id, 
        sellerId: req.user.id  // ✅ Utiliser req.user.id
      },
    });

    if (!product)
      return res.status(404).json({ message: "Produit non trouvé ou vous n'êtes pas autorisé" });

    await product.destroy();
    res.json({ message: "Produit supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};