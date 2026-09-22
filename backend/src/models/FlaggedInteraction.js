const mongoose = require("mongoose");

const flaggedInteractionSchema = new mongoose.Schema({
  patient_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  medication_a_id: { type: mongoose.Schema.Types.ObjectId, ref: "Medication", required: true },
  medication_b_id: { type: mongoose.Schema.Types.ObjectId, ref: "Medication", required: true },
  interaction_reference_id: { type: mongoose.Schema.Types.ObjectId, ref: "InteractionReference", required: true },
  severity: { type: String, enum: ["mild", "moderate", "severe"] },
  detected_at: { type: Date, default: Date.now },
  status: { type: String, enum: ["active", "resolved"], default: "active" },
  ai_explanation: { type: String, default: null },
  ai_doctor_questions: [{ type: String }]
}, { timestamps: true });

flaggedInteractionSchema.index({ patient_id: 1, status: 1 });
// prevent duplicate flags for the same med pair
flaggedInteractionSchema.index(
  { patient_id: 1, medication_a_id: 1, medication_b_id: 1 },
  { unique: true }
);

module.exports = mongoose.model("FlaggedInteraction", flaggedInteractionSchema);
