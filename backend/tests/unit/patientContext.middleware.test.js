jest.mock("../../src/models/CaregiverLink");

const CaregiverLink = require("../../src/models/CaregiverLink");
const { resolvePatientContext, requireEditPermission } = require("../../src/middleware/patientContext.middleware");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("resolvePatientContext", () => {
  beforeEach(() => jest.clearAllMocks());

  it("lets a patient act on their own id with edit permission, no DB lookup needed", async () => {
    const req = { user: { role: "patient", id: "p1" }, query: {}, body: {} };
    const res = mockRes();
    const next = jest.fn();

    await resolvePatientContext(req, res, next);

    expect(req.patientId).toBe("p1");
    expect(req.permissionLevel).toBe("edit");
    expect(next).toHaveBeenCalled();
    expect(CaregiverLink.findOne).not.toHaveBeenCalled();
  });

  it("rejects a caregiver request with no patientId", async () => {
    const req = { user: { role: "caregiver", id: "c1" }, query: {}, body: {} };
    const res = mockRes();
    const next = jest.fn();

    await resolvePatientContext(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects a caregiver with no active link to the requested patient (403)", async () => {
    CaregiverLink.findOne.mockResolvedValue(null);
    const req = { user: { role: "caregiver", id: "c1" }, query: { patientId: "p1" }, body: {} };
    const res = mockRes();
    const next = jest.fn();

    await resolvePatientContext(req, res, next);

    expect(CaregiverLink.findOne).toHaveBeenCalledWith({
      caregiver_id: "c1", patient_id: "p1", status: "active"
    });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("allows a caregiver with an active link and carries through the permission level", async () => {
    CaregiverLink.findOne.mockResolvedValue({ permission_level: "view" });
    const req = { user: { role: "caregiver", id: "c1" }, query: { patientId: "p1" }, body: {} };
    const res = mockRes();
    const next = jest.fn();

    await resolvePatientContext(req, res, next);

    expect(req.patientId).toBe("p1");
    expect(req.permissionLevel).toBe("view");
    expect(next).toHaveBeenCalled();
  });
});

describe("requireEditPermission", () => {
  it("blocks a view-only caregiver from mutating routes", () => {
    const req = { user: { role: "caregiver" }, permissionLevel: "view" };
    const res = mockRes();
    const next = jest.fn();

    requireEditPermission(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("allows an edit-permission caregiver through", () => {
    const req = { user: { role: "caregiver" }, permissionLevel: "edit" };
    const res = mockRes();
    const next = jest.fn();

    requireEditPermission(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("always allows a patient (permissionLevel is irrelevant for their own data)", () => {
    const req = { user: { role: "patient" } };
    const res = mockRes();
    const next = jest.fn();

    requireEditPermission(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
