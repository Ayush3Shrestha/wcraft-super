import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Edit,
  ArrowLeft,
  ArrowRight,
  Info,
  AlertCircle,
  BadgeCheck,
  Package,
  ShieldCheck,
  Sparkles,
  StickyNote,
} from "lucide-react";
import ApiService from "../services/apiService";
import { fallbackToPlaceholder, isCustomSilver, isSilver, productImage, variantLabel } from "../lib/productDisplay";
import { CustomPieceFields, estimateCustomPrice, specToValues, validateCustomPiece, valuesToSpec } from "./CustomPieceForm";
import CheckoutSteps from "./shop/CheckoutSteps";
import { CurrencyDisclaimer, NprEquivalent } from "./shop/CurrencyNote";
import { useCurrency } from "../lib/currency";
import "../styles/cart.css";

// Lines describing a custom silver specification
export function specSummary(spec) {
  if (!spec || spec.preferredWeight == null) return [];
  const size = spec.size || {};
  const dims = [size.height, size.width, size.length].filter(Boolean).join(" × ");
  return [
    `Weight: ${spec.preferredWeight} tola`,
    dims && `Size: ${dims} ${size.unit || "inch"}`,
    spec.design && `Design: ${spec.design}`,
    spec.designNotes && `Notes: ${spec.designNotes}`,
    spec.requiredBy && `Needed by: ${new Date(spec.requiredBy).toLocaleDateString()}`,
    spec.estimatedCompletion?.latest && `Estimated ready by: ${new Date(spec.estimatedCompletion.latest).toLocaleDateString()}`,
  ].filter(Boolean);
}

