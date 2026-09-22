# MedGuard AI

A full-stack MERN app that lets patients and caregivers track every medication in one
place, automatically flags known drug interactions, explains the risk in plain language
with AI, and generates a doctor-visit-ready PDF report.

Two AI features are core to the product:
- **AI Prescription Label Scanner** — photograph a label, Claude's vision reads it, you confirm before saving.
- **AI Risk Explainer** — turns a bare severity flag into a plain-language explanation + questions for your doctor.

All AI content is clearly labeled **"AI-generated — not medical advice"** and uses hedged
language ("potential interaction," "discuss with your doctor") — never diagnostic or
directive language.

```
medguard-ai/
├── backend/     Node.js + Express + MongoDB (Mongoose) API
└── frontend/    React (Vite) + Tailwind CSS
```

---

## 1. Prerequisites

- **Node.js 18+** and npm — [nodejs.org](https://nodejs.org)
- A **MongoDB Atlas** free-tier cluster — [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas/register)
  (or a local MongoDB install if you prefer)
- An **Anthropic API key** for the two AI features — [console.anthropic.com](https://console.anthropic.com)
  (the app runs fine without one — see "Running without an AI key" below)
- Optional: a **Cloudinary** free account for storing scanned label photos in production
  — [cloudinary.com](https://cloudinary.com)

---

## 2. Local setup (step by step)

### 2.1 MongoDB Atlas (free tier)
1. Create a free cluster at MongoDB Atlas.
2. Under **Database Access**, create a database user with a username/password.
3. Under **Network Access**, add `0.0.0.0/0` (allow from anywhere) for local dev, or your
   specific IP for tighter security.
4. Click **Connect → Drivers** and copy the connection string. It looks like:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/medguard?retryWrites=true&w=majority`

### 2.2 Backend
```bash
cd backend
npm install
cp .env.example .env
```
Open `.env` and fill in:
- `MONGO_URI` — the connection string from step 2.1
- `JWT_SECRET` — any long random string (e.g. run `openssl rand -hex 32`)
- `ANTHROPIC_API_KEY` — your Claude API key (optional, see below)
- Cloudinary vars — optional for local dev (falls back to local disk storage)

Seed the interaction reference database (the ~30 known drug-interaction pairs the
interaction engine checks against):
```bash
npm run seed
```

Optional but recommended — seed realistic demo data (a patient, a linked caregiver, and
5 medications that trigger 2 interaction flags) so you have something to explore
immediately:
```bash
npm run seed:demo
```
This prints demo login credentials at the end:
```
Patient:   patient@demo.com   / Password123!
Caregiver: caregiver@demo.com / Password123!
```

Start the API:
```bash
npm run dev        # auto-restarts on file changes (nodemon)
# or: npm start
```
You should see `MongoDB connected` and `MedGuard AI API listening on port 5000`.
Verify it's alive: open `http://localhost:5000/api/health` in a browser.

### 2.3 Frontend
In a **second terminal**:
```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL already points at http://localhost:5000/api
npm run dev
```
Open the URL Vite prints (usually `http://localhost:5173`).

### 2.4 Log in
- Register a new account (choose "patient" or "caregiver"), **or**
- Use the demo credentials printed by `npm run seed:demo` above.

---

## 3. How to test each feature

1. **Auth & roles** — Register as a patient and as a caregiver (two accounts, two
   browsers/incognito windows). Confirm you can log in/out and that a caregiver sees a
   "no patient selected" state until linked.
2. **Add a medication** — As the patient, go to **Medications → Add medication**. Add
   `Warfarin, 5mg, Once daily`, then add `Aspirin, 81mg, Once daily`. After the second
   save you should see a toast that a new interaction was flagged.
3. **Interaction engine** — Go to **Interactions**. You should see a `Warfarin + Aspirin`
   card with a **Severe** badge. This is matched case-insensitively in either direction
   against the seeded `InteractionReference` collection — try adding `warfarin` (lowercase)
   and `ASPIRIN` (uppercase) as a second test.
4. **AI Risk Explainer** — Tap the interaction card to expand it. If `ANTHROPIC_API_KEY`
   is set, you'll see a generated explanation + 3-4 doctor questions after a short loading
   state, cached so it won't regenerate on next load. Without a key, you'll see the static
   reference description and a note that AI is unavailable — confirming graceful
   degradation.
5. **AI Prescription Scanner** — Go to **Scan a Label**, upload a photo of any pill
   bottle/prescription label (or any label-like image for a demo). With an API key set,
   fields pre-fill with a confidence indicator; without one, you're prompted to enter
   fields manually. Either way, nothing saves until you tap **Confirm & save**.
6. **Caregiver mode** — As the patient, go to **Caregivers → Generate invite code**. Copy
   the code. Log in as the caregiver, go to **Caregivers**, paste the code into
   **Link patient**. Switch back to the caregiver's dashboard and use the **patient
   switcher** in the top nav to view the patient's data. Confirm a `view`-permission
   caregiver cannot edit/delete medications (buttons are hidden, and the API also
   rejects it with 403 — try hitting the API directly to confirm server-side enforcement).
7. **Doctor-visit report** — Go to **Doctor Report → Download PDF report**. Open the PDF
   and confirm it lists current medications and active flagged interactions with their
   AI explanations/doctor questions and the "AI-generated — not medical advice" framing.
8. **Access control** — As a caregiver *not* linked to a given patient, try calling
   `GET /api/medications?patientId=<someone else's id>` directly (e.g. with `curl` or
   Postman, using the caregiver's JWT). You should get `403 Forbidden`.

### Quick API smoke test with curl
```bash
# Register
curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Patient","email":"t1@test.com","password":"Password123!","role":"patient"}'

# Copy the returned token, then:
TOKEN="paste-token-here"
curl -s http://localhost:5000/api/medications -H "Authorization: Bearer $TOKEN"
```

---

## 4. Running without an AI key (graceful degradation)

The app is fully functional with `ANTHROPIC_API_KEY` left blank:
- The **interaction engine** still runs (it's a static database lookup, not AI).
- The **risk explainer** falls back to the static `InteractionReference.description`.
- The **label scanner** returns empty fields and prompts manual entry.
- Nothing crashes or blocks the UI — this is a deliberate non-functional requirement.

To turn AI features on, add your key from console.anthropic.com to `backend/.env` and
restart the backend. Both AI features share the same key and use Claude's text and
vision capabilities respectively (model: `claude-sonnet-4-6`).

---

## 5. Deployment (free-tier friendly)

### Backend → Render or Railway
1. Push this repo to GitHub.
2. On Render: **New → Web Service**, connect the repo, set **Root Directory** to `backend`.
   - Build command: `npm install`
   - Start command: `npm start`
3. Add all the environment variables from `backend/.env.example` in the dashboard
   (use your real Atlas URI, JWT secret, Anthropic key, Cloudinary creds).
4. Also set `CLIENT_URL` to your deployed frontend URL (for CORS) and `PUBLIC_BACKEND_URL`
   to your Render URL (only needed if you're using local-disk upload fallback — **use
   Cloudinary in production**, since Render/Railway free-tier disks are ephemeral and any
   locally-stored scan images will be wiped on redeploy).
5. After first deploy, run the seed scripts once via Render's shell tab:
   `npm run seed && npm run seed:demo`

### Frontend → Vercel or Netlify
1. **New Project**, connect the repo, set **Root Directory** to `frontend`.
2. Build command: `npm run build`, output directory: `dist`.
3. Add environment variable `VITE_API_URL` = your deployed backend URL + `/api`
   (e.g. `https://medguard-api.onrender.com/api`).
4. Deploy. Update the backend's `CLIENT_URL` env var to match this frontend URL once you
   have it, and redeploy the backend so CORS allows it.

### MongoDB Atlas in production
Update **Network Access** to allow your hosting provider's IPs (or keep `0.0.0.0/0` for
simplicity on a free-tier demo — tighten it for anything real).

No paid-only dependencies are required anywhere in this stack.

---

## 6. Project structure reference

```
backend/
  server.js                    Express app entrypoint
  src/
    models/                    7 Mongoose schemas (User, CaregiverLink, Medication,
                                InteractionReference, FlaggedInteraction,
                                PrescriptionScan, Report)
    middleware/                JWT auth, patient-context/access-control, multer upload
    routes/ + controllers/     REST API (auth, medications, interactions, caregiver, reports)
    services/
      aiService.js              Claude text (explainer) + vision (scanner) calls
      interactionEngine.js      Case-insensitive A-B/B-A interaction matching
      storageService.js         Cloudinary upload w/ local-disk fallback
      pdfService.js             PDFKit doctor-visit report generator
    seed/                       interactions.json (30 curated pairs) + seed scripts

frontend/
  src/
    api/axios.js                Axios instance w/ JWT interceptor + 401 handling
    context/AuthContext.jsx     Auth state + caregiver "active patient" switching
    components/                 Navbar, Sidebar, MobileBottomNav, cards, badges,
                                 disclaimers, form primitives, modals, empty/loading states
    pages/                      Login, Register, Dashboard, Medications, Interactions,
                                 Scanner, Caregiver, Reports
```

## 7. Design system notes

Deep teal (`#0F6E56`) primary color, warm off-white background (not sterile hospital
white), 17px base font size for readability, WCAG-AA-conscious contrast, and every
severity badge pairs **color + icon + text** (never color alone) — see
`components/SeverityBadge.jsx`.

## 8. Automated tests

`backend/tests/` has a Jest suite (**55 tests across 9 suites**) covering the parts of the
business logic that don't require a live database, using mocked Mongoose models:

- **Interaction engine** — case-insensitive A-B/B-A matching, no-self-match, duplicate-key
  handling, no-match case, empty-medication-list short circuit.
- **AI Risk Explainer** (`interactions.controller`) — generates and correctly caches an
  explanation for **mild, moderate, and severe** interactions individually (parametrized
  test), serves the cached copy without a second AI call, force-refreshes on `?refresh=true`,
  and falls back to the static reference description both when no API key is set and when
  the AI call throws.
- **AI Label Scanner** (`medications.controller.scan`) — rejects a missing file (400),
  prompts manual entry when unconfigured, returns extracted fields at high confidence,
  returns a low (<40) confidence score untouched so the frontend's correction prompt fires,
  and degrades to manual entry (still 200, never a hard failure) when the vision call throws.
- **Caregiver flow** — invite generation (role check, default/explicit permission level,
  uppercase code), redemption (role check, missing code, invalid/used code, successful
  link + status flip, case-insensitive code lookup), patient listing, and revocation
  (including 404 for a link that isn't the requesting patient's).
- **Caregiver access control** — patients always resolve to their own data with no DB
  call; caregivers are rejected (400) with no `patientId`, rejected (403) with no active
  link, and correctly carry through `view`/`edit` permission otherwise; `requireEditPermission`
  blocks view-only caregivers from mutating routes.
- **PDF reports** — the `:patientId` route param is checked against the access-controlled
  `req.patientId` (403 on mismatch, closing a potential IDOR), and a real, valid PDF
  (`%PDF-` header) is produced both with data and in the empty state.
- **JWT auth middleware** — missing header, invalid/expired token, and deleted-user cases
  all return 401; a valid token attaches the user and calls `next()`.
- **AI service** — `isConfigured()` reflects the env var; `generateRiskExplanation`
  throws a clearly-coded error when no key is set, correctly parses a well-formed model
  response, and surfaces non-200 API errors.

Run them:
```bash
cd backend
npm install
npm test
```

These are unit tests against mocked models, not a replacement for the manual
end-to-end checklist above — run both.

## 9. Security hardening added

- **Helmet** for standard security headers.
- **Rate limiting** — a general 300-req/15-min limiter on the whole API, and a tighter
  20-req/15-min limiter specifically on `/api/auth/*` to slow down credential stuffing.
- The Express app itself now lives in `src/app.js` (routes/middleware only), separate
  from `server.js` (DB connection + `listen()`), so it can be imported directly in tests
  without opening a real database connection.

## 10. What was verified before this was handed to you

- Every backend module (`routes`, `controllers`, `services`, `middleware`, `app.js`) was
  `require()`-loaded successfully with no syntax or import errors.
- The full Jest suite (**55 tests, 9 suites**, listed above) passes.
- The PDF report service was run in isolation and produced a valid PDF.
- `npm run build` for the frontend completed successfully with no bundler/import errors.
- A live end-to-end run (real MongoDB Atlas + real Anthropic API key) could not be
  executed in this environment because it has no network access to MongoDB or to sign up
  for API keys — please run through the "How to test each feature" checklist in section 3
  after you connect your own Atlas cluster and (optionally) an Anthropic key.

## 11. Demo data covers all three severities

`npm run seed:demo` now seeds medications that produce **one mild, one moderate, and two
severe** flagged interactions (Levothyroxine+Calcium Carbonate / Lisinopril+Potassium
Chloride / Warfarin+Aspirin / Simvastatin+Clarithromycin), plus one medication (Metformin)
with no known interaction for contrast — so you can exercise the AI Risk Explainer across
every severity level immediately after seeding, without adding medications by hand.

## 12. Prescription scanner: confidence handling

The scan flow now does more than just show a progress bar:
- **Confidence < 40** shows an explicit amber warning telling the person exactly which
  kind of field to double-check (dosage/frequency), and empty fields at low confidence
  get a visible border highlight.
- **AI unavailable/failed** shows a warning that all fields are blank and need to be
  filled in manually — this is distinct from the low-confidence case.
- **Manual entry is always one tap away** — before scanning ("Or enter details manually"),
  and immediately after any scan failure ("Enter medication details manually instead") —
  so the spec's "manual entry works even if the scanner is down" requirement is a visible
  UI path, not just a backend fallback the person has to discover on their own.

## 13. Documentation set

This project includes five documents beyond this README, produced during the Day 7-9
polish/QA/demo-prep pass:

| Document | What it's for |
|---|---|
| `QA_AND_SCHEMA_AUDIT.md` | Full end-to-end flow checklist, edge-case coverage, every bug found and fixed during QA, and a field-by-field schema-vs-ERD audit. |
| `ERD.md` | Entity-relationship diagram (Mermaid) generated directly from the implemented Mongoose schemas — not hand-drawn separately, so it can't drift from the code. |
| `DEPLOYMENT_CHECKLIST.md` | Every environment variable, how to verify each one is actually working, and a 5-minute smoke test to run right before presenting. |
| `DEMO_SCRIPT.md` | A timed 2-3 minute live demo script. |
| `DEMO_QA_PREP.md` | Anticipated Q&A — inferred from this technical brief since I wasn't given your actual Proposal/BRD; check it against your real ones and adjust anything that doesn't match. |

I was not given your original Proposal, BRD, or a separately-authored ERD document, so I
could not literally "bundle" them for submission — `ERD.md` is a diagram I generated from
the real schema as a substitute, but your actual Proposal and BRD documents (if they
exist as separate files) still need to be gathered by you for submission.

## 14. Known limitations

- **The interaction database is a curated 30-pair demo set**, not a comprehensive
  pharmaceutical database. A medication pair not in `backend/src/seed/interactions.json`
  will never be flagged, even if a real interaction exists. Production would need a real
  interaction API (e.g., RxNav/RxNorm).
- **No automated tests run against a real MongoDB instance** — the Jest suite uses mocked
  models and schema-only validation (`validateSync()`), which catches a large class of
  bugs (see `QA_AND_SCHEMA_AUDIT.md`) but not, for example, actual index behavior or
  query performance under load. Adding `mongodb-memory-server` to CI would close this gap.
- **No live deployment, demo recording, or rehearsed walkthrough exists** — this
  environment has no network access to MongoDB Atlas, no way to obtain a real Anthropic
  API key, and no browser to record a screen capture. `DEPLOYMENT_CHECKLIST.md` and
  `DEMO_SCRIPT.md` are built to make doing all three yourself as fast as possible, but
  they are inputs to that work, not a substitute for it.
- **No caregiver audit log** — a caregiver's edit history (what they changed, when) isn't
  tracked beyond the underlying data's own timestamps.
- **Expired medications are excluded from new interaction checks but not auto-deactivated**
  — the medication's `status` field stays "active" until the patient/caregiver manually
  changes it; only the interaction engine treats a past `end_date` as effectively
  inactive. A scheduled job would be the production-grade fix.
