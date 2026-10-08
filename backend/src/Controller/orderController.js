const Order = require("../Model/orderModel");
const Product = require("../Model/productModel");
const { calculatePrice, validateCustomSpecification } = require("../Services/pricingService");
const jwt = require("jsonwebtoken");
const { sendWhatsAppOrderNotification } = require("../Services/messagingService");
const { sendOrderEmails } = require("../Services/emailService");

// True when the request carries a valid admin token (orders entered from the
// admin panel), so the shop isn't emailed about its own orders
const isAdminRequest = (req) => {
  const token = (req.header("Authorization") || "").replace("Bearer ", "");
  if (!token) return false;
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return true;
  } catch {
    return false;
  }
};

// Create Order
exports.createOrder = async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      productId,
      quantity = 1,
      notes,
      customization,
      customSpecification
    } = req.body;

    // Basic validation
    if (!customerName || !customerPhone || !productId) {
      return res.status(400).json({ 
        message: "Customer name, phone, and product ID are required" 
      });
    }

    // Find the product
    const product = await Product.findById(productId).populate('category');
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Custom silver products need the customer's specification
    const { errors, specification } = validateCustomSpecification(product, customSpecification);
    if (errors.length) {
      return res.status(400).json({ message: "Invalid custom specification", errors });
    }

    const { price, silverRate } = await calculatePrice(product, { customSpecification: specification });
    const silverPriceSnapshot = silverRate;
    const totalPrice = price != null ? price * quantity : null;

    const newOrder = new Order({
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      product: productId,
      quantity,
      notes,
      customization,
      customSpecification: specification,
      silverPriceSnapshot,
      totalPrice,
      status: 'pending'
    });

    await newOrder.save();
    
    // Populate the saved order for response
    const populatedOrder = await Order.findById(newOrder._id).populate('product');
    
    // Generate WhatsApp notification (optional)
    const whatsappNotification = sendWhatsAppOrderNotification(populatedOrder, product);
    
    res.status(201).json({ 
      message: "Order created successfully", 
      order: populatedOrder,
      whatsappNotification
    });

    // Orders from the shop email the shop and the customer. Orders entered by
    // an admin only email the customer, and only when notifyCustomer is set.
    const byAdmin = isAdminRequest(req);
    if (!byAdmin || String(req.body.notifyCustomer) === "true") {
      populatedOrder.product = product; // with its category, for the email
      sendOrderEmails([populatedOrder], { notifyAdmin: !byAdmin });
    }
  } catch (error) {
    console.error("Order creation error:", error);
    res.status(500).json({ message: "Error creating order", error: error.message });
  }
};

// Get All Orders
exports.getOrders = async (req, res) => {
  try {
    const { status, search, limit = 50, page = 1 } = req.query;
    
    // Build filter
    let filter = {};
    if (status) {
      filter.status = status;
    }
    if (search) {
      // Escape regex characters so a search like "+977" works
      const pattern = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { customerName: pattern },
        { customerPhone: pattern },
        { customerEmail: pattern },
      ];
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Get orders with populated product and category data
    const orders = await Order.find(filter)
      .populate({
        path: "product",
        populate: {
          path: "category",
          select: "name description"
        }
      })
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });
    
    // Get total count
    const total = await Order.countDocuments(filter);
    
    res.status(200).json({
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalOrders: total,
        hasNext: skip + orders.length < total,
        limit: parseInt(limit)
      },
      filter
    });
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({ message: "Error fetching orders", error: error.message });
  }
};

// Get a single order
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate({
      path: "product",
      populate: { path: "category", select: "name materialType" },
    });
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.status(200).json({ order });
  } catch (error) {
    res.status(500).json({ message: "Error fetching order", error: error.message });
  }
};

// Update Order (admin). Product can't be changed; create a new order instead.
exports.updateOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate("product");
    if (!order) return res.status(404).json({ message: "Order not found" });

    const editable = [
      "customerName",
      "customerPhone",
      "customerEmail",
      "customerAddress",
      "notes",
      "customization",
      "status",
    ];
    for (const field of editable) {
      if (req.body[field] !== undefined) order[field] = req.body[field];
    }

    const oldQuantity = order.quantity;
    if (req.body.quantity !== undefined) {
      const quantity = Number(req.body.quantity);
      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({ message: "Quantity must be a whole number of at least 1" });
      }
      order.quantity = quantity;
    }

    // Re-validate the custom specification against the product's limits
    if (req.body.customSpecification !== undefined && order.product) {
      const { errors, specification } = validateCustomSpecification(order.product, req.body.customSpecification);
      if (errors.length) {
        return res.status(400).json({ message: "Invalid custom specification", errors });
      }
      order.customSpecification = specification;
      // Price custom pieces on the silver rate locked in when the order was placed
      const { price } = await calculatePrice(order.product, {
        silverRate: order.silverPriceSnapshot ?? undefined,
        customSpecification: specification,
      });
      if (price != null) order.totalPrice = price * order.quantity;
    } else if (order.quantity !== oldQuantity && order.totalPrice != null) {
      // Keep the original unit price when only the quantity changes
      order.totalPrice = (order.totalPrice / oldQuantity) * order.quantity;
    }

    // An explicit total from the admin wins (e.g. a negotiated price)
    if (req.body.totalPrice !== undefined && req.body.totalPrice !== "") {
      const total = Number(req.body.totalPrice);
      if (Number.isNaN(total) || total < 0) {
        return res.status(400).json({ message: "Total price must be a positive number" });
      }
      order.totalPrice = total;
    }

    await order.save();
    await order.populate({ path: "product", populate: { path: "category", select: "name materialType" } });
    res.status(200).json({ message: "Order updated", order });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Error updating order", error: error.message });
  }
};

// Delete Order
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    res.status(200).json({ message: "Order deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting order", error: error.message });
  }
};
