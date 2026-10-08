const Category = require("../Model/categoryModel");
const Product = require("../Model/productModel");
const { MATERIAL_TYPES, getProductSchemaSpec } = require("../Config/productTypes");
const { getLatestSilverRate, withPricing } = require("../Services/pricingService");
const { toPublicPath } = require("../Middleware/uploadMiddleware");

// Create Category
exports.createCategory = async (req, res) => {
  try {
    const { name, description, categoryId } = req.body;
    // An uploaded file wins over a pasted image URL
    const imageUrl = req.file ? toPublicPath(req.file) : req.body.imageUrl;
    const materialType = req.body.materialType?.toLowerCase();

    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    if (!MATERIAL_TYPES.includes(materialType)) {
      return res.status(400).json({
        message: `materialType is required and must be one of: ${MATERIAL_TYPES.join(", ")}`,
      });
    }

    // Check for duplicate name
    const nameExists = await Category.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });
    if (nameExists) {
      return res.status(400).json({ message: "Category with this name already exists" });
    }

    // Check for duplicate custom ID if provided
    if (categoryId) {
      const idExists = await Category.findOne({ categoryId });
      if (idExists) {
        return res.status(400).json({ message: "Category with this ID already exists" });
      }
    }

    const newCategory = new Category({ name, description, imageUrl, categoryId, materialType });
    await newCategory.save();

    res.status(201).json({ 
      message: "Category created successfully", 
      category: newCategory 
    });
  } catch (error) {
    console.error("Create category error:", error);
    res.status(500).json({ message: "Error creating category", error: error.message });
  }
};

// Get All Categories with product counts
exports.getAllCategories = async (req, res) => {
  try {
    const { includeProductCount = false, includeInactive } = req.query;
    // Shop pages count only visible products; the admin panel asks for all
    const countFilter = String(includeInactive) === "true" ? {} : { isActive: { $ne: false } };
    
    const categories = await Category.find().sort({ name: 1 });
    
    if (includeProductCount === 'true') {
      // Add product count for each category
      const categoriesWithCounts = await Promise.all(
        categories.map(async (category) => {
          const productCount = await Product.countDocuments({ category: category._id, ...countFilter });
          return {
            ...category.toObject(),
            productCount
          };
        })
      );
      return res.status(200).json({ categories: categoriesWithCounts });
    }
    
    res.status(200).json({ categories });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({ message: "Error fetching categories", error: error.message });
  }
};

// Get Single Category by MongoDB ID
exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.categoryId);
    if (!category)
      return res.status(404).json({ message: "Category not found" });

    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ message: "Error fetching category", error });
  }
};

// Get Single Category by Custom ID
exports.getCategoryByCustomId = async (req, res) => {
  try {
    const { customId } = req.params;
    const category = await Category.findByCategoryId(parseInt(customId));
    if (!category)
      return res.status(404).json({ message: "Category not found" });

    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ message: "Error fetching category", error: error.message });
  }
};

// Update Category
exports.updateCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const imageUrl = req.file ? toPublicPath(req.file) : req.body.imageUrl;
    const materialType = req.body.materialType?.toLowerCase();

    const category = await Category.findById(req.params.categoryId);
    if (!category)
      return res.status(404).json({ message: "Category not found" });

    if (materialType && materialType !== category.materialType) {
      if (!MATERIAL_TYPES.includes(materialType)) {
        return res.status(400).json({
          message: `materialType must be one of: ${MATERIAL_TYPES.join(", ")}`,
        });
      }
      // Products are stored with the schema of their category's material,
      // so the material can only change while the category is empty.
      const productCount = await Product.countDocuments({ category: category._id });
      if (category.materialType && productCount > 0) {
        return res.status(400).json({
          message: `Cannot change materialType of a category with ${productCount} products.`,
          productCount,
        });
      }
      category.materialType = materialType;
    }

    if (name !== undefined) category.name = name;
    if (description !== undefined) category.description = description;
    if (imageUrl !== undefined) category.imageUrl = imageUrl;
    await category.save();

    res.status(200).json({ message: "Category updated", category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Category with this name already exists" });
    }
    res.status(500).json({ message: "Error updating category", error: error.message });
  }
};

// Get products by category
exports.getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { limit = 20, page = 1 } = req.query;
    
    // Check if category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Get products in this category
    const { silverType, goldFinish, platingMethod } = req.query;
    const filter = { category: categoryId };
    if (silverType) filter.silverType = silverType;
    if (goldFinish) filter.goldFinish = goldFinish;
    if (platingMethod) filter.platingMethod = platingMethod;

    const products = await Product.find(filter)
      .populate({
        path: "category",
        select: "name description imageUrl materialType"
      })
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });
    
    // Get total count
    const total = await Product.countDocuments(filter);
    const silverRate = await getLatestSilverRate();
    
    res.status(200).json({
      category: {
        _id: category._id,
        name: category.name,
        description: category.description,
        imageUrl: category.imageUrl,
        materialType: category.materialType,
        productType: category.productType
      },
      products: await Promise.all(products.map((p) => withPricing(p, silverRate))),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalProducts: total,
        hasNext: skip + products.length < total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error("Get products by category error:", error);
    res.status(500).json({ message: "Error fetching products by category", error: error.message });
  }
};

// Delete Category (with safety check for products)
exports.deleteCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    // Check if category has products
    const productCount = await Product.countDocuments({ category: categoryId });
    if (productCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete category. It has ${productCount} products. Please move or delete products first.`,
        productCount
      });
    }
    
    const category = await Category.findByIdAndDelete(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({ message: "Error deleting category", error: error.message });
  }
};

// Get the product fields a category's products use (for building admin forms)
exports.getCategoryProductSchema = async (req, res) => {
  try {
    const category = await Category.findById(req.params.categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const schema = category.getProductSchemaSpec();
    if (!schema) {
      return res.status(400).json({ message: `Category "${category.name}" has no materialType set` });
    }

    res.status(200).json({
      category: { _id: category._id, name: category.name, materialType: category.materialType },
      schema,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching category schema", error: error.message });
  }
};

// Get the product fields for a material type without needing a category
exports.getProductSchemaByMaterial = (req, res) => {
  const schema = getProductSchemaSpec(req.params.materialType?.toLowerCase());
  if (!schema) {
    return res.status(404).json({
      message: `Unknown material type. Use one of: ${MATERIAL_TYPES.join(", ")}`,
    });
  }
  res.status(200).json({ schema });
};
