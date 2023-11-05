const auth = require('../middlewares/AuthChecker')
const AuthChecker = require("../middlewares/AuthChecker");

const {
  getAllBlog,
  createBlog,
  getSingleBlog,
  updateBlog,
  deleteBlog,
  getUserBlog
} = require("../controllers/blogControllers");

const {uploadBlogImage} = require("../controllers/uploadFile");

const router = require('express').Router();

router.route('/').get(getAllBlog)
router.route('/:id').get(getSingleBlog);
router.route('/create' ).post(AuthChecker, createBlog);
router.route('/update/:id' ).patch(AuthChecker, updateBlog);
router.route('/delete/:id' ).delete(AuthChecker, deleteBlog);
router.route('/uploadblogimage').post(uploadBlogImage);

module.exports = router;