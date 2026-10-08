const axios = require("axios");
const cheerio = require("cheerio");

async function scrapeGoldPrice() {
  try {
    const { data: html } = await axios.get(process.env.GOLD_PRICE_API_URL);
    const $ = cheerio.load(html);

    // Select the td with background-color: gold
    const goldCell = $("td[style*='background-color: #D4AF37']");

    if (!goldCell.length) {
      throw new Error("Gold cell not found on sharesansar.com");
    }

    // Get price text inside <p>
    const priceText = goldCell.find("h4 p").text().trim();

    // Clean the value -> remove "Rs.", commas, and "/tola"
    const price = parseFloat(priceText.replace(/Rs\.|,|\/tola/gi, "").trim());

    if (isNaN(price)) {
      throw new Error(`Parsed gold price is invalid: ${priceText}`);
    }
    // Extract the daily change text
    const changeText = goldCell.find("h5 p b font").text().trim();
    const dailyChange = changeText ? changeText.replace(/[()]/g, "").trim() : 0;

    const scrapedAt = new Date();
    console.log(
      `✅ Scraped gold price: Nrs. ${price} and Change: ${dailyChange}`
    );
    return { price, scrapedAt, dailyChange };
  } catch (err) {
    console.error("❌ Error scraping gold price:", err.message);
    throw err;
  }
}

module.exports = { scrapeGoldPrice };

// Test run
