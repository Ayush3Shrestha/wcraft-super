const crypto = require("crypto");
const Order = require("../Model/orderModel");
const CustomerNote = require("../Model/customerNoteModel");

// Customers don't have accounts: a customer is everyone's orders with the same
// phone number. Their details come from their latest order.

const ORDER_FIELDS = "customerName customerPhone customerEmail customerAddress totalPrice status quantity createdAt";

// "+977 981-234 5678" and "9812345678" are the same customer
function phoneKey(order) {
  const digits = String(order.customerPhone || "").replace(/\D/g, "");
  if (!digits) return `name:${String(order.customerName || "").trim().toLowerCase()}`;
  return digits.startsWith("977") && digits.length > 10 ? digits.slice(3) : digits;
}

// An id for links and API paths, so phone numbers stay out of URLs and logs
const customerId = (key) => crypto.createHash("sha256").update(key).digest("hex").slice(0, 16);

// Group orders (newest first) into customers
function groupOrders(orders) {
  const customers = new Map();
  for (const order of orders) {
    const key = phoneKey(order);
    let customer = customers.get(key);
    if (!customer) {
      customer = {
        id: customerId(key),
        name: order.customerName,
        phone: order.customerPhone,
        email: order.customerEmail || "",
        address: order.customerAddress || "",
        orderCount: 0,
        totalSpent: 0,
        lastOrderAt: order.createdAt,
        firstOrderAt: order.createdAt,
      };
      customers.set(key, customer);
    }
    // Details missing from the newest order come from an earlier one
    if (!customer.email && order.customerEmail) customer.email = order.customerEmail;
    if (!customer.address && order.customerAddress) customer.address = order.customerAddress;
    customer.orderCount += 1;
    if (order.status !== "cancelled") customer.totalSpent += order.totalPrice || 0;
    customer.firstOrderAt = order.createdAt;
  }
  return [...customers.values()];
}

const SORTERS = {
  recent: (a, b) => new Date(b.lastOrderAt) - new Date(a.lastOrderAt),
  spent: (a, b) => b.totalSpent - a.totalSpent,
  orders: (a, b) => b.orderCount - a.orderCount,
  name: (a, b) => String(a.name).localeCompare(String(b.name)),
};

exports.getCustomers = async (req, res) => {
  try {
    const { search, sort = "recent", page = 1, limit = 20 } = req.query;
    const orders = await Order.find({}, ORDER_FIELDS).sort({ createdAt: -1 }).lean();
    let customers = groupOrders(orders);

    const term = String(search || "").trim().toLowerCase();
    if (term) {
      const digits = term.replace(/\D/g, "");
      customers = customers.filter(
        (c) =>
          String(c.name).toLowerCase().includes(term) ||
          c.email.toLowerCase().includes(term) ||
          (digits && String(c.phone).replace(/\D/g, "").includes(digits))
      );
    }
    customers.sort(SORTERS[sort] || SORTERS.recent);

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const start = (pageNum - 1) * limitNum;
    res.status(200).json({
      customers: customers.slice(start, start + limitNum),
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(customers.length / limitNum),
        totalCustomers: customers.length,
        hasNext: start + limitNum < customers.length,
      },
    });
  } catch (error) {
    console.error("Get customers error:", error);
    res.status(500).json({ message: "Error fetching customers", error: error.message });
  }
};

exports.getCustomerById = async (req, res) => {
  try {
    const orders = await Order.find({}, `${ORDER_FIELDS} product`)
      .populate("product", "title")
      .sort({ createdAt: -1 })
      .lean();
    const own = orders.filter((o) => customerId(phoneKey(o)) === req.params.customerId);
    if (!own.length) return res.status(404).json({ message: "Customer not found" });

    const [customer] = groupOrders(own);
    const note = await CustomerNote.findOne({ customerId: customer.id }).lean();
    res.status(200).json({ customer: { ...customer, notes: note?.notes || "" }, orders: own });
  } catch (error) {
    console.error("Get customer error:", error);
    res.status(500).json({ message: "Error fetching customer", error: error.message });
  }
};

exports.updateCustomerNotes = async (req, res) => {
  try {
    const notes = String(req.body.notes ?? "").trim();
    if (notes.length > 2000) return res.status(400).json({ message: "Notes can be at most 2000 characters" });

    const orders = await Order.find({}, "customerName customerPhone").lean();
    if (!orders.some((o) => customerId(phoneKey(o)) === req.params.customerId)) {
      return res.status(404).json({ message: "Customer not found" });
    }
    if (notes) await CustomerNote.findOneAndUpdate({ customerId: req.params.customerId }, { notes }, { upsert: true });
    else await CustomerNote.deleteOne({ customerId: req.params.customerId });
    res.status(200).json({ message: "Notes saved", notes });
  } catch (error) {
    console.error("Save customer notes error:", error);
    res.status(500).json({ message: "Error saving notes", error: error.message });
  }
};
