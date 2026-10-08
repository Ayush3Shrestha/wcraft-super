const express = require("express");
const router = express.Router();
const controller = require("../Controller/goldPriceController");
const { fetchAndSavePrice } = require("../Controller/goldPriceController");

// Manual trigger to fetch & save gold price
exports.updateGold = router.post("/gold/update", async (req, res) => {
  try {
    const result = await fetchAndSavePrice();
    res.status(200).json({ message: "gold price updated", result });
  } catch (error) {
    res.status(500).json({ message: "Error updating gold price", error: error.message });
  }
});



router.get("/gold/test-scrape", controller.testScraping);
router.get("/gold/today", controller.getLatestPrice);
router.get("/gold/history", controller.getPriceHistory);

module.exports = router;
