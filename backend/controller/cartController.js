const mongoose = require("mongoose");
const Cart = require("../model/cartModel");
const ErrorResponse = require("../utils/errorResponse");

//  Mahsulotni savatga qo‘shish
const addToCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId, quantity = 1 } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return next(new ErrorResponse("Noto‘g‘ri mahsulot ID", 400));
    }

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = await Cart.create({
        user: userId,
        items: [{ product: productId, quantity }],
      });
    } else {
      const index = cart.items.findIndex(
        (item) => item.product.toString() === productId
      );

      if (index > -1) {
        cart.items[index].quantity += quantity;
      } else {
        cart.items.push({ product: productId, quantity });
      }

      await cart.save(); //  Zamonaviy va xavfsiz usul
    }

    res.status(200).json({
      success: true,
      message: "Mahsulot savatga qo‘shildi",
    });
  } catch (error) {
    next(new ErrorResponse(error.message, 500));
  }
};

// 🗑 Mahsulotni savatdan o‘chirish
const removeFromCart = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { productId } = req.body;

    const cart = await Cart.findOneAndUpdate(
      { user: userId },
      { $pull: { items: { product: productId } } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Mahsulot savatdan o‘chirildi",
      cart,
    });
  } catch (error) {
    next(new ErrorResponse(error.message, 500));
  }
};

// Savatni olish
const getCart = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const cart = await Cart.findOne({ user: userId }).populate("items.product");

    res.status(200).json({
      success: true,
      cart: cart || { items: [] },
    });
  } catch (error) {
    next(new ErrorResponse(error.message, 500));
  }
};

//  Savatni tozalash
const clearCart = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const cart = await Cart.findOneAndUpdate(
      { user: userId },
      { items: [] },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Savat tozalandi",
      cart,
    });
  } catch (error) {
    next(new ErrorResponse(error.message, 500));
  }
};

//  Mahsulot miqdorini yangilash
const updateCartItem = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { productId, quantity } = req.body;

    if (!productId || quantity < 1) {
      return next(
        new ErrorResponse("Mahsulot ID va miqdor to‘g‘ri bo‘lishi kerak", 400)
      );
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) return next(new ErrorResponse("Savat topilmadi", 404));

    const index = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    if (index === -1) {
      return next(new ErrorResponse("Mahsulot savatda topilmadi", 404));
    }

    cart.items[index].quantity = quantity;
    await cart.save();

    res.status(200).json({
      success: true,
      message: "Mahsulot miqdori yangilandi",
    });
  } catch (error) {
    next(new ErrorResponse(error.message, 500));
  }
};

// Umumiy narxni hisoblash
const getCartTotalAmount = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const cart = await Cart.findOne({ user: userId }).populate(
      "items.product",
      "price"
    );

    if (!cart || cart.items.length === 0) {
      return res.status(200).json({ success: true, totalAmount: 0 });
    }

    const totalAmount = cart.items.reduce((acc, item) => {
      const price = item.product?.price || 0;
      return acc + price * item.quantity;
    }, 0);

    res.status(200).json({
      success: true,
      totalAmount,
    });
  } catch (error) {
    next(new ErrorResponse(error.message, 500));
  }
};

module.exports = {
  addToCart,
  removeFromCart,
  getCart,
  clearCart,
  updateCartItem,
  getCartTotalAmount,
};
