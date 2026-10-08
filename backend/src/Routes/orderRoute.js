const express = require("express");
const router = express.Router();
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
} = require("../Controller/orderController");
const auth = require("../Middleware/authMiddleware");

// Order routes
router.post("/orders", createOrder); // Public route for customers to place orders
router.get("/orders", auth, getOrders); // Admin only
router.get("/orders/:orderId", auth, getOrderById); // Admin only
router.put("/orders/:orderId", auth, updateOrder); // Admin only
router.delete("/orders/:orderId", auth, deleteOrder); // Admin only
router.put("/orders/:orderId/status", auth, updateOrder); // Admin only - update status

module.exports = router;
