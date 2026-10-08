const axios = require("axios");
const ExchangeRate = require("../Model/exchangeRateModel");
const { BASE_CURRENCY, SUPPORTED_CURRENCIES, PEGGED_NPR_PER_UNIT } = require("../Config/currencies");

// Rates are fetched at most this often; in between they come from memory or
// the database. Exchange rates for display don't need to be fresher.
const REFRESH_MS = 6 * 60 * 60 * 1000;
// Saved rates older than this are flagged as stale
const STALE_MS = 3 * 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 8000;
// After a failed fetch, try again sooner
const RETRY_MS = 30 * 60 * 1000;

const wanted = SUPPORTED_CURRENCIES.filter((c) => c !== BASE_CURRENCY);
const isoDate = (d) => d.toISOString().slice(0, 10);

// Nepal Rastra Bank's official rates (NPR per `unit` of each currency).
// Rates aren't published on every day, so ask for the last week and use the
// most recent day. The mid-point of buy and sell is used.
async function fetchFromNrb() {
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  const { data } = await axios.get("https://www.nrb.org.np/api/forex/v1/rates", {
    params: { from: isoDate(from), to: isoDate(to), per_page: 100, page: 1 },
    timeout: TIMEOUT_MS,
  });
  const days = (data?.data?.payload || []).filter((d) => Array.isArray(d.rates) && d.rates.length);
  if (!days.length) throw new Error("NRB returned no rates");
  days.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const latest = days[0];

  const nprPerUnit = {};
  for (const r of latest.rates) {
    const code = r.currency?.iso3;
    const unit = Number(r.currency?.unit) || 1;
    const buy = Number(r.buy);
    const sell = Number(r.sell);
    const mid = buy > 0 && sell > 0 ? (buy + sell) / 2 : buy || sell;
    if (wanted.includes(code) && mid > 0) nprPerUnit[code] = mid / unit;
  }
  return { nprPerUnit, rateDate: String(latest.date).slice(0, 10), source: "Nepal Rastra Bank" };
}

// Fallback: open.er-api.com (free, no key), given as units per 1 NPR
async function fetchFromOpenErApi() {
  const { data } = await axios.get(`https://open.er-api.com/v6/latest/${BASE_CURRENCY}`, { timeout: TIMEOUT_MS });
  if (data?.result !== "success" || !data.rates) throw new Error("open.er-api returned no rates");
  const nprPerUnit = {};
  for (const code of wanted) {
    const perNpr = Number(data.rates[code]);
    if (perNpr > 0) nprPerUnit[code] = 1 / perNpr;
  }
  const updated = data.time_last_update_unix ? new Date(data.time_last_update_unix * 1000) : new Date();
  return { nprPerUnit, rateDate: isoDate(updated), source: "open.er-api.com" };
}

// Optional manual rates from .env, e.g. FX_NPR_PER_UNIT=USD:135.2,CNY:18.7
function ratesFromEnv() {
  const raw = process.env.FX_NPR_PER_UNIT;
  if (!raw) return null;
  const nprPerUnit = {};
  raw.split(",").forEach((pair) => {
    const [code, value] = pair.split(":").map((s) => s.trim());
    if (wanted.includes(code?.toUpperCase()) && Number(value) > 0) nprPerUnit[code.toUpperCase()] = Number(value);
  });
  return Object.keys(nprPerUnit).length ? { nprPerUnit, rateDate: null, source: "manual (FX_NPR_PER_UNIT)" } : null;
}

// Fill in pegged currencies and drop anything we don't show
function complete(nprPerUnit) {
  const out = {};
  for (const code of wanted) {
    const value = nprPerUnit[code] ?? PEGGED_NPR_PER_UNIT[code];
    if (value > 0) out[code] = Math.round(value * 10000) / 10000;
  }
  return out;
}

async function fetchAndSaveRates() {
  const errors = [];
  for (const fetcher of [fetchFromNrb, fetchFromOpenErApi]) {
    try {
      const result = await fetcher();
      const nprPerUnit = complete(result.nprPerUnit);
      // Use a source only if it gave us at least one non-pegged currency
      if (!Object.keys(nprPerUnit).some((c) => !PEGGED_NPR_PER_UNIT[c] && result.nprPerUnit[c])) {
        throw new Error("no usable rates");
      }
      const doc = { base: BASE_CURRENCY, nprPerUnit, rateDate: result.rateDate, source: result.source, fetchedAt: new Date() };
      // Still use the rates if saving them fails
      await ExchangeRate.create(doc).catch((err) => console.error("⚠️ Couldn't save exchange rates:", err.message));
      return doc;
    } catch (err) {
      errors.push(`${fetcher.name}: ${err.message}`);
    }
  }
  throw new Error(`Could not fetch exchange rates (${errors.join("; ")})`);
}

const toResponse = (doc, { stale = false } = {}) => {
  const nprPerUnit = doc.nprPerUnit instanceof Map ? Object.fromEntries(doc.nprPerUnit) : { ...doc.nprPerUnit };
  return {
    base: BASE_CURRENCY,
    currencies: SUPPORTED_CURRENCIES.filter((c) => c === BASE_CURRENCY || nprPerUnit[c] > 0),
    nprPerUnit: { [BASE_CURRENCY]: 1, ...nprPerUnit },
    rateDate: doc.rateDate || null,
    source: doc.source,
    fetchedAt: doc.fetchedAt || null,
    stale: stale || (doc.fetchedAt ? Date.now() - new Date(doc.fetchedAt).getTime() > STALE_MS : false),
  };
};

let cached = null; // { response, until }
let inFlight = null;

// Latest rates for the API. Never throws: when nothing can be fetched or
// found it returns what it has (manual rates, or the pegged INR only).
async function getRates({ force = false } = {}) {
  if (!force && cached && Date.now() < cached.until) return cached.response;
  if (inFlight) return inFlight;

  let failed = false;
  inFlight = (async () => {
    try {
      const latest = await ExchangeRate.findOne()
        .sort({ fetchedAt: -1 })
        .lean()
        .catch(() => null);
      if (!force && latest && Date.now() - new Date(latest.fetchedAt).getTime() < REFRESH_MS) {
        return toResponse(latest);
      }
      try {
        return toResponse(await fetchAndSaveRates());
      } catch (err) {
        console.error("⚠️ Exchange rates:", err.message);
        failed = true;
        if (latest) return toResponse(latest);
        const manual = ratesFromEnv();
        if (manual) return toResponse({ ...manual, nprPerUnit: complete(manual.nprPerUnit) });
        return toResponse({ nprPerUnit: complete({}), source: "pegged rates only" }, { stale: true });
      }
    } finally {
      inFlight = null;
    }
  })().then((response) => {
    cached = { response, until: Date.now() + (failed ? RETRY_MS : REFRESH_MS) };
    return response;
  });
  return inFlight;
}

module.exports = { getRates, fetchAndSaveRates };
