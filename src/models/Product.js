module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define(
    "Product",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      description: DataTypes.TEXT,

      price: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },

      sellerId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      stock: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },

      categoryId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: 'products',
      timestamps: true,
    }
  );

  Product.associate = (models) => {
    Product.belongsTo(models.User, {
      as: "seller",
      foreignKey: "sellerId",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    Product.belongsTo(models.Category, {
      as: "category",
      foreignKey: "categoryId",
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    });

    Product.hasMany(models.CartItem, {
      as: "cartItems",
      foreignKey: "productId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });

    Product.hasMany(models.ProductImage, {
      as: "images",
      foreignKey: "productId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  };

  return Product;
};
