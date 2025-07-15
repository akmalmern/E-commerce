const express = require("express");
const { isAuthenticated, isAdmin } = require("../middlware/isAuth");
const {
  createReview,
  getProductReviews,
  getProductRating,
  deleteReview,
} = require("../controller/reivew.controller");
const router = express.Router();

router.post("/create-reivew", isAuthenticated, createReview);
// Mahsulot uchun barcha reviewlar productId
router.get("/product-all-reviews/:id", getProductReviews);
// Mahsulot uchun o‘rtacha reyting productId
router.get("/rating/:id", getProductRating);
// Reviewni o‘chirish/reivewId
router.delete("/delete-review/:id", isAuthenticated, isAdmin, deleteReview);

module.exports = router;
