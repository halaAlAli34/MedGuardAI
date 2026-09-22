const mongoose = require("mongoose");

const medicationSchema = new mongoose.Schema({
  patient_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  added_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true, trim: true },
  rxnorm_id: { type: String },
  dosage: { type: String, required: true },
  frequency: { type: String, required: true },
  prescribing_doctor: { type: String },
  start_date: { type: Date },
  end_date: { type: Date },
  source: { type: String, enum: ["manual", "ai_scan"], default: "manual" },
  status: { type: String, enum: ["active", "inactive"], default: "active" }
}, { timestamps: true });

medicationSchema.index({ patient_id: 1, status: 1 });
// case-insensitive lookups by name for the interaction engine
medicationSchema.index({ name: 1 });

module.exports = mongoose.model("Medication", medicationSchema);
