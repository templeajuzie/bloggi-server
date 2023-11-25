const Joi = require("joi");

const CommentJoiSchema = Joi.object({
  usercomment: Joi.string().required(),
  blogid: Joi.string().required(),
  userid: Joi.string().required(),
});

module.exports = CommentJoiSchema;
