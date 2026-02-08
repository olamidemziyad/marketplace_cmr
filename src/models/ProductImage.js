const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
  const ProductImage = sequelize.define(
    'ProductImage',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
      },

      productId: {
        type: DataTypes.UUID,
        allowNull: false
      },

      url: {
        type: DataTypes.STRING(500),
        allowNull: false
      },

      publicId: {
        type: DataTypes.STRING(255),
        allowNull: false
      },

      isPrimary: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },

      order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },

      width: DataTypes.INTEGER,
      height: DataTypes.INTEGER,
      format: DataTypes.STRING(10),
      size: DataTypes.INTEGER
    },
    {
      tableName: 'product_images',
      timestamps: true,
      indexes: [
        { fields: ['productId'] },
        { fields: ['isPrimary'] },
        { fields: ['order'] }
      ],
      hooks: {
        beforeCreate: async (image, options) => {
          if (image.isPrimary) {
            await ProductImage.update(
              { isPrimary: false },
              {
                where: {
                  productId: image.productId,
                  isPrimary: true
                },
                transaction: options.transaction
              }
            );
          }
        },

        beforeUpdate: async (image, options) => {
          if (image.changed('isPrimary') && image.isPrimary) {
            await ProductImage.update(
              { isPrimary: false },
              {
                where: {
                  productId: image.productId,
                  isPrimary: true,
                  id: { [Op.ne]: image.id }
                },
                transaction: options.transaction
              }
            );
          }
        }
      }
    }
  );

  ProductImage.associate = (models) => {
    ProductImage.belongsTo(models.Product, {
      as: 'product',
      foreignKey: 'productId',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  };

  return ProductImage;
};
