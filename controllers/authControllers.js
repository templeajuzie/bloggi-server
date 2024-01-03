const User = require("../models/authSchema");
const Blog = require("../models/blogSchema");
const { StatusCodes } = require("http-status-codes");
require("dotenv").config();
const cookie = require("cookie-parser");
const sendMail = require("../Utils/sendMail");
const path = require("path");
const fs = require("fs");
const ejs = require("ejs");
const { CreateToken, VerifyToken } = require("../Helper/authToken");
const multer = require("multer");
const cloudinary = require("../Utils/CloudinaryFileUpload");

const upload = multer({ dest: "public/tmp" });
const clientUrl = process.env.CLIENT_URL;
const serverUrl = process.env.SERVER_URL;

const UserJoi = require("../Utils/UserJoiSchema");
const {
  NotFoundError,
  UnAuthorizedError,
  ValidationError,
} = require("../errors/index");

const maxAgeInMilliseconds = 7 * 24 * 60 * 60 * 1000;

const signUp = async (req, res) => {
  const { fullname, username, email, password, userdp } = req.body;

  try {
    const findUser = await User.findOne({ email });
    const findUserUsername = await User.findOne({ username });

    if (findUser) {
      throw new UnAuthorizedError("Email already exists");
    } else if (findUserUsername) {
      throw new UnAuthorizedError("Username is taken");
    }

    console.log("not found");

    const { error, value } = UserJoi.validate({
      fullname,
      username,
      email,
      password,
      userdp,
    });

    if (error) {
      console.log("error");
      throw new ValidationError("error");
    }

    console.log(value);

    const newUser = await User.create(value);

    console.log(newUser);

    res.status(StatusCodes.CREATED).json({
      data: newUser,
      message: "Account created successfully",
    });
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: error.message });
  }
};

const signIn = async (req, res) => {
  console.log("hit sign");
  const { email, password } = req.body;

  try {
    const olduser = await User.findOne({ email });

    if (!olduser) {
      throw new NotFoundError("User not found");
    }

    console.log(olduser);

    const authenticatedUser = await olduser.checkPassword(password);

    if (!authenticatedUser) {
      throw new UnAuthorizedError("Invalid credentials");
    }

    const MaxAge = 3 * 24 * 60 * 60;

    const token = CreateToken(olduser._id, MaxAge);
    console.log(token);

    res.setHeader("Authorization", "Bearer " + token);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.cookie("authtoken", token, {
      maxAge: maxAgeInMilliseconds,
      httpOnly: false,
      domain: process.env.CLIENT_URL,
      sameSite: "None",
      secure: true,
    });

    res.status(StatusCodes.OK).json({
      message: "Account signed in successfully.",
      authToken: token,
      olduser,
    });
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: error.message });
  }
};

const singleUser = async (req, res) => {
  const id = req.params.id;

  try {
    const olduser = await User.findById(id);
    const userblog = await Blog.find({ author: id });

    if (!olduser) {
      throw new NotFoundError("User not found");
    }

    if (!userblog) {
      throw new NotFoundError("No Blog found");
    }

    res.status(StatusCodes.OK).json({ olduser, userblog });
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: error.message });
  }
};

const userRecovery = async (req, res) => {
  const { email } = req.body;

  try {
    const userexist = await User.findOne({ email });

    if (!userexist) {
      throw new NotFoundError("User not found");
    }

    const MaxAge = 10 * 60;
    const token = CreateToken({ id: userexist._id }, MaxAge);

    const passwordUpdateUrl = `${serverUrl}/api/v1/auth/account/updatepassword/${token}`;
    const templatePath = path.join(__dirname, "../views/passwordRecovery.ejs");
    const renderHtml = await ejs.renderFile(
      templatePath,
      {
        userFullname: userexist.fullname,
        userEmail: userexist.email,
        userRecoveryUrl: passwordUpdateUrl,
      },

      { async: true }
    );

    await sendMail({
      email: userexist.email,
      subject: "Bloggi Password Recovery",
      html: renderHtml,
    });

    return res
      .status(StatusCodes.OK)
      .send({ message: `verification email has been sent to ${email}` });

    console.log(`verification email sent to ${email}`);
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: error.message });
  }
};

const userVerifyPasswordReset = async (req, res) => {
  const { token } = req.params;

  try {
    const decodedId = VerifyToken(token);

    console.log("hit");

    if (!decodedId) {
      console.log("Invalid token");
      res.redirect(`${clientUrl}/recovery`);
      // throw new UnAuthorizedError("Invalid token");
    }

    console.log("Valid token");
    res.redirect(`${clientUrl}/updatepassword?verified=true&reset=${token}`);
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: error.message });
  }
}; 

