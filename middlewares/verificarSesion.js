// middleware/verificarSesion.js
module.exports = (req, res, next) => {
  if (!req.session.usuario) {
    return res.redirect('/login?mensaje=debesIniciar');
  }
  next();
};
