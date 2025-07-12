const Product = require("../model/productModel");
const ErrorResponse = require("../utils/errorResponse");
const mongoose = require("mongoose");
const fs = require("fs/promises");
const path = require("path");

const addProduct = async (req, res, next) => {
  try {
    const { name, description, price, countInStock, category, brand } =
      req.body;

    if (!name || !description || !price || !countInStock || !category) {
      return next(
        new ErrorResponse("Majburiy maydonlarni to'ldirishingiz kerak", 400)
      );
    }
    //   rasmlarni yig'ish
    const images = req.files.map((file) => file.filename); // ['img1.jpg', 'img2.jpg', 'img3.jpg']

    const product = await Product.create({
      name,
      description,
      price,
      countInStock,
      category,
      brand,
      images: images, //arry bolib saqlanadi
    });

    res.status(201).json({
      success: true,
      message: "Product yaratildi",
      product,
    });
  } catch (error) {
    next(new ErrorResponse(error.message, 500));
  }
};

// GET /api/products?search=iphone&minPrice=100&maxPrice=1000&category=665fb3c...&sort=price,-rating&page=2&limit=5
const getAllProducts = async (req, res, next) => {
  try {
    const {
      search,
      minPrice,
      maxPrice,
      category,
      sort,
      page = 1,
      limit = 12,
    } = req.query;

    const query = {};

    //  Search (nom bo‘yicha qidiruv)
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    //  Price filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    //  Category filter
    if (category) {
      query.category = category; // ObjectId bo'lishi kerak
    }

    //  Sort
    let sortBy = {};
    if (sort) {
      const sortFields = sort.split(","); // sort=price,-rating
      sortFields.forEach((field) => {
        if (field.startsWith("-")) {
          sortBy[field.substring(1)] = -1; // kamayish
        } else {
          sortBy[field] = 1; // o‘sish
        }
      });
    } else {
      sortBy = { createdAt: -1 }; // default: yangi mahsulotlar avval
    }

    // 📄 Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate("category", "name")
      .sort(sortBy)
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      total,
      count: products.length,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      products,
    });
  } catch (error) {
    next(new ErrorResponse(error.message, 500));
  }
};

const getOneProduct = async (req, res, next) => {
  try {
    const productId = req.params.id;
    // Agar noto‘g‘ri ObjectId yuborilsa, bu xatolikni oldini oladi

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return next(new ErrorResponse("Mahsulot ID noto‘g‘ri", 400));
    }
    const product = await Product.findById(productId).populate(
      "category",
      "name"
    );
    if (!product) {
      return next(new ErrorResponse("Bunday turdagi product topilmadi", 400));
    }
    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    next(new ErrorResponse(error.message, 500));
  }
};

const updateProduct = async (req, res, next) => {
  try {
    const productId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return next(new ErrorResponse("Mahsulot ID noto‘g‘ri", 400));
    }

    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return next(new ErrorResponse("Mahsulot topilmadi", 404));
    }

    const { name, description, price, countInStock, category, brand, rating } =
      req.body;

    const updatedData = {
      name: name || existingProduct.name,
      description: description || existingProduct.description,
      price: price || existingProduct.price,
      countInStock: countInStock || existingProduct.countInStock,
      category: category || existingProduct.category,
      brand: brand || existingProduct.brand,
      rating: rating || existingProduct.rating,
    };

    //  Rasmlar yangilangan bo‘lsa - eski rasmlarni o‘chirish
    if (req.files && req.files.length > 0) {
      if (Array.isArray(existingProduct.images)) {
        for (const oldImg of existingProduct.images) {
          const oldPath = path.join(__dirname, "../uploads", oldImg);
          try {
            await fs.unlink(oldPath);
          } catch (err) {
            // Fayl mavjud bo‘lmasa yoki boshqa xato bo‘lsa - consolega chiqaramiz
            if (err.code !== "ENOENT") {
              console.error("Rasmni o‘chirishda xatolik:", err.message);
            }
          }
        }
      }

      updatedData.images = req.files.map((file) => file.filename);
    } else {
      updatedData.images = existingProduct.images;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      updatedData,
      { new: true, runValidators: true }
    ).populate("category", "name");

    res.status(200).json({
      success: true,
      message: "Mahsulot muvaffaqiyatli yangilandi",
      product: updatedProduct,
    });
  } catch (error) {
    next(new ErrorResponse(error.message, 500));
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const productId = req.params.id;

    const prod = await Product.findById(productId);
    if (!prod) {
      return next(new ErrorResponse("Mahsulot topilmadi", 404));
    }

    // Rasm(lar)ni o‘chirish
    if (Array.isArray(prod.images)) {
      for (const image of prod.images) {
        const imagePath = path.join(__dirname, "../uploads", image);
        try {
          await fs.unlink(imagePath);
        } catch (err) {
          if (err.code !== "ENOENT") {
            console.error(`Rasmni o‘chirishda xato (${image}):`, err.message);
          }
        }
      }
    }

    // Mahsulotni o‘chirish
    await Product.findByIdAndDelete(productId);

    res.status(200).json({
      success: true,
      message: "Mahsulot muvaffaqiyatli o‘chirildi",
    });
  } catch (error) {
    next(new ErrorResponse(error.message, 500));
  }
};

module.exports = { deleteProduct };

module.exports = {
  addProduct,
  getAllProducts,
  getOneProduct,
  updateProduct,
  deleteProduct,
};
