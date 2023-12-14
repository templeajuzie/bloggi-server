const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bodyParser = require("body-parser");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const connectDb = require("./db/ConnectDb");
const blogRouter = require("./routes/blogRoutes");
const authRouter = require("./routes/authRoutes");
const multer = require("multer");
const { handleNewComment, postReaction } = require("./controllers/blogControllers");
const { userConnect } = require("./controllers/authControllers");
require("dotenv").config()

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [process.env.CLIENT_URL],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Authorization", "Content-Type"],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: [process.env.CLIENT_URL],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Authorization", "Content-Type"],
  credentials: true,
}));

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));

// Uncomment if file upload middleware is needed
// app.use(fileUpload({ useTempFiles: true }));

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    res.status(400).send("Multer error: " + err.message);
  } else {
    console.error("Other error:", err);
    next(err);
  }
});

// Routes
app.use("/api/v1/blog", blogRouter);
app.use("/api/v1/auth", authRouter);

// Socket.IO Events
handleNewComment(io);
postReaction(io);
userConnect(io);

// Start the server
connectDb(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
