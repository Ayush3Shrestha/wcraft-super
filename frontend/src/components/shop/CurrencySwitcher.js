import React, { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { CURRENCIES, useCurrency } from "../../lib/currency";
import Flag from "./Flag";

const CODES = Object.keys(CURRENCIES);

// Currency picker for the navbar and the mobile menu: a button showing the
// flag and code, opening a list of currencies (keyboard: arrows, Home/End,
// Enter to pick, Esc to close). Prices are stored in NPR; other currencies
// are converted with the day's rate.
export default function CurrencySwitcher({ full = false, className = "" }) {
  const { selected, currency, available, status, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(CODES.indexOf(selected));
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const id = useId();

  const isAvailable = (code) => status === "loading" || available.includes(code);

  const openList = () => {
    setActive(Math.max(0, CODES.indexOf(selected)));
    setOpen(true);
  };
  const close = (focusButton = true) => {
    setOpen(false);
    if (focusButton) buttonRef.current?.focus();
  };
  const choose = (code) => {
    if (!isAvailable(code)) return;
    setCurrency(code);
    close();
  };

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
    const onPointer = (e) => !rootRef.current?.contains(e.target) && close(false);
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const move = (step) => {
    let i = active;
    for (let n = 0; n < CODES.length; n++) {
      i = (i + step + CODES.length) % CODES.length;
      if (isAvailable(CODES[i])) break;
    }
    setActive(i);
  };

  const onListKey = (e) => {
    if (e.key === "ArrowDown") move(1);
    else if (e.key === "ArrowUp") move(-1);
    else if (e.key === "Home") setActive(CODES.findIndex(isAvailable));
    else if (e.key === "End") setActive(CODES.length - 1 - [...CODES].reverse().findIndex(isAvailable));
    else if (e.key === "Enter" || e.key === " ") choose(CODES[active]);
    else if (e.key === "Escape" || e.key === "Tab") close(e.key === "Escape");
    else return;
    if (e.key !== "Tab") e.preventDefault();
  };

  const fallback = selected !== currency && status !== "loading";

  return (
    <div ref={rootRef} className={`wc-currency ${full ? "wc-currency-full" : ""} ${className}`}>
      {full && (
        <span className="wc-currency-label" id={`${id}-label`}>
          Currency
        </span>
      )}
      <button
        ref={buttonRef}
        type="button"
        className="wc-currency-box"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={`Currency: ${CURRENCIES[currency].name}. Change currency`}
        title={fallback ? `${selected} rates aren't available right now; showing ${currency}` : "Show prices in"}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            openList();
          }
        }}
      >
        <Flag code={currency} />
        <span>{full ? `${currency} · ${CURRENCIES[currency].name}` : currency}</span>
        <ChevronDown size={14} className={`wc-currency-chevron ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          tabIndex={-1}
          aria-label="Show prices in"
          aria-activedescendant={`${id}-${CODES[active]}`}
          onKeyDown={onListKey}
          className="wc-currency-list"
        >
          {CODES.map((code, i) => {
            const c = CURRENCIES[code];
            const disabled = !isAvailable(code);
            return (
              <li
                key={code}
                id={`${id}-${code}`}
                role="option"
                aria-selected={code === selected}
                aria-disabled={disabled || undefined}
                className={`wc-currency-option ${i === active ? "wc-active" : ""}`}
                onPointerEnter={() => !disabled && setActive(i)}
                onClick={() => choose(code)}
              >
                <Flag code={code} />
                <span className="flex-1 min-w-0">
                  <span className="wc-currency-code">{code}</span>
                  <span className="wc-currency-name">{disabled ? "Rate unavailable" : c.name}</span>
                </span>
                <Check size={14} className={code === selected ? "" : "invisible"} aria-hidden="true" />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
