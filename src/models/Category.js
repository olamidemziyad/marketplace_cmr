
const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Category = sequelize.define('Category', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Le nom de la catégorie est requis'
        },
        len: {
          args: [2, 100],
          msg: 'Le nom doit contenir entre 2 et 100 caractères'
        }
      }
    },
    slug: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: {
        msg: 'Ce slug existe déjà'
      },
      validate: {
        notEmpty: {
          msg: 'Le slug est requis'
        },
        is: {
          args: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
          msg: 'Le slug doit être en minuscules avec des tirets (ex: electronique-phone)'
        }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    parentId: {
      type: DataTypes.UUID,
      allowNull: true,
      validate: {
        isUUID: {
          args: 4,
          msg: 'L\'ID parent doit être un UUID valide'
        }
      }
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'URL de l\'icône/image de la catégorie'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Données additionnelles (ex: {color: "#FF573(rouge)3", icon: "phone", order: 1})'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    }
  }, {
    tableName: 'Categories',
    timestamps: true,
    indexes: [
      { fields: ['slug'] },
      { fields: ['parentId'] },
      { fields: ['isActive'] }
    ]
  });

  // Relations
  Category.associate = function(models) {
    // Auto-relation pour les sous-catégories
    Category.hasMany(models.Category, {
      as: 'subcategories',
      foreignKey: 'parentId',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    Category.belongsTo(models.Category, {
      as: 'parent',
      foreignKey: 'parentId',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    // Une catégorie a plusieurs produits
    Category.hasMany(models.Product, {
      foreignKey: 'categoryId',
      onDelete: 'RESTRICT', 
      onUpdate: 'CASCADE' 
    });
  };

  return Category;
};