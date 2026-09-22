require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth.routes");
const medicationRoutes = require("./routes/medications.routes");
const interactionRoutes = require("./routes/interactions.routes");
const caregiverRoutes = require("./routes/caregiver.routes");
const reportRoutes = require("./routes/reports.routes");

const app = express();

// Render/Railway (and most PaaS hosts) sit behind a reverse proxy. Without
// this, express-rate-limit and anything else reading req.ip sees the proxy's
// IP for every request in production, silently breaking rate limiting -
// exactly the kind of "works locally, misbehaves in prod" gap this flags.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Security headers. crossOriginResourcePolicy is relaxed so locally-stored
// prescription images under /uploads can be fetched by the frontend's origin.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));
app.use(express.json({ limit: "10mb" }));
if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));

// Generous general limiter to blunt basic abuse/DoS on free-tier hosting.
// Skipped in tests so the suite isn't rate-limited against itself.
if (process.env.NODE_ENV !== "test") {
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));
}

const authLimiter =
  process.env.NODE_ENV === "test"
    ? (req, res, next) => next()
    : rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 20,
        standardHeaders: true,
        legacyHeaders: false,
        message: { message: "Too many attempts. Please try again in a few minutes." }
      });

// Serve locally-stored uploads (fallback path when Cloudinary isn't configured)
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "MedGuard AI API", time: new Date().toISOString() });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/medications", medicationRoutes);
app.use("/api/interactions", interactionRoutes);
app.use("/api/caregiver", caregiverRoutes);
app.use("/api/reports", reportRoutes);

// 404
app.use((req, res) => res.status(404).json({ message: "Not found" }));

// Global error handler. Multer surfaces oversized/malformed uploads as a
// MulterError with no .status set, which would otherwise fall through to a
// misleading 500 — these are client errors (400), not server errors.
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== "test") console.error(err);
  const status = err.status || (err.name === "MulterError" ? 400 : 500);
  res.status(status).json({ message: err.message || "Server error" });
});

module.exports = app;
