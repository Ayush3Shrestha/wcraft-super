import React from "react";
import { Link } from "react-router-dom";
import { Users, Award, Heart, Sparkles, MapPin, Clock, MessageCircle, Package, Shield, Phone, ArrowRight, Navigation } from "lucide-react";
import { SHOP, whatsappLink } from "../lib/shopInfo";
import "../styles/home.css";
import "../styles/info.css";

const HERO_IMAGE = `${process.env.PUBLIC_URL}/images/image.png`;

const VALUES = [
  {
    Icon: Heart,
    title: "Spiritual Devotion",
    text: "Every piece is crafted with meditation and reverence, infusing spiritual energy into each creation.",
  },
  {
    Icon: Award,
    title: "Authentic Craftsmanship",
    text: "Traditional techniques preserved through generations of master artisans and their disciples.",
  },
  {
    Icon: Sparkles,
    title: "Modern Transparency",
    text: "Live precious metal pricing and open communication ensure fair and honest transactions.",
  },
  {
    Icon: Users,
    title: "Personal Service",
    text: "Direct communication and personalized attention for every customer's spiritual journey.",
  },
];

const PROCESS = [
  {
    title: "Material Selection",
    text: "We source only the finest silver, copper and bronze, ensuring purity and quality before the crafting process begins.",
  },
  {
    title: "Sacred Crafting",
    text: "Master artisans use traditional tools and techniques passed down through generations. Each piece is shaped with intention and devotion.",
  },
  {
    title: "Finishing & Care",
    text: "Finished pieces are gilded, polished or oxidized as required, checked carefully and packaged for their journey to you.",
  },
];

// What the shop actually sells, matching the product categories
const COLLECTIONS = [
  {
    eyebrow: "Stock & made to order",
    title: "Silver",
    text: "Statues and ornaments ready in stock, or made to your chosen weight, size and design. Priced on the day's silver rate plus making charge.",
    link: "/products?categoryName=Silver",
  },
  {
    eyebrow: "Oxidized to full gold",
    title: "Gold finishes",
    text: "Oxidized, color, half gold and full gold statues. Full gold pieces are electroplated or fire gold plated.",
    link: "/products?categoryName=Gold",
  },
  {
    eyebrow: "Cast by hand",
    title: "Copper & Bronze",
    text: "Traditional sculptures and statues of the Buddha, bodhisattvas and deities, cast and finished by hand.",
    link: "/products",
  },
];

const WHY = [
  {
    Icon: Shield,
    title: "Clear, Fair Pricing",
    text: "Silver prices follow the published daily rate, and we confirm the final price with you before you pay.",
  },
  {
    Icon: Package,
    title: "Secure Packaging",
    text: "Every piece is carefully packed so your statue or ornament arrives safely.",
  },
  {
    Icon: MessageCircle,
    title: "Personal Guidance",
    text: "Our team helps you choose the right piece and explains its meaning and tradition.",
  },
];

const muted = { color: "var(--wc-ink-muted)" };

const SectionHeading = ({ eyebrow, title, accent, text, center = true }) => (
  <div className={`mb-10 ${center ? "text-center" : ""}`}>
    <span className="wc-eyebrow">{eyebrow}</span>
    <h2 className="text-3xl sm:text-4xl mt-2">
      {title} {accent && <span className="wc-accent">{accent}</span>}
    </h2>
    {text && (
      <p className={`mt-3 text-base sm:text-lg ${center ? "max-w-2xl mx-auto" : ""}`} style={muted}>
        {text}
      </p>
    )}
  </div>
);

