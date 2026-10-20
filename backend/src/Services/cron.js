const cron = require("node-cron");
const updateSilver = require("../Controller/silverPriceController").fetchAndSavePrice;
const updateGold = require("../Controller/goldPriceController").fetchAndSavePrice;
const { getRates } = require("./currencyService");



// Scrape silver and gold, each on its own so one failing doesn't skip the other.
// Returns true only if both succeeded.
async function runPriceUpdate(reason = "scheduled") {
  console.log(`🕐 Running ${reason} price updates...`);
  let ok = true;
  for (const [name, update] of [["Silver", updateSilver], ["Gold", updateGold]]) {
    try {
      const result = await update();
      console.log(`✅ ${name}: Price ${result.saved ? "saved" : "unchanged"} at Rs. ${result.price}`);
    } catch (error) {
      ok = false;
      console.error(`❌ ${name} price update failed:`, error.message);
    }
  }
  return ok;
}

// On server start/restart: update right away, retrying a few times in case
// the network or the source site isn't reachable yet
async function runStartupPriceUpdate({ attempts = 3, delayMs = 60 * 1000 } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (await runPriceUpdate(`startup (attempt ${attempt}/${attempts})`)) return;
    if (attempt < attempts) await new Promise((r) => setTimeout(r, delayMs));
  }
  console.error("❌ Startup price update gave up; the next scheduled run will try again.");
}

cron.schedule("*/15 5-13 * * *", () => runPriceUpdate());

// Refresh exchange rates every 6 hours (they're also fetched on demand)
cron.schedule("10 */6 * * *", async () => {
  const rates = await getRates({ force: true });
  console.log(`💱 Exchange rates from ${rates.source}${rates.stale ? " (stale)" : ""}`);
});

console.log("🕰️ Cron scheduled: Every 15 mins from 5 AM to 1 PM");
module.exports = { cron, runPriceUpdate, runStartupPriceUpdate };
