const mongoose = require("mongoose");
require("dotenv").config();

const mongo_uri = process.env.mongo_uri;

const connectDB = async () => {
  if (!mongo_uri) {
    console.error("mongo_uri is not defined in .env");
    process.exit(1);
  }

  try {
    // Attempt to connect with a 5-second timeout for real connection check
    const connection = await mongoose.connect(mongo_uri, {
      serverSelectionTimeoutMS: 5000, // Fail fast if DB is unreachable
    });

    console.log(`MongoDB Connected: ${connection.connection.host}`);
  } catch (error) {
    // Log the actual error and exit if DB connection fails
    console.error("MongoDB connection failed:", error.message);
    console.error(error);
    process.exit(1);
  }
};

module.exports = connectDB;
