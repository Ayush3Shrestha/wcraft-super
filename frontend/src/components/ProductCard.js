import React from "react";

export default function ProductCard({
  image,
  title,
  category,
  price,
  product,
}) {
  // Function to generate WhatsApp order link
  const generateWhatsAppOrderLink = () => {
    const adminPhone = process.env.WHATSAPP_NUMBER; 

    // Create the message text
    const message = `
Hi! I'm interested in ordering:

📦 Product: ${title}
💰 Category: ${category}
💵 Price: ${price}

Please provide more details about availability and payment options.

Thank you!`;

    // Generate WhatsApp URL with phone and encoded message
    return `https://wa.me/${adminPhone}?text=${encodeURIComponent(message)}`;
  };

  // Handler for order button click
  const handleOrderClick = () => {
    const whatsappUrl = generateWhatsAppOrderLink();
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="w-full max-w-sm bg-white border border-white shadow-sm rounded-sm overflow-hidden hover:shadow-xl transition-shadow duration-300 ease-in-out">
      <img
        className="p-4 rounded-t-lg w-full h-[400px] object-cover"
        src={image}
        alt={title}
      />
      <div className="px-5 pb-5">
        <h5 className="text-lg font-body font-semibold tracking-tight text-black">
          {title}
        </h5>
        <p className="text-sm text-ggrey font-heading mb-2">{category}</p>
        <div className="flex items-center justify-between">
          <span className="text-xl font-heading font-semibold text-black">
            {price}
          </span>
          <button
            onClick={handleOrderClick}
            className="text-white font-body bg-manta border border-manta hover:bg-ggwhite hover:text-manta font-medium rounded-sm text-sm px-4 py-2 transition-colors duration-300 ease-in-out"
          >
            Order via WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
