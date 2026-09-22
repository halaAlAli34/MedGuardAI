jest.mock("../../src/models/FlaggedInteraction");
jest.mock("../../src/services/aiService");

const FlaggedInteraction = require("../../src/models/FlaggedInteraction");
const aiService = require("../../src/services/aiService");
const { explain } = require("../../src/controllers/interactions.controller");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

// Builds a chainable mock matching FlaggedInteraction.findOne().populate().populate().populate()
function chainableFlag(flagDoc) {
  const chain = {
    populate: jest.fn().mockReturnThis(),
    then: undefined
  };
  // Mongoose query chains are thenable; simulate by making the final populate() resolve.
  chain.populate = jest.fn()
    .mockReturnValueOnce(chain)
    .mockReturnValueOnce(chain)
    .mockReturnValueOnce(Promise.resolve(flagDoc));
  return chain;
}

describe("interactions.controller.explain — across severities", () => {
  beforeEach(() => jest.clearAllMocks());

  const cases = [
    { severity: "mild", drugA: "Levothyroxine", drugB: "Calcium Carbonate" },
    { severity: "moderate", drugA: "Lisinopril", drugB: "Potassium Chloride" },
    { severity: "severe", drugA: "Warfarin", drugB: "Aspirin" }
  ];

  test.each(cases)("generates and caches an explanation for a $severity interaction", async ({ severity, drugA, drugB }) => {
    const flagDoc = {
      _id: "flag1",
      severity,
      medication_a_id: { name: drugA },
      medication_b_id: { name: drugB },
      interaction_reference_id: { description: `${drugA} + ${drugB} reference description` },
      ai_explanation: null,
      ai_doctor_questions: [],
      save: jest.fn().mockResolvedValue(true)
    };
    FlaggedInteraction.findOne.mockReturnValue(chainableFlag(flagDoc));

    aiService.isConfigured.mockReturnValue(true);
    aiService.generateRiskExplanation.mockResolvedValue({
      explanation: `Plain-language ${severity} explanation, discuss with your doctor.`,
      doctorQuestions: ["Q1?", "Q2?", "Q3?"]
    });

    const req = { params: { id: "flag1" }, query: {}, patientId: "p1", user: { role: "patient", age: 68, conditions: [] } };
    const res = mockRes();

    await explain(req, res);

    expect(aiService.generateRiskExplanation).toHaveBeenCalledWith(
      expect.objectContaining({ drugA, drugB, severity })
    );
    expect(flagDoc.ai_explanation).toContain(severity);
    expect(flagDoc.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      aiAvailable: true,
      cached: false,
      explanation: expect.stringContaining(severity),
      doctorQuestions: ["Q1?", "Q2?", "Q3?"]
    }));
  });

  it("returns the cached explanation without calling the AI service again", async () => {
    const flagDoc = {
      _id: "flag1",
      severity: "severe",
      medication_a_id: { name: "Warfarin" },
      medication_b_id: { name: "Aspirin" },
      interaction_reference_id: { description: "ref" },
      ai_explanation: "Already generated explanation.",
      ai_doctor_questions: ["Existing question?"],
      save: jest.fn()
    };
    FlaggedInteraction.findOne.mockReturnValue(chainableFlag(flagDoc));

    const req = { params: { id: "flag1" }, query: {}, patientId: "p1", user: { role: "patient" } };
    const res = mockRes();

    await explain(req, res);

    expect(aiService.generateRiskExplanation).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      aiAvailable: true,
      cached: true,
      explanation: "Already generated explanation.",
      doctorQuestions: ["Existing question?"]
    });
  });

  it("regenerates when ?refresh=true is passed even if a cached explanation exists", async () => {
    const flagDoc = {
      _id: "flag1",
      severity: "mild",
      medication_a_id: { name: "Levothyroxine" },
      medication_b_id: { name: "Iron Sulfate" },
      interaction_reference_id: { description: "ref" },
      ai_explanation: "Old explanation.",
      ai_doctor_questions: ["Old question?"],
      save: jest.fn().mockResolvedValue(true)
    };
    FlaggedInteraction.findOne.mockReturnValue(chainableFlag(flagDoc));
    aiService.isConfigured.mockReturnValue(true);
    aiService.generateRiskExplanation.mockResolvedValue({ explanation: "Fresh explanation.", doctorQuestions: ["New Q?"] });

    const req = { params: { id: "flag1" }, query: { refresh: "true" }, patientId: "p1", user: { role: "patient" } };
    const res = mockRes();

    await explain(req, res);

    expect(aiService.generateRiskExplanation).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ cached: false, explanation: "Fresh explanation." }));
  });

  it("falls back to the static reference description when the AI service is not configured", async () => {
    const flagDoc = {
      _id: "flag1",
      severity: "moderate",
      medication_a_id: { name: "A" },
      medication_b_id: { name: "B" },
      interaction_reference_id: { description: "Static reference description." },
      ai_explanation: null,
      ai_doctor_questions: []
    };
    FlaggedInteraction.findOne.mockReturnValue(chainableFlag(flagDoc));
    aiService.isConfigured.mockReturnValue(false);

    const req = { params: { id: "flag1" }, query: {}, patientId: "p1", user: { role: "patient" } };
    const res = mockRes();

    await explain(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      aiAvailable: false,
      explanation: "Static reference description.",
      doctorQuestions: []
    }));
  });

  it("falls back gracefully to the reference description when the AI call throws", async () => {
    const flagDoc = {
      _id: "flag1",
      severity: "severe",
      medication_a_id: { name: "A" },
      medication_b_id: { name: "B" },
      interaction_reference_id: { description: "Static reference description." },
      ai_explanation: null,
      ai_doctor_questions: []
    };
    FlaggedInteraction.findOne.mockReturnValue(chainableFlag(flagDoc));
    aiService.isConfigured.mockReturnValue(true);
    aiService.generateRiskExplanation.mockRejectedValue(new Error("Anthropic API error 500"));

    const req = { params: { id: "flag1" }, query: {}, patientId: "p1", user: { role: "patient" } };
    const res = mockRes();

    await explain(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      aiAvailable: false,
      explanation: "Static reference description."
    }));
  });

  it("returns 404 when the flag doesn't exist for this patient", async () => {
    FlaggedInteraction.findOne.mockReturnValue(chainableFlag(null));
    const req = { params: { id: "missing" }, query: {}, patientId: "p1", user: { role: "patient" } };
    const res = mockRes();

    await explain(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
