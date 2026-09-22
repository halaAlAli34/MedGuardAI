const router = require("express").Router();
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth.middleware");
const { resolvePatientContext, requireEditPermission } = require("../middleware/patientContext.middleware");
const upload = require("../middleware/upload.middleware");
const ctrl = require("../controllers/medications.controller");

router.use(requireAuth);

router.get("/", resolvePatientContext, asyncHandler(ctrl.list));
router.post("/", resolvePatientContext, requireEditPermission, asyncHandler(ctrl.create));
router.put("/:id", resolvePatientContext, requireEditPermission, asyncHandler(ctrl.update));
router.delete("/:id", resolvePatientContext, requireEditPermission, asyncHandler(ctrl.remove));

// Scan doesn't need patient context - it just extracts fields; the resulting
// medication is created via the normal POST / once the user confirms.
router.post("/scan", upload.single("image"), asyncHandler(ctrl.scan));

module.exports = router;
