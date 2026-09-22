jest.mock("../../src/models/CaregiverLink");
jest.mock("../../src/models/User");
jest.mock("crypto", () => ({
  randomBytes: jest.fn(() => ({ toString: () => "a1b2c3d4" }))
}));

const CaregiverLink = require("../../src/models/CaregiverLink");
const User = require("../../src/models/User");
const ctrl = require("../../src/controllers/caregiver.controller");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("caregiver.controller.invite (patient side)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects a non-patient from generating an invite code", async () => {
    const req = { user: { role: "caregiver", id: "c1" }, body: {} };
    const res = mockRes();
    await ctrl.invite(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(CaregiverLink.create).not.toHaveBeenCalled();
  });

  it("generates an uppercase invite code with status pending and no caregiver yet", async () => {
    CaregiverLink.create.mockResolvedValue({ _id: "link1", invite_code: "A1B2C3D4".toUpperCase() });
    const req = { user: { role: "patient", id: "p1" }, body: { permission_level: "view" } };
    const res = mockRes();

    await ctrl.invite(req, res);

    expect(CaregiverLink.create).toHaveBeenCalledWith(expect.objectContaining({
      caregiver_id: null, patient_id: "p1", permission_level: "view", status: "pending"
    }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("defaults permission_level to edit when not specified", async () => {
    CaregiverLink.create.mockResolvedValue({ _id: "link1", invite_code: "CODE1234" });
    const req = { user: { role: "patient", id: "p1" }, body: {} };
    const res = mockRes();

    await ctrl.invite(req, res);

    expect(CaregiverLink.create).toHaveBeenCalledWith(expect.objectContaining({ permission_level: "edit" }));
  });
});

describe("caregiver.controller.redeem (caregiver side)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects a non-caregiver from redeeming a code", async () => {
    const req = { user: { role: "patient", id: "p1" }, body: { inviteCode: "ABC123" } };
    const res = mockRes();
    await ctrl.redeem(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns 400 with no invite code provided", async () => {
    const req = { user: { role: "caregiver", id: "c1" }, body: {} };
    const res = mockRes();
    await ctrl.redeem(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 404 for an invalid or already-used invite code", async () => {
    CaregiverLink.findOne.mockResolvedValue(null);
    const req = { user: { role: "caregiver", id: "c1" }, body: { inviteCode: "NOTREAL1" } };
    const res = mockRes();
    await ctrl.redeem(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("links the caregiver, flips status to active, and returns the patient", async () => {
    const link = { caregiver_id: null, status: "pending", permission_level: "edit", patient_id: "p1", save: jest.fn().mockResolvedValue(true) };
    CaregiverLink.findOne.mockResolvedValue(link);
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ name: "Jordan Lee", email: "j@demo.com" }) });

    const req = { user: { role: "caregiver", id: "c1" }, body: { inviteCode: "code1234" } };
    const res = mockRes();

    await ctrl.redeem(req, res);

    expect(link.caregiver_id).toBe("c1");
    expect(link.status).toBe("active");
    expect(link.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      patient: { name: "Jordan Lee", email: "j@demo.com" },
      permission_level: "edit"
    }));
  });

  it("uppercases the invite code before lookup so redemption isn't case-sensitive", async () => {
    CaregiverLink.findOne.mockResolvedValue(null);
    const req = { user: { role: "caregiver", id: "c1" }, body: { inviteCode: "code1234" } };
    const res = mockRes();

    await ctrl.redeem(req, res);

    expect(CaregiverLink.findOne).toHaveBeenCalledWith({ invite_code: "CODE1234", status: "pending" });
  });
});

describe("caregiver.controller.myPatients / myLinks / revoke", () => {
  beforeEach(() => jest.clearAllMocks());

  it("myPatients rejects non-caregivers", async () => {
    const req = { user: { role: "patient", id: "p1" } };
    const res = mockRes();
    await ctrl.myPatients(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("myPatients lists only active links with permission level surfaced", async () => {
    CaregiverLink.find.mockReturnValue({
      populate: jest.fn().mockResolvedValue([
        { patient_id: { _id: "p1", name: "Jordan Lee", email: "j@demo.com" }, permission_level: "edit", _id: "link1" }
      ])
    });
    const req = { user: { role: "caregiver", id: "c1" } };
    const res = mockRes();

    await ctrl.myPatients(req, res);

    expect(CaregiverLink.find).toHaveBeenCalledWith({ caregiver_id: "c1", status: "active" });
    expect(res.json).toHaveBeenCalledWith({ patients: [{ id: "p1", name: "Jordan Lee", email: "j@demo.com", permission_level: "edit", linkId: "link1" }] });
  });

  it("revoke flips a link's status to revoked, scoped to the requesting patient", async () => {
    CaregiverLink.findOneAndUpdate.mockResolvedValue({ _id: "link1", status: "revoked" });
    const req = { user: { role: "patient", id: "p1" }, params: { linkId: "link1" } };
    const res = mockRes();

    await ctrl.revoke(req, res);

    expect(CaregiverLink.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "link1", patient_id: "p1" },
      { status: "revoked" },
      { new: true }
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Access revoked" }));
  });

  it("revoke returns 404 when the link doesn't belong to this patient", async () => {
    CaregiverLink.findOneAndUpdate.mockResolvedValue(null);
    const req = { user: { role: "patient", id: "p1" }, params: { linkId: "someone-elses-link" } };
    const res = mockRes();

    await ctrl.revoke(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
