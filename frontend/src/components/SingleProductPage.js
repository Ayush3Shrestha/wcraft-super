import React, { useState, useEffect, useMemo } from "react";
import { SITE_URL, absoluteUrl, breadcrumbJsonLd, useSeo } from "../lib/seo";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  ShoppingBag,
  MessageCircle,
  MessagesSquare,
  Truck,
  ShieldCheck,
  Minus,
  Plus,
  AlertCircle,
  CheckCircle,
  Clock,
  Gem,
  Scale,
  Ruler,
  Sparkles,
  Hammer,
  Package,
  ArrowRight,
  BadgeCheck,
  Layers,
  Handshake,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import ApiService from "../services/apiService";
import { SHOP } from "../lib/shopInfo";
import {
  CustomPieceFields,
  EMPTY_SPEC,
  estimateCustomPrice,
  validateCustomPiece,
  valuesToSpec,
} from "./CustomPieceForm";
import {
  formatLength,
  isCustomSilver,
  isInStock,
  isSilver,
  label,
  priceLabel,
  productHeight,
  productImage,
  productImages,
  showsTotal,
} from "../lib/productDisplay";
import ProductTile from "./shop/ProductTile";
import ProductGallery from "./shop/ProductGallery";
import { describeChange } from "./shop/LivePriceCard";
import { CurrencyDisclaimer, NprEquivalent } from "./shop/CurrencyNote";
import { useCurrency } from "../lib/currency";
import "../styles/product.css";

const WHATSAPP_PHONE = SHOP.whatsapp;

const capitalize = (v) => (v ? v[0].toUpperCase() + v.slice(1) : "");

// Specifications shown under the title. Each comes from one product field,
// so nothing (category, finish, ...) is listed twice on the page.
function specList(p) {
  const opts = p.customOptions || {};
  const time = opts.productionTime;
  let specs;
  if (isCustomSilver(p)) {
    specs = [
      { Icon: Sparkles, label: "Metal", value: "Silver" },
      { Icon: Scale, label: "Weight range", value: p.weightRange && `${p.weightRange.min}–${p.weightRange.max} tola` },
      { Icon: Clock, label: "Ready in", value: time && `${time.minDays}–${time.maxDays} days` },
    ];
  } else if (isSilver(p)) {
    specs = [
      { Icon: Sparkles, label: "Metal", value: "Silver" },
      { Icon: Scale, label: "Weight", value: p.weightInTola && `${p.weightInTola} tola` },
    ];
  } else if (p.productType === "gold") {
    specs = [
      { Icon: Gem, label: "Gold finish", value: label(p.goldFinish) },
      { Icon: Layers, label: "Plating", value: label(p.platingMethod) },
      { Icon: Hammer, label: "Base metal", value: capitalize(p.baseMetal) },
      { Icon: Scale, label: "Weight", value: p.weightInKg && `${p.weightInKg} kg` },
    ];
  } else {
    specs = [
      { Icon: Hammer, label: "Material", value: capitalize(p.metal) },
      { Icon: Sparkles, label: "Finish", value: capitalize(p.finish) },
      { Icon: Scale, label: "Weight", value: p.weightInKg && `${p.weightInKg} kg` },
    ];
  }
  // Width and length sit next to the featured height
  const dims = p.dimensions || {};
  const unit = dims.unit || "inch";
  if (dims.width) specs.push({ Icon: Ruler, label: "Width", value: formatLength(dims.width, unit) });
  if (dims.length) specs.push({ Icon: Ruler, label: "Length", value: formatLength(dims.length, unit) });
  return specs.filter((s) => s.value);
}

// Structured data for search engines. Silver pieces only list a price when
// the admin shows the total; otherwise the page shows rate + making charge.
function productJsonLd(p) {
  const url = absoluteUrl(`/product/${p._id}`);
  const pricing = p.pricing || {};
  const availability = isInStock(p) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
  let offers;
  if (showsTotal(p)) {
    const seller = { "@id": `${SITE_URL}/#store` };
    if (pricing.price != null || p.constantPrice != null) {
      offers = { "@type": "Offer", url, priceCurrency: "NPR", price: pricing.price ?? p.constantPrice, availability, seller };
    } else if (pricing.priceRange) {
      offers = { "@type": "AggregateOffer", url, priceCurrency: "NPR", lowPrice: pricing.priceRange.min, highPrice: pricing.priceRange.max, availability, seller };
    }
  }
  const material = isSilver(p) ? "Silver" : p.productType === "metal" ? capitalize(p.metal) : capitalize(p.baseMetal) || undefined;
  return [
    {
      "@type": "Product",
      name: p.title,
      description: p.description,
      image: productImages(p),
      sku: p._id,
      category: p.category?.name,
      material,
      brand: { "@type": "Brand", name: "Welcome Craft" },
      ...(offers ? { offers } : {}),
    },
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Products", path: "/products" },
      ...(p.category ? [{ name: p.category.name, path: `/products?category=${p.category._id}` }] : []),
      { name: p.title, path: `/product/${p._id}` },
    ]),
  ];
}

