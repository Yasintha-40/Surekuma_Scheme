const router = require('express').Router();
const controller = require('../controllers/notificationController');
const { authenticate } = require('../middleware/authMiddleware');
router.use(authenticate); router.get('/', controller.getNotifications); router.patch('/:id/read', controller.markRead);
module.exports = router;
