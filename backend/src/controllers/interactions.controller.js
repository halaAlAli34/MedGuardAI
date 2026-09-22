const FlaggedInteraction = require("../models/FlaggedInteraction");
const aiService = require("../services/aiService");

async function list(req, res) {
  const flags = await FlaggedInteraction.find({ patient_id: req.patientId, status: "active" })
    .populate("medication_a_id")
    .populate("medication_b_id")
    .populate("interaction_reference_id")
    .sort({ severity: 1, detected_at: -1 });

  res.json({ interactions: flags });
}

/**
 * POST /api/interactions/:id/explain
 * Generates (or refreshes) the AI explanation + doctor questions for a flag,
 * then caches them on the FlaggedInteraction record so they aren't
 * regenerated on every page load. Falls back to the static reference
 * description if the AI service is unavailable or errors, per the spec.
 */
async function explain(req, res) {
  const flag = await FlaggedInteraction.findOne({ _id: req.params.id, patient_id: req.patientId })
    .populate("medication_a_id")
    .populate("medication_b_id")
    .populate("interaction_reference_id");

  if (!flag) return res.status(404).json({ message: "Flagged interaction not found" });

  const forceRefresh = req.query.refresh === "true";
  if (flag.ai_explanation && !forceRefresh) {
    return res.json({
      aiAvailable: true,
      cached: true,
      explanation: flag.ai_explanation,
      doctorQuestions: flag.ai_doctor_questions
    });
  }

  if (!aiService.isConfigured()) {
    return res.json({
      aiAvailable: false,
      explanation: flag.interaction_reference_id.description,
      doctorQuestions: [],
      message: "AI explanations are currently unavailable. Showing the reference description instead."
    });
  }

  try {
    const patient = req.user.role === "patient" ? req.user : null;
    const result = await aiService.generateRiskExplanation({
      drugA: flag.medication_a_id.name,
      drugB: flag.medication_b_id.name,
      severity: flag.severity,
      description: flag.interaction_reference_id.description,
      patientAge: patient?.age,
      patientConditions: patient?.conditions
    });

    flag.ai_explanation = result.explanation;
    flag.ai_doctor_questions = result.doctorQuestions;
    await flag.save();

    res.json({ aiAvailable: true, cached: false, explanation: result.explanation, doctorQuestions: result.doctorQuestions });
  } catch (err) {
    // Graceful degradation - never block the UI on AI failure - but log the
    // real reason so it's actually debuggable instead of silently swallowed.
    if (process.env.NODE_ENV !== "test") console.error("AI risk explainer failed:", err.message);
    res.json({
      aiAvailable: false,
      explanation: flag.interaction_reference_id.description,
      doctorQuestions: [],
      message: "We couldn't generate an AI explanation right now. Showing the reference description instead."
    });
  }
}

async function resolve(req, res) {
  const flag = await FlaggedInteraction.findOneAndUpdate(
    { _id: req.params.id, patient_id: req.patientId },
    { status: "resolved" },
    { new: true }
  );
  if (!flag) return res.status(404).json({ message: "Flagged interaction not found" });
  res.json({ interaction: flag });
}

module.exports = { list, explain, resolve };
