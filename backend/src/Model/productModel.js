const mongoose = require("mongoose");
const {
  SILVER_LISTING_TYPES,
  GOLD_FINISHES,
  GOLD_PLATING_METHODS,
  BASE_METALS,
  DIMENSION_UNITS,
} = require("../Config/productTypes");

// Every product shares this base; the category's materialType decides which
// discriminator (SilverProduct / GoldProduct / MetalProduct) holds the rest.
// Documents store the discriminator value in `productType`.

const dimensionsSchema = new mongoose.Schema(
  {
    height: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    length: { type: Number, min: 0 },
    unit: { type: String, enum: DIMENSION_UNITS, default: "inch" },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    images: [{ type: String, required: true }],

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    dimensions: dimensionsSchema,

    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    discriminatorKey: "productType",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Kept for older clients that still read `isCustomizable`
productSchema.virtual("isCustomizable").get(function () {
  return this.productType === "silver" && this.silverType === "custom";
});

const Product = mongoose.model("Product", productSchema);

// ---------------------------------------------------------------------------
// Silver: stock items (fixed weight) or custom items (customer specifies)
// ---------------------------------------------------------------------------

const customOptionsSchema = new mongoose.Schema(
  {
    // Sizes the workshop can make for this design
    sizeRange: {
      minHeight: { type: Number, min: 0 },
      maxHeight: { type: Number, min: 0 },
      unit: { type: String, enum: DIMENSION_UNITS, default: "inch" },
    },
    // Predefined designs the customer can pick from
    designOptions: [{ type: String, trim: true }],
    // Whether the customer may describe their own design instead
    allowCustomDesign: { type: Boolean, default: true },
    // Estimated production time
    productionTime: {
      minDays: { type: Number, min: 0 },
      maxDays: { type: Number, min: 0 },
    },
  },
  { _id: false }
);

const silverProductSchema = new mongoose.Schema({
  silverType: { type: String, enum: SILVER_LISTING_TYPES, required: true },
  makingCost: { type: Number, min: 0, required: true },

  // stock
  weightInTola: { type: Number, min: 0 },
  stockQuantity: { type: Number, min: 0, default: 0 },

  // custom
  weightRange: {
    min: { type: Number, min: 0 },
    max: { type: Number, min: 0 },
  },
  customOptions: customOptionsSchema,
});

silverProductSchema.pre("validate", function (next) {
  if (this.silverType === "stock") {
    if (this.weightInTola == null) {
      this.invalidate("weightInTola", "weightInTola is required for stock silver products");
    }
    this.weightRange = undefined;
    this.customOptions = undefined;
  } else if (this.silverType === "custom") {
    const { min, max } = this.weightRange || {};
    if (min == null || max == null) {
      this.invalidate("weightRange", "weightRange.min and weightRange.max are required for custom silver products");
    } else if (min > max) {
      this.invalidate("weightRange", "weightRange.min cannot be greater than weightRange.max");
    }

    const time = this.customOptions?.productionTime || {};
    if (time.minDays == null || time.maxDays == null) {
      this.invalidate("customOptions.productionTime", "productionTime.minDays and maxDays are required for custom silver products");
    } else if (time.minDays > time.maxDays) {
      this.invalidate("customOptions.productionTime", "productionTime.minDays cannot be greater than maxDays");
    }

    const size = this.customOptions?.sizeRange || {};
    if (size.minHeight != null && size.maxHeight != null && size.minHeight > size.maxHeight) {
      this.invalidate("customOptions.sizeRange", "sizeRange.minHeight cannot be greater than maxHeight");
    }

    // Custom pieces are made to order, so there is no fixed weight or stock
    this.weightInTola = undefined;
    this.stockQuantity = undefined;
  }
  next();
});

// ---------------------------------------------------------------------------
// Gold: oxidized / color / half gold / full gold (electroplated or fire gold)
// ---------------------------------------------------------------------------

const goldProductSchema = new mongoose.Schema({
  constantPrice: { type: Number, min: 0, required: true },
  goldFinish: { type: String, enum: GOLD_FINISHES, required: true },
  platingMethod: { type: String, enum: GOLD_PLATING_METHODS },
  baseMetal: { type: String, enum: BASE_METALS },
  weightInKg: { type: Number, min: 0 },
  stockQuantity: { type: Number, min: 0, default: 0 },
});

goldProductSchema.pre("validate", function (next) {
  if (this.goldFinish === "full_gold") {
    if (!this.platingMethod) {
      this.invalidate("platingMethod", "platingMethod (electroplated or fire_gold_plated) is required for full gold products");
    }
  } else {
    // Plating method only applies to full gold
    this.platingMethod = undefined;
  }
  next();
});

// ---------------------------------------------------------------------------
// Copper / Bronze sculptures and statues
// ---------------------------------------------------------------------------

const metalProductSchema = new mongoose.Schema({
  // Copied from the category's materialType on create
  metal: { type: String, enum: ["copper", "bronze"], required: true },
  constantPrice: { type: Number, min: 0, required: true },
  weightInKg: { type: Number, min: 0 },
  finish: { type: String, trim: true },
  stockQuantity: { type: Number, min: 0, default: 0 },
});

const SilverProduct = Product.discriminator("SilverProduct", silverProductSchema, "silver");
const GoldProduct = Product.discriminator("GoldProduct", goldProductSchema, "gold");
const MetalProduct = Product.discriminator("MetalProduct", metalProductSchema, "metal");

const PRODUCT_MODELS = {
  silver: SilverProduct,
  gold: GoldProduct,
  metal: MetalProduct,
};

module.exports = Product;
module.exports.SilverProduct = SilverProduct;
module.exports.GoldProduct = GoldProduct;
module.exports.MetalProduct = MetalProduct;
module.exports.PRODUCT_MODELS = PRODUCT_MODELS;
