const router = require("express").Router();
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth.middleware");
const { resolvePatientContext } = require("../middleware/patientContext.middleware");
const ctrl = require("../controllers/reports.controller");

router.get("/:patientId", requireAuth, resolvePatientContext, asyncHandler(ctrl.generate));

module.exports = router;
