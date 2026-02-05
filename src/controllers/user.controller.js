const {User} = require('../models');
const bcrypt = require("bcryptjs");
const { tryCatch } = require('bullmq');
const jwt = require("jsonwebtoken");
const {Op} = require("sequelize");

exports.Register = async (req, res) => {
  try {
    const { name, email, password, role, shopName } = req.body;

    if (!name || !email || !password || !role)
      return res.status(400).json({ message: "Champs requis manquants" });

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser)
      return res.status(400).json({ message: "Cet utilisateur existe déjà" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
    });

    if (role === "seller") {
      await SellerProfile.create({
        userId: user.id,
        shopName,
      });
    }

    const userData = user.toJSON();
    delete userData.password;

    return res.status(201).json({
      message: "Utilisateur créé avec succès",
      user: userData,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};


exports.Login = async( req, res) => {
    try{
        const { email, password } = req.body;

        if (!email || !password)
            return res.status(400).json({message : "Les champs email et password sont obligatoire !"})

        const user = await User.findOne({where: {email}});
        if(!user) 
            return res.status(400).json({messag : 'Utilisateur non trouvé '})
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) 
            return res.status(401).json({message: 'Mot de passe ou email incorrect'})

        const payload = {id : user.id, role : user.role}

        // generer le token
        const token = jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: process.env.JWT_EXPIRES_IN || '7d'})

         const userData = user.toJSON();
          delete userData.password;  

        return res.status(201).json({message : "Connexion reussié",
            token,
            user : userData,
        })
    } catch(err) {
        console.error({err});
        return res.status(500).json({message: err.messag});
    }
}