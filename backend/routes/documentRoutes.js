const path = require('path');
const multer = require('multer');
const router = require('express').Router();
const controller = require('../controllers/documentController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const storage = multer.diskStorage({ destination: path.join(__dirname, '..', 'uploads'), filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`) });
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => ['application/pdf', 'image/jpeg', 'image/png'].includes(file.mimetype) ? cb(null, true) : cb(new Error('Only PDF, JPG and PNG files are allowed')) });
router.post('/:id', authenticate, authorize('applicant'), upload.single('file'), controller.uploadDocument);
module.exports = router;
