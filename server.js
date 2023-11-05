const express = require('express');
require('dotenv').config();
const connectDb = require('./db/ConnectDb');
const blogRouter = require('./routes/blogRoutes');
const authRouter = require('./routes/authRoutes');
const port = process.env.PORT || 5000;
const path = require('path');
const cors = require('cors');

const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const fileUpload = require('express-fileupload');
const cookieParser = require('cookie-parser');

const app = express();
app.use(
  cors({
    origin: ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials: true,
  })
);

connectDb();
app.listen(port, console.log(`Server listening to ${port} 🔥🔥`));

app.use(express.json());
app.use(cookieParser());
app.use(fileUpload({ useTempFiles: true }));

app.use('/api/v1/blog', blogRouter);
app.use('/api/v1/auth', authRouter);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));
