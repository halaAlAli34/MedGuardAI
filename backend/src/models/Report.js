const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
  patient_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  generated_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  generated_at: { type: Date, default: Date.now },
  file_url: { type: String }
});

module.exports = mongoose.model("Report", reportSchema);
