const axios = require("axios");
const cheerio = require("cheerio");

async function scrapeSilverPrice() {
  try {
    const { data: html } = await axios.get(process.env.SILVER_PRICE_API_URL);
    const $ = cheerio.load(html);

    // Select the td with background-color: silver
    const silverCell = $("td[style*='background-color: silver']");

    if (!silverCell.length) {
      throw new Error("Silver cell not found on sharesansar.com");
    }

    // Get price text inside <p>
    const priceText = silverCell.find("h4 p").text().trim();

    // Clean the value -> remove "Rs.", commas, and "/tola"
    const price = parseFloat(priceText.replace(/Rs\.|,|\/tola/gi, "").trim());

    if (isNaN(price)) {
      throw new Error(`Parsed silver price is invalid: ${priceText}`);
    }

    // Extract the daily change text
    const changeText = silverCell.find("h5 p b font").text().trim();
    const dailyChange = changeText
      ? changeText.replace(/[()]/g, "").trim()
      : 0;

    const scrapedAt = new Date();
    console.log(
      `✅ Scraped silver price: Nrs. ${price}, Change: ${dailyChange}`
    );
    return { price, scrapedAt, dailyChange };
  } catch (err) {
    console.error("❌ Error scraping silver price:", err.message);
    throw err;
  }
}

module.exports = { scrapeSilverPrice };

// Test run
