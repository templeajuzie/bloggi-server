const joi = require('joi');

const Userjoi = joi.object({
  fullname: joi.string().required(),
  username: joi.string().required(),
  email: joi.string().email().required(),
  userdp: joi.string(),
  userbio: joi.string(),
  password: joi.string().required(),
  followers: joi.array(),
  interest: joi.array(),
  following: joi.array(),
  mypost: joi.array(),
});

module.exports = Userjoi;
