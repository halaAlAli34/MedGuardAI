const CaregiverLink = require("../models/CaregiverLink");

/**
 * Resolves which patient's data is being requested and enforces access control.
 *
 * - Patients always act on their own data (req.user.id).
 * - Caregivers must pass ?patientId=... (or body.patientId) and must have an
 *   ACTIVE CaregiverLink to that patient. This check runs on every request,
 *   not just in the UI, per the spec.
 *
 * Sets req.patientId and, for caregivers, req.permissionLevel ("view"/"edit").
 */
async function resolvePatientContext(req, res, next) {
  try {
    if (req.user.role === "patient") {
      req.patientId = req.user.id;
      req.permissionLevel = "edit";
      return next();
    }

    // caregiver
    const patientId = req.query.patientId || req.body.patientId;
    if (!patientId) {
      return res.status(400).json({ message: "patientId is required for caregiver requests" });
    }

    const link = await CaregiverLink.findOne({
      caregiver_id: req.user.id,
      patient_id: patientId,
      status: "active"
    });

    if (!link) {
      return res.status(403).json({ message: "You are not linked to this patient" });
    }

    req.patientId = patientId;
    req.permissionLevel = link.permission_level;
    next();
  } catch (err) {
    next(err);
  }
}

// Blocks caregivers with view-only permission from mutating routes.
function requireEditPermission(req, res, next) {
  if (req.user.role === "caregiver" && req.permissionLevel !== "edit") {
    return res.status(403).json({ message: "View-only access: editing is not permitted" });
  }
  next();
}

module.exports = { resolvePatientContext, requireEditPermission };
