const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true },
  role: { type: String, enum: ["patient", "caregiver"], required: true },
  age: { type: Number },
  conditions: [{ type: String }],
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", userSchema);
