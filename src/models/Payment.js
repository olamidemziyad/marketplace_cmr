'use strict';
const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  const Payment = sequelize.define('Payment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: true,
      validate: {
        isUUID: {
          args: 4,
          msg: 'L\'ID de commande doit être un UUID valide'
        }
      }
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'L\'ID utilisateur est requis'
        },
        isUUID: {
          args: 4,
          msg: 'L\'ID utilisateur doit être un UUID valide'
        }
      }
    },
    paymentMethod: {
      type: DataTypes.ENUM('mtn', 'orange', 'card', 'stripe', 'paypal', 'wallet'),
      allowNull: false,
      validate: {
        isIn: {
          args: [['mtn', 'orange', 'card', 'stripe', 'paypal', 'wallet']],
          msg: 'Méthode de paiement invalide'
        }
      }
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: {
          args: 0.01,
          msg: 'Le montant doit être supérieur à 0'
        }
      }
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'XAF'
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'success', 'failed', 'cancelled', 'refunded'),
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: {
          args: [['pending', 'processing', 'success', 'failed', 'cancelled', 'refunded']],
          msg: 'Statut invalide'
        }
      }
    },
    providerTransactionId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: {
        msg: 'Cet ID de transaction existe déjà'
      }
    },
    providerReference: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    phoneNumber: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        is: {
          args: /^[+]?[0-9\s\-()]+$/,
          msg: 'Numéro de téléphone invalide'
        }
      }
    },
    transactionFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false, // <--- Mets false pour forcer la valeur
      defaultValue: 0.00,
      validate: {
        min: {
          args: [0], // <--- Syntaxe tableau pour les arguments
          msg: 'Les frais ne peuvent pas être négatifs'
        }
      }
    },
    netAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true
    },
    failureReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    webhookPayload: {
      type: DataTypes.JSON,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'Payments',
    timestamps: true,
    indexes: [
      { fields: ['orderId'] },
      { fields: ['userId'] },
      { fields: ['status'] },
      { fields: ['paymentMethod'] },
      { fields: ['providerTransactionId'] },
      { fields: ['createdAt'] }
    ],
    hooks: {
      // Hook avant création : calculer le montant net
      beforeCreate: (payment) => {
        if (payment.amount && payment.transactionFee) {
          payment.netAmount = parseFloat(payment.amount) - parseFloat(payment.transactionFee);
        } else if (payment.amount) {
          payment.netAmount = payment.amount;
        }
      },
      // Hook avant mise à jour
      beforeUpdate: (payment) => {
        if (payment.changed('amount') || payment.changed('transactionFee')) {
          payment.netAmount = parseFloat(payment.amount || 0) - parseFloat(payment.transactionFee || 0);
        }
        
        // Si le statut passe à success, enregistrer la date de traitement
        if (payment.changed('status') && payment.status === 'success' && !payment.processedAt) {
          payment.processedAt = new Date();
        }
      }
    }
  });

  // Relations
  Payment.associate = function(models) {
    // Un paiement appartient à une commande
    Payment.belongsTo(models.Order, {
      foreignKey: 'orderId',
      as: 'order',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });

    // Un paiement appartient à un utilisateur
    Payment.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });
  };

  return Payment;
};