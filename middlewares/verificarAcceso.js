// middlewares/verificarAcceso.js
module.exports = function verificarAcceso(moduloRequerido) {
  return (req, res, next) => {
    // 1) Sesión activa
    if (!req.session?.usuario) {
      return res.redirect('/login?mensaje=debesIniciar');
    }

    // 2) Admin pasa siempre
    if ((req.session.rol || '').toLowerCase() === 'admin') {
      return next();
    }

    // 3) Normalizar requerido
    const requerido = (moduloRequerido || '').trim().toLowerCase();

    // 4) Normalizar permisos (acepta ['planeaciones', ...] o [{modulo:'planeaciones'}, ...])
    const permisosSesion = Array.isArray(req.session.permisos) ? req.session.permisos : [];
    const permisos = permisosSesion.map(p => {
      const v = typeof p === 'string' ? p : p?.modulo;
      return (v || '').trim().toLowerCase();
    });

    // 5) Validar
    if (permisos.includes(requerido)) return next();

    // 6) Denegar
    console.warn(`⛔ "${req.session.usuario}" sin permiso -> "${requerido}". Permisos:`, permisos);
    return res.status(403).render('error-permiso', {
      title: 'Acceso Denegado',
      modulo: moduloRequerido,
      usuario: req.session.usuario,
    });
  };
};
