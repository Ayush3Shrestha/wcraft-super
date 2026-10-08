# Welcome-Craft 🏺

A Buddhist handicraft e-commerce website built with the **MERN stack**, featuring real-time silver pricing, custom product options, and WhatsApp-based ordering system.

## 🚀 Project Overview

### Tech Stack
- **Frontend**: React.js with TailwindCSS
- **Backend**: Node.js with Express
- **Database**: MongoDB
- **Authentication**: JWT for admin access
- **Scheduling**: Node-cron for automated silver price updates
- **Web Scraping**: Cheerio + Axios (Hamro Patro)

### Key Features
- ✨ Real-time silver price updates (scraped every 30 minutes, 6 AM - 2 PM)
- 🛒 WhatsApp-based ordering system (no payment gateway)
- 👑 Admin dashboard with JWT authentication
- 📦 Product management with category-based pricing
- 📊 Silver price history tracking
- 🔄 Automated price calculations for silver products

## 📁 Project Structure

```
Welcome-Craft/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── Config/         # Database configuration
│   │   ├── Controller/     # Route controllers
│   │   ├── Middleware/     # Auth, upload, etc.
│   │   ├── Model/          # MongoDB schemas
│   │   ├── Routes/         # API endpoints
│   │   └── Services/       # Business logic (cron, scraping)
│   ├── uploads/            # Static file storage
│   ├── app.js              # Main server file
│   ├── package.json
│   └── .env.example        # Environment template
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API integration
│   │   └── ...
│   ├── package.json
│   └── .env.example        # Frontend environment template
└── start-dev.ps1           # Development startup script
```

## 🛠️ Quick Start

### 1. Environment Setup
```bash
# Backend environment
cp backend/.env.example backend/.env
# Edit backend/.env with your MongoDB URI and other configs

# Frontend environment  
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your WhatsApp number
```

### 2. Install Dependencies & Start
```powershell
# Run the automated startup script (Windows)
.\start-dev.ps1

# OR manually:
cd backend && npm install && npm start
cd ../frontend && npm install && npm start
```

### 3. Initialize Admin
```bash
# Create default admin account
POST http://localhost:8081/api/admin/init
```

## 🔄 Workflow Overview

### Silver Price Management
1. **Automated Scraping**: Cron job runs every 30 minutes (6 AM - 2 PM) to fetch silver prices from Hamro Patro
2. **Intelligent Time Logic**: 
   - Before 11 AM: Uses previous day's price (as new prices not yet updated)
   - After 11 AM: Uses current day's price (likely updated)
   - Handles uncertain update times gracefully
3. **Database Storage**: Daily prices stored with effective dates and scrape timestamps
4. **API Access**: Public endpoints for current prices and manual scraping (no auth required)
5. **Dynamic Pricing**: Silver products calculate prices in real-time based on intelligent date logic

### Product Management
- **Categories**: Gold Statue, Silver Crafts, Custom Silver
- **Gold Products**: Fixed pricing with height specifications
- **Silver Products**: Dynamic pricing based on weight × current silver price + making cost
- **Custom Silver**: Weight ranges for customer customization

### Order Workflow
1. **Customer**: Browses products → clicks "Order via WhatsApp" → sends message
2. **System**: Optionally creates order record in database
3. **Admin**: Receives WhatsApp notification → confirms with customer
4. **Processing**: Admin updates order status through dashboard

## 📡 API Endpoints

### Public Endpoints
```
GET  /health                         # Health check
GET  /api/products                   # Get all products (supports filtering)
GET  /api/products?category=ID       # Filter products by category ID
GET  /api/products?categoryName=NAME # Filter products by category name
GET  /api/products/:id               # Get single product
GET  /api/categories                 # Get all categories
GET  /api/categories?includeProductCount=true # Categories with product counts
GET  /api/categories/:id             # Get single category
GET  /api/categories/:id/products    # Get products in specific category
GET  /api/silver/today               # Get current silver price (intelligent time logic)
GET  /api/silver/history             # Get price history
GET  /api/silver/test-scrape         # Test scraping without saving (debugging)
POST /api/silver/scrape              # Manual price scrape (PUBLIC - no auth)
POST /api/orders                     # Create order (customer)
POST /api/admin/init                 # Initialize admin (first-time only)
POST /api/admin/login                # Admin login
```

### Admin Protected Endpoints (Require JWT)
```
POST /api/products              # Create product
PUT  /api/products/:id          # Update product
DEL  /api/products/:id          # Delete product
POST /api/categories            # Create category
PUT  /api/categories/:id        # Update category
DEL  /api/categories/:id        # Delete category (if no products)
GET  /api/orders                # Get all orders (supports filtering)
GET  /api/orders?status=pending # Filter orders by status
PUT  /api/orders/:id            # Update order
DEL  /api/orders/:id            # Delete order
GET  /api/admin/profile         # Get admin profile
```

## 🏗️ Development Guide

### Adding New Products
```javascript
// Example silver product
{
  "title": "Silver Buddha Statue",
  "description": "Handcrafted silver Buddha statue",
  "imageUrl": "https://example.com/image.jpg",
  "category": "category_id_here",
  "weightInTola": 5.5,
  "makingCost": 2000,
  "isCustomizable": false
}

// Example gold product
{
  "title": "Gold Manjushree Statue",
  "description": "24k gold plated Manjushree statue",
  "imageUrl": "https://example.com/image.jpg",
  "category": "category_id_here",
  "constantPrice": 150000,
  "height": "12 inches"
}
```

### Silver Price Integration
```javascript
// Frontend: Calculate silver product price
import ApiService from './services/apiService';

const silverPrice = await ApiService.getTodaysSilverPrice();
const productPrice = ApiService.calculateSilverProductPrice(product, silverPrice.pricePerTola);
```

## 🔧 Optimizations Implemented

✅ **Backend Optimizations**
- Cleaned up commented code and unused imports
- Enabled CORS for frontend communication
- Added proper error handling and logging
- Separated service concerns (scraping vs storage)
- Implemented JWT authentication
- Added health check and API documentation endpoints
- Fixed cron schedule to business hours only

✅ **Frontend Optimizations**  
- Created centralized API service
- Added WhatsApp integration for ordering
- Environment configuration setup
- Responsive error handling

✅ **Development Workflow**
- Automated development startup script
- Environment templates for easy setup
- Clear documentation and API structure
- Proper REST API conventions

## 🚦 Production Deployment Notes

- Set `NODE_ENV=production` in backend .env
- Configure production MongoDB URI
- Set strong JWT_SECRET
- Configure actual WhatsApp phone number
- Enable HTTPS for production
- Set up process manager (PM2) for backend
- Build and serve frontend as static files

## 📞 Support

For issues or feature requests, check the console logs and API responses for detailed error messages.
