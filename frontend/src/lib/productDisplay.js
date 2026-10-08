import { SERVER_URL } from "../services/apiService";
import { formatMoney } from "./currency";

// Helpers shared by the shop pages and the admin panel for showing products

// Neutral placeholder used when a product has no image (or it fails to load)
export const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
      <rect width="400" height="400" fill="#f3efe7"/>
      <g fill="none" stroke="#b8ab95" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
        <rect x="120" y="130" width="160" height="130" rx="12"/>
        <circle cx="165" cy="175" r="14"/>
        <path d="M130 250l50-50 35 35 25-25 40 40"/>
      </g>
    </svg>`
  );

// Uploaded images are stored as "/uploads/<file>" on the backend server, so
// they need the server's address in front. Full URLs are used as they are.
export function imageUrl(path) {
  if (!path) return null;
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  return `${SERVER_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

export const productImages = (product) =>
  (product?.images || []).map(imageUrl).filter(Boolean);

export const productImage = (product) => productImages(product)[0] || PLACEHOLDER_IMAGE;

// Use on <img onError> so a missing file shows the placeholder, not a broken icon
export const fallbackToPlaceholder = (e) => {
  if (e.currentTarget.src !== PLACEHOLDER_IMAGE) e.currentTarget.src = PLACEHOLDER_IMAGE;
};

// Always in Nepali rupees (admin pages). The shop uses formatMoney from
// lib/currency.js, which shows the visitor's chosen currency.
export { formatNpr as formatRs } from "./currency";

export const isSilver = (p) => p?.productType === "silver";
export const isCustomSilver = (p) => isSilver(p) && p?.silverType === "custom";

const LABELS = {
  oxidized: "Oxidized",
  color: "Color",
  half_gold: "Half Gold",
  full_gold: "Full Gold",
  electroplated: "Electroplated",
  fire_gold_plated: "Fire Gold Plated",
};
export const label = (value) => LABELS[value] || value;

const capitalize = (v) => (v ? v[0].toUpperCase() + v.slice(1) : "");

// Short text for a product's variant, shown next to its category,
// e.g. "Full Gold · Fire Gold Plated"
export function variantLabel(p) {
  if (!p) return "";
  if (isCustomSilver(p)) return "Made to order";
  if (isSilver(p)) return p.weightInTola ? `${p.weightInTola} tola` : "Ready made";
  if (p.productType === "gold") return [label(p.goldFinish), p.platingMethod && label(p.platingMethod)].filter(Boolean).join(" · ");
  if (p.productType === "metal") return capitalize(p.finish);
  return "";
}

// Price text for product cards, using the pricing block the API returns.
// `format` turns an NPR amount into text (the visitor's currency by default).
export function priceLabel(p, format = formatMoney) {
  const pricing = p?.pricing;
  if (pricing?.price != null) return format(pricing.price);
  if (pricing?.priceRange) return `From ${format(pricing.priceRange.min)}`;
  if (p?.constantPrice != null) return format(p.constantPrice);
  return "Price on request";
}

export const DAY_MS = 24 * 60 * 60 * 1000;
