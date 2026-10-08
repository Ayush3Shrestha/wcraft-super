require('dns').setServers(['8.8.8.8', '1.1.1.1']);
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const connectDB = require("./src/Config/db");
require("./src/Services/cron");

// Import routes
const silverPrice = require("./src/Routes/silverPriceRoute");
const goldPrice = require("./src/Routes/goldPriceRoute");
const product = require("./src/Routes/productRoute");
const category = require("./src/Routes/categoryRoute");
const order = require("./src/Routes/orderRoute");
const admin = require("./src/Routes/adminRoute");
const cart = require("./src/Routes/cartRoute");
const currency = require("./src/Routes/currencyRoute");

// Connect to database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use("/uploads", express.static(require("./src/Middleware/uploadMiddleware").UPLOAD_DIR));

// API Routes
app.use("/api", product);
app.use("/api", category);
app.use("/api", goldPrice);
app.use("/api", silverPrice);
app.use("/api", order);
app.use("/api", admin);
app.use("/api", cart);
app.use("/api", currency);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    message: "Welcome-Craft API is running",
    timestamp: new Date().toISOString() 
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Welcome-Craft API" });
});

const port = process.env.PORT || process.env.port || 8081;

const server = app.listen(port, () => {
  console.log(`Server started on port ${port}`);
  // Log whether order emails are set up correctly
  require("./src/Services/emailService").verifyEmailSetup();
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use.`);
    process.exit(1);
  } else {
    throw err;
  }
});
