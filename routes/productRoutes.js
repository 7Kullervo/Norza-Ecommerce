const express = require("express");
const {
  getProducts,
  getProductByIdOrSlug,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");
const {
  getProductReviews,
  addProductReview,
} = require("../controllers/reviewController");
const { protect, admin } = require("../middleware/auth");

const router = express.Router();

router.get("/", getProducts);
router.get("/meta/categories", getCategories);
router.get("/:idOrSlug", getProductByIdOrSlug);

router.post("/", protect, admin, createProduct);
router.put("/:id", protect, admin, updateProduct);
router.delete("/:id", protect, admin, deleteProduct);

// Nested review routes: /api/products/:productId/reviews
router.get("/:productId/reviews", getProductReviews);
router.post("/:productId/reviews", protect, addProductReview);

module.exports = router;
