module.exports = (sequelize, DataTypes) => {
  const CartItem = sequelize.define('CartItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    cartId: {
      type: DataTypes.UUID,
      allowNull: false
    },

    productId: {
      type: DataTypes.UUID,
      allowNull: false
    },

    sellerId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Dénormalisation pour faciliter le groupement par vendeur'
    },

    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
        max: 100
      }
    },

    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0 }
    },

    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0 }
    },

    productSnapshot: {
      type: DataTypes.JSON,
      allowNull: true
    },

    isAvailable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },

    addedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }

  }, {
    tableName: 'CartItems',
    timestamps: true,
    indexes: [
      { fields: ['cartId'] },
      { fields: ['productId'] },
      { fields: ['sellerId'] },
      {
        unique: true,
        fields: ['cartId', 'productId'],
        name: 'unique_cart_product'
      }
    ]
  });

  CartItem.associate = (models) => {
    CartItem.belongsTo(models.Cart, {
      foreignKey: 'cartId',
      as: 'cart',
      onDelete: 'CASCADE'
    });

    CartItem.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product',
      onDelete: 'CASCADE'
    });

    CartItem.belongsTo(models.User, {
      foreignKey: 'sellerId',
      as: 'seller',
      onDelete: 'CASCADE'
    });
  };

  return CartItem;
};
