const express = require("express");
const {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
} = require("../controllers/orderController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

router.post("/", createOrder);
router.get("/my", getMyOrders);
router.get("/:id", getOrderById);
router.put("/:id/cancel", cancelOrder);

module.exports = router;
