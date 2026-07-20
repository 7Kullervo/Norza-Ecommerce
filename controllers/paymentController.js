const asyncHandler = require("express-async-handler");
const Stripe = require("stripe");
const Order = require("../models/Order");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// @desc    Create a Stripe Checkout session for an existing order
// @route   POST /api/payments/create-checkout-session
// @access  Private
const createCheckoutSession = asyncHandler(async (req, res) => {
  const { orderId } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized for this order");
  }
  if (order.isPaid) {
    res.status(400);
    throw new Error("Order has already been paid");
  }

  const lineItems = order.items.map((item) => ({
    price_data: {
      currency: "usd",
      product_data: {
        name: item.name,
        images: item.image ? [encodeURI(item.image)] : [],
      },
      unit_amount: Math.round(item.price * 100),
    },
    quantity: item.quantity,
  }));

  // Shipping + tax as a single combined line item so Stripe total matches order total
  const extras = +(order.shippingPrice + order.taxPrice).toFixed(2);
  if (extras > 0) {
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: { name: "Shipping & Tax" },
        unit_amount: Math.round(extras * 100),
      },
      quantity: 1,
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: lineItems,
    success_url: `${process.env.CLIENT_URL}/order-success.html?orderId=${order._id}`,
    cancel_url: `${process.env.CLIENT_URL}/cart.html`,
    customer_email: req.user.email,
    metadata: {
      orderId: order._id.toString(),
    },
  });

  res.json({ success: true, url: session.url, sessionId: session.id });
});

// @desc    Stripe webhook — marks orders as paid on successful payment
// @route   POST /api/payments/webhook
// @access  Public (verified via Stripe signature)
// NOTE: this route must receive the RAW request body, not JSON-parsed.
const stripeWebhook = asyncHandler(async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const orderId = session.metadata?.orderId;

    if (orderId) {
      const order = await Order.findById(orderId);
      if (order && !order.isPaid) {
        order.isPaid = true;
        order.paidAt = new Date();
        order.status = "processing";
        order.paymentResult = {
          id: session.id,
          status: session.payment_status,
          update_time: new Date().toISOString(),
          email_address: session.customer_email,
        };
        await order.save();
      }
    }
  }

  res.json({ received: true });
});

module.exports = { createCheckoutSession, stripeWebhook };
