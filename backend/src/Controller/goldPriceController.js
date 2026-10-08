const GoldPrice = require("../Model/goldPriceModel");
const { scrapeGoldPrice } = require("../Services/goldPriceScraper");

// Helper to get Nepal date (midnight)
function getNepalDate() {
  const now = new Date();
  const nepalTime = new Date(now.getTime() + (5 * 60 + 45) * 60 * 1000);
  nepalTime.setHours(0, 0, 0, 0);
  return nepalTime;
}

// Fetch and save price if new
exports.fetchAndSavePrice = async () => {
  const { price, scrapedAt, dailyChange } = await scrapeGoldPrice();
  const effectiveDate = getNepalDate();

  const existing = await GoldPrice.findOne({ effectiveDate });

  if (!existing) {
    await GoldPrice.create({
      pricePerTola: price,
      effectiveDate,
      lastScrapedAt: scrapedAt,
      dailyChange: dailyChange 
    });
    console.log(
      `✅ New price saved: ${price} on ${effectiveDate.toDateString()}`
    );
    return { price, saved: true, dailyChange  };
  }

  if (existing.pricePerTola !== price && scrapedAt > existing.lastScrapedAt) {
    existing.pricePerTola = price;
    existing.lastScrapedAt = scrapedAt;
    await existing.save();
    console.log(
      `🔄 Price updated: ${price} on ${effectiveDate.toDateString()}`
    );
    return { price, saved: true, dailyChange  };
  }

  console.log("ℹ️ Price unchanged, no update needed.");
  return { price, saved: false, dailyChange  };
};

// Manual test scrape
exports.testScraping = async (req, res) => {
  try {
    const { price, scrapedAt, dailyChange } = await scrapeGoldPrice();
    res.status(200).json({ message: "Scraping successful", price, scrapedAt, dailyChange  });
  } catch (err) {
    res.status(500).json({ message: "Scraping failed", error: err.message });
  }
};

// Get latest price
exports.getLatestPrice = async (req, res) => {
  try {
    const latest = await GoldPrice.findOne().sort({ effectiveDate: -1 });
    if (!latest) {
      return res.status(404).json({ message: "No gold price found" });
    }
    res.status(200).json(latest);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch latest price", error: err.message });
  }
};

// Get price history
exports.getPriceHistory = async (req, res) => {
  try {
    const { limit = 30, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const history = await GoldPrice.find()
      .sort({ effectiveDate: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await GoldPrice.countDocuments();

    res.status(200).json({
      history,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
        hasNext: skip + history.length < total,
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch history", error: err.message });
  }
};
