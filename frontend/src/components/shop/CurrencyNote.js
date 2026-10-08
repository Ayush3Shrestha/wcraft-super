import React from "react";
import { formatNpr, useCurrency, CURRENCIES } from "../../lib/currency";

// "≈ Rs. 34,500" under an amount shown in another currency
export function NprEquivalent({ npr, className = "", style }) {
  const { isBase } = useCurrency();
  if (isBase || npr == null) return null;
  return (
    <span className={className} style={{ color: "var(--wc-ink-muted)", ...style }}>
      {formatNpr(npr)} NPR
    </span>
  );
}

const formatDate = (iso) => {
  const d = iso ? new Date(`${iso}T00:00:00`) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;
};

// Explains that converted prices are approximate and orders are in NPR
export function CurrencyDisclaimer({ className = "", style }) {
  const { isBase, currency, rates } = useCurrency();
  if (isBase) return null;
  const date = formatDate(rates?.rateDate);
  const rate = rates?.nprPerUnit?.[currency];
  return (
    <p className={`text-xs ${className}`} style={{ color: "var(--wc-ink-muted)", ...style }}>
      Prices in {CURRENCIES[currency]?.name || currency}s are approximate
      {rate ? ` (1 ${currency} ≈ Rs. ${rate.toFixed(2)}` : ""}
      {rate && rates?.source ? `, ${rates.source}` : ""}
      {rate && date ? ` ${date}` : ""}
      {rate ? ")" : ""}. Orders are confirmed and paid in Nepali rupees.
    </p>
  );
}
