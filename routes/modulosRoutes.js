// routes/modulosRoutes.js
const express = require("express");
const router = express.Router();
const modulosController = require("../controllers/modulosController");
const verificarAcceso = require("../middlewares/verificarAcceso");

// Página del catálogo (solo usuarios con permiso 'usuarios' pueden administrar módulos)
router.get("/", verificarAcceso("usuarios"), modulosController.pagina);

// APIs
router.get("/lista", verificarAcceso("usuarios"), modulosController.lista);
router.post("/", verificarAcceso("usuarios"), modulosController.agregar);
router.put("/:id", verificarAcceso("usuarios"), modulosController.actualizar);
router.patch("/:id/activo", verificarAcceso("usuarios"), modulosController.toggleActivo);

module.exports = router;
