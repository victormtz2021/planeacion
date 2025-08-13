// controllers/modulosController.js
const sql = require("mssql");
const dbConfig = require("../db/config");
const { permisoAuto } = require("./authController"); // para refrescar cache

// Renderiza la página (la tabla se llena con /modulos/lista)
exports.pagina = async (req, res) => {
  res.render("modulos", { title: "Catálogo de Módulos" });
};

// Devuelve lista de módulos con sus prefijos
exports.lista = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);

    // ⬅️ OJO: nombre AS descripcion para no cambiar el frontend
    const modRs = await pool.request().query(`
      SELECT id, clave, nombre AS descripcion, ISNULL(icono,'') AS icono, ISNULL(orden,0) AS orden, activo
      FROM modulos
      ORDER BY orden, clave
    `);

    const prefRs = await pool.request().query(`
      SELECT modulo_id, path_prefix
      FROM modulos_prefix
      ORDER BY path_prefix
    `);

    const prefMap = {};
    for (const r of prefRs.recordset) {
      (prefMap[r.modulo_id] ||= []).push(r.path_prefix);
    }

    const data = modRs.recordset.map(m => ({ ...m, prefixes: prefMap[m.id] || [] }));
    res.json(data);
  } catch (err) {
    console.error("modulos.lista:", err);
    res.status(500).json({ error: "Error obteniendo módulos" });
  }
};


// Inserta módulo + prefijos (1 por línea)
exports.agregar = async (req, res) => {
  const { clave, descripcion, icono, orden, prefixesText } = req.body;

  const claveNorm = String(clave || "").trim().toLowerCase();
  const nombre = String(descripcion || "").trim();         // ⬅️ mapear al campo nombre
  const prefList = String(prefixesText || "")
    .split("\n")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
    .map(p => (p.startsWith("/") ? p : `/${p}`));

  if (!claveNorm || !nombre) {
    return res.status(400).json({ error: "Clave y descripción son obligatorias" });
  }
  if (!prefList.length) {
    return res.status(400).json({ error: "Debes especificar al menos un prefijo" });
  }

  const pool = await sql.connect(dbConfig);
  const tx = new sql.Transaction(pool);

  try {
    await tx.begin();
    const rq = new sql.Request(tx);

    // Duplicado de clave
    const dup = await rq
      .input("clave", sql.NVarChar, claveNorm)
      .query("SELECT 1 FROM modulos WHERE LOWER(LTRIM(RTRIM(clave)))=@clave");
    if (dup.recordset.length) throw new Error("La clave ya existe");

    // Insert en 'nombre' (no 'descripcion')
    const ins = await rq
      .input("clave2", sql.NVarChar, claveNorm)
      .input("nombre", sql.NVarChar, nombre)
      .input("icono", sql.NVarChar, icono || null)
      .input("orden", sql.Int, Number(orden) || 0)
      .input("activo", sql.Bit, 1)
      .query(`
        INSERT INTO modulos (clave, nombre, icono, orden, activo)
        OUTPUT INSERTED.id
        VALUES (@clave2, @nombre, @icono, @orden, @activo)
      `);

    const moduloId = ins.recordset[0].id;

    for (const prefix of prefList) {
      await rq
        .input("modulo_id", sql.Int, moduloId)
        .input("prefix", sql.NVarChar, prefix)
        .query(`INSERT INTO modulos_prefix (modulo_id, path_prefix) VALUES (@modulo_id, @prefix)`);
    }

    await tx.commit();
    try { permisoAuto.refresh(); } catch {}
    res.json({ success: true });
  } catch (err) {
    try { await tx.rollback(); } catch {}
    console.error("modulos.agregar:", err);
    res.status(400).json({ error: err.message || "Error agregando módulo" });
  }
};

// Actualiza módulo + prefijos
exports.actualizar = async (req, res) => {
  const { id } = req.params;
  const { clave, descripcion, icono, orden, prefixesText, activo } = req.body;

  const idNum = Number(id);
  const claveNorm = String(clave || "").trim().toLowerCase();
  const nombre = String(descripcion || "").trim();         // ⬅️ usar 'nombre'
  const prefList = String(prefixesText || "")
    .split("\n")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
    .map(p => (p.startsWith("/") ? p : `/${p}`));
  const activoBit = String(activo) === "1" || String(activo).toLowerCase() === "true";

  if (!idNum) return res.status(400).json({ error: "ID inválido" });
  if (!claveNorm || !nombre) return res.status(400).json({ error: "Clave y descripción son obligatorias" });
  if (!prefList.length) return res.status(400).json({ error: "Debes especificar al menos un prefijo" });

  const pool = await sql.connect(dbConfig);
  const tx = new sql.Transaction(pool);

  try {
    await tx.begin();
    const rq = new sql.Request(tx);

    // Duplicado en otro registro
    const dup = await rq
      .input("clave", sql.NVarChar, claveNorm)
      .input("id", sql.Int, idNum)
      .query(`SELECT 1 FROM modulos WHERE LOWER(LTRIM(RTRIM(clave)))=@clave AND id<>@id`);
    if (dup.recordset.length) throw new Error("Ya existe otro módulo con esa clave");

    // Update usando 'nombre'
    await rq
      .input("id2", sql.Int, idNum)
      .input("clave2", sql.NVarChar, claveNorm)
      .input("nombre", sql.NVarChar, nombre)
      .input("icono", sql.NVarChar, icono || null)
      .input("orden", sql.Int, Number(orden) || 0)
      .input("activo", sql.Bit, activoBit ? 1 : 0)
      .query(`
        UPDATE modulos
        SET clave=@clave2, nombre=@nombre, icono=@icono, orden=@orden, activo=@activo
        WHERE id=@id2
      `);

    // Reemplazar prefijos
    await rq.input("id3", sql.Int, idNum).query(`DELETE FROM modulos_prefix WHERE modulo_id=@id3`);
    for (const prefix of prefList) {
      await rq
        .input("mid", sql.Int, idNum)
        .input("pp", sql.NVarChar, prefix)
        .query(`INSERT INTO modulos_prefix (modulo_id, path_prefix) VALUES (@mid, @pp)`);
    }

    await tx.commit();
    try { permisoAuto.refresh(); } catch {}
    res.json({ success: true });
  } catch (err) {
    try { await tx.rollback(); } catch {}
    console.error("modulos.actualizar:", err);
    res.status(400).json({ error: err.message || "Error actualizando módulo" });
  }
};

// Activar / desactivar
exports.toggleActivo = async (req, res) => {
  const { id } = req.params;
  const { activo } = req.body;
  const idNum = Number(id);
  const activoBit = String(activo) === "1" || String(activo).toLowerCase() === "true";

  if (!idNum) return res.status(400).json({ error: "ID inválido" });

  try {
    const pool = await sql.connect(dbConfig);
    await pool.request()
      .input("id", sql.Int, idNum)
      .input("activo", sql.Bit, activoBit ? 1 : 0)
      .query("UPDATE modulos SET activo=@activo WHERE id=@id");

    try { permisoAuto.refresh(); } catch (e) { console.warn("No se pudo refrescar permisoAuto:", e?.message); }

    res.json({ success: true });
  } catch (err) {
    console.error("modulos.toggleActivo:", err);
    res.status(500).json({ error: "Error cambiando estatus" });
  }
};
