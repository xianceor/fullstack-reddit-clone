const router = require('express').Router();
const authController = require('../controllers/authController');
const { protect, authLimiter } = require('../middleware/auth');
const { registerValidator, loginValidator } = require('../validators');

router.post('/register', authLimiter, registerValidator, authController.register);
router.post('/login',    authLimiter, loginValidator,    authController.login);
router.get('/me',        protect,                        authController.getMe);

module.exports = router;
