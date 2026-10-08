import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Maximize2, Share2, X } from "lucide-react";
import { fallbackToPlaceholder } from "../../lib/productDisplay";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Product image carousel: swipe or use the arrows, dots and thumbnails to
 * move between images, and open any image full screen.
 * Pass a `key` that changes with the product so it starts at the first image.
 */
export default function ProductGallery({ images, title, chip, badge, onShare, canZoom = true }) {
  const count = images.length;
  const [index, setIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const trackRef = useRef(null);
  const thumbsRef = useRef(null);

  const goTo = useCallback(
    (i) => {
      const track = trackRef.current;
      const next = (i + count) % count;
      setIndex(next);
      if (track) track.scrollTo({ left: next * track.clientWidth, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    },
    [count]
  );

  // Swiping the track updates the current image
  const onScroll = () => {
    const track = trackRef.current;
    if (!track || !track.clientWidth) return;
    const i = Math.round(track.scrollLeft / track.clientWidth);
    if (i !== index && i >= 0 && i < count) setIndex(i);
  };

  // Keep the slide in place when the layout width changes
  useEffect(() => {
    const onResize = () => {
      const track = trackRef.current;
      if (track) track.scrollTo({ left: index * track.clientWidth });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [index]);

  // Keep the current thumbnail visible without scrolling the page
  useEffect(() => {
    const strip = thumbsRef.current;
    const thumb = strip?.children[index];
    if (!strip || !thumb) return;
    const left = thumb.offsetLeft - strip.offsetLeft;
    if (left < strip.scrollLeft) strip.scrollTo({ left, behavior: "smooth" });
    else if (left + thumb.offsetWidth > strip.scrollLeft + strip.clientWidth)
      strip.scrollTo({ left: left + thumb.offsetWidth - strip.clientWidth, behavior: "smooth" });
  }, [index]);

  const onKeyDown = (e) => {
    if (count < 2) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(index + 1);
    }
  };

  return (
    <div className="space-y-3">
      <div className="wc-gallery-main">
        <div
          ref={trackRef}
          className="wc-carousel"
          onScroll={onScroll}
          onKeyDown={onKeyDown}
          tabIndex={count > 1 ? 0 : -1}
          role="region"
          aria-roledescription="carousel"
          aria-label={`${title} images${count > 1 ? ", use the arrow keys to move between them" : ""}`}
        >
          {images.map((src, i) => (
            <div
              key={`${src}-${i}`}
              className="wc-slide"
              role="group"
              aria-roledescription="slide"
              aria-label={`Image ${i + 1} of ${count}`}
              aria-hidden={i !== index}
            >
              {canZoom ? (
                <button
                  type="button"
                  className="wc-slide-zoom"
                  onClick={() => setViewerOpen(true)}
                  tabIndex={i === index ? 0 : -1}
                  aria-label={`View image ${i + 1} full screen`}
                >
                  <img src={src} alt={i === 0 ? title : `${title}, view ${i + 1} of ${count}`} onError={fallbackToPlaceholder} draggable={false} />
                </button>
              ) : (
                <img src={src} alt={title} onError={fallbackToPlaceholder} draggable={false} />
              )}
            </div>
          ))}
        </div>

        {chip && <span className="wc-gallery-chip">{chip}</span>}
        {badge && <span className="wc-gallery-badge">{badge}</span>}

        {count > 1 && (
          <>
            <button type="button" className="wc-gallery-nav left-3" onClick={() => goTo(index - 1)} aria-label="Previous image">
              <ChevronLeft size={18} />
            </button>
            <button type="button" className="wc-gallery-nav right-3" onClick={() => goTo(index + 1)} aria-label="Next image">
              <ChevronRight size={18} />
            </button>
            <div className={`wc-dots ${count > 5 ? "wc-many" : ""}`} aria-hidden="true">
              {images.map((src, i) => (
                <span key={`${src}-${i}`} className={i === index ? "wc-dot wc-dot-on" : "wc-dot"} />
              ))}
            </div>
            <span className={`wc-gallery-count ${badge ? "wc-below-badge" : ""}`} aria-live="polite">
              {index + 1} / {count}
            </span>
          </>
        )}

        {canZoom && (
          <button type="button" onClick={() => setViewerOpen(true)} className="wc-gallery-tool left-4">
            <Maximize2 size={13} /> Full screen
          </button>
        )}
        {onShare && (
          <button type="button" onClick={onShare} className="wc-gallery-tool right-4">
            <Share2 size={13} /> Share
          </button>
        )}
      </div>

      {count > 1 && (
        <div ref={thumbsRef} className="wc-thumbs" aria-label="Choose an image">
          {images.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Show image ${i + 1} of ${count}`}
              aria-current={index === i ? "true" : undefined}
              className="wc-thumb"
            >
              <img src={src} alt="" onError={fallbackToPlaceholder} />
            </button>
          ))}
        </div>
      )}

      {viewerOpen && (
        <ImageViewer
          images={images}
          title={title}
          index={index}
          onIndex={goTo}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </div>
  );
}

// Full-screen viewer over the page
function ImageViewer({ images, title, index, onIndex, onClose }) {
  const count = images.length;
  const closeRef = useRef(null);
  const touchX = useRef(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && count > 1) onIndex(index - 1);
      else if (e.key === "ArrowRight" && count > 1) onIndex(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, index, onClose, onIndex]);

  // Rendered into <body> so it covers the sticky site header too
  return createPortal(
    <div
      className="wc-viewer"
      role="dialog"
      aria-modal="true"
      aria-label={`${title}, image ${index + 1} of ${count}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null || count < 2) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 50) onIndex(index + (dx < 0 ? 1 : -1));
      }}
    >
      <div className="wc-viewer-bar">
        <span>
          {title}
          {count > 1 && <span className="wc-viewer-count"> · {index + 1} / {count}</span>}
        </span>
        <button ref={closeRef} type="button" onClick={onClose} className="wc-viewer-btn" aria-label="Close">
          <X size={20} />
        </button>
      </div>

      <img src={images[index]} alt={`${title}, view ${index + 1} of ${count}`} className="wc-viewer-img" onError={fallbackToPlaceholder} />

      {count > 1 && (
        <>
          <button type="button" className="wc-viewer-btn wc-viewer-prev" onClick={() => onIndex(index - 1)} aria-label="Previous image">
            <ChevronLeft size={24} />
          </button>
          <button type="button" className="wc-viewer-btn wc-viewer-next" onClick={() => onIndex(index + 1)} aria-label="Next image">
            <ChevronRight size={24} />
          </button>
          <div className="wc-viewer-thumbs">
            {images.map((src, i) => (
              <button
                key={`${src}-${i}`}
                type="button"
                onClick={() => onIndex(i)}
                aria-label={`Show image ${i + 1} of ${count}`}
                aria-current={index === i ? "true" : undefined}
                className="wc-thumb"
              >
                <img src={src} alt="" onError={fallbackToPlaceholder} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>,
    document.body
  );
}
