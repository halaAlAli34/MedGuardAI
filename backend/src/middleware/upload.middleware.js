const multer = require("multer");

// In-memory storage — files are streamed straight to Cloudinary (or written to
// local disk as a fallback) in the controller, never persisted in MongoDB.
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      const err = new Error("Only image uploads are allowed");
      err.status = 400; // without this the global error handler defaults to 500
      return cb(err);
    }
    cb(null, true);
  }
});

module.exports = upload;
