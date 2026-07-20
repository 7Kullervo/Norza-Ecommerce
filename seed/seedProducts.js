require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Product = require("../models/Product");
const User = require("../models/User");

const IMG_BASE = "https://7kullervo.github.io/Norza-Ecommerce/images";

const slugify = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const products = [
  // Featured
  {
    name: "Noir Hat",
    price: 149.0,
    category: "accessories",
    image: `${IMG_BASE}/Featured/Featured_hat.png`,
    isFeatured: true,
    stock: 40,
  },
  {
    name: "RTX 2080",
    price: 279.22,
    category: "electronics",
    image: `${IMG_BASE}/Featured/Featured_GPU.png`,
    isFeatured: true,
    stock: 15,
  },
  {
    name: "Fashionable Cane",
    price: 37.0,
    category: "accessories",
    image: `${IMG_BASE}/Featured/Fashion_Cane.png`,
    isFeatured: true,
    stock: 25,
  },
  {
    name: "All in One Makeup",
    price: 45.0,
    category: "beauty",
    image: `${IMG_BASE}/Featured/Makeup_collection.png`,
    isFeatured: true,
    stock: 60,
  },
  // Trending Fashion / Clothes
  {
    name: "Captain Uniform",
    price: 221.24,
    category: "clothing",
    image: `${IMG_BASE}/Clothes/Captain_uniform.png`,
    stock: 10,
  },
  {
    name: "White Baggy Pants For Women",
    price: 73.03,
    category: "clothing",
    image: `${IMG_BASE}/Clothes/Off_White_Baggy_Pants_for_women.png`,
    stock: 30,
  },
  {
    name: "Women's Red and Off White Shalwar Kameez",
    price: 45.99,
    category: "clothing",
    image: `${IMG_BASE}/Clothes/Red_Off_White_Shalwar_Kameez.png`,
    stock: 30,
  },
  {
    name: "Men's Black Leather Pants",
    price: 120.0,
    category: "clothing",
    image: `${IMG_BASE}/Clothes/Black_leather_Pants_for_men.png`,
    stock: 20,
  },
  // Watch Collection
  {
    name: "Classic Black and Gold Watch",
    price: 15.0,
    category: "watches",
    image: `${IMG_BASE}/Watches/Classic_Black_and_Gold_watch.png`,
    stock: 50,
  },
  {
    name: "Bronze Watch with Small Diamond Piece",
    price: 644.7,
    category: "watches",
    image: `${IMG_BASE}/Watches/Bronze_watch_with_small_diamond.png`,
    stock: 5,
  },
  {
    name: "Snake Watch For Women",
    price: 45.0,
    category: "watches",
    image: `${IMG_BASE}/Watches/Snake_watch_for_women.png`,
    stock: 25,
  },
  {
    name: "Golden Stylish Watch for Women",
    price: 116.0,
    category: "watches",
    image: `${IMG_BASE}/Watches/Gold_stylish_watch_for_women.png`,
    stock: 20,
  },
  // Elite Footwear
  {
    name: "Blue Hightops",
    price: 58.79,
    category: "shoes",
    image: `${IMG_BASE}/Shoes/Blue_hightops.png`,
    stock: 35,
  },
  {
    name: "Yellow High Heels",
    price: 32.24,
    category: "shoes",
    image: `${IMG_BASE}/Shoes/Yellow_high_heels_for_women.png`,
    stock: 30,
  },
  {
    name: "Brown Leather Shoes for Men",
    price: 159.99,
    category: "shoes",
    image: `${IMG_BASE}/Shoes/Brown_leather_shoes_for_men.png`,
    stock: 20,
  },
  {
    name: "Pink Shoes for Girls",
    price: 29.99,
    category: "shoes",
    image: `${IMG_BASE}/Shoes/Pink_shoes_for_girls.png`,
    stock: 40,
  },
  // Snack Picks
  {
    name: "Family Size Chicken Nuggets",
    price: 127.5,
    category: "snacks",
    image: `${IMG_BASE}/Snacks/Family_sizze_Chicken_Nuggets.png`,
    stock: 50,
  },
  {
    name: "Lays Family Size",
    price: 140.0,
    category: "snacks",
    image: `${IMG_BASE}/Snacks/Lays_Family_size.png`,
    stock: 50,
  },
  {
    name: "Mocha and Fudge Icecream",
    price: 58.49,
    category: "snacks",
    image: `${IMG_BASE}/Snacks/Mocha_and_fudge_icecream.png`,
    stock: 40,
  },
  {
    name: "Silk Chocolate",
    price: 6.36,
    category: "snacks",
    image: `${IMG_BASE}/Snacks/Silk_Chocolate.png`,
    stock: 100,
  },
  // Fresh Produce
  {
    name: "Fresh Peaches 1 kg",
    price: 13.2,
    category: "produce",
    image: `${IMG_BASE}/vegetables and fruits/Peaches.png`,
    stock: 80,
  },
  {
    name: "Fresh Cucumbers 1 kg",
    price: 140.0,
    category: "produce",
    image: `${IMG_BASE}/vegetables and fruits/Cucumber.png`,
    stock: 80,
  },
  {
    name: "Watermelon 1 kg",
    price: 1.17,
    category: "produce",
    image: `${IMG_BASE}/vegetables and fruits/Watermelon.png`,
    stock: 100,
  },
  {
    name: "Blueberries 1 kg",
    price: 7.5,
    category: "produce",
    image: `${IMG_BASE}/vegetables and fruits/Blueberries.png`,
    stock: 90,
  },
].map((p) => ({ ...p, slug: slugify(p.name), brand: "Norza" }));

const seed = async () => {
  await connectDB();

  if (process.argv.includes("--destroy")) {
    await Product.deleteMany();
    console.log("Products destroyed.");
    process.exit();
  }

  try {
    await Product.deleteMany();
    await Product.insertMany(products);
    console.log(`Seeded ${products.length} products.`);

    const adminEmail = process.env.ADMIN_EMAIL || "admin@norza.com";
    const adminExists = await User.findOne({ email: adminEmail });
    if (!adminExists) {
      await User.create({
        name: "Norza Admin",
        email: adminEmail,
        password: process.env.ADMIN_PASSWORD || "ChangeMe123!",
        role: "admin",
      });
      console.log(`Admin user created: ${adminEmail}`);
    } else {
      console.log("Admin user already exists, skipping.");
    }

    console.log("Seeding complete.");
    process.exit();
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
};

seed();
