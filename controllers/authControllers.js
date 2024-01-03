const User = require("../models/authSchema");
const Blog = require("../models/blogSchema");
const { StatusCodes } = require("http-status-codes");
const { CreateToken, VerifyToken } = require("../Helper/authToken");
const {
  NotFoundError,
  UnAuthorizedError,
  ValidationError,
} = require("../errors/index");
const cloudinary = require("../Utils/CloudinaryFileUpload");
const sendMail = require("../Utils/sendMail");
const path = require("path");
const ejs = require("ejs");

const maxAgeInMilliseconds = 7 * 24 * 60 * 60 * 1000;

const signUp = async (req, res) => {
  const { fullname, username, email, password, userdp } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    const existingUsername = await User.findOne({ username });

    if (existingUser) {
      throw new UnAuthorizedError("Email already exists");
    } else if (existingUsername) {
      throw new UnAuthorizedError("Username is taken");
    }

    const { error, value } = UserJoi.validate({
      fullname,
      username,
      email,
      password,
      userdp,
    });

    if (error) {
      throw new ValidationError(error.message);
    }

    const newUser = await User.create(value);

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
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user || !(await user.checkPassword(password))) {
      throw new UnAuthorizedError("Invalid credentials");
    }

    const MaxAge = 3 * 24 * 60 * 60;
    const token = CreateToken(user._id, MaxAge);

    res.setHeader("Authorization", "Bearer " + token);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.cookie("authtoken", token, {
      maxAge: maxAgeInMilliseconds,
      httpOnly: false,
      domain: process.env.CLIENT_URL,
      sameSite: "None",
      secure: true,
    });

    return res.status(StatusCodes.OK).json({
      message: "Account signed in successfully.",
      authToken: token,
      user,
    });
  } catch (error) {
    res.status(StatusCodes.UNAUTHORIZED).json({ error: error.message });
  }
};

const singleUser = async (req, res) => {
  const id = req.params.id;

  try {
    const user = await User.findById(id);
    const userBlogs = await Blog.find({ author: id });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    if (!userBlogs) {
      throw new NotFoundError("No Blog found");
    }

    res.status(StatusCodes.OK).json({ user, userBlogs });
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: error.message });
  }
};

const userRecovery = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const MaxAge = 10 * 60;
    const token = CreateToken({ id: user._id }, MaxAge);

    const passwordUpdateUrl = `${serverUrl}/api/v1/auth/account/updatepassword/${token}`;
    const templatePath = path.join(__dirname, "../views/passwordRecovery.ejs");
    const renderHtml = await ejs.renderFile(
      templatePath,
      {
        userFullname: user.fullname,
        userEmail: user.email,
        userRecoveryUrl: passwordUpdateUrl,
      },
      { async: true }
    );

    await sendMail({
      email: user.email,
      subject: "Bloggi Password Recovery",
      html: renderHtml,
    });

    return res
      .status(StatusCodes.OK)
      .send({ message: `Verification email has been sent to ${email}` });
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

    if (!decodedId) {
      res.redirect(`${clientUrl}/recovery`);
    }

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

    const decodedId = VerifyToken(reset);

    const user = await User.findById(String(decodedId.id.id));

    if (!user) {
      throw new UnAuthorizedError("User not found");
    }

    const hashedPassword = await user.newHashPassword(password);

    await User.findByIdAndUpdate(
      user._id,
      { password: hashedPassword },
      { new: true }
    );

    return res
      .status(StatusCodes.OK)
      .json({ message: "Password updated successfully" });
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: error.message });
  }
};

const checkUsername = async (req, res) => {
  const { username } = req.body;

  try {
    const existingUser = await User.findOne({ username });

    if (!existingUser) {
      return res.status(StatusCodes.OK).json({ message: "Username available" });
    }

    return res.status(StatusCodes.CONFLICT).json({ message: "Username taken" });
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
