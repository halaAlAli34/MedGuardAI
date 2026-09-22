/**
 * storageService.js
 *
 * Handles storing uploaded prescription label photos. Uses Cloudinary's free
 * tier if credentials are present (recommended, since Render/Railway free
 * tiers have ephemeral disks). Falls back to local disk under /uploads for
 * local development so the app works with zero third-party signup.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function cloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

async function uploadImage(buffer, originalName) {
  if (cloudinaryConfigured()) {
    return uploadToCloudinary(buffer, originalName);
  }
  return uploadToLocalDisk(buffer, originalName);
}

async function uploadToCloudinary(buffer, originalName) {
  // Lazy-require so the dependency is optional at install time.
  const cloudinary = require("cloudinary").v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "medguard-ai/prescription-scans" },
      (err, result) => {
        if (err) return reject(err);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

async function uploadToLocalDisk(buffer, originalName) {
  const uploadsDir = path.join(__dirname, "..", "..", "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const ext = path.extname(originalName || "") || ".jpg";
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
  fs.writeFileSync(path.join(uploadsDir, filename), buffer);

  const port = process.env.PORT || 5000;
  const base = process.env.PUBLIC_BACKEND_URL || `http://localhost:${port}`;
  return `${base}/uploads/${filename}`;
}

module.exports = { uploadImage, cloudinaryConfigured };
