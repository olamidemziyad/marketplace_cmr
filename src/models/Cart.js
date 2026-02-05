module.exports = (sequelize, DataTypes) => {
  const Cart = sequelize.define('Cart', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true
    },

    status: {
      type: DataTypes.ENUM('active', 'abandoned', 'converted'),
      defaultValue: 'active',
      allowNull: false
    },

    totalItems: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      validate: { min: 0 }
    },

    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      allowNull: false,
      validate: { min: 0 }
    },

    lastActivityAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },

    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    }

  }, {
    tableName: 'Carts',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['status'] },
      { fields: ['lastActivityAt'] }
    ]
  });

  Cart.associate = function(models) {
// Un panier appartient à un utilisateur
    Cart.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

// Un panier a plusieurs items
    Cart.hasMany(models.CartItem, {
      foreignKey: 'cartId',
      as: 'items',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  };

  return Cart;
};
