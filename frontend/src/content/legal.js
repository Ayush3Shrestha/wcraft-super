import React from "react";
import { Link } from "react-router-dom";
import { SHOP } from "../lib/shopInfo";

// Text of the Privacy Policy, Terms of Service and Refund Policy pages.
// The business rules below are the shop's own choices; change them here and
// every page that mentions them follows. Have the final wording checked by
// someone who knows Nepali consumer and privacy law before relying on it.

export const LAST_UPDATED = "27 October 2026";

export const POLICY = {
  returnDays: 7, // days after delivery to ask for a return of a ready-made piece
  damageReportHours: 48, // hours after delivery to report damage in transit
  refundWorkingDays: 7, // working days to pay a refund once approved
};

const contactLine = [SHOP.phone && `phone ${SHOP.phone}`, SHOP.whatsapp && "WhatsApp", SHOP.email && `email ${SHOP.email}`]
  .filter(Boolean)
  .join(", ");

const contactSection = {
  id: "contact",
  heading: "Contact us",
  body: [
    <>
      Questions about this page? Reach us by {contactLine || "phone"}, through the <Link to="/contact">contact page</Link>, or visit
      the shop at {SHOP.addressLines.join(", ")} ({SHOP.hours}).
    </>,
  ],
};

export const PRIVACY = {
  path: "/privacy-policy",
  title: "Privacy Policy",
  description: "How Welcome Craft collects, uses and protects the details you share when you browse the shop and place an order.",
  intro: `${SHOP.name} ("we", "us") is a handicraft shop in Patan, Lalitpur. This policy explains what information we collect when you use this website, why we collect it and the choices you have. We only collect what we need to answer your questions and fulfil your orders.`,
  sections: [
    {
      id: "what-we-collect",
      heading: "Information we collect",
      body: [
        "When you place an order or send us a custom-order request, we ask for:",
        {
          list: [
            "your name and phone number (required, so we can confirm the order with you);",
            "your email address (optional, to send you an order confirmation);",
            "your delivery address;",
            "order notes and, for custom pieces, the weight, size, design and reference details you give us.",
          ],
        },
        "When you browse, your browser stores a random cart ID and your chosen display currency on your own device, so your cart and currency are remembered. These are not linked to your name until you place an order.",
        "Like most websites, our server may keep short-term technical logs (such as IP address, browser type and the pages requested) to keep the site secure and working.",
      ],
    },
    {
      id: "how-we-use",
      heading: "How we use it",
      body: [
        {
          list: [
            "to confirm your order, agree the final price and arrange payment and delivery;",
            "to make custom pieces to your specification;",
            "to contact you by phone, WhatsApp or email about your order;",
            "to keep records required for accounting and tax;",
            "to prevent fraud and keep the website secure.",
          ],
        },
        "We do not sell your information, and we do not send marketing messages unless you ask us to.",
      ],
    },
    {
      id: "sharing",
      heading: "Who we share it with",
      body: [
        "We share your details only when needed to serve you:",
        {
          list: [
            "delivery or courier partners receive your name, phone number and address to deliver your order;",
            "our email provider sends order confirmations on our behalf;",
            "if you message us on WhatsApp or another chat app, that service handles the conversation under its own privacy policy;",
            "authorities, if the law requires it.",
          ],
        },
      ],
    },
    {
      id: "third-parties",
      heading: "Third-party services on this site",
      body: [
        "This site loads fonts from Google Fonts and shows a Google Maps map on the contact page. These services may receive your IP address when your browser loads them. Exchange rates for other currencies are fetched by our server, and no personal information is sent.",
        "We do not use advertising or tracking cookies.",
      ],
    },
    {
      id: "retention",
      heading: "How long we keep it",
      body: [
        "We keep order records for as long as needed to complete the order, handle returns or repairs, and meet accounting and legal requirements. You can clear the cart ID and currency stored in your browser at any time by clearing this site's data.",
      ],
    },
    {
      id: "your-rights",
      heading: "Your choices and rights",
      body: [
        "You can ask us to show you the information we hold about you, correct it, or delete it where we are not required to keep it. Contact us using the details below and we will reply within a reasonable time.",
      ],
    },
    {
      id: "security",
      heading: "Security",
      body: [
        "We protect your information with reasonable technical and organisational measures, and only our staff who handle orders can see it. No online system is perfectly secure, so please don't send payment card details or passwords through order notes or chat. We never ask for them.",
      ],
    },
    {
      id: "children",
      heading: "Children",
      body: ["This site is not meant for children under 16, and we do not knowingly collect their information."],
    },
    {
      id: "changes",
      heading: "Changes to this policy",
      body: ["We may update this policy from time to time. The date at the top shows when it last changed."],
    },
    contactSection,
  ],
};

