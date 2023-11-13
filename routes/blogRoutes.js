const AuthChecker = require("../middlewares/AuthChecker");
const path = require('path');
const multer = require('multer');

const storage = multer.diskStorage({
  // destination: function (req, file, cb) {
  //   cb(null, './uploads');
  // },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null,  uniqueSuffix + file.originalname);
  },
});

const upload = multer({ storage: storage });

const {
  getAllBlog,
  createBlog,
  getSingleBlog,
  updateBlog,
  deleteBlog,
  getUserBlog
} = require("../controllers/blogControllers");

const router = require('express').Router();

router.route('/').get(getAllBlog)
router.route('/:id').get(getSingleBlog);
router.route('/create').post(AuthChecker, upload.single("blogimage"), createBlog);
router.route('/edit/:id').get(AuthChecker, getUserBlog);
router.route('/update').patch(AuthChecker, upload.single("blogimage"), updateBlog);
router.route('/delete/:id').delete(AuthChecker, deleteBlog);

module.exports = router;