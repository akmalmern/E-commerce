const mongoose = require("mongoose");

const categorySchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "categoriya nomini kiritishingiz majburiy"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);
