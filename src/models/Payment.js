module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define(
    'Payment',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },

      orderId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      paymentMethod: {
        type: DataTypes.ENUM('mtn', 'orange', 'card', 'stripe', 'paypal', 'wallet'),
        allowNull: false,
      },

      amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },

      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'XAF',
      },

      status: {
        type: DataTypes.ENUM(
          'pending',
          'processing',
          'success',
          'failed',
          'cancelled',
          'refunded'
        ),
        defaultValue: 'pending',
      },

      providerTransactionId: {
        type: DataTypes.STRING(255),
        unique: true,
        allowNull: true,
      },

      transactionFee: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },

      netAmount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
      },
    },
    {
      tableName: 'payments',
      timestamps: true,
    }
  );

  Payment.associate = (models) => {
    Payment.belongsTo(models.Order, {
      foreignKey: 'orderId',
      as: 'order',
      onDelete: 'SET NULL',
    });

    Payment.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      onDelete: 'RESTRICT',
    });
  };

  return Payment;
};
