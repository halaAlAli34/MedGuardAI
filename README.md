# MedGuard AI

A full-stack MERN app that lets patients and caregivers track every medication in one place, automatically flags known drug interactions, explains the risk in plain language with AI, and generates a doctor-visit-ready PDF report.

Two AI features are core to the product:

- **AI Prescription Label Scanner** — photograph a label, Gemini's vision reads it, you confirm before saving.
- **AI Risk Explainer** — turns a bare severity flag into a plain-language explanation + questions for your doctor.

All AI content is clearly labeled "AI-generated — not medical advice" and uses hedged language ("potential interaction," "discuss with your doctor") — never diagnostic or directive language.

```
medguard-ai/
├── backend/     Node.js + Express + MongoDB (Mongoose) API
└── frontend/    React (Vite) + Tailwind CSS
```

## 1. Prerequisites

- Node.js 18+ and npm — [nodejs.org](https://nodejs.org)
- A MongoDB Atlas free-tier cluster — [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas) (or a local MongoDB install)
- A Google AI (Gemini) API key for the two AI features — [aistudio.google.com](https://aistudio.google.com) (the app runs fine without one — see [Section 4](#4-running-without-an-ai-key-graceful-degradation))
- Optional: a Cloudinary free account for storing scanned label photos in production — [cloudinary.com](https://cloudinary.com)

## 2. Local setup

### 2.1 MongoDB Atlas (free tier)

1. Create a free cluster at MongoDB Atlas.
2. Under **Database Access**, create a database user with a username/password.
3. Under **Network Access**, add `0.0.0.0/0` (allow from anywhere) for local dev, or your specific IP for tighter security.
4. Click **Connect → Drivers** and copy the connection string. It looks like:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/medguard?retryWrites=true&w=majority`

### 2.2 Backend

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and fill in:

| Variable | Notes |
|---|---|
| `MONGO_URI` | the connection string from 2.1 |
| `JWT_SECRET` | any long random string (e.g. `openssl rand -hex 32`) |
| `GEMINI_API_KEY` | your Google AI (Gemini) API key (optional, see Section 4) |
| Cloudinary vars | optional for local dev — falls back to local disk storage |

Seed the interaction reference database (~30 known drug-interaction pairs the interaction engine checks against):

```bash
npm run seed
```

Optional but recommended — seed realistic demo data (a patient, a linked caregiver, and 5 medications that trigger 2 interaction flags):

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
npm run dev     # auto-restarts on file changes (nodemon)
# or: npm start
```

You should see `MongoDB connected` and `MedGuard AI API listening on port 5000`. Verify it's alive at `http://localhost:5000/api/health`.

### 2.3 Frontend

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL already points at http://localhost:5000/api
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

### 2.4 Log in

- Register a new account (choose "patient" or "caregiver"), or
- Use the demo credentials printed by `npm run seed:demo` above.

## 3. How to test each feature

- **Auth & roles** — Register as a patient and as a caregiver (two accounts, two browsers/incognito windows). Confirm you can log in/out and that a caregiver sees a "no patient selected" state until linked.
- **Add a medication** — As the patient, go to Medications → Add medication. Add Warfarin 5mg once daily, then Aspirin 81mg once daily. After the second save you should see a toast that a new interaction was flagged.
- **Interaction engine** — Go to Interactions. You should see a Warfarin + Aspirin card with a Severe badge. Matching is case-insensitive in either direction — try `warfarin` (lowercase) and `ASPIRIN` (uppercase) as a second test.
- **AI Risk Explainer** — Tap the interaction card to expand it. With `GEMINI_API_KEY` set, you'll see a generated explanation + 3–4 doctor questions after a short loading state, cached so it won't regenerate on next load. Without a key, you'll see the static reference description and a note that AI is unavailable.
- **AI Prescription Scanner** — Go to Scan a Label, upload a photo of any pill bottle/prescription label. With an API key set, fields pre-fill with a confidence indicator; without one, you're prompted to enter fields manually. Either way, nothing saves until you tap Confirm & save.
- **Caregiver mode** — As the patient, go to Caregivers → Generate invite code. Log in as the caregiver, go to Caregivers, paste the code into Link patient. Switch to the caregiver's dashboard and use the patient switcher to view the patient's data. Confirm a view-permission caregiver cannot edit/delete medications (buttons hidden, and the API rejects edits with 403).
- **Doctor-visit report** — Go to Doctor Report → Download PDF report. Confirm it lists current medications and active flagged interactions with their AI explanations/doctor questions and the "AI-generated — not medical advice" framing.
- **Access control** — As a caregiver not linked to a given patient, try `GET /api/medications?patientId=<someone else's id>` directly (curl/Postman, using the caregiver's JWT). You should get `403 Forbidden`.

**Quick API smoke test:**

```bash
curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Patient","email":"t1@test.com","password":"Password123!","role":"patient"}'

TOKEN="paste-token-here"
curl -s http://localhost:5000/api/medications -H "Authorization: Bearer $TOKEN"
```

## 4. Running without an AI key (graceful degradation)

The app is fully functional with `GEMINI_API_KEY` left blank:

- The interaction engine still runs (it's a static database lookup, not AI).
- The risk explainer falls back to the static `InteractionReference.description`.
- The label scanner returns empty fields and prompts manual entry.
- Nothing crashes or blocks the UI.

To turn AI features on, add your key from aistudio.google.com to `backend/.env` and restart the backend. Both features call the Gemini Flash model by default, with an automatic fallback to a second Gemini model if the primary call fails.

## 5. Deployment (free-tier friendly)

### Backend → Render or Railway

1. Push this repo to GitHub.
2. On Render: New → Web Service, connect the repo, set Root Directory to `backend`.
3. Build command: `npm install`. Start command: `npm start`.
4. Add all environment variables from `backend/.env.example` (real Atlas URI, JWT secret, Gemini key, Cloudinary creds).
5. Set `CLIENT_URL` to your deployed frontend URL (CORS) and `PUBLIC_BACKEND_URL` to your Render URL (only needed for local-disk upload fallback — use Cloudinary in production, since Render/Railway free-tier disks are ephemeral).
6. After first deploy, run the seed scripts once via the platform's shell tab: `npm run seed && npm run seed:demo`.

### Frontend → Vercel or Netlify

1. New Project, connect the repo, set Root Directory to `frontend`.
2. Build command: `npm run build`, output directory: `dist`.
3. Add environment variable `VITE_API_URL` = your deployed backend URL + `/api`.
4. Deploy, then update the backend's `CLIENT_URL` to match and redeploy the backend so CORS allows it.

### MongoDB Atlas in production

Update Network Access to allow your hosting provider's IPs (or keep `0.0.0.0/0` for a free-tier demo — tighten for production).

No paid-only dependencies are required anywhere in this stack.

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
      aiService.js              Gemini text (explainer) + vision (scanner) calls, with automatic fallback model
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

Deep teal (`#0F6E56`) primary color, warm off-white background, 17px base font size for readability, WCAG-AA-conscious contrast, and every severity badge pairs color + icon + text (never color alone) — see `components/SeverityBadge.jsx`.

## 8. Automated tests

`backend/tests/` has a Jest suite (55 tests across 9 suites) covering business logic with mocked Mongoose models — no live database required:

- Interaction engine (case-insensitive matching, no-self-match, duplicate-key handling, no-match case)
- AI Risk Explainer (caching, force-refresh, graceful fallback when no key or on API failure)
- AI Label Scanner (missing file, low-confidence handling, degrade-to-manual on failure)
- Caregiver flow (invite generation/redemption, listing, revocation)
- Caregiver access control (patient/caregiver permission boundaries, IDOR checks)
- PDF report generation (patientId access check, valid PDF output)
- JWT auth middleware
- AI service configuration and error handling

Run them:

```bash
cd backend
npm install
npm test
```

These are unit tests against mocked models — a complement to the manual checklist in Section 3, not a replacement for it.

## 9. Security hardening

- Helmet for standard security headers.
- Rate limiting: 300 req/15 min globally, 20 req/15 min on `/api/auth/*` to slow credential stuffing.
- The Express app lives in `src/app.js` (routes/middleware only), separate from `server.js` (DB connection + `listen()`), so it can be imported directly in tests without opening a real database connection.

## 10. Demo data

`npm run seed:demo` seeds medications producing one mild, one moderate, and two severe flagged interactions (Levothyroxine+Calcium Carbonate / Lisinopril+Potassium Chloride / Warfarin+Aspirin / Simvastatin+Clarithromycin), plus one medication (Metformin) with no known interaction for contrast — so you can exercise the AI Risk Explainer across every severity level immediately after seeding.

## 11. Prescription scanner: confidence handling

- Confidence < 40 shows an explicit warning identifying which fields to double-check, with a visible border highlight on empty low-confidence fields.
- AI unavailable/failed shows a distinct warning that all fields are blank and need manual entry.
- Manual entry is always one tap away — before scanning and immediately after any scan failure.

## 12. Documentation

- **[ERD.md](./ERD.md)** — Entity-relationship diagram (Mermaid) generated directly from the implemented Mongoose schemas, so it can't drift from the code.

## 13. Known limitations

- The interaction database is a curated 30-pair demo set, not a comprehensive pharmaceutical database. A pair not in `backend/src/seed/interactions.json` will never be flagged even if a real interaction exists. Production would need a real interaction API (e.g., RxNav/RxNorm).
- The Jest suite uses mocked models and schema-only validation — it doesn't cover real index behavior or query performance under load. Adding `mongodb-memory-server` to CI would close this gap.
- No caregiver audit log — a caregiver's edit history isn't tracked beyond the underlying data's own timestamps.
- Expired medications are excluded from new interaction checks but not auto-deactivated — the medication's `status` field stays `"active"` until manually changed; only the interaction engine treats a past `end_date` as effectively inactive. A scheduled job would be the production-grade fix.
