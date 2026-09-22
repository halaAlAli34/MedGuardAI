jest.mock("../../src/models/Medication");
jest.mock("../../src/models/FlaggedInteraction");
jest.mock("../../src/models/Report");
jest.mock("../../src/models/User");

const Medication = require("../../src/models/Medication");
const FlaggedInteraction = require("../../src/models/FlaggedInteraction");
const Report = require("../../src/models/Report");
const User = require("../../src/models/User");
const { generate } = require("../../src/controllers/reports.controller");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn();
  res.send = jest.fn();
  return res;
}

function chainableFlags(result) {
  const chain = { populate: jest.fn(), sort: jest.fn() };
  chain.populate.mockReturnValue(chain);
  chain.sort.mockResolvedValue(result);
  return chain;
}

describe("reports.controller.generate", () => {
  beforeEach(() => jest.clearAllMocks());

  it("refuses to generate a report for a patientId that doesn't match the resolved (access-controlled) patient context", async () => {
    // This is the key access-control assertion for caregiver mode: even if
    // someone passes an arbitrary :patientId in the URL, resolvePatientContext
    // (upstream middleware) already validated req.patientId - this guard makes
    // sure the URL param can't be used to bypass that.
    const req = { params: { patientId: "someone-elses-id" }, patientId: "p1", user: { id: "c1" } };
    const res = mockRes();

    await generate(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(Medication.find).not.toHaveBeenCalled();
  });

  it("generates a valid PDF with the correct headers when the patientId matches", async () => {
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ name: "Jordan Lee", age: 68 }) });
    Medication.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([
      { name: "Warfarin", dosage: "5mg", frequency: "Once daily" }
    ]) });
    FlaggedInteraction.find.mockReturnValue(chainableFlags([
      {
        medication_a_id: { name: "Warfarin" },
        medication_b_id: { name: "Aspirin" },
        severity: "severe",
        interaction_reference_id: { description: "Bleeding risk." },
        ai_explanation: "Discuss with your doctor.",
        ai_doctor_questions: ["Q1?"]
      }
    ]));
    Report.create.mockResolvedValue({ _id: "report1" });

    const req = { params: { patientId: "p1" }, patientId: "p1", user: { id: "p1" } };
    const res = mockRes();

    await generate(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "application/pdf");
    expect(res.setHeader).toHaveBeenCalledWith("Content-Disposition", expect.stringContaining("attachment"));
    expect(Report.create).toHaveBeenCalledWith(expect.objectContaining({ patient_id: "p1", generated_by: "p1" }));

    const sentBuffer = res.send.mock.calls[0][0];
    expect(Buffer.isBuffer(sentBuffer)).toBe(true);
    expect(sentBuffer.slice(0, 5).toString()).toBe("%PDF-");
  });

  it("generates a valid empty-state PDF when the patient has no meds or flags", async () => {
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ name: "New Patient" }) });
    Medication.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
    FlaggedInteraction.find.mockReturnValue(chainableFlags([]));
    Report.create.mockResolvedValue({ _id: "report2" });

    const req = { params: { patientId: "p2" }, patientId: "p2", user: { id: "p2" } };
    const res = mockRes();

    await generate(req, res);

    const sentBuffer = res.send.mock.calls[0][0];
    expect(sentBuffer.slice(0, 5).toString()).toBe("%PDF-");
  });
});
