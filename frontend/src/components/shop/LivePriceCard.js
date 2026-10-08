import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useCurrency } from "../../lib/currency";

// "+20" / "-15" / "0" (NPR) -> { text, direction }, the amount in the shown currency
function describeChange(change, format) {
  const text = change == null ? "" : String(change).trim();
  const amount = Number(text.replace(/[^\d.]/g, ""));
  const shown = amount > 0 ? format(amount) : text.replace(/^[+-]/, "");
  if (text.startsWith("+")) return { text: `+${shown}`, direction: "up" };
  if (text.startsWith("-")) return { text: `-${shown}`, direction: "down" };
  return { text: text && text !== "0" ? `~${shown}` : "No change", direction: "flat" };
}

// Today's silver or gold rate per tola, for dark backgrounds
export default function LivePriceCard({ label, price }) {
  const { format } = useCurrency();
  const change = describeChange(price.dailyChange, format);
  const Icon = change.direction === "down" ? TrendingDown : TrendingUp;
  return (
    <div className="wc-price-card">
      {/* Label and daily change on one row, the amount on its own row, so
          long amounts (e.g. a gold rate in rupees) don't push anything out */}
      <div className="flex items-center justify-between gap-2">
        <div className="wc-price-label min-w-0">{label}</div>
        <span
          className={`wc-price-change ${
            change.direction === "up" ? "wc-change-up" : change.direction === "down" ? "wc-change-down" : ""
          }`}
        >
          {change.direction !== "flat" && <Icon size={13} />}
          {change.text}
        </span>
      </div>
      <div className="wc-price-value mt-1">
        <span>{format(price.pricePerTola)}</span> <span className="wc-price-unit">/ tola</span>
      </div>
      {price.lastScrapedAt && (
        <p className="text-xs mt-auto pt-1" style={{ color: "var(--wc-on-dark-muted)" }}>
          Updated {new Date(price.lastScrapedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
