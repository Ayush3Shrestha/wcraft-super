const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

// Saved files are served by app.js at /uploads/<filename>
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  // Random suffix so several images uploaded in the same millisecond
  // don't overwrite each other
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
  },
});

const ALLOWED = /^(image\/(jpeg|png|webp|gif))$/;

const fileFilter = (req, file, cb) => {
  if (ALLOWED.test(file.mimetype)) return cb(null, true);
  const error = new Error("Only JPG, PNG, WEBP or GIF images are allowed");
  error.status = 400;
  cb(error);
};

// Most images a product can have, counting ones it already has
const MAX_PRODUCT_IMAGES = 10;

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: MAX_PRODUCT_IMAGES },
});

// Turns a saved file into the path stored in the database
const toPublicPath = (file) => `/uploads/${file.filename}`;

// Delete files from this request, e.g. when saving the product failed
const removeUploadedFiles = (req) => {
  const files = [...(req.files || []), ...(req.file ? [req.file] : [])];
  files.forEach((f) => fs.unlink(f.path, () => {}));
};

// Delete images that were stored by this app (paths like /uploads/<file>).
// Anything else, such as an external URL, is left alone.
const removeStoredImages = (publicPaths = []) => {
  publicPaths.forEach((p) => {
    const match = /^\/uploads\/([^/\\]+)$/.exec(String(p));
    if (match) fs.unlink(path.join(UPLOAD_DIR, match[1]), () => {});
  });
};

// Wrap a multer handler so upload errors return 400 JSON instead of a 500
// HTML page, and so files from a rejected request don't stay on disk
const handle = (middleware) => (req, res, next) =>
  middleware(req, res, (err) => {
    res.on("finish", () => {
      if (res.statusCode >= 400) removeUploadedFiles(req);
    });
    if (!err) return next();
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Each image must be 5 MB or smaller"
        : err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE"
        ? `A product can have at most ${MAX_PRODUCT_IMAGES} images`
        : err.message;
    res.status(err.status || 400).json({ message });
  });

module.exports = {
  UPLOAD_DIR,
  MAX_PRODUCT_IMAGES,
  toPublicPath,
  removeUploadedFiles,
  removeStoredImages,
  productImages: handle(upload.array("images", MAX_PRODUCT_IMAGES)),
  categoryImage: handle(upload.single("image")),
};
