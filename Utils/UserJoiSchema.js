const joi = require('joi');

const Userjoi = joi.object({
  fullname: joi.string().required(),
  username: joi.string().required(),
  email: joi.string().email().required(),
  userdp: joi.string(),
  userbio: joi.string(),
  password: joi.string().required(),
  followers: joi.array().items(joi.string().pattern(/^[0-9a-fA-F]{24}$/)),
  following: joi.array().items(joi.string().pattern(/^[0-9a-fA-F]{24}$/)),
  interest: joi.array(),
  mypost: joi.array().items(joi.string().pattern(/^[0-9a-fA-F]{24}$/)),
  verified: joi.boolean(),
  premium: joi.boolean(),
});

module.exports = Userjoi;
