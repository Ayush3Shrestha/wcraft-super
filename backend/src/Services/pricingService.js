const SilverPrice = require("../Model/silverPriceModel");

const DAY_MS = 24 * 60 * 60 * 1000;

// Latest scraped silver rate (NPR per tola), or null if none stored yet
async function getLatestSilverRate() {
  const latest = await SilverPrice.findOne().sort({ effectiveDate: -1 });
  return latest ? latest.pricePerTola : null;
}

const isSilver = (product) => product.productType === "silver";
const isCustomSilver = (product) => isSilver(product) && product.silverType === "custom";

const round = (value) => Math.round(value * 100) / 100;

const toNumber = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
};

/**
 * Validate and normalise what a customer entered for a custom silver product.
 * Returns { errors, specification }.
 */
function validateCustomSpecification(product, input = {}) {
  const errors = [];
  if (!isCustomSilver(product)) {
    return { errors, specification: undefined };
  }

  const spec = typeof input === "string" ? safeParse(input) : input || {};
  const { min, max } = product.weightRange || {};
  const options = product.customOptions || {};

  const preferredWeight = toNumber(spec.preferredWeight);
  if (preferredWeight === undefined) {
    errors.push("preferredWeight is required for custom silver products");
  } else if (Number.isNaN(preferredWeight)) {
    errors.push("preferredWeight must be a number");
  } else if (preferredWeight < min || preferredWeight > max) {
    errors.push(`preferredWeight must be between ${min} and ${max} tola`);
  }

  const size = spec.size || {};
  const height = toNumber(size.height);
  if (Number.isNaN(height)) {
    errors.push("size.height must be a number");
  } else if (height !== undefined && options.sizeRange) {
    const { minHeight, maxHeight } = options.sizeRange;
    if ((minHeight != null && height < minHeight) || (maxHeight != null && height > maxHeight)) {
      errors.push(`size.height must be between ${minHeight ?? 0} and ${maxHeight ?? "any"} ${options.sizeRange.unit || "inch"}`);
    }
  }

  const design = spec.design ? String(spec.design).trim() : undefined;
  const designOptions = options.designOptions || [];
  if (design && designOptions.length && !designOptions.includes(design) && options.allowCustomDesign === false) {
    errors.push(`design must be one of: ${designOptions.join(", ")}`);
  }
  if (!design && !spec.designNotes && options.allowCustomDesign === false && designOptions.length) {
    errors.push("design is required");
  }

  let requiredBy;
  if (spec.requiredBy) {
    requiredBy = new Date(spec.requiredBy);
    if (Number.isNaN(requiredBy.getTime())) {
      errors.push("requiredBy must be a valid date");
      requiredBy = undefined;
    }
  }

  const minDays = options.productionTime?.minDays;
  const maxDays = options.productionTime?.maxDays;
  const now = Date.now();
  const estimatedCompletion =
    minDays != null && maxDays != null
      ? { earliest: new Date(now + minDays * DAY_MS), latest: new Date(now + maxDays * DAY_MS) }
      : undefined;

  if (requiredBy && estimatedCompletion && requiredBy < estimatedCompletion.earliest) {
    errors.push(`requiredBy is earlier than the minimum production time of ${minDays} days`);
  }

  return {
    errors,
    specification: {
      preferredWeight,
      size: {
        height,
        width: toNumber(size.width),
        length: toNumber(size.length),
        unit: size.unit || options.sizeRange?.unit || "inch",
      },
      design,
      designNotes: spec.designNotes,
      referenceImages: Array.isArray(spec.referenceImages) ? spec.referenceImages : undefined,
      requiredBy,
      estimatedCompletion,
    },
  };
}

/**
 * Work out a product's price.
 *  - silver stock:  rate × weightInTola + makingCost
 *  - silver custom: rate × preferredWeight + makingCost (estimate), or a
 *                   min/max range across weightRange when no weight is given
 *  - gold / copper / bronze: constantPrice
 *
 * Returns { price, priceRange, silverRate, pricingType }.
 * `price` is null when it cannot be determined (e.g. no silver rate yet).
 */
async function calculatePrice(product, { silverRate, customSpecification } = {}) {
  if (isSilver(product)) {
    const rate = silverRate ?? (await getLatestSilverRate());
    const making = product.makingCost || 0;

    if (rate == null) {
      return { price: null, priceRange: null, silverRate: null, pricingType: "silver_rate" };
    }

    if (product.silverType === "custom") {
      const { min, max } = product.weightRange || {};
      const priceRange =
        min != null && max != null
          ? { min: round(rate * min + making), max: round(rate * max + making) }
          : null;
      const weight = customSpecification?.preferredWeight;
      return {
        price: weight != null ? round(rate * weight + making) : null,
        priceRange,
        silverRate: rate,
        pricingType: "silver_rate_estimate",
      };
    }

    return {
      price: product.weightInTola != null ? round(rate * product.weightInTola + making) : null,
      priceRange: null,
      silverRate: rate,
      pricingType: "silver_rate",
    };
  }

  if (product.constantPrice != null) {
    return { price: product.constantPrice, priceRange: null, silverRate: null, pricingType: "fixed" };
  }

  return { price: null, priceRange: null, silverRate: null, pricingType: "quote" };
}

// Adds a `pricing` block to a product for API responses
async function withPricing(product, silverRate) {
  const obj = typeof product.toObject === "function" ? product.toObject() : product;
  obj.pricing = await calculatePrice(product, { silverRate });
  return obj;
}

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

module.exports = {
  getLatestSilverRate,
  calculatePrice,
  validateCustomSpecification,
  withPricing,
  isCustomSilver,
};
