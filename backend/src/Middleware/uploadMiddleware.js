const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

// Saved files are served by app.js at /uploads/<folder>/<filename>
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");

// Each kind of image has its own folder, created here on startup
const storageIn = (folder) => {
  const destination = path.join(UPLOAD_DIR, folder);
  fs.mkdirSync(destination, { recursive: true });
  return multer.diskStorage({
    destination,
    // Random suffix so several images uploaded in the same millisecond
    // don't overwrite each other
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
    },
  });
};

const ALLOWED = /^(image\/(jpeg|png|webp|gif))$/;

const fileFilter = (req, file, cb) => {
  if (ALLOWED.test(file.mimetype)) return cb(null, true);
  const error = new Error("Only JPG, PNG, WEBP or GIF images are allowed");
  error.status = 400;
  cb(error);
};

// Most images a product can have, counting ones it already has
const MAX_PRODUCT_IMAGES = 10;

// Most new images one blog post save can upload (cover + content images)
const MAX_BLOG_UPLOADS = 20;

const ONE_IMAGE_ONLY = "Only one image can be uploaded here";

const uploaderFor = (folder, maxFiles) =>
  multer({
    storage: storageIn(folder),
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024, files: maxFiles },
  });

// Turns a saved file into the path stored in the database
const toPublicPath = (file) => `/uploads/${path.basename(file.destination)}/${file.filename}`;

// Delete files from this request, e.g. when saving the product failed
const removeUploadedFiles = (req) => {
  const files = [...(req.files || []), ...(req.file ? [req.file] : [])];
  // A rejected upload can leave an entry with no saved file, so no path
  files.forEach((f) => f.path && fs.unlink(f.path, () => {}));
};

// Delete images that were stored by this app: /uploads/<folder>/<file>, or
// /uploads/<file> for ones saved before folders existed. Anything else, such
// as an external URL, is left alone.
const removeStoredImages = (publicPaths = []) => {
  publicPaths.forEach((p) => {
    const match = /^\/uploads\/((?:[\w-]+\/)?[^/\\]+)$/.exec(String(p));
    if (!match) return;
    const file = path.join(UPLOAD_DIR, match[1]);
    if (file.startsWith(UPLOAD_DIR + path.sep)) fs.unlink(file, () => {});
  });
};

// Wrap a multer handler so upload errors return 400 JSON instead of a 500
// HTML page, and so files from a rejected request don't stay on disk
const handle = (middleware, tooMany) => (req, res, next) =>
  middleware(req, res, (err) => {
    res.on("finish", () => {
      if (res.statusCode >= 400) removeUploadedFiles(req);
    });
    if (!err) return next();
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Each image must be 5 MB or smaller"
        : err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE"
        ? tooMany
        : err.message;
    res.status(err.status || 400).json({ message });
  });

module.exports = {
  UPLOAD_DIR,
  MAX_PRODUCT_IMAGES,
  MAX_BLOG_UPLOADS,
  toPublicPath,
  removeUploadedFiles,
  removeStoredImages,
  productImages: handle(uploaderFor("products", MAX_PRODUCT_IMAGES).array("images", MAX_PRODUCT_IMAGES), `A product can have at most ${MAX_PRODUCT_IMAGES} images`),
  categoryImage: handle(uploaderFor("categories", 1).single("image"), ONE_IMAGE_ONLY),
  blogImages: handle(uploaderFor("blogs", MAX_BLOG_UPLOADS).array("images", MAX_BLOG_UPLOADS), `You can upload at most ${MAX_BLOG_UPLOADS} new images per save`),
  testimonialImage: handle(uploaderFor("testimonials", 1).single("image"), ONE_IMAGE_ONLY),
};
