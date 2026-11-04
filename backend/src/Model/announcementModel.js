const mongoose = require("mongoose");

// One item in the scrolling bar above the navbar: the admin's own text, or
// today's silver / gold rate, where `text` is the label before the rate.
const ANNOUNCEMENT_TYPES = ["text", "silver_rate", "gold_rate"];

const announcementSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ANNOUNCEMENT_TYPES, default: "text" },
    text: { type: String, required: true, trim: true, maxlength: 120 },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Announcement", announcementSchema);
