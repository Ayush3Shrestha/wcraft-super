// Central definitions for category material types and the product
// variants each one supports. Models, controllers and the category
// "schema" endpoint all read from here so the rules live in one place.

const MATERIAL_TYPES = ["silver", "gold", "copper", "bronze"];

// Which product discriminator a category's materialType maps to
const PRODUCT_TYPE_BY_MATERIAL = {
  silver: "silver",
  gold: "gold",
  copper: "metal",
  bronze: "metal",
};

const SILVER_LISTING_TYPES = ["stock", "custom"];

const GOLD_FINISHES = ["oxidized", "color", "half_gold", "full_gold"];

// Only valid when goldFinish === "full_gold"
const GOLD_PLATING_METHODS = ["electroplated", "fire_gold_plated"];

const BASE_METALS = ["copper", "bronze", "brass"];

const DIMENSION_UNITS = ["inch", "cm"];

const LABELS = {
  stock: "Stock",
  custom: "Custom",
  oxidized: "Oxidized",
  color: "Color",
  half_gold: "Half Gold",
  full_gold: "Full Gold",
  electroplated: "Electroplated",
  fire_gold_plated: "Fire Gold Plated",
};

const toOptions = (values) =>
  values.map((value) => ({ value, label: LABELS[value] || value }));

// Describes the fields a product in a category of the given material needs.
// Returned by GET /api/categories/:categoryId/schema for the admin form.
function getProductSchemaSpec(materialType) {
  const common = {
    title: { type: "string", required: true },
    description: { type: "string", required: true },
    images: { type: "file[]", required: true },
    dimensions: {
      height: { type: "number" },
      width: { type: "number" },
      length: { type: "number" },
      unit: { type: "enum", options: toOptions(DIMENSION_UNITS), default: "inch" },
    },
  };

  switch (materialType) {
    case "silver":
      return {
        materialType,
        productType: "silver",
        pricing: "live silver rate per tola × weight + making cost",
        fields: {
          ...common,
          silverType: { type: "enum", options: toOptions(SILVER_LISTING_TYPES), required: true },
          makingCost: { type: "number", required: true },
        },
        variants: {
          stock: {
            weightInTola: { type: "number", required: true },
            stockQuantity: { type: "number", default: 0 },
          },
          custom: {
            weightRange: {
              min: { type: "number", required: true, unit: "tola" },
              max: { type: "number", required: true, unit: "tola" },
            },
            customOptions: {
              sizeRange: {
                minHeight: { type: "number" },
                maxHeight: { type: "number" },
                unit: { type: "enum", options: toOptions(DIMENSION_UNITS) },
              },
              designOptions: { type: "string[]" },
              allowCustomDesign: { type: "boolean", default: true },
              productionTime: {
                minDays: { type: "number", required: true },
                maxDays: { type: "number", required: true },
              },
            },
          },
        },
        // What the customer fills in when ordering a custom silver product
        customerSpecification: {
          preferredWeight: { type: "number", unit: "tola", note: "within weightRange" },
          size: { height: "number", width: "number", length: "number", unit: "enum" },
          design: { type: "string", note: "one of designOptions, or free text if allowCustomDesign" },
          designNotes: { type: "string" },
          referenceImages: { type: "string[]" },
          requiredBy: { type: "date" },
        },
      };

    case "gold":
      return {
        materialType,
        productType: "gold",
        pricing: "fixed price",
        fields: {
          ...common,
          constantPrice: { type: "number", required: true },
          goldFinish: { type: "enum", options: toOptions(GOLD_FINISHES), required: true },
          platingMethod: {
            type: "enum",
            options: toOptions(GOLD_PLATING_METHODS),
            requiredWhen: { goldFinish: "full_gold" },
          },
          baseMetal: { type: "enum", options: toOptions(BASE_METALS) },
          weightInKg: { type: "number" },
          stockQuantity: { type: "number", default: 0 },
        },
      };

    case "copper":
    case "bronze":
      return {
        materialType,
        productType: "metal",
        pricing: "fixed price",
        fields: {
          ...common,
          constantPrice: { type: "number", required: true },
          weightInKg: { type: "number" },
          finish: { type: "string" },
          stockQuantity: { type: "number", default: 0 },
        },
      };

    default:
      return null;
  }
}

module.exports = {
  MATERIAL_TYPES,
  PRODUCT_TYPE_BY_MATERIAL,
  SILVER_LISTING_TYPES,
  GOLD_FINISHES,
  GOLD_PLATING_METHODS,
  BASE_METALS,
  DIMENSION_UNITS,
  getProductSchemaSpec,
};
