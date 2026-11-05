const mongoose = require("mongoose");

// The admin's private notes about a customer. Customers themselves are worked
// out from orders (see customerController), so this only holds the notes.
const customerNoteSchema = new mongoose.Schema(
  {
    customerId: { type: String, required: true, unique: true },
    notes: { type: String, trim: true, maxlength: 2000, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CustomerNote", customerNoteSchema);
