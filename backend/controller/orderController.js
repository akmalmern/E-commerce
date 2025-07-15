const Order = require("../model/orderModel");
const Cart = require("../model/cartModel");
const ErrorResponse = require("../utils/errorResponse");

const createOrder = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const cart = await Cart.findOne({ user: userId }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      return next(
        new ErrorResponse("Savat bo‘sh. Buyurtma berib bo‘lmaydi", 400)
      );
    }

    const { fullName, address, city, postalCode, country, paymentMethod } =
      req.body;

    if (
      !fullName ||
      !address ||
      !city ||
      !postalCode ||
      !country ||
      !paymentMethod
    ) {
      return next(
        new ErrorResponse(
          "To‘liq yetkazish manzili va to‘lov usuli talab qilinadi",
          400
        )
      );
    }

    // orderItems tayyorlash
    const orderItems = cart.items.map((item) => ({
      product: item.product._id,
      qty: item.quantity,
      price: item.product.price,
    }));

    const totalPrice = orderItems.reduce(
      (acc, item) => acc + item.qty * item.price,
      0
    );

    // Order yaratish
    const order = await Order.create({
      user: userId,
      orderItems,
      shippingAddress: { fullName, address, city, postalCode, country },
      paymentMethod,
      totalPrice,
    });
    // Orderni product ma'lumotlari bilan qaytarish
    const populatedOrder = await Order.findById(order._id).populate(
      "orderItems.product",
      "name price images category"
    );

    // Savatni tozalash
    await Cart.findOneAndUpdate({ user: userId }, { items: [] });

    res.status(201).json({
      success: true,
      message: "Buyurtma muvaffaqiyatli yaratildi",
      order: populatedOrder,
    });
  } catch (error) {
    next(new ErrorResponse(error.message, 500));
  }
};

//  Foydalanuvchining barcha buyurtmalari
const getUserOrders = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const orders = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate("orderItems.product", "name price images");

    res.status(200).json({ success: true, total: orders.length, orders });
  } catch (error) {
    next(new ErrorResponse(error.message, 500));
  }
};

//  Bitta buyurtma tafsiloti (admin yoki foydalanuvchi ko‘rishi mumkin)
const getSingleOrder = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId)
      .populate("user", "userName email")
      .populate("orderItems.product", "name price images");

    if (!order) return next(new ErrorResponse("Buyurtma topilmadi", 404));

    res.status(200).json({ success: true, order });
  } catch (error) {
    next(new ErrorResponse(error.message, 500));
  }
};

// Admin: Buyurtmani delivered deb belgilash
const markAsDelivered = async (req, res, next) => {
  try {
    const orderId = req.params.id;

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      {
        isDelivered: true,
        deliveredAt: new Date(),
      },
      { new: true }
    ).populate("user", "userName email");

    if (!updatedOrder) {
      return next(new ErrorResponse("Buyurtma topilmadi", 404));
    }

    res.status(200).json({
      success: true,
      message: "Yetkazilgan deb belgilandi",
      order: updatedOrder,
    });
  } catch (error) {
    next(new ErrorResponse(error.message, 500));
  }
};

// To‘lov statusini yangilash (masalan: Payme notification kelganda)
const updatePaymentStatus = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const { status } = req.body; // 'paid' yoki 'failed'

    if (!["paid", "failed"].includes(status)) {
      return next(new ErrorResponse("To‘lov statusi noto‘g‘ri", 400));
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { paymentStatus: status },
      { new: true }
    );

    if (!updatedOrder) {
      return next(new ErrorResponse("Buyurtma topilmadi", 404));
    }

    res.status(200).json({
      success: true,
      message: "To‘lov holati yangilandi",
      order: updatedOrder,
    });
  } catch (error) {
    next(new ErrorResponse(error.message, 500));
  }
};

module.exports = {
  createOrder,
  getUserOrders,
  getSingleOrder,
  markAsDelivered,
  updatePaymentStatus,
};
