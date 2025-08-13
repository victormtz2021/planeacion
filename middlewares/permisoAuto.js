// Detecta el módulo por la URL y valida permisos de la sesión
module.exports = (req, res, next) => {
  if (!req.session?.usuario) return res.redirect("/login?mensaje=debesIniciar");

  const permisos = req.session.permisos || [];
  // Base para detectar módulo (ej: /planeaciones)
  const base = (req.baseUrl || req.originalUrl || "").toLowerCase();

  // Mapa de prefijos -> nombre de módulo (ajusta los que tengas fijos)
  const mapa = {
    "/planeaciones": "planeaciones",
    "/usuarios": "usuarios",
    "/reporte": "reportes",
    "/reporte-operadores": "reportes",
  };

  const key = Object.keys(mapa).find(k => base.startsWith(k));
  const modulo = key ? mapa[key] : "desconocido";

  // Permiso concedido
  if (permisos.includes(modulo)) return next();

  // Sin permiso
  return res.status(403).render("error-permiso", {
    title: "Acceso Denegado",
    usuario: req.session.usuario,
    modulo
  });
};

// middlewares/permisoAuto.js
const sql = require("mssql");
const dbConfig = require("../db/config"); // ← ajusta si tu config está en otra ruta

const CACHE_TTL_MS = 60_000; // 60s
let cache = { map: [], stamp: 0, loading: null };

async function loadPrefixes() {
  const pool = await new sql.ConnectionPool(dbConfig).connect();
  const q = `
    SELECT LOWER(p.path_prefix) AS prefix, LOWER(m.clave) AS clave
    FROM dbo.modulos m
    JOIN dbo.modulos_prefix p ON p.modulo_id = m.id
    WHERE m.activo = 1
  `;
  const rs = await pool.request().query(q);
  await pool.close();

  // Ordena por prefijo más largo primero (para /reporte-operadores vs /reporte)
  const map = rs.recordset
    .map(r => ({ prefix: r.prefix.trim(), clave: r.clave.trim() }))
    .sort((a, b) => b.prefix.length - a.prefix.length);

  cache = { map, stamp: Date.now(), loading: null };
}

async function ensureCache() {
  if (Date.now() - cache.stamp < CACHE_TTL_MS && cache.map.length) return;
  if (cache.loading) return cache.loading;
  cache.loading = loadPrefixes().catch(err => {
    console.error("permisoAuto: error cargando prefijos:", err);
    cache.loading = null;
  });
  return cache.loading;
}

module.exports = async function permisoAuto(req, res, next) {
  try {
    await ensureCache();

    const url = (req.baseUrl || req.originalUrl || "").toLowerCase();
    const hit = cache.map.find(m => url.startsWith(m.prefix));
    if (!hit) {
      // No mapeado en catálogos → en dev dejamos pasar; en prod podrías 403 por defecto
      return next();
    }

    // Normaliza permisos en sesión
    const permisos = Array.isArray(req.session?.permisos)
      ? req.session.permisos.map(p => String(p).toLowerCase().trim())
      : [];

    if (permisos.includes(hit.clave)) return next();

    // antes de hacer res.status(403)...
console.warn('403 permisoAuto', {
  url: req.originalUrl,
  moduloDetectado: hit.clave,
  permisosSesion: req.session?.permisos
});
    // 403: responde HTML o JSON según cabecera
    if (req.accepts("html")) {
      return res.status(403).render("error-permiso", {
        title: "Acceso denegado",
        usuario: req.session?.usuario || "usuario",
        modulo: hit.clave
      });
    }
    return res.status(403).json({ ok: false, error: "PERMISO_DENEGADO", modulo: hit.clave });
  } catch (err) {
    console.error("permisoAuto:", err);
    next(err);
  }
};

// Utilidad opcional para forzar recarga (por ejemplo, tras editar catálogos)
module.exports.refresh = () => { cache.stamp = 0; };

