const express = require("express");
require("dotenv").config();
const connectDb = require("../db/ConnectDb");
const blogRouter = require("../routes/blogRoutes");
const authRouter = require("../routes/authRoutes");
const bodyParser = require("body-parser");
const multer = require("multer");

const path = require("path");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const {
  handleNewComment,
  postReaction,
} = require("../controllers/blogControllers");
const { userConnect } = require("../controllers/authControllers");

const cookieParser = require("cookie-parser");

const clientUrl = process.env.CLIENT_URL;

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [clientUrl],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Authorization", "Content-Type"],
    credentials: true,
  },
});

handleNewComment(io);
postReaction(io);
userConnect(io);

app.use(
  cors({
    origin: [clientUrl],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Authorization", "Content-Type"],
    credentials: true,
  })
);

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

connectDb(server);

app.use(express.json());
app.use(cookieParser());
// app.use(fileUpload({ useTempFiles: true }));

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer error occurred
    console.log("error");
    res.status(400).send("Multer error: " + err.message);
  } else {
    // Handle other errors
    console.log("next");
    next(err);
  }
});

app.use("/api/v1/blog", blogRouter);
app.use("/api/v1/auth", authRouter);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));


