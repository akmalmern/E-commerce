const mongoose = require("mongoose");

const productSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "maxsulot nomini kiritishingiz majburiy"],
    },
    description: {
      type: String,
      required: [true, "maxsulot tasnifini kiritishingiz majburiy"],
    },
    price: {
      type: Number,
      required: [true, "maxsulot narxini kiritishingiz majburiy"],
    },
    //   countInStock omborda maxsulotdan nechta borligi
    countInStock: {
      type: Number,
      required: [true, "maxsulotlar sonini kiritishingiz majburiy"],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    images: {
      type: [String],
      required: [true, "Kamida 1 ta rasm yuklang!"],
    },
    brand: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
