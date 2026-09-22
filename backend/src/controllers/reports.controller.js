const Medication = require("../models/Medication");
const FlaggedInteraction = require("../models/FlaggedInteraction");
const Report = require("../models/Report");
const User = require("../models/User");
const { generateReportPDF } = require("../services/pdfService");

/**
 * GET /api/reports/:patientId
 * Generates the doctor-visit PDF on demand and streams it back for download.
 * Also logs a Report record. Access control (caregiver must be linked) is
 * enforced by resolvePatientContext, which resolves req.patientId - we use
 * :patientId from the URL only after confirming it matches req.patientId.
 */
async function generate(req, res) {
  if (req.params.patientId !== String(req.patientId)) {
    return res.status(403).json({ message: "Not authorized to generate a report for this patient" });
  }

  const patient = await User.findById(req.patientId).select("name age");
  const medications = await Medication.find({ patient_id: req.patientId, status: "active" }).sort({ name: 1 });
  const flags = await FlaggedInteraction.find({ patient_id: req.patientId, status: "active" })
    .populate("medication_a_id")
    .populate("medication_b_id")
    .populate("interaction_reference_id")
    .sort({ severity: 1 });

  const pdfBuffer = await generateReportPDF({ patient, medications, flags });

  await Report.create({
    patient_id: req.patientId,
    generated_by: req.user.id,
    file_url: null // generated on-demand and streamed, not persisted to storage
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="medguard-report-${req.patientId}.pdf"`);
  res.send(pdfBuffer);
}

module.exports = { generate };
