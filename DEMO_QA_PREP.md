# MedGuard AI — Anticipated Q&A

**A note on this document's limits:** I was not given your actual Proposal or BRD, so I
can't answer "prepare answers from the BRD/proposal" literally — I don't have that text.
What follows is inferred from the technical brief you gave me (problem statement, tech
stack, phases, non-functional requirements). Skim this against your real BRD and adjust
any answer that doesn't match language you actually used in your proposal.

---

### On the core concept

**Q: Why does this need AI at all? Couldn't you just check a static database?**
A: The interaction *detection* is a static database lookup — that part doesn't need AI
and runs even with zero AI configuration. AI does two things a static database can't:
turns a bare "severe / bleeding risk" flag into a plain-language explanation calibrated
to context (age, existing conditions), and reads a photographed label so patients don't
have to type in every medication by hand.

**Q: How do you make sure the AI doesn't give medical advice?**
A: Three layers: the system prompt sent to the model explicitly forbids directive
language ("stop taking," "this is unsafe for you") and requires hedged phrasing; every
piece of AI output is visibly labeled "AI-generated — not medical advice" in the UI and
in the PDF report; and the explanation is *always* anchored to an existing static
`InteractionReference` entry — the AI is explaining a flag a curated database already
raised, not independently diagnosing anything.

**Q: What happens if the AI is wrong or hallucinates?**
A: The underlying interaction flag itself never comes from AI — it's a deterministic
database match, so a hallucinated *explanation* can't cause a missed or false interaction
warning. Worst case, the AI's phrasing of an already-correct flag is imprecise, which is
why the static reference description is always available as a fallback/cross-check
alongside it, not replaced by it.

### On architecture

**Q: Why MERN specifically?**
A: It was the specified stack for this build. (If your BRD gives a different reason —
team familiarity, free-tier deployability, etc. — use that instead.)

**Q: Why MongoDB over a relational database, given all this data is pretty relational
(users, medications, interactions)?**
A: Fair challenge — this data *is* relational, and a Postgres schema would look almost
identical to the ERD in `ERD.md` with real foreign keys. MongoDB was specified in the
brief; the tradeoff is that referential integrity (e.g., a `FlaggedInteraction` pointing
at a deleted `Medication`) is enforced in application code rather than the database, which
is why `resolvePatientContext` and friends exist as middleware rather than relying on
database constraints.

**Q: How do you prevent a caregiver from accessing a patient they're not linked to?**
A: `resolvePatientContext` middleware runs on every medication/interaction/report route
and checks for an *active* `CaregiverLink` before anything else executes — tested
explicitly in `patientContext.middleware.test.js`, including the case where a caregiver
tries to pass an arbitrary `patientId` they're not linked to (403). The report endpoint
has an extra check confirming the URL's `:patientId` param can't be used to bypass this
(see `reports.controller.test.js`).

**Q: Is the API rate-limited / protected against abuse?**
A: Yes — Helmet for security headers, a general rate limiter (300 req/15min), and a
tighter one on `/api/auth/*` (20 req/15min) to slow down credential stuffing. `trust
proxy` is enabled in production so this works correctly behind Render/Railway's reverse
proxy (see `QA_AND_SCHEMA_AUDIT.md` section 5 for why that matters).

### On testing / quality

**Q: How did you test this without live grading infrastructure?**
A: 80 automated Jest tests across 11 suites, using mocked Mongoose models for anything
needing a database and `mongoose.validateSync()` (which runs with zero DB connection) for
schema validation. One suite is a real HTTP-level integration test via `supertest`
against the actual Express app. See `QA_AND_SCHEMA_AUDIT.md` for the full breakdown and
which specific bugs this process found and fixed.

**Q: What bugs did you actually find, not just claim to test?**
A: Five concrete ones, detailed in `QA_AND_SCHEMA_AUDIT.md` section 3 — most notably a
`CaregiverLink` schema field that would have thrown a real `ValidationError` on every
invite-code generation against a live database, and a Multer file-upload error that
returned 500 instead of 400. Both are pinned by regression tests now.

### On the data model

**Q: Does your implementation match your ERD exactly?**
A: See `QA_AND_SCHEMA_AUDIT.md` section 4 for a field-by-field audit. Every ERD field is
present with the correct type/required-status/enum/FK. Two additive fields exist beyond
the ERD (`User.age`/`conditions` for AI context, `PrescriptionScan.extracted_fields` for
structured storage) and one field's `required` constraint was loosened
(`CaregiverLink.caregiver_id`) because the literal ERD constraint conflicted with the
invite-before-redeem workflow described in the same brief — documented in the model file
itself, not silently changed.

### On what's not done / limitations

**Q: What would you build next if you had more time?**
Honest candidates: real-time interaction checking against a live drug database (RxNorm
API) instead of a curated 30-pair static set; push/email notifications when a new severe
interaction is flagged; a proper audit log for caregiver actions; automated tests running
against a real (not mocked) MongoDB instance in CI via `mongodb-memory-server`; expired-
medication auto-deactivation via a scheduled job instead of relying on the interaction
engine to just exclude them from new checks.

**Q: What are the known limitations of the interaction engine?**
It only catches interactions explicitly present in the 30-pair seed dataset — this is a
demo-scale curated set, not a comprehensive drug interaction database. A production
version would integrate a real pharmaceutical interaction API (e.g., RxNav/RxNorm from
the National Library of Medicine).
