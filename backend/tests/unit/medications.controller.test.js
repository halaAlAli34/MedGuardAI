jest.mock("../../src/models/Medication");
jest.mock("../../src/models/PrescriptionScan");
jest.mock("../../src/services/aiService");
jest.mock("../../src/services/storageService");
jest.mock("../../src/services/interactionEngine");

const Medication = require("../../src/models/Medication");
const PrescriptionScan = require("../../src/models/PrescriptionScan");
const aiService = require("../../src/services/aiService");
const storageService = require("../../src/services/storageService");
const { checkInteractionsForNewMedication } = require("../../src/services/interactionEngine");
const ctrl = require("../../src/controllers/medications.controller");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("medications.controller.scan", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storageService.uploadImage.mockResolvedValue("https://cdn.example.com/label.jpg");
  });

  it("returns 400 when no file is attached", async () => {
    const req = { file: null, user: { id: "u1" } };
    const res = mockRes();
    await ctrl.scan(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("prompts manual entry when the AI service isn't configured, but still stores the uploaded image", async () => {
    aiService.isConfigured.mockReturnValue(false);
    PrescriptionScan.create.mockResolvedValue({ _id: "scan1" });

    const req = { file: { buffer: Buffer.from("fake"), originalname: "label.jpg", mimetype: "image/jpeg" }, user: { id: "u1" } };
    const res = mockRes();

    await ctrl.scan(req, res);

    expect(storageService.uploadImage).toHaveBeenCalled();
    expect(aiService.extractLabelFields).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      aiAvailable: false,
      extracted: { name: "", dosage: "", frequency: "", prescribing_doctor: "" },
      confidence_score: 0
    }));
  });

  it("returns extracted fields and a high confidence score on a clean scan", async () => {
    aiService.isConfigured.mockReturnValue(true);
    aiService.extractLabelFields.mockResolvedValue({
      name: "Warfarin", dosage: "5mg", frequency: "Once daily", prescribing_doctor: "Dr. Patel", confidence_score: 92
    });
    PrescriptionScan.create.mockResolvedValue({ _id: "scan2" });

    const req = { file: { buffer: Buffer.from("fake"), originalname: "label.jpg", mimetype: "image/jpeg" }, user: { id: "u1" } };
    const res = mockRes();

    await ctrl.scan(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      aiAvailable: true,
      confidence_score: 92,
      extracted: expect.objectContaining({ name: "Warfarin", dosage: "5mg" })
    }));
  });

  it("returns a low confidence score untouched, so the frontend can trigger its correction prompt", async () => {
    aiService.isConfigured.mockReturnValue(true);
    aiService.extractLabelFields.mockResolvedValue({
      name: "", dosage: "20mg", frequency: "", prescribing_doctor: "", confidence_score: 22
    });
    PrescriptionScan.create.mockResolvedValue({ _id: "scan3" });

    const req = { file: { buffer: Buffer.from("fake"), originalname: "blurry.jpg", mimetype: "image/jpeg" }, user: { id: "u1" } };
    const res = mockRes();

    await ctrl.scan(req, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.confidence_score).toBe(22);
    expect(payload.confidence_score).toBeLessThan(40); // below the frontend's LOW_CONFIDENCE_THRESHOLD
  });

  it("degrades gracefully to manual entry when the AI vision call throws", async () => {
    aiService.isConfigured.mockReturnValue(true);
    aiService.extractLabelFields.mockRejectedValue(new Error("Anthropic API error 503"));
    PrescriptionScan.create.mockResolvedValue({ _id: "scan4" });

    const req = { file: { buffer: Buffer.from("fake"), originalname: "label.jpg", mimetype: "image/jpeg" }, user: { id: "u1" } };
    const res = mockRes();

    await ctrl.scan(req, res);

    // Per spec: never blocks the UI - responds 200 with an empty form and a clear message.
    expect(res.status).not.toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      aiAvailable: false,
      extracted: { name: "", dosage: "", frequency: "", prescribing_doctor: "" }
    }));
  });
});

describe("medications.controller.create — triggers the interaction engine", () => {
  beforeEach(() => jest.clearAllMocks());

  it("runs the interaction check after saving and reports how many new flags were created", async () => {
    const savedMed = { _id: "med1", name: "Warfarin" };
    Medication.create.mockResolvedValue(savedMed);
    checkInteractionsForNewMedication.mockResolvedValue([{ _id: "flag1" }, { _id: "flag2" }]);

    const req = {
      body: { name: "Warfarin", dosage: "5mg", frequency: "Once daily" },
      patientId: "p1", user: { id: "p1" }
    };
    const res = mockRes();

    await ctrl.create(req, res);

    expect(checkInteractionsForNewMedication).toHaveBeenCalledWith(savedMed);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ medication: savedMed, newFlagsCount: 2 });
  });

  it("rejects with 400 when required fields are missing", async () => {
    const req = { body: { name: "Warfarin" }, patientId: "p1", user: { id: "p1" } };
    const res = mockRes();

    await ctrl.create(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Medication.create).not.toHaveBeenCalled();
  });
});
