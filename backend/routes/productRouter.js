const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middlware/isAuth");
const {
  addProduct,
  getAllProducts,
  getOneProduct,
  updateProduct,
  deleteProduct,
} = require("../controller/productController");
const upload = require("../middlware/upload");

router.post(
  "/add-product",
  isAuthenticated,
  upload.array("images", 3),
  addProduct
);
router.get("/products", getAllProducts);
router.get("/one-product/:id", getOneProduct);
router.put("/update-product/:id", upload.array("images", 3), updateProduct);
router.delete("/delete-product/:id", deleteProduct);
module.exports = router;
