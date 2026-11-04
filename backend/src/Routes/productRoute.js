const express = require("express");
const productController = require("../Controller/productController");
const authMiddleware = require("../Middleware/authMiddleware");
const router = express.Router();
const { productImages } = require("../Middleware/uploadMiddleware");

// Create a new product
router.post('/products', authMiddleware, productImages, productController.createProduct);


// Get all products
router.get("/products", productController.getAllProducts);

// Get a single product by ID
router.get("/products/:productId",productController.getProductById);

// Get a product for editing, including a price hidden by "Price on request"
router.get("/admin/products/:productId", authMiddleware, productController.getProductForAdmin);

// Update a product
router.put("/products/:productId", authMiddleware, productImages, productController.updateProduct);

// Delete a product
router.delete("/products/:productId", authMiddleware, productController.deleteProduct);

module.exports = router;
