const mongoose = require("mongoose");

const dataDB = async () => {
  try {
    await mongoose.connect("mongodb://localhost:27017/magazin");
    console.log("Db ga ulandi");
  } catch (error) {
    console.log(error);
  }
};
module.exports = dataDB;
