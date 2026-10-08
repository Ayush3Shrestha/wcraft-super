import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Search, X, List, LayoutGrid, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import ApiService from "../services/apiService";
import { isCustomSilver } from "../lib/productDisplay";
import LivePriceCard from "./shop/LivePriceCard";
import ProductTile from "./shop/ProductTile";
import { convertToNpr, currencySymbol, useCurrency } from "../lib/currency";
import "../styles/catalog.css";

const HEADER_IMAGE = `${process.env.PUBLIC_URL}/images/hero-tara.webp`;

// Price filter value typed in `currency` -> whole NPR for the API
const toNpr = (value, currency, round) => {
  const npr = convertToNpr(value, currency);
  return npr == null ? "" : String(Math.max(0, round(npr)));
};

const ProductsPage = () => {
  const { currency } = useCurrency();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [cartMessage, setCartMessage] = useState("");
  const toastTimer = useRef(null);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [silverPrice, setSilverPrice] = useState(null);
  const [goldPrice, setGoldPrice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");
  const [sortBy, setSortBy] = useState("name");
  // Filters panel on phones/tablets (always shown from lg up)
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || ""
  );
  // Selected category _id; older links use ?categoryName=, resolved below
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get("category") || ""
  );
  const categoryNameParam = searchParams.get("categoryName");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  // Price filter actually applied (set when "Apply" is pressed), in the
  // currency the visitor typed it in
  const [appliedPrice, setAppliedPrice] = useState({ min: "", max: "", currency });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const productsPerPage = 12;
  // Search actually applied to the list (the box can hold unsubmitted text)
  const searchParam = searchParams.get("search") || "";
  const [appliedSearch, setAppliedSearch] = useState(searchParam);
  // Bumped by "Apply" so the price filter refetches
  const [refreshKey, setRefreshKey] = useState(0);

  // Searching from the navbar changes ?search= while this page is open
  useEffect(() => {
    setSearchTerm(searchParam);
    setAppliedSearch(searchParam);
    setCurrentPage(1);
  }, [searchParam]);

  // Fetch data on component mount and when filters change
  useEffect(() => {
    fetchData();
  }, [selectedCategory, sortBy, currentPage, appliedSearch, appliedPrice, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchCategories();
    fetchSilverPrice();
    fetchGoldPrice();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: productsPerPage,
        sort: sortBy,
        search: appliedSearch.trim(),
        category: selectedCategory,
        // Prices are stored in NPR
        minPrice: toNpr(appliedPrice.min, appliedPrice.currency, Math.floor),
        maxPrice: toNpr(appliedPrice.max, appliedPrice.currency, Math.ceil),
      };

      const response = await ApiService.getAllProducts(params);
      setProducts(response.products || []);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotalProducts(response.pagination?.totalProducts || 0);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await ApiService.getAllCategories(true);
      const list = response.categories || [];
      setCategories(list);
      // Support /products?categoryName=Silver links
      if (categoryNameParam && !selectedCategory) {
        const match = list.find((c) => c.name.toLowerCase() === categoryNameParam.toLowerCase());
        if (match) handleCategoryFilter(match._id);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchSilverPrice = async () => {
    try {
      const response = await ApiService.getTodaysSilverPrice();
      setSilverPrice(response);
    } catch (error) {
      console.error("Failed to fetch silver price:", error);
    }
  };

  const fetchGoldPrice = async () => {
    try {
      const response = await ApiService.getTodaysGoldPrice();
      setGoldPrice(response);
    } catch (error) {
      console.error("Failed to fetch gold price:", error);
    }
  };

  const addToCart = async (product) => {
    // Custom pieces need the customer's weight and design first
    if (isCustomSilver(product)) {
      navigate(`/product/${product._id}`);
      return;
    }
    try {
      const sessionId = ApiService.getSessionId();
      await ApiService.addToCart(sessionId, product._id, 1);
      window.dispatchEvent(new Event("storage"));
      setCartMessage(`${product.title} was added to your cart.`);
    } catch (error) {
      setCartMessage(error.message || "Couldn't add that to your cart. Please try again.");
    }
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setCartMessage(""), 3000);
  };

  const handleCategoryFilter = (categoryId) => {
    setSelectedCategory(categoryId);
    setCurrentPage(1);
    searchParams.delete("categoryName");
    if (categoryId) {
      searchParams.set("category", categoryId);
    } else {
      searchParams.delete("category");
    }
    setSearchParams(searchParams);
  };

  const selectedCategoryName = categories.find((c) => c._id === selectedCategory)?.name;

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    setAppliedSearch(searchTerm);
    setAppliedPrice({ ...priceRange, currency });
    setRefreshKey((k) => k + 1);
  };

  const clearFilters = () => {
    setSelectedCategory("");
    setSearchTerm("");
    setAppliedSearch("");
    setPriceRange({ min: "", max: "" });
    setAppliedPrice({ min: "", max: "", currency });
    setCurrentPage(1);
    searchParams.delete("categoryName");
    searchParams.delete("category");
    searchParams.delete("search");
    setSearchParams(searchParams);
  };

  const activeFilters = [
    selectedCategoryName && { key: "category", label: selectedCategoryName, clear: () => handleCategoryFilter("") },
    appliedSearch && {
      key: "search",
      label: `“${appliedSearch}”`,
      clear: () => {
        setSearchTerm("");
        setAppliedSearch("");
        setCurrentPage(1);
        searchParams.delete("search");
        setSearchParams(searchParams);
      },
    },
    (appliedPrice.min || appliedPrice.max) && {
      key: "price",
      label: `${currencySymbol(appliedPrice.currency)}${appliedPrice.currency === "NPR" ? " " : ""}${appliedPrice.min || "0"} – ${appliedPrice.max || "any"}`,
      clear: () => {
        setPriceRange({ min: "", max: "" });
        setAppliedPrice({ min: "", max: "", currency });
        setCurrentPage(1);
      },
    },
  ].filter(Boolean);

  // Page numbers around the current page, e.g. 1 … 4 5 6 … 12
  const pageNumbers = (() => {
    const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
    return [...pages].filter((n) => n >= 1 && n <= totalPages).sort((x, y) => x - y);
  })();

  const goToPage = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const totalAll = categories.reduce((sum, c) => sum + (c.productCount || 0), 0);

  return (
    <div className="wc-page min-h-screen" style={{ backgroundColor: "var(--wc-cream-light)" }}>
      {/* Header */}
      <section className="wc-dark wc-on-dark wc-catalog-head px-4 sm:px-6 py-14 lg:py-16" style={{ backgroundImage: `url(${HEADER_IMAGE})` }}>
        <div className="container mx-auto">
          <span className="wc-eyebrow">Handcrafted in Patan</span>
          <h1 className="text-4xl sm:text-5xl mt-3">
            Our <span className="wc-accent">Collection</span>
          </h1>
          <p className="mt-3 max-w-xl text-base sm:text-lg">
            Buddhist statues and ornaments in silver, gold finishes, copper and bronze.
          </p>
          {(silverPrice || goldPrice) && (
            <div className="grid sm:grid-cols-2 gap-3 max-w-xl mt-8">
              {silverPrice && <LivePriceCard label="Live silver price" price={silverPrice} />}
              {goldPrice && <LivePriceCard label="Live gold price" price={goldPrice} />}
            </div>
          )}
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters */}
          <aside className="lg:w-72 flex-shrink-0">
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              aria-expanded={filtersOpen}
              aria-controls="wc-filters"
              className="wc-btn wc-btn-outline w-full lg:hidden mb-4"
            >
              <SlidersHorizontal size={16} />
              {filtersOpen ? "Hide filters" : "Show filters"}
              {activeFilters.length > 0 && ` (${activeFilters.length})`}
            </button>

            <div id="wc-filters" className={`wc-filter-panel lg:sticky lg:top-28 space-y-7 ${filtersOpen ? "" : "hidden lg:block"}`}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl">Filters</h2>
                {activeFilters.length > 0 && (
                  <button type="button" onClick={clearFilters} className="wc-text-btn">
                    Clear all
                  </button>
                )}
              </div>

              <form onSubmit={handleSearch} role="search">
                <label htmlFor="wc-catalog-search" className="wc-filter-title block">
                  Search
                </label>
                <div className="relative">
                  <input
                    id="wc-catalog-search"
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name..."
                    className="wc-field pr-10"
                  />
                  <button
                    type="submit"
                    aria-label="Search"
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center"
                    style={{ color: "var(--wc-maroon)" }}
                  >
                    <Search size={16} />
                  </button>
                </div>
              </form>

              <fieldset>
                <legend className="wc-filter-title">Categories</legend>
                <div className="space-y-1">
                  {[{ _id: "", name: "All categories", productCount: totalAll || undefined }, ...categories].map((category) => {
                    const selected = selectedCategory === category._id;
                    return (
                      <label key={category._id || "all"} className={`wc-option ${selected ? "wc-selected" : ""}`}>
                        <span className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="category"
                            checked={selected}
                            onChange={() => handleCategoryFilter(category._id)}
                          />
                          {category.name}
                        </span>
                        {category.productCount !== undefined && <span className="wc-option-count">{category.productCount}</span>}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <form onSubmit={handleSearch}>
                <fieldset>
                  <legend className="wc-filter-title">Price ({currency})</legend>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      placeholder="Min"
                      aria-label="Minimum price"
                      value={priceRange.min}
                      onChange={(e) => setPriceRange((prev) => ({ ...prev, min: e.target.value }))}
                      className="wc-field"
                    />
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      placeholder="Max"
                      aria-label="Maximum price"
                      value={priceRange.max}
                      onChange={(e) => setPriceRange((prev) => ({ ...prev, max: e.target.value }))}
                      className="wc-field"
                    />
                  </div>
                  <button type="submit" className="wc-btn wc-btn-primary w-full mt-3">
                    Apply
                  </button>
                </fieldset>
              </form>
            </div>
          </aside>

          {/* Results */}
          <main className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm" style={{ color: "var(--wc-ink-muted)" }} aria-live="polite">
                  {loading ? "Loading..." : `Showing ${products.length} of ${totalProducts} ${totalProducts === 1 ? "piece" : "pieces"}`}
                </span>
                {activeFilters.map((f) => (
                  <span key={f.key} className="wc-pill">
                    {f.label}
                    <button type="button" onClick={f.clear} aria-label={`Remove filter ${f.label}`}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <label htmlFor="wc-sort" className="sr-only">
                  Sort by
                </label>
                <select id="wc-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="wc-field w-auto">
                  <option value="name">Sort by name</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                  <option value="newest">Newest first</option>
                </select>
                <div className="wc-segmented" role="group" aria-label="View">
                  <button type="button" onClick={() => setViewMode("grid")} aria-pressed={viewMode === "grid"} aria-label="Grid view">
                    <LayoutGrid size={16} />
                  </button>
                  <button type="button" onClick={() => setViewMode("list")} aria-pressed={viewMode === "list"} aria-label="List view">
                    <List size={16} />
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className={viewMode === "grid" ? "grid sm:grid-cols-2 xl:grid-cols-3 gap-6" : "space-y-4"} aria-hidden="true">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="wc-skeleton" style={{ height: viewMode === "grid" ? "26rem" : "13rem" }} />
                ))}
              </div>
            ) : products.length > 0 ? (
              <>
                <div className={viewMode === "grid" ? "grid sm:grid-cols-2 xl:grid-cols-3 gap-6" : "space-y-4"}>
                  {products.map((product, index) => (
                    <ProductTile
                      key={product._id}
                      product={product}
                      crimson={index % 4 === 0}
                      layout={viewMode === "list" ? "row" : "grid"}
                      onAddToCart={addToCart}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <nav aria-label="Pages" className="flex justify-center items-center gap-2 mt-12 flex-wrap">
                    <button type="button" className="wc-page-btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} aria-label="Previous page">
                      <ChevronLeft size={16} />
                    </button>
                    {pageNumbers.map((n, i) => (
                      <React.Fragment key={n}>
                        {i > 0 && n - pageNumbers[i - 1] > 1 && <span style={{ color: "var(--wc-ink-muted)" }}>…</span>}
                        <button
                          type="button"
                          className="wc-page-btn"
                          onClick={() => goToPage(n)}
                          aria-current={n === currentPage ? "page" : undefined}
                        >
                          {n}
                        </button>
                      </React.Fragment>
                    ))}
                    <button
                      type="button"
                      className="wc-page-btn"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      aria-label="Next page"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </nav>
                )}
              </>
            ) : (
              <div className="wc-filter-panel text-center py-14">
                <div
                  className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "var(--wc-maroon)", color: "var(--wc-marigold)" }}
                >
                  <Search size={26} />
                </div>
                <h2 className="text-2xl mb-2">No pieces found</h2>
                <p className="mb-6" style={{ color: "var(--wc-ink-muted)" }}>
                  Try another search or category, or ask us about a custom piece.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button type="button" onClick={clearFilters} className="wc-btn wc-btn-primary">
                    Clear filters
                  </button>
                  <Link to="/contact" className="wc-btn wc-btn-outline">
                    Contact us
                  </Link>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {cartMessage && (
        <div className="wc-toast" role="status">
          {cartMessage}{" "}
          <Link to="/cart" className="underline font-semibold" style={{ color: "var(--wc-marigold)" }}>
            View cart
          </Link>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
