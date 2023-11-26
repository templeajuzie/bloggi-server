const joi = require('joi');

const BlogJoiSchema = joi.object({
  title: joi.string().required(),
  shortdescription: joi.string().required(),
  longdescription: joi.string().required(),
  category: joi.string().required(),
  author: joi.object().required(),
  blogimage: joi.string().required(),
  view: joi.number(),
  like: joi.array(),
  comment: joi.array(),
});


module.exports = BlogJoiSchema;