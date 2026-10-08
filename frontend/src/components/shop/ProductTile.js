import React from "react";
import { Link } from "react-router-dom";
import { Eye, ShoppingCart } from "lucide-react";
import { useCurrency } from "../../lib/currency";
import {
  fallbackToPlaceholder,
  isCustomSilver,
  isSilver,
  priceLabel,
  productImage,
  variantLabel,
} from "../../lib/productDisplay";

/**
 * Product card in the prototype's style: photo on top (or on the left with
 * layout="row"), marigold or crimson body with meta, title and price.
 * light: stone-coloured body with the description and an add button
 * (used for related products).
 */
export default function ProductTile({ product, onAddToCart, crimson = false, layout = "grid", light = false }) {
  const { format } = useCurrency();
  const url = `/product/${product._id}`;
  const custom = isCustomSilver(product);
  const row = layout === "row";
  const detailed = row || light;

  return (
    <article className={`wc-product-card group ${crimson && !light ? "wc-crimson" : ""} ${light ? "wc-light" : ""} ${row ? "wc-row" : ""}`}>
      <div className="wc-product-photo">
        <Link to={url} tabIndex={-1} aria-hidden="true">
          <img src={productImage(product)} onError={fallbackToPlaceholder} alt="" />
        </Link>
        {isSilver(product) && <span className="wc-tag">{custom ? "Made to order" : "Live price"}</span>}
        <div className="absolute top-2 right-2 flex flex-col gap-2">
          <Link to={url} className="wc-icon-btn" aria-label={`View ${product.title}`}>
            <Eye size={16} />
          </Link>
          <button
            type="button"
            onClick={() => onAddToCart(product)}
            className="wc-icon-btn"
            aria-label={custom ? `Customize ${product.title}` : `Add ${product.title} to cart`}
          >
            <ShoppingCart size={16} />
          </button>
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1 min-w-0">
        <p className="wc-product-meta truncate">{[product.category?.name, variantLabel(product)].filter(Boolean).join(" · ")}</p>
        <h3 className="text-lg leading-snug mt-1 mb-3">
          <Link to={url} className="hover:underline">
            {product.title}
          </Link>
        </h3>
        {detailed && product.description && <p className="wc-product-desc text-sm mb-4 line-clamp-2">{product.description}</p>}
        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="wc-product-price">{priceLabel(product, format)}</span>
          {detailed ? (
            <button
              type="button"
              onClick={() => onAddToCart(product)}
              className="wc-btn wc-btn-primary wc-btn-sm"
              aria-label={custom ? `Customize ${product.title}` : `Add ${product.title} to cart`}
            >
              {custom ? "Customize" : "Add to cart"}
            </button>
          ) : (
            <Link to={url} className="wc-product-link">
              Details ›
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
