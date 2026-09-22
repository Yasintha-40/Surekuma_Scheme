const router = require('express').Router();
const controller = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.use(authenticate, authorize('insurance_officer'));
router.get('/applications', controller.listApplications);
router.get('/applications/:id', controller.getDetails);

module.exports = router;
