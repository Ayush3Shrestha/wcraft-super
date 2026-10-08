require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./src/Model/categoryModel');

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected for migration');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const migrateCategories = async () => {
  try {
    // Get all categories without categoryId
    const categories = await Category.find({ categoryId: { $exists: false } });
    console.log(`Found ${categories.length} categories to migrate`);

    if (categories.length === 0) {
      console.log('All categories already have custom IDs');
      return;
    }

    // Initialize counter starting from 100
    let counter = 100;

    for (const category of categories) {
      category.categoryId = counter;
      await category.save();
      console.log(`Updated category "${category.name}" with ID: ${counter}`);
      counter++;
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
};

const runMigration = async () => {
  await connectDB();
  await migrateCategories();
  await mongoose.connection.close();
  console.log('Database connection closed');
};

runMigration().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
