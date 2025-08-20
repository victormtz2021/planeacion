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


// routes/reseteosRoutes.js
/*
router.get('/perl-check', verificarPermiso('reseteos'), async (req, res) => {
  const { Client } = require('ssh2');
  const fs = require('fs');

  const cfg = {
    host: process.env.PERL_SSH_HOST,
    port: Number(process.env.PERL_SSH_PORT || 22),
    username: process.env.PERL_SSH_USER,
    privateKey: fs.readFileSync(process.env.PERL_SSH_KEY_PATH),
    passphrase: process.env.PERL_SSH_PASSPHRASE || undefined
  };

  const script = process.env.PERL_SCRIPT_PATH;
  const cmd = [
    'echo "whoami: $(whoami)"; echo "home: $(pwd)"',
    `ls -l "${script}" || echo "NO existe: ${script}"`,
    `file "${script}" || true`,
    `head -n 2 "${script}" || true`
  ].join(' && ');

  const conn = new Client();
  conn.on('ready', () => {
    conn.exec(cmd, (err, stream) => {
      if (err) { conn.end(); return res.status(500).json({ ok:false, error: err.message }); }
      let out = '', errOut = '';
      stream.on('close', () => { conn.end(); res.json({ ok:true, out, errOut }); })
            .on('data', d => out += d.toString())
            .stderr.on('data', d => errOut += d.toString());
    });
  }).on('error', e => res.status(500).json({ ok:false, error: e.message }))
    .connect(cfg);
});

*/

router.get('/perl-check', verificarPermiso('reseteos'), async (req, res) => {
  const { Client } = require('ssh2');
  const fs = require('fs');

  const cfg = {
    host: process.env.PERL_SSH_HOST,
    port: Number(process.env.PERL_SSH_PORT || 22),
    username: process.env.PERL_SSH_USER,
    privateKey: fs.readFileSync(process.env.PERL_SSH_KEY_PATH),
    passphrase: process.env.PERL_SSH_PASSPHRASE || undefined
  };

  const script = process.env.PERL_SCRIPT_PATH;
  const cmd = [
    'echo "whoami: $(whoami)"',
    'echo "home: $(pwd)"',
    'echo "--- ls -la /home/eflow ---"; ls -la /home/eflow || true',
    'echo "--- ls -la /home/eflow/cron ---"; ls -la /home/eflow/cron || true',
    'echo "--- ls -la /home/eflow/cron/royal ---"; ls -la /home/eflow/cron/royal || true',
    `echo "--- probar ruta actual (${script}) ---"; ls -l "${script}" || echo "NO existe: ${script}"`,
    'echo "--- buscando Reseteos.pl en home ---"; find /home/eflow -maxdepth 4 -type f -name "Reseteos.pl" 2>/dev/null || true'
  ].join(' && ');

  const conn = new Client();
  conn.on('ready', () => {
    conn.exec(cmd, (err, stream) => {
      if (err) { conn.end(); return res.status(500).json({ ok:false, error: err.message }); }
      let out = '', errOut = '';
      stream.on('close', () => { conn.end(); res.json({ ok:true, out, errOut }); })
            .on('data', d => out += d.toString())
            .stderr.on('data', d => errOut += d.toString());
    });
  }).on('error', e => res.status(500).json({ ok:false, error: e.message }))
    .connect(cfg);
});

/*
router.post('/perl-run', verificarPermiso('reseteos'), async (req, res) => {
  const { Client } = require('ssh2');
  const fs = require('fs');

  const cfg = {
    host: process.env.PERL_SSH_HOST,
    port: Number(process.env.PERL_SSH_PORT || 22),
    username: process.env.PERL_SSH_USER,
    privateKey: fs.readFileSync(process.env.PERL_SSH_KEY_PATH),
    passphrase: process.env.PERL_SSH_PASSPHRASE || undefined
  };

  const cmd = `/usr/bin/perl "${process.env.PERL_SCRIPT_PATH}"`;

  const conn = new Client();
  conn.on('ready', () => {
    conn.exec(cmd, (err, stream) => {
      if (err) { conn.end(); return res.status(500).json({ ok:false, error: err.message }); }
      let out = '', errOut = '';
      stream.on('close', (code) => { conn.end(); res.json({ ok:true, code, out, errOut }); })
            .on('data', d => out += d.toString())
            .stderr.on('data', d => errOut += d.toString());
    });
  }).on('error', e => res.status(500).json({ ok:false, error: e.message }))
    .connect(cfg);
});

*/
router.get('/health', (req, res) => {
  res.json({ ok: true, router: 'reseteosRoutes montado en /reseteos' });
});

/*
router.get('/perl-run', verificarPermiso('reseteos'), (req, res) => {
  res.status(405).json({
    ok: false, msg: 'Usa POST /reseteos/perl-run',
    tip: 'Prueba con curl/Postman (con sesión) o el botón del frontend'
  });
});*/

router.post('/perl-run', verificarPermiso('reseteos'), async (req, res) => {
  const { Client } = require('ssh2');
  const fs = require('fs');

  const cfg = {
    host: process.env.PERL_SSH_HOST,
    port: Number(process.env.PERL_SSH_PORT || 22),
    username: process.env.PERL_SSH_USER,
    privateKey: fs.readFileSync(process.env.PERL_SSH_KEY_PATH),
    passphrase: process.env.PERL_SSH_PASSPHRASE || undefined
  };

  const script = (req.body?.path || process.env.PERL_SCRIPT_PATH).trim();
  const logPath = (process.env.RESETEOS_LOG_PATH || '/home/eflow/cron/royal/Reseteos.log').trim();

  // 🧠 Wrapper verboso + tail del log
  const cmd = [
    'echo "[whoami] $(whoami)"',
    'echo "[home] $HOME"',
    `echo "[ls-script]"; ls -l "${script}" || true`,
    `echo "[perl-version]"; perl -v | head -n 2 || true`,
    `cd "$(dirname "${script}")"`,
    'echo "[pwd] $(pwd)"',
    // Ejecuta perl, guarda rc y muéstralo
    `perl "${script}" 2>&1; rc=$?; echo "[rc] $rc"`,
    // Tail del log (si existe)
    `if [ -f "${logPath}" ]; then echo "---- LOG TAIL (${logPath}) ----"; tail -n 120 "${logPath}"; else echo "Sin log: ${logPath}"; fi`,
    'echo "[done] $(date -Iseconds)"'
  ].join(' && ');

  const conn = new Client();
  conn.on('ready', () => {
    conn.exec(cmd, (err, stream) => {
      if (err) { conn.end(); return res.status(500).json({ ok:false, error: err.message }); }
      let out = '', errOut = '';
      stream.on('close', () => {
        conn.end();
        // Intenta parsear rc del stdout
        const m = out.match(/\[rc\]\s+(\d+)/);
        const code = m ? Number(m[1]) : null;
        res.json({ ok: true, path: script, code, out, errOut });
      })
      .on('data', d => out += d.toString())
      .stderr.on('data', d => errOut += d.toString());
    });
  }).on('error', e => res.status(500).json({ ok:false, error: e.message }))
    .connect(cfg);
});


module.exports = router;
