const asyncHandler = require("express-async-handler");
const Cart = require("../models/Cart");
const Product = require("../models/Product");

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
};

// @desc    Get the logged-in user's cart
// @route   GET /api/cart
// @access  Private
const getCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  res.json({ success: true, cart });
});

// @desc    Add an item to the cart (or increase quantity if it already exists)
// @route   POST /api/cart/items
// @access  Private
const addItemToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  if (!productId) {
    res.status(400);
    throw new Error("productId is required");
  }

  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    res.status(404);
    throw new Error("Product not found");
  }

  if (product.stock < quantity) {
    res.status(400);
    throw new Error("Not enough stock available");
  }

  const cart = await getOrCreateCart(req.user._id);
  const existingItem = cart.items.find(
    (item) => item.product.toString() === productId
  );

  if (existingItem) {
    existingItem.quantity += Number(quantity);
  } else {
    cart.items.push({
      product: product._id,
      name: product.name,
      image: product.image,
      price: product.finalPrice,
      quantity,
    });
  }

  await cart.save();
  res.status(201).json({ success: true, cart });
});

// @desc    Update quantity of a cart item
// @route   PUT /api/cart/items/:productId
// @access  Private
const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const { productId } = req.params;

  if (!quantity || quantity < 1) {
    res.status(400);
    throw new Error("quantity must be at least 1");
  }

  const cart = await getOrCreateCart(req.user._id);
  const item = cart.items.find((i) => i.product.toString() === productId);

  if (!item) {
    res.status(404);
    throw new Error("Item not found in cart");
  }

  item.quantity = quantity;
  await cart.save();

  res.json({ success: true, cart });
});

// @desc    Remove an item from the cart
// @route   DELETE /api/cart/items/:productId
// @access  Private
const removeCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const cart = await getOrCreateCart(req.user._id);

  cart.items = cart.items.filter(
    (item) => item.product.toString() !== productId
  );

  await cart.save();
  res.json({ success: true, cart });
});

// @desc    Clear the entire cart
// @route   DELETE /api/cart
// @access  Private
const clearCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  cart.items = [];
  await cart.save();
  res.json({ success: true, cart });
});

module.exports = {
  getCart,
  addItemToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
};
