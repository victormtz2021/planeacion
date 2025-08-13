const express = require("express");
const router = express.Router();
const usuariosController = require("../controllers/usuariosController");
const verificarAcceso = require('../middlewares/verificarAcceso');

router.get("/", verificarAcceso('usuarios'), usuariosController.mostrarUsuarios);
router.get("/", usuariosController.mostrarUsuarios);
router.post("/agregar", usuariosController.agregarUsuario);
router.post("/editar", usuariosController.editarUsuarioAjax);
router.post("/eliminar", usuariosController.eliminarUsuario);
router.get("/eliminados", usuariosController.mostrarUsuariosEliminados);

router.get("/lista", usuariosController.listaUsuarios);

// Obtener permisos de un usuario
router.get("/permisos/:id", usuariosController.obtenerPermisosUsuario);

// Actualizar permisos
router.post("/permisos", usuariosController.actualizarPermisosUsuario);

module.exports = router;
