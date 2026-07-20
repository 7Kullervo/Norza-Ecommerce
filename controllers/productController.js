const asyncHandler = require("express-async-handler");
const Product = require("../models/Product");

// @desc    Get all products (search, filter, sort, paginate)
// @route   GET /api/products
// @access  Public
// Query params: keyword, category, brand, minPrice, maxPrice, featured,
//                newArrival, sort (price_asc|price_desc|newest|rating), page, limit
const getProducts = asyncHandler(async (req, res) => {
  const {
    keyword,
    category,
    brand,
    minPrice,
    maxPrice,
    featured,
    newArrival,
    sort,
    page = 1,
    limit = 12,
  } = req.query;

  const query = { isActive: true };

  if (keyword) {
    query.$text = { $search: keyword };
  }
  if (category) query.category = category;
  if (brand) query.brand = brand;
  if (featured === "true") query.isFeatured = true;
  if (newArrival === "true") query.isNewArrival = true;
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  let sortOption = { createdAt: -1 };
  if (sort === "price_asc") sortOption = { price: 1 };
  if (sort === "price_desc") sortOption = { price: -1 };
  if (sort === "rating") sortOption = { rating: -1 };
  if (sort === "newest") sortOption = { createdAt: -1 };

  const pageNum = Math.max(Number(page), 1);
  const limitNum = Math.min(Math.max(Number(limit), 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const [products, total] = await Promise.all([
    Product.find(query).sort(sortOption).skip(skip).limit(limitNum),
    Product.countDocuments(query),
  ]);

  res.json({
    success: true,
    count: products.length,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    products,
  });
});

// @desc    Get single product by id or slug
// @route   GET /api/products/:idOrSlug
// @access  Public
const getProductByIdOrSlug = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const isObjectId = idOrSlug.match(/^[0-9a-fA-F]{24}$/);

  const product = await Product.findOne(
    isObjectId ? { _id: idOrSlug } : { slug: idOrSlug }
  );

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  res.json({ success: true, product });
});

// @desc    Get distinct categories with counts
// @route   GET /api/products/meta/categories
// @access  Public
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Product.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  res.json({ success: true, categories });
});

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    slug,
    description,
    price,
    discountPercent,
    category,
    brand,
    image,
    images,
    stock,
    isFeatured,
    isNewArrival,
    tags,
  } = req.body;

  if (!name || !price || !category || !image) {
    res.status(400);
    throw new Error("name, price, category, and image are required");
  }

  const finalSlug =
    slug ||
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const product = await Product.create({
    name,
    slug: finalSlug,
    description,
    price,
    discountPercent,
    category,
    brand,
    image,
    images,
    stock,
    isFeatured,
    isNewArrival,
    tags,
  });

  res.status(201).json({ success: true, product });
});

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  Object.assign(product, req.body);
  const updated = await product.save();

  res.json({ success: true, product: updated });
});

// @desc    Delete a product (soft delete)
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  product.isActive = false;
  await product.save();

  res.json({ success: true, message: "Product deleted" });
});

module.exports = {
  getProducts,
  getProductByIdOrSlug,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
};
