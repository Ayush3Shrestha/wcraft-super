const mongoose = require("mongoose");
const Announcement = require("../Model/announcementModel");
const SilverPrice = require("../Model/silverPriceModel");
const GoldPrice = require("../Model/goldPriceModel");

const RATE_MODELS = { silver_rate: SilverPrice, gold_rate: GoldPrice };
const RATE_LABELS = { silver_rate: "Silver today", gold_rate: "Gold today" };

// The bar's first contents. The rate rows can't be deleted, so they also mark
// that this has run: removing every text item won't bring the defaults back.
const DEFAULTS = [
  { type: "silver_rate", text: RATE_LABELS.silver_rate, isActive: true, sortOrder: 0 },
  { type: "text", text: "Custom silver pieces made to order", isActive: true, sortOrder: 1 },
  { type: "text", text: "Handcrafted in Patan, Lalitpur", isActive: true, sortOrder: 2 },
  { type: "gold_rate", text: RATE_LABELS.gold_rate, isActive: false, sortOrder: 3 },
];

async function ensureDefaultAnnouncements() {
  if (await Announcement.exists({ type: "silver_rate" })) return;
  await Announcement.insertMany(DEFAULTS);
  console.log("📣 Default announcements added");
}

const nextSortOrder = async () => {
  const last = await Announcement.findOne().sort({ sortOrder: -1 }).lean();
  return last ? last.sortOrder + 1 : 0;
};

const validationResponse = (res, error) =>
  res.status(400).json({
    message: "Announcement validation failed",
    errors: Object.fromEntries(Object.entries(error.errors || {}).map(([path, err]) => [path, err.message])),
  });

// What the shop shows, with rate items filled in. A rate that isn't available
// yet is left out rather than shown empty.
exports.getActive = async (req, res) => {
  try {
    const items = await Announcement.find({ isActive: true }, "type text").sort({ sortOrder: 1, createdAt: 1 }).lean();
    const types = [...new Set(items.map((i) => i.type).filter((t) => RATE_MODELS[t]))];
    const rates = {};
    await Promise.all(
      types.map(async (type) => {
        rates[type] = await RATE_MODELS[type].findOne().sort({ effectiveDate: -1 }).lean();
      })
    );
    const announcements = items
      .filter((item) => item.type === "text" || rates[item.type])
      .map((item) =>
        item.type === "text"
          ? item
          : { ...item, pricePerTola: rates[item.type].pricePerTola, dailyChange: rates[item.type].dailyChange }
      );
    res.status(200).json({ announcements });
  } catch (error) {
    console.error("Get announcements error:", error);
    res.status(500).json({ message: "Error fetching announcements", error: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ sortOrder: 1, createdAt: 1 }).lean();
    res.status(200).json({ announcements });
  } catch (error) {
    res.status(500).json({ message: "Error fetching announcements", error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const announcement = await Announcement.create({
      type: "text",
      text: req.body.text,
      isActive: req.body.isActive !== false,
      sortOrder: await nextSortOrder(),
    });
    res.status(201).json({ message: "Announcement added", announcement });
  } catch (error) {
    if (error.name === "ValidationError") return validationResponse(res, error);
    console.error("Create announcement error:", error);
    res.status(500).json({ message: "Error adding announcement", error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id).catch(() => null);
    if (!announcement) return res.status(404).json({ message: "Announcement not found" });

    if (req.body.text !== undefined) announcement.text = req.body.text;
    if (req.body.isActive !== undefined) announcement.isActive = req.body.isActive === true;
    await announcement.save();
    res.status(200).json({ message: "Announcement updated", announcement });
  } catch (error) {
    if (error.name === "ValidationError") return validationResponse(res, error);
    console.error("Update announcement error:", error);
    res.status(500).json({ message: "Error updating announcement", error: error.message });
  }
};

// `ids` is every announcement's id in its new order
exports.reorder = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.every((id) => mongoose.isValidObjectId(id))) {
      return res.status(400).json({ message: "ids must be a list of announcement ids" });
    }
    await Announcement.bulkWrite(
      ids.map((id, i) => ({ updateOne: { filter: { _id: id }, update: { $set: { sortOrder: i } } } }))
    );
    res.status(200).json({ message: "Order saved" });
  } catch (error) {
    console.error("Reorder announcements error:", error);
    res.status(500).json({ message: "Error saving the order", error: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id).catch(() => null);
    if (!announcement) return res.status(404).json({ message: "Announcement not found" });
    if (announcement.type !== "text") {
      return res.status(400).json({ message: "Live rates can't be deleted. Turn them off to hide them." });
    }
    await announcement.deleteOne();
    res.status(200).json({ message: "Announcement deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting announcement", error: error.message });
  }
};

exports.ensureDefaultAnnouncements = ensureDefaultAnnouncements;
