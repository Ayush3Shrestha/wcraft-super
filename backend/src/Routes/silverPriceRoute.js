const express = require("express");
const router = express.Router();
const authMiddleware = require("../Middleware/authMiddleware");
const controller = require("../Controller/silverPriceController");
const { fetchAndSavePrice } = require("../Controller/silverPriceController");

// Manual trigger to fetch & save silver price
exports.updateSilver = router.post("/silver/update", authMiddleware, async (req, res) => {
  try {
    const result = await fetchAndSavePrice();
    res.status(200).json({ message: "Silver price updated", result });
  } catch (error) {
    res.status(500).json({ message: "Error updating silver price", error: error.message });
  }
});



router.get("/silver/test-scrape", authMiddleware, controller.testScraping);
router.get("/silver/today", controller.getLatestPrice);
router.get("/silver/history", controller.getPriceHistory);

module.exports = router;
