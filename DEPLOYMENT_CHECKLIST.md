# MedGuard AI — Final Deployment Checklist

Run through this immediately before your demo. Each item tells you exactly how to verify it.

## 1. Environment variables — backend (Render/Railway dashboard)

| Variable | Required? | How to verify it's correct |
|---|---|---|
| `MONGO_URI` | Yes | Hit `https://<your-backend>/api/health` — if it loads, the process started, which means `connectDB()` succeeded (the app exits on failure, see `src/utils/db.js`). |
| `JWT_SECRET` | Yes | Log in on the deployed frontend; if you get a token back and stay logged in after a refresh, it's working. |
| `ANTHROPIC_API_KEY` | No, but needed for the demo | Expand any flagged interaction card — you should see a generated explanation, not the static fallback text, and no "AI is currently unavailable" message. |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | No, but strongly recommended in production | Scan a label; if the image preview still loads after a redeploy, Cloudinary is working. If you skip this, uploaded images vanish on every redeploy (ephemeral disk) — fine for a demo, not for anything real. |
| `CLIENT_URL` | Yes | Set to your exact deployed frontend URL (no trailing slash). If it's wrong, every API request from the frontend will fail with a CORS error visible in the browser console. |
| `NODE_ENV` | Yes, set to `production` | Confirms `trust proxy` is enabled (see `QA_AND_SCHEMA_AUDIT.md` section 5) — without this, rate limiting silently misbehaves behind Render/Railway's proxy. |
| `PORT` | Usually auto-set by the host | Don't override unless your host requires a specific value. |

## 2. Environment variables — frontend (Vercel/Netlify dashboard)

| Variable | Required? | How to verify it's correct |
|---|---|---|
| `VITE_API_URL` | Yes | Must be your backend URL + `/api` (e.g. `https://medguard-api.onrender.com/api`). Open the browser Network tab on the deployed site and confirm requests go there, not to `localhost`. |

## 3. Data readiness

- [ ] Run `npm run seed` against the production database at least once (30 interaction reference pairs — nothing works without this).
- [ ] Run `npm run seed:demo` so you have working demo logins (`patient@demo.com` / `caregiver@demo.com`, both `Password123!`) with medications that already trigger mild/moderate/severe flags — see `QA_AND_SCHEMA_AUDIT.md` for exactly which pairs.
- [ ] Open MongoDB Atlas → Browse Collections and visually confirm `InteractionReference` has 30 documents and `User`/`Medication`/`FlaggedInteraction` have the demo data.

## 4. Smoke test the live deployment (5 minutes, do this right before presenting)

1. Open the deployed frontend URL in an incognito window (rules out stale localStorage/cache issues).
2. Log in as `patient@demo.com`.
3. Confirm the dashboard shows medications and at least one severe flag.
4. Expand a flagged interaction — confirm the AI explanation loads (or, if no API key is set for the demo, confirm the static fallback text and disclaimer render correctly instead — either is a valid, working state).
5. Go to **Scan a Label**, upload any photo, confirm the form pre-fills or degrades to manual entry cleanly.
6. Download the PDF report, open it, confirm it's readable and includes the AI-generated content with the disclaimer.
7. Log out, log in as `caregiver@demo.com`, confirm the patient switcher shows Jordan Lee and the dashboard mirrors what the patient sees.

If any step fails, it's almost certainly one of the env vars above — check the Render/Vercel logs for the exact error before assuming it's a code bug.

## 5. What this sandbox could not do for you

I can't deploy this to Render/Vercel, record a screen-capture video, or rehearse a live demo from here — those require an actual browser session against a live URL, which this environment doesn't have. The deployment steps in `README.md` section 5 and the smoke test above are the fastest path to doing that yourself.
