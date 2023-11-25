const BlogJoiSchema = require("../Utils/BlogJoiSchema");
const CommentJoiSchema = require("../Utils/CommentJoiSchema");
const cookieParser = require("cookie-parser");
const { StatusCodes } = require("http-status-codes");
const fs = require("fs");
const blog = require("../models/blogSchema");
const user = require("../models/authSchema");

const {
  UnAuthorizedError,
  NotFoundError,
  ValidationError,
} = require("../errors");
const cloudinary = require("../Utils/CloudinaryFileUpload");

const getAllBlog = async (req, res) => {
  try {
    const allblog = await blog.find();

    if (allblog.length === 0) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "No blogs found" });
    }

    return res.status(StatusCodes.OK).json({ allblog, message: "All blog" });
  } catch (error) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error });
  }
};

const createBlog = async (req, res) => {
  const { title, shortdescription, longdescription, category } = req.body;

  try {
    const currentUser = req.user;

    if (!currentUser) {
      throw new UnAuthorizedError("User not found");
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { originalname, size, mimetype, path } = req.file;

    const blogphoto = await cloudinary.uploader.upload(path, {
      use_filename: true,
      folder: "AllBlogsImage",
    });

    if (!blogphoto.secure_url) {
      throw new Error("Failed to upload file to Cloudinary");
    }

    const newBlog = {
      title,
      shortdescription,
      longdescription,
      category,
      blogimage: blogphoto.secure_url,
      authorid: currentUser._id,
    };

    const { error, value } = BlogJoiSchema.validate(newBlog);

    if (error) {
      throw new ValidationError("Invalid blog information");
    }

    const blogData = await blog.create(value);

    currentUser.mypost.push(blogData._id);

    await currentUser.save();

    return res.status(StatusCodes.CREATED).json({
      blogData,
      message: "Blog created successfully",
    });
  } catch (error) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
  }
};

const getSingleBlog = async (req, res) => {
  const { id } = req.params;

  try {
    const blogdata = await blog.findById(id);

    if (!blogdata) {
      throw new NotFoundError("Blog not found");
    }

    // Check if the user has already viewed this post
    const hasUserViewed = req.cookies[`viewed_${id}`];

    if (!hasUserViewed && req.method === "GET") {
      // Increment the view count
      console.log("not viewed yet");
      blogdata.view = (blogdata.view || 0) + 1;

      // Set a cookie to mark that the user has viewed this post
      res.cookie(`viewed_${id}`, "true", { maxAge: 24 * 60 * 60 * 1000 }); // 1 day expiry

      await blogdata.save();
    }

    console.log("has viewed");

    return res.status(StatusCodes.OK).json({ blogdata });
  } catch (error) {
    console.error("Error in getSingleBlog:", error); // Log the error for debugging
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Internal Server Error" });
  }
};

const updateBlog = async (req, res) => {
  const { title, shortdescription, longdescription, category, blogid } =
    req.body;

  try {
    const blogdata = await blog.findById(blogid);

    const olduser = await req.user._id;

    if (!blogdata) {
      throw new NotFoundError("Blog not found");
    } else if (
      !olduser &&
      blogdata.authorid.toString() !== olduser.toString()
    ) {
      throw new UnAuthorizedError("User not authorized");
    }

    if (req.file === undefined) {
      const oldpost = {
        title,
        shortdescription,
        longdescription,
        category,
      };

      const updatedBlog = await blog.findByIdAndUpdate(blogid, oldpost, {
        new: true,
      });

      return res
        .status(StatusCodes.OK)
        .json({ data: updatedBlog, message: "Blog updated successfully" });
    }

    const { path } = req.file;

    const blogphoto = await cloudinary.uploader.upload(path, {
      use_filename: true,
      folder: "AllBlogsImage",
    });

    const oldpost = {
      title,
      shortdescription,
      longdescription,
      category,
      blogimage: blogphoto.secure_url,
    };

    const updatedBlog = await blog.findByIdAndUpdate(blogid, oldpost, {
      new: true,
    });

    res
      .status(StatusCodes.OK)
      .json({ data: updatedBlog, message: "Blog updated successfully" });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error });
  }
};

