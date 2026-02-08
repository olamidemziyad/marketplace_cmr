const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const SellerProfile = sequelize.define(
    "SellerProfile",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true
      },

      shopName: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      status: {
        type: DataTypes.ENUM("pending", "approved", "rejected"),
        defaultValue: "pending",
      },
    },
    {
      tableName: "seller_profiles",
      timestamps: true,
      indexes: [
        { fields: ["userId"] },
        { fields: ["status"] }
      ]
    }
  );

  SellerProfile.associate = (models) => {
    SellerProfile.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
      onDelete: "CASCADE",
      onUpdate: "CASCADE"
    });
  };

  return SellerProfile;
};
