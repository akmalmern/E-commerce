const express = require("express");
const {
  addToCart,
  removeFromCart,
  getCart,
  clearCart,
  updateCartItem,
  getCartTotalAmount,
} = require("../controller/cartController");
const { isAuthenticated } = require("../middlware/isAuth");
const router = express.Router();

router.post("/add-cart", isAuthenticated, addToCart);
// maxsulotni savatdan o'chirish
router.put("/remove-cart", isAuthenticated, removeFromCart);
router.get("/get-cart", isAuthenticated, getCart);
router.put("/clear-cart", isAuthenticated, clearCart);
// maxsulot miqdorini o'zgartirish
router.put("/update-cart", isAuthenticated, updateCartItem);
router.get("/all-price", isAuthenticated, getCartTotalAmount);

module.exports = router;
