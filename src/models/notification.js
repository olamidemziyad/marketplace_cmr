module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define("Notification", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    userId: {
      type: DataTypes.UUID,
      allowNull: true, // <--- autoriser NULL
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'SET NULL'
},


    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    payload: {
      type: DataTypes.JSON,
      allowNull: true,
    },

    channel: {
      type: DataTypes.ENUM("in_app", "email", "both"),
      defaultValue: "in_app",
    },

    emailStatus: {
      type: DataTypes.ENUM("pending", "sent", "failed"),
      defaultValue: "pending",
    },

    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  });

  Notification.associate = models => {
     Notification.belongsTo(models.User, {
    foreignKey: {
      name: "userId",
      allowNull: true, 
    },
    onDelete: "SET NULL",
  });
  };

  return Notification;
};
