const express = require("express");
const {
  submitContactMessage,
  getContactMessages,
  markMessageRead,
} = require("../controllers/contactController");
const { protect, admin } = require("../middleware/auth");

const router = express.Router();

router.post("/", submitContactMessage);
router.get("/", protect, admin, getContactMessages);
router.put("/:id/read", protect, admin, markMessageRead);

module.exports = router;
