const express = require('express');
const router = express.Router();
const cartController = require('../Controller/cartController');

// Cart routes (all public - session-based, no auth required)

// Get cart by session ID
router.get('/cart/:sessionId', cartController.getCart);

// Add item to cart
router.post('/cart/:sessionId/add', cartController.addToCart);

// Update cart item quantity or customization
router.put('/cart/:sessionId/item/:itemId', cartController.updateCartItem);

// Remove item from cart
router.delete('/cart/:sessionId/item/:itemId', cartController.removeFromCart);

// Clear entire cart
router.delete('/cart/:sessionId', cartController.clearCart);

// Update customer information for checkout
router.put('/cart/:sessionId/customer', cartController.updateCustomerInfo);

// Generate WhatsApp checkout URL
router.post('/cart/:sessionId/checkout', cartController.generateCheckoutUrl);

module.exports = router;
