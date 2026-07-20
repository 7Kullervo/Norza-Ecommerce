const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: String,
    image: String,
    price: Number,
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
  },
  { timestamps: true }
);

cartSchema.virtual("subtotal").get(function () {
  return +this.items
    .reduce((sum, item) => sum + item.price * item.quantity, 0)
    .toFixed(2);
});

cartSchema.set("toJSON", { virtuals: true });
cartSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Cart", cartSchema);
