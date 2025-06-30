const express = require("express");
const router = express.Router();
const upload = require("../middlware/upload");

const {
  register,
  login,
  profile,
  logOut,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  updateUser,
  updateUserImage,
  updateUM,
  requestDeleteAccaunt,
} = require("../controller/userController");
const { isAuthenticated } = require("../middlware/isAuth");

router.post("/register", upload.single("image"), register);
router.post("/login", login);
router.get("/profile", isAuthenticated, profile);
router.get("/logout", isAuthenticated, logOut);
router.post("/refresh-token", refreshAccessToken);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.put("/update-user", isAuthenticated, updateUser);
router.put(
  "/update-user-image",
  isAuthenticated,
  upload.single("image"),
  updateUserImage
);
// delet accaunt user
router.post("/request-delete-accaunt", isAuthenticated, requestDeleteAccaunt);

module.exports = router;