const AboutUsPage = () => {
  const chatUrl = whatsappLink("Hello! I'd like to know more about Welcome Craft and your Buddhist handicrafts.");

  return (
    <div className="wc-page wc-light-page min-h-screen">
      {/* Hero */}
      <section className="wc-hero wc-info-hero px-4 sm:px-6 py-16 lg:py-24" style={{ backgroundImage: `url(${HERO_IMAGE})` }}>
        <div className="container mx-auto max-w-3xl">
          <div className="wc-om" aria-hidden="true">
            🕉
          </div>
          <span className="wc-eyebrow" style={{ color: "var(--wc-gold)" }}>
            Our story · Patan, Lalitpur
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl leading-tight mt-3 mb-6">
            About <span className="wc-accent">Welcome Craft</span>
          </h1>
          <p className="text-base sm:text-lg leading-relaxed">
            Preserving the sacred art of Buddhist handicrafts through authentic craftsmanship, spiritual devotion, and modern
            transparency in precious metal pricing.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="px-4 sm:px-6 py-16 lg:py-20">
        <div className="container mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <SectionHeading eyebrow="Who we are" title="Our" accent="Story" center={false} />
            <div className="space-y-5 text-base sm:text-lg leading-relaxed -mt-4" style={muted}>
              <p>
                Welcome Craft was born from a deep reverence for Buddhist traditions and the ancient art of metalworking. Founded by
                master craftsmen who have dedicated their lives to preserving the sacred techniques passed down through
                generations.
              </p>
              <p>
                Our workshop is in Patan, the historic city of artisans, where skilled craftsmen have been creating spiritual
                artifacts for centuries. Each piece we craft carries the essence of meditation, devotion, and the timeless wisdom of
                Buddhist philosophy.
              </p>
              <p>
                Today, we combine traditional craftsmanship with modern transparency, offering live silver pricing and direct
                communication with our customers. We believe that spiritual art should be accessible, authentic, and fairly priced.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="wc-photo h-56">
                <img src="/images/guru.jpg" alt="Gold finished statue of Guru Rinpoche" />
              </div>
              <div className="wc-photo h-40">
                <img src="/images/bajra.jpg" alt="Hand-finished deity statue" />
              </div>
            </div>
            <div className="mt-8">
              <div className="wc-photo h-72">
                <img src="/images/Buddha1.jpg" alt="Seated Buddha statue" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What we make */}
      <section className="px-4 sm:px-6 py-16 lg:py-20" style={{ backgroundColor: "var(--wc-cream-light)" }}>
        <div className="container mx-auto">
          <SectionHeading
            eyebrow="The collection"
            title="What We"
            accent="Make"
            text="Buddhist sculptures, statues and ornaments in silver, gold finishes, copper and bronze"
          />
          <div className="grid md:grid-cols-3 gap-6">
            {COLLECTIONS.map((c) => (
              <Link key={c.title} to={c.link} className="wc-info-card wc-paper group">
                <span className="wc-count">{c.eyebrow}</span>
                <h3 className="text-2xl mt-2 mb-3">{c.title}</h3>
                <p className="text-sm leading-relaxed mb-4" style={muted}>
                  {c.text}
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--wc-maroon)" }}>
                  Shop {c.title.toLowerCase()} <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="px-4 sm:px-6 py-16 lg:py-20">
        <div className="container mx-auto">
          <SectionHeading
            eyebrow="What guides us"
            title="Our"
            accent="Values"
            text="The principles that guide our craft and our commitment to preserving Buddhist heritage"
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map(({ Icon, title, text }) => (
              <div key={title} className="wc-info-card text-center">
                <div className="wc-icon-circle mx-auto mb-4">
                  <Icon size={22} />
                </div>
                <h3 className="text-xl mb-2">{title}</h3>
                <p className="text-sm leading-relaxed" style={muted}>
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="wc-dark wc-on-dark px-4 sm:px-6 py-16 lg:py-20">
        <div className="container mx-auto">
          <div className="text-center mb-10">
            <span className="wc-eyebrow">From metal to shrine</span>
            <h2 className="text-3xl sm:text-4xl mt-2">
              Our Craftsmanship <span className="wc-accent">Process</span>
            </h2>
            <p className="mt-3 text-base sm:text-lg max-w-2xl mx-auto" style={{ color: "var(--wc-on-dark-muted)" }}>
              From raw materials to sacred artifacts — a journey of devotion and skill
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PROCESS.map((step, i) => (
              <div key={step.title} className="wc-step-card">
                <div className="wc-step-number mb-4">{String(i + 1).padStart(2, "0")}</div>
                <h3 className="text-xl mb-2">{step.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--wc-on-dark-muted)" }}>
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="px-4 sm:px-6 py-16 lg:py-20">
        <div className="container mx-auto">
          <SectionHeading eyebrow="Buying from us" title="Why Choose" accent="Welcome Craft" />
          <div className="grid md:grid-cols-3 gap-6">
            {WHY.map(({ Icon, title, text }) => (
              <div key={title} className="wc-info-card text-center">
                <div className="wc-icon-circle wc-gold mx-auto mb-4">
                  <Icon size={22} />
                </div>
                <h3 className="text-xl mb-2">{title}</h3>
                <p className="text-sm leading-relaxed" style={muted}>
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Visit / contact */}
      <section className="px-4 sm:px-6 pb-16 lg:pb-20">
        <div className="container mx-auto">
          <div className="wc-info-card wc-paper sm:p-8">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div className="space-y-5">
                <div>
                  <span className="wc-eyebrow">Come and see</span>
                  <h2 className="text-3xl sm:text-4xl mt-2">
                    Visit Our <span className="wc-accent">Shop</span>
                  </h2>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin size={18} className="mt-1 flex-shrink-0" style={{ color: "var(--wc-gold-deep)" }} />
                  <p style={muted}>
                    {SHOP.addressLines.map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                    <a href={SHOP.mapsUrl} target="_blank" rel="noopener noreferrer" className="wc-info-link inline-flex items-center gap-1 mt-1 text-sm">
                      <Navigation size={13} /> Get directions
                    </a>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Clock size={18} className="flex-shrink-0" style={{ color: "var(--wc-gold-deep)" }} />
                  <p style={muted}>{SHOP.hours}</p>
                </div>
                {SHOP.phone && (
                  <div className="flex items-center gap-3">
                    <Phone size={18} className="flex-shrink-0" style={{ color: "var(--wc-gold-deep)" }} />
                    <a href={SHOP.phoneHref} className="wc-info-link">
                      {SHOP.phone}
                    </a>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <Link to="/products" className="wc-btn wc-btn-primary w-full">
                  <Package size={15} />
                  Browse our collection
                </Link>
                <Link to="/contact" className="wc-btn wc-btn-soft w-full">
                  Contact us
                </Link>
                {chatUrl && (
                  <a href={chatUrl} target="_blank" rel="noreferrer" className="wc-btn wc-btn-whatsapp w-full">
                    <MessageCircle size={15} />
                    Chat on WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutUsPage;
