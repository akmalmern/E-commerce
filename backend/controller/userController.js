const User = require("../model/userModel");
const ErrorResponse = require("../utils/errorResponse");
const jwt = require("jsonwebtoken");
// const fs = require("fs").promises; // Fayl tizimi bilan ishlash uchun
const fs = require("fs/promises");

const path = require("path"); // Fayl yo‘llarini boshqarish uchun
const bcrypt = require("bcryptjs"); // Parolni hash qilish uchun
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const transporter = require("../utils/email");

const register = async (req, res, next) => {
  try {
    const { userName, email, phone, password, isAdmin } = req.body;

    // user tzimda bor yo'qligini tekshirish

    const emailToCheck = email.trim();
    const existingUser = await User.exists({
      email: { $regex: `^${emailToCheck}$`, $options: "i" },
    });
    if (existingUser) {
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

// refresh token orqali yangi access token yaratish
const refreshAccessToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return next(new ErrorResponse("Refresh token topilmadi", 401));
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_TOKEN);
    } catch (error) {
      return next(
        new ErrorResponse("Refresh token yaroqsiz yoki muddati tugagan", 401)
      );
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new ErrorResponse("Foydalanuvchi topilmadi", 404));
    }

    const newAccessToken = user.jwtGenerateToken();

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 1000, // 1 soat
    });

    res.status(200).json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (error) {
    next(new ErrorResponse(error.message, 500));
  }
};

// parolni tiklash uchun emailga kod yuborish
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return next(new ErrorResponse("Emailni kiritish majburiy", 400));
    }

    const user = await User.findOne({ email });
    if (!user) {
      return next(
        new ErrorResponse("Bu email bilan foydalanuvchi topilmadi", 404)
      );
    }

    // 6 raqamli tasodifiy kod generatsiyasi;
    const resetToken = crypto.randomInt(100000, 1000000).toString();
    // kelgan kodni amal qilish vaqti
    const resetTokenExpire = Date.now() + 3 * 60 * 1000;

    await User.updateOne(
      { _id: user._id },
      {
        resetPasswordToken: resetToken,
        resetPasswordExpire: resetTokenExpire,
      }
    );

    const message = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Parolni tiklash kodi",
      html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h4>Parolni tiklash</h4>
        <p>Sizning parolni tiklash kodingiz: <strong>${resetToken}</strong></p>
        <p>Kod 3 daqiqa amal qiladi.</p>
       
      </div>
    `,
    };
    await transporter.sendMail(message);

    res.status(200).json({
      success: true,
      message: "Tasdiqlash kodi emailingizga yuborildi",
    });
  } catch (error) {
    console.log(error.message);
    return next(new ErrorResponse("Parolni tiklashda xatolik yuz berdi", 500));
  }
};

// yangi parol yaratish
const resetPassword = async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return next(new ErrorResponse("maydonlarni to'liq to'ldiring", 400));
    }

    // Foydalanuvchini topish va tokenni tekshirish

    const user = await User.findOne({
      resetPasswordToken: resetToken,
      resetPasswordExpire: { $gt: Date.now() }, //kodni emal qilish vaqtini tekshirish
    });

    if (!user) {
      return next(
        new ErrorResponse(
          "Noto'g'ri kod yoki Ko'dni amal qilish muddati tugagan",
          400
        )
      );
    }

    user.password = newPassword;
    user.resetPasswordToken = null; // Kodni o‘chirish
    user.resetPasswordExpire = null; // Muddatni o‘chirish
    await user.save(); // bu yerda userModeldagi .pre("save") ishlaydi va parol hashlanadi

    res.status(200).json({
      success: true,
      message: "Parol muvaffaqiyatli yangilandi",
    });
  } catch (error) {
    return next(new ErrorResponse("Parolni tiklashda xatolik yuz berdi", 500));
  }
};

// updateUser funksiyasi
const updateUser = async (req, res, next) => {
  try {
    const { userName, phone, password, newPassword } = req.body;
    const userId = req.user._id;

    // Foydalanuvchini topish
    const user = await User.findById(userId).select("+password");
    if (!user) {
      return next(new ErrorResponse("Foydalanuvchi tizimga kirmagan", 401));
    }

    // Yangilanish uchun maydonlarni tayyorlash
    const updateData = {};
    if (userName) updateData.userName = userName;
    if (phone) updateData.phone = phone;

    // Agar yangi parol kiritilgan bo'lsa
    if (newPassword) {
      if (!password) {
        return next(new ErrorResponse("Eski parolni kiritish majburiy", 400));
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return next(new ErrorResponse("Eski parol noto‘g‘ri", 401));
      }

      // Yangi parolni shifrlash
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(newPassword, salt);
    }

    // Faqat o'zgartirilgan maydonlarni yangilash
    await User.findByIdAndUpdate(userId, updateData, {
      new: true, // Yangilangan hujjatni qaytarish
      runValidators: true, // Validatsiyani faqat yangilanayotgan maydonlar uchun ishga tushirish
    });

    // Yangilangan foydalanuvchi ma'lumotlarini olish (parolsiz)
    const updatedUser = await User.findById(userId);
    const userObj = updatedUser.toObject();
    delete userObj.password;

    res.status(200).json({
      success: true,
      message: "Foydalanuvchi ma'lumotlari muvaffaqiyatli yangilandi",
      user: userObj,
    });
  } catch (error) {
    next(new ErrorResponse(error.message, 500));
  }
};

const updateUserImage = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Foydalanuvchini topish
    const user = await User.findById(userId);
    if (!user) {
      return next(new ErrorResponse("Foydalanuvchi topilmadi", 404));
    }

    // Fayl yuklanganligini tekshirish
    if (!req.file) {
      return next(new ErrorResponse("Rasm yuborilmadi", 400));
    }

    // Eski rasmni o‘chirish
    if (user.image) {
      const oldPath = path.join(__dirname, "../uploads", user.image);
      try {
        await fs.unlink(oldPath);
      } catch (err) {
        if (err.code !== "ENOENT") {
          console.error("Eski rasmni o‘chirishda xato:", err.message);
        }
      }
    }

    // Yangi rasmni yangilash
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { image: req.file.filename },
      {
        new: true, // Yangilangan hujjatni qaytarish
        runValidators: true, // Faqat yangilanayotgan maydon (image) uchun validatsiyani ishga tushirish
      }
    );

    // Javob qaytarish
    res.status(200).json({
      success: true,
      message: "Rasm muvaffaqiyatli yangilandi",
      image: updatedUser.image,
    });
  } catch (error) {
    // Yangi rasmni o‘chirish (xato yuz bersa)
    if (req.file) {
      const pathToDelete = path.join(
        __dirname,
        "../uploads",
        req.file.filename
      );
      await fs.unlink(pathToDelete).catch(() => {});
    }
    next(new ErrorResponse(error.message, 500));
  }
};

// delete accaunt user
const requestDeleteAccaunt = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return next(new ErrorResponse("Foydalanuvchi topilmadi", 404));
    }

    // 6 raqamli tasodifiy kod generatsiyasi;
    const deleteCode = crypto.randomInt(100000, 1000000).toString();
    // kelgan kodni amal qilish vaqti
    const deleteCodeExpire = Date.now() + 5 * 60 * 1000;

    await User.findByIdAndUpdate(userId, {
      deleteAccountToken: deleteCode,
      deleteAccountTokenExpire: deleteCodeExpire,
    });

    // emailga yuborish
    const message = `
      Siz hisobingizni o‘chirishni so‘radingiz. Quyidagi tasdiqlash kodini kiriting:
      ${deleteCode}
      Kod 5 daqiqa davomida amal qiladi.
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Hisobni o‘chirish tasdiqlash kodi",
      text: message,
    });

    res.status(200).json({
      success: true,
      message: "Tasdiqlash kodi emailingizga yuborildi",
    });
  } catch (error) {
    next(new ErrorResponse(error.message, 500));
  }
};

