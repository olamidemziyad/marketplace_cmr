
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Address = sequelize.define('Address', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
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
    label: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Le libellé de l\'adresse est requis'
        },
        len: {
          args: [2, 50],
          msg: 'Le libellé doit contenir entre 2 et 50 caractères'
        }
      }
    },
    fullName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Le nom complet est requis'
        },
        len: {
          args: [2, 100],
          msg: 'Le nom doit contenir entre 2 et 100 caractères'
        }
      }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Le numéro de téléphone est requis'
        },
        is: {
          args: /^[+]?[0-9\s\-()]+$/,
          msg: 'Numéro de téléphone invalide'
        }
      }
    },
    line1: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'L\'adresse (ligne 1) est requise'
        },
        len: {
          args: [5, 255],
          msg: 'L\'adresse doit contenir entre 5 et 255 caractères'
        }
      }
    },
    line2: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'La ville est requise'
        }
      }
    },
    region: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'La région est requise'
        }
      }
    },
    /* postalCode: {
      type: DataTypes.STRING(10),
      allowNull: true
    }, */
    country: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'Cameroun'
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    deliveryInstructions: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'Addresses',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['isDefault'] },
      { fields: ['city'] }
    ],
    hooks: {
      // Hook avant création : si isDefault=true, désactiver les autres adresses par défaut
      beforeCreate: async (address, options) => {
        if (address.isDefault) {
          await Address.update(
            { isDefault: false },
            {
              where: {
                userId: address.userId,
                isDefault: true
              },
              transaction: options.transaction
            }
          );
        }
      },
      // Hook avant mise à jour
      beforeUpdate: async (address, options) => {
        if (address.changed('isDefault') && address.isDefault) {
          await Address.update(
            { isDefault: false },
            {
              where: {
                userId: address.userId,
                isDefault: true,
                id: { [sequelize.Sequelize.Op.ne]: address.id }
              },
              transaction: options.transaction
            }
          );
        }
      }
    }
  });

  // Relations
  Address.associate = function(models) {
    // Une adresse appartient à un utilisateur
    Address.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  };

  return Address;
};