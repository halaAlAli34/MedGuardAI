const Medication = require("../models/Medication");
const PrescriptionScan = require("../models/PrescriptionScan");
const { checkInteractionsForNewMedication } = require("../services/interactionEngine");
const aiService = require("../services/aiService");
const storageService = require("../services/storageService");

async function list(req, res) {
  const meds = await Medication.find({ patient_id: req.patientId }).sort({ createdAt: -1 });
  res.json({ medications: meds });
}

async function create(req, res) {
  const { name, dosage, frequency, prescribing_doctor, start_date, end_date, rxnorm_id, source } = req.body;

  if (!name || !dosage || !frequency) {
    return res.status(400).json({ message: "name, dosage and frequency are required" });
  }

  const med = await Medication.create({
    patient_id: req.patientId,
    added_by: req.user.id,
    name, dosage, frequency,
    prescribing_doctor, start_date, end_date, rxnorm_id,
    source: source === "ai_scan" ? "ai_scan" : "manual"
  });

  const newFlags = await checkInteractionsForNewMedication(med);

  res.status(201).json({ medication: med, newFlagsCount: newFlags.length });
}

async function update(req, res) {
  const med = await Medication.findOne({ _id: req.params.id, patient_id: req.patientId });
  if (!med) return res.status(404).json({ message: "Medication not found" });

  const editable = ["name", "dosage", "frequency", "prescribing_doctor", "start_date", "end_date", "rxnorm_id", "status"];
  editable.forEach((field) => {
    if (req.body[field] !== undefined) med[field] = req.body[field];
  });
  await med.save();

  // Name/status changes can affect interaction pairings - re-run the check.
  const newFlags = await checkInteractionsForNewMedication(med);

  res.json({ medication: med, newFlagsCount: newFlags.length });
}

async function remove(req, res) {
  const med = await Medication.findOneAndDelete({ _id: req.params.id, patient_id: req.patientId });
  if (!med) return res.status(404).json({ message: "Medication not found" });
  res.json({ message: "Medication deleted" });
}

/**
 * POST /api/medications/scan
 * Accepts a photographed prescription label, runs it through the AI vision
 * service, and returns extracted fields for the user to review/confirm.
 * Never auto-saves a medication - the frontend pre-fills the add-medication
 * form and the user must submit it explicitly.
 */
async function scan(req, res) {
  if (!req.file) return res.status(400).json({ message: "An image file is required" });

  const imageUrl = await storageService.uploadImage(req.file.buffer, req.file.originalname);

  if (!aiService.isConfigured()) {
    const scanRecord = await PrescriptionScan.create({
      uploaded_by: req.user.id,
      image_url: imageUrl,
      confidence_score: 0
    });
    return res.status(200).json({
      scanId: scanRecord._id,
      imageUrl,
      aiAvailable: false,
      message: "AI scanning is currently unavailable. Please enter the medication details manually.",
      extracted: { name: "", dosage: "", frequency: "", prescribing_doctor: "" },
      confidence_score: 0
    });
  }

  try {
    const extracted = await aiService.extractLabelFields({
      imageBuffer: req.file.buffer,
      mimeType: req.file.mimetype
    });

    const scanRecord = await PrescriptionScan.create({
      uploaded_by: req.user.id,
      image_url: imageUrl,
      extracted_text: JSON.stringify(extracted),
      extracted_fields: {
        name: extracted.name, dosage: extracted.dosage,
        frequency: extracted.frequency, prescribing_doctor: extracted.prescribing_doctor
      },
      confidence_score: extracted.confidence_score
    });

    res.json({
      scanId: scanRecord._id,
      imageUrl,
      aiAvailable: true,
      extracted: {
        name: extracted.name, dosage: extracted.dosage,
        frequency: extracted.frequency, prescribing_doctor: extracted.prescribing_doctor
      },
      confidence_score: extracted.confidence_score
    });
  } catch (err) {
    // Graceful degradation: scanning failed, but manual entry still works -
    // log the real reason so it's actually debuggable, not silently swallowed.
    if (process.env.NODE_ENV !== "test") console.error("AI label scan failed:", err.message);
    const scanRecord = await PrescriptionScan.create({
      uploaded_by: req.user.id,
      image_url: imageUrl,
      confidence_score: 0
    });
    res.status(200).json({
      scanId: scanRecord._id,
      imageUrl,
      aiAvailable: false,
      message: "We couldn't read this label automatically. Please enter the medication details manually.",
      extracted: { name: "", dosage: "", frequency: "", prescribing_doctor: "" },
      confidence_score: 0
    });
  }
}

module.exports = { list, create, update, remove, scan };
