const express = require("express");
const router = express.Router();
const { getRates } = require("../Services/currencyService");

// Exchange rates for showing NPR prices in other currencies
router.get("/currency/rates", async (req, res) => {
  const rates = await getRates();
  res.set("Cache-Control", "public, max-age=3600");
  res.json(rates);
});

module.exports = router;
