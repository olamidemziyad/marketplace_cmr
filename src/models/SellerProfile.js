const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const SellerProfile = sequelize.define("SellerProfile", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    shopName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      defaultValue: "pending",
    },
  });

  SellerProfile.associate = (models) => {
    SellerProfile.belongsTo(models.User, { foreignKey: "userId" });
  };

  return SellerProfile;
};
