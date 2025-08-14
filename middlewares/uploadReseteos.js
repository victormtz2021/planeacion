const multer = require('multer');

const maxMB = Number(process.env.RESETEOS_MAX_MB || 20);
const maxFiles = Number(process.env.RESETEOS_MAX_FILES || 200);

function fileFilter(req, file, cb) {
  const ok = /\.xml$/i.test(file.originalname);
  if (!ok) return cb(new Error('Solo se permiten archivos .xml'));
  cb(null, true);
}

const uploadReseteos = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: maxMB * 1024 * 1024,
    files: maxFiles
  }
}).array('xmls', maxFiles); // input name="xmls"

module.exports = { uploadReseteos };
