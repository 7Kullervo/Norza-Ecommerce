const express = require("express");
const {
  createCheckoutSession,
} = require("../controllers/paymentController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// NOTE: the webhook route is mounted separately in server.js because it
// needs the raw request body instead of the JSON-parsed body.
router.post("/create-checkout-session", protect, createCheckoutSession);

module.exports = router;
