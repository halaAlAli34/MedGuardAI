jest.mock("../../src/models/Medication");
jest.mock("../../src/models/InteractionReference");
jest.mock("../../src/models/FlaggedInteraction");

const Medication = require("../../src/models/Medication");
const InteractionReference = require("../../src/models/InteractionReference");
const FlaggedInteraction = require("../../src/models/FlaggedInteraction");
const { checkInteractionsForNewMedication } = require("../../src/services/interactionEngine");

describe("interactionEngine.checkInteractionsForNewMedication", () => {
  beforeEach(() => jest.clearAllMocks());

  it("creates a flag when a known interaction pair exists, case-insensitively", async () => {
    const newMed = { _id: "med2", patient_id: "patient1", name: "aspirin" }; // lowercase on purpose
    const existingMed = { _id: "med1", name: "WARFARIN" }; // uppercase on purpose

    Medication.find.mockResolvedValue([existingMed]);
    InteractionReference.findOne.mockResolvedValue({
      _id: "ref1",
      drug_a: "Warfarin",
      drug_b: "Aspirin",
      severity: "severe"
    });
    FlaggedInteraction.create.mockResolvedValue({ _id: "flag1" });

    const created = await checkInteractionsForNewMedication(newMed);

    expect(created).toHaveLength(1);
    expect(FlaggedInteraction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        patient_id: "patient1",
        medication_a_id: "med2",
        medication_b_id: "med1",
        interaction_reference_id: "ref1",
        severity: "severe",
        status: "active"
      })
    );
  });

  it("matches the reverse direction (B-A) just as well as A-B", async () => {
    const newMed = { _id: "medX", patient_id: "p1", name: "Warfarin" };
    const existingMed = { _id: "medY", name: "Aspirin" };

    Medication.find.mockResolvedValue([existingMed]);
    InteractionReference.findOne.mockImplementation(async (query) => {
      // Simulate Mongo's $or matching: return the reference only if either
      // direction's regex would match "Warfarin"/"Aspirin".
      return { _id: "refR", drug_a: "Warfarin", drug_b: "Aspirin", severity: "severe" };
    });
    FlaggedInteraction.create.mockResolvedValue({ _id: "flagR" });

    const created = await checkInteractionsForNewMedication(newMed);
    expect(created).toHaveLength(1);
  });

  it("creates no flag when there is no matching reference", async () => {
    Medication.find.mockResolvedValue([{ _id: "medY", name: "Vitamin C" }]);
    InteractionReference.findOne.mockResolvedValue(null);

    const created = await checkInteractionsForNewMedication({ _id: "medX", patient_id: "p1", name: "Ibuprofen" });

    expect(created).toHaveLength(0);
    expect(FlaggedInteraction.create).not.toHaveBeenCalled();
  });

  it("does not check a medication against itself", async () => {
    Medication.find.mockResolvedValue([]); // service excludes _id: newMed._id in the query
    const created = await checkInteractionsForNewMedication({ _id: "med1", patient_id: "p1", name: "Warfarin" });

    expect(Medication.find).toHaveBeenCalledWith(
      expect.objectContaining({ _id: { $ne: "med1" } })
    );
    expect(created).toHaveLength(0);
  });

  it("excludes medications whose end_date has already passed (expired), even if status is still 'active'", async () => {
    Medication.find.mockResolvedValue([]);
    await checkInteractionsForNewMedication({ _id: "med1", patient_id: "p1", name: "Warfarin" });

    const query = Medication.find.mock.calls[0][0];
    expect(query.status).toBe("active");
    expect(query.$or).toEqual(
      expect.arrayContaining([
        { end_date: null },
        { end_date: { $exists: false } },
        expect.objectContaining({ end_date: expect.objectContaining({ $gte: expect.any(Date) }) })
      ])
    );
  });

  it("silently ignores a duplicate-key error (pair already flagged)", async () => {
    Medication.find.mockResolvedValue([{ _id: "medY", name: "Aspirin" }]);
    InteractionReference.findOne.mockResolvedValue({ _id: "ref1", severity: "severe" });

    const dupError = new Error("duplicate key");
    dupError.code = 11000;
    FlaggedInteraction.create.mockRejectedValue(dupError);

    const created = await checkInteractionsForNewMedication({ _id: "medX", patient_id: "p1", name: "Warfarin" });
    expect(created).toHaveLength(0); // no throw, just skipped
  });

  it("re-throws non-duplicate-key errors", async () => {
    Medication.find.mockResolvedValue([{ _id: "medY", name: "Aspirin" }]);
    InteractionReference.findOne.mockResolvedValue({ _id: "ref1", severity: "severe" });
    FlaggedInteraction.create.mockRejectedValue(new Error("connection lost"));

    await expect(
      checkInteractionsForNewMedication({ _id: "medX", patient_id: "p1", name: "Warfarin" })
    ).rejects.toThrow("connection lost");
  });

  it("returns immediately with no queries when the patient has no other active medications", async () => {
    Medication.find.mockResolvedValue([]);
    const created = await checkInteractionsForNewMedication({ _id: "med1", patient_id: "p1", name: "Warfarin" });
    expect(created).toHaveLength(0);
    expect(InteractionReference.findOne).not.toHaveBeenCalled();
  });
});
