const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
require("dotenv").config();

const saltRounds = 10;

const AuthSchema = new mongoose.Schema(
  {
    fullname: {
      type: "string",
      required: true,
    },
    username: {
      type: "string",
      unique: true,
      required: true,
    },
    userdp: {
      type: "string",
      default:
        "https://i.pinimg.com/originals/a6/f3/c5/a6f3c55ace829310723adcb7a468869b.png",
    },
    userbio: {
      type: "string",
      default: "Tell us about yourself",
    },
    email: {
      type: "string",
      unique: true,
      required: true,
    },
    password: {
      type: "string",
      required: true,
    },
    followers: [
      {
        type: mongoose.Types.ObjectId,
        ref: "Users",
      },
    ],
    following: [
      {
        type: mongoose.Types.ObjectId,
        ref: "Users",
      },
    ],
    interest: {
      type: "array",
    },
    mypost: [
      {
        type: mongoose.Types.ObjectId,
        ref: "Blog",
      },
    ],
    verified: {
      type: "boolean",
      default: false,
    },
    premium: {
      type: "boolean",
      default: false,
    },
  },
  { timestamps: true }
);

AuthSchema.pre("save", async function (next) {
  this.password = bcrypt.hash(this.password, saltRounds);
  next();
});

AuthSchema.methods.checkPassword = async function (password) {
  try {
    const checkPassword = await bcrypt.compare(password, this.password);
    console.log("Password comparison result:", checkPassword);
    return checkPassword;
  } catch (error) {
    console.error("Error comparing passwords:", error);
    throw new Error("Error comparing passwords");
  }
};

AuthSchema.methods.newHashPassword = async function (password) {
  try {
    const checkPassword = bcrypt.hash(password, saltRounds);
    console.log("true", checkPassword);
    return checkPassword;
  } catch (error) {
    // Handle the error, e.g., log it or throw a custom error
    throw new Error("Error hashing password");
  }
};

module.exports = mongoose.model("Users", AuthSchema);
