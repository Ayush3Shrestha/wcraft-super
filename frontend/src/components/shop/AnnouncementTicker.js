import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import ApiService from "../../services/apiService";
import { useCurrency } from "../../lib/currency";
import { describeChange } from "./LivePriceCard";

const REFRESH_MS = 15 * 60 * 1000; // rates are scraped every 15 minutes
const SPEED_PX_PER_SECOND = 45;

function RateChange({ value, format }) {
  const change = describeChange(value, format);
  if (change.direction === "flat") return null;
  const Icon = change.direction === "up" ? TrendingUp : TrendingDown;
  return (
    <span className={`wc-ticker-change ${change.direction === "up" ? "wc-up" : "wc-down"}`}>
      <Icon size={11} aria-hidden="true" />
      {change.text}
    </span>
  );
}

function Item({ item, format }) {
  return (
    <span className="wc-ticker-item">
      <span className="wc-ticker-star" aria-hidden="true">
        ✦
      </span>
      {item.type === "text" ? (
        item.text
      ) : (
        <>
          {item.text}: <strong>{format(item.pricePerTola)}</strong> / tola <RateChange value={item.dailyChange} format={format} />
        </>
      )}
    </span>
  );
}

/**
 * News-style scrolling bar. The items are repeated enough times to fill the
 * bar, and the row moves left by exactly one set of items before starting
 * again, so the loop has no visible jump. Hovering pauses it (layout.css).
 */
export default function AnnouncementTicker() {
  const { format } = useCurrency();
  const [items, setItems] = useState([]);
  const [size, setSize] = useState({ bar: 0, group: 0 });
  const barRef = useRef(null);
  const groupRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      ApiService.getAnnouncements()
        .then((data) => !cancelled && setItems(data.announcements || []))
        .catch(() => {});
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const hasItems = items.length > 0;

  // Keep the loop exact when the window, the text or the currency changes
  useLayoutEffect(() => {
    const bar = barRef.current;
    const group = groupRef.current;
    if (!bar || !group) return undefined;
    const measure = () => setSize({ bar: bar.clientWidth, group: group.getBoundingClientRect().width });
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    observer.observe(group);
    // Web fonts arriving late change the text's width
    document.fonts?.ready.then(measure);
    return () => observer.disconnect();
  }, [hasItems]);

  if (!hasItems) return <div className="flex-1 min-w-0" />;

  // Always one more set than fills the bar, so nothing runs out as it scrolls
  const copies = Math.max(2, size.group > 0 ? Math.ceil(size.bar / size.group) + 1 : 2);
  const trackStyle =
    size.group > 0 ? { "--wc-ticker-shift": `-${size.group}px`, animationDuration: `${size.group / SPEED_PX_PER_SECOND}s` } : undefined;

  return (
    <div className="wc-ticker flex-1 min-w-0" role="region" aria-label="Announcements">
      <div ref={barRef} className="wc-ticker-window">
        <div className={`wc-ticker-track ${size.group > 0 ? "wc-running" : ""}`} style={trackStyle}>
          <div ref={groupRef} className="wc-ticker-group">
            {items.map((item) => (
              <Item key={item._id} item={item} format={format} />
            ))}
          </div>
          {/* Repeats only fill the bar, so screen readers skip them */}
          {Array.from({ length: Math.max(0, copies - 1) }, (_, i) => (
            <div key={i} className="wc-ticker-group wc-ticker-copy" aria-hidden="true">
              {items.map((item) => (
                <Item key={item._id} item={item} format={format} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