const CartPage = () => {
  const { format: formatMoney } = useCurrency();
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [error, setError] = useState(null);
  const [notices, setNotices] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [noteText, setNoteText] = useState("");
  // Custom piece being edited: { itemId, values, errors, saving, error }
  const [specEdit, setSpecEdit] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const sessionId = ApiService.getSessionId();

  const applyResponse = (res) => {
    setCart(res.cart);
    const msgs = [];
    if (res.priceChanges?.length) msgs.push("Some prices were updated to today's silver rate.");
    if (res.removedItems?.length) msgs.push(`Removed because no longer available: ${res.removedItems.join(", ")}.`);
    if (msgs.length) setNotices(msgs);
    window.dispatchEvent(new Event("storage")); // Update navbar cart count
  };

  const fetchCart = useCallback(async () => {
    try {
      setError(null);
      applyResponse(await ApiService.getCart(sessionId));
    } catch (err) {
      setError("Failed to load your cart. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const runItemUpdate = async (itemId, request) => {
    try {
      setUpdating((u) => ({ ...u, [itemId]: true }));
      setError(null);
      const res = await request();
      if (res?.cart) {
        setCart(res.cart);
        window.dispatchEvent(new Event("storage"));
      } else {
        await fetchCart();
      }
    } catch (err) {
      setError(err.message || "Failed to update your cart. Please try again.");
    } finally {
      setUpdating((u) => ({ ...u, [itemId]: false }));
    }
  };

  const updateQuantity = (item, quantity) => {
    if (quantity < 1) return;
    runItemUpdate(item._id, () => ApiService.updateCartItem(sessionId, item._id, { quantity }));
  };

  const removeItem = (item) => runItemUpdate(item._id, () => ApiService.removeFromCart(sessionId, item._id));

  const saveNote = (item) =>
    runItemUpdate(item._id, () => ApiService.updateCartItem(sessionId, item._id, { customization: noteText.trim() })).then(() => {
      setEditingItem(null);
      setNoteText("");
    });

  const startSpecEdit = (item) =>
    setSpecEdit({ itemId: item._id, values: specToValues(item.customSpecification), errors: {}, error: "", saving: false });

  // Checkout links here with ?edit=<itemId> to open that item's editor
  const editParam = searchParams.get("edit");
  useEffect(() => {
    if (!editParam || !cart) return;
    const item = cart.items.find((i) => i._id === editParam && isCustomSilver(i.product));
    if (item) {
      startSpecEdit(item);
      setTimeout(() => document.getElementById(`item-${item._id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    }
    searchParams.delete("edit");
    setSearchParams(searchParams, { replace: true });
  }, [editParam, cart]); // eslint-disable-line react-hooks/exhaustive-deps

  const setSpecField = (field, value) =>
    setSpecEdit((e) => ({ ...e, values: { ...e.values, [field]: value }, errors: { ...e.errors, [field]: undefined }, error: "" }));

  const saveSpec = async (item) => {
    const errors = validateCustomPiece(item.product, specEdit.values);
    if (Object.keys(errors).length) {
      setSpecEdit((e) => ({ ...e, errors }));
      return;
    }
    setSpecEdit((e) => ({ ...e, saving: true, error: "" }));
    try {
      const res = await ApiService.updateCartItem(sessionId, item._id, { customSpecification: valuesToSpec(specEdit.values) });
      setCart(res.cart);
      setSpecEdit(null);
      setNotices([`Updated the details for ${item.product.title}.`]);
    } catch (err) {
      const details = Array.isArray(err.details) ? `: ${err.details.join(", ")}` : "";
      setSpecEdit((e) => ({ ...e, saving: false, error: `${err.message || "Couldn't save the changes"}${details}` }));
    }
  };

  const clearCart = async () => {
    if (!window.confirm("Remove all items from your cart?")) return;
    try {
      setLoading(true);
      await ApiService.clearCart(sessionId);
      await fetchCart();
    } catch (err) {
      setError("Failed to clear the cart. Please try again.");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="wc-page wc-light-page min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 py-10 grid lg:grid-cols-3 gap-8" aria-busy="true" aria-label="Loading your cart">
          <div className="lg:col-span-2 space-y-4">
            <div className="wc-skeleton h-10 w-1/3" />
            <div className="wc-skeleton h-36" />
            <div className="wc-skeleton h-36" />
          </div>
          <div className="wc-skeleton h-72" />
        </div>
      </div>
    );
  }

  if (error && !cart) {
    return (
      <div className="wc-page wc-light-page min-h-screen flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-md">
          <div className="wc-state-icon">
            <AlertCircle size={30} />
          </div>
          <h1 className="text-3xl mb-2">We couldn't load your cart</h1>
          <p className="mb-6" style={{ color: "var(--wc-ink-muted)" }}>
            {error}
          </p>
          <button onClick={fetchCart} className="wc-btn wc-btn-primary">
            Try again
          </button>
        </div>
      </div>
    );
  }

  const items = (cart?.items || []).filter((i) => i.product);

  if (items.length === 0) {
    return (
      <div className="wc-page wc-light-page min-h-screen flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-md">
          {notices.map((n) => (
            <div key={n} className="wc-alert wc-alert-error mb-6 text-left" role="status">
              <Info size={18} className="flex-shrink-0" />
              <p>{n}</p>
            </div>
          ))}
          <div className="wc-state-icon">
            <ShoppingCart size={30} />
          </div>
          <span className="wc-eyebrow">Your cart</span>
          <h1 className="text-3xl sm:text-4xl mt-2 mb-3">
            Nothing here <span className="wc-accent">yet</span>
          </h1>
          <p className="mb-8" style={{ color: "var(--wc-ink-muted)" }}>
            Explore our handcrafted Buddhist statues and ornaments in silver, gold finishes, copper and bronze.
          </p>
          <Link to="/products" className="wc-btn wc-btn-primary">
            Browse the collection <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  const hasSilver = items.some((i) => isSilver(i.product));

  return (
    <div className="wc-page wc-light-page min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 py-8 lg:py-10">
        <nav aria-label="Breadcrumb" className="wc-crumbs flex flex-wrap items-center gap-2 mb-5">
          <Link to="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link to="/products">Products</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" style={{ color: "var(--wc-ink)" }}>
            Cart
          </span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="wc-eyebrow">Your selection</span>
            <h1 className="text-3xl sm:text-4xl mt-2">
              Shopping <span className="wc-accent">Cart</span>
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--wc-ink-muted)" }}>
              {cart.totalItems} {cart.totalItems === 1 ? "piece" : "pieces"}
            </p>
          </div>
          <CheckoutSteps current={1} />
        </div>

        {notices.length > 0 && (
          <div className="wc-alert wc-alert-success mb-6" role="status">
            <Info size={18} className="flex-shrink-0" />
            <div className="flex-1">
              {notices.map((n) => (
                <p key={n}>{n}</p>
              ))}
            </div>
            <button onClick={() => setNotices([])} className="text-xs underline">
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div className="wc-alert wc-alert-error mb-6" role="alert">
            <AlertCircle size={18} className="flex-shrink-0" />
            <p className="flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-xs underline">
              Dismiss
            </button>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const p = item.product;
              const busy = updating[item._id];
              const specLines = specSummary(item.customSpecification);
              return (
                <article key={item._id} id={`item-${item._id}`} className="wc-cart-item" aria-busy={busy ? "true" : undefined}>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link to={`/product/${p._id}`} className="wc-cart-thumb w-full sm:w-32 h-44 sm:h-32" tabIndex={-1} aria-hidden="true">
                      <img src={productImage(p)} alt="" onError={fallbackToPlaceholder} />
                    </Link>

                    <div className="flex-1 space-y-3 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          {p.category?.name && <p className="wc-cart-meta">{p.category.name}</p>}
                          <h2 className="text-xl leading-snug mt-1">
                            <Link to={`/product/${p._id}`} className="wc-cart-title">
                              {p.title}
                            </Link>
                          </h2>
                          {variantLabel(p) && (
                            <p className="text-sm mt-0.5" style={{ color: "var(--wc-ink-muted)" }}>
                              {variantLabel(p)}
                            </p>
                          )}
                        </div>
                        <button onClick={() => removeItem(item)} disabled={busy} aria-label={`Remove ${p.title}`} title="Remove" className="wc-remove-btn">
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {specEdit?.itemId === item._id ? (
                        <div className="wc-spec-box space-y-4">
                          <p className="wc-panel-title">
                            <Sparkles size={13} /> Edit your custom piece
                          </p>
                          <CustomPieceFields
                            product={p}
                            values={specEdit.values}
                            errors={specEdit.errors}
                            onChange={setSpecField}
                            idPrefix={`item-${item._id}`}
                          />
                          {(() => {
                            const estimate = estimateCustomPrice(p, specEdit.values, item.silverPriceSnapshot);
                            return (
                              estimate != null && (
                                <p className="text-sm" style={{ color: "var(--wc-ink-muted)" }}>
                                  New price: <strong style={{ color: "var(--wc-maroon)" }}>{formatMoney(estimate)}</strong> each
                                  {estimate !== item.priceSnapshot && ` (was ${formatMoney(item.priceSnapshot)})`}
                                </p>
                              )
                            );
                          })()}
                          {specEdit.error && <p className="wc-field-error">{specEdit.error}</p>}
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => saveSpec(item)} disabled={specEdit.saving} className="wc-btn wc-btn-primary wc-btn-sm">
                              {specEdit.saving ? "Saving..." : "Save details"}
                            </button>
                            <button onClick={() => setSpecEdit(null)} disabled={specEdit.saving} className="wc-btn wc-btn-soft wc-btn-sm">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        specLines.length > 0 && (
                          <div className="wc-spec-box">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <p className="wc-panel-title">
                                <Sparkles size={13} /> Custom order
                              </p>
                              <button onClick={() => startSpecEdit(item)} className="wc-text-btn">
                                <Edit size={12} />
                                Edit details
                              </button>
                            </div>
                            <ul className="space-y-0.5" style={{ color: "var(--wc-ink)" }}>
                              {specLines.map((line) => (
                                <li key={line}>{line}</li>
                              ))}
                            </ul>
                          </div>
                        )
                      )}

                      {editingItem === item._id ? (
                        <div className="space-y-2">
                          <label htmlFor={`note-${item._id}`} className="wc-field-label">
                            Note for this piece
                          </label>
                          <textarea
                            id={`note-${item._id}`}
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Anything we should know about this item?"
                            className="input-field w-full h-20 resize-none"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => saveNote(item)} disabled={busy} className="wc-btn wc-btn-primary wc-btn-sm">
                              Save note
                            </button>
                            <button onClick={() => setEditingItem(null)} className="wc-btn wc-btn-soft wc-btn-sm">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingItem(item._id);
                            setNoteText(item.customization || "");
                          }}
                          className="wc-text-btn wc-muted"
                        >
                          <StickyNote size={13} />
                          {item.customization ? (
                            <span>
                              Note: <span className="normal-case tracking-normal font-medium">{item.customization}</span>
                            </span>
                          ) : (
                            "Add a note"
                          )}
                        </button>
                      )}

                      <div className="flex flex-wrap items-end justify-between gap-3 pt-1">
                        <div className="wc-stepper">
                          <button
                            onClick={() => updateQuantity(item, item.quantity - 1)}
                            disabled={item.quantity <= 1 || busy}
                            aria-label={`Decrease quantity of ${p.title}`}
                          >
                            <Minus size={15} />
                          </button>
                          <span aria-live="polite">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item, item.quantity + 1)} disabled={busy} aria-label={`Increase quantity of ${p.title}`}>
                            <Plus size={15} />
                          </button>
                        </div>

                        <div className="text-right ml-auto">
                          <div className="wc-line-price">{formatMoney(item.priceSnapshot * item.quantity)}</div>
                          <div className="text-xs" style={{ color: "var(--wc-ink-muted)" }}>
                            {formatMoney(item.priceSnapshot)} each
                            {item.silverPriceSnapshot ? ` · silver ${formatMoney(item.silverPriceSnapshot)}/tola` : ""}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button onClick={() => navigate(-1)} className="wc-btn wc-btn-outline wc-btn-sm">
                <ArrowLeft size={14} />
                Back
              </button>
              <button onClick={clearCart} className="wc-text-btn wc-muted">
                <Trash2 size={13} />
                Clear cart
              </button>
            </div>
          </div>

          <aside className="lg:sticky lg:top-28 space-y-4">
            <div className="wc-summary">
              <h2 className="wc-panel-title mb-4">
                <Package size={14} /> Order summary
              </h2>
              <div className="space-y-2 mb-4">
                <div className="wc-summary-row">
                  <span>
                    Items ({cart.totalItems})
                  </span>
                  <span style={{ color: "var(--wc-ink)" }}>{formatMoney(cart.subtotal)}</span>
                </div>
                <div className="wc-summary-row">
                  <span>Delivery</span>
                  <span>Confirmed with you</span>
                </div>
              </div>
              <div className="wc-summary-total">
                <span className="text-sm font-semibold" style={{ color: "var(--wc-ink)" }}>
                  Estimated total
                </span>
                <span className="wc-price-big">{formatMoney(cart.subtotal)}</span>
              </div>
              <div className="text-right">
                <NprEquivalent npr={cart.subtotal} className="text-xs" />
              </div>
              <CurrencyDisclaimer className="mt-2" />
              {hasSilver && (
                <p className="text-xs mt-3" style={{ color: "var(--wc-ink-muted)" }}>
                  Silver pieces follow the daily silver rate. The final price is confirmed when we contact you.
                </p>
              )}
              <div className="mt-6 space-y-3">
                <Link to="/checkout" className="wc-btn wc-btn-primary w-full" style={{ padding: "1rem 1.5rem" }}>
                  Proceed to checkout <ArrowRight size={14} />
                </Link>
                <Link to="/products" className="wc-btn wc-btn-soft w-full">
                  Continue shopping
                </Link>
              </div>
            </div>

            <div className="wc-panel">
              <h2 className="wc-panel-title mb-3">
                <ShieldCheck size={14} /> Buying from Welcome Craft
              </h2>
              <ul className="wc-guarantee space-y-2">
                <li>
                  <BadgeCheck size={15} /> No online payment. We confirm the price and delivery with you first.
                </li>
                <li>
                  <BadgeCheck size={15} /> Handcrafted by artisans in Patan, Lalitpur.
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
