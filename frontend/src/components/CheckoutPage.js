import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  User,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  AlertCircle,
  Lock,
  Edit,
  Package,
  StickyNote,
} from "lucide-react";
import ApiService from "../services/apiService";
import { fallbackToPlaceholder, isSilver, productImage } from "../lib/productDisplay";
import { specSummary } from "./CartPage";
import CheckoutSteps from "./shop/CheckoutSteps";
import { CurrencyDisclaimer, NprEquivalent } from "./shop/CurrencyNote";
import { useCurrency } from "../lib/currency";
import "../styles/cart.css";

const EMPTY_INFO = { name: "", phone: "", email: "", address: "", orderNotes: "" };

function Field({ id, label, optional, error, hint, icon: Icon, children }) {
  return (
    <div>
      <label htmlFor={id} className="wc-field-label">
        {label} {optional ? <span className="wc-optional">(optional)</span> : <span aria-hidden="true">*</span>}
      </label>
      <div className="relative">
        {children}
        {Icon && <Icon size={16} className="wc-field-icon" aria-hidden="true" />}
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs mt-1" style={{ color: "var(--wc-ink-muted)" }}>
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="wc-field-error">
          {error}
        </p>
      )}
    </div>
  );
}

const CheckoutPage = () => {
  const { format: formatMoney } = useCurrency();
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [placedOrder, setPlacedOrder] = useState(null);
  const [customerInfo, setCustomerInfo] = useState(EMPTY_INFO);

  const sessionId = ApiService.getSessionId();

  useEffect(() => {
    ApiService.getCart(sessionId)
      .then(({ cart: data }) => {
        setCart(data);
        // Pre-fill details saved from an earlier checkout
        setCustomerInfo({
          name: data.customerName || "",
          phone: data.customerPhone || "",
          email: data.customerEmail || "",
          address: data.customerAddress || "",
          orderNotes: data.orderNotes || "",
        });
      })
      .catch(() => setError("Failed to load your cart. Please check your connection and try again."))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const handleInputChange = (field) => (e) => {
    const value = e.target.value;
    setCustomerInfo((prev) => ({ ...prev, [field]: value }));
    if (validationErrors[field]) setValidationErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateForm = () => {
    const errors = {};
    if (!customerInfo.name.trim()) errors.name = "Name is required";
    const digits = customerInfo.phone.replace(/[^\d]/g, "");
    if (!customerInfo.phone.trim()) errors.phone = "Phone number is required";
    else if (!/^\+?[\d\s\-()]+$/.test(customerInfo.phone.trim()) || digits.length < 7 || digits.length > 15)
      errors.phone = "Please enter a valid phone number";
    if (customerInfo.email && !/^\S+@\S+\.\S+$/.test(customerInfo.email)) errors.email = "Please enter a valid email address";
    if (!customerInfo.address.trim()) errors.address = "Delivery address is required";
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const placeOrder = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      setError("Please fill in the required fields.");
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      await ApiService.updateCustomerInfo(sessionId, {
        name: customerInfo.name.trim(),
        phone: customerInfo.phone.trim(),
        email: customerInfo.email.trim(),
        address: customerInfo.address.trim(),
        orderNotes: customerInfo.orderNotes.trim(),
      });
      const result = await ApiService.placeOrder(sessionId);
      setPlacedOrder(result);
      window.dispatchEvent(new Event("storage")); // Cart is now empty
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(err.message || "Failed to place your order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="wc-page wc-light-page min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 py-10 grid lg:grid-cols-3 gap-8" aria-busy="true" aria-label="Loading checkout">
          <div className="lg:col-span-2 space-y-4">
            <div className="wc-skeleton h-10 w-1/3" />
            <div className="wc-skeleton h-96" />
          </div>
          <div className="wc-skeleton h-80" />
        </div>
      </div>
    );
  }

  if (placedOrder) {
    const refs = (placedOrder.orderSummary?.orderIds || []).map((id) => String(id).slice(-6).toUpperCase());
    return (
      <div className="wc-page wc-light-page min-h-screen px-4 py-12 lg:py-16">
        <div className="max-w-lg mx-auto">
          <div className="flex justify-center mb-8">
            <CheckoutSteps current={3} />
          </div>
          <div className="wc-summary text-center">
            <div className="wc-state-icon wc-success">
              <Check size={34} strokeWidth={2.5} />
            </div>
            <span className="wc-eyebrow">Order received</span>
            <h1 className="text-3xl sm:text-4xl mt-2 mb-4">
              Thank you, <span className="wc-accent">{placedOrder.orderSummary?.customerName}</span>
            </h1>
            <p className="mb-5" style={{ color: "var(--wc-ink-muted)" }}>
              We'll contact you on <strong style={{ color: "var(--wc-ink)" }}>{placedOrder.orderSummary?.customerPhone}</strong> to confirm
              availability, the final price and delivery.
              {placedOrder.customerEmailRequested && customerInfo.email.trim() && (
                <>
                  {" "}
                  A copy of your order is on its way to <strong style={{ color: "var(--wc-ink)" }}>{customerInfo.email.trim()}</strong>.
                </>
              )}
            </p>
            {refs.length > 0 && (
              <p className="mb-6 text-sm" style={{ color: "var(--wc-ink-muted)" }}>
                {refs.length === 1 ? "Order reference" : "Order references"}:{" "}
                {refs.map((ref) => (
                  <span key={ref} className="wc-order-ref mx-0.5">
                    {ref}
                  </span>
                ))}
              </p>
            )}
            <div className="space-y-3">
              {placedOrder.whatsappUrl && (
                <a href={placedOrder.whatsappUrl} target="_blank" rel="noreferrer" className="wc-btn wc-btn-primary w-full">
                  <MessageCircle size={15} />
                  Send order details on WhatsApp
                </a>
              )}
              <Link to="/products" className={`wc-btn w-full ${placedOrder.whatsappUrl ? "wc-btn-soft" : "wc-btn-primary"}`}>
                <Package size={15} />
                Continue shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const items = (cart?.items || []).filter((i) => i.product);

  if (!cart || items.length === 0) {
    return (
      <div className="wc-page wc-light-page min-h-screen flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-md">
          <div className="wc-state-icon">{error ? <AlertCircle size={30} /> : <ShoppingCart size={30} />}</div>
          <h1 className="text-3xl mb-3">{error ? "Something went wrong" : "Your cart is empty"}</h1>
          <p className="mb-8" style={{ color: "var(--wc-ink-muted)" }}>
            {error || "Add some pieces to your cart before checking out."}
          </p>
          <Link to="/products" className="wc-btn wc-btn-primary">
            Browse the collection <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  const hasSilver = items.some((i) => isSilver(i.product));
  const inputClass = (field, extra = "") =>
    `input-field w-full ${extra} ${validationErrors[field] ? "wc-invalid" : ""}`;
  const describedBy = (field) => (validationErrors[field] ? `checkout-${field}-error` : undefined);

  return (
    <div className="wc-page wc-light-page min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 py-8 lg:py-10">
        <nav aria-label="Breadcrumb" className="wc-crumbs flex flex-wrap items-center gap-2 mb-5">
          <Link to="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link to="/cart">Cart</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" style={{ color: "var(--wc-ink)" }}>
            Checkout
          </span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="wc-eyebrow">Almost there</span>
            <h1 className="text-3xl sm:text-4xl mt-2">
              <span className="wc-accent">Checkout</span>
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--wc-ink-muted)" }}>
              Tell us where to reach you and deliver
            </p>
          </div>
          <CheckoutSteps current={2} />
        </div>

        {error && (
          <div className="wc-alert wc-alert-error mb-6" role="alert">
            <AlertCircle size={18} className="flex-shrink-0" />
            <p className="flex-1">{error}</p>
            <button type="button" onClick={() => setError(null)} className="text-xs underline">
              Dismiss
            </button>
          </div>
        )}

        <form onSubmit={placeOrder} noValidate className="grid lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-6">
            <section className="wc-panel space-y-5" style={{ padding: "1.5rem" }}>
              <h2 className="wc-panel-title">
                <User size={14} /> Your details
              </h2>

              <div className="grid md:grid-cols-2 gap-4">
                <Field id="checkout-name" label="Full name" error={validationErrors.name} icon={User}>
                  <input
                    id="checkout-name"
                    type="text"
                    autoComplete="name"
                    value={customerInfo.name}
                    onChange={handleInputChange("name")}
                    aria-invalid={!!validationErrors.name}
                    aria-describedby={describedBy("name")}
                    className={inputClass("name", "pl-10")}
                    placeholder="Your full name"
                  />
                </Field>
                <Field id="checkout-phone" label="Phone number" error={validationErrors.phone} icon={Phone}>
                  <input
                    id="checkout-phone"
                    type="tel"
                    autoComplete="tel"
                    value={customerInfo.phone}
                    onChange={handleInputChange("phone")}
                    aria-invalid={!!validationErrors.phone}
                    aria-describedby={describedBy("phone")}
                    className={inputClass("phone", "pl-10")}
                    placeholder="98XXXXXXXX"
                  />
                </Field>
              </div>

              <Field
                id="checkout-email"
                label="Email"
                optional
                error={validationErrors.email}
                hint="For a copy of your order and updates about it."
                icon={Mail}
              >
                <input
                  id="checkout-email"
                  type="email"
                  autoComplete="email"
                  value={customerInfo.email}
                  onChange={handleInputChange("email")}
                  aria-invalid={!!validationErrors.email}
                  aria-describedby={describedBy("email") || "checkout-email-hint"}
                  className={inputClass("email", "pl-10")}
                  placeholder="you@example.com"
                />
              </Field>

              <Field id="checkout-address" label="Delivery address" error={validationErrors.address} icon={MapPin}>
                <textarea
                  id="checkout-address"
                  autoComplete="street-address"
                  value={customerInfo.address}
                  onChange={handleInputChange("address")}
                  rows={3}
                  aria-invalid={!!validationErrors.address}
                  aria-describedby={describedBy("address")}
                  className={inputClass("address", "pl-10 resize-none")}
                  placeholder="Street, city, district"
                />
              </Field>

              <Field id="checkout-notes" label="Special instructions" optional icon={StickyNote}>
                <textarea
                  id="checkout-notes"
                  value={customerInfo.orderNotes}
                  onChange={handleInputChange("orderNotes")}
                  rows={3}
                  className="input-field w-full pl-10 resize-none"
                  placeholder="Delivery times, gift wrapping, anything else"
                />
              </Field>
            </section>

            <section className="wc-panel flex items-start gap-3">
              <Lock size={18} className="flex-shrink-0 mt-0.5" style={{ color: "var(--wc-gold-deep)" }} />
              <div>
                <h2 className="wc-panel-title mb-1">No online payment</h2>
                <p className="text-sm" style={{ color: "var(--wc-ink-muted)" }}>
                  Your order is sent to our team, who will contact you to confirm the details and final price and arrange payment and
                  delivery.
                </p>
              </div>
            </section>

            <button type="button" onClick={() => navigate("/cart")} className="wc-btn wc-btn-outline wc-btn-sm">
              <ArrowLeft size={14} />
              Back to cart
            </button>
          </div>

          <aside className="wc-summary lg:sticky lg:top-28">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="wc-panel-title">
                <Package size={14} /> Order summary
              </h2>
              <Link to="/cart" className="wc-text-btn">
                <Edit size={12} /> Edit cart
              </Link>
            </div>

            <ul className="space-y-3 mb-5">
              {items.map((item) => (
                <li key={item._id} className="wc-summary-item flex gap-3">
                  <div className="wc-cart-thumb w-16 h-16">
                    <img src={productImage(item.product)} alt="" onError={fallbackToPlaceholder} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: "var(--wc-ink)" }}>
                      {item.product.title}
                    </p>
                    {specSummary(item.customSpecification)
                      .slice(0, 2)
                      .map((line) => (
                        <p key={line} className="text-xs" style={{ color: "var(--wc-ink-muted)" }}>
                          {line}
                        </p>
                      ))}
                    {item.customSpecification?.preferredWeight != null && (
                      <Link to={`/cart?edit=${item._id}`} className="wc-text-btn mt-0.5">
                        Edit details
                      </Link>
                    )}
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs" style={{ color: "var(--wc-ink-muted)" }}>
                        Qty {item.quantity}
                      </span>
                      <span className="text-sm font-bold" style={{ color: "var(--wc-maroon)" }}>
                        {formatMoney(item.priceSnapshot * item.quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

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
            <p className="text-xs mt-3" style={{ color: "var(--wc-ink-muted)" }}>
              {hasSilver ? "Silver prices use today's rate. " : ""}The final price is confirmed when we contact you.
            </p>

            <button type="submit" disabled={submitting} className="wc-btn wc-btn-primary w-full mt-6" style={{ padding: "1rem 1.5rem" }}>
              {submitting ? "Placing order..." : "Place order"}
            </button>
          </aside>
        </form>
      </div>
    </div>
  );
};

export default CheckoutPage;