export const TERMS = {
  path: "/terms",
  title: "Terms of Service",
  description: "The terms for browsing Welcome Craft and ordering handcrafted statues and ornaments, including pricing, custom orders and delivery.",
  intro: `These terms apply when you use this website and order from ${SHOP.name}. By placing an order you agree to them, so please read them along with our Privacy Policy and Refund Policy.`,
  sections: [
    {
      id: "products",
      heading: "Our products",
      body: [
        "Every piece is handcrafted in Patan. Small differences in size, weight, finish and detail from the photos are part of handmade work and are not defects. Photos show the piece or a close example; colours can look different on different screens.",
        "Sizes and weights are given as accurately as we can. If an exact measurement matters to you, ask us before ordering.",
      ],
    },
    {
      id: "prices",
      heading: "Prices",
      body: [
        {
          list: [
            "Silver pieces are priced from today's silver rate per tola multiplied by the weight, plus a making charge. The silver rate changes daily, so the price can change until your order is confirmed.",
            "Other pieces have a listed price. Prices are negotiable and the final price is agreed with you before you pay.",
            "Prices are in Nepali rupees (NPR). Amounts shown in other currencies are approximate conversions for your information only; you pay the agreed amount in NPR unless we agree otherwise.",
            "Prices do not include delivery charges, international shipping, customs duties or import taxes, which we tell you about before you pay.",
          ],
        },
      ],
    },
    {
      id: "orders",
      heading: "Placing an order",
      body: [
        "Sending an order through the website is a request, not a final contract. Our team contacts you to confirm availability, the final price, payment and delivery. The order is accepted only when we both confirm it.",
        "We may decline or cancel an order, for example if a piece is no longer available or a price was shown incorrectly. If you have already paid, we refund you in full.",
      ],
    },
    {
      id: "custom-orders",
      heading: "Custom orders",
      body: [
        "Custom pieces are made to the weight, size and design you choose. The price shown is an estimate; the final weight of a handmade piece can differ slightly from the one requested, and the price is adjusted to the actual weight at the agreed rate.",
        "Production times are estimates and can change with the complexity of the work, festivals and holidays. We keep you informed. We may ask for an advance payment before starting a custom piece.",
      ],
    },
    {
      id: "payment",
      heading: "Payment",
      body: [
        "This website does not take online payments. Payment is arranged with you after the order is confirmed, by a method we agree on (such as cash at the shop, bank transfer or a digital wallet). Ownership of the piece passes to you once it is paid in full.",
      ],
    },
    {
      id: "delivery",
      heading: "Delivery and collection",
      body: [
        "You can collect your order from the shop or have it delivered. Delivery times given are estimates. The risk of loss or damage passes to you when the piece is handed to you or to the person you name. See the Refund Policy for what to do if a piece arrives damaged.",
        "For international orders, you are responsible for any customs duties and import rules in your country, including rules on religious artefacts and precious metals.",
      ],
    },
    {
      id: "cancellations",
      heading: "Cancellations, returns and refunds",
      body: [
        <>
          These are explained in our <Link to="/refund-policy">Refund Policy</Link>.
        </>,
      ],
    },
    {
      id: "website-use",
      heading: "Using this website",
      body: [
        "Please don't misuse the site, for example by trying to access the admin area, interfering with how it works, or placing false orders. The text, photos and designs on this site belong to us or the artisans we work with; please don't copy them for commercial use without permission.",
      ],
    },
    {
      id: "liability",
      heading: "Our responsibility",
      body: [
        "We take care to keep the information on this site accurate, but mistakes can happen and we may correct them at any time. As far as the law allows, our responsibility for any order is limited to the amount you paid for it. Nothing in these terms limits your rights under Nepal's consumer protection law.",
      ],
    },
    {
      id: "law",
      heading: "Governing law",
      body: ["These terms are governed by the laws of Nepal. Any dispute that we cannot settle together goes to the courts of Lalitpur."],
    },
    {
      id: "changes",
      heading: "Changes to these terms",
      body: ["We may update these terms from time to time. The terms in place when your order is confirmed apply to that order."],
    },
    contactSection,
  ],
};

export const REFUND = {
  path: "/refund-policy",
  title: "Refund Policy",
  description: `Cancellations, returns and refunds at Welcome Craft: ${POLICY.returnDays}-day returns on ready-made pieces, damage in transit, and custom orders.`,
  intro:
    "We want you to love your piece. Because every order is confirmed with you in person before you pay, most questions are settled before anything is made or sent. If something still isn't right, here is how we handle it.",
  sections: [
    {
      id: "cancellations",
      heading: "Cancelling an order",
      body: [
        {
          list: [
            "Ready-made pieces: you can cancel free of charge at any time before the piece is handed over or sent.",
            "Custom pieces: you can cancel free of charge until we confirm that work has started. After that, we refund what you paid minus the cost of work already done, which we explain to you.",
          ],
        },
      ],
    },
    {
      id: "returns",
      heading: "Returns of ready-made pieces",
      body: [
        `You can ask to return a ready-made piece within ${POLICY.returnDays} days of receiving it. It must be unused, in its original condition and packaging, and not engraved, altered or polished. Contact us first so we can arrange the return.`,
        "Unless the piece was faulty or not what you ordered, return delivery costs are paid by you, and the original delivery charge is not refunded.",
      ],
    },
    {
      id: "custom",
      heading: "Custom pieces",
      body: [
        "Custom pieces are made especially for you, so they cannot be returned because you changed your mind. If a custom piece doesn't match the specification we agreed (allowing for the small variations of handmade work), tell us and we will repair it, remake it, or refund you.",
      ],
    },
    {
      id: "damaged",
      heading: "Damaged or wrong items",
      body: [
        `If a piece arrives damaged or isn't what you ordered, contact us within ${POLICY.damageReportHours} hours of delivery with photos of the piece and its packaging. Please keep the packaging. We will repair, replace or refund it at no cost to you.`,
      ],
    },
    {
      id: "refunds",
      heading: "How refunds are paid",
      body: [
        `Once we receive and check a returned piece (or approve a cancellation), we pay the refund within ${POLICY.refundWorkingDays} working days, using the same method you paid with where possible.`,
        "You get back the amount you paid in Nepali rupees. For silver pieces, the refund is based on what you paid, not on the silver rate on the day of the return. Bank or transfer fees charged by your bank, international shipping and customs duties are not refundable.",
      ],
    },
    {
      id: "exchanges",
      heading: "Exchanges",
      body: ["Would you rather have a different piece? Tell us when you contact us and we will gladly arrange an exchange, adjusting for any difference in price."],
    },
    contactSection,
  ],
};

export const LEGAL_PAGES = [PRIVACY, TERMS, REFUND];
