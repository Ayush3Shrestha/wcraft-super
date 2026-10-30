// CORS and CSRF protection for the API.
//
// The API uses no cookies: admins send a JWT in the Authorization header and
// the cart is identified by an ID in the URL. Browsers never attach those on
// their own, so a forged form on another site can't act as a logged-in admin.
// The checks below add defence in depth, and keep the API safe if cookies
// are ever introduced:
//
//  1. CORS only lets the shop's own websites read API responses or send
//     custom headers (everything else is refused by the browser).
//  2. Every write request (POST, PUT, PATCH, DELETE) must
//     - not come from a website outside that list (Origin / Referer /
//       Sec-Fetch-Site), and
//     - carry the header `X-Requested-With: XMLHttpRequest`. HTML forms can't
//       set custom headers, and other sites' scripts can't send one without
//       passing CORS, so a cross-site forgery can't produce it.
//
// Scripts and tools (curl, Postman) can still call the API by adding that
// header; they send no Origin, so the origin check doesn't apply to them.

const CSRF_HEADER = "x-requested-with";
const CSRF_VALUE = "XMLHttpRequest";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const isProduction = process.env.NODE_ENV === "production";

const normalise = (url) => {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

// Sites allowed to call the API: CORS_ORIGINS (comma separated) and SITE_URL
const configuredOrigins = new Set(
  [...String(process.env.CORS_ORIGINS || "").split(","), process.env.SITE_URL].map((o) => o && normalise(o.trim())).filter(Boolean)
);

// During development any localhost port is fine (React dev server, previews)
const isLocalDev = (origin) => !isProduction && /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);

const isAllowedOrigin = (origin) => configuredOrigins.has(origin) || isLocalDev(origin);

if (isProduction && configuredOrigins.size === 0) {
  console.warn("CORS: no CORS_ORIGINS or SITE_URL set, so browsers on other sites can't use the API, including the shop itself.");
}

const corsOptions = {
  origin(origin, callback) {
    // No Origin: same-origin requests, <img> loads, crawlers, server-to-server
    if (!origin) return callback(null, true);
    // Unknown sites get no CORS headers, so the browser blocks the response
    return callback(null, isAllowedOrigin(origin));
  },
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: false,
  maxAge: 600, // cache preflight results for 10 minutes
};

function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const reject = (reason) => {
    console.warn(`CSRF check failed (${reason}): ${req.method} ${req.originalUrl}`);
    return res.status(403).json({ message: "Request blocked by CSRF protection" });
  };

  // Where the request came from, if the browser says so
  const origin = req.get("origin") || (req.get("referer") && normalise(req.get("referer")));
  if (origin && origin !== "null" && !isAllowedOrigin(origin)) return reject(`origin ${origin}`);
  if (origin === "null") return reject("opaque origin");
  // Modern browsers also label cross-site requests directly
  if (req.get("sec-fetch-site") === "cross-site" && !(origin && isAllowedOrigin(origin))) return reject("cross-site");

  if (req.get(CSRF_HEADER) !== CSRF_VALUE) return reject(`missing ${CSRF_HEADER} header`);

  next();
}

module.exports = { corsOptions, csrfProtection, isAllowedOrigin, CSRF_HEADER, CSRF_VALUE };
