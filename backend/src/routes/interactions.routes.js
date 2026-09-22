const router = require("express").Router();
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth.middleware");
const { resolvePatientContext, requireEditPermission } = require("../middleware/patientContext.middleware");
const ctrl = require("../controllers/interactions.controller");

router.use(requireAuth, resolvePatientContext);

router.get("/", asyncHandler(ctrl.list));
router.post("/:id/explain", asyncHandler(ctrl.explain));
router.post("/:id/resolve", requireEditPermission, asyncHandler(ctrl.resolve));

module.exports = router;
