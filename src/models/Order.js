const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Order = sequelize.define("Order", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    
    orderNumber: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: true,
      comment: 'Numéro de commande unique (ex: ORD-20250124-ABC123)'
    },

    sessionId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Groupe les commandes d\'un même achat multi-vendeurs'
    },

    buyerId: {
      type: DataTypes.UUID,
      allowNull: false,
      // references: {
      //   model: 'Users',
      //   key: 'id'
      // },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },

    // ✅ MODIFIÉ - Pointer vers Users au lieu de SellerProfiles
    sellerId: {
      type: DataTypes.UUID,
      allowNull: false,
      // references: {
      //   model: 'Users',  // ✅ Changé ici
      //   key: 'id'
      // },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      comment: 'Référence l\'utilisateur vendeur'
    },

    addressId: {
      type: DataTypes.UUID,
      allowNull: true,
      // references: {
      //   model: 'Addresses',
      //   key: 'id'
      // },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    },

    status: {
      type: DataTypes.ENUM(
        'pending',
        'paid',
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'refunded'
      ),
      defaultValue: 'pending',
      allowNull: false
    },

    paymentIntentId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ID Stripe (si paiement par carte)'
    },

    paymentId: {
      type: DataTypes.UUID,
      allowNull: true,
      /* references: {
        model: 'Payments',
        key: 'id'
      }, */
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      comment: 'Référence vers la table Payments (Mobile Money)'
    },

    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0 },
      comment: 'Total des produits sans frais'
    },

    shippingFee: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      allowNull: false,
      comment: 'Frais de livraison pour ce vendeur'
    },

    platformFee: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      allowNull: false,
      comment: 'Commission de la plateforme (ex: 10% du subtotal)'
    },

    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0 },
      comment: 'Total final: subtotal + shippingFee'
    },

    sellerAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      allowNull: false,
      comment: 'Montant qui revient au vendeur (subtotal - platformFee)'
    },

    customerNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notes du client pour le vendeur'
    },

    trackingNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Numéro de suivi de livraison'
    },

    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true
    },

    deliveredAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'orders',
    timestamps: true,
    indexes: [
      { fields: ['orderNumber'] },
      { fields: ['sessionId'] },
      { fields: ['buyerId'] },
      { fields: ['sellerId'] },
      { fields: ['addressId'] },
      { fields: ['paymentId'] },
      { fields: ['status'] },
      { fields: ['createdAt'] }
    ],
    hooks: {
      beforeCreate: (order) => {
        if (order.platformFee) {
          order.sellerAmount = (parseFloat(order.subtotal) - parseFloat(order.platformFee)).toFixed(2);
        } else {
          order.sellerAmount = order.subtotal;
        }
      },
      beforeUpdate: (order) => {
        if (order.changed('subtotal') || order.changed('platformFee')) {
          order.sellerAmount = (parseFloat(order.subtotal) - parseFloat(order.platformFee)).toFixed(2);
        }
      }
    }
  });

  Order.associate = (models) => {
    // Order -> User (buyer)
    Order.belongsTo(models.User, {
      as: "buyer",
      foreignKey: "buyerId",
    });

    // ✅ MODIFIÉ - Order -> User (seller) au lieu de SellerProfile
    Order.belongsTo(models.User, {
      as: "seller",
      foreignKey: "sellerId",
    });

    // Order -> Address
    Order.belongsTo(models.Address, {
      as: "address",
      foreignKey: "addressId",
    });

    // Order -> Payment
    Order.belongsTo(models.Payment, {
      as: "payment",
      foreignKey: "paymentId",
    });

    // Order -> OrderItem
    Order.hasMany(models.OrderItem, {
      as: "items",
      foreignKey: "orderId",
      onDelete: "CASCADE",
    });
  };

  return Order;
};