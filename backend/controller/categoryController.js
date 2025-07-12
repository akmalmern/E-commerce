const Category = require("../model/categoryModel");
const ErrorResponse = require("../utils/errorResponse");

//  Barcha kategoriyalarni olish
const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().lean(); // .lean() tezroq ishlaydi
    res.status(200).json({
      success: true,
      message: "Categoriyalar ro'yxati",
      count: categories.length,
      categories,
    });
  } catch (error) {
    next(
      new ErrorResponse(
        "Categoriyalarni olishda xatolik: " + error.message,
        500
      )
    );
  }
};

// ➕ Yangi kategoriya qo‘shish
const addCategory = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name?.trim()) {
      return next(
        new ErrorResponse("Kategoriya nomi bo‘sh bo‘lmasligi kerak", 400)
      );
    }
    // category exsting biror nomni qidirishga eng teskor yechim
    const existing = await Category.exists({
      name: { $regex: `^${name}$`, $options: "i" },
    });
    if (existing) {
      return next(
        new ErrorResponse("Bu nomdagi kategoriya allaqachon mavjud", 400)
      );
    }

    const newCategory = await Category.create({ name: name.trim() });

    res.status(201).json({
      success: true,
      message: "Yangi kategoriya yaratildi",
      category: newCategory,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: `Bu nomdagi category allaqachon mavjud`,
      });
    }
    next(new ErrorResponse(error.message, 500));
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const categoryId = req.params.id;
    const { name } = req.body;
    if (!name) {
      return next(
        new ErrorResponse("Kategoriya nomi bo'sh bo'lmaslik kerak", 400)
      );
    }

    const normalizedName = name.trim().toLowerCase();

    const existingCategory = await Category.findById(categoryId);
    if (!existingCategory) {
      return next(new ErrorResponse("Kategoriya topilmadi", 404));
    }

    // Boshqa kategoriyada ayni nom bor-yo‘qligini tekshirish
    const duplicateCategory = await Category.findOne({
      _id: { $ne: categoryId },
      name: normalizedName,
    });
    if (duplicateCategory) {
      return next(
        new ErrorResponse("Bunday nomli kategoriya allaqachon mavjud", 400)
      );
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      { name: normalizedName },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Kategoriya muvaffaqiyatli yangilandi",
      data: updatedCategory,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const firstError = Object.values(error.errors)[0].message;
      return res.status(400).json({
        success: false,
        error: firstError,
      });
    }
    next(new ErrorResponse(error.message, 500));
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const catId = req.params.id;
    const delCat = await Category.findByIdAndDelete(catId);
    if (!delCat) {
      return next(
        new ErrorResponse("bunday Id dagi category mavjud emas", 404)
      );
    }

    res.status(200).json({
      success: true,
      message: "category o'chirildi",
    });
  } catch (error) {
    next(new ErrorResponse(error.message, 500));
  }
};

module.exports = {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
};
