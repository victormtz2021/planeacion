const express = require("express");
const router = express.Router();
const usuariosController = require("../controllers/usuariosController");
const { bloquearPaoEmpleado } = require("../middlewares/verificarRol");

router.use(bloquearPaoEmpleado); // 🔐 evita acceso a todo lo de usuarios
router.get("/", usuariosController.mostrarUsuarios);
router.post("/agregar", usuariosController.agregarUsuario);
router.post("/editar", usuariosController.editarUsuarioAjax);
router.post("/eliminar", usuariosController.eliminarUsuario);
router.get("/eliminados", usuariosController.mostrarUsuariosEliminados);

module.exports = router;
