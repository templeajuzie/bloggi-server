const multer = require('multer')
const upload = multer({ dest: 'uploads/' })
const BlogJoiSchema = require('../Utils/BlogJoiSchema')

const { StatusCodes } = require('http-status-codes');

const blog = require('../models/blogSchema');
const { UnAuthorizedError, NotFoundError, ValidationError } = require('../errors');

const getAllBlog = async (req, res) => {
  try {
    const allblog = await blog.find();

    if (allblog.length === 0) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: 'No blogs found' });
    }

    console.log(allblog);

    return res.status(StatusCodes.OK).json({ allblog, message: 'All blog' });
  } catch (error) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error });
  }
};

const createBlog = async (req, res) => {
  
  const {
    title,
    shortdescription,
    longdescription,
    category,
    blogimage,
  } = req.body;

  try {
    const currentUser = await req.user;

    if (!currentUser) {
      throw new UnAuthorizedError('User not found');
    }

    const newblog = {
      title: title,
      shortdescription: shortdescription,
      longdescription: longdescription,
      category: category,
      blogimage: blogimage,
      authorid: currentUser._id,
    };

    const { error, value } = BlogJoiSchema.validate(newblog);

    if (error) {
      throw new ValidationError("Your information is Invalid ");
    }

    const blogdata = await blog.create(value); // Create the new blog post

    // Update the user's mypost array with the new blog post ID
    currentUser.mypost.push(blogdata._id);
    await currentUser.save(); // Save the user with the updated mypost array

    return res.status(StatusCodes.CREATED).json({ blogdata });
  } catch (error) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};
const getSingleBlog = async (req, res) => {
  const { id } = req.params;

  try {
    const findBlog = await blog.findById(id);

    if (!findBlog) {
      throw new NotFoundError('Blog not found');
    }

    return res.status(StatusCodes.OK).json({ data: findBlog });
  } catch (error) {
    console.log(error);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error });
  }
};

const updateBlog = async (req, res) => {

  const { id } = req.params;

  try {
    const blogdata = await blog.findById(id);

    const olduser = await req.user._id;

    if (!blogdata) {
      throw new NotFoundError('Blog not found');
    } else if (blogdata.authorid.toString() !== olduser.toString()) {
      throw new UnAuthorizedError('User not authorized');
    }

    const updatedBlog = await blog.findByIdAndUpdate(id, req.body, {
      new: true,
    });

    res
      .status(StatusCodes.OK)
      .json({ data: updatedBlog, message: 'Blog updated successfully' });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error });
  }
};

const deleteBlog = async (req, res) => {
  const { id } = req.params;

  try {
    const blogdata = await blog.findById(id);

    const olduser = await req.user._id;

    if (!blogdata) {
      throw new NotFoundError('Blog not found');
    } else if (blogdata.authorid.toString() !== olduser.toString()) {
      throw new UnAuthorizedError('User not authorized');
    }

    await blog.findByIdAndDelete(id);

    res
      .status(StatusCodes.OK)
      .json({ message: 'Blog deleted successfully' });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error });
  }
};

const getUserBlog = async (req, res) => {
  try {

    const getUserId = await (req).user._id.toString();

    if (!getUserId) {
      throw new NotFoundError('Unauthorized');
    }

    const getUserEvent = await blog.find({ authorid: getUserId });

    if (!getUserEvent) {
      throw new NotFoundError('Blog not found');
    }

    res.status(StatusCodes.OK).json(getUserEvent);

  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error);
  }
}

module.exports = {
  getAllBlog,
  createBlog,
  getSingleBlog,
  updateBlog,
  deleteBlog,
  getUserBlog
};