const deleteBlog = async (req, res) => {
  const { id } = req.params;

  try {
    const blogdata = await blog.findById(id);

    const olduser = req.user._id;

    if (!blogdata) {
      throw new NotFoundError("Blog not found");
    } else if (blogdata.authorid.toString() !== olduser.toString()) {
      throw new UnAuthorizedError("User not authorized");
    }

    const userid = olduser.toString();

    try {
      const getUserinfo = await user.findById(userid);
      const userpost = getUserinfo.mypost;
      const index = userpost.indexOf(id);

      if (index !== -1) {
        console.log(index);

        // Remove the element from the array and store it in changeid
        await userpost.splice(index, 1);

        await blog.findByIdAndDelete(id);

        // Save the changes to the mypost array
        await getUserinfo.save();

        res
          .status(StatusCodes.OK)
          .json({ message: "Blog deleted successfully" });
      }
    } catch (error) {
      console.error(error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: "An error occurred while updating user data" });
    }
  } catch (error) {
    console.error(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error });
  }
};

const getUserBlog = async (req, res) => {
  const { id } = req.params;

  try {
    const oldblog = await blog.findById(id);

    if (!oldblog) {
      throw new NotFoundError("Blog does not exist");
    }

    const getUserId = await req.user._id;

    if (!getUserId && getUserId !== oldblog.authorid) {
      throw new NotFoundError("Unauthorized");
    }

    res.status(StatusCodes.OK).json({ oldblog });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(error);
  }
};

//blog comment controller

const postReaction2 = async (req, res) => {
  const { blogid } = req.body;
  console.log(blogid);

  try {
    const blogdata = await blog.findById(blogid);

    const olduser = await req.user._id;
    let userid = String(olduser);
    console.log(userid);

    if (!blogdata) {
      console.log("Blog not found");
      throw new NotFoundError("Blog not found");
    } else if (!olduser) {
      console.log("User not found");
      throw new UnAuthorizedError("User not authorized");
    } else if (blogdata.like.includes(userid)) {
      const index = blogdata.like.indexOf(userid);
      blogdata.like.splice(index, 1);

      blogdata.save();

      console.log("Like removed with userid: " + userid);

      return res.status(StatusCodes.OK).json({ message: "Like removed" });
    }

    blogdata.like.push(userid);

    blogdata.save();

    console.log("Like added with userid: " + userid);

    res.status(StatusCodes.OK).json({ message: "Like added" });
  } catch (error) {}
};

const postReaction = (io) => {
  io.on("connection", (socket) => {
    socket.on("postreact", async (react) => {
      try {
        console.log(react);

        const blogData = await blog.findById(react.blogid);

        if (!blogData) {
          console.log("Blog not found");
          throw new NotFoundError("Blog not found");
        } else if (blogData.like.includes(react.userid)) {
          console.log("true id is already in the list");
          const index = blogData.like.indexOf(react.userid);
          blogData.like.splice(index, 1);

          blogData.save();

          console.log("Like removed with userid: " + react.userid);
        } else {
          blogData.like.unshift(react.userid);

          blogData.save();

          console.log("Like added with userid: " + react.userid);

          socket.emit("alllike", blogData.like);
        }
      } catch (error) {}
    });
  });
};

const handleNewComment = (io) => {
  io.on("connection", (socket) => {
    socket.on("newcomment", async (newComment) => {
      try {
        console.log(newComment);

        const blogData = await blog.findById(newComment.blogid);

        if (!blogData) {
          return res
            .status(StatusCodes.NOT_FOUND)
            .json({ error: "Blog not found" });
        }

        const { error, value } = CommentJoiSchema.validate(newComment);

        if (error) {
          throw new ValidationError("Invalid comment information");
        }

        console.log("blogData");

        blogData.comment.unshift(value);

        blogData.save();

        socket.emit("allcomment", blogData.comment);
      } catch (error) {}
    });
  });
};

module.exports = {
  getAllBlog,
  createBlog,
  getSingleBlog,
  updateBlog,
  deleteBlog,
  getUserBlog,
  postReaction,
  handleNewComment,
};
