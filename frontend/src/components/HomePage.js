import React, { useState, useEffect, useRef } from "react";
import { ArrowRight, Gem, Sparkles, Flame, Package } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import ApiService from "../services/apiService";
import { imageUrl, isCustomSilver } from "../lib/productDisplay";
import LivePriceCard from "./shop/LivePriceCard";
import ProductTile from "./shop/ProductTile";
import "../styles/home.css";

const HERO_IMAGE = `${process.env.PUBLIC_URL}/images/hero-tara.webp`;

const MATERIAL_ICONS = { gold: Gem, silver: Sparkles, bronze: Flame, copper: Flame };

const HIGHLIGHTS = [
  {
    title: "Authentic Crafts",
    text: "Handcrafted by skilled artisans in Patan following traditional methods.",
  },
  {
    title: "Live Pricing",
    text: "Silver pieces are priced on the day's silver rate, so you always see a fair, current price.",
  },
  {
    title: "Trusted Service",
    text: "Direct communication and personalised service — we confirm every order with you.",
  },
];

const HomePage = () => {
  const navigate = useNavigate();
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [silverPrice, setSilverPrice] = useState(null);
  const [goldPrice, setGoldPrice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      const [productsRes, categoriesRes, silverRes, goldRes] = await Promise.allSettled([
        ApiService.getAllProducts({ limit: 8 }),
        ApiService.getAllCategories(true),
        ApiService.getTodaysSilverPrice(),
        ApiService.getTodaysGoldPrice(),
      ]);
      if (productsRes.status === "fulfilled") setFeaturedProducts(productsRes.value.products || []);
      if (categoriesRes.status === "fulfilled") setCategories(categoriesRes.value.categories || []);
      if (silverRes.status === "fulfilled") setSilverPrice(silverRes.value);
      if (goldRes.status === "fulfilled") setGoldPrice(goldRes.value);
      setLoading(false);
    };
    fetchData();
    return () => clearTimeout(toastTimer.current);
  }, []);

  const showToast = (message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3000);
  };

  const addToCart = async (product) => {
    // Custom pieces need the customer's weight and design first
    if (isCustomSilver(product)) {
      navigate(`/product/${product._id}`);
      return;
    }
    try {
      await ApiService.addToCart(ApiService.getSessionId(), product._id, 1);
      window.dispatchEvent(new Event("storage")); // Update navbar cart count
      showToast(`${product.title} was added to your cart.`);
    } catch (error) {
      showToast(error.message || "Couldn't add that to your cart. Please try again.");
    }
  };

  return (
    <div className="wc-page wc-home min-h-screen">
      {/* Hero */}
      <section className="wc-hero px-4 sm:px-6 py-16 lg:py-24 overflow-hidden" style={{ backgroundImage: `url(${HERO_IMAGE})` }}>
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-5">
                <span className="wc-eyebrow">
                  <span aria-hidden="true">🕉</span> Handcrafted in Patan · Lalitpur
                </span>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl leading-tight">
                  Sacred Forms <span className="wc-accent">Cast for Eternity</span>
                </h1>
                <p className="text-base sm:text-lg leading-relaxed max-w-xl">
                  Buddhist statues and ornaments in silver, gold finishes, copper and bronze — handcrafted by artisans in Patan, with silver
                  priced on the day's rate.
                </p>
              </div>

              {(silverPrice || goldPrice) && (
                <div className="grid sm:grid-cols-2 gap-3 max-w-xl">
                  {silverPrice && <LivePriceCard label="Live silver price" price={silverPrice} />}
                  {goldPrice && <LivePriceCard label="Live gold price" price={goldPrice} />}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/products" className="wc-btn wc-btn-primary">
                  Explore the collection <ArrowRight size={16} />
                </Link>
                <Link to="/about" className="wc-btn wc-btn-ghost">
                  Our story
                </Link>
              </div>
            </div>

            {/* Photo collage */}
            <div className="hidden sm:block">
              <div className="grid grid-cols-2 gap-4 max-w-lg lg:ml-auto">
                <div className="space-y-4">
                  <div className="wc-photo h-56">
                    <img src="/images/guru.jpg" alt="Gold finished statue of Guru Rinpoche" />
                  </div>
                  <div className="wc-photo h-44">
                    <img src="/images/bajra.jpg" alt="Hand-finished deity statue" />
                  </div>
                </div>
                <div className="mt-10">
                  <div className="wc-photo h-[26rem]">
                    <img src="/images/Buddha1.jpg" alt="Seated Buddha statue" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="px-4 sm:px-6 py-16 lg:py-20" style={{ backgroundColor: "var(--wc-cream)" }}>
        <div className="container mx-auto">
          <div className="mb-10">
            <span className="wc-eyebrow">The collection</span>
            <h2 className="text-3xl sm:text-4xl mt-2">
              Shop by <span className="wc-accent">Category</span>
            </h2>
            <p className="mt-2" style={{ color: "var(--wc-ink-muted)" }}>
              Discover our carefully curated collections
            </p>
          </div>

          {categories.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category) => {
                const Icon = MATERIAL_ICONS[category.materialType] || Package;
                return (
                  <Link key={category._id} to={`/products?category=${category._id}`} className="wc-category-card group">
                    {category.imageUrl ? (
                      <div className="h-48 overflow-hidden" style={{ backgroundColor: "var(--wc-charcoal)" }}>
                        <img
                          src={imageUrl(category.imageUrl)}
                          alt={category.name}
                          onError={(e) => (e.currentTarget.style.display = "none")}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div className="wc-category-band" aria-hidden="true">
                        <Icon size={44} strokeWidth={1.5} />
                      </div>
                    )}
                    <div className="p-6">
                      <h3 className="text-2xl mb-2">{category.name}</h3>
                      {category.description && (
                        <p className="text-sm mb-4" style={{ color: "var(--wc-ink-muted)" }}>
                          {category.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        {category.productCount !== undefined && (
                          <span className="wc-count">
                            {category.productCount} {category.productCount === 1 ? "piece" : "pieces"}
                          </span>
                        )}
                        <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" style={{ color: "var(--wc-maroon)" }} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            !loading && <p style={{ color: "var(--wc-ink-muted)" }}>Categories will appear here soon.</p>
          )}
        </div>
      </section>

      {/* Featured products */}
      <section className="px-4 sm:px-6 py-16 lg:py-20" style={{ backgroundColor: "var(--wc-cream-light)" }}>
        <div className="container mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="wc-eyebrow">Featured</span>
              <h2 className="text-3xl sm:text-4xl mt-2">
                Handpicked <span className="wc-accent">Treasures</span>
              </h2>
              <p className="mt-2" style={{ color: "var(--wc-ink-muted)" }}>
                Statues and ornaments from our workshop
              </p>
            </div>
            <Link to="/products" className="wc-btn wc-btn-outline self-start sm:self-auto">
              View all <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center">
              <div className="spinner mb-4"></div>
              <p style={{ color: "var(--wc-ink-muted)" }}>Loading Buddhist treasures...</p>
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {featuredProducts.slice(0, 8).map((product, index) => (
                <ProductTile key={product._id} product={product} crimson={index % 4 === 0} onAddToCart={addToCart} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg" style={{ color: "var(--wc-ink-muted)" }}>
                No products available at the moment.
              </p>
              <p className="text-sm mt-2" style={{ color: "var(--wc-ink-muted)" }}>
                Please check back later or <Link to="/contact" className="underline">contact us</Link>.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Highlights */}
      <section className="wc-dark wc-on-dark px-4 sm:px-6 py-16 lg:py-20">
        <div className="container mx-auto">
          <span className="wc-eyebrow">Why Welcome Craft</span>
          <h2 className="text-3xl sm:text-4xl mt-2 mb-10">
            Made with <span className="wc-accent">Devotion</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {HIGHLIGHTS.map((item, i) => (
              <div key={item.title} className="wc-step-card">
                <div className="wc-step-number mb-4">{String(i + 1).padStart(2, "0")}</div>
                <h3 className="text-xl mb-2">{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--wc-on-dark-muted)" }}>
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {toast && (
        <div className="wc-toast" role="status">
          {toast}{" "}
          <Link to="/cart" className="underline font-semibold" style={{ color: "var(--wc-marigold)" }}>
            View cart
          </Link>
        </div>
      )}
    </div>
  );
};

export default HomePage;
