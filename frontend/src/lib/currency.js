// Display currency for the shop. Prices are stored and charged in NPR; other
// currencies are converted for display with the rates from
// GET /api/currency/rates. The visitor's choice is kept in localStorage.

import { useSyncExternalStore } from "react";
import { API_BASE_URL } from "../services/apiService";

// Keep in step with backend/src/Config/currencies.js
export const CURRENCIES = {
  USD: { code: "USD", name: "US dollar" },
  NPR: { code: "NPR", name: "Nepali rupee" },
  CNY: { code: "CNY", name: "Chinese yuan" },
  INR: { code: "INR", name: "Indian rupee" },
};
export const BASE_CURRENCY = "NPR";
const DEFAULT_CURRENCY = (process.env.REACT_APP_DEFAULT_CURRENCY || "USD").toUpperCase();
const STORAGE_KEY = "wc_currency";

const readSaved = () => {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return CURRENCIES[saved] ? saved : null;
  } catch {
    return null;
  }
};

let state = {
  selected: readSaved() || (CURRENCIES[DEFAULT_CURRENCY] ? DEFAULT_CURRENCY : "USD"),
  rates: null, // response of /currency/rates
  status: "loading", // loading | ready | error
};
const listeners = new Set();
const emit = (changes) => {
  state = { ...state, ...changes };
  listeners.forEach((l) => l());
};
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const nprPerUnit = (code) => (code === BASE_CURRENCY ? 1 : state.rates?.nprPerUnit?.[code]);

// The currency prices are actually shown in: the visitor's choice, or NPR
// while its rate isn't known
export const activeCurrency = () => (nprPerUnit(state.selected) > 0 ? state.selected : BASE_CURRENCY);

export function setCurrency(code) {
  if (!CURRENCIES[code]) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, code);
  } catch {}
  emit({ selected: code });
}

let loading = null;
export function loadRates() {
  if (!loading) {
    loading = fetch(`${API_BASE_URL}/currency/rates`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((rates) => emit({ rates, status: "ready" }))
      .catch(() => {
        loading = null; // allow a retry on the next call
        emit({ status: "error" });
      });
  }
  return loading;
}

// NPR amount -> amount in `code` (null when the rate isn't known)
export function convertFromNpr(npr, code = activeCurrency()) {
  const rate = nprPerUnit(code);
  if (npr == null || Number.isNaN(Number(npr)) || !(rate > 0)) return null;
  return Number(npr) / rate;
}

// Amount in `code` -> NPR, e.g. for price filters typed in the shown currency
export function convertToNpr(amount, code = activeCurrency()) {
  const rate = nprPerUnit(code);
  if (amount === "" || amount == null || Number.isNaN(Number(amount)) || !(rate > 0)) return null;
  return Number(amount) * rate;
}

const formatters = {};
function formatter(code, decimals) {
  const key = `${code}-${decimals}`;
  if (!formatters[key]) {
    formatters[key] = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  return formatters[key];
}

// Rupees are shown whole; dollars and yuan keep cents on small amounts
const decimalsFor = (code, value) => (code === "NPR" || code === "INR" || Math.abs(value) >= 1000 ? 0 : 2);

export const formatNpr = (value) =>
  value == null || Number.isNaN(Number(value)) ? "—" : `Rs. ${Math.round(Number(value)).toLocaleString("en-US")}`;

/** Format an NPR amount in the shown currency, e.g. 34500 -> "$257" */
export function formatMoney(npr, code = activeCurrency()) {
  if (npr == null || Number.isNaN(Number(npr))) return "—";
  if (code === BASE_CURRENCY) return formatNpr(npr);
  const value = convertFromNpr(npr, code);
  if (value == null) return formatNpr(npr);
  return formatter(code, decimalsFor(code, value)).format(value);
}

/** Symbol of the shown currency, e.g. "$" or "Rs." */
export function currencySymbol(code = activeCurrency()) {
  if (code === BASE_CURRENCY) return "Rs.";
  const part = formatter(code, 0)
    .formatToParts(0)
    .find((p) => p.type === "currency");
  return part ? part.value : code;
}

// Re-renders the component when the currency or the rates change
export function useCurrency() {
  const snapshot = useSyncExternalStore(subscribe, () => state);
  const active = activeCurrency();
  return {
    selected: snapshot.selected,
    currency: active,
    isBase: active === BASE_CURRENCY,
    rates: snapshot.rates,
    status: snapshot.status,
    available: snapshot.rates?.currencies || [BASE_CURRENCY],
    setCurrency,
    format: (npr) => formatMoney(npr, active),
  };
}
