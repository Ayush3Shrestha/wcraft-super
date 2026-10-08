const nodemailer = require("nodemailer");

/*
 * Order emails, sent through any SMTP server (Gmail with an app password,
 * Zoho, Outlook, Brevo, your host's mail server, ...).
 *
 * One checkout sends at most two emails, however many items it has:
 *   - to the shop (ADMIN_EMAIL): the full order, Reply-To set to the customer
 *   - to the customer (if they gave an email): "we received your order, we'll
 *     contact you to confirm", Reply-To set to the shop
 * Emails are sent after the order is saved and the response has gone out,
 * so a slow or broken mail server never delays or fails an order. Each email
 * is retried a couple of times, and the result is recorded on the orders.
 *
 * Settings (.env):
 *   SMTP_HOST, SMTP_PORT (587 or 465), SMTP_SECURE (true for 465),
 *   SMTP_USER, SMTP_PASS
 *   EMAIL_FROM   e.g. "Welcome Craft <orders@welcomecraft.com>" (defaults to SMTP_USER)
 *   ADMIN_EMAIL  where new orders go; several addresses can be comma-separated
 *   SHOP_URL     optional, the shop's address for links in emails
 * Without SMTP_HOST, emails are skipped and a note is logged.
 */

const SHOP_NAME = "Welcome Craft";
const RETRIES = 2;

const env = (name) => (process.env[name] || "").trim();

let transporter = null;
let transporterKey = "";

function getTransporter() {
  const host = env("SMTP_HOST");
  if (!host) return null;
  const port = Number(env("SMTP_PORT")) || 587;
  const secure = env("SMTP_SECURE") ? env("SMTP_SECURE") === "true" : port === 465;
  const key = [host, port, secure, env("SMTP_USER")].join("|");
  if (!transporter || key !== transporterKey) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: env("SMTP_USER") ? { user: env("SMTP_USER"), pass: env("SMTP_PASS") } : undefined,
      // Reuse one connection for the admin and customer emails
      pool: true,
      maxConnections: 2,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });
    transporterKey = key;
  }
  return transporter;
}

const fromAddress = () => env("EMAIL_FROM") || (env("SMTP_USER") ? `${SHOP_NAME} <${env("SMTP_USER")}>` : "");
const adminRecipients = () =>
  env("ADMIN_EMAIL")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const isEmail = (v) => typeof v === "string" && /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(v.trim());

// --- formatting -------------------------------------------------------------

const escapeHtml = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
const oneLine = (v) => String(v ?? "").replace(/[\r\n]+/g, " ").trim();
const rs = (v) => (v == null ? "To be quoted" : `Rs. ${Math.round(Number(v)).toLocaleString("en-US")}`);
// Dates in Nepal time, whatever the server's timezone
const TZ = "Asia/Kathmandu";
const date = (v) => (v ? new Date(v).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: TZ }) : "");
const dateTime = (v) => new Date(v).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: TZ });
const orderRef = (id) => String(id).slice(-6).toUpperCase();

// Lines describing one ordered item (custom silver details, notes)
function itemDetails(item) {
  const lines = [];
  const p = item.product || {};
  if (p.category?.name) lines.push(`Category: ${p.category.name}`);
  const spec = item.customSpecification;
  if (spec && spec.preferredWeight != null) {
    lines.push(`Weight: ${spec.preferredWeight} tola`);
    const size = spec.size || {};
    const dims = [size.height, size.width, size.length].filter(Boolean).join(" × ");
    if (dims) lines.push(`Size: ${dims} ${size.unit || "inch"}`);
    if (spec.design) lines.push(`Design: ${spec.design}`);
    if (spec.designNotes) lines.push(`Design notes: ${spec.designNotes}`);
    if (spec.requiredBy) lines.push(`Needed by: ${date(spec.requiredBy)}`);
    if (spec.estimatedCompletion?.latest) lines.push(`Estimated ready by: ${date(spec.estimatedCompletion.latest)}`);
  }
  if (item.silverPriceSnapshot) lines.push(`Silver rate: ${rs(item.silverPriceSnapshot)}/tola`);
  if (item.customization) lines.push(`Note: ${item.customization}`);
  return lines;
}

