const mongoose = require('mongoose');
const customSpecificationSchema = require('./customSpecificationSchema');

// Order Schema for managing customer orders
const orderSchema = new mongoose.Schema({
  // Customer information
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  customerEmail: { type: String },
  customerAddress: { type: String },

  // Product reference (category is populated from product)
  product: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true 
  },
  
  // Order details
  quantity: { 
    type: Number, 
    required: true, 
    min: 1,
    default: 1
  },
  
  // Price snapshot at time of order
  silverPriceSnapshot: { 
    type: Number 
  }, // Silver price per tola at the time of order
  
  totalPrice: {
    type: Number
  }, // Calculated total price at time of order
  
  // Additional order information
  notes: { type: String },
  customization: { type: String }, // Free-text notes
  customSpecification: customSpecificationSchema, // For custom silver products

  // Stock keeping (see Services/stockService.js). stockTracked is set on
  // orders placed since stock keeping began; stockReserved is how many of the
  // product this order currently holds (0 once cancelled).
  stockTracked: { type: Boolean, default: false },
  stockReserved: { type: Number, default: 0, min: 0 },

  // Whether the order emails went out: "sent", "skipped: ..." or "failed: ..."
  emailStatus: {
    admin: String,
    customer: String,
    at: Date
  },

  // Order status: 'pending', 'contacted', 'confirmed', 'completed', 'cancelled'
  status: { 
    type: String, 
    enum: ['pending', 'contacted', 'confirmed', 'completed', 'cancelled'], 
    default: 'pending' 
  }

}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
