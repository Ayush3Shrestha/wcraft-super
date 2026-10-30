import React, { useState } from "react";
import { storeJsonLd, useSeo } from "../lib/seo";
import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, Clock, MessageCircle, Send, CheckCircle, Navigation, Plus, Tag, User } from "lucide-react";
import { SHOP, whatsappLink } from "../lib/shopInfo";
import "../styles/home.css";
import "../styles/info.css";

const HERO_IMAGE = `${process.env.PUBLIC_URL}/images/image.png`;

const TOPICS = [
  "General question",
  "Custom order",
  "An order I've placed",
  "Visiting the shop",
  "Wholesale or bulk order",
];

// Answers based on how the shop works (see the product, cart and checkout pages)
const FAQS = [
  {
    q: "How are silver prices worked out?",
    a: "Silver pieces are priced on the day's silver rate per tola, multiplied by the weight, plus a making charge. The rate is shown on every silver product, and the final price is confirmed with you before you pay.",
  },
  {
    q: "Can I order a custom piece?",
    a: "Yes. Custom silver pieces let you choose the weight, size and design on the product page. The production time is shown there too. You can change the details from your cart until you place the order.",
  },
  {
    q: "How do I pay?",
    a: "There is no online payment yet. After you place an order, our team contacts you to confirm availability, the final price, payment and delivery.",
    soon: [
      "We're working on chat through WhatsApp and WeChat, so it's easier to talk to us and work together on your order.",
      "We also plan to add online payment through connectIPS or a similar payment platform in the future.",
    ],
  },
  {
    q: "Which gold finishes do you offer?",
    a: "Oxidized, color, half gold and full gold. Full gold pieces are either electroplated or fire gold plated. Each product shows its finish; ask us if you'd like a piece in a different finish.",
  },
];

const EMPTY = { name: "", contact: "", topic: TOPICS[0], message: "" };