// Today's silver or gold rate, as a small chip next to the stock badge
function MetalRate({ metal, rate, formatMoney }) {
  const change = describeChange(rate.dailyChange, formatMoney);
  const Icon = change.direction === "down" ? TrendingDown : TrendingUp;
  const updated = rate.lastScrapedAt ? `Updated ${new Date(rate.lastScrapedAt).toLocaleDateString()}` : undefined;
  return (
    <p className={`wc-rate-chip wc-rate-${metal}`} title={updated}>
      <span className="wc-rate-label">{metal} today</span>
      <strong>{formatMoney(rate.pricePerTola)}</strong>
      <span className="wc-rate-unit">/ tola</span>
      {change.direction !== "flat" && (
        <span className={`wc-rate-change ${change.direction === "up" ? "wc-up" : "wc-down"}`}>
          <Icon size={12} aria-hidden="true" />
          {change.text}
        </span>
      )}
      {updated && <span className="sr-only">, {updated}</span>}
    </p>
  );
}

// Silver price written out: rate × weight + making charge (= total)
function SilverFormula({ rate, weight, weightNote, making, total, formatMoney }) {
  const Term = ({ value, caption }) => (
    <span className="wc-formula-term">
      <span className="wc-formula-value">{value}</span>
      <span className="wc-formula-caption">{caption}</span>
    </span>
  );
  return (
    <div className="wc-formula">
      <div className="wc-formula-label">Today's silver rate × weight + making charge</div>
      <div className="wc-formula-row">
        <Term value={rate != null ? formatMoney(rate) : "—"} caption="silver rate / tola" />
        <span className="wc-formula-op" aria-label="times">
          ×
        </span>
        <Term value={weight} caption={weightNote} />
        <span className="wc-formula-op" aria-label="plus">
          +
        </span>
        <Term value={formatMoney(making)} caption="making charge" />
      </div>
      {total}
    </div>
  );
}

