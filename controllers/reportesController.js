const { sql, royalPool } = require("../db/royalDb"); // ← usamos el pool ya preparado

// 📄 Reporte: resumen de viajes y liquidaciones por operador
const getResumenViajes = async (req, res) => {
  const area = 1; // Puedes hacerlo dinámico después si deseas

  const query = `
    SELECT 
      p.id_personal, 
      p.nombre,
      Viajes = CASE 
        WHEN (
          SELECT COUNT(sv.no_viaje)
          FROM trafico_viaje sv
          WHERE sv.status_viaje != 'B'
            AND sv.id_area = p.id_area
            AND sv.id_personal = p.id_personal
            AND sv.f_despachado BETWEEN '2025-06-30 00:00' AND '2025-07-06 23:59'
        ) != 0 
        THEN 'Si tiene viajes'
        ELSE 'No tiene viaje'
      END,
      Liquidaciones = CASE 
        WHEN (
          SELECT COUNT(sv.no_liquidacion)
          FROM trafico_viaje sv
          WHERE sv.status_viaje != 'B'
            AND sv.id_area = p.id_area
            AND sv.id_personal = p.id_personal
            AND sv.f_despachado BETWEEN '2025-06-30 00:00' AND '2025-07-06 23:59'
            AND sv.no_liquidacion IS NOT NULL
        ) != 0 
        THEN 'Si tiene Liquidaciones'
        ELSE 'No tiene liquidaciones'
      END
    FROM personal_personal p
    WHERE p.id_area = @area  and  p.tipo_empleado='o'
  `;

  try {
    // 🧠 Usamos el pool ya conectado (conexión persistente)
    const pool = await royalPool;

    const result = await pool.request()
      .input("area", sql.Int, area)
      .query(query);

    res.render("reporte-operadores", {
      title: "Resumen de Viajes",
      datos: result.recordset,
    });
  } catch (err) {
    console.error("❌ Error al consultar Royal DB:", err);
    res.status(500).send("Error interno al consultar Royal DB");
  }
};

module.exports = {
  getResumenViajes,
};
