const Review = require("../model/reviewModel");
const Product = require("../model/productModel");
const ErrorResponse = require("../utils/errorResponse");

// Yangi review qo‘shish
const createReview = async (req, res, next) => {
  try {
    const { productId, rating, comment } = req.body;
    const userId = req.user._id;

    // Agar avval review yozgan bo‘lsa, yana yozishga ruxsat berilmasin
    const existing = await Review.findOne({ user: userId, product: productId });
    if (existing) {
      return next(new ErrorResponse("Siz allaqachon sharh qoldirgansiz", 400));
    }

    const review = await Review.create({
      user: userId,
      product: productId,
      rating,
      comment,
    });

    res.status(201).json({
      success: true,
      message: "Sharh muvaffaqiyatli qo‘shildi",
      review,
    });
  } catch (error) {
    next(new ErrorResponse(error.message, 500));
  }
};

// Mahsulot uchun barcha reviewlar
const getProductReviews = async (req, res, next) => {
  try {
    const productId = req.params.id;

    const reviews = await Review.find({ product: productId }).populate(
      "user",
      "userName"
    );

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews,
    });
  } catch (error) {
    next(new ErrorResponse(error.message, 500));
  }
};

// Mahsulot uchun o‘rtacha reyting
const getProductRating = async (req, res, next) => {
  try {
    const productId = req.params.id;

    const reviews = await Review.find({ product: productId });
    if (reviews.length === 0) {
      return res.status(200).json({ success: true, averageRating: 0 });
    }

    const average =
      reviews.reduce((acc, item) => acc + item.rating, 0) / reviews.length;

    res.status(200).json({
      success: true,
      averageRating: average.toFixed(1),
    });
  } catch (error) {
    next(new ErrorResponse(error.message, 500));
  }
};

// Reviewni o‘chirish
const deleteReview = async (req, res, next) => {
  try {
    const reviewId = req.params.id;
    const userId = req.user._id;
    const isAdmin = req.user.role === true;

    const review = await Review.findById(reviewId);
    if (!review) return next(new ErrorResponse("Sharh topilmadi", 404));

    if (review.user.toString() !== userId.toString() && !isAdmin) {
      return next(new ErrorResponse("Ruxsatsiz harakat", 403));
    }

    await Review.findByIdAndDelete(reviewId);

    res.status(200).json({
      success: true,
      message: "Sharh o‘chirildi",
    });
  } catch (error) {
    next(new ErrorResponse(error.message, 500));
  }
};

module.exports = {
  createReview,
  getProductReviews,
  getProductRating,
  deleteReview,
};