// delete codini tasdiqlash
const confirmDeleteAccaunt = async (req, res, next) => {
  try {
    const { deleteCode } = req.body;
    const userId = req.user._id;

    if (!deleteCode) {
      return next(new ErrorResponse("Tasdiqlash kodi kiritilmadi", 400));
    }

    // foydalanuvchi va codni tekshirish
    const user = await User.findOne({
      _id: userId,
      deleteAccountToken: deleteCode,
      deleteAccountTokenExpire: { $gt: Date.now() },
    });

    if (!user) {
      return next(
        new ErrorResponse("Nato'g'ri yoki muddati o'tgan kod kiritdingiz")
      );
    }
    // Agar foydalanuvchi rasm mavjud bo‘lsa, uni o‘chirish
    if (user.image) {
      const imagePath = path.join(__dirname, "../uploads", user.image);
      try {
        await fs.unlink(imagePath);
      } catch (err) {
        if (err.code !== "ENOENT") {
          console.error("Rasmni o‘chirishda xato:", err.message);
        }
      }
    }

    // Foydalanuvchi hisobini o‘chirish
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      message: "Foydalanuvchi hisobi muvaffaqiyatli o‘chirildi",
    });
  } catch (error) {
    next(new ErrorResponse(error.message, 500));
  }
};

module.exports = {
  register,
  login,
  profile,
  logOut,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  updateUser,
  updateUserImage,
  requestDeleteAccaunt,
  confirmDeleteAccaunt,
};
