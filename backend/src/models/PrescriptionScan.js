const mongoose = require("mongoose");

const prescriptionScanSchema = new mongoose.Schema({
  medication_id: { type: mongoose.Schema.Types.ObjectId, ref: "Medication", default: null },
  uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  image_url: { type: String, required: true },
  extracted_text: { type: String },
  extracted_fields: {
    name: { type: String },
    dosage: { type: String },
    frequency: { type: String },
    prescribing_doctor: { type: String }
  },
  confidence_score: { type: Number, min: 0, max: 100 },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("PrescriptionScan", prescriptionScanSchema);
