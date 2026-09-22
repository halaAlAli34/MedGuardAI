const mongoose = require("mongoose");

const interactionReferenceSchema = new mongoose.Schema({
  drug_a: { type: String, required: true, trim: true },
  drug_b: { type: String, required: true, trim: true },
  severity: { type: String, enum: ["mild", "moderate", "severe"], required: true },
  description: { type: String, required: true },
  alternative_suggestion: { type: String }
}, { timestamps: true });

// Speeds up the case-insensitive A-B / B-A lookup done on every medication add
interactionReferenceSchema.index({ drug_a: 1, drug_b: 1 });

module.exports = mongoose.model("InteractionReference", interactionReferenceSchema);