const userUpdatePassword = async (req, res) => {
  const { reset, password, confirmPassword } = req.body;

  try {
    if (password !== confirmPassword) {
      throw new ValidationError("Passwords do not match");
    }

    console.log("hit...");

    const decodedId = VerifyToken(reset);

    const checkuser = await User.findById(decodedId["id"]["id"]);

    if (!checkuser) {
      throw new UnAuthorizedError("User not found");
    }

    const hashedPassword = await checkuser.newHashPassword(password);

    await User.findByIdAndUpdate(
      checkuser._id,
      { password: hashedPassword },
      { new: true }
    );

    return res
      .status(StatusCodes.OK)
      .json({ message: "password updated successfully" });
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: error.message });
  }
};

const checkUsername = async (req, res) => {
  const { username } = req.body;

  const olduser = await User.findOne({ username });

  try {
    if (!olduser) {
      console.log(req.body);
      console.log("available");
      return res.status(StatusCodes.OK).json({ message: "available" });
    }

    console.log(req.body);
    console.log("taken");
    return res.status(StatusCodes.CONFLICT).json({ message: "taken" });
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: error.message });
  }
};

const userUpdate = async (req, res) => {
  const { fullname, username, userbio } = req.body;

  try {
    if (!req.user) {
      throw new NotFoundError("User not found");
    }

    if (!req.file) {
      const olduser = { fullname, username, userbio };

      const mainuser = await User.findByIdAndUpdate(
        String(req.user._id),
        olduser,
        {
          new: true,
        }
      );

      res
        .status(StatusCodes.OK)
        .json({ data: mainuser, message: "Account updated successfully" });
    } else {
      const { path } = req.file;

      try {
        const userphoto = await cloudinary.uploader.upload(path, {
          use_filename: true,
          folder: "AllBlogsImage",
        });

        console.log(userphoto);

        const olduser = {
          fullname,
          username,
          userbio,
          userdp: userphoto.secure_url,
        };

        const updatedUser = await User.findByIdAndUpdate(
          String(req.user._id),
          olduser,
          {
            new: true,
          }
        );

        res.status(StatusCodes.OK).json({
          message: "Account updated successfully",
          user: updatedUser,
        });
      } catch (uploadError) {
        console.error("Error uploading file to Cloudinary:", uploadError);
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ error: "Error uploading file to Cloudinary" });
      }
    }
  } catch (error) {
    console.error(error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: error.message });
  }
};

const currentUser = async (req, res) => {
  try {
    if (req.user) {
      const olduser = await User.findById(req.user._id);

      return res
        .status(200)
        .json({ olduser, message: "data recieved successfully" });
    }

    throw new NotFoundError("User not found");
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: error.message });
  }
};

const userSignOut = async (req, res) => {
  try {
    if (!req.user) {
      throw new NotFoundError("User not found");
    }

    res.setHeader("Authorization", "Bearer " + "");

    res.status(StatusCodes.OK).json({ message: "Signout successfully" });
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: error.message });
  }
};

const userDelete = async (req, res) => {
  try {
    if (!req.user) {
      throw new NotFoundError("User not found");
    }

    const deleteUser = await User.findByIdAndDelete(req.user);

    if (deleteUser) {
      res.status(StatusCodes.OK).json({ message: "User deleted successfully" });
      console.log("User deleted successfully");
    }
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: error.message });
  }
};

const userConnect = (io) => {
  io.on("connection", (socket) => {
    socket.on("userconnect", async (connectData) => {
      try {
        const userData = await User.findById(connectData.userid);
        const profileData = await User.findById(connectData.profileid);

        if (!userData || !profileData) {
          throw new NotFoundError("Users not found");
        }

        if (
          profileData.followers.includes(connectData.userid) &&
          userData.following.includes(connectData.profileid)
        ) {
          console.log("User is already in the list");

          const index1 = profileData.followers.indexOf(connectData.userid);
          const index2 = userData.following.indexOf(connectData.profileid);

          profileData.followers.splice(index1, 1);
          userData.following.splice(index2, 1);
          profileData.save();
          userData.save();
        } else {
          profileData.followers.unshift(connectData.userid);
          userData.following.unshift(connectData.profileid);

          profileData.save();
          userData.save();

          console.log("Connection added with userid: " + connectData.userid);
        }

        // Emit the updated profileData regardless of the conditions
        let sendconnectData = {
          profileData,
          userData,
        };
        io.emit("profileconnect", sendconnectData);
      } catch (error) {
        // Handle the error appropriately
        console.error("Error:", error);
      }
    });
  });
};

module.exports = {
  signUp,
  signIn,
  userRecovery,
  userUpdatePassword,
  userVerifyPasswordReset,
  singleUser,
  checkUsername,
  currentUser,
  userUpdate,
  userSignOut,
  userDelete,
  userConnect,
};
