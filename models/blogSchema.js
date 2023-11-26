const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  shortdescription: {
    type: String,
    required: true,
  },
  
  category: {
    type: String,
    required: true,
  },
  longdescription: {
    type: String,
    required: true,
  },
  blogimage: {
    type: String,
  },
  view: {
    type: Number,
    default: 0,
  },
  like: {
    type: Array,
  },
  comment: {
    type: Array,
  },
  author: {
    type: mongoose.Types.ObjectId,
    ref: 'Users',
    required: true,
  }
}, {timestamps: true});

const Blog = mongoose.model("Blog", blogSchema);

module.exports = Blog;
