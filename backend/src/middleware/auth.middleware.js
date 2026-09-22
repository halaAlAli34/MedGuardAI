const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Verifies the JWT Bearer token and attaches the authenticated user to req.user.
// Returns 401 on missing/invalid/expired tokens.
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Missing or invalid authorization token" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select("-password_hash");
    if (!user) return res.status(401).json({ message: "User no longer exists" });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Missing or invalid authorization token" });
  }
}

module.exports = { requireAuth };
