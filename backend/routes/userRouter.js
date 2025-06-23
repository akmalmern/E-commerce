const express = require("express");
const router = express.Router();
const upload = require("../middlware/upload");

const {
  register,
  login,
  profile,
  logOut,
} = require("../controller/userController");
const { isAuthenticated } = require("../middlware/isAuth");

router.post("/register", upload.single("image"), register);
router.post("/login", login);
router.get("/profile", isAuthenticated, profile);
router.get("/logout", isAuthenticated, logOut);

module.exports = router;
