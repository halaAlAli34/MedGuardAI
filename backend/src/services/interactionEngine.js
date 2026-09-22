const Medication = require("../models/Medication");
const InteractionReference = require("../models/InteractionReference");
const FlaggedInteraction = require("../models/FlaggedInteraction");

/**
 * Checks a newly-added medication against the patient's other ACTIVE
 * medications, matching case-insensitively on drug name in either direction
 * (A-B or B-A) against InteractionReference. Creates a FlaggedInteraction for
 * every match that doesn't already exist (unique index also guards this).
 *
 * Kept deliberately simple/indexed (no full collection scan per request) so
 * it responds within a few seconds under normal load, per the spec.
 */
async function checkInteractionsForNewMedication(newMed) {
  const today = new Date();
  const otherActiveMeds = await Medication.find({
    patient_id: newMed.patient_id,
    status: "active",
    _id: { $ne: newMed._id },
    // A medication past its end_date is effectively no longer being taken,
    // even if its status hasn't been manually flipped to "inactive" yet -
    // it shouldn't keep triggering new interaction flags.
    $or: [{ end_date: null }, { end_date: { $exists: false } }, { end_date: { $gte: today } }]
  });

  if (otherActiveMeds.length === 0) return [];

  const created = [];

  for (const otherMed of otherActiveMeds) {
    const reference = await InteractionReference.findOne({
      $or: [
        { drug_a: new RegExp(`^${escapeRegex(newMed.name)}$`, "i"), drug_b: new RegExp(`^${escapeRegex(otherMed.name)}$`, "i") },
        { drug_a: new RegExp(`^${escapeRegex(otherMed.name)}$`, "i"), drug_b: new RegExp(`^${escapeRegex(newMed.name)}$`, "i") }
      ]
    });

    if (!reference) continue;

    try {
      const flag = await FlaggedInteraction.create({
        patient_id: newMed.patient_id,
        medication_a_id: newMed._id,
        medication_b_id: otherMed._id,
        interaction_reference_id: reference._id,
        severity: reference.severity,
        status: "active"
      });
      created.push(flag);
    } catch (err) {
      // duplicate key (11000) means this pair was already flagged - safe to ignore
      if (err.code !== 11000) throw err;
    }
  }

  return created;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = { checkInteractionsForNewMedication };
