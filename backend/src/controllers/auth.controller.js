const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });
}

function sanitize(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    age: user.age,
    conditions: user.conditions,
    created_at: user.created_at
  };
}

async function register(req, res) {
  const { name, email, password, role, age, conditions } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "name, email, password and role are required" });
  }
  if (!["patient", "caregiver"].includes(role)) {
    return res.status(400).json({ message: "role must be 'patient' or 'caregiver'" });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ message: "An account with this email already exists" });

  const password_hash = await bcrypt.hash(password, 12);
  const user = await User.create({
    name, email: email.toLowerCase(), password_hash, role,
    age: age || undefined,
    conditions: Array.isArray(conditions) ? conditions : []
  });

  const token = signToken(user);
  res.status(201).json({ token, user: sanitize(user) });
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "email and password are required" });

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return res.status(401).json({ message: "Invalid email or password" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ message: "Invalid email or password" });

  const token = signToken(user);
  res.json({ token, user: sanitize(user) });
}

async function me(req, res) {
  res.json({ user: sanitize(req.user) });
}

module.exports = { register, login, me, sanitize };
