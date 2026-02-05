const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const User = sequelize.define("User", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false
    },

    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },

    password: {
      type: DataTypes.STRING,
      allowNull: false  
    },
    
    role: {
      type: DataTypes.ENUM("buyer", "seller", "admin"),
      defaultValue: "buyer",
    },
    emailVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    emailNotificationsEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },

    lastEmailSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  });

  User.associate = (models) => {
    User.hasOne(models.SellerProfile, {
      foreignKey: 'userId',
      as: 'sellerProfile'
    });

    User.hasMany(models.Order, {
      foreignKey: 'buyerId',
      as: 'orders'
    });

    User.hasMany(models.Address, {
      foreignKey: 'userId',
      as: 'addresses',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    User.hasOne(models.Cart, {
    foreignKey: 'userId',
    as: 'cart',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  User.hasMany(models.Notification, {
  foreignKey: "userId",
});
  };

  return User;
};
