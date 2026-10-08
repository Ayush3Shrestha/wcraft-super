import React, { useState, useEffect, useRef } from "react";
import { Search, ShoppingBag, Menu, X, ArrowRight } from "lucide-react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import ApiService from "../services/apiService";
import { SHOP } from "../lib/shopInfo";
import CurrencySwitcher from "./shop/CurrencySwitcher";
import logo from "../logo.jpg";
import "../styles/layout.css";

const NAV_ITEMS = [
  { name: "Home", path: "/" },
  { name: "Products", path: "/products" },
  { name: "About Us", path: "/about" },
  { name: "Contact", path: "/contact" },
];

// Short messages for the announcement bar; all describe how the shop works
const ANNOUNCEMENTS = ["Silver priced on today's rate", "Custom silver pieces made to order", "Handcrafted in Patan, Lalitpur"];

function Brand({ compact = false }) {
  return (
    <Link to="/" className="wc-brand flex items-center gap-3">
      <span className="w-11 h-11 rounded-full overflow-hidden ring-1 ring-black/10 flex-shrink-0">
        <img src={logo} alt="" className="w-full h-full object-cover" />
      </span>
      <span className="flex flex-col">
        <span className="wc-brand-name whitespace-nowrap">Welcome Craft</span>
        {!compact && <span className="wc-brand-tag mt-1 hidden sm:block whitespace-nowrap">Buddhist Handicrafts · Patan</span>}
      </span>
    </Link>
  );
}

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const menuButtonRef = useRef(null);

  // Cart count: on each page change and whenever a page updates the cart
  useEffect(() => {
    const fetchCartCount = async () => {
      try {
        const response = await ApiService.getCart(ApiService.getSessionId());
        setCartCount(response.cart?.totalItems || 0);
      } catch {
        setCartCount(0);
      }
    };
    fetchCartCount();
    window.addEventListener("storage", fetchCartCount);
    return () => window.removeEventListener("storage", fetchCartCount);
  }, [location.pathname]);

  // Close menus when the page changes
  useEffect(() => {
    setIsMenuOpen(false);
    setIsSearchOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Mobile drawer: close on Escape and stop the page scrolling behind it
  useEffect(() => {
    if (!isMenuOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setIsMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [isMenuOpen]);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    navigate(`/products?search=${encodeURIComponent(q)}`);
    setSearchQuery("");
  };

  const cartLabel = cartCount > 0 ? `Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}` : "Cart";
  const badge = cartCount > 99 ? "99+" : cartCount;

  return (
    <>
      {/* Announcement bar */}
      <div className="wc-topbar">
        <div className="container mx-auto px-4 sm:px-6 h-8 flex items-center justify-between gap-4">
          <p className="truncate">
            <span aria-hidden="true">✦ </span>
            <span className="hidden lg:inline">{ANNOUNCEMENTS.join("  ·  ")}</span>
            <span className="lg:hidden">{ANNOUNCEMENTS[0]}</span>
          </p>
          {SHOP.phone && (
            <a href={SHOP.phoneHref} className="hidden sm:inline whitespace-nowrap">
              Call {SHOP.phone}
            </a>
          )}
        </div>
      </div>

      {/* Main navigation */}
      <header className={`wc-nav sticky top-0 z-50 ${scrolled ? "wc-nav-scrolled" : ""}`}>
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-20 gap-6">
            <Brand />

            <nav aria-label="Main" className="hidden lg:flex items-center gap-8">
              {NAV_ITEMS.map((item) => (
                <NavLink key={item.path} to={item.path} end={item.path === "/"} className="wc-nav-link">
                  {item.name}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-1">
              {/* On phones the switcher is in the menu drawer */}
              <span className="hidden sm:inline-flex">
                <CurrencySwitcher className="mr-1" />
              </span>

              {/* Search (desktop) */}
              <div className="hidden lg:block">
                {isSearchOpen ? (
                  <form onSubmit={handleSearch} role="search" className="flex items-center">
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Escape" && setIsSearchOpen(false)}
                      placeholder="Search statues, ornaments..."
                      aria-label="Search products"
                      className="wc-search-input"
                      autoFocus
                    />
                    <button type="submit" className="wc-search-submit" aria-label="Search">
                      <Search size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSearchOpen(false);
                        setSearchQuery("");
                      }}
                      className="wc-nav-icon ml-1"
                      aria-label="Close search"
                    >
                      <X size={18} />
                    </button>
                  </form>
                ) : (
                  <button onClick={() => setIsSearchOpen(true)} className="wc-nav-icon" aria-label="Search products">
                    <Search size={19} />
                  </button>
                )}
              </div>

              <Link to="/cart" className="wc-nav-icon" aria-label={cartLabel}>
                <ShoppingBag size={20} />
                {cartCount > 0 && (
                  <span className="wc-cart-badge" aria-hidden="true">
                    {badge}
                  </span>
                )}
              </Link>

              {/* Wrapper carries lg:hidden: .wc-nav-icon sets display itself */}
              <span className="lg:hidden">
                <button
                  ref={menuButtonRef}
                  className="wc-nav-icon"
                  onClick={() => setIsMenuOpen(true)}
                  aria-label="Open menu"
                  aria-expanded={isMenuOpen}
                  aria-controls="wc-mobile-menu"
                >
                  <Menu size={22} />
                </button>
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsMenuOpen(false)} aria-hidden="true" />
          <div
            id="wc-mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="wc-drawer absolute top-0 right-0 h-full w-[85%] max-w-sm shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-5 h-20 border-b border-black/10">
              <Brand compact />
              <button onClick={() => setIsMenuOpen(false)} className="wc-nav-icon" aria-label="Close menu" autoFocus>
                <X size={22} />
              </button>
            </div>

            <div className="px-5 py-6 flex-1 overflow-y-auto">
              <form onSubmit={handleSearch} role="search" className="flex mb-6">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search statues, ornaments..."
                  aria-label="Search products"
                  className="wc-search-input flex-1 w-auto"
                />
                <button type="submit" className="wc-search-submit" aria-label="Search">
                  <Search size={16} />
                </button>
              </form>

              <CurrencySwitcher full className="mb-6" />

              <nav aria-label="Main">
                {NAV_ITEMS.map((item) => (
                  <NavLink key={item.path} to={item.path} end={item.path === "/"} className="wc-drawer-link">
                    {item.name}
                    <ArrowRight size={16} aria-hidden="true" />
                  </NavLink>
                ))}
                <NavLink to="/cart" className="wc-drawer-link">
                  <span>Cart</span>
                  {cartCount > 0 ? (
                    <span className="wc-cart-badge" style={{ position: "static" }}>
                      {badge}
                    </span>
                  ) : (
                    <ArrowRight size={16} aria-hidden="true" />
                  )}
                </NavLink>
              </nav>
            </div>

            <div className="px-5 py-5 text-sm border-t border-black/10" style={{ color: "var(--wc-ink-muted)" }}>
              <p>{SHOP.addressLines.join(", ")}</p>
              <p className="mt-1">{SHOP.hours}</p>
              {SHOP.phone && (
                <a href={SHOP.phoneHref} className="inline-block mt-2 font-semibold" style={{ color: "var(--wc-maroon)" }}>
                  {SHOP.phone}
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
