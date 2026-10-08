const Product = require("../Model/productModel");
const { PRODUCT_MODELS } = require("../Model/productModel");
const Category = require("../Model/categoryModel");
const { PRODUCT_TYPE_BY_MATERIAL } = require("../Config/productTypes");
const { getLatestSilverRate, withPricing } = require("../Services/pricingService");
const { MAX_PRODUCT_IMAGES, toPublicPath, removeStoredImages } = require("../Middleware/uploadMiddleware");

// Multipart forms send nested objects either as `a[b]` fields (parsed by
// multer) or as JSON strings. Accept both.
const parseObject = (value) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

const parseArray = (value) => {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value;
  const parsed = parseObject(value);
  if (Array.isArray(parsed)) return parsed;
  return String(value)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
};

// Drop undefined / empty-string values so they don't overwrite on update
const clean = (obj) => {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === "") continue;
    const cleaned = clean(value);
    if (cleaned && typeof cleaned === "object" && !Array.isArray(cleaned) && !Object.keys(cleaned).length) continue;
    out[key] = cleaned;
  }
  return out;
};

// Build the fields for a product of the given type from the request body
function buildProductFields(body, productType, materialType) {
  const dimensions = parseObject(body.dimensions) || {
    height: body.height,
    width: body.width,
    length: body.length,
    unit: body.unit,
  };

  const fields = {
    title: body.title,
    description: body.description,
    dimensions,
    isActive: body.isActive,
  };

  if (productType === "silver") {
    // `customizable` is the old flag from the admin form
    let silverType = body.silverType;
    if (!silverType && body.customizable !== undefined) {
      silverType = String(body.customizable) === "true" ? "custom" : "stock";
    }

    const customOptions = parseObject(body.customOptions);
    if (customOptions && customOptions.designOptions !== undefined) {
      customOptions.designOptions = parseArray(customOptions.designOptions);
    }

    Object.assign(fields, {
      silverType,
      makingCost: body.makingCost,
      weightInTola: body.weightInTola,
      stockQuantity: body.stockQuantity,
      weightRange: parseObject(body.weightRange),
      customOptions,
    });
  } else if (productType === "gold") {
    Object.assign(fields, {
      constantPrice: body.constantPrice,
      goldFinish: body.goldFinish,
      platingMethod: body.platingMethod,
      baseMetal: body.baseMetal,
      weightInKg: body.weightInKg,
      stockQuantity: body.stockQuantity,
    });
  } else if (productType === "metal") {
    Object.assign(fields, {
      metal: materialType,
      constantPrice: body.constantPrice,
      weightInKg: body.weightInKg,
      finish: body.finish,
      stockQuantity: body.stockQuantity,
    });
  }

  return clean(fields);
}

const validationResponse = (res, error) =>
  res.status(400).json({
    message: "Product validation failed",
    errors: Object.fromEntries(
      Object.entries(error.errors || {}).map(([path, err]) => [path, err.message])
    ),
  });

async function resolveCategory(categoryId) {
  const category = await Category.findById(categoryId).catch(() => null);
  if (!category) return { error: "Category not found" };
  const productType = PRODUCT_TYPE_BY_MATERIAL[category.materialType];
  if (!productType) {
    return { error: `Category "${category.name}" has no materialType set. Update the category first.` };
  }
  return { category, productType };
}

// Work out a product's image list from the request.
// `imageOrder` (JSON array) lists the final images in order: an existing
// image by its path, or "new:<n>" for the n-th uploaded file. Existing images
// left out are removed, and uploads it doesn't mention go at the end.
// Without `imageOrder`, uploads are added after the existing images, or
// replace them when replaceImages=true.
function resolveImages(body, existing, uploaded) {
  let images;
  if (body.imageOrder !== undefined) {
    const order = parseObject(body.imageOrder);
    if (!Array.isArray(order)) return { error: "imageOrder must be a JSON array" };
    const used = new Set();
    images = [];
    for (const entry of order) {
      const ref = String(entry);
      const isNew = /^new:(\d+)$/.exec(ref);
      if (isNew) {
        const i = Number(isNew[1]);
        if (i >= uploaded.length) return { error: `imageOrder refers to upload ${i}, but only ${uploaded.length} were sent` };
        if (used.has(ref)) continue;
        used.add(ref);
        images.push(uploaded[i]);
      } else {
        if (!existing.includes(ref)) return { error: `imageOrder refers to an image this product doesn't have: ${ref}` };
        if (used.has(ref)) continue;
        used.add(ref);
        images.push(ref);
      }
    }
    uploaded.forEach((img, i) => {
      if (!used.has(`new:${i}`)) images.push(img);
    });
  } else if (String(body.replaceImages) === "true") {
    images = uploaded.length ? uploaded : existing;
  } else {
    images = [...existing, ...uploaded];
  }

  if (images.length > MAX_PRODUCT_IMAGES) {
    return { error: `A product can have at most ${MAX_PRODUCT_IMAGES} images (this would make ${images.length})` };
  }
  return { images, removed: existing.filter((img) => !images.includes(img)) };
}

// Create a new product
exports.createProduct = async (req, res) => {
  try {
    const { category, productType, error } = await resolveCategory(req.body.category);
    if (error) return res.status(400).json({ message: error });

    const resolved = resolveImages(req.body, [], (req.files || []).map(toPublicPath));
    if (resolved.error) return res.status(400).json({ message: resolved.error });
    const { images } = resolved;

    const Model = PRODUCT_MODELS[productType];
    const product = new Model({
      ...buildProductFields(req.body, productType, category.materialType),
      images,
      category: category._id,
    });

    await product.save();
    await product.populate("category", "name materialType");
    res.status(201).json({ message: "Product created successfully", product: await withPricing(product) });
  } catch (error) {
    if (error.name === "ValidationError") return validationResponse(res, error);
    console.error("Create product error:", error);
    res.status(500).json({ message: "Error creating product", error: error.message });
  }
};

