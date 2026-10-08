const express = require("express");
const router = express.Router();
const categoryController = require("../Controller/categoryController");
const authMiddleware = require("../Middleware/authMiddleware");
const { categoryImage } = require("../Middleware/uploadMiddleware");

// Public routes
router.get("/categories", categoryController.getAllCategories); // Get all categories
router.get("/categories/:categoryId", categoryController.getCategoryById); // Get single category
router.get("/categories/custom/:customId", categoryController.getCategoryByCustomId); // Get category by custom ID
router.get("/categories/:categoryId/products", categoryController.getProductsByCategory); // Get products by category
router.get("/categories/:categoryId/schema", categoryController.getCategoryProductSchema); // Product fields for this category
router.get("/product-schemas/:materialType", categoryController.getProductSchemaByMaterial); // Product fields for a material type

// Admin protected routes
router.post("/categories", authMiddleware, categoryImage, categoryController.createCategory); // Create category
router.put("/categories/:categoryId", authMiddleware, categoryImage, categoryController.updateCategory); // Update category
router.delete("/categories/:categoryId", authMiddleware, categoryController.deleteCategory); // Delete category

// Legacy routes (for backward compatibility)
router.get("/category", categoryController.getAllCategories);
router.get("/category/:categoryId", categoryController.getCategoryById);

module.exports = router;
