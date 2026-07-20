const express = require("express");
const {
  getCart,
  addItemToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} = require("../controllers/cartController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/", getCart);
router.post("/items", addItemToCart);
router.put("/items/:productId", updateCartItem);
router.delete("/items/:productId", removeCartItem);
router.delete("/", clearCart);

module.exports = router;
