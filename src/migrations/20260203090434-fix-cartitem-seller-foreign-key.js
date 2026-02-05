// migrations/XXXXXX-fix-cartitem-seller-foreign-key.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Supprimer l'ancienne contrainte
    await queryInterface.removeConstraint('CartItems', 'cartitems_ibfk_3');
    
    // 2. Nettoyer les données invalides (optionnel)
    await queryInterface.sequelize.query(`
      DELETE FROM CartItems 
      WHERE sellerId NOT IN (SELECT id FROM users)
    `);
    
    // 3. Ajouter la nouvelle contrainte
    await queryInterface.addConstraint('CartItems', {
      fields: ['sellerId'],
      type: 'foreign key',
      name: 'cartitems_seller_fk',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  },

  async down(queryInterface, Sequelize) {
    // Rollback : remettre l'ancienne contrainte
    await queryInterface.removeConstraint('CartItems', 'cartitems_seller_fk');
    
    await queryInterface.addConstraint('CartItems', {
      fields: ['sellerId'],
      type: 'foreign key',
      name: 'cartitems_ibfk_3',
      references: {
        table: 'SellerProfiles',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  }
};