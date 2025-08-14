const SMB2 = require('smb2');
const path = require('path');

function getSmbClient() {
  const share = process.env.RESETEOS_SMB_SHARE; // \\host\path\to\share
  if (!share) throw new Error('Falta RESETEOS_SMB_SHARE');

  const smb = new SMB2({
    share,
    domain: process.env.RESETEOS_SMB_DOMAIN || undefined,
    username: process.env.RESETEOS_SMB_USER,
    password: process.env.RESETEOS_SMB_PASS,
    autoCloseTimeout: 30 * 1000 // ms sin actividad
  });
  return smb;
}

/** Sanitiza nombres y evita colisiones con timestamp */
function safeName(original) {
  const base = path.basename(original).replace(/[^\w.\-]/g, '_');
  const stamp = new Date().toISOString().replace(/[:.TZ\-]/g, '');
  return `${stamp}_${base}`;
}

module.exports = { getSmbClient, safeName };
