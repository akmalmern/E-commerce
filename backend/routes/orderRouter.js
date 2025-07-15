const express = require("express");
const { isAuthenticated } = require("../middlware/isAuth");
const {
  createOrder,
  getUserOrders,
  getSingleOrder,
  markAsDelivered,
  updatePaymentStatus,
} = require("../controller/orderController");
const router = express.Router();

router.post("/checkout", isAuthenticated, createOrder);
//  Foydalanuvchining barcha buyurtmalari
router.get("/user-orders", isAuthenticated, getUserOrders);
// Bitta buyurtma tafsiloti
router.get("/single-order/:id", isAuthenticated, getSingleOrder);
// Admin: Buyurtmani delivered deb belgilash
router.put("/delivered-order/:id", isAuthenticated, markAsDelivered);
// To‘lov statusini yangilash
router.put("/order-status/:id", isAuthenticated, updatePaymentStatus);

module.exports = router;
