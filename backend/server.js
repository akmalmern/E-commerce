const express = require("express");
const app = express();
require("dotenv").config();
const dataDB = require("./db/dataDB");
const errorHandler = require("./middlware/error");
const cookieParser = require("cookie-parser");
const path = require("path");
const userRouter = require("./routes/userRouter");
// ++++++++++++++++++++++++++++++
app.use(express.json());
dataDB();

app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// ---------------------------------
app.use("/user", userRouter);

// ++++++++++++++++++++++++++++++
app.use(errorHandler);
// ++++++++++++++++++++++++++++++

const port = 5000;
app.listen(port, () => {
  console.log("portda ishladi");
});
