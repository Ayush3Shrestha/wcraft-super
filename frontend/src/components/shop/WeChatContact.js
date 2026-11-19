import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, MessagesSquare, X } from "lucide-react";
import { SHOP } from "../../lib/shopInfo";
import "../../styles/wechat.css";

// How long to wait for the WeChat app to take over before saying it didn't open
const APP_OPEN_WAIT_MS = 2000;
const WECHAT_DOWNLOAD_URL = "https://www.wechat.com/";

// Where the visitor is decides what can work: only phones can open the app,
// and inside WeChat's own browser the app link is blocked but QR codes can be
// long-pressed.
function detectDevice() {
  if (typeof navigator === "undefined") return { mobile: false, inWeChat: false };
  const ua = navigator.userAgent || "";
  const iPadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return { mobile: /Android|iPhone|iPad|iPod/i.test(ua) || iPadOs, inWeChat: /MicroMessenger/i.test(ua) };
}

// Copies text, falling back to a hidden textarea where the Clipboard API is blocked
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!(await copyText(text))) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button type="button" onClick={copy} className="wc-wechat-copy">
      {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </button>
  );
}

/**
 * Opens the WeChat app on a phone, with the shop's number already copied so
 * the visitor only has to paste it into Add Contacts. If the app doesn't take
 * over (not installed), says so. Only for phones: computers can't open it.
 */
function OpenAppButton() {
  const [status, setStatus] = useState("idle"); // idle | opening | failed
  const cleanup = useRef(() => {});
  useEffect(() => () => cleanup.current(), []);

  const open = async () => {
    cleanup.current();
    await copyText(SHOP.wechat.id);
    setStatus("opening");
    // When the app opens, this page is hidden (or loses focus to the
    // "Open in WeChat?" prompt on iPhone)
    const left = () => {
      cleanup.current();
      setStatus("idle");
    };
    const timer = setTimeout(() => {
      cleanup.current();
      if (!document.hidden) setStatus("failed");
    }, APP_OPEN_WAIT_MS);
    document.addEventListener("visibilitychange", left);
    window.addEventListener("pagehide", left);
    window.addEventListener("blur", left);
    cleanup.current = () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", left);
      window.removeEventListener("pagehide", left);
      window.removeEventListener("blur", left);
    };
    window.location.href = "weixin://";
  };

  return (
    <>
      <button type="button" onClick={open} className="wc-btn wc-btn-wechat w-full mt-4">
        <MessagesSquare size={15} aria-hidden="true" /> Copy number &amp; open WeChat
      </button>
      <p className="wc-wechat-note" role="status">
        {status === "opening" && "Opening WeChat… our number is copied, paste it in Add Contacts."}
        {status === "failed" && (
          <>
            WeChat didn't open. Is it installed?{" "}
            <a href={WECHAT_DOWNLOAD_URL} target="_blank" rel="noreferrer">
              Get WeChat
            </a>
            , or search our number in WeChat on another device.
          </>
        )}
      </p>
    </>
  );
}

/**
 * A button that opens how to reach the shop on WeChat. WeChat has no web link
 * that starts a chat with a number (like wa.me for WhatsApp), so this shows the
 * number to search for, an optional QR code, the visitor's message ready to
 * paste, and on phones a button that opens the app. Renders nothing when no
 * WeChat ID is set.
 */
export default function WeChatButton({ message = "", className = "wc-btn wc-btn-wechat", children, ...rest }) {
  const dialogRef = useRef(null);
  // Each button has its own window, so titles need their own ids
  const titleId = useId();
  const [device] = useState(detectDevice);
  if (!SHOP.wechat.id) return null;

  const open = () => dialogRef.current?.showModal();
  const close = () => dialogRef.current?.close();
  const { mobile, inWeChat } = device;
  const qr = SHOP.wechat.qr;
  // On a computer the quickest way is scanning with the phone, so the code
  // sits beside the steps; inside WeChat's browser it can be long-pressed
  const qrCaption = !qr ? "" : inWeChat ? "Press and hold, then scan" : mobile ? "" : "Scan with WeChat to add us";

  return (
    <>
      <button type="button" onClick={open} className={className} aria-haspopup="dialog" {...rest}>
        {children || (
          <>
            <MessagesSquare size={15} aria-hidden="true" /> WeChat
          </>
        )}
      </button>

      {/* Rendered at page level so it looks the same wherever the button is,
          e.g. it doesn't take on the footer's heading styles. Clicking the
          dark area around the box closes it. */}
      {createPortal(
        <dialog
          ref={dialogRef}
          className={`wc-wechat-dialog ${qrCaption ? "wc-with-qr" : ""}`}
          aria-labelledby={titleId}
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <div className="wc-wechat-box">
            <div className="wc-wechat-head">
              <h2 id={titleId}>
                Chat with us on <span className="wc-accent">WeChat</span>
              </h2>
              <button type="button" onClick={close} className="wc-wechat-close" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="wc-wechat-body">
              {qrCaption && (
                <figure className="wc-wechat-qr">
                  <img src={qr} alt="Welcome Craft WeChat QR code" />
                  <figcaption>{qrCaption}</figcaption>
                </figure>
              )}

              <div className="min-w-0">
                {qrCaption && !inWeChat && <p className="wc-wechat-or">Or add us by number:</p>}
                <ol className="wc-wechat-steps">
                  <li>
                    {mobile ? "Open WeChat" : "In WeChat on your phone"}, tap <strong>+</strong> → <strong>Add Contacts</strong>.
                  </li>
                  <li>
                    Search for our number:
                    <span className="wc-wechat-id">
                      <strong>{SHOP.wechat.display}</strong>
                      <CopyButton text={SHOP.wechat.id} label="Copy" />
                    </span>
                  </li>
                  <li>{message ? "Add us, then paste your message:" : "Add us and send your message."}</li>
                </ol>

                {message && (
                  <div className="wc-wechat-message">
                    {/* The full text is copied; the preview is cut to a few lines */}
                    <p title={message}>{message}</p>
                    <CopyButton text={message} label="Copy message" />
                  </div>
                )}

                {mobile && !inWeChat && <OpenAppButton />}
              </div>
            </div>
          </div>
        </dialog>,
        document.body,
      )}
    </>
  );
}
