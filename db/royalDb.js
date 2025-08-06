// db/royalDb.js
const sql = require("mssql");

// 🔧 Configuración para conectar a la base de datos ROYAL (remota)
const royalDbConfig = {
  user: 'sa',
  password: 'lis.2010',
  server: '10.0.0.12',
  database: 'royaldb2024',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

// ✅ Creamos un pool compartido (evita reconexiones constantes)
const royalPool = new sql.ConnectionPool(royalDbConfig).connect();

// 📌 Función: Obtener lista de personal
async function getPersonal() {
  try {
    const pool = await royalPool;
    const result = await pool.request().query(`
      SELECT nombre_sin_apellidos, apellido_paterno, apellido_materno
      FROM dbo.personal_personal
    `);
    return result.recordset;
  } catch (err) {
    console.error("❌ Error consultando personal:", err);
    return [];
  }
}

// 📌 Función: Obtener lista de áreas activas
async function getAreas() {
  try {
    const pool = await royalPool;
    const result = await pool.request().query(`
      SELECT descripcion AS nombre
      FROM dbo.general_departamentos
      WHERE almacen = 'n'
    `);
    return result.recordset;
  } catch (err) {
    console.error("❌ Error consultando áreas:", err);
    return [];
  }
}

module.exports = {
  sql,
  royalDbConfig,
  royalPool,     // ✅ Pool exportado para uso en otros controladores (como reportes)
  getPersonal,
  getAreas
};
