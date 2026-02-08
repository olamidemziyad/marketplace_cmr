// server.js
require("dotenv").config();
const app = require("./app");
const db = require("./models"); // contient sequelize et tous les modèles

// Synchroniser UNIQUEMENT le modèle CartItem
//const { CartItem } = require('./models');



const PORT = process.env.PORT || 5000;

(async () => {
  try {
    // Authentification à la DB
    await db.sequelize.authenticate();
    console.log(" Database connected successfully");

    // Synchronisation des tables avec les modèles (alter: true)
    await db.sequelize.sync(/*{ force: true }*/);  
    console.log(" Tables synchronized with models");

    //Temporaire enfin de m'assurer que le modele CartItem soit synchronisé
    // CartItem.sync(/*{ alter: true }*/)
    //   .then(() => {
    //     console.log(' CartItem synchronisé');
    //   })
    //   .catch(err => { 
    //     console.error(' Erreur:', err);
    //   });
 
    // Démarrage du serveur
    app.listen(PORT, () => {
      console.log(` Server running at http://localhost:${PORT}`); 
    });
  } catch (error) {
    console.error(" Database connection failed:", error.message);
    process.exit(1);
  }
})();
