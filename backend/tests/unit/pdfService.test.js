const { generateReportPDF } = require("../../src/services/pdfService");

describe("pdfService.generateReportPDF", () => {
  it("produces a valid, non-trivial PDF buffer for a patient with meds and flags", async () => {
    const buffer = await generateReportPDF({
      patient: { name: "Jordan Lee", age: 68 },
      medications: [
        { name: "Warfarin", dosage: "5mg", frequency: "Once daily", prescribing_doctor: "Dr. Patel" },
        { name: "Aspirin", dosage: "81mg", frequency: "Once daily" }
      ],
      flags: [
        {
          medication_a_id: { name: "Warfarin" },
          medication_b_id: { name: "Aspirin" },
          severity: "severe",
          interaction_reference_id: { description: "Increases bleeding risk." },
          ai_explanation: "Taking these together may increase bleeding risk. Discuss with your doctor.",
          ai_doctor_questions: ["Should I avoid taking these together?", "What bleeding symptoms should I watch for?"]
        }
      ]
    });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    // A real PDF always starts with the %PDF- magic bytes.
    expect(buffer.slice(0, 5).toString()).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(500);
  });

  it("still produces a valid PDF for a patient with no medications and no flags (empty state)", async () => {
    const buffer = await generateReportPDF({ patient: { name: "New Patient" }, medications: [], flags: [] });
    expect(buffer.slice(0, 5).toString()).toBe("%PDF-");
  });
});
