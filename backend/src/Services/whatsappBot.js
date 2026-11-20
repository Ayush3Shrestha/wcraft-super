const fs = require("fs");
const path = require("path");
const qrcode = require("qrcode-terminal");

/**
 * The shop's own WhatsApp order bot. It runs inside this backend and is
 * linked to a WhatsApp account the same way WhatsApp Web is (scan a QR code),
 * then messages the shop's WhatsApp Business number (WHATSAPP_PHONE) about
 * every new order.
 *
 * Built on Baileys (https://github.com/WhiskeySockets/Baileys), an open source
 * library. It is not an official WhatsApp API, and WhatsApp can block numbers
 * it thinks are automated. So link a SPARE number as the bot, never the
 * shop's business number: the business number only receives.
 *
 * Setup, once:
 *   1. In backend/.env set WHATSAPP_BOT_ENABLED=true (WHATSAPP_PHONE is the
 *      number that gets the alerts) and restart the backend.
 *   2. A QR code appears in the backend terminal. On the spare phone, open
 *      WhatsApp > Settings > Linked devices > Link a device and scan it.
 *   3. Done. The login is saved in backend/.whatsapp-session (keep it private,
 *      it's in .gitignore), so restarts don't need a new scan.
 *
 * To log the bot out, remove the device in the phone's Linked devices, or
 * delete backend/.whatsapp-session and restart.
 *
 * Alerts never hold up or fail an order. If the bot is offline, alerts wait
 * in memory and go out when it reconnects (they're lost if the backend
 * restarts first; the order itself is always saved and emailed).
 */

const SESSION_DIR = path.join(__dirname, "..", "..", ".whatsapp-session");
const MAX_WAITING = 50;
const RECONNECT_MIN_MS = 5 * 1000;
const RECONNECT_MAX_MS = 5 * 60 * 1000;

const env = (name) => (process.env[name] || "").trim();
const botEnabled = () => /^(true|1|on|yes)$/i.test(env("WHATSAPP_BOT_ENABLED"));
const shopNumber = () => env("WHATSAPP_PHONE").replace(/[^\d]/g, "");

// Baileys wants a pino-style logger; its own chatter isn't useful here
const quietLogger = {
  level: "silent",
  child() {
    return quietLogger;
  },
  trace() {},
  debug() {},
  info() {},
  warn() {},
  error() {},
};

const state = {
  sock: null,
  connected: false,
  starting: false,
  stopped: false, // logged out or replaced: don't keep reconnecting
  retryMs: RECONNECT_MIN_MS,
  waiting: [],
};

const log = (msg) => console.log(`💬 WhatsApp bot: ${msg}`);

async function connect() {
  if (state.starting) return;
  state.starting = true;
  try {
    // Baileys is published as an ES module only, so it's loaded with import()
    const baileys = await import("@whiskeysockets/baileys");
    const makeWASocket = baileys.makeWASocket || baileys.default;
    const { useMultiFileAuthState, DisconnectReason, Browsers } = baileys;

    const { state: auth, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
    const sock = makeWASocket({
      auth,
      logger: quietLogger,
      browser: Browsers.ubuntu("Welcome Craft Orders"),
      markOnlineOnConnect: false,
      syncFullHistory: false,
    });
    state.sock = sock;

    sock.ev.on("creds.update", saveCreds);
    sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        log("scan this QR code from the bot phone: WhatsApp > Settings > Linked devices > Link a device");
        qrcode.generate(qr, { small: true });
      }
      if (connection === "open") {
        state.connected = true;
        state.retryMs = RECONNECT_MIN_MS;
        const own = String(sock.user?.id || "").split(/[:@]/)[0];
        log(`connected as +${own}; order alerts go to +${shopNumber()}`);
        if (own && own === shopNumber()) {
          log("warning: the bot is linked to the shop's own number. Messages to yourself don't notify you, and automation risks that number. Link a spare number instead.");
        }
        sendWaiting();
      }
      if (connection === "close") {
        state.connected = false;
        const code = lastDisconnect?.error?.output?.statusCode;
        if (code === DisconnectReason.loggedOut) {
          state.stopped = true;
          fs.rmSync(SESSION_DIR, { recursive: true, force: true });
          log("logged out from the phone. Restart the backend to show a new QR code.");
        } else if (code === DisconnectReason.connectionReplaced) {
          state.stopped = true;
          log("another backend is using this login, so this one stopped. Run only one.");
        } else if (code === DisconnectReason.restartRequired) {
          // Normal right after scanning the QR code
          setTimeout(connect, 0);
        } else {
          const wait = state.retryMs;
          state.retryMs = Math.min(state.retryMs * 2, RECONNECT_MAX_MS);
          log(`connection closed (${code || "network"}), retrying in ${Math.round(wait / 1000)}s`);
          setTimeout(connect, wait);
        }
      }
    });
  } catch (err) {
    log(`couldn't start: ${err.message}`);
    const wait = state.retryMs;
    state.retryMs = Math.min(state.retryMs * 2, RECONNECT_MAX_MS);
    setTimeout(connect, wait);
  } finally {
    state.starting = false;
  }
}

async function deliver(text) {
  const number = shopNumber();
  // Checks the number is on WhatsApp and gets its exact address
  const [found] = (await state.sock.onWhatsApp(number)) || [];
  if (!found?.exists) throw new Error(`+${number} isn't on WhatsApp`);
  await state.sock.sendMessage(found.jid, { text });
}

async function sendWaiting() {
  while (state.connected && state.waiting.length) {
    const text = state.waiting[0];
    try {
      await deliver(text);
      state.waiting.shift();
      log("order alert sent");
    } catch (err) {
      log(`couldn't send a waiting alert: ${err.message}`);
      return;
    }
  }
}

/** Sends an order alert to the shop's WhatsApp, or keeps it until the bot is online. */
async function sendWhatsAppAlert(text) {
  if (!botEnabled()) {
    log("off, alert skipped (set WHATSAPP_BOT_ENABLED=true to turn it on)");
    return { sent: false, reason: "not enabled" };
  }
  if (!shopNumber()) {
    log("WHATSAPP_PHONE is not set, alert skipped");
    return { sent: false, reason: "no shop number" };
  }
  if (!state.connected) {
    if (state.waiting.length >= MAX_WAITING) state.waiting.shift();
    state.waiting.push(text);
    log(`not connected yet, alert will be sent when it is (${state.waiting.length} waiting)`);
    return { sent: false, reason: "waiting" };
  }
  try {
    await deliver(text);
    log("order alert sent");
    return { sent: true };
  } catch (err) {
    state.waiting.push(text);
    log(`send failed, will retry on reconnect: ${err.message}`);
    return { sent: false, reason: err.message };
  }
}

/** Starts the bot when the server starts (does nothing unless enabled). */
function startWhatsAppBot() {
  if (!botEnabled()) {
    log("off (set WHATSAPP_BOT_ENABLED=true in .env to get order alerts on WhatsApp)");
    return;
  }
  if (!shopNumber()) {
    log("WHATSAPP_PHONE is not set, so the bot has no one to alert. Not starting.");
    return;
  }
  if (state.sock || state.stopped) return;
  log(`starting${fs.existsSync(SESSION_DIR) ? " with the saved login" : ""}...`);
  connect();
}

module.exports = { startWhatsAppBot, sendWhatsAppAlert };
