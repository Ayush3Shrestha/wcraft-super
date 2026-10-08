// The shop's contact details, in one place for the footer, About and
// Contact pages. Values can be overridden in frontend/.env (REACT_APP_...),
// and anything left empty is simply not shown.

const env = (name, fallback = "") => (process.env[name] ?? fallback).trim();
const digits = (value) => value.replace(/[^\d]/g, "");

const phone = env("REACT_APP_SHOP_PHONE", "9981267123");
const whatsapp = digits(env("REACT_APP_WHATSAPP_PHONE") || env("REACT_APP_WHATSAPP_NUMBER"));

export const SHOP = {
  name: "Welcome Craft",
  addressLines: ["Mahabuddha Temple Road", "Patan Sundhara", "Lalitpur, Nepal"],
  hours: env("REACT_APP_SHOP_HOURS", "Sunday – Friday, 10 AM – 7 PM"),
  phone,
  phoneHref: phone ? `tel:${digits(phone)}` : "",
  email: env("REACT_APP_SHOP_EMAIL"),
  whatsapp,
  mapsUrl:
    "https://www.google.com/maps/place/Welcome+Handicraft+Center/@27.6694709,85.3267291,17z/data=!4m6!3m5!1s0x39eb190024179ed7:0x86947efc747405ad!8m2!3d27.669319!4d85.327684!16s%2Fg%2F11y674bk3_",
  mapsEmbedUrl:
    "https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d3533.547418712462!2d85.3267291!3d27.6694709!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39eb190024179ed7%3A0x86947efc747405ad!2sWelcome%20Handicraft%20Center!5e0!3m2!1sen!2snp!4v1752839804910!5m2!1sen!2snp",
  social: {
    facebook: env("REACT_APP_FACEBOOK_URL"),
    instagram: env("REACT_APP_INSTAGRAM_URL"),
    tiktok: env("REACT_APP_TIKTOK_URL"),
  },
};

// wa.me link with an optional pre-filled message, or "" when no number is set
export const whatsappLink = (message = "") =>
  SHOP.whatsapp ? `https://wa.me/${SHOP.whatsapp}${message ? `?text=${encodeURIComponent(message)}` : ""}` : "";
