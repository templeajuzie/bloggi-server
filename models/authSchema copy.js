const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const AuthSchema = new mongoose.Schema(
  {
    fullname: {
      type: 'string',
      required: true,
    },
    username: {
      type: 'string',
      unique: true,
      required: true,
    },
    userdp: {
      type: 'string',
    },
    userbio: {
      type: 'string',
      default: "Tell us about yourself"
    },
    email: {
      type: 'string',
      unique: true,
      required: true,
    },
    password: {
      type: 'string',
      required: true,
    },
    followers: [{
      type: mongoose.Types.ObjectId,
      ref: 'Users',
    }],
    following: [{
      type: mongoose.Types.ObjectId,
      ref: 'Users',
    }],
    interest: {
      type: 'array',
    },
    mypost: [{
      type: mongoose.Types.ObjectId,
      ref: 'Blog',
    }],
  },
  { timestamps: true }
);

AuthSchema.pre('save', async function (next) {
  const gensalt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, gensalt);
  next();
});

AuthSchema.methods.checkPassword = async function (password) {
  const checkPassword = await bcrypt.compare(password, this.password);
  return checkPassword;
};

AuthSchema.methods.newHashPassword = async function (password) {
  try {
    const gensalt = await bcrypt.genSalt(10);
    const checkPassword = await bcrypt.hash(password, gensalt);
    console.log('true', checkPassword);
    return checkPassword;
  } catch (error) {
    // Handle the error, e.g., log it or throw a custom error
    throw new Error("Error hashing password");
  }
};


module.exports = mongoose.model('Users', AuthSchema);
