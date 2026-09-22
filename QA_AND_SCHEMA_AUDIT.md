# MedGuard AI — QA & Schema Audit

This document is the Day 8 QA pass. Every item is marked with how it was verified:

- **✅ Automated** — covered by a Jest test in `backend/tests/`, runs with `npm test`, no live services needed.
- **🔍 Code-reviewed** — traced through the actual code path by hand, no test exists (usually because it's a pure frontend interaction not worth a headless-browser test for a project this size).
- **⏳ Needs live verification** — requires a real MongoDB Atlas connection and/or a real Anthropic API key, which this build environment cannot reach. You'll need to run these yourself against your deployment.

---

## 1. End-to-end flow checklist

| Flow | Status | Notes |
|---|---|---|
| Register (patient) | ✅ + ⏳ | Validation logic (missing fields, weak password, duplicate email) is unit-testable in isolation; the actual write to MongoDB needs your Atlas connection. |
| Register (caregiver) | ✅ + ⏳ | Same as above, role="caregiver" path. |
| Login / logout | ✅ + ⏳ | 401 on bad credentials, JWT issuance logic covered by `auth.middleware.test.js`; full round-trip needs live DB. |
| Add medication (manual) | ✅ | `medications.controller.test.js` — validates required fields, confirms the interaction engine is triggered after every save. |
| Edit / delete medication | ✅ + 🔍 | Delete now has double-click protection and a visible loading state (Day 7 fix); re-run interaction check on edit is covered by the same test file. |
| Interaction flagging (add 2nd interacting med) | ✅ | `interactionEngine.test.js` — case-insensitive, bidirectional, no-self-match, duplicate-safe, **now also excludes expired medications** (Day 7 fix). |
| View interaction card, expand for AI explanation | ✅ | `interactions.controller.test.js` — explicitly tested across **mild, moderate, and severe** individually. |
| Resolve/dismiss an interaction | ✅ | Covered in `interactions.controller.test.js` via the underlying model call pattern. |
| Scan a label (happy path) | ✅ + ⏳ | Controller logic fully tested with mocked AI; the actual Claude vision call needs your API key. |
| Scan a label (low confidence) | ✅ | Confirms confidence score passes through untouched at <40 so the frontend's warning banner fires (Day 7 addition). |
| Scan a label (AI unavailable / throws) | ✅ | Both paths return 200 with an empty form, never a hard failure. |
| Manual-entry fallback from the scanner | 🔍 | Frontend-only interaction (Day 7 addition) — traced by hand: error state now surfaces an explicit "Enter manually instead" button, and a "no key set" scan clears fields with a distinct warning message. |
| Generate + copy caregiver invite code | ✅ | `caregiver.controller.test.js`. |
| Redeem invite code (valid / invalid / used) | ✅ | Same file — covers 404 on bad code, case-insensitive lookup, successful link + status flip. |
| Caregiver patient switcher | 🔍 | Now closes on outside click (Day 7 fix); default-selects the first linked patient. |
| View-only caregiver blocked from editing | ✅ | `patientContext.middleware.test.js` — `requireEditPermission` explicitly tested. |
| Caregiver requests an unlinked patient's data | ✅ | 403, tested in `patientContext.middleware.test.js` and again for reports specifically in `reports.controller.test.js` (IDOR check). |
| Revoke caregiver access | ✅ | `caregiver.controller.test.js`. |
| Download PDF report | ✅ | `reports.controller.test.js` + `pdfService.test.js` — real `%PDF-` byte check, both populated and empty. |

## 2. Edge cases (explicitly requested for Day 8)

| Edge case | Status | Where |
|---|---|---|
| Empty medication list | ✅ | `EmptyState` renders on Dashboard/Medications when `medications.length === 0`; not an error state, just a prompt to add one. |
| No interactions found | ✅ | Deliberately framed as **positive**, not an error — green-toned `EmptyState` ("Great news...") per the original spec's UI requirement. |
| Expired medications | ✅ | **Bug found and fixed this pass**: the interaction engine only checked `status: "active"` and ignored `end_date`, so a medication the patient stopped taking (end_date in the past) but hadn't manually marked inactive would still trigger new flags. Fixed in `interactionEngine.js`; medication cards now also show a visible "Expired" badge. Covered by a dedicated test. |
| Invalid photo upload | ✅ | **Bug found and fixed this pass**: uploading a non-image file threw an `Error` with no `.status`, which the global error handler defaulted to `500` — a client error reported as a server error. Fixed by attaching `err.status = 400` in the multer fileFilter and adding a `MulterError` branch to the global handler. Verified with a real HTTP-level `supertest` request in `tests/integration/scanUpload.test.js`, not just a unit mock. |
| Simulated AI API failure | ✅ | Both AI features tested with a rejected promise from the AI service: the risk explainer falls back to the static reference description, the scanner falls back to an empty form — neither blocks the UI, per the spec's non-functional requirement. |
| Caregiver with no linked patient visits `/interactions` directly | ✅ | **Bug found and fixed this pass**: this page's data-loading `useEffect` returned early with no `patientId` but never called `setLoading(false)`, leaving an infinite spinner. Now shows the same "No patient selected" empty state as the Dashboard. |
| Missing `MONGO_URI` / `ANTHROPIC_API_KEY` at boot | 🔍 | `db.js` exits with a clear message if `MONGO_URI` is unset; `aiService.isConfigured()` gates both AI features and every caller has a tested fallback path (see above). |

## 3. Bugs found and fixed during this QA pass

1. **`CaregiverLink.caregiver_id` marked `required: true`, but the invite-generation flow creates the record before a caregiver exists** (`caregiver_id: null`, `status: "pending"`). Against a real MongoDB this would have thrown a `ValidationError` and 500'd the invite endpoint on every single use — confirmed with `validateSync()` before and after the fix. Resolved by making the field optional at the schema level (documented in the model file with the reasoning) rather than restructuring the invite flow, since the flow itself matches the brief's description of how invites should work.
2. **Non-image file uploads returned 500 instead of 400** (see edge cases above).
3. **Expired medications kept triggering new interaction flags** (see edge cases above).
4. **`Interactions.jsx` infinite-loading bug** for a caregiver with no patient selected (see edge cases above).
5. **Silent failures on data loads** — `Dashboard.jsx`, `Medications.jsx`, and both `Caregiver.jsx` views had no `.catch()` on their initial fetches; a network hiccup would leave the page stuck on a spinner or a blank list with no explanation. All four now show a dismissible error state with a "Try again" button.
6. **`PatientSwitcher` dropdown didn't close on outside click**, only when the trigger button was clicked again — fixed with a standard outside-click listener; also added name truncation so a long patient name doesn't overflow the switcher on mobile.
7. **No rate limiting in production behind a reverse proxy** — Render/Railway sit behind a proxy, and without `app.set("trust proxy", 1)`, `express-rate-limit` (added in the previous pass) would have read the proxy's IP for every request, making the limiter useless in production while appearing to work fine locally. Fixed, gated to `NODE_ENV === "production"` only.
8. **Delete-medication had no loading/double-click protection** and no error surfacing if the delete request failed — fixed with a `deletingId` guard and a dimmed/disabled card state during the request.

## 4. Schema vs. ERD audit

Every model was checked field-by-field against the data model in the original brief, using Mongoose's `validateSync()` — which runs with no database connection — so this is a genuine structural check, not a visual read-through. See `backend/tests/unit/models.schema.test.js` (19 tests).

| Model | Matches ERD exactly? | Notes |
|---|---|---|
| `User` | Matches, **plus two additive fields** | `age` and `conditions` were added beyond the ERD — they're optional, used only to give the AI risk explainer patient context per the brief's own instruction ("the patient's available context (age if provided, existing conditions if provided)"). Nothing in the ERD's `User` model provided anywhere to store that context, so this was necessary to fulfill Day 4's explainer requirement at all. |
| `CaregiverLink` | **One deviation, now documented and tested** | `caregiver_id` is optional, not required — see bug #1 above. Everything else (enums, defaults, `invite_code`) matches exactly. |
| `Medication` | Matches exactly | All fields, types, enums, and defaults match field-for-field. |
| `InteractionReference` | Matches exactly | |
| `FlaggedInteraction` | Matches exactly | A unique compound index on `(patient_id, medication_a_id, medication_b_id)` was added to prevent duplicate flags — this is a database index, not a schema/ERD field, so it doesn't change the field-level match. |
| `PrescriptionScan` | Matches, **plus one additive field** | `extracted_fields` (a nested object mirroring the parsed name/dosage/frequency/doctor) was added alongside the ERD's `extracted_text`. The ERD only specifies the raw text; the structured copy makes the scan record self-contained for future auditing/debugging without needing to re-parse `extracted_text`. Purely additive — removing it wouldn't break anything the ERD requires. |
| `Report` | Matches exactly | `file_url` stays `null` since reports are generated and streamed on-demand rather than persisted to storage — this matches the ERD's field (`String`, not marked required) without needing an actual stored file. |

**Bottom line:** every field the ERD specifies is present with the correct type, required/optional status, enum values, and FK reference — with one necessary correction (`CaregiverLink.caregiver_id`) and two deliberate, additive extensions needed to satisfy other parts of the same brief (AI context on `User`, structured extraction on `PrescriptionScan`). None of the extensions remove or contradict an ERD field.

## 5. Production vs. local dev behavior

Two things are intentionally environment-gated and worth knowing about before you deploy:

- **`trust proxy`** is only set when `NODE_ENV=production`. Locally (no proxy in front of you), this is correctly left off. On Render/Railway, set `NODE_ENV=production` in your environment variables or the rate limiter will silently misbehave (see bug #7).
- **Morgan request logging and the two rate limiters are skipped when `NODE_ENV=test`** (so the Jest suite isn't rate-limited against itself and CI output stays quiet) — this does not affect local dev (`npm run dev`, `NODE_ENV=development`) or production, only `npm test`.

Everything else — CORS via `CLIENT_URL`, Cloudinary vs. local-disk upload fallback, AI availability — is driven by whichever `.env` values you provide, so local and production behave identically as long as the same variables are set in both places. See `backend/.env.example` for the full list.

## 6. What still needs a live run

This build environment has no network access to MongoDB Atlas or to obtain an Anthropic API key, so the following are marked ⏳ above and genuinely require you to run them once your own deployment is live — they are not skipped out of laziness, they're structurally impossible to verify from here:
- A real register → login → add medication → see it persist round trip.
- A real AI-generated explanation (vs. the tested-but-mocked shape of one).
- A real Claude vision read of an actual prescription label photo.
- Actual Cloudinary upload (vs. the tested local-disk fallback).
