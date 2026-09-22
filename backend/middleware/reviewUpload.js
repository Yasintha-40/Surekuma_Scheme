const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 6 },
  fileFilter: (req, file, callback) => {
    if (!['image/png', 'image/jpeg'].includes(file.mimetype)) return callback(new Error('Use a PNG or JPG signature image.'));
    callback(null, true);
  },
}).single('signature');

module.exports = (req, res, next) => upload(req, res, error => {
  if (error) return res.status(400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'Signature must be 2 MB or smaller.' : 'Upload one PNG or JPG signature image (maximum 2 MB).' });
  if (req.file) {
    const bytes = req.file.buffer;
    const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    if (!(req.file.mimetype === 'image/png' ? png : jpeg)) return res.status(400).json({ message: 'The signature file must contain a valid PNG or JPG image.' });
  }
  next();
});
