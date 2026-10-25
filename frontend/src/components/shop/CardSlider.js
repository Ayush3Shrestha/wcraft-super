import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * One row of cards that scrolls sideways instead of wrapping onto new lines.
 * `perView` is how many cards fit on a wide screen (3 or 4); phones show
 * one card with the next peeking in. Arrow buttons move a screenful at a
 * time and only show when there is more to see in that direction; touch
 * and trackpad swiping work too.
 */
export default function CardSlider({ children, perView = 3, label }) {
  const trackRef = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    observer?.observe(el);
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      observer?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [update, children]);

  const move = (dir) => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="wc-cslider">
      <div ref={trackRef} className={`wc-cslider-track wc-cslider-${perView}`} role="region" aria-label={label} tabIndex={0}>
        {React.Children.map(children, (child) => (
          <div className="wc-cslider-item">{child}</div>
        ))}
      </div>
      {canPrev && (
        <button type="button" className="wc-cslider-btn wc-cslider-prev" onClick={() => move(-1)} aria-label="Show previous">
          <ChevronLeft size={22} />
        </button>
      )}
      {canNext && (
        <button type="button" className="wc-cslider-btn wc-cslider-next" onClick={() => move(1)} aria-label="Show more">
          <ChevronRight size={22} />
        </button>
      )}
    </div>
  );
}
