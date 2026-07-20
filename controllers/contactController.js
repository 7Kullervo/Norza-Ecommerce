const asyncHandler = require("express-async-handler");
const ContactMessage = require("../models/ContactMessage");

// @desc    Submit a contact form message (from Contact Us page)
// @route   POST /api/contact
// @access  Public
const submitContactMessage = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !message) {
    res.status(400);
    throw new Error("name, email, and message are required");
  }

  const contactMessage = await ContactMessage.create({
    name,
    email,
    subject,
    message,
  });

  res.status(201).json({
    success: true,
    message: "Thanks for reaching out! We'll get back to you soon.",
    contactMessage,
  });
});

// @desc    Get all contact messages
// @route   GET /api/contact
// @access  Private/Admin
const getContactMessages = asyncHandler(async (req, res) => {
  const messages = await ContactMessage.find().sort({ createdAt: -1 });
  res.json({ success: true, count: messages.length, messages });
});

// @desc    Mark a contact message as read
// @route   PUT /api/contact/:id/read
// @access  Private/Admin
const markMessageRead = asyncHandler(async (req, res) => {
  const contactMessage = await ContactMessage.findById(req.params.id);
  if (!contactMessage) {
    res.status(404);
    throw new Error("Message not found");
  }
  contactMessage.isRead = true;
  await contactMessage.save();
  res.json({ success: true, contactMessage });
});

module.exports = {
  submitContactMessage,
  getContactMessages,
  markMessageRead,
};
