const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { Schema } = mongoose;

const AuthSchema = new Schema(
  {
    fullname: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      unique: true,
      required: true,
    },
    userdp: String,
    userbio: {
      type: String,
      default: "Tell us about yourself",
    },
    email: {
      type: String,
      unique: true,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    followers: [
      {
        type: Schema.Types.ObjectId,
        ref: "Users",
      },
    ],
    following: [
      {
        type: Schema.Types.ObjectId,
        ref: "Users",
      },
    ],
    interest: [String], // Assuming interest is an array of strings
    mypost: [
      {
        type: Schema.Types.ObjectId,
        ref: "Blog",
      },
    ],
  },
  { timestamps: true }
);

AuthSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("password")) {
      return next();
    }

    const gensalt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, gensalt);
    next();
  } catch (error) {
    return next(error);
  }
});

AuthSchema.methods.checkPassword = async function (password) {
  try {
    const match = await bcrypt.compare(password, this.password);
    return match;
  } catch (error) {
    throw new Error("Error comparing passwords");
  }
};

AuthSchema.methods.newHashPassword = async function (password) {
  try {
    const gensalt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, gensalt);
    return hashedPassword;
  } catch (error) {
    throw new Error("Error hashing password");
  }
};

module.exports = mongoose.model("Users", AuthSchema);
