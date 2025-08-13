// middlewares/verificarPermiso.js

module.exports = function verificarPermiso(moduloRequerido) {
  return (req, res, next) => {
    const permisos = req.session.permisos || [];

    if (permisos.includes(moduloRequerido)) {
      return next();
    }

    console.warn(`⛔ Acceso denegado a "${moduloRequerido}" para usuario:`, req.session.usuario);
    return res.status(403).render("error-permiso", {
      title: "Acceso Denegado",
      modulo: moduloRequerido,
      usuario: req.session.usuario,
    });
  };
};
