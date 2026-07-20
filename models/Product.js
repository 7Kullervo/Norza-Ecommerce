const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: 0,
    },
    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "clothing",
        "watches",
        "shoes",
        "snacks",
        "produce",
        "electronics",
        "accessories",
        "beauty",
      ],
      index: true,
    },
    brand: {
      type: String,
      default: "Norza",
    },
    image: {
      type: String,
      required: true,
    },
    images: [String],
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isNewArrival: {
      type: Boolean,
      default: false,
    },
    tags: [String],
    rating: {
      type: Number,
      default: 0,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

productSchema.index({ name: "text", description: "text", tags: "text" });

productSchema.virtual("finalPrice").get(function () {
  if (this.discountPercent > 0) {
    return +(this.price * (1 - this.discountPercent / 100)).toFixed(2);
  }
  return this.price;
});

productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Product", productSchema);
