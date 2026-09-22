const router = require('express').Router();
const { requestOtp, verifyOtp, login, getSession } = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

router.post('/otp/request', requestOtp);
router.post('/otp/verify', verifyOtp);
router.post('/login', login);
router.get('/me', authenticate, getSession);

module.exports = router;
