// One-off migration to the per-category product schemas.
//
//  1. Gives every category a materialType (guessed from its name).
//  2. Tags every product with productType and moves legacy fields into
//     the new shape (isCustomizable -> silverType, height -> dimensions).
//
// Uses raw collection updates so old documents don't have to pass the new
// validation. Products it can't fully convert are listed at the end so an
// admin can finish them (e.g. gold products need a goldFinish).
//
// Usage: node migrateProductSchemas.js [--dry-run]
require("dns").setServers(["8.8.8.8", "1.1.1.1"]);
require("dotenv").config();
const mongoose = require("mongoose");
const Category = require("./src/Model/categoryModel");
const Product = require("./src/Model/productModel");
const { MATERIAL_TYPES, PRODUCT_TYPE_BY_MATERIAL } = require("./src/Config/productTypes");

const DRY_RUN = process.argv.includes("--dry-run");

const guessMaterialType = (name = "") => {
  const lower = name.toLowerCase();
  return MATERIAL_TYPES.find((type) => lower.includes(type));
};

async function migrateCategories() {
  const categories = await Category.collection
    .find({ $or: [{ materialType: { $exists: false } }, { materialType: null }] })
    .toArray();

  const unresolved = [];
  for (const category of categories) {
    const materialType = guessMaterialType(category.name);
    if (!materialType) {
      unresolved.push(category.name);
      continue;
    }
    console.log(`Category "${category.name}" -> ${materialType}`);
    if (!DRY_RUN) {
      await Category.collection.updateOne({ _id: category._id }, { $set: { materialType } });
    }
  }
  return unresolved;
}

async function migrateProducts() {
  const categories = await Category.collection.find({}).toArray();
  const categoryById = new Map(categories.map((c) => [c._id.toString(), c]));

  const products = await Product.collection
    .find({ $or: [{ productType: { $exists: false } }, { productType: null }] })
    .toArray();

  const needsAttention = [];

  for (const product of products) {
    const category = categoryById.get(String(product.category));
    const materialType = category?.materialType || guessMaterialType(category?.name);
    const productType = PRODUCT_TYPE_BY_MATERIAL[materialType];

    if (!productType) {
      needsAttention.push({ id: product._id, title: product.title, reason: "category has no materialType" });
      continue;
    }

    const $set = { productType };
    const $unset = { isCustomizable: "", silverPricePerTola: "", height: "" };

    const height = parseFloat(product.height);
    if (!Number.isNaN(height) && !product.dimensions?.height) {
      $set["dimensions.height"] = height;
    }

    if (productType === "silver") {
      const isCustom =
        product.isCustomizable === true ||
        /custom/i.test(category?.name || "") ||
        (product.weightRange?.min != null && product.weightInTola == null);
      $set.silverType = isCustom ? "custom" : "stock";
      if (product.makingCost == null) $set.makingCost = 0;
      if (isCustom) {
        needsAttention.push({ id: product._id, title: product.title, reason: "custom silver: check weightRange and set customOptions.productionTime" });
      } else if (product.weightInTola == null) {
        needsAttention.push({ id: product._id, title: product.title, reason: "stock silver: weightInTola missing" });
      }
    } else if (productType === "gold") {
      needsAttention.push({ id: product._id, title: product.title, reason: "gold: set goldFinish (and platingMethod for full_gold)" });
      $unset.weightRange = "";
    } else if (productType === "metal") {
      $set.metal = materialType;
      $unset.weightRange = "";
      if (product.constantPrice == null) {
        needsAttention.push({ id: product._id, title: product.title, reason: "constantPrice missing" });
      }
    }

    console.log(`Product "${product.title}" -> ${productType}${$set.silverType ? ` (${$set.silverType})` : ""}`);
    if (!DRY_RUN) {
      await Product.collection.updateOne({ _id: product._id }, { $set, $unset });
    }
  }

  return needsAttention;
}

async function run() {
  await mongoose.connect(process.env.mongo_uri || process.env.DB_URI);
  console.log(`Connected to MongoDB${DRY_RUN ? " (dry run, nothing will be written)" : ""}`);

  const unresolvedCategories = await migrateCategories();
  const needsAttention = await migrateProducts();

  if (unresolvedCategories.length) {
    console.log("\nCategories with no recognisable material (set materialType manually):");
    unresolvedCategories.forEach((name) => console.log(`  - ${name}`));
  }
  if (needsAttention.length) {
    console.log("\nProducts that need editing in the admin panel:");
    needsAttention.forEach((p) => console.log(`  - ${p.title} (${p.id}): ${p.reason}`));
  }

  await mongoose.connection.close();
  console.log("\nDone");
}

run().catch(async (error) => {
  console.error("Migration failed:", error);
  await mongoose.connection.close();
  process.exit(1);
});
