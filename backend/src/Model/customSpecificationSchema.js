const mongoose = require("mongoose");

// What a customer asks for when ordering a custom silver product.
// Shared by cart items and orders.
const customSpecificationSchema = new mongoose.Schema(
  {
    preferredWeight: { type: Number, min: 0 }, // tola, within product.weightRange
    size: {
      height: { type: Number, min: 0 },
      width: { type: Number, min: 0 },
      length: { type: Number, min: 0 },
      unit: { type: String, enum: ["inch", "cm"], default: "inch" },
    },
    design: { type: String, trim: true }, // one of product.customOptions.designOptions or free text
    designNotes: { type: String },
    referenceImages: [{ type: String }],
    requiredBy: { type: Date },
    estimatedCompletion: {
      earliest: { type: Date },
      latest: { type: Date },
    },
  },
  { _id: false }
);

module.exports = customSpecificationSchema;
