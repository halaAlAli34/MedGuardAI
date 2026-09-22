const mongoose = require("mongoose");

const caregiverLinkSchema = new mongoose.Schema({
  // NOTE — deviation from the literal ERD, documented here and in README
  // section "Schema-vs-ERD audit": the ERD marks caregiver_id as required,
  // but the caregiver mode workflow described in the same brief ("Patients
  // generate an invite code... that a caregiver redeems to create the link")
  // requires persisting a CaregiverLink at invite-generation time, before any
  // caregiver exists to reference. Keeping `required: true` here would throw
  // a real ValidationError on every invite-code generation. caregiver_id is
  // therefore optional at the schema level and is only ever null while
  // status === "pending"; it's always set before status flips to "active".
  caregiver_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  patient_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  permission_level: { type: String, enum: ["view", "edit"], default: "edit" },
  status: { type: String, enum: ["active", "pending", "revoked"], default: "active" },
  invite_code: { type: String, unique: true, sparse: true }
}, { timestamps: true });

caregiverLinkSchema.index({ caregiver_id: 1, patient_id: 1 });

module.exports = mongoose.model("CaregiverLink", caregiverLinkSchema);
