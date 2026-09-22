const crypto = require("crypto");
const CaregiverLink = require("../models/CaregiverLink");
const User = require("../models/User");
const { sanitize } = require("./auth.controller");

/** POST /api/caregiver/invite - patient generates a shareable invite code */
async function invite(req, res) {
  if (req.user.role !== "patient") {
    return res.status(403).json({ message: "Only patients can generate invite codes" });
  }

  const permission_level = req.body.permission_level === "view" ? "view" : "edit";
  const invite_code = crypto.randomBytes(4).toString("hex").toUpperCase();

  const link = await CaregiverLink.create({
    caregiver_id: null,
    patient_id: req.user.id,
    permission_level,
    status: "pending",
    invite_code
  });

  res.status(201).json({ inviteCode: link.invite_code, linkId: link._id });
}

/** POST /api/caregiver/link - caregiver redeems an invite code */
async function redeem(req, res) {
  if (req.user.role !== "caregiver") {
    return res.status(403).json({ message: "Only caregivers can redeem invite codes" });
  }

  const { inviteCode } = req.body;
  if (!inviteCode) return res.status(400).json({ message: "inviteCode is required" });

  const link = await CaregiverLink.findOne({ invite_code: inviteCode.toUpperCase(), status: "pending" });
  if (!link) return res.status(404).json({ message: "Invalid or already-used invite code" });

  link.caregiver_id = req.user.id;
  link.status = "active";
  await link.save();

  const patient = await User.findById(link.patient_id).select("name email");
  res.json({ message: "Linked successfully", patient, permission_level: link.permission_level });
}

/** GET /api/caregiver/patients - list patients linked to the current caregiver */
async function myPatients(req, res) {
  if (req.user.role !== "caregiver") {
    return res.status(403).json({ message: "Only caregivers can view linked patients" });
  }

  const links = await CaregiverLink.find({ caregiver_id: req.user.id, status: "active" })
    .populate("patient_id", "name email age");

  const patients = links.map((l) => ({
    id: l.patient_id._id,
    name: l.patient_id.name,
    email: l.patient_id.email,
    permission_level: l.permission_level,
    linkId: l._id
  }));

  res.json({ patients });
}

/** GET /api/caregiver/invites - patient views their outstanding/active links */
async function myLinks(req, res) {
  if (req.user.role !== "patient") {
    return res.status(403).json({ message: "Only patients can view their caregiver links" });
  }
  const links = await CaregiverLink.find({ patient_id: req.user.id }).populate("caregiver_id", "name email");
  res.json({ links });
}

/** POST /api/caregiver/revoke/:linkId - patient revokes a caregiver's access */
async function revoke(req, res) {
  if (req.user.role !== "patient") {
    return res.status(403).json({ message: "Only patients can revoke caregiver access" });
  }
  const link = await CaregiverLink.findOneAndUpdate(
    { _id: req.params.linkId, patient_id: req.user.id },
    { status: "revoked" },
    { new: true }
  );
  if (!link) return res.status(404).json({ message: "Link not found" });
  res.json({ message: "Access revoked", link });
}

module.exports = { invite, redeem, myPatients, myLinks, revoke };
