const Cart = require("../Model/cartModel");
const Product = require("../Model/productModel");
const Order = require("../Model/orderModel");
const {
  calculatePrice,
  getLatestSilverRate,
  validateCustomSpecification,
  isCustomSilver,
} = require("../Services/pricingService");
const { generateCustomerOrderUrl } = require("../Services/messagingService");
const { emailEnabled, sendOrderEmails } = require("../Services/emailService");

// Re-price every item at today's silver rate and drop items whose product
// was deleted or hidden. Returns what changed so the page can tell the customer.
async function refreshCartPrices(cart) {
  const silverRate = await getLatestSilverRate();
  const priceChanges = [];
  const removedItems = [];
  let dirty = false;

  for (const item of [...cart.items]) {
    const product = item.product;
    if (!product || product.isActive === false) {
      removedItems.push(product?.title || "A product that is no longer available");
      cart.items.pull(item._id);
      dirty = true;
      continue;
    }
    const { price, silverRate: rate } = await calculatePrice(product, {
      silverRate: silverRate ?? undefined,
      customSpecification: item.customSpecification,
    });
    if (price != null && Math.abs(price - item.priceSnapshot) > 0.01) {
      priceChanges.push({ itemId: item._id, previousPrice: item.priceSnapshot, price });
      item.priceSnapshot = price;
      item.silverPriceSnapshot = rate ?? item.silverPriceSnapshot;
      dirty = true;
    }
  }

  if (dirty) {
    cart.recalculateTotals();
    await cart.save();
  }
  return { priceChanges, removedItems };
}

// Get cart by session ID
getCart = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ message: "Session ID is required" });
    }

    const cart = await Cart.findOrCreateBySession(sessionId);
    const changes = await refreshCartPrices(cart);

    res.status(200).json({
      cart,
      summary: {
        totalItems: cart.totalItems,
        subtotal: cart.subtotal,
        calculatedTotal: cart.calculatedTotal,
      },
      ...changes,
    });
  } catch (error) {
    console.error("Get cart error:", error);
    res
      .status(500)
      .json({ message: "Error fetching cart", error: error.message });
  }
};

// Add item to cart
addToCart = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { productId, quantity = 1, customization, customSpecification } = req.body;

    if (!sessionId || !productId) {
      return res
        .status(400)
        .json({ message: "Session ID and Product ID are required" });
    }

    // Find product with category
    const product = await Product.findById(productId).populate("category");
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Custom silver products need the customer's specification
    const { errors, specification } = validateCustomSpecification(
      product,
      customSpecification
    );
    if (errors.length) {
      return res
        .status(400)
        .json({ message: "Invalid custom specification", errors });
    }

    const { price, silverRate } = await calculatePrice(product, {
      customSpecification: specification,
    });
    if (price == null) {
      return res.status(400).json({
        message: "Price for this product is not available right now",
      });
    }

    // Find or create cart
    const cart = await Cart.findOrCreateBySession(sessionId);

    // Custom pieces are each made to their own spec, so never merge them
    const existingItemIndex = isCustomSilver(product)
      ? -1
      : cart.items.findIndex(
          (item) =>
            (item.product._id || item.product).toString() ===
            productId.toString()
        );

    if (existingItemIndex >= 0) {
      // Update existing item quantity
      cart.items[existingItemIndex].quantity += quantity;
      cart.items[existingItemIndex].priceSnapshot = price; // Update to current price
      cart.items[existingItemIndex].silverPriceSnapshot = silverRate;
      if (customization) {
        cart.items[existingItemIndex].customization = customization;
      }
    } else {
      // Add new item
      cart.items.push({
        product: productId,
        quantity,
        priceSnapshot: price,
        silverPriceSnapshot: silverRate,
        customization,
        customSpecification: specification,
        addedAt: new Date(),
      });
    }

    // Recalculate totals and save
    cart.recalculateTotals();
    await cart.save();

    // Populate and return updated cart
    const updatedCart = await Cart.findById(cart._id).populate({
      path: "items.product",
      populate: {
        path: "category",
        select: "name description",
      },
    });

    res.status(200).json({
      message: "Item added to cart successfully",
      cart: updatedCart,
      summary: {
        totalItems: updatedCart.totalItems,
        subtotal: updatedCart.subtotal,
      },
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    res
      .status(500)
      .json({ message: "Error adding item to cart", error: error.message });
  }
};

