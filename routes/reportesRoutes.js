const express = require("express");
const router = express.Router();
const { getResumenViajes } = require("../controllers/reportesController");

const { soloPaoEmpleado } = require("../middlewares/verificarRol");


// Ruta registrada como "/reporte-operadores"
router.get("/reporte-operadores", soloPaoEmpleado, getResumenViajes);

module.exports = router;
