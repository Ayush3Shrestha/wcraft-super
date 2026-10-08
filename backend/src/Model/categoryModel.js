const mongoose = require("mongoose");
const {
  MATERIAL_TYPES,
  PRODUCT_TYPE_BY_MATERIAL,
  getProductSchemaSpec,
} = require("../Config/productTypes");

// Counter schema for category IDs
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  sequence_value: { type: Number, default: 99 } // start from 100
});

const Counter = mongoose.model("Counter", counterSchema);

const categorySchema = new mongoose.Schema(
  {
    categoryId: {
      type: Number,
      unique: true,
      required: true,
    },
    name: { type: String, required: true, unique: true },
    description: String,
    imageUrl: String,

    // Decides which product schema products in this category use:
    // silver -> SilverProduct, gold -> GoldProduct, copper/bronze -> MetalProduct
    materialType: {
      type: String,
      enum: MATERIAL_TYPES,
      required: true,
      lowercase: true,
      trim: true,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

categorySchema.virtual("productType").get(function () {
  return PRODUCT_TYPE_BY_MATERIAL[this.materialType];
});

categorySchema.methods.getProductSchemaSpec = function () {
  return getProductSchemaSpec(this.materialType);
};

// Generate incremental numeric categoryId. Runs before validation, because
// categoryId is required and validation happens before "save" hooks.
categorySchema.pre("validate", async function (next) {
  if (this.isNew && !this.categoryId) {
    try {
      const counter = await Counter.findByIdAndUpdate(
        "categoryId",
        { $inc: { sequence_value: 1 } },
        { new: true, upsert: true }
      );
      this.categoryId = counter.sequence_value; // numeric ID like 100, 101, etc.
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Find by custom numeric ID
categorySchema.statics.findByCategoryId = function (categoryId) {
  return this.findOne({ categoryId });
};

module.exports = mongoose.model("Category", categorySchema);