const SingleProductPage = () => {
  const { format: formatMoney } = useCurrency();
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [chatNote, setChatNote] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [spec, setSpec] = useState(EMPTY_SPEC);
  const [specErrors, setSpecErrors] = useState({});
  // Bumped to reset the custom form (and its design dropdown)
  const [specFormKey, setSpecFormKey] = useState(0);
  // Today's silver / gold rate for silver and gold products
  const [metalRate, setMetalRate] = useState(null);

  const sessionId = ApiService.getSessionId();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      setQuantity(1);
      setSpec(EMPTY_SPEC);
      setSpecErrors({});
      try {
        const { product: data } = await ApiService.getProductById(id);
        if (cancelled) return;
        setProduct(data);
        setSpecFormKey((k) => k + 1);

        const categoryId = data.category?._id;
        if (categoryId) {
          ApiService.getAllProducts({ category: categoryId, limit: 4 })
            .then((res) => {
              if (!cancelled) setRelatedProducts((res.products || []).filter((p) => p._id !== id).slice(0, 3));
            })
            .catch(() => {});
        }
      } catch (err) {
        if (!cancelled) setError(err.status === 404 ? "This product doesn't exist." : "Failed to load product. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const productType = product?.productType;
  useEffect(() => {
    setMetalRate(null);
    const fetchRate =
      productType === "silver" ? ApiService.getTodaysSilverPrice : productType === "gold" ? ApiService.getTodaysGoldPrice : null;
    if (!fetchRate) return;
    let cancelled = false;
    fetchRate
      .call(ApiService)
      .then((rate) => {
        if (!cancelled && rate?.pricePerTola != null) setMetalRate(rate);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id, productType]);

  useSeo({
    ready: !loading,
    title: product && product.isActive !== false ? product.title : "Product not available",
    description: product?.description,
    image: product?.images?.[0],
    path: `/product/${id}`,
    type: "product",
    noindex: !product || product.isActive === false,
    jsonLd: product && product.isActive !== false ? productJsonLd(product) : null,
  });

  const custom = isCustomSilver(product);
  const images = productImages(product);
  const silverRate = product?.pricing?.silverRate;

  // Unit price: fixed / stock silver from the API, custom silver from the chosen weight
  const unitPrice = useMemo(() => {
    if (!product) return null;
    if (custom) return estimateCustomPrice(product, spec, silverRate);
    return product.pricing?.price ?? product.constantPrice ?? null;
  }, [product, custom, spec, silverRate]);

  const setSpecField = (field, value) => {
    setSpec((s) => ({ ...s, [field]: value }));
    setSpecErrors((er) => ({ ...er, [field]: undefined }));
  };

  function validateSpec() {
    if (!custom) return true;
    const e = validateCustomPiece(product, spec);
    setSpecErrors(e);
    return Object.keys(e).length === 0;
  }

  const buildSpec = () => (custom ? valuesToSpec(spec) : undefined);

  async function addToCart() {
    setError("");
    if (!validateSpec()) {
      setError("Please complete the custom order details below.");
      document.getElementById("wc-custom-piece")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return false;
    }
    try {
      setAddingToCart(true);
      await ApiService.addToCart(sessionId, product._id, quantity, { customSpecification: buildSpec() });
      window.dispatchEvent(new Event("storage")); // Update navbar cart count
      return true;
    } catch (err) {
      const details = Array.isArray(err.details) ? `: ${err.details.join(", ")}` : "";
      setError(`${err.message || "Failed to add to cart"}${details}`);
      return false;
    } finally {
      setAddingToCart(false);
    }
  }

  const handleAddToCart = async () => {
    if (await addToCart()) {
      setSuccess(custom ? "Your custom order was added to the cart." : "Added to cart.");
      if (custom) {
        setSpec(EMPTY_SPEC);
        setSpecFormKey((k) => k + 1);
      }
      setTimeout(() => setSuccess(""), 3000);
    }
  };

  const handleBuyNow = async () => {
    if (await addToCart()) navigate("/checkout");
  };

  const handleShare = async () => {
    const copy = () =>
      navigator.clipboard?.writeText(window.location.href).then(() => {
        setSuccess("Product link copied to clipboard!");
        setTimeout(() => setSuccess(""), 2000);
      });
    if (navigator.share) {
      try {
        await navigator.share({ title: product.title, url: window.location.href });
      } catch {
        copy();
      }
    } else {
      copy();
    }
  };

  // Related products: same add-to-cart behaviour as the product list
  const addRelatedToCart = async (p) => {
    if (isCustomSilver(p)) {
      navigate(`/product/${p._id}`);
      return;
    }
    try {
      await ApiService.addToCart(sessionId, p._id, 1);
      window.dispatchEvent(new Event("storage"));
      setSuccess(`${p.title} was added to your cart.`);
    } catch (err) {
      setError(err.message || "Couldn't add that to your cart.");
    }
    setTimeout(() => setSuccess(""), 3000);
  };

  if (loading) {
    return (
      <div className="wc-page wc-pd min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 py-10 grid lg:grid-cols-2 gap-10" aria-hidden="true">
          <div className="wc-skeleton" style={{ aspectRatio: "1 / 1" }} />
          <div className="space-y-4">
            <div className="wc-skeleton h-6 w-1/3" />
            <div className="wc-skeleton h-12 w-3/4" />
            <div className="wc-skeleton h-24" />
            <div className="wc-skeleton h-40" />
          </div>
        </div>
        <p className="sr-only" role="status">
          Loading product...
        </p>
      </div>
    );
  }

  if (!product || product.isActive === false) {
    return (
      <div className="wc-page wc-pd min-h-screen flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-md mx-auto">
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "var(--wc-maroon)", color: "var(--wc-marigold)" }}
          >
            <AlertCircle size={28} />
          </div>
          <h1 className="text-3xl mb-2">Product not available</h1>
          <p className="mb-6" style={{ color: "var(--wc-ink-muted)" }}>
            {error || "This product is no longer available."}
          </p>
          <Link to="/products" className="wc-btn wc-btn-primary">
            Browse the collection
          </Link>
        </div>
      </div>
    );
  }

  const specs = specList(product);
  const height = productHeight(product);
  const inStock = isInStock(product);
  const showTotal = showsTotal(product);
  const totalText =
    unitPrice != null
      ? formatMoney(unitPrice * quantity)
      : custom && product.pricing?.priceRange
      ? `${formatMoney(product.pricing.priceRange.min)} – ${formatMoney(product.pricing.priceRange.max)}`
      : null;

  return (
    <div className="wc-page wc-pd min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 py-8 lg:py-10">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="wc-crumbs flex flex-wrap items-center gap-2 mb-5">
          <Link to="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link to="/products">Products</Link>
          {product.category && (
            <>
              <span aria-hidden="true">/</span>
              <Link to={`/products?category=${product.category._id}`}>{product.category.name}</Link>
            </>
          )}
          <span aria-hidden="true">/</span>
          <span aria-current="page" style={{ color: "var(--wc-ink)" }}>
            {product.title}
          </span>
        </nav>

        <button onClick={() => navigate(-1)} className="wc-btn wc-btn-outline wc-btn-sm mb-6">
          <ArrowLeft size={14} />
          Back
        </button>

        {error && (
          <div className="wc-alert wc-alert-error mb-6" role="alert">
            <AlertCircle size={18} className="flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
        {success && (
          <div className="wc-alert wc-alert-success mb-6" role="status">
            <CheckCircle size={18} className="flex-shrink-0" />
            <p>
              {success} <Link to="/cart">View cart</Link>
            </p>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Gallery */}
          <div className="lg:sticky lg:top-28">
            <ProductGallery
              key={product._id}
              images={images.length ? images : [productImage(product)]}
              canZoom={images.length > 0}
              title={product.title}
              onShare={handleShare}
            />
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="wc-eyebrow">{product.category?.name || "Welcome Craft"}</span>
                <span className="wc-pd-pill">
                  <BadgeCheck size={12} /> Handcrafted in Patan
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl leading-tight">{product.title}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <p className={`wc-stock ${inStock ? "wc-in-stock" : "wc-out-of-stock"}`}>
                  <span aria-hidden="true" />
                  {inStock ? "In stock" : "Out of stock"}
                </p>
                {metalRate && <MetalRate metal={productType} rate={metalRate} formatMoney={formatMoney} />}
              </div>
            </div>

            {/* Specifications */}
            {(height || specs.length > 0) && (
              <section className="wc-specs" aria-labelledby="wc-specs-title">
                <h2 id="wc-specs-title" className="wc-panel-title">
                  Specifications
                </h2>
                {height && (
                  <div className="wc-height">
                    <div className="wc-height-icon" aria-hidden="true">
                      <Ruler size={22} />
                    </div>
                    <div className="min-w-0">
                      <div className="wc-height-label">{height.range ? "Available heights" : "Height"}</div>
                      <div className="wc-height-value">
                        {formatLength(height.value, height.unit)}
                        <span>≈ {formatLength(height.value, height.unit, { other: true })}</span>
                      </div>
                    </div>
                  </div>
                )}
                {specs.length > 0 && (
                  <dl className="wc-spec-grid">
                    {specs.map(({ Icon, label: name, value }) => (
                      <div key={name} className="wc-spec">
                        <Icon size={15} aria-hidden="true" />
                        <dt>{name}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </section>
            )}

            {/* Price */}
            <div className="wc-panel space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="wc-panel-title">Price</h2>
                <span className="wc-price-badge">
                  <Handshake size={12} /> Negotiable
                </span>
              </div>

              {isSilver(product) ? (
                <>
                  <SilverFormula
                    rate={silverRate}
                    weight={
                      custom
                        ? spec.preferredWeight || `${product.weightRange?.min}–${product.weightRange?.max}`
                        : product.weightInTola
                    }
                    weightNote={custom ? (spec.preferredWeight ? "tola, your choice" : "tola, you choose") : "weight in tola"}
                    making={product.makingCost || 0}
                    formatMoney={formatMoney}
                    total={
                      showTotal &&
                      totalText && (
                        <div className="wc-formula-total">
                          <span>{custom ? "Estimated total" : quantity > 1 ? `Total for ${quantity}` : "Total"}</span>
                          <strong>= {totalText}</strong>
                          {unitPrice != null && <NprEquivalent npr={unitPrice * quantity} className="basis-full text-right text-xs" />}
                        </div>
                      )
                    }
                  />
                  <p className="text-sm" style={{ color: "var(--wc-ink-muted)" }}>
                    {!silverRate && "Today's silver rate isn't available yet. "}
                    {custom ? "Choose your weight below; the" : "The"} final price is agreed with you before you pay.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="wc-price-big">{totalText || priceLabel(product, formatMoney)}</span>
                    {quantity > 1 && unitPrice != null && (
                      <span className="text-sm" style={{ color: "var(--wc-ink-muted)" }}>
                        / {formatMoney(unitPrice)} each
                      </span>
                    )}
                    {unitPrice != null && <NprEquivalent npr={unitPrice * quantity} className="basis-full text-sm" />}
                  </div>
                  <p className="text-sm" style={{ color: "var(--wc-ink-muted)" }}>
                    The final price and delivery are agreed with you before you pay.
                  </p>
                </>
              )}
              <CurrencyDisclaimer />
            </div>

            {/* Description */}
            <div>
              <h2 className="wc-panel-title mb-2">About this piece</h2>
              <p className="leading-relaxed whitespace-pre-line" style={{ color: "var(--wc-ink-muted)" }}>
                {product.description}
              </p>
            </div>

            {/* Custom silver order details */}
            {custom && (
              <div id="wc-custom-piece" className="wc-panel space-y-4" style={{ scrollMarginTop: "7rem" }}>
                <h2 className="wc-panel-title">
                  <Sparkles size={14} /> Your custom piece
                </h2>
                <CustomPieceFields
                  key={`${product._id}-${specFormKey}`}
                  product={product}
                  values={spec}
                  errors={specErrors}
                  onChange={setSpecField}
                />
              </div>
            )}

            {/* Quantity + actions */}
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <span className="wc-panel-title">Quantity</span>
                <div className="wc-stepper">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1} aria-label="Decrease quantity">
                    <Minus size={16} />
                  </button>
                  <span aria-live="polite">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} aria-label="Increase quantity">
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <button onClick={handleAddToCart} disabled={addingToCart} className="wc-btn wc-btn-primary w-full" style={{ padding: "1rem 1.5rem" }}>
                <ShoppingBag size={16} />
                {addingToCart ? "Adding..." : `Add to cart${showTotal && unitPrice != null ? ` · ${formatMoney(unitPrice * quantity)}` : ""}`}
              </button>
              <div className="grid grid-cols-2 gap-3">
                {WHATSAPP_PHONE ? (
                  <a
                    href={`https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
                      `Hi! I'm interested in "${product.title}" (${window.location.href}). Could you share more details?`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="wc-btn wc-btn-whatsapp"
                    aria-label="Chat on WhatsApp"
                  >
                    <MessageCircle size={15} />
                    <span className="hidden sm:inline">Chat on</span> WhatsApp
                  </a>
                ) : (
                  <button type="button" onClick={() => setChatNote("WhatsApp")} className="wc-btn wc-btn-whatsapp" aria-label="Chat on WhatsApp">
                    <MessageCircle size={15} />
                    <span className="hidden sm:inline">Chat on</span> WhatsApp
                  </button>
                )}
                <button type="button" onClick={() => setChatNote("WeChat")} className="wc-btn wc-btn-wechat" aria-label="Chat on WeChat">
                  <MessagesSquare size={15} />
                  <span className="hidden sm:inline">Chat on</span> WeChat
                </button>
              </div>
              {chatNote && (
                <p className="text-xs text-center" role="status" style={{ color: "var(--wc-ink-muted)" }}>
                  {chatNote} chat is coming soon.
                  {SHOP.phone ? (
                    <>
                      {" "}
                      For now, call us on{" "}
                      <a href={SHOP.phoneHref} className="font-semibold underline" style={{ color: "var(--wc-crimson)" }}>
                        {SHOP.phone}
                      </a>
                      .
                    </>
                  ) : null}
                </p>
              )}
              <button onClick={handleBuyNow} disabled={addingToCart} className="wc-btn wc-btn-soft w-full">
                <ArrowRight size={14} />
                Buy now
              </button>
            </div>

            {/* Guarantee */}
            <div className="wc-panel">
              <h2 className="wc-panel-title mb-3">
                <ShieldCheck size={14} /> Buying from Welcome Craft
              </h2>
              <ul className="wc-guarantee space-y-2">
                <li>
                  <BadgeCheck size={15} /> Handcrafted by artisans in Patan, Lalitpur.
                </li>
                <li>
                  <Package size={15} /> Every piece is carefully packed for safe delivery.
                </li>
                <li>
                  <Truck size={15} /> No online payment: we confirm the final price, payment and delivery with you.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Related */}
        {relatedProducts.length > 0 && (
          <section className="mt-16 lg:mt-20">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
              <div>
                <span className="wc-eyebrow">You may also like</span>
                <h2 className="text-3xl mt-1">
                  More from <span className="wc-accent">{product.category?.name}</span>
                </h2>
              </div>
              <Link to={`/products?category=${product.category?._id}`} className="wc-text-link text-xs font-extrabold tracking-[0.14em] uppercase" style={{ color: "var(--wc-maroon)" }}>
                View all <ArrowRight size={12} className="inline" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedProducts.map((p) => (
                <ProductTile key={p._id} product={p} light onAddToCart={addRelatedToCart} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default SingleProductPage;
