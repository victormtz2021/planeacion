// controllers/reportesController.js
const { sql, royalPool } = require("../db/royalDb");

function buildFilters(req) {
  const area = Number(req.query.area || 1);

  const strDel = req.query.del || null;
  const strAl = req.query.al || null;

  let del = strDel
    ? new Date(`${strDel}T00:00:00`)
    : new Date(Date.now() - 6 * 24 * 3600 * 1000);
  let al = strAl ? new Date(`${strAl}T00:00:00`) : new Date();

  if (isNaN(del.getTime())) del = new Date(Date.now() - 6 * 24 * 3600 * 1000);
  if (isNaN(al.getTime())) al = new Date();
  if (del > al) [del, al] = [al, del];

  const alPlus1 = new Date(al);
  alPlus1.setDate(alPlus1.getDate() + 1);

  const filtros = {
    area,
    del: strDel || del.toISOString().slice(0, 10),
    al: strAl || al.toISOString().slice(0, 10),
  };
  return { area, del, alPlus1, filtros };
}

const QUERY = `
  SELECT
    p.id_personal,
    p.nombre,
    ISNULL(pc.descripcion, '') AS categoria,      -- 👈 siempre existe la llave
    ga.nombre AS nombre_area,
    p.estado AS status,
    (SELECT MAX(sl.no_liquidacion)
     FROM trafico_liquidacion sl
     WHERE sl.status_liq <> 'C'
       AND sl.id_area = ga.id_area
       AND sl.id_personal = p.id_personal) AS ultimaliquidacion,
    (SELECT TOP (1) sl.fecha_pago
     FROM trafico_liquidacion sl
     WHERE sl.status_liq <> 'C'
       AND sl.id_area = ga.id_area
       AND sl.id_personal = p.id_personal
     ORDER BY sl.no_liquidacion DESC) AS FECHAPAGO,
    CASE WHEN EXISTS (
      SELECT 1
      FROM trafico_viaje sv
      WHERE sv.status_viaje <> 'B'
        AND sv.id_area = p.id_area
        AND sv.id_personal = p.id_personal
        AND sv.f_despachado >= @del
        AND sv.f_despachado <  @alPlus1
    ) THEN 'Si tiene viajes' ELSE 'No tiene viaje' END AS Viajes,
    CASE WHEN EXISTS (
      SELECT 1
      FROM trafico_viaje sv
      WHERE sv.status_viaje <> 'B'
        AND sv.id_area = p.id_area
        AND sv.id_personal = p.id_personal
        AND sv.f_despachado >= @del
        AND sv.f_despachado <  @alPlus1
        AND sv.no_liquidacion IS NOT NULL
    ) THEN 'Si tiene Liquidaciones' ELSE 'No tiene liquidaciones' END AS Liquidaciones
  FROM personal_personal p
  INNER JOIN general_area ga ON ga.id_area = p.id_area
  LEFT JOIN personal_catalogo_categoria pc ON pc.id_categoria = p.id_categoria  -- 👈 LEFT
  WHERE p.id_area = @area
    AND p.tipo_empleado = 'O';                                                  -- 👈 mayúscula
`;

async function runQuery(area, del, alPlus1) {
  const pool = await royalPool;
  const result = await pool
    .request()
    .input("area", sql.Int, area)
    .input("del", sql.DateTime, del)
    .input("alPlus1", sql.DateTime, alPlus1)
    .query(QUERY);
  return result.recordset;
}

// Vista (HTML)
const getResumenViajes = async (req, res) => {
  try {
    const { area, del, alPlus1, filtros } = buildFilters(req);
    const datos = await runQuery(area, del, alPlus1);
    res.render("reporte-operadores", {
      title: "Resumen de Viajes",
      datos,
      filtros,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error interno");
  }
};

// JSON (AJAX)
const getResumenViajesJSON = async (req, res) => {
  try {
    const { area, del, alPlus1 } = buildFilters(req);
    const datos = await runQuery(area, del, alPlus1);
    res.json({ data: datos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
};

module.exports = { getResumenViajes, getResumenViajesJSON };
