// Currencies the shop can show prices in. Prices are stored in NPR; the
// others are converted for display only. To add one, add its ISO code here
// and in frontend/src/lib/currency.js.
const BASE_CURRENCY = "NPR";
const SUPPORTED_CURRENCIES = ["NPR", "USD", "CNY", "INR"];

// The Nepali rupee is pegged to the Indian rupee at 1 INR = 1.6 NPR
const PEGGED_NPR_PER_UNIT = { INR: 1.6 };

module.exports = { BASE_CURRENCY, SUPPORTED_CURRENCIES, PEGGED_NPR_PER_UNIT };
