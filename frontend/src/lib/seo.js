import { useEffect } from "react";
import { SHOP } from "./shopInfo";
import { imageUrl } from "./productDisplay";

// Page titles, descriptions, social cards and structured data for search
// engines. The site is a single-page app, so each page sets its own <head>
// tags with useSeo() when it renders.

export const SITE_NAME = "Welcome Craft";

// The public address of the shop, e.g. https://welcomecraft.com.np
// (REACT_APP_SITE_URL), used for canonical links and social cards
export const SITE_URL = (process.env.REACT_APP_SITE_URL || window.location.origin).replace(/\/+$/, "");

export const DEFAULT_DESCRIPTION =
  "Handcrafted Buddhist statues and ornaments in silver, gold finishes, copper and bronze from Patan, Lalitpur. Silver priced on the day's rate; custom pieces made to order.";

const DEFAULT_IMAGE = "/images/hero-tara.webp";

export const absoluteUrl = (path = "/") => {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
};

// Product and blog images live on the API server; site images in /public
const absoluteImage = (path) => {
  if (!path) return absoluteUrl(DEFAULT_IMAGE);
  if (path.startsWith("/uploads/")) return imageUrl(path);
  return absoluteUrl(path);
};

// Plain text for meta descriptions: one line, at most ~160 characters
export function metaText(text = "", length = 160) {
  const flat = String(text).replace(/\s+/g, " ").trim();
  if (flat.length <= length) return flat;
  return `${flat.slice(0, length - 1).replace(/\s+\S*$/, "")}…`;
}

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (content == null || content === "") {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = href;
}

function setJsonLd(data) {
  const id = "wc-jsonld";
  let el = document.getElementById(id);
  if (!data) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(Array.isArray(data) ? { "@context": "https://schema.org", "@graph": data } : { "@context": "https://schema.org", ...data });
}

/**
 * Set the page's <head> tags.
 *   title        page title; " · Welcome Craft" is added
 *   description  meta / social description
 *   path         canonical path (defaults to the current path, no query)
 *   image        social card image (site path, /uploads path or full URL)
 *   type         og:type ("website", "article", "product")
 *   noindex      keep the page out of search results (cart, admin, ...)
 *   jsonLd       structured data object(s) for this page
 * Pass `ready: false` while the page's data is still loading.
 */
export function useSeo({ title, description, path, image, type = "website", noindex = false, jsonLd, ready = true }) {
  const json = jsonLd ? JSON.stringify(jsonLd) : "";
  useEffect(() => {
    if (!ready) return;
    const fullTitle = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} · Handcrafted Buddhist Statues from Patan, Nepal`;
    const desc = metaText(description || DEFAULT_DESCRIPTION);
    const url = absoluteUrl(path || window.location.pathname);
    const img = absoluteImage(image);

    document.title = fullTitle;
    setMeta("name", "description", desc);
    setMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large");
    setCanonical(url);

    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", desc);
    setMeta("property", "og:type", type);
    setMeta("property", "og:url", url);
    setMeta("property", "og:image", img);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", desc);
    setMeta("name", "twitter:image", img);

    setJsonLd(json ? JSON.parse(json) : null);
  }, [title, description, path, image, type, noindex, json, ready]);
}

// --- Structured data (schema.org) -----------------------------------------

export function storeJsonLd() {
  return {
    "@type": "Store",
    "@id": `${SITE_URL}/#store`,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    image: absoluteUrl(DEFAULT_IMAGE),
    logo: absoluteUrl("/logo512.png"),
    description: DEFAULT_DESCRIPTION,
    telephone: SHOP.phone ? `+977${SHOP.phone.replace(/\D/g, "").replace(/^977/, "")}` : undefined,
    email: SHOP.email || undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: `${SHOP.addressLines[0]}, ${SHOP.addressLines[1]}`,
      addressLocality: "Lalitpur",
      addressRegion: "Bagmati",
      addressCountry: "NP",
    },
    geo: { "@type": "GeoCoordinates", latitude: 27.669319, longitude: 85.327684 },
    hasMap: SHOP.mapsUrl,
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "10:00",
      closes: "19:00",
    },
    currenciesAccepted: "NPR",
    sameAs: Object.values(SHOP.social).filter(Boolean),
  };
}

export function websiteJsonLd() {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    publisher: { "@id": `${SITE_URL}/#store` },
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/products?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
