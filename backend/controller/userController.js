const User = require("../model/userModel");
const ErrorResponse = require("../utils/errorResponse");
const jwt = require("jsonwebtoken");

const register = async (req, res, next) => {
  try {
    const { userName, email, phone, password, isAdmin } = req.body;

    // user tzimda bor yo'qligini tekshirish
    const existUser = await User.findOne({ email });
    if (existUser) {
      return next(new ErrorResponse("Bu email ro'yxatdan o'tgan", 400));
    }

    if (!userName || !email || !password || !phone) {
      return next(new ErrorResponse("Maydonni to'liq to'ldiring", 400));
    }
    const image = req.file ? req.file.filename : null; // Faqat fayl nomini saqlaymiz
    const user = await User.create({
      userName,
      email,
      password,
      phone,
      image,
      isAdmin,
    });

    const accessToken = await user.jwtGenerateToken();
    const refreshToken = await user.generateRefreshToken();

    // cookie orqali tokenlarni yuborish
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 60 * 1000,
    });

    // Refresh tokenni cookie'da yuborish
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 1 kun
    });

    res.status(201).json({
      success: true,
      message: "Ro'yxatdan o'tdingiz",
      accessToken,
      user,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const errorMessages = Object.values(error.errors).map(
        (val) => val.message
      );
      next(new ErrorResponse(errorMessages[0], 500));
    } else {
      next(new ErrorResponse(error.message, 500));
    }
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new ErrorResponse("Maydonni to'liq toldiring", 400));
    }

    const user = await User.findOne({ email });
    if (!user) {
      return next(new ErrorResponse("Bu odam tzimda yo'q", 404));
    }

    // kirishdan oldin parolni tekshirish
    // parolni tekshirish
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(new ErrorResponse("paro'l xato"), 401);
    }

    const accessToken = await user.jwtGenerateToken();
    const refreshToken = await user.generateRefreshToken();

    // cookie orqali tokenlarni yuborish
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 60 * 1000,
    });

    // Refresh tokenni cookie'da yuborish
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // 1 kun
    });

    res.status(200).json({
      success: true,
      message: "Tizimga muvaffaqiyatli kirdingiz",
      user,
      accessToken,
    });
  } catch (error) {
    next(new ErrorResponse(error.message, 500));
  }
};

const profile = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user, // req user da bazaga qayta murojat qilish shart emas malumotlar IsAuthenticateddan ceshlanib keladi
    });
  } catch (error) {
    next(new ErrorResponse(error.message, 500));
  }
};

const logOut = async (req, res, next) => {
  try {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // faqat https da
      sameSite: "Strict",
    };

    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);

    res.status(200).json({
      success: true,
      message: "Tizimdan muvaffaqiyatli chiqdingiz",
    });
  } catch (error) {
    next(new ErrorResponse(error.message, 500));
  }
};

module.exports = { register, login, profile, logOut };
