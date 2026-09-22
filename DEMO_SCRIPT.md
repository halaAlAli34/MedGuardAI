# MedGuard AI — Live Demo Script (2–3 minutes)

Run the smoke test in `DEPLOYMENT_CHECKLIST.md` right before this. Log in as
`patient@demo.com` in an incognito window beforehand so the demo starts from a clean,
logged-out state you control.

---

**[0:00–0:20] The problem (say this while the login screen is visible)**

> "Patients who see multiple doctors often end up on medications that interact
> dangerously — because no single doctor sees the full list. MedGuard AI lets patients
> and caregivers log every medication in one place, automatically checks for known
> interactions, and explains the risk in plain language before their next appointment."

Log in as the demo patient.

**[0:20–0:50] Dashboard + the interaction flag (core value prop)**

> "Here's Jordan's dashboard — five medications on file, and MedGuard already caught a
> severe interaction between Warfarin and Aspirin."

Point at the severity badge (color + icon + text — mention this is deliberate for
accessibility). Click the flag to expand it.

> "This explanation is AI-generated — you can see it's clearly labeled, and it never
> tells Jordan to stop taking anything. It explains the risk and gives him specific
> questions to bring to his doctor instead."

**[0:50–1:20] The scanner (second AI feature)**

Navigate to **Scan a Label**.

> "The other AI feature: instead of typing in every medication by hand, Jordan can just
> photograph the label."

Upload a sample label photo.

> "It reads the name, dosage, and frequency, shows a confidence score, and pre-fills the
> form — but nothing saves until Jordan confirms it himself. If the AI is ever
> unavailable, this degrades to a manual entry form instead of blocking him."

**[1:20–1:50] Caregiver mode**

Log out, log in as the demo caregiver.

> "Jordan's daughter Riley is linked as a caregiver with edit access. She sees the exact
> same dashboard, switches between any patients she's linked to from this switcher up
> top, and every single request she makes is checked server-side against an active link
> — not just hidden in the UI."

**[1:50–2:20] The report (the actual deliverable patients walk away with)**

Go to **Doctor Report**, click download, open the PDF.

> "And this is what it's all for — a doctor-visit-ready PDF with the full medication
> list, every active flag, and the AI explanations, ready to print or hand over at the
> next appointment."

**[2:20–2:40] Close**

> "Two AI features doing real work, not decoration — an interaction engine that runs on
> every medication add, and role-based access control enforced on the backend, not just
> hidden in the UI. Happy to answer questions."

---

## Timing notes
- Total: ~2:40, leaves 20 seconds of buffer inside a 3-minute slot.
- The riskiest step to cut if you're running long: the caregiver section (1:20–1:50) —
  you can mention it verbally instead of demoing it live and still hit every core
  feature (interaction engine, AI explainer, AI scanner, PDF report).
- Have a second browser tab open to the PDF already downloaded once beforehand, in case
  the live download is slow on stage.
