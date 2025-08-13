const express = require("express");
const router = express.Router();
const { getResumenViajes } = require("../controllers/reportesController");
const verificarAcceso = require("../middlewares/verificarAcceso"); // ✅

// Ejemplo de ruta protegida
router.get("/reporte-operadores",                // tu regla especial
  verificarAcceso('reportes'),     // permiso por módulo
  getResumenViajes
);

module.exports = router;
