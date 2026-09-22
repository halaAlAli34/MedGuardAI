# MedGuard AI — Entity Relationship Diagram

Generated directly from the implemented Mongoose schemas (`backend/src/models/`), not
hand-drawn separately — so this is guaranteed to match the code, not drift from it. Every
field's required/optional status and type below is enforced by the schema and pinned by
`backend/tests/unit/models.schema.test.js` (19 tests, no database connection needed).

For the two places this diverges from the originally-specified data model, and why, see
`QA_AND_SCHEMA_AUDIT.md` section 4.

```mermaid
erDiagram
    USER ||--o{ MEDICATION : "owns (patient_id)"
    USER ||--o{ MEDICATION : "added (added_by)"
    USER ||--o{ CAREGIVERLINK : "is patient in"
    USER ||--o{ CAREGIVERLINK : "is caregiver in"
    USER ||--o{ FLAGGEDINTERACTION : "owns (patient_id)"
    USER ||--o{ PRESCRIPTIONSCAN : "uploaded (uploaded_by)"
    USER ||--o{ REPORT : "owns (patient_id)"
    USER ||--o{ REPORT : "generated (generated_by)"

    MEDICATION ||--o{ FLAGGEDINTERACTION : "medication_a_id"
    MEDICATION ||--o{ FLAGGEDINTERACTION : "medication_b_id"
    MEDICATION ||--o| PRESCRIPTIONSCAN : "medication_id (optional)"

    INTERACTIONREFERENCE ||--o{ FLAGGEDINTERACTION : "interaction_reference_id"

    USER {
        ObjectId _id PK
        string name
        string email UK
        string password_hash
        string role "enum: patient, caregiver"
        number age "additive, optional - AI context"
        string_array conditions "additive, optional - AI context"
        date created_at
    }

    CAREGIVERLINK {
        ObjectId _id PK
        ObjectId caregiver_id FK "optional - null while status=pending"
        ObjectId patient_id FK
        string permission_level "enum: view, edit | default: edit"
        string status "enum: active, pending, revoked | default: active"
        string invite_code UK
    }

    MEDICATION {
        ObjectId _id PK
        ObjectId patient_id FK
        ObjectId added_by FK
        string name
        string rxnorm_id "optional"
        string dosage
        string frequency
        string prescribing_doctor "optional"
        date start_date "optional"
        date end_date "optional"
        string source "enum: manual, ai_scan | default: manual"
        string status "enum: active, inactive | default: active"
    }

    INTERACTIONREFERENCE {
        ObjectId _id PK
        string drug_a
        string drug_b
        string severity "enum: mild, moderate, severe"
        string description
        string alternative_suggestion "optional"
    }

    FLAGGEDINTERACTION {
        ObjectId _id PK
        ObjectId patient_id FK
        ObjectId medication_a_id FK
        ObjectId medication_b_id FK
        ObjectId interaction_reference_id FK
        string severity "enum: mild, moderate, severe"
        date detected_at
        string status "enum: active, resolved | default: active"
        string ai_explanation "cached, nullable"
        string_array ai_doctor_questions "cached"
    }

    PRESCRIPTIONSCAN {
        ObjectId _id PK
        ObjectId medication_id FK "optional until confirmed"
        ObjectId uploaded_by FK
        string image_url
        string extracted_text "optional"
        object extracted_fields "additive - structured copy of extracted_text"
        number confidence_score "0-100"
        date created_at
    }

    REPORT {
        ObjectId _id PK
        ObjectId patient_id FK
        ObjectId generated_by FK
        date generated_at
        string file_url "optional - null, reports are streamed on-demand"
    }
```

## Key relationships enforced in application code (not just the diagram)

- **CaregiverLink → access control**: every medication/interaction/report route re-checks
  an *active* `CaregiverLink` server-side (`patientContext.middleware.js`) — a caregiver
  can't reach a patient's data just by knowing their ID.
- **FlaggedInteraction has a compound unique index** on `(patient_id, medication_a_id,
  medication_b_id)` to prevent the same pair from being flagged twice — an index, not a
  visible field, so it doesn't appear as a column above but is enforced at the database
  level.
- **Medication → FlaggedInteraction is many-to-many in practice**: a single medication
  can appear as `medication_a_id` in one flag and `medication_b_id` in another, which is
  why the interaction engine checks a new medication against *every* other active
  medication, not just one.
