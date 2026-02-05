const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User, SellerProfile } = require("../models");

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// 📝 REGISTER
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, shopName } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser)
      return res.status(400).json({ message: "Email already used" });

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

    const token = generateToken(user);

    res.status(201).json({ token, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔑 LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user)
      return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = generateToken(user);

    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