// Update cart item quantity
updateCartItem = async (req, res) => {
  try {
    const { sessionId, itemId } = req.params;
    const { quantity, customization, customSpecification } = req.body;

    if (!sessionId || !itemId) {
      return res
        .status(400)
        .json({ message: "Session ID and Item ID are required" });
    }

    if (quantity && quantity < 0) {
      return res.status(400).json({ message: "Quantity must be positive" });
    }

    const cart = await Cart.findOne({ sessionId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item._id.toString() === itemId
    );
    if (itemIndex === -1) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    if (quantity === 0) {
      // Remove item if quantity is 0
      cart.items.splice(itemIndex, 1);
    } else {
      // Update item
      if (quantity) cart.items[itemIndex].quantity = quantity;
      if (customization !== undefined)
        cart.items[itemIndex].customization = customization;

      // Re-validate and re-price when the custom specification changes
      if (customSpecification !== undefined) {
        const product = await Product.findById(cart.items[itemIndex].product);
        if (!product) {
          return res.status(404).json({ message: "Product not found" });
        }
        const { errors, specification } = validateCustomSpecification(
          product,
          customSpecification
        );
        if (errors.length) {
          return res
            .status(400)
            .json({ message: "Invalid custom specification", errors });
        }
        const { price, silverRate } = await calculatePrice(product, {
          customSpecification: specification,
        });
        cart.items[itemIndex].customSpecification = specification;
        if (price != null) {
          cart.items[itemIndex].priceSnapshot = price;
          cart.items[itemIndex].silverPriceSnapshot = silverRate;
        }
      }
    }

    // Recalculate totals and save
    cart.recalculateTotals();
    await cart.save();

    // Populate and return updated cart
    const updatedCart = await Cart.findById(cart._id).populate({
      path: "items.product",
      populate: {
        path: "category",
        select: "name description",
      },
    });

    res.status(200).json({
      message: "Cart updated successfully",
      cart: updatedCart,
      summary: {
        totalItems: updatedCart.totalItems,
        subtotal: updatedCart.subtotal,
      },
    });
  } catch (error) {
    console.error("Update cart error:", error);
    res
      .status(500)
      .json({ message: "Error updating cart", error: error.message });
  }
};

// Remove item from cart
removeFromCart = async (req, res) => {
  try {
    const { sessionId, itemId } = req.params;

    const cart = await Cart.findOne({ sessionId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item._id.toString() === itemId
    );
    if (itemIndex === -1) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    cart.items.splice(itemIndex, 1);
    cart.recalculateTotals();
    await cart.save();

    // Populate and return updated cart
    const updatedCart = await Cart.findById(cart._id).populate({
      path: "items.product",
      populate: {
        path: "category",
        select: "name description",
      },
    });

    res.status(200).json({
      message: "Item removed from cart successfully",
      cart: updatedCart,
      summary: {
        totalItems: updatedCart.totalItems,
        subtotal: updatedCart.subtotal,
      },
    });
  } catch (error) {
    console.error("Remove from cart error:", error);
    res
      .status(500)
      .json({ message: "Error removing item from cart", error: error.message });
  }
};

// Clear entire cart
clearCart = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const cart = await Cart.findOne({ sessionId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.items = [];
    cart.recalculateTotals();
    await cart.save();

    res.status(200).json({
      message: "Cart cleared successfully",
      cart,
      summary: {
        totalItems: 0,
        subtotal: 0,
      },
    });
  } catch (error) {
    console.error("Clear cart error:", error);
    res
      .status(500)
      .json({ message: "Error clearing cart", error: error.message });
  }
};

// Proceed to checkout (update customer info)
updateCustomerInfo = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const {
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      orderNotes,
    } = req.body;

    if (!customerName || !customerPhone) {
      return res
        .status(400)
        .json({ message: "Customer name and phone are required" });
    }

    const cart = await Cart.findOne({ sessionId }).populate({
      path: "items.product",
      populate: {
        path: "category",
        select: "name description",
      },
    });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    if (cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Update customer info
    cart.customerName = customerName;
    cart.customerPhone = customerPhone;
    cart.customerEmail = customerEmail;
    cart.customerAddress = customerAddress;
    cart.orderNotes = orderNotes;

    await cart.save();

    res.status(200).json({
      message: "Customer information updated successfully",
      cart,
      summary: {
        totalItems: cart.totalItems,
        subtotal: cart.subtotal,
      },
    });
  } catch (error) {
    console.error("Update customer info error:", error);
    res
      .status(500)
      .json({
        message: "Error updating customer information",
        error: error.message,
      });
  }
};

// Place the order: saves one Order per cart item (so they show up in the
// admin panel), empties the cart and returns a WhatsApp link for the shop.
generateCheckoutUrl = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const cart = await Cart.findOrCreateBySession(sessionId);
    const { removedItems } = await refreshCartPrices(cart);

    if (cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty", removedItems });
    }
    if (!cart.customerName || !cart.customerPhone) {
      return res.status(400).json({ message: "Customer name and phone are required" });
    }

    const orders = await Order.insertMany(
      cart.items.map((item) => ({
        customerName: cart.customerName,
        customerPhone: cart.customerPhone,
        customerEmail: cart.customerEmail,
        customerAddress: cart.customerAddress,
        product: item.product._id,
        quantity: item.quantity,
        silverPriceSnapshot: item.silverPriceSnapshot,
        totalPrice: item.priceSnapshot * item.quantity,
        notes: cart.orderNotes,
        customization: item.customization,
        customSpecification: item.customSpecification,
        status: "pending",
      }))
    );

    let message = `🛒 *NEW ORDER FROM WELCOME-CRAFT* 🛒\n\n`;
    message += `👤 *Customer Details:*\n`;
    message += `Name: ${cart.customerName}\n`;
    message += `Phone: ${cart.customerPhone}\n`;
    if (cart.customerEmail) message += `Email: ${cart.customerEmail}\n`;
    if (cart.customerAddress) message += `Address: ${cart.customerAddress}\n`;

    message += `\n📦 *Order Items (${cart.totalItems} items):*\n`;

    cart.items.forEach((item, index) => {
      message += `\n${index + 1}. *${item.product.title}*\n`;
      message += `   Category: ${item.product.category?.name || "-"}\n`;
      message += `   Quantity: ${item.quantity}\n`;
      message += `   Price: Rs. ${Math.round(item.priceSnapshot).toLocaleString()} each\n`;
      message += `   Subtotal: Rs. ${Math.round(item.priceSnapshot * item.quantity).toLocaleString()}\n`;
      const spec = item.customSpecification;
      if (spec && spec.preferredWeight != null) {
        message += `   *Custom Specification:*\n`;
        message += `   - Weight: ${spec.preferredWeight} tola\n`;
        if (spec.size && spec.size.height)
          message += `   - Size: ${[spec.size.height, spec.size.width, spec.size.length].filter(Boolean).join(" x ")} ${spec.size.unit || ""}\n`;
        if (spec.design) message += `   - Design: ${spec.design}\n`;
        if (spec.designNotes) message += `   - Notes: ${spec.designNotes}\n`;
        if (item.silverPriceSnapshot) message += `   - Silver rate: Rs. ${item.silverPriceSnapshot}/tola\n`;
        if (spec.requiredBy) message += `   - Needed by: ${new Date(spec.requiredBy).toDateString()}\n`;
        if (spec.estimatedCompletion && spec.estimatedCompletion.latest)
          message += `   - Est. ready by: ${new Date(spec.estimatedCompletion.latest).toDateString()}\n`;
      }
      if (item.customization) {
        message += `   *Custom Requirements:* ${item.customization}\n`;
      }
    });

    message += `\n💰 *Estimated Total: Rs. ${Math.round(cart.subtotal).toLocaleString()}*\n`;

    if (cart.orderNotes) {
      message += `\n📝 *Order Notes:*\n${cart.orderNotes}\n`;
    }

    message += `\n🧾 Order reference: ${orders.map((o) => String(o._id).slice(-6).toUpperCase()).join(", ")}\n`;
    message += `⏰ Order Time: ${new Date().toLocaleString()}\n`;
    message += `\nPlease confirm this order and provide payment details.\n\nThank you! 🙏`;

    const adminPhone = (process.env.WHATSAPP_PHONE || "").replace(/[^\d]/g, "");
    const whatsappUrl = adminPhone
      ? `https://wa.me/${adminPhone}?text=${encodeURIComponent(message)}`
      : null;

    const orderSummary = {
      totalItems: cart.totalItems,
      subtotal: cart.subtotal,
      customerName: cart.customerName,
      customerPhone: cart.customerPhone,
      orderIds: orders.map((o) => o._id),
    };

    // Products as ordered, for the emails (the cart is emptied below)
    const orderedProducts = cart.items.map((item) => item.product);

    // Orders are saved; empty the cart but keep the customer details for next time
    cart.items = [];
    cart.orderNotes = undefined;
    cart.recalculateTotals();
    await cart.save();

    res.status(200).json({
      message: "Order placed successfully",
      whatsappUrl,
      orderSummary,
      removedItems,
      // Lets the confirmation page mention the email copy
      customerEmailRequested: Boolean(cart.customerEmail) && emailEnabled(),
    });

    // Email the shop and the customer after responding, so mail problems
    // never hold up or fail the order. Errors are logged, not thrown.
    sendOrderEmails(orders, { products: orderedProducts });
  } catch (error) {
    console.error("Checkout error:", error);
    res
      .status(500)
      .json({ message: "Error placing order", error: error.message });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  updateCustomerInfo,
  generateCheckoutUrl,
};
