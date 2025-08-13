const express = require("express");
const router = express.Router();
const { getResumenViajes, getResumenViajesJSON } = require("../controllers/reportesController");
const verificarAcceso = require("../middlewares/verificarAcceso");

router.get("/reporte-operadores", verificarAcceso('reportes'), getResumenViajes);
router.get("/reporte-operadores.json", verificarAcceso('reportes'), getResumenViajesJSON);

module.exports = router;
