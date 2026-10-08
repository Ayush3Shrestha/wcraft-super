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

// Update a product
router.put("/products/:productId", authMiddleware, productImages, productController.updateProduct);

// Delete a product
router.delete("/products/:productId", authMiddleware, productController.deleteProduct);

module.exports = router;
