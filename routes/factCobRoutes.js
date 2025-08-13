// routes/factCobRoutes.js
const express = require("express");
const router = express.Router();
const verificarPermiso = require("../middlewares/verificarPermiso");

// Home del módulo
router.get("/", verificarPermiso("factcob"), (req, res) => {
  res.render("factcob", { title: "Facturación y Cobranza" });
});

// (opcional) subsecciones
router.get("/facturas", verificarPermiso("factcob"), (req, res) => {
  res.send("Listado de facturas (protegido por 'factcob').");
});
router.get("/cobranza", verificarPermiso("factcob"), (req, res) => {
  res.send("Cobranza (protegido por 'factcob').");
});

module.exports = router;
