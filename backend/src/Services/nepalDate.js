// The price records are stored per calendar day in Nepal. This works the day
// out from the UTC clock only, so it's the same on any server timezone.

const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// The moment the current Nepal day began (midnight NPT, 18:15 UTC the day before)
function getNepalDate(now = new Date()) {
  const nepalMs = now.getTime() + NEPAL_OFFSET_MS;
  return new Date(Math.floor(nepalMs / DAY_MS) * DAY_MS - NEPAL_OFFSET_MS);
}

// "2026-11-04": the Nepal day a moment falls on
const formatNepalDate = (date) => new Date(date.getTime() + NEPAL_OFFSET_MS).toISOString().slice(0, 10);

module.exports = { getNepalDate, formatNepalDate };
