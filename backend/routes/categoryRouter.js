const express = require("express");
const {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
} = require("../controller/categoryController");
const { isAuthenticated, isAdmin } = require("../middlware/isAuth");
const router = express.Router();

router.get("/categories", getCategories);
router.post("/add-category", isAuthenticated, isAdmin, addCategory);
router.put("/update-category/:id", isAuthenticated, isAdmin, updateCategory);
router.delete("/delete-category/:id", isAuthenticated, isAdmin, deleteCategory);

module.exports = router;
