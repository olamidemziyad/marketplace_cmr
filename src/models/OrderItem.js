const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const OrderItem = sequelize.define("OrderItem", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    price: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
  });

  OrderItem.associate = (models) => {
    OrderItem.belongsTo(models.Order, { foreignKey: "orderId" ,
      as: 'orders',
    });
    OrderItem.belongsTo(models.Product, { foreignKey: "productId" ,
      as: 'product',
    });
  };

  return OrderItem;
};
