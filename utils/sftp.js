const fs = require('fs');
const SftpClient = require('ssh2-sftp-client');

function getSftpConfig() {
  const cfg = {
    host: process.env.RESETEOS_SFTP_HOST,
    port: Number(process.env.RESETEOS_SFTP_PORT || 22),
    username: process.env.RESETEOS_SFTP_USER,
    privateKey: fs.readFileSync(process.env.RESETEOS_SFTP_KEY_PATH)
  };
  if (process.env.RESETEOS_SFTP_PASSPHRASE) cfg.passphrase = process.env.RESETEOS_SFTP_PASSPHRASE;
  return cfg;
}

function safeName(name) {
  const base = name.replace(/[^\w.\-]/g, '_');
  const stamp = new Date().toISOString().replace(/[:.TZ\-]/g, '');
  return `${stamp}_${base}`;
}

module.exports = { SftpClient, getSftpConfig, safeName };