/**
 * Normalise what was ordered into one shape for the templates.
 * `orders` are saved Order documents (one per item) with `product` populated
 * or passed alongside as `products` (same order).
 */
function buildSummary(orders, products = []) {
  const first = orders[0];
  const items = orders.map((o, i) => {
    const product = (o.product && o.product.title ? o.product : products[i]) || {};
    return {
      ref: orderRef(o._id),
      title: product.title || "Product",
      quantity: o.quantity,
      total: o.totalPrice,
      unit: o.totalPrice != null && o.quantity ? o.totalPrice / o.quantity : null,
      details: itemDetails({ ...o.toObject?.() ?? o, product }),
    };
  });
  const priced = items.every((i) => i.total != null);
  return {
    refs: items.map((i) => i.ref),
    items,
    total: priced ? items.reduce((s, i) => s + i.total, 0) : null,
    customer: {
      name: first.customerName,
      phone: first.customerPhone,
      email: first.customerEmail,
      address: first.customerAddress,
    },
    notes: first.notes,
    placedAt: first.createdAt || new Date(),
  };
}

const shopUrl = () => env("SHOP_URL").replace(/\/$/, "");

// Shared HTML wrapper in the shop's colours
function layout({ heading, intro, body }) {
  return `<!doctype html><html><body style="margin:0;background:#f4efe7;font-family:Arial,Helvetica,sans-serif;color:#2a1a17">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe7;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fffdf9;border-radius:8px;overflow:hidden;border:1px solid #e6dccd">
<tr><td style="background:#430a12;padding:20px 24px;color:#f8d058;font-family:Georgia,serif;font-size:20px;letter-spacing:1px">${SHOP_NAME.toUpperCase()}</td></tr>
<tr><td style="padding:24px">
<h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:22px;color:#430a12">${heading}</h1>
<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#6b5a52">${intro}</p>
${body}
</td></tr>
<tr><td style="padding:16px 24px;background:#f1ece4;font-size:12px;color:#6b5a52;line-height:1.6">
${SHOP_NAME} · Mahabuddha Temple Road, Patan Sundhara, Lalitpur, Nepal${shopUrl() ? ` · <a href="${escapeHtml(shopUrl())}" style="color:#890d20">${escapeHtml(shopUrl().replace(/^https?:\/\//, ""))}</a>` : ""}
</td></tr></table></td></tr></table></body></html>`;
}

function itemsTable(summary) {
  const rows = summary.items
    .map(
      (i) => `<tr>
<td style="padding:10px 0;border-bottom:1px solid #eee4d6;vertical-align:top;font-size:14px">
<strong>${escapeHtml(i.title)}</strong> <span style="color:#8a6d12;font-size:11px">#${i.ref}</span>
${i.details.map((d) => `<div style="font-size:12px;color:#6b5a52;margin-top:2px">${escapeHtml(d)}</div>`).join("")}
</td>
<td style="padding:10px 8px;border-bottom:1px solid #eee4d6;vertical-align:top;font-size:14px;text-align:center;white-space:nowrap">× ${i.quantity}</td>
<td style="padding:10px 0;border-bottom:1px solid #eee4d6;vertical-align:top;font-size:14px;text-align:right;white-space:nowrap">${rs(i.total)}</td>
</tr>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}
<tr><td colspan="2" style="padding:12px 0 0;font-size:14px;font-weight:bold">Estimated total</td>
<td style="padding:12px 0 0;font-size:16px;font-weight:bold;text-align:right;color:#430a12;white-space:nowrap">${rs(summary.total)}</td></tr></table>`;
}

const itemsText = (summary) =>
  summary.items
    .map((i) => [`- ${i.title} (#${i.ref}) × ${i.quantity}: ${rs(i.total)}`, ...i.details.map((d) => `    ${d}`)].join("\n"))
    .join("\n") + `\n\nEstimated total: ${rs(summary.total)}`;

function customerBlock(c, notes) {
  const rows = [
    ["Name", c.name],
    ["Phone", c.phone],
    ["Email", c.email],
    ["Address", c.address],
    ["Notes", notes],
  ].filter(([, v]) => v);
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:20px;font-size:14px;line-height:1.6">
${rows.map(([k, v]) => `<tr><td style="padding-right:16px;color:#6b5a52;vertical-align:top">${k}</td><td>${escapeHtml(v).replace(/\n/g, "<br>")}</td></tr>`).join("")}</table>`;
}

function adminEmail(summary) {
  const c = summary.customer;
  const subject = oneLine(`New order ${summary.refs.join(", ")} from ${c.name} · ${rs(summary.total)}`);
  const html = layout({
    heading: "New order received",
    intro: `Placed ${escapeHtml(dateTime(summary.placedAt))} (Nepal time). Contact the customer to confirm availability, the final price, payment and delivery, then update the status in the admin panel.`,
    body:
      itemsTable(summary) +
      customerBlock(c, summary.notes) +
      (shopUrl()
        ? `<p style="margin:24px 0 0"><a href="${escapeHtml(shopUrl())}/admin/orders" style="display:inline-block;background:#430a12;color:#f8d058;padding:10px 18px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:bold">Open orders in the admin panel</a></p>`
        : ""),
  });
  const text = `New order ${summary.refs.join(", ")}\n\n${itemsText(summary)}\n\nCustomer\nName: ${c.name}\nPhone: ${c.phone}${
    c.email ? `\nEmail: ${c.email}` : ""
  }${c.address ? `\nAddress: ${c.address}` : ""}${summary.notes ? `\nNotes: ${summary.notes}` : ""}\n`;
  return { subject, html, text };
}

function customerEmail(summary) {
  const c = summary.customer;
  const subject = oneLine(`We've received your order (${summary.refs.join(", ")}) · ${SHOP_NAME}`);
  const intro = `Thank you, ${escapeHtml(c.name)}. Your order has been placed and is waiting for confirmation from our team. We'll contact you on <strong>${escapeHtml(
    c.phone
  )}</strong> to confirm availability, the final price, payment and delivery. There's nothing to pay yet.`;
  const html = layout({
    heading: "Your order has been placed",
    intro,
    body:
      `<p style="margin:0 0 12px;font-size:13px;color:#6b5a52">Order reference: <strong style="color:#430a12">${summary.refs.join(", ")}</strong></p>` +
      itemsTable(summary) +
      `<p style="margin:16px 0 0;font-size:12px;color:#6b5a52;line-height:1.6">Prices are in Nepali rupees. Silver prices follow the day's silver rate, so the final price is confirmed with you before you pay. Custom pieces are made after we confirm the details with you.</p>` +
      `<p style="margin:16px 0 0;font-size:14px;line-height:1.6">Questions? Just reply to this email.</p>`,
  });
  const text = `Thank you, ${c.name}.\n\nYour order has been placed and is waiting for confirmation from our team. We'll contact you on ${c.phone} to confirm availability, the final price, payment and delivery. There's nothing to pay yet.\n\nOrder reference: ${summary.refs.join(
    ", "
  )}\n\n${itemsText(summary)}\n\nPrices are in Nepali rupees and are confirmed with you before you pay.\nQuestions? Just reply to this email.\n\n${SHOP_NAME}`;
  return { subject, html, text };
}

// --- sending ----------------------------------------------------------------

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function sendWithRetry(message) {
  const transport = getTransporter();
  let lastError;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      return await transport.sendMail(message);
    } catch (err) {
      lastError = err;
      // Bad address or rejected login won't get better by retrying
      if (err.responseCode && err.responseCode >= 500) break;
      if (err.code === "EAUTH" || err.code === "EENVELOPE") break;
      if (attempt < RETRIES) await wait(2000 * (attempt + 1));
    }
  }
  throw lastError;
}

/**
 * Send the shop and customer emails for a set of orders placed together.
 * Never throws; resolves to { admin, customer } with "sent", "skipped: ..."
 * or "failed: ..." and records it on the orders (emailStatus).
 */
async function sendOrderEmails(orders, { products, notifyAdmin = true, notifyCustomer = true } = {}) {
  const result = { admin: "skipped", customer: "skipped" };
  try {
    if (!orders?.length) return result;
    if (!getTransporter()) {
      result.admin = result.customer = "skipped: SMTP_HOST not set";
      console.log("✉️  Order emails skipped: SMTP is not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS, ADMIN_EMAIL).");
      return result;
    }

    const summary = buildSummary(orders, products);
    const from = fromAddress();
    const admins = adminRecipients();
    const customerAddress = isEmail(summary.customer.email) ? summary.customer.email.trim() : null;

    const jobs = [];
    if (!notifyAdmin) result.admin = "skipped: not requested";
    else if (!admins.length) result.admin = "skipped: ADMIN_EMAIL not set";
    else {
      const mail = adminEmail(summary);
      jobs.push(
        sendWithRetry({ from, to: admins, replyTo: customerAddress || undefined, ...mail })
          .then(() => (result.admin = "sent"))
          .catch((err) => (result.admin = `failed: ${err.message}`))
      );
    }

    if (!notifyCustomer) result.customer = "skipped: not requested";
    else if (!customerAddress) result.customer = "skipped: no customer email";
    else {
      const mail = customerEmail(summary);
      jobs.push(
        sendWithRetry({ from, to: customerAddress, replyTo: admins[0] || undefined, ...mail })
          .then(() => (result.customer = "sent"))
          .catch((err) => (result.customer = `failed: ${err.message}`))
      );
    }

    await Promise.all(jobs);
    const failed = [result.admin, result.customer].filter((r) => r.startsWith("failed"));
    if (failed.length) console.error(`✉️  Order ${summary.refs.join(", ")} emails: admin ${result.admin}; customer ${result.customer}`);
    else console.log(`✉️  Order ${summary.refs.join(", ")} emails: admin ${result.admin}; customer ${result.customer}`);
  } catch (err) {
    console.error("✉️  Order emails error:", err.message);
  }

  // Keep a record on the orders so the admin can see whether emails went out
  try {
    const Order = require("../Model/orderModel");
    await Order.updateMany(
      { _id: { $in: orders.map((o) => o._id) } },
      { $set: { emailStatus: { ...result, at: new Date() } } }
    );
  } catch (err) {
    console.error("✉️  Couldn't record email status:", err.message);
  }
  return result;
}

// Check the SMTP settings at startup so mistakes show up in the log early
async function verifyEmailSetup() {
  const transport = getTransporter();
  if (!transport) {
    console.log("✉️  Order emails are off: SMTP_HOST is not set.");
    return false;
  }
  if (!adminRecipients().length) console.warn("✉️  ADMIN_EMAIL is not set, so the shop won't get order emails.");
  try {
    await transport.verify();
    console.log(`✉️  Order emails ready via ${env("SMTP_HOST")} (shop: ${adminRecipients().join(", ") || "none"})`);
    return true;
  } catch (err) {
    console.error(`✉️  SMTP check failed (${env("SMTP_HOST")}): ${err.message}`);
    return false;
  }
}

// Whether order emails can be sent at all
const emailEnabled = () => Boolean(env("SMTP_HOST"));

module.exports = { emailEnabled, sendOrderEmails, verifyEmailSetup, buildSummary, adminEmail, customerEmail, isEmail };
