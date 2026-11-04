const mongoose = require("mongoose");

// What a customer said about the shop, added by the admin. Hidden until
// the admin publishes it.
const testimonialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    location: { type: String, trim: true, maxlength: 80 },
    quote: { type: String, required: true, trim: true, maxlength: 600 },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    photo: { type: String },
    isPublished: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Testimonial", testimonialSchema);
