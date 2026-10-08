import React, { useState, useEffect, useMemo } from "react";
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
  isCustomSilver,
  isSilver,
  label,
  priceLabel,
  productImage,
  productImages,
  variantLabel,
} from "../lib/productDisplay";
import ProductTile from "./shop/ProductTile";
import ProductGallery from "./shop/ProductGallery";
import { CurrencyDisclaimer, NprEquivalent } from "./shop/CurrencyNote";
import { useCurrency } from "../lib/currency";
import "../styles/product.css";

const WHATSAPP_PHONE = SHOP.whatsapp;

const SpecRow = ({ name, value }) =>
  value == null || value === "" ? null : (
    <div className="wc-spec-row">
      <dt>{name}</dt>
      <dd>{value}</dd>
    </div>
  );

const capitalize = (v) => (v ? v[0].toUpperCase() + v.slice(1) : "");

// Three summary tiles under the title, from the product's real fields
function summaryTiles(p) {
  const opts = p.customOptions || {};
  const dims = p.dimensions || {};
  const height = dims.height ? `${dims.height} ${dims.unit || "inch"}` : null;
  if (isCustomSilver(p)) {
    return [
      { Icon: Hammer, label: "Type", value: "Made to order" },
      { Icon: Scale, label: "Weight", value: `${p.weightRange?.min}–${p.weightRange?.max} tola` },
      { Icon: Clock, label: "Ready in", value: opts.productionTime ? `${opts.productionTime.minDays}–${opts.productionTime.maxDays} days` : "Ask us" },
    ];
  }
  if (isSilver(p)) {
    return [
      { Icon: Sparkles, label: "Metal", value: "Silver" },
      { Icon: Scale, label: "Weight", value: p.weightInTola ? `${p.weightInTola} tola` : "—" },
      height ? { Icon: Ruler, label: "Height", value: height } : { Icon: Package, label: "Availability", value: p.stockQuantity > 0 ? `${p.stockQuantity} in stock` : "Ask us" },
    ];
  }
  if (p.productType === "gold") {
    return [
      { Icon: Gem, label: "Finish", value: label(p.goldFinish) || "—" },
      p.platingMethod
        ? { Icon: Sparkles, label: "Plating", value: label(p.platingMethod) }
        : { Icon: Hammer, label: "Base metal", value: capitalize(p.baseMetal) || "—" },
      height ? { Icon: Ruler, label: "Height", value: height } : { Icon: Package, label: "Availability", value: p.stockQuantity > 0 ? `${p.stockQuantity} in stock` : "Ask us" },
    ];
  }
  return [
    { Icon: Hammer, label: "Material", value: capitalize(p.metal) || "—" },
    { Icon: Sparkles, label: "Finish", value: capitalize(p.finish) || "—" },
    height
      ? { Icon: Ruler, label: "Height", value: height }
      : { Icon: Scale, label: "Weight", value: p.weightInKg ? `${p.weightInKg} kg` : "—" },
  ];
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

  const custom = isCustomSilver(product);
  const images = productImages(product);
  const options = product?.customOptions || {};
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

  const dims = product.dimensions || {};
  const dimensionText = [dims.height && `H ${dims.height}`, dims.width && `W ${dims.width}`, dims.length && `L ${dims.length}`]
    .filter(Boolean)
    .join(" × ");
  const time = options.productionTime;
  const tiles = summaryTiles(product);
  const priceBadge = custom ? "Made to order" : isSilver(product) ? "Live silver price" : "Fixed price";

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
              chip={product.category?.name}
              badge={isSilver(product) ? (custom ? "Made to order" : "Live price") : null}
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
              {variantLabel(product) && (
                <p className="wc-pd-subtitle mt-2">
                  <Hammer size={14} style={{ color: "var(--wc-gold-deep)" }} />
                  {[product.category?.name, variantLabel(product)].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>

            <div className="wc-tiles">
              {tiles.map(({ Icon, label: name, value }) => (
                <div key={name} className="wc-tile">
                  <Icon size={16} />
                  <div className="wc-tile-label">{name}</div>
                  <div className="wc-tile-value">{value}</div>
                </div>
              ))}
            </div>

            {/* Price */}
            <div className="wc-panel">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="wc-price-big">
                    {unitPrice != null
                      ? formatMoney(unitPrice * quantity)
                      : custom && product.pricing?.priceRange
                      ? `${formatMoney(product.pricing.priceRange.min)} – ${formatMoney(product.pricing.priceRange.max)}`
                      : priceLabel(product, formatMoney)}
                  </span>
                  {quantity > 1 && unitPrice != null && (
                    <span className="text-sm" style={{ color: "var(--wc-ink-muted)" }}>
                      / {formatMoney(unitPrice)} each
                    </span>
                  )}
                  {unitPrice != null && <NprEquivalent npr={unitPrice * quantity} className="basis-full text-sm" />}
                </div>
                <span className="wc-price-badge">{priceBadge}</span>
              </div>
              <p className="text-sm mt-3" style={{ color: "var(--wc-ink-muted)" }}>
                {isSilver(product) && silverRate
                  ? `Today's silver rate ${formatMoney(silverRate)}/tola × weight, plus making charge ${formatMoney(product.makingCost)}. `
                  : ""}
                {isSilver(product) && !silverRate ? "Today's silver rate isn't available yet. " : ""}
                {custom
                  ? unitPrice != null
                    ? "Estimate for the weight you chose; the final price is confirmed with you."
                    : "The price depends on the weight you choose below."
                  : "The final price and delivery are confirmed with you before you pay."}
              </p>
              <CurrencyDisclaimer className="mt-2" />
            </div>

            {/* Description */}
            <div>
              <h2 className="wc-panel-title mb-2">About this piece</h2>
              <p className="leading-relaxed whitespace-pre-line" style={{ color: "var(--wc-ink-muted)" }}>
                {product.description}
              </p>
            </div>

            {/* Specifications */}
            <div className="wc-panel">
              <h2 className="wc-panel-title mb-1">Specifications</h2>
              <dl>
                <SpecRow name="Category" value={product.category?.name} />
                {product.productType === "gold" && (
                  <>
                    <SpecRow name="Gold finish" value={label(product.goldFinish)} />
                    <SpecRow name="Plating" value={label(product.platingMethod)} />
                    <SpecRow name="Base metal" value={capitalize(product.baseMetal)} />
                  </>
                )}
                {product.productType === "metal" && (
                  <>
                    <SpecRow name="Material" value={capitalize(product.metal)} />
                    <SpecRow name="Finish" value={capitalize(product.finish)} />
                  </>
                )}
                {isSilver(product) && !custom && <SpecRow name="Weight" value={product.weightInTola && `${product.weightInTola} tola`} />}
                {custom && (
                  <>
                    <SpecRow name="Weight range" value={`${product.weightRange?.min}–${product.weightRange?.max} tola`} />
                    {options.sizeRange && (options.sizeRange.minHeight != null || options.sizeRange.maxHeight != null) && (
                      <SpecRow
                        name="Height range"
                        value={`${options.sizeRange.minHeight ?? "—"}–${options.sizeRange.maxHeight ?? "—"} ${options.sizeRange.unit || "inch"}`}
                      />
                    )}
                    {time && <SpecRow name="Production time" value={`${time.minDays}–${time.maxDays} days`} />}
                  </>
                )}
                {isSilver(product) && <SpecRow name="Making charge" value={product.makingCost ? formatMoney(product.makingCost) : null} />}
                <SpecRow name="Weight" value={product.weightInKg && `${product.weightInKg} kg`} />
                <SpecRow name="Dimensions" value={dimensionText && `${dimensionText} ${dims.unit || "inch"}`} />
                {!custom && product.stockQuantity > 0 && <SpecRow name="Availability" value={`${product.stockQuantity} in stock`} />}
              </dl>
            </div>

            {/* Custom silver order details */}
            {custom && (
              <div id="wc-custom-piece" className="wc-panel space-y-4" style={{ scrollMarginTop: "7rem" }}>
                <div>
                  <h2 className="wc-panel-title">
                    <Sparkles size={14} /> Your custom piece
                  </h2>
                  {time && (
                    <p className="text-sm flex items-center gap-1 mt-1" style={{ color: "var(--wc-ink-muted)" }}>
                      <Clock size={14} /> Made to order in {time.minDays}–{time.maxDays} days
                    </p>
                  )}
                </div>
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
                {addingToCart ? "Adding..." : `Add to cart${unitPrice != null ? ` · ${formatMoney(unitPrice * quantity)}` : ""}`}
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
