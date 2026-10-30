import React from "react";
import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { useSeo } from "../lib/seo";

// Shown for any address the shop doesn't have; kept out of search results
export default function NotFoundPage() {
  useSeo({ title: "Page not found", noindex: true });
  return (
    <div className="wc-page min-h-[60vh] flex items-center justify-center px-4 py-20" style={{ backgroundColor: "var(--wc-ivory)" }}>
      <div className="text-center max-w-md">
        <Compass size={36} className="mx-auto mb-4" style={{ color: "var(--wc-gold-deep)" }} />
        <h1 className="text-3xl sm:text-4xl mb-3">Page not found</h1>
        <p className="mb-6" style={{ color: "var(--wc-ink-muted)" }}>
          The page you were looking for has moved or doesn't exist.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/products" className="wc-btn wc-btn-primary">
            Browse the collection
          </Link>
          <Link to="/" className="wc-btn wc-btn-outline">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
