require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const { stripeWebhook } = require("./controllers/paymentController");

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const adminRoutes = require("./routes/adminRoutes");
const contactRoutes = require("./routes/contactRoutes");

// Kick off the connection immediately, but never let a failure crash the
// whole process — just log it. Individual requests are protected below.
connectDB().catch((err) => {
  console.error("Initial MongoDB connection attempt failed:", err.message);
});

const app = express();

// Ensures every request waits for a ready DB connection before continuing.
// Critical for serverless: a "cold start" request could otherwise reach a
// route handler before Mongoose has finished connecting.
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(503).json({
      success: false,
      message: "Database temporarily unavailable, please try again.",
    });
  }
});

app.use(helmet());
const cors = require("cors");

app.use(
    cors({
        origin: [
            "http://localhost:3000",
            "https://norza-ecommerce-se838l2o8-7kullervo1.vercel.app",
            "https://norza-ecommerce.vercel.app"
        ],
        credentials: true,
    })
);
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Stripe webhook needs the RAW body — must be registered BEFORE express.json()
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

app.use(express.json());
app.use(cookieParser());

// Basic rate limiting to protect auth endpoints from brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { success: false, message: "Too many requests, try again later." },
});
app.use("/api/auth", authLimiter);

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Norza API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/contact", contactRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Vercel imports this file as a serverless function and calls the exported
// app directly — it never runs this file with `node server.js`. Only start
// a normal listening server when this file IS run directly (local dev, or
// a traditional host like Render/Railway that runs `npm start`).
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Norza backend running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
  });
}

module.exports = app;
