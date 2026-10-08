import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Phone, Clock, Mail, ArrowUp, Navigation, MessageCircle } from "lucide-react";
import { FaFacebookF, FaInstagram, FaTiktok } from "react-icons/fa";
import ApiService from "../services/apiService";
import { SHOP, whatsappLink } from "../lib/shopInfo";
import logo from "../logo.jpg";
import "../styles/layout.css";

const SOCIAL_ICONS = [
  { key: "facebook", label: "Facebook", Icon: FaFacebookF },
  { key: "instagram", label: "Instagram", Icon: FaInstagram },
  { key: "tiktok", label: "TikTok", Icon: FaTiktok },
];


const HELP_LINKS = [
  { label: "About us", to: "/about" },
  { label: "Contact us", to: "/contact" },
  { label: "Your cart", to: "/cart" },
  { label: "Custom orders", to: "/contact" },
];

export default function Footer() {
  const [showTop, setShowTop] = useState(false);
  const [categories, setCategories] = useState([]);

  // Shop links come from the real categories
  useEffect(() => {
    ApiService.getAllCategories()
      .then((data) => setCategories((data.categories || []).slice(0, 6)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const social = SOCIAL_ICONS.filter(({ key }) => SHOP.social[key]);
  const chat = whatsappLink("Hello Welcome Craft!");

  return (
    <footer className="wc-footer">
      <div className="container mx-auto px-4 sm:px-6 pt-16 pb-10">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Brand + visit details */}
          <div className="lg:col-span-5 space-y-6">
            <Link to="/" className="flex items-center gap-3" style={{ textDecoration: "none" }}>
              <span className="w-12 h-12 rounded-full overflow-hidden ring-1 ring-white/20 flex-shrink-0">
                <img src={logo} alt="" className="w-full h-full object-cover" />
              </span>
              <span className="wc-brand-name" style={{ fontSize: "1.3rem" }}>
                Welcome Craft
              </span>
            </Link>
            <p className="text-sm leading-relaxed max-w-md">
              Buddhist statues and ornaments in silver, gold finishes, copper and bronze, handcrafted by artisans in Patan.
            </p>

            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="flex-shrink-0 mt-0.5" style={{ color: "var(--wc-marigold)" }} />
                <span>{SHOP.addressLines.join(", ")}</span>
              </li>
              <li className="flex items-start gap-3">
                <Clock size={18} className="flex-shrink-0 mt-0.5" style={{ color: "var(--wc-marigold)" }} />
                <span>{SHOP.hours}</span>
              </li>
              {SHOP.phone && (
                <li className="flex items-start gap-3">
                  <Phone size={18} className="flex-shrink-0 mt-0.5" style={{ color: "var(--wc-marigold)" }} />
                  <a href={SHOP.phoneHref}>{SHOP.phone}</a>
                </li>
              )}
              {SHOP.email && (
                <li className="flex items-start gap-3">
                  <Mail size={18} className="flex-shrink-0 mt-0.5" style={{ color: "var(--wc-marigold)" }} />
                  <a href={`mailto:${SHOP.email}`} className="break-all">
                    {SHOP.email}
                  </a>
                </li>
              )}
            </ul>

            <div className="flex flex-wrap gap-3">
              <a href={SHOP.mapsUrl} target="_blank" rel="noopener noreferrer" className="wc-btn wc-btn-gold wc-btn-sm">
                <Navigation size={14} /> Directions
              </a>
              {chat && (
                <a href={chat} target="_blank" rel="noopener noreferrer" className="wc-btn wc-btn-ghost wc-btn-sm">
                  <MessageCircle size={14} /> WhatsApp
                </a>
              )}
            </div>

            {social.length > 0 && (
              <div className="flex gap-3">
                {social.map(({ key, label, Icon }) => (
                  <a key={key} href={SHOP.social[key]} target="_blank" rel="noopener noreferrer" aria-label={label} className="wc-footer-social">
                    <Icon />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Link columns */}
          <nav aria-label="Footer" className="lg:col-span-3 grid grid-cols-2 gap-8">
            <div>
              <h2>Shop</h2>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/products" className="wc-footer-link">
                    All products
                  </Link>
                </li>
                {categories.map((c) => (
                  <li key={c._id}>
                    <Link to={`/products?category=${c._id}`} className="wc-footer-link">
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2>Help</h2>
              <ul className="space-y-2 text-sm">
                {HELP_LINKS.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="wc-footer-link">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Map */}
          <div className="lg:col-span-4">
            <h2>Find us</h2>
            <div className="wc-footer-map h-64 lg:h-72">
              <iframe
                title="Map to Welcome Craft"
                src={SHOP.mapsEmbedUrl}
                width="100%"
                height="100%"
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full border-0"
              ></iframe>
            </div>
          </div>
        </div>
      </div>

      <div className="wc-footer-bottom">
        <div className="container mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            © {new Date().getFullYear()} {SHOP.name}. All rights reserved.
          </p>
          <p style={{ color: "var(--wc-marigold)", letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700, fontSize: "0.62rem" }}>
            Handcrafted in Patan, Nepal
          </p>
        </div>
      </div>

      {showTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top" className="wc-to-top">
          <ArrowUp size={18} />
        </button>
      )}
    </footer>
  );
}
