const mongoose = require("mongoose");

// One saved set of exchange rates. nprPerUnit.USD = 133.5 means
// 1 USD = 133.5 NPR.
const exchangeRateSchema = new mongoose.Schema(
  {
    base: { type: String, default: "NPR" },
    nprPerUnit: { type: Map, of: Number, required: true },
    // Date the source published the rates for (YYYY-MM-DD)
    rateDate: { type: String },
    source: { type: String, required: true },
    fetchedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ExchangeRate", exchangeRateSchema);
