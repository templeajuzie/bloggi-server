const {
  signUp,
  signIn,
  userRecovery,
  userUpdatePassword,
  userVerifyPasswordReset,
  singleUser,
  chekcUsername,
  currentUser,
  userUpdate,
  userSignOut,
  userDelete,
} = require('../controllers/authControllers');

const router = require('express').Router();
const authChecker = require('../middlewares/AuthChecker');

router.route('/signup').post(signUp);
router.route('/signin').post(signIn);
router.route('/checkusername').post(chekcUsername);
router.route('/recovery').post(userRecovery);
router.route('/account/signout').delete(authChecker, userSignOut);

router.route('/user/:id').get(singleUser);

router.route('/account/updatepassword/:token').get(userVerifyPasswordReset);
router.route('/account/updatepassword/').post(userUpdatePassword);
router.route('/account').get(authChecker, currentUser);
router.route('/account').patch(authChecker, userUpdate);
router.route('/account').delete(authChecker, userDelete);

module.exports = router;
