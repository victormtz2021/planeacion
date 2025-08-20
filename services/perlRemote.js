// services/perlRemote.js
const { Client } = require('ssh2');
const fs = require('fs');

function getSSHConfig() {
  return {
    host: process.env.PERL_SSH_HOST,
    port: Number(process.env.PERL_SSH_PORT || 22),
    username: process.env.PERL_SSH_USER,
    privateKey: fs.readFileSync(process.env.PERL_SSH_KEY_PATH),
    passphrase: process.env.PERL_SSH_PASSPHRASE || undefined
  };
}

function execSSH(cmd) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let out = '', errOut = '';
    conn.on('ready', () => {
      conn.exec(cmd, (err, stream) => {
        if (err) { conn.end(); return reject(err); }
        stream.on('close', (code, signal) => {
          conn.end(); resolve({ code, signal, out, errOut });
        }).on('data', d => out += d.toString())
          .stderr.on('data', d => errOut += d.toString());
      });
    }).on('error', reject).connect(getSSHConfig());
  });
}

/** Ejecuta Reseteos.pl y devuelve { ok, script, code, out, errOut } */
async function runPerl(pathOverride) {
  const script = (pathOverride || process.env.PERL_SCRIPT_PATH).trim();

  // valida y ejecuta (con rc visible)
  const cmd = [
    `if [ ! -f "${script}" ]; then echo "NO existe: ${script}"; exit 2; fi`,
    `perl "${script}" 2>&1; rc=$?; echo "[rc] $rc"`
  ].join(' && ');

  const r = await execSSH(cmd);
  const m = r.out.match(/\[rc\]\s+(\d+)/);
  const code = m ? Number(m[1]) : (r.code ?? null);

  return { ok: true, script, code, out: r.out, errOut: r.errOut };
}

module.exports = { runPerl };
