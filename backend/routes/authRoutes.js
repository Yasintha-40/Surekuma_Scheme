const router = require('express').Router();
const { register, sendOtp, verifyOtp } = require('../controllers/authController');
const { rateLimit } = require('../middleware/authRateLimit');

router.post('/register', rateLimit({ limit: 10, windowMs: 3600000 }), register);
router.post('/send-otp', rateLimit({ limit: 10, windowMs: 900000 }), sendOtp);
router.post('/verify-otp', rateLimit({ limit: 30, windowMs: 900000 }), verifyOtp);

module.exports = router;
