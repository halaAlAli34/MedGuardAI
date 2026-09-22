const router = require("express").Router();
const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth.middleware");
const ctrl = require("../controllers/caregiver.controller");

router.use(requireAuth);

router.post("/invite", asyncHandler(ctrl.invite));
router.post("/link", asyncHandler(ctrl.redeem));
router.get("/patients", asyncHandler(ctrl.myPatients));
router.get("/invites", asyncHandler(ctrl.myLinks));
router.post("/revoke/:linkId", asyncHandler(ctrl.revoke));

module.exports = router;
