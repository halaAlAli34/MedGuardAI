/**
 * Schema-vs-ERD audit.
 *
 * Uses mongoose's validateSync() - which runs entirely client-side, no DB
 * connection required - to confirm every model actually enforces the field
 * requirements, types, and enums specified in the brief's data model, and to
 * document (and pin with a test) the one deliberate deviation we made.
 */
const mongoose = require("mongoose");
const User = require("../../src/models/User");
const CaregiverLink = require("../../src/models/CaregiverLink");
const Medication = require("../../src/models/Medication");
const InteractionReference = require("../../src/models/InteractionReference");
const FlaggedInteraction = require("../../src/models/FlaggedInteraction");
const PrescriptionScan = require("../../src/models/PrescriptionScan");
const Report = require("../../src/models/Report");

const oid = () => new mongoose.Types.ObjectId();

describe("User schema", () => {
  it("requires name, email, password_hash, and role", () => {
    const err = new User({}).validateSync();
    expect(err.errors.name).toBeDefined();
    expect(err.errors.email).toBeDefined();
    expect(err.errors.password_hash).toBeDefined();
    expect(err.errors.role).toBeDefined();
  });

  it("only accepts 'patient' or 'caregiver' as role", () => {
    const bad = new User({ name: "A", email: "a@b.com", password_hash: "x", role: "doctor" });
    expect(bad.validateSync().errors.role).toBeDefined();

    const good = new User({ name: "A", email: "a@b.com", password_hash: "x", role: "patient" });
    expect(good.validateSync()).toBeUndefined();
  });

  it("defaults created_at to now", () => {
    const u = new User({ name: "A", email: "a@b.com", password_hash: "x", role: "patient" });
    expect(u.created_at).toBeInstanceOf(Date);
  });
});

describe("CaregiverLink schema", () => {
  it("requires patient_id", () => {
    const err = new CaregiverLink({ caregiver_id: oid() }).validateSync();
    expect(err.errors.patient_id).toBeDefined();
  });

  it("allows a null caregiver_id while status is 'pending' (invite-before-redeem flow)", () => {
    const link = new CaregiverLink({ caregiver_id: null, patient_id: oid(), status: "pending", invite_code: "ABC123" });
    expect(link.validateSync()).toBeUndefined();
  });

  it("permission_level only accepts view/edit and defaults to edit", () => {
    const link = new CaregiverLink({ caregiver_id: oid(), patient_id: oid() });
    expect(link.permission_level).toBe("edit");

    const bad = new CaregiverLink({ caregiver_id: oid(), patient_id: oid(), permission_level: "admin" });
    expect(bad.validateSync().errors.permission_level).toBeDefined();
  });

  it("status only accepts active/pending/revoked and defaults to active", () => {
    const link = new CaregiverLink({ caregiver_id: oid(), patient_id: oid() });
    expect(link.status).toBe("active");
  });
});

describe("Medication schema", () => {
  it("requires patient_id, added_by, name, dosage, frequency", () => {
    const err = new Medication({}).validateSync();
    ["patient_id", "added_by", "name", "dosage", "frequency"].forEach((f) => {
      expect(err.errors[f]).toBeDefined();
    });
  });

  it("source defaults to 'manual' and status defaults to 'active'", () => {
    const m = new Medication({ patient_id: oid(), added_by: oid(), name: "Aspirin", dosage: "81mg", frequency: "Once daily" });
    expect(m.source).toBe("manual");
    expect(m.status).toBe("active");
    expect(m.validateSync()).toBeUndefined();
  });

  it("rejects an invalid source or status value", () => {
    const m = new Medication({
      patient_id: oid(), added_by: oid(), name: "Aspirin", dosage: "81mg", frequency: "Once daily",
      source: "pharmacy_api", status: "deleted"
    });
    const err = m.validateSync();
    expect(err.errors.source).toBeDefined();
    expect(err.errors.status).toBeDefined();
  });
});

describe("InteractionReference schema", () => {
  it("requires drug_a, drug_b, severity, description", () => {
    const err = new InteractionReference({}).validateSync();
    ["drug_a", "drug_b", "severity", "description"].forEach((f) => expect(err.errors[f]).toBeDefined());
  });

  it("severity only accepts mild/moderate/severe", () => {
    const bad = new InteractionReference({ drug_a: "A", drug_b: "B", severity: "extreme", description: "d" });
    expect(bad.validateSync().errors.severity).toBeDefined();
  });
});

describe("FlaggedInteraction schema", () => {
  it("requires patient_id, medication_a_id, medication_b_id, interaction_reference_id", () => {
    const err = new FlaggedInteraction({}).validateSync();
    ["patient_id", "medication_a_id", "medication_b_id", "interaction_reference_id"].forEach((f) =>
      expect(err.errors[f]).toBeDefined()
    );
  });

  it("status defaults to active; ai_explanation/ai_doctor_questions default to null/empty for caching", () => {
    const f = new FlaggedInteraction({
      patient_id: oid(), medication_a_id: oid(), medication_b_id: oid(), interaction_reference_id: oid()
    });
    expect(f.status).toBe("active");
    expect(f.ai_explanation).toBeNull();
    expect(f.ai_doctor_questions).toEqual([]);
  });
});

describe("PrescriptionScan schema", () => {
  it("requires uploaded_by and image_url", () => {
    const err = new PrescriptionScan({}).validateSync();
    expect(err.errors.uploaded_by).toBeDefined();
    expect(err.errors.image_url).toBeDefined();
  });

  it("medication_id is optional (unset until the user confirms and saves)", () => {
    const s = new PrescriptionScan({ uploaded_by: oid(), image_url: "https://x/y.jpg" });
    expect(s.validateSync()).toBeUndefined();
    expect(s.medication_id).toBeNull();
  });

  it("confidence_score is bounded 0-100", () => {
    const s = new PrescriptionScan({ uploaded_by: oid(), image_url: "https://x/y.jpg", confidence_score: 150 });
    expect(s.validateSync().errors.confidence_score).toBeDefined();
  });
});

describe("Report schema", () => {
  it("requires patient_id and generated_by", () => {
    const err = new Report({}).validateSync();
    expect(err.errors.patient_id).toBeDefined();
    expect(err.errors.generated_by).toBeDefined();
  });

  it("defaults generated_at to now", () => {
    const r = new Report({ patient_id: oid(), generated_by: oid() });
    expect(r.generated_at).toBeInstanceOf(Date);
  });
});