// Get all products with optional filtering
exports.getAllProducts = async (req, res) => {
  try {
    const {
      category,
      categoryName,
      materialType,
      silverType,
      goldFinish,
      platingMethod,
      search,
      includeInactive,
      sort = "newest",
      minPrice,
      maxPrice,
      limit = 50,
      page = 1,
    } = req.query;

    const filter = {};

    // Hidden products only appear in the admin panel
    if (String(includeInactive) !== "true") {
      filter.isActive = { $ne: false };
    }

    if (category) {
      filter.category = category;
    }

    if (categoryName) {
      const escaped = categoryName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Exact (case-insensitive) match first, so "Silver" doesn't pick "Silver Statues"
      const categoryDoc =
        (await Category.findOne({ name: new RegExp(`^${escaped}$`, "i") })) ||
        (await Category.findOne({ name: new RegExp(escaped, "i") }));
      if (!categoryDoc) {
        return res.status(404).json({
          message: `No category found with name: ${categoryName}`,
          availableCategories: await Category.find({}, "name materialType"),
        });
      }
      filter.category = categoryDoc._id;
    }

    if (materialType) {
      const categories = await Category.find({ materialType }, "_id");
      filter.category = { $in: categories.map((c) => c._id) };
    }

    if (silverType) filter.silverType = silverType;
    if (goldFinish) filter.goldFinish = goldFinish;
    if (platingMethod) filter.platingMethod = platingMethod;
    if (search) {
      filter.title = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));
    const skip = (pageNum - 1) * limitNum;
    const silverRate = await getLatestSilverRate();
    const populate = { path: "category", select: "name description imageUrl materialType" };

    // Silver prices depend on today's rate, so price sorting and filtering
    // can't run in MongoDB; do them in memory (the catalogue is small).
    const byPrice = sort === "price-asc" || sort === "price-desc" || minPrice || maxPrice;

    let products;
    let total;
    if (byPrice) {
      const all = await Product.find(filter).populate(populate);
      let priced = await Promise.all(all.map((p) => withPricing(p, silverRate)));
      // Custom pieces have no single price; compare on the lowest possible price
      const priceOf = (p) => p.pricing?.price ?? p.pricing?.priceRange?.min ?? null;
      const min = minPrice !== undefined && minPrice !== "" ? Number(minPrice) : null;
      const max = maxPrice !== undefined && maxPrice !== "" ? Number(maxPrice) : null;
      if (min != null || max != null) {
        priced = priced.filter((p) => {
          const price = priceOf(p);
          return price != null && (min == null || price >= min) && (max == null || price <= max);
        });
      }
      if (sort === "price-asc" || sort === "price-desc") {
        const dir = sort === "price-asc" ? 1 : -1;
        priced.sort((a, b) => {
          const pa = priceOf(a);
          const pb = priceOf(b);
          if (pa == null) return 1; // unpriced last
          if (pb == null) return -1;
          return (pa - pb) * dir;
        });
      }
      total = priced.length;
      products = priced.slice(skip, skip + limitNum);
    } else {
      const sortSpec = sort === "name" ? { title: 1 } : sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };
      const [docs, count] = await Promise.all([
        Product.find(filter).populate(populate).sort(sortSpec).skip(skip).limit(limitNum),
        Product.countDocuments(filter),
      ]);
      products = await Promise.all(docs.map((p) => withPricing(p, silverRate)));
      total = count;
    }

    res.status(200).json({
      products,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalProducts: total,
        hasNext: skip + products.length < total,
        limit: limitNum,
      },
      filter,
    });
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({ message: "Error fetching products", error: error.message });
  }
};

// Get a single product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId).populate("category");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({ product: await withPricing(product) });
  } catch (error) {
    res.status(500).json({ message: "Error fetching product", error: error.message });
  }
};

// Update product details
exports.updateProduct = async (req, res) => {
  try {
    let product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const categoryId = req.body.category || product.category;
    const { category, productType, error } = await resolveCategory(categoryId);
    if (error) return res.status(400).json({ message: error });

    // Products created before the per-category schemas have no productType;
    // tag them so they load with the right discriminator.
    if (!product.productType) {
      await Product.collection.updateOne({ _id: product._id }, { $set: { productType } });
      product = await Product.findById(product._id);
    }

    // Each product type has its own schema, so switching e.g. silver -> gold
    // would leave the document half-valid. Recreate the product instead.
    if (product.productType && product.productType !== productType) {
      return res.status(400).json({
        message: `Cannot move a ${product.productType} product into a ${category.materialType} category. Create a new product instead.`,
      });
    }

    const fields = buildProductFields(req.body, productType, category.materialType);
    product.set({ ...fields, category: category._id });

    const resolved = resolveImages(req.body, [...product.images], (req.files || []).map(toPublicPath));
    if (resolved.error) return res.status(400).json({ message: resolved.error });
    product.images = resolved.images;

    await product.save();
    // Delete the files of images that were taken off the product
    removeStoredImages(resolved.removed);
    await product.populate("category", "name materialType");
    res.status(200).json({ message: "Product updated successfully", product: await withPricing(product) });
  } catch (error) {
    if (error.name === "ValidationError") return validationResponse(res, error);
    console.error("Update product error:", error);
    res.status(500).json({ message: "Error updating product", error: error.message });
  }
};

// Delete a product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    removeStoredImages(product.images);
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting product", error: error.message });
  }
};
