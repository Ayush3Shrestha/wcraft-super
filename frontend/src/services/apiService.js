import { getAdminToken, clearAdminSession } from "./adminAuth";

export const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:8081/api";

// Base URL of the backend itself, for uploaded images (/uploads/...)
export const SERVER_URL = API_BASE_URL.replace(/\/api\/?$/, "");

class ApiService {
  // Helper method for making API calls
  static async makeRequest(endpoint, options = {}) {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      const token = getAdminToken();
      const isFormData = options.body instanceof FormData;
      const config = {
        ...options,
        headers: {
          // Let the browser set the multipart boundary for FormData
          ...(isFormData ? {} : { "Content-Type": "application/json" }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        },
      };

      const response = await fetch(url, config);

      // Admin session expired or was revoked
      if (response.status === 401 && token) {
        clearAdminSession();
      }

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Network error" }));
        const error = new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
        error.status = response.status;
        error.details = errorData.errors;
        throw error;
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Product API methods
  static async getAllProducts(filters = {}) {
    const params = new URLSearchParams();

    // Add filtering parameters
    if (filters.category) params.append("category", filters.category);
    if (filters.categoryName)
      params.append("categoryName", filters.categoryName);
    if (filters.materialType) params.append("materialType", filters.materialType);
    if (filters.search) params.append("search", filters.search);
    if (filters.sort) params.append("sort", filters.sort);
    if (filters.minPrice) params.append("minPrice", filters.minPrice);
    if (filters.maxPrice) params.append("maxPrice", filters.maxPrice);
    // Hidden products are only returned when asked for (admin panel)
    if (filters.includeInactive) params.append("includeInactive", "true");
    if (filters.limit) params.append("limit", filters.limit);
    if (filters.page) params.append("page", filters.page);

    const queryString = params.toString();
    return this.makeRequest(`/products${queryString ? "?" + queryString : ""}`);
  }

  static async getProductsByCategory(categoryId, options = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.append("limit", options.limit);
    if (options.page) params.append("page", options.page);

    const queryString = params.toString();
    return this.makeRequest(
      `/categories/${categoryId}/products${
        queryString ? "?" + queryString : ""
      }`
    );
  }

  static async getProductById(productId) {
    return this.makeRequest(`/products/${productId}`);
  }

  // Accepts FormData (with images) or a plain object
  static async createProduct(productData) {
    return this.makeRequest("/products", {
      method: "POST",
      body:
        productData instanceof FormData
          ? productData
          : JSON.stringify(productData),
    });
  }

  // Accepts FormData (with images) or a plain object
  static async updateProduct(productId, productData) {
    return this.makeRequest(`/products/${productId}`, {
      method: "PUT",
      body:
        productData instanceof FormData
          ? productData
          : JSON.stringify(productData),
    });
  }

  static async deleteProduct(productId) {
    return this.makeRequest(`/products/${productId}`, {
      method: "DELETE",
    });
  }

  // Category API methods
  // includeInactive: count hidden products too (admin panel)
  static async getAllCategories(includeProductCount = false, { includeInactive = false } = {}) {
    const params = new URLSearchParams();
    if (includeProductCount) params.append("includeProductCount", "true");
    if (includeInactive) params.append("includeInactive", "true");
    const query = params.toString();
    return this.makeRequest(`/categories${query ? "?" + query : ""}`);
  }

  static async getCategoryById(categoryId) {
    return this.makeRequest(`/categories/${categoryId}`);
  }

  static async getCategoryProductSchema(categoryId) {
    return this.makeRequest(`/categories/${categoryId}/schema`);
  }

  // Accepts FormData (with an image file) or a plain object
  static async createCategory(categoryData) {
    return this.makeRequest("/categories", {
      method: "POST",
      body:
        categoryData instanceof FormData
          ? categoryData
          : JSON.stringify(categoryData),
    });
  }

  static async updateCategory(categoryId, categoryData) {
    return this.makeRequest(`/categories/${categoryId}`, {
      method: "PUT",
      body:
        categoryData instanceof FormData
          ? categoryData
          : JSON.stringify(categoryData),
    });
  }

  static async deleteCategory(categoryId) {
    return this.makeRequest(`/categories/${categoryId}`, {
      method: "DELETE",
    });
  }

  // Silver Price API methods
  static async getTodaysSilverPrice() {
    return this.makeRequest("/silver/today");
  }

  static async getSilverPriceHistory(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append("limit", params.limit);
    if (params.page) queryParams.append("page", params.page);

    const queryString = queryParams.toString();
    return this.makeRequest(
      `/silver/history${queryString ? "?" + queryString : ""}`
    );
  }

  static async manualSilverPriceScrape() {
    return this.makeRequest("/silver/scrape", {
      method: "POST",
    });
  }
  // Gold Price API methods
  static async getTodaysGoldPrice() {
    return this.makeRequest("/gold/today");
  }

  static async getGoldPriceHistory(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append("limit", params.limit);
    if (params.page) queryParams.append("page", params.page);

    const queryString = queryParams.toString();
    return this.makeRequest(
      `/gold/history${queryString ? "?" + queryString : ""}`
    );
  }

  static async manualGoldPriceScrape() {
    return this.makeRequest("/gold/scrape", {
      method: "POST",
    });
  }

  // Order API methods
  static async createOrder(orderData) {
    return this.makeRequest("/orders", {
      method: "POST",
      body: JSON.stringify(orderData),
    });
  }

  static async getAllOrders(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.search) params.append("search", filters.search);
    if (filters.limit) params.append("limit", filters.limit);
    if (filters.page) params.append("page", filters.page);
    const queryString = params.toString();
    return this.makeRequest(`/orders${queryString ? "?" + queryString : ""}`);
  }

  static async updateOrder(orderId, orderData) {
    return this.makeRequest(`/orders/${orderId}`, {
      method: "PUT",
      body: JSON.stringify(orderData),
    });
  }

  static async deleteOrder(orderId) {
    return this.makeRequest(`/orders/${orderId}`, {
      method: "DELETE",
    });
  }

  static async getOrderById(orderId) {
    return this.makeRequest(`/orders/${orderId}`);
  }

  static async updateOrderStatus(orderId, status) {
    return this.makeRequest(`/orders/${orderId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  }

  // Admin API methods
  static async adminLogin(username, password) {
    return this.makeRequest("/admin/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  }

  static async initializeAdmin() {
    return this.makeRequest("/admin/init", {
      method: "POST",
    });
  }

  static async getAdminProfile() {
    return this.makeRequest("/admin/profile");
  }

  // Utility methods
  static async healthCheck() {
    return this.makeRequest("/health", {}, "http://localhost:8081");
  }

  // Helper method to calculate silver product price
  static calculateSilverProductPrice(product, currentSilverPrice) {
    if (!product.weightInTola || !product.makingCost) {
      return null;
    }

    const silverCost = currentSilverPrice * product.weightInTola;
    return silverCost + product.makingCost;
  }

  // Cart API methods
  static async getCart(sessionId) {
    return this.makeRequest(`/cart/${sessionId}`);
  }

  // options: { customization, customSpecification } (the latter is
  // required for custom silver products)
  static async addToCart(sessionId, productId, quantity = 1, options = {}) {
    const { customization, customSpecification } =
      typeof options === "string" || options === null
        ? { customization: options }
        : options;
    return this.makeRequest(`/cart/${sessionId}/add`, {
      method: "POST",
      body: JSON.stringify({
        productId,
        quantity,
        customization: customization || undefined,
        customSpecification,
      }),
    });
  }

  // changes: { quantity, customization, customSpecification }; only the
  // keys given are updated
  static async updateCartItem(sessionId, itemId, changes = {}) {
    return this.makeRequest(`/cart/${sessionId}/item/${itemId}`, {
      method: "PUT",
      body: JSON.stringify(changes),
    });
  }

  static async removeFromCart(sessionId, itemId) {
    return this.makeRequest(`/cart/${sessionId}/item/${itemId}`, {
      method: "DELETE",
    });
  }

  static async clearCart(sessionId) {
    return this.makeRequest(`/cart/${sessionId}`, {
      method: "DELETE",
    });
  }

  // customerInfo: { name, phone, email, address, orderNotes }
  static async updateCustomerInfo(sessionId, customerInfo) {
    return this.makeRequest(`/cart/${sessionId}/customer`, {
      method: "PUT",
      body: JSON.stringify({
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        customerEmail: customerInfo.email,
        customerAddress: customerInfo.address,
        orderNotes: customerInfo.orderNotes,
      }),
    });
  }

  // Saves the cart as orders, empties it and returns { whatsappUrl, orderSummary }
  static async placeOrder(sessionId) {
    return this.makeRequest(`/cart/${sessionId}/checkout`, {
      method: "POST",
    });
  }

  static async generateCheckoutUrl(sessionId) {
    return this.makeRequest(`/cart/${sessionId}/checkout`, {
      method: "POST",
    });
  }

  // Helper method to generate session ID
  static generateSessionId() {
    return (
      "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
    );
  }

  // Helper method to get or create session ID
  static getSessionId() {
    let sessionId = localStorage.getItem("welcome_craft_session_id");
    if (!sessionId) {
      sessionId = this.generateSessionId();
      localStorage.setItem("welcome_craft_session_id", sessionId);
    }
    return sessionId;
  }

  // Helper method to generate WhatsApp order message
  static generateWhatsAppOrderMessage(product, customerDetails = {}) {
    const message = `Hi! I'd like to order:

📦 Product: ${product.title}
💰 Category: ${product.category?.name || "N/A"}
💵 Price: ${
      product.calculatedPrice
        ? `Rs. ${product.calculatedPrice}`
        : "Please quote"
    }

${customerDetails.name ? `👤 Name: ${customerDetails.name}` : ""}
${customerDetails.phone ? `📱 Phone: ${customerDetails.phone}` : ""}
${customerDetails.address ? `📍 Address: ${customerDetails.address}` : ""}

Please confirm availability and provide more details.

Thank you!`;

    return encodeURIComponent(message);
  }
}

export default ApiService;
