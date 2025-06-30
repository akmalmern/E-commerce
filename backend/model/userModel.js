const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = mongoose.Schema(
  {
    userName: {
      type: String,
      required: [true, "Isimni kiritishingiz kerak!"],
    },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      index: true,
      required: [true, "Emailingizni kiritishingiz kerak!"],
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Bu email emas tekshirib koring",
      ],
    },
    phone: {
      type: Number,
      required: [true, "Telefon no'merni kiritishingiz majburiy"],
    },
    password: {
      type: String,
      required: [
        function () {
          return this.isNew;
        },
        "Paro'lingizni kiritishingiz kerak!",
      ],
      match: [
        /^(?=.*\d)(?=.*[@#\-_$%^&+=§!\?])(?=.*[a-z])(?=.*[A-Z])[0-9A-Za-z@#\-_$%^&+=§!\?]+$/,
        "Parolda kamida 1 ta katta harf, 1 ta kichik harf, 1 ta raqam va maxsus belgi boʻlishi kerak.",
      ],
    },
    image: {
      type: String,
    },
    isAdmin: {
      type: Boolean,
      dafault: false,
    },
    resetPasswordToken: {
      type: String,
      sparse: true, // Faqat mavjud bo‘lganda indekslanadi
      default: null,
    },
    resetPasswordExpire: {
      type: Date,
      default: null,
    },
    deleteAccountToken: {
      type: String,
      sparse: true,
      default: null,
    },
    deleteAccountTokenExpire: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// saqlashdan oldin parolni shifrlash
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); // Parol o'zgarmagan bo‘lsa, davom etish

  try {
    const salt = await bcrypt.genSalt(10); // Tuz (salt) generatsiya qilish
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error); // Xatolik bo‘lsa, uni next() orqali uzatish
  }
});
// login bn kirganda paro'lni solishtirish
userSchema.methods.comparePassword = async function (yourPassword) {
  try {
    return await bcrypt.compare(yourPassword, this.password);
  } catch (error) {
    console.log("Parolni tekshirishda xato:", error);
  }
};

// access token yaratish 1 soatga
userSchema.methods.jwtGenerateToken = function () {
  return jwt.sign(
    { id: this.id, isAdmin: this.isAdmin },
    process.env.JWT_ACCESS_TOKEN,
    { expiresIn: "1h" }
  ); // Role qo'shildi
};
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { id: this.id, isAdmin: this.isAdmin },
    process.env.JWT_REFRESH_TOKEN,
    { expiresIn: "1d" }
  ); // Role qo'shildi
};

module.exports = mongoose.model("User", userSchema);