function InfoCard({ Icon, title, children }) {
  return (
    <div className="wc-info-card flex items-start gap-4">
      <div className="wc-icon-circle">
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <h2 className="wc-panel-title mb-1.5">{title}</h2>
        <div className="text-sm space-y-1" style={{ color: "var(--wc-ink-muted)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

const ContactPage = () => {
  useSeo({
    title: "Contact & Visit the Shop",
    description: `Visit Welcome Craft on ${SHOP.addressLines.join(", ")}, or contact us about statues, custom silver orders and delivery. Open ${SHOP.hours}.`,
    path: "/contact",
    jsonLd: storeJsonLd(),
  });
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);

  const canSend = Boolean(SHOP.whatsapp || SHOP.email);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: undefined }));
    setSent(false);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Please tell us your name";
    if (!form.contact.trim()) e.contact = "Please add a phone number or email so we can reply";
    if (form.message.trim().length < 5) e.message = "Please write your message";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const composed = () =>
    `Hello Welcome Craft,\n\nTopic: ${form.topic}\n\n${form.message.trim()}\n\n— ${form.name.trim()} (${form.contact.trim()})`;

  // Messages go out through WhatsApp (preferred) or the visitor's email app
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const url = SHOP.whatsapp
      ? whatsappLink(composed())
      : `mailto:${SHOP.email}?subject=${encodeURIComponent(`${form.topic} — ${form.name.trim()}`)}&body=${encodeURIComponent(composed())}`;
    window.open(url, SHOP.whatsapp ? "_blank" : "_self");
    setSent(true);
  };

  const fieldClass = (name, extra = "") => `input-field w-full ${extra} ${errors[name] ? "wc-invalid" : ""}`;
  const errorText = (name) =>
    errors[name] && (
      <p id={`contact-${name}-error`} className="wc-field-error">
        {errors[name]}
      </p>
    );
  const describedBy = (name) => (errors[name] ? `contact-${name}-error` : undefined);

  return (
    <div className="wc-page wc-light-page min-h-screen">
      <section className="wc-hero wc-info-hero px-4 sm:px-6 py-16 lg:py-20" style={{ backgroundImage: `url(${HERO_IMAGE})` }}>
        <div className="container mx-auto max-w-3xl">
          <span className="wc-eyebrow" style={{ color: "var(--wc-gold)" }}>
            We're here to help
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl leading-tight mt-3 mb-5">
            Contact <span className="wc-accent">Us</span>
          </h1>
          <p className="text-base sm:text-lg">Questions about a statue, a custom order or visiting the shop? We're happy to help.</p>
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-6 py-12 lg:py-16">
        <div className="grid lg:grid-cols-5 gap-8 items-start">
          {/* Details */}
          <div className="lg:col-span-2 space-y-4">
            <InfoCard Icon={MapPin} title="Visit our shop">
              {SHOP.addressLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
              <a href={SHOP.mapsUrl} target="_blank" rel="noopener noreferrer" className="wc-info-link inline-flex items-center gap-1 pt-1">
                <Navigation size={13} /> Get directions
              </a>
            </InfoCard>

            <InfoCard Icon={Clock} title="Opening hours">
              <p>{SHOP.hours}</p>
            </InfoCard>

            {SHOP.phone && (
              <InfoCard Icon={Phone} title="Call us">
                <a href={SHOP.phoneHref} className="wc-info-link">
                  {SHOP.phone}
                </a>
              </InfoCard>
            )}

            {SHOP.whatsapp && (
              <InfoCard Icon={MessageCircle} title="WhatsApp">
                <a href={whatsappLink()} target="_blank" rel="noreferrer" className="wc-info-link">
                  +{SHOP.whatsapp}
                </a>
                <p>Send us photos or questions.</p>
              </InfoCard>
            )}

            {SHOP.email && (
              <InfoCard Icon={Mail} title="Email">
                <a href={`mailto:${SHOP.email}`} className="wc-info-link break-all">
                  {SHOP.email}
                </a>
              </InfoCard>
            )}
          </div>

          {/* Message form */}
          <div className="lg:col-span-3">
            <div className="wc-panel" style={{ padding: "1.75rem" }}>
              <span className="wc-eyebrow">Write to us</span>
              <h2 className="text-2xl sm:text-3xl mt-2 mb-1">
                Send us a <span className="wc-accent">message</span>
              </h2>
              <p className="text-sm mb-6" style={{ color: "var(--wc-ink-muted)" }}>
                {SHOP.whatsapp
                  ? "Your message opens in WhatsApp, ready to send."
                  : SHOP.email
                  ? "Your message opens in your email app, ready to send."
                  : "Please call or visit us — online messages aren't set up yet."}
              </p>

              {sent && (
                <div className="wc-alert wc-alert-success mb-5" role="status">
                  <CheckCircle size={18} className="flex-shrink-0" />
                  <p>
                    Your message is ready in {SHOP.whatsapp ? "WhatsApp" : "your email app"} — press send there. If nothing opened,
                    check that pop-ups are allowed{SHOP.phone ? ` or call us on ${SHOP.phone}` : ""}.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact-name" className="wc-field-label">
                      Your name <span aria-hidden="true">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="contact-name"
                        autoComplete="name"
                        value={form.name}
                        onChange={set("name")}
                        aria-invalid={!!errors.name}
                        aria-describedby={describedBy("name")}
                        className={fieldClass("name", "pl-10")}
                      />
                      <User size={16} className="wc-field-icon" aria-hidden="true" />
                    </div>
                    {errorText("name")}
                  </div>
                  <div>
                    <label htmlFor="contact-reply" className="wc-field-label">
                      Phone or email <span aria-hidden="true">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="contact-reply"
                        value={form.contact}
                        onChange={set("contact")}
                        placeholder="So we can reply"
                        aria-invalid={!!errors.contact}
                        aria-describedby={describedBy("contact")}
                        className={fieldClass("contact", "pl-10")}
                      />
                      <Phone size={16} className="wc-field-icon" aria-hidden="true" />
                    </div>
                    {errorText("contact")}
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-topic" className="wc-field-label">
                    Topic
                  </label>
                  <div className="relative">
                    <select id="contact-topic" value={form.topic} onChange={set("topic")} className="input-field w-full pl-10">
                      {TOPICS.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                    <Tag size={16} className="wc-field-icon" aria-hidden="true" />
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-message" className="wc-field-label">
                    Message <span aria-hidden="true">*</span>
                  </label>
                  <textarea
                    id="contact-message"
                    rows={5}
                    value={form.message}
                    onChange={set("message")}
                    aria-invalid={!!errors.message}
                    aria-describedby={describedBy("message")}
                    placeholder={
                      form.topic === "Custom order"
                        ? "Which deity or design, roughly what size or weight, and when you need it"
                        : "How can we help?"
                    }
                    className={fieldClass("message", "resize-none")}
                  />
                  {errorText("message")}
                </div>

                <button
                  type="submit"
                  disabled={!canSend}
                  className={`wc-btn w-full ${SHOP.whatsapp ? "wc-btn-whatsapp" : "wc-btn-primary"}`}
                  style={{ padding: "1rem 1.5rem" }}
                >
                  <Send size={15} />
                  {SHOP.whatsapp ? "Send on WhatsApp" : "Send by email"}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <section className="mt-16 lg:mt-20 max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <span className="wc-eyebrow">Good to know</span>
            <h2 className="text-3xl sm:text-4xl mt-2">
              Common <span className="wc-accent">questions</span>
            </h2>
          </div>
          <div className="space-y-3">
            {FAQS.map(({ q, a, soon }) => (
              <details key={q} className="wc-faq">
                <summary>
                  {q}
                  <span className="wc-faq-toggle" aria-hidden="true">
                    <Plus size={14} />
                  </span>
                </summary>
                <div className="wc-faq-body space-y-3">
                  <p>{a}</p>
                  {soon && (
                    <div className="wc-panel space-y-2" style={{ padding: "1rem" }}>
                      <span className="wc-soon">Coming soon</span>
                      <ul className="list-disc pl-5 space-y-1">
                        {soon.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
          <p className="text-center text-sm mt-8" style={{ color: "var(--wc-ink-muted)" }}>
            Want to know more about us? Read{" "}
            <Link to="/about" className="wc-info-link">
              our story
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
};

export default ContactPage;
