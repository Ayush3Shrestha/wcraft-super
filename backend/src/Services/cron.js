const cron = require("node-cron");
const updateSilver = require("../Controller/silverPriceController").fetchAndSavePrice;
const updateGold = require("../Controller/goldPriceController").fetchAndSavePrice;
const { getRates } = require("./currencyService");



cron.schedule("*/15 5-13 * * *", async () => {
  console.log("🕐 Running scheduled price updates...");
  try {
    const silverResult = await updateSilver();
    console.log(
      `✅ Silver Cron: Price ${
        silverResult.saved ? "saved" : "unchanged"
      } at Rs. ${silverResult.price}`
    );

    const goldResult = await updateGold();
    console.log(
      `✅ Gold Cron: Price ${goldResult.saved ? "saved" : "unchanged"} at Rs. ${
        goldResult.price
      }`
    );
  } catch (error) {
    console.error("❌ Cron job error:", error.message);
  }
});

// Refresh exchange rates every 6 hours (they're also fetched on demand)
cron.schedule("10 */6 * * *", async () => {
  const rates = await getRates({ force: true });
  console.log(`💱 Exchange rates from ${rates.source}${rates.stale ? " (stale)" : ""}`);
});

console.log("🕰️ Cron scheduled: Every 15 mins from 5 AM to 1 PM");
module.exports = cron;
