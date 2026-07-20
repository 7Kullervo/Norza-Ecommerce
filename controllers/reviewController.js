const asyncHandler = require("express-async-handler");
const Review = require("../models/Review");
const Product = require("../models/Product");

const recalculateProductRating = async (productId) => {
  const stats = await Review.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: "$product",
        avgRating: { $avg: "$rating" },
        numReviews: { $sum: 1 },
      },
    },
  ]);

  await Product.findByIdAndUpdate(productId, {
    rating: stats.length ? +stats[0].avgRating.toFixed(1) : 0,
    numReviews: stats.length ? stats[0].numReviews : 0,
  });
};

// @desc    Get all reviews for a product
// @route   GET /api/products/:productId/reviews
// @access  Public
const getProductReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ product: req.params.productId }).sort({
    createdAt: -1,
  });
  res.json({ success: true, count: reviews.length, reviews });
});

// @desc    Add a review to a product
// @route   POST /api/products/:productId/reviews
// @access  Private
const addProductReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const { productId } = req.params;

  if (!rating || !comment) {
    res.status(400);
    throw new Error("rating and comment are required");
  }

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const alreadyReviewed = await Review.findOne({
    product: productId,
    user: req.user._id,
  });
  if (alreadyReviewed) {
    res.status(400);
    throw new Error("You have already reviewed this product");
  }

  const review = await Review.create({
    product: productId,
    user: req.user._id,
    name: req.user.name,
    rating,
    comment,
  });

  await recalculateProductRating(product._id);

  res.status(201).json({ success: true, review });
});

// @desc    Delete a review (owner or admin)
// @route   DELETE /api/reviews/:id
// @access  Private
const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    res.status(404);
    throw new Error("Review not found");
  }

  const isOwner = review.user.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized to delete this review");
  }

  const productId = review.product;
  await review.deleteOne();
  await recalculateProductRating(productId);

  res.json({ success: true, message: "Review deleted" });
});

module.exports = { getProductReviews, addProductReview, deleteReview };
