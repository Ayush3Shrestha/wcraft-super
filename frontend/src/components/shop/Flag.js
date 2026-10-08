import React from "react";

// Small inline flags for the currency switcher. Emoji flags don't render on
// Windows (they show as letters), so these are drawn as SVG.
const FLAGS = {
  // United States: 13 stripes and a blue canton (stars left out at this size)
  USD: (
    <svg viewBox="0 0 30 20">
      <rect width="30" height="20" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12].map((i) => (
        <rect key={i} y={(i * 20) / 13} width="30" height={20 / 13} fill="#b22234" />
      ))}
      <rect width="13" height={(7 * 20) / 13} fill="#3c3b6e" />
      {[
        [2, 2],
        [5.5, 2],
        [9, 2],
        [3.75, 4.5],
        [7.25, 4.5],
        [2, 7],
        [5.5, 7],
        [9, 7],
        [3.75, 9.5],
        [7.25, 9.5],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x + 1} cy={y} r="0.7" fill="#fff" />
      ))}
    </svg>
  ),
  // Nepal: crimson double pennant with a blue border, white moon and sun
  NPR: (
    <svg viewBox="0 0 24 30">
      <path d="M1 1 L21 13 H9 L21 29 H1 Z" fill="#dc143c" stroke="#003893" strokeWidth="1.6" strokeLinejoin="miter" />
      <path d="M3.6 8.6 a3.4 3.4 0 0 0 6.8 0 a3.4 2.2 0 0 1 -6.8 0 Z" fill="#fff" />
      <circle cx="7" cy="7.6" r="1.2" fill="#fff" />
      <circle cx="7" cy="21.5" r="2.4" fill="#fff" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <rect key={a} x="6.55" y="17.9" width="0.9" height="1.4" fill="#fff" transform={`rotate(${a} 7 21.5)`} />
      ))}
    </svg>
  ),
  // China: red with one large and four small yellow stars
  CNY: (
    <svg viewBox="0 0 30 20">
      <rect width="30" height="20" fill="#de2910" />
      <polygon points="5,2 6.18,5.38 9.76,5.45 6.9,7.62 7.94,11.05 5,9 2.06,11.05 3.1,7.62 0.24,5.45 3.82,5.38" fill="#ffde00" />
      {[
        [10, 2],
        [12, 4],
        [12, 7],
        [10, 9],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="0.9" fill="#ffde00" />
      ))}
    </svg>
  ),
  // India: saffron, white and green with the navy Ashoka Chakra
  INR: (
    <svg viewBox="0 0 30 20">
      <rect width="30" height="20" fill="#fff" />
      <rect width="30" height="6.67" fill="#ff9933" />
      <rect y="13.33" width="30" height="6.67" fill="#138808" />
      <circle cx="15" cy="10" r="2.6" fill="none" stroke="#000080" strokeWidth="0.6" />
      <circle cx="15" cy="10" r="0.6" fill="#000080" />
    </svg>
  ),
};

export default function Flag({ code, className = "" }) {
  const flag = FLAGS[code];
  if (!flag) return null;
  return (
    <span className={`wc-flag ${code === "NPR" ? "wc-flag-np" : ""} ${className}`} aria-hidden="true">
      {flag}
    </span>
  );
}
