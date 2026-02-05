module.exports = (sequelize, DataTypes) => {
  const ProductImage = sequelize.define('ProductImage', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      validate: {
        notEmpty: { msg: 'L\'ID du produit est requis' },
        isUUID: { args: 4, msg: 'L\'ID du produit doit être un UUID valide' }
      }
    },
    url: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'L\'URL de l\'image est requise' },
        isUrl: { msg: 'L\'URL doit être valide' }
      }
    },
    publicId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: { notEmpty: { msg: 'Le public ID Cloudinary est requis' } }
    },
    isPrimary: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: { isInt: { msg: 'L’ordre doit être un entier' }, min: 0 }
    },
    width: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 1 } },
    height: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 1 } },
    format: { type: DataTypes.STRING(10), allowNull: true },
    size: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 1 } }
  }, {
    tableName: 'ProductImages',
    timestamps: true,
    indexes: [
      { fields: ['productId'] },
      { fields: ['isPrimary'] },
      { fields: ['order'] }
    ],
    hooks: {
      beforeCreate: async (productImage, options) => {
        if (productImage.isPrimary) {
          await ProductImage.update(
            { isPrimary: false },
            { where: { productId: productImage.productId, isPrimary: true }, transaction: options.transaction }
          );
        }
      },
      beforeUpdate: async (productImage, options) => {
        if (productImage.changed('isPrimary') && productImage.isPrimary) {
          await ProductImage.update(
            { isPrimary: false },
            {
              where: {
                productId: productImage.productId,
                isPrimary: true,
                id: { [sequelize.Sequelize.Op.ne]: productImage.id }
              },
              transaction: options.transaction
            }
          );
        }
      }
    }
  });

  // Associations
  ProductImage.associate = (models) => {
    // ProductImage.belongsTo(models.Product, {
    //   foreignKey: 'productId',
    //   as: 'product',
    //   onDelete: 'CASCADE',
    //   onUpdate: 'CASCADE'
    // });

    ProductImage.belongsTo(models.Product, {
    foreignKey: 'productId',
    as: 'product',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });
  };

  return ProductImage;
};
