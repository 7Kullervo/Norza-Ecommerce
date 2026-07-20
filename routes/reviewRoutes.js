const express = require("express");
const { deleteReview } = require("../controllers/reviewController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.delete("/:id", protect, deleteReview);

module.exports = router;
