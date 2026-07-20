const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const Order = require("../models/Order");
const Product = require("../models/Product");

// @desc    Get dashboard summary stats
// @route   GET /api/admin/dashboard
// @access  Private/Admin
const getDashboardStats = asyncHandler(async (req, res) => {
  const [userCount, productCount, orderCount, revenueAgg, lowStock] =
    await Promise.all([
      User.countDocuments({ role: "customer" }),
      Product.countDocuments({ isActive: true }),
      Order.countDocuments(),
      Order.aggregate([
        { $match: { isPaid: true } },
        { $group: { _id: null, total: { $sum: "$totalPrice" } } },
      ]),
      Product.find({ isActive: true, stock: { $lte: 5 } }).select(
        "name stock"
      ),
    ]);

  res.json({
    success: true,
    stats: {
      userCount,
      productCount,
      orderCount,
      totalRevenue: revenueAgg.length ? revenueAgg[0].total : 0,
      lowStockProducts: lowStock,
    },
  });
});

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ success: true, count: users.length, users });
});

// @desc    Update a user's role or active status
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (req.body.role) user.role = req.body.role;
  if (typeof req.body.isActive === "boolean") user.isActive = req.body.isActive;

  const updated = await user.save();
  res.json({
    success: true,
    user: {
      _id: updated._id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      isActive: updated.isActive,
    },
  });
});

// @desc    Get all orders
// @route   GET /api/admin/orders
// @access  Private/Admin
const getAllOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const query = {};
  if (status) query.status = status;

  const pageNum = Math.max(Number(page), 1);
  const limitNum = Math.min(Math.max(Number(limit), 1), 100);

  const [orders, total] = await Promise.all([
    Order.find(query)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Order.countDocuments(query),
  ]);

  res.json({
    success: true,
    count: orders.length,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    orders,
  });
});

// @desc    Update order status (processing, shipped, delivered, cancelled)
// @route   PUT /api/admin/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = [
    "pending_payment",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
  ];

  if (!validStatuses.includes(status)) {
    res.status(400);
    throw new Error(`status must be one of: ${validStatuses.join(", ")}`);
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  order.status = status;
  if (status === "delivered") {
    order.isDelivered = true;
    order.deliveredAt = new Date();
  }

  const updated = await order.save();
  res.json({ success: true, order: updated });
});

module.exports = {
  getDashboardStats,
  getUsers,
  updateUser,
  getAllOrders,
  updateOrderStatus,
};
