/**
 * Messaging Service for WhatsApp and Telegram integration
 * Handles sending order notifications to the admin
 */

// Helper function to format a message for orders
const formatOrderMessage = (order, productDetails) => {
  const message = `
🛒 *NEW ORDER RECEIVED* 🛒

*Order ID:* ${order._id}
*Date:* ${new Date(order.createdAt).toLocaleString()}

📦 *PRODUCT DETAILS*
*Name:* ${productDetails.title}
*Category:* ${productDetails.category?.name || 'N/A'}
${productDetails.weightInTola ? `*Weight:* ${productDetails.weightInTola} tola` : ''}
${productDetails.dimensions?.height ? `*Height:* ${productDetails.dimensions.height} ${productDetails.dimensions.unit || ''}` : ''}
${productDetails.silverType ? `*Type:* ${productDetails.silverType === 'custom' ? 'Custom silver' : 'Stock silver'}` : ''}
${productDetails.goldFinish ? `*Gold finish:* ${productDetails.goldFinish.replace('_', ' ')}${productDetails.platingMethod ? ` (${productDetails.platingMethod.replace(/_/g, ' ')})` : ''}` : ''}
${order.customSpecification?.preferredWeight ? `*Requested weight:* ${order.customSpecification.preferredWeight} tola` : ''}
${order.customSpecification?.size?.height ? `*Requested size:* ${[order.customSpecification.size.height, order.customSpecification.size.width, order.customSpecification.size.length].filter(Boolean).join(' x ')} ${order.customSpecification.size.unit || ''}` : ''}
${order.customSpecification?.design ? `*Design:* ${order.customSpecification.design}` : ''}
${order.customSpecification?.designNotes ? `*Design notes:* ${order.customSpecification.designNotes}` : ''}
${order.customSpecification?.estimatedCompletion?.latest ? `*Est. ready by:* ${new Date(order.customSpecification.estimatedCompletion.latest).toDateString()}` : ''}
${order.customization ? `*Customization:* ${order.customization}` : ''}

💰 *PRICING*
${order.totalPrice ? `*Total Price:* Rs. ${order.totalPrice}` : '*Price:* To be determined'}
${order.silverPriceSnapshot ? `*Silver Price Rate:* Rs. ${order.silverPriceSnapshot} per tola` : ''}

👤 *CUSTOMER DETAILS*
*Name:* ${order.customerName}
*Contact:* ${order.customerPhone}
${order.customerEmail ? `*Email:* ${order.customerEmail}` : ''}
${order.customerAddress ? `*Address:* ${order.customerAddress}` : ''}

📝 *ADDITIONAL NOTES*
${order.notes || 'No additional notes'}

------------------------------
Please confirm this order with the customer.
`;

  return message;
};

// Generate WhatsApp URL for sending messages
const generateWhatsAppLink = (phoneNumber, message) => {
  // Ensure phone number has country code and no special characters
  const formattedPhone = phoneNumber.replace(/[^0-9]/g, '');
  
  // Create WhatsApp URL with encoded message
  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
};

// Send order notification via WhatsApp
const sendWhatsAppOrderNotification = (order, productDetails) => {
  try {
    const adminPhone = process.env.WHATSAPP_PHONE;
    
    if (!adminPhone) {
      console.error('WhatsApp phone number not configured in environment variables');
      return { success: false, error: 'WhatsApp phone not configured' };
    }
    
    const message = formatOrderMessage(order, productDetails);
    const whatsappUrl = generateWhatsAppLink(adminPhone, message);
    
    return { 
      success: true, 
      url: whatsappUrl,
      message: 'WhatsApp notification link generated'
    };
  } catch (error) {
    console.error('Error generating WhatsApp notification:', error);
    return { success: false, error: error.message };
  }
};

// Generate a customer-facing WhatsApp message URL
const generateCustomerOrderUrl = (product, customerDetails = {}) => {
  try {
    const adminPhone = process.env.WHATSAPP_PHONE;
    
    if (!adminPhone) {
      console.error('WhatsApp phone number not configured in environment variables');
      return { success: false, error: 'WhatsApp phone not configured' };
    }

    const message = `
Hi! I'd like to order:

📦 Product: ${product.title}
💰 Category: ${product.category?.name || 'N/A'}
💵 Price: ${product.calculatedPrice ? `Rs. ${product.calculatedPrice}` : 'Please quote'}

${customerDetails.name ? `👤 Name: ${customerDetails.name}` : ''}
${customerDetails.phone ? `📱 Phone: ${customerDetails.phone}` : ''}
${customerDetails.address ? `📍 Address: ${customerDetails.address}` : ''}

Please confirm availability and provide more details.

Thank you!`;

    const whatsappUrl = generateWhatsAppLink(adminPhone, message);
    
    return { 
      success: true, 
      url: whatsappUrl
    };
  } catch (error) {
    console.error('Error generating customer WhatsApp URL:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendWhatsAppOrderNotification,
  generateCustomerOrderUrl,
  formatOrderMessage
};
