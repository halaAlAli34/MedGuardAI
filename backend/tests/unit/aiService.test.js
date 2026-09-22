const aiService = require("../../src/services/aiService");

describe("aiService.isConfigured", () => {
  const original = process.env.GEMINI_API_KEY;
  afterEach(() => { process.env.GEMINI_API_KEY = original; });

  it("is false when no API key is set", () => {
    delete process.env.GEMINI_API_KEY;
    expect(aiService.isConfigured()).toBe(false);
  });

  it("is true when an API key is set", () => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    expect(aiService.isConfigured()).toBe(true);
  });
});

describe("aiService.generateRiskExplanation", () => {
  const original = process.env.GEMINI_API_KEY;
  afterEach(() => {
    process.env.GEMINI_API_KEY = original;
    global.fetch && global.fetch.mockRestore && global.fetch.mockRestore();
    delete global.fetch;
  });

  it("throws AI_NOT_CONFIGURED when no key is set, so callers can degrade gracefully", async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(
      aiService.generateRiskExplanation({ drugA: "Warfarin", drugB: "Aspirin", severity: "severe", description: "desc" })
    ).rejects.toThrow(/AI_NOT_CONFIGURED|not configured/i);
  });

  it("parses a well-formed JSON response from Gemini into explanation + doctorQuestions", async () => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                explanation: "These medications may interact. Discuss with your doctor.",
                doctorQuestions: ["Question one?", "Question two?", "Question three?"]
              })
            }]
          }
        }]
      })
    });

    const result = await aiService.generateRiskExplanation({
      drugA: "Warfarin", drugB: "Aspirin", severity: "severe", description: "Bleeding risk", patientAge: 68
    });

    expect(result.explanation).toMatch(/discuss with your doctor/i);
    expect(result.doctorQuestions).toHaveLength(3);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("generativelanguage.googleapis.com"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("throws when the Gemini API responds with a non-OK status", async () => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, text: async () => "server error" });

    await expect(
      aiService.generateRiskExplanation({ drugA: "A", drugB: "B", severity: "mild", description: "d" })
    ).rejects.toThrow(/500/);
  });

  it("retries automatically on a transient 503 (model overloaded) and succeeds on the retry", async () => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    const overloadedResponse = { ok: false, status: 503, text: async () => "overloaded" };
    const successResponse = {
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify({ explanation: "ok", doctorQuestions: ["q1", "q2", "q3"] }) }] } }]
      })
    };
    global.fetch = jest.fn()
      .mockResolvedValueOnce(overloadedResponse)
      .mockResolvedValueOnce(successResponse);

    const result = await aiService.generateRiskExplanation({ drugA: "A", drugB: "B", severity: "mild", description: "d" });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result.explanation).toBe("ok");
  }, 10000);

  it("retries on 429 (rate limited) the same way as 503", async () => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: false, status: 429, text: async () => "rate limited" })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: JSON.stringify({ explanation: "ok", doctorQuestions: ["q1", "q2", "q3"] }) }] } }]
        })
      });

    await aiService.generateRiskExplanation({ drugA: "A", drugB: "B", severity: "mild", description: "d" });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  }, 10000);

  it("gives up after 3 attempts if Gemini stays overloaded the whole time", async () => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503, text: async () => "still overloaded" });

    await expect(
      aiService.generateRiskExplanation({ drugA: "A", drugB: "B", severity: "mild", description: "d" })
    ).rejects.toThrow(/503/);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  }, 10000);

  it("does NOT retry on a non-transient error like 400 (bad request)", async () => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 400, text: async () => "bad request" });

    await expect(
      aiService.generateRiskExplanation({ drugA: "A", drugB: "B", severity: "mild", description: "d" })
    ).rejects.toThrow(/400/);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("throws a clear error when Gemini's response has no candidates/text (unexpected shape)", async () => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ candidates: [] }) });

    await expect(
      aiService.generateRiskExplanation({ drugA: "A", drugB: "B", severity: "mild", description: "d" })
    ).rejects.toThrow(/unexpected gemini response/i);
  });
});

describe("aiService.extractLabelFields", () => {
  const original = process.env.GEMINI_API_KEY;
  afterEach(() => {
    process.env.GEMINI_API_KEY = original;
    global.fetch && global.fetch.mockRestore && global.fetch.mockRestore();
    delete global.fetch;
  });

  it("sends the image as inline_data and parses the extracted fields", async () => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                name: "Warfarin", dosage: "5mg", frequency: "Once daily",
                prescribing_doctor: "Dr. Patel", confidence_score: 88
              })
            }]
          }
        }]
      })
    });

    const result = await aiService.extractLabelFields({ imageBuffer: Buffer.from("fake-image"), mimeType: "image/jpeg" });

    expect(result).toEqual({
      name: "Warfarin", dosage: "5mg", frequency: "Once daily",
      prescribing_doctor: "Dr. Patel", confidence_score: 88
    });

    const sentBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(sentBody.contents[0].parts[0].inline_data.mime_type).toBe("image/jpeg");
    expect(sentBody.contents[0].parts[0].inline_data.data).toBe(Buffer.from("fake-image").toString("base64"));
  });

  it("defaults missing fields to empty string / zero confidence rather than throwing", async () => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: "{}" }] } }] })
    });

    const result = await aiService.extractLabelFields({ imageBuffer: Buffer.from("x"), mimeType: "image/png" });
    expect(result).toEqual({ name: "", dosage: "", frequency: "", prescribing_doctor: "", confidence_score: 0 });
  });
});
