const express = require("express");
const Product = require("../Model/productModel");
const Category = require("../Model/categoryModel");
const Blog = require("../Model/blogModel");
const router = express.Router();

// XML sitemap of the shop's public pages, for search engines. Links point at
// the shop website (SITE_URL), not at this API server; the shop's
// robots.txt tells search engines where to find this file.

const STATIC_PAGES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/products", changefreq: "daily", priority: "0.9" },
  { path: "/blog", changefreq: "weekly", priority: "0.7" },
  { path: "/about", changefreq: "monthly", priority: "0.6" },
  { path: "/contact", changefreq: "monthly", priority: "0.6" },
  { path: "/privacy-policy", changefreq: "yearly", priority: "0.2" },
  { path: "/terms", changefreq: "yearly", priority: "0.2" },
  { path: "/refund-policy", changefreq: "yearly", priority: "0.3" },
];

const escapeXml = (text) =>
  String(text).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]);

const date = (value) => (value ? new Date(value).toISOString().slice(0, 10) : undefined);

function urlEntry({ loc, lastmod, changefreq, priority }) {
  return [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod && `    <lastmod>${lastmod}</lastmod>`,
    changefreq && `    <changefreq>${changefreq}</changefreq>`,
    priority && `    <priority>${priority}</priority>`,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

router.get("/sitemap.xml", async (req, res) => {
  try {
    const site = (process.env.SITE_URL || process.env.FRONTEND_URL || "").replace(/\/+$/, "");
    if (!site) return res.status(503).type("text/plain").send("Set SITE_URL in backend/.env to the shop's public address.");

    const [products, categories, posts] = await Promise.all([
      Product.find({ isActive: { $ne: false } }, "_id updatedAt").lean(),
      Category.find({}, "_id updatedAt").lean(),
      Blog.find({ status: "published" }, "slug updatedAt").lean(),
    ]);

    const entries = [
      ...STATIC_PAGES.map((p) => ({ loc: `${site}${p.path}`, changefreq: p.changefreq, priority: p.priority })),
      ...categories.map((c) => ({ loc: `${site}/products?category=${c._id}`, lastmod: date(c.updatedAt), changefreq: "weekly", priority: "0.8" })),
      ...products.map((p) => ({ loc: `${site}/product/${p._id}`, lastmod: date(p.updatedAt), changefreq: "weekly", priority: "0.8" })),
      ...posts.map((p) => ({ loc: `${site}/blog/${p.slug}`, lastmod: date(p.updatedAt), changefreq: "monthly", priority: "0.6" })),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries
      .map(urlEntry)
      .join("\n")}\n</urlset>\n`;
    res.set("Cache-Control", "public, max-age=3600").type("application/xml").send(xml);
  } catch (error) {
    console.error("Sitemap error:", error);
    res.status(500).type("text/plain").send("Could not build the sitemap");
  }
});

module.exports = router;
