// controllers/authcontroller.js
const bcrypt = require('bcryptjs');
const sql = require('mssql');
const dbConfig = require('../db/config');

/* ============================ LOGIN / LOGOUT ============================ */
async function login(req, res) {
  const { usuario, contrasena } = req.body;

  try {
    const pool = await sql.connect(dbConfig);

    // Buscar usuario activo
    const userRs = await pool.request()
      .input('usuario', sql.NVarChar, usuario)
      .query(`
        SELECT TOP 1 id, usuario, contrasena, rol, estatus
        FROM login
        WHERE LOWER(LTRIM(RTRIM(usuario))) = LOWER(LTRIM(RTRIM(@usuario))) AND estatus = 1
      `);

    if (!userRs.recordset.length) {
      return res.render('login', { error: 'Usuario no encontrado o inactivo' });
    }

    const user = userRs.recordset[0];

    // Validar contraseña
    const ok = await bcrypt.compare(contrasena || '', user.contrasena || '');
    if (!ok) {
      return res.render('login', { error: 'Contraseña incorrecta' });
    }

    // Cargar permisos del usuario (normalizados)
    const permisosRs = await pool.request()
      .input('idUsuario', sql.Int, user.id)
      .query(`
        SELECT LOWER(LTRIM(RTRIM(modulo))) AS modulo
        FROM permisos_usuarios
        WHERE id_usuario = @idUsuario
      `);

    const permisos = (permisosRs.recordset || [])
      .map(r => String(r.modulo || '').trim().toLowerCase())
      .filter(Boolean);

    // Guardar en sesión
    req.session.userId   = user.id;
    req.session.usuario  = user.usuario;
    req.session.rol      = user.rol;
    req.session.permisos = permisos;
    // Nota: appVersion se maneja en app.js si usas APP_VERSION

    console.log('🔐 Login ok:', { usuario: user.usuario, permisos });

    // Asegurar que la sesión se persiste antes del redirect
    return req.session.save(err => {
      if (err) {
        console.error('Error guardando sesión:', err);
        return res.render('login', { error: 'No se pudo guardar la sesión' });
      }
      return res.redirect('/dashboard');
    });
  } catch (err) {
    console.error('Error en login:', err);
    return res.render('login', { error: 'Error interno del servidor' });
  }
}

function logout(req, res) {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
}

/* ======================= permisoAuto (por prefijo) ====================== */
/**
 * Protege rutas mapeadas en BD por prefijos (tabla modulos_prefix) y valida
 * contra la clave del módulo (tabla modulos.clave) presente en req.session.permisos
 * Ejemplo:
 *   modulos.clave = 'usuarios'
 *   modulos_prefix.path_prefix = '/usuarios'
 * Si la URL empieza con '/usuarios', exige permiso 'usuarios'.
 */

const CACHE_TTL_MS = 60_000; // 60s
let cache = { map: [], stamp: 0, loading: null };

async function loadPrefixes() {
  const pool = await sql.connect(dbConfig);
  const rs = await pool.request().query(`
    SELECT LOWER(p.path_prefix) AS prefix, LOWER(m.clave) AS clave
    FROM dbo.modulos m
    JOIN dbo.modulos_prefix p ON p.modulo_id = m.id
    WHERE m.activo = 1
  `);

  cache.map = (rs.recordset || [])
    .map(r => ({
      prefix: String(r.prefix || '').trim(),
      clave : String(r.clave  || '').trim()
    }))
    .filter(r => r.prefix && r.clave)
    // Prefijos más largos primero (para que /reporte-operadores gane sobre /reporte)
    .sort((a, b) => b.prefix.length - a.prefix.length);

  cache.stamp = Date.now();
  cache.loading = null;
}

async function ensureCache() {
  const fresh = (Date.now() - cache.stamp < CACHE_TTL_MS) && cache.map.length;
  if (fresh) return;
  if (!cache.loading) {
    cache.loading = loadPrefixes().catch(e => {
      cache.loading = null;
      console.error('permisoAuto:loadPrefixes error:', e);
    });
  }
  return cache.loading;
}

async function permisoAuto(req, res, next) {
  try {
    await ensureCache();

    const url = (req.baseUrl || req.originalUrl || '').toLowerCase();
    const hit = cache.map.find(m => url.startsWith(m.prefix));
    if (!hit) return next(); // no mapeado en BD → no aplica bloqueo

    const permisos = Array.isArray(req.session?.permisos)
      ? req.session.permisos.map(p => String(p).trim().toLowerCase())
      : [];

    if (permisos.includes(hit.clave)) return next();

    // Sin permiso
    if (req.accepts('html')) {
      return res.status(403).render('error-permiso', {
        title  : 'Acceso denegado',
        usuario: req.session?.usuario || 'usuario',
        modulo : hit.clave
      });
    }
    return res.status(403).json({ ok: false, error: 'PERMISO_DENEGADO', modulo: hit.clave });
  } catch (e) {
    console.error('permisoAuto:', e);
    return next(e);
  }
}

// Permite forzar recarga del caché desde otros controladores (p. ej. al agregar/editar prefijos)
permisoAuto.refresh = () => { cache.stamp = 0; };

module.exports = { login, logout, permisoAuto };
