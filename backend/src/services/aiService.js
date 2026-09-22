/**
 * aiService.js
 *
 * Wraps calls to the Google Gemini API, used for BOTH core AI features:
 *   1. Risk Explainer  -> generateRiskExplanation()   (text)
 *   2. Label Scanner    -> extractLabelFields()        (vision)
 *
 * Gemini was chosen over Claude/GPT specifically because it has a genuinely
 * free tier (no credit card required to get started) - see README section 1
 * for how to get a key at aistudio.google.com/app/apikey. If you'd rather use
 * a different provider, this is the only file that needs to change - every
 * caller just calls isConfigured() / generateRiskExplanation() /
 * extractLabelFields() and doesn't care what's behind them.
 *
 * Design goals per the spec:
 *  - Never sounds diagnostic/prescriptive. Prompts explicitly instruct the
 *    model to use hedged, "discuss with your doctor" language.
 *  - Degrades gracefully: if GEMINI_API_KEY is missing or the API call
 *    fails/times out, callers fall back to the static InteractionReference
 *    description (for the explainer) or a manual-entry prompt (for the
 *    scanner) rather than blocking the UI. See routes/controllers.
 */

// "gemini-flash-latest" is a Google-maintained alias that always points at
// their current recommended fast/cheap model - using it instead of pinning a
// specific version (e.g. "gemini-2.0-flash", which Google retired on
// 2026-06-01) avoids this whole class of "the model silently stopped
// existing" failure going forward. Override with GEMINI_MODEL in .env if you
// want to pin a specific version instead.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function isConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

// Per-attempt timeout and retry budget. Tuned down after live testing showed
// a worst case of ~40s (20s timeout x up to 3 attempts) before falling back -
// far too long for a UI spinner. Two attempts at 12s each caps the worst case
// around 13s, which is a much more honest tradeoff: one retry genuinely
// helps against a brief overload blip, but if Gemini is still unhappy after
// that, waiting longer rarely helps and just makes the UI feel broken.
const REQUEST_TIMEOUT_MS = 12000;
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 600;

async function callGemini({ systemInstruction, parts, maxOutputTokens = 1024 }, attempt = 1) {
  if (!isConfigured()) {
    const err = new Error("AI service not configured (missing GEMINI_API_KEY)");
    err.code = "AI_NOT_CONFIGURED";
    throw err;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: "user", parts }],
        generationConfig: {
          response_mime_type: "application/json",
          maxOutputTokens
        }
      }),
      signal: controller.signal
    });

    if (!res.ok) {
      const text = await res.text();
      // Gemini's free tier periodically returns 503 (model overloaded) or 429
      // (rate limited) under normal load - these are transient server-side
      // conditions, not a real failure, so retry once with a short backoff
      // before actually giving up and falling back.
      if ((res.status === 503 || res.status === 429) && attempt < MAX_ATTEMPTS) {
        clearTimeout(timeout);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        return callGemini({ systemInstruction, parts, maxOutputTokens }, attempt + 1);
      }
      throw new Error(`Gemini API error ${res.status}: ${text}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") {
      throw new Error("Unexpected Gemini response shape (no text returned)");
    }
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

function safeParseJSON(raw) {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

/**
 * Generates a plain-language explanation + doctor questions for a flagged
 * drug interaction. Returns { explanation, doctorQuestions } and NEVER throws
 * for content-safety reasons - the system instruction enforces the tone rules.
 */
async function generateRiskExplanation({ drugA, drugB, severity, description, patientAge, patientConditions }) {
  const systemInstruction = `You help patients understand medication interaction warnings that were
flagged by a static reference database. You are NOT diagnosing, prescribing, or telling
the patient what to do. You are explaining an existing flag in plain language and helping
them prepare for a conversation with their doctor or pharmacist.

Rules you must follow:
- Never say "stop taking", "this is unsafe for you", "you should/shouldn't", or give any
  directive medical instruction.
- Use hedged, non-alarming language: "potential interaction", "may increase the risk of",
  "worth discussing with your doctor or pharmacist".
- Keep the explanation understandable to a non-medical adult reader (roughly 8th-grade
  reading level), 3-5 sentences.
- Generate exactly 3-4 specific, concrete questions the patient could ask their doctor
  or pharmacist about this particular interaction.
- Respond ONLY with raw JSON, no markdown fences, no preamble, in this exact shape:
  {"explanation": "...", "doctorQuestions": ["...", "...", "..."]}`;

  const contextParts = [
    `Drug A: ${drugA}`,
    `Drug B: ${drugB}`,
    `Reference severity: ${severity}`,
    `Reference description: ${description}`
  ];
  if (patientAge) contextParts.push(`Patient age: ${patientAge}`);
  if (patientConditions && patientConditions.length) {
    contextParts.push(`Patient-reported conditions: ${patientConditions.join(", ")}`);
  }

  const raw = await callGemini({
    systemInstruction,
    parts: [{ text: contextParts.join("\n") }],
    maxOutputTokens: 700
  });

  const parsed = safeParseJSON(raw);
  if (!parsed.explanation || !Array.isArray(parsed.doctorQuestions)) {
    throw new Error("Unexpected AI response shape for risk explanation");
  }
  return { explanation: parsed.explanation, doctorQuestions: parsed.doctorQuestions };
}

/**
 * Sends a photographed prescription label to Gemini's vision capability and
 * asks it to extract structured fields plus a confidence score.
 * imageBuffer: Buffer, mimeType: e.g. "image/jpeg"
 */
async function extractLabelFields({ imageBuffer, mimeType }) {
  const systemInstruction = `You extract structured data from photos of prescription medication
labels for a medication-tracking app. You are not verifying the medication is safe or
appropriate - only reading what is printed on the label.

Respond ONLY with raw JSON, no markdown fences, no preamble, in this exact shape:
{"name": "...", "dosage": "...", "frequency": "...", "prescribing_doctor": "...", "confidence_score": 0-100}

Rules:
- If a field is not legible or not present on the label, use an empty string for it.
- confidence_score reflects how confident you are in the OVERALL extraction (0-100),
  factoring in image clarity, glare, blur, and how much of the label is visible.
- Do not guess a drug name that isn't clearly printed - leave it empty and lower the
  confidence score instead.`;

  const base64 = imageBuffer.toString("base64");

  const raw = await callGemini({
    systemInstruction,
    parts: [
      { inline_data: { mime_type: mimeType, data: base64 } },
      { text: "Extract the medication fields from this prescription label photo." }
    ],
    maxOutputTokens: 500
  });

  const parsed = safeParseJSON(raw);
  return {
    name: parsed.name || "",
    dosage: parsed.dosage || "",
    frequency: parsed.frequency || "",
    prescribing_doctor: parsed.prescribing_doctor || "",
    confidence_score: typeof parsed.confidence_score === "number" ? parsed.confidence_score : 0
  };
}

module.exports = { isConfigured, generateRiskExplanation, extractLabelFields };
