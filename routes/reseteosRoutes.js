const express = require("express");
const router = express.Router();
const verificarPermiso = require("../middlewares/verificarPermiso");
const { uploadReseteos } = require("../middlewares/uploadReseteos");
const { viewReseteos, uploadXMLs, listUploadsJSON } = require("../controllers/reseteosController");

router.get("/", verificarPermiso("reseteos"), viewReseteos);

router.post("/upload", verificarPermiso("reseteos"), (req, res, next) => {
  uploadReseteos(req, res, function (err) {
    if (err) {
      return res.status(400).json({
        ok: false,
        msg: err.message || "Error al subir los archivos."
      });
    }
    next();
  });
}, uploadXMLs);

router.get("/lista", verificarPermiso("reseteos"), listUploadsJSON);

router.get('/ping', verificarPermiso('reseteos'), async (req, res) => {
  const { SftpClient, getSftpConfig } = require('../utils/sftp');
  const sftp = new SftpClient();
  try {
    await sftp.connect(getSftpConfig());
    const dir = process.env.RESETEOS_SFTP_REMOTE_DIR;
    const list = await sftp.list(dir);
    await sftp.end();
    res.json({ ok: true, dir, count: list.length });
  } catch (e) {
    try { await sftp.end(); } catch {}
    res.status(500).json({ ok: false, error: e.message });
  }
});


module.exports = router;
