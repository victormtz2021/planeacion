const crypto = require('crypto');
const sql = require('mssql');
const dbConfig = require('../db/config');
const { SftpClient, getSftpConfig, safeName } = require('../utils/sftp');

// Vista
async function viewReseteos(req, res) {
  res.render('reseteos', {
    title: 'Reseteos',
    destino: process.env.RESETEOS_SFTP_REMOTE_DIR,
    maxMB: Number(process.env.RESETEOS_MAX_MB || 20)
  });
}

function sha256(buf) {
  const h = crypto.createHash('sha256'); h.update(buf); return h.digest();
}

async function uploadXMLs(req, res) {
  if (!req.files || !req.files.length) {
    return res.status(400).json({ ok: false, msg: 'Selecciona al menos un XML.' });
  }

  const usuario = req.session?.usuario || 'desconocido';
  const remoteDir = process.env.RESETEOS_SFTP_REMOTE_DIR;

  const pool = await new sql.ConnectionPool(dbConfig).connect();

  // 🧭 Buscar Área / Puesto del usuario (ajusta a tu esquema real)
  let areaNombre = null, puestoNombre = null;
  try {
    const rs = await pool.request()
      .input('usuario', sql.NVarChar, usuario)
      .query(`
        SELECT TOP(1) ga.nombre AS areaNombre, ISNULL(p.puesto,'') AS puestoNombre
        FROM dbo.login l
        JOIN personal_personal p ON p.id_personal = l.id_personal
        JOIN general_area ga ON ga.id_area = p.id_area
        WHERE l.usuario = @usuario
      `);
    areaNombre = rs.recordset[0]?.areaNombre || null;
    puestoNombre = rs.recordset[0]?.puestoNombre || null;
  } catch (_) {}

  const sftp = new SftpClient();
  let guardados = 0, duplicados = 0;
  const detalles = [];

  try {
    await sftp.connect(getSftpConfig());

    for (const f of req.files) {
      try {
        const hash = sha256(f.buffer);

        // Duplicado exacto por hash
        const dup = await pool.request()
          .input('hash', sql.VarBinary, hash)
          .query('SELECT TOP(1) id FROM dbo.reseteos_uploads WHERE archivo_hash = @hash');
        if (dup.recordset.length) {
          duplicados++;
          detalles.push({ archivo: f.originalname, estado: 'duplicado' });
          continue;
        }

        const finalName = safeName(f.originalname);
        const remotePath = `${remoteDir}/${finalName}`; // 👈 relativo al home (según tu ping)

        // Subir por SFTP desde memoria
        await sftp.put(f.buffer, remotePath);

        // Registrar en la tabla
        await pool.request()
          .input('archivo_nombre', sql.NVarChar, finalName)
          .input('archivo_tamano', sql.BigInt, f.size)
          .input('archivo_hash',   sql.VarBinary, hash)
          .input('ruta_destino',   sql.NVarChar, remoteDir)
          .input('subido_por',     sql.NVarChar, usuario)
          .input('subido_area',    sql.NVarChar, areaNombre)
          .input('subido_puesto',  sql.NVarChar, puestoNombre)
          .query(`
            INSERT INTO dbo.reseteos_uploads
              (archivo_nombre, archivo_tamano, archivo_hash, ruta_destino,
               subido_por, subido_area, subido_puesto)
            VALUES
              (@archivo_nombre, @archivo_tamano, @archivo_hash, @ruta_destino,
               @subido_por, @subido_area, @subido_puesto)
          `);

        guardados++;
        detalles.push({ archivo: f.originalname, estado: 'ok' });
      } catch (e) {
        detalles.push({ archivo: f.originalname, estado: 'error', error: e.message });
      }
    }

    res.json({ ok: true, total: req.files.length, guardados, duplicados, detalles });
  } catch (e) {
    res.status(500).json({ ok: false, msg: e.message });
  } finally {
    try { await sftp.end(); } catch {}
    await pool.close();
  }
}

async function listUploadsJSON(req, res) {
  const pool = await new sql.ConnectionPool(dbConfig).connect();
  const rs = await pool.request().query(`
    SELECT TOP(500)
      id, archivo_nombre, archivo_tamano, ruta_destino,
      subido_por, subido_area, subido_puesto,
      CONVERT(varchar(19), fecha_subida, 120) AS fecha_subida,
      procesado, fecha_procesado, observaciones
    FROM dbo.reseteos_uploads
    ORDER BY fecha_subida DESC, id DESC
  `);
  await pool.close();
  res.json({ data: rs.recordset });
}

module.exports = { viewReseteos, uploadXMLs, listUploadsJSON };
