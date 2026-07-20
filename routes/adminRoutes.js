const express = require("express");
const {
  getDashboardStats,
  getUsers,
  updateUser,
  getAllOrders,
  updateOrderStatus,
} = require("../controllers/adminController");
const { protect, admin } = require("../middleware/auth");

const router = express.Router();

router.use(protect, admin);

router.get("/dashboard", getDashboardStats);
router.get("/users", getUsers);
router.put("/users/:id", updateUser);
router.get("/orders", getAllOrders);
router.put("/orders/:id/status", updateOrderStatus);

module.exports = router;
