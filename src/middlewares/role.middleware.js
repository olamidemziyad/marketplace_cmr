exports.isSeller = (req, res, next) => {
  if (req.user.role !== "seller") {
    return res.status(403).json({ message: "Seller access only" });
  }
  next();
};

exports.isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access only" });
  }
  next();
};
