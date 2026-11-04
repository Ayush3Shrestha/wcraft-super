const express = require("express");
const customerController = require("../Controller/customerController");
const authMiddleware = require("../Middleware/authMiddleware");
const router = express.Router();

// Admin only: customer details are private
router.get("/admin/customers", authMiddleware, customerController.getCustomers);
router.get("/admin/customers/:customerId", authMiddleware, customerController.getCustomerById);
router.put("/admin/customers/:customerId/notes", authMiddleware, customerController.updateCustomerNotes);

module.exports = router;
