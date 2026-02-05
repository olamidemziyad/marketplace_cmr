const sequelize = require("../config/database");
const { DataTypes } = require("sequelize");
const fs = require("fs");
const path = require("path");

const db = {};

fs.readdirSync(__dirname)
  .filter(file => file !== "index.js")
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, DataTypes);
    db[model.name] = model;
  });

Object.values(db).forEach(model => {
  if (model.associate) {
    model.associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = require("sequelize");

module.exports = db;
