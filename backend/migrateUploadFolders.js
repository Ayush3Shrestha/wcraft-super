// Moves images saved directly in uploads/ into the folder for their kind
// (uploads/products, uploads/categories, ...) and updates the database paths.
//
//   node migrateUploadFolders.js           shows what would change, changes nothing
//   node migrateUploadFolders.js --apply   does it
//
// Safe to run again: only paths still directly in uploads/ are touched. Images
// nothing in the database uses are listed and left where they are.
require("dns").setServers(["8.8.8.8", "1.1.1.1"]);
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const UPLOAD_DIR = path.join(__dirname, "uploads");
const APPLY = process.argv.includes("--apply");
const isFlat = (p) => /^\/uploads\/[^/\\]+$/.test(p);
const isStored = (p) => typeof p === "string" && p.startsWith("/uploads/");
const onDisk = (p) => path.join(UPLOAD_DIR, ...p.split("/").slice(2));

// Where each collection keeps its image paths, and how to rewrite them
const SOURCES = [
  {
    collection: "products",
    folder: "products",
    paths: (d) => d.images || [],
    update: (d, to) => ({ images: (d.images || []).map(to) }),
  },
  {
    collection: "categories",
    folder: "categories",
    paths: (d) => [d.imageUrl],
    update: (d, to) => ({ imageUrl: to(d.imageUrl) }),
  },
  {
    collection: "blogs",
    folder: "blogs",
    paths: (d) => [d.coverImage, d.previewImage, ...(d.blocks || []).map((b) => b.image)],
    update: (d, to) => ({
      ...(d.coverImage ? { coverImage: to(d.coverImage) } : {}),
      ...(d.previewImage ? { previewImage: to(d.previewImage) } : {}),
      blocks: (d.blocks || []).map((b) => (b.image ? { ...b, image: to(b.image) } : b)),
    }),
  },
  {
    collection: "testimonials",
    folder: "testimonials",
    paths: (d) => [d.photo],
    update: (d, to) => ({ photo: to(d.photo) }),
  },
];

(async () => {
  await mongoose.connect(process.env.mongo_uri, { serverSelectionTimeoutMS: 8000 });
  const db = mongoose.connection.db;

  const moves = new Map(); // one entry per file and destination folder
  const missing = new Set();
  const referenced = new Set();
  const updates = [];

  for (const source of SOURCES) {
    const docs = await db.collection(source.collection).find({}).toArray();
    for (const doc of docs) {
      const stored = source.paths(doc).filter(isStored);
      stored.forEach((p) => referenced.add(p));
      stored.filter((p) => !fs.existsSync(onDisk(p))).forEach((p) => missing.add(`${source.collection}: ${p}`));

      // A path whose file is gone stays as it is, so the record isn't changed for nothing
      const movable = stored.filter((p) => isFlat(p) && fs.existsSync(onDisk(p)));
      if (!movable.length) continue;
      const to = (p) => (movable.includes(p) ? `/uploads/${source.folder}/${path.basename(p)}` : p);
      movable.forEach((p) => moves.set(`${p}|${source.folder}`, { from: p, to: to(p) }));
      updates.push({ collection: source.collection, _id: doc._id, set: source.update(doc, to) });
    }
  }

  const unused = fs
    .readdirSync(UPLOAD_DIR, { withFileTypes: true })
    .filter((f) => f.isFile() && !referenced.has(`/uploads/${f.name}`))
    .map((f) => f.name);

  const perFolder = {};
  moves.forEach(({ to }) => {
    const folder = to.split("/")[2];
    perFolder[folder] = (perFolder[folder] || 0) + 1;
  });
  console.log(APPLY ? "APPLYING" : "DRY RUN, nothing will change. Add --apply to do it.");
  console.log("Files to move:", moves.size, perFolder);
  console.log("Database records to update:", updates.length);
  console.log(`Not used by anything, left in place (${unused.length}):`, unused);
  console.log(`In the database but the file is missing (${missing.size}):`, [...missing]);

  if (APPLY && moves.size) {
    // Copy first and delete last: if this stops partway the old paths still work
    for (const { from, to } of moves.values()) {
      fs.mkdirSync(path.dirname(onDisk(to)), { recursive: true });
      fs.copyFileSync(onDisk(from), onDisk(to));
    }
    const record = path.join(__dirname, `uploads-migration-${Date.now()}.json`);
    fs.writeFileSync(record, JSON.stringify([...moves.values()], null, 2));
    for (const { collection, _id, set } of updates) {
      await db.collection(collection).updateOne({ _id }, { $set: set });
    }
    new Set([...moves.values()].map((m) => m.from)).forEach((from) => fs.unlinkSync(onDisk(from)));
    console.log("Done. Old and new paths are recorded in", path.basename(record));
  }

  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
