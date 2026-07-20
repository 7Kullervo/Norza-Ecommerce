const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");

const SHIPPING_FLAT_RATE = 10;
const TAX_RATE = 0.08; // 8%

const generateOrderNumber = () =>
  "NORZA-" + crypto.randomBytes(4).toString("hex").toUpperCase();

// @desc    Create a new order from the user's current cart
// @route   POST /api/orders
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
  const { shippingAddress, paymentMethod = "stripe" } = req.body;

  if (!shippingAddress) {
    res.status(400);
    throw new Error("Shipping address is required");
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart || cart.items.length === 0) {
    res.status(400);
    throw new Error("Your cart is empty");
  }

  // Re-validate stock and lock in current prices
  for (const item of cart.items) {
    const product = await Product.findById(item.product);
    if (!product || !product.isActive) {
      res.status(400);
      throw new Error(`Product ${item.name} is no longer available`);
    }
    if (product.stock < item.quantity) {
      res.status(400);
      throw new Error(`Not enough stock for ${item.name}`);
    }
  }

  const itemsPrice = +cart.items
    .reduce((sum, i) => sum + i.price * i.quantity, 0)
    .toFixed(2);
  const shippingPrice = itemsPrice > 100 ? 0 : SHIPPING_FLAT_RATE;
  const taxPrice = +(itemsPrice * TAX_RATE).toFixed(2);
  const totalPrice = +(itemsPrice + shippingPrice + taxPrice).toFixed(2);

  const order = await Order.create({
    orderNumber: generateOrderNumber(),
    user: req.user._id,
    items: cart.items.map((i) => ({
      product: i.product,
      name: i.name,
      image: i.image,
      price: i.price,
      quantity: i.quantity,
    })),
    shippingAddress,
    paymentMethod,
    itemsPrice,
    shippingPrice,
    taxPrice,
    totalPrice,
    status: paymentMethod === "cash_on_delivery" ? "processing" : "pending_payment",
    isPaid: paymentMethod === "cash_on_delivery" ? false : false,
  });

  // Decrement stock
  for (const item of cart.items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: -item.quantity },
    });
  }

  // Clear the cart now that the order has been placed
  cart.items = [];
  await cart.save();

  res.status(201).json({ success: true, order });
});

// @desc    Get logged-in user's orders
// @route   GET /api/orders/my
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({
    createdAt: -1,
  });
  res.json({ success: true, count: orders.length, orders });
});

// @desc    Get single order by id (owner or admin only)
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate(
    "user",
    "name email"
  );

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  const isOwner = order.user._id.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized to view this order");
  }

  res.json({ success: true, order });
});

// @desc    Cancel an order (owner only, before it ships)
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to cancel this order");
  }
  if (["shipped", "delivered"].includes(order.status)) {
    res.status(400);
    throw new Error("Order has already shipped and cannot be cancelled");
  }

  order.status = "cancelled";
  await order.save();

  // Restock items
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: item.quantity },
    });
  }

  res.json({ success: true, order });
});

module.exports = { createOrder, getMyOrders, getOrderById, cancelOrder };
