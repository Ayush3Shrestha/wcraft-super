const mongoose = require('mongoose');
require('dotenv').config();

const Category = require('./src/Model/categoryModel');

// materialType decides which product schema a category's products use
const sampleCategories = [
  {
    name: "Silver",
    materialType: "silver",
    description: "Silver statues and ornaments, in stock or custom made, priced on the current silver rate",
    imageUrl: "https://example.com/silver.jpg"
  },
  {
    name: "Gold",
    materialType: "gold",
    description: "Oxidized, color, half gold and full gold (electroplated or fire gold plated) statues",
    imageUrl: "https://example.com/gold.jpg"
  },
  {
    name: "Copper",
    materialType: "copper",
    description: "Traditional copper Buddhist sculptures and statues",
    imageUrl: "https://example.com/copper.jpg"
  },
  {
    name: "Bronze",
    materialType: "bronze",
    description: "Traditional bronze Buddhist sculptures and statues",
    imageUrl: "https://example.com/bronze.jpg"
  }
];

async function initializeCategories() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.mongo_uri);
    console.log('📦 Connected to MongoDB');

    // Check if categories already exist
    const existingCategories = await Category.find();
    if (existingCategories.length > 0) {
      console.log(`📋 Found ${existingCategories.length} existing categories:`);
      existingCategories.forEach(cat => {
        console.log(`   - ${cat.name}`);
      });
      
      const prompt = require('prompt-sync')({ sigint: true });
      const answer = prompt('Do you want to add more categories? (y/N): ');
      
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('👋 Initialization cancelled');
        process.exit(0);
      }
    }

    // Add categories that don't exist
    let added = 0;
    for (const categoryData of sampleCategories) {
      const existing = await Category.findOne({ 
        name: { $regex: `^${categoryData.name}$`, $options: 'i' } 
      });
      
      if (!existing) {
        await Category.create(categoryData);
        console.log(`✅ Created category: ${categoryData.name}`);
        added++;
      } else {
        console.log(`⏭️  Category already exists: ${categoryData.name}`);
      }
    }

    console.log(`\n🎉 Initialization complete! Added ${added} new categories.`);
    
    // Display all categories
    const allCategories = await Category.find().sort({ name: 1 });
    console.log('\n📋 All categories:');
    allCategories.forEach((cat, index) => {
      console.log(`   ${index + 1}. ${cat.name} [${cat.materialType || 'no materialType'}] (ID: ${cat._id})`);
    });

    console.log('\n💡 You can now:');
    console.log('   - Create products using these category IDs');
    console.log('   - GET /api/categories to view all categories');
    console.log('   - GET /api/categories/:id/products to get products by category');

  } catch (error) {
    console.error('❌ Error initializing categories:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  initializeCategories();
}

module.exports = initializeCategories;
