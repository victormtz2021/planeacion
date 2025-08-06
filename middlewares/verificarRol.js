// middlewares/verificarRol.js

// ✅ Permitir solo a Pao con rol empleado
const soloPaoEmpleado = (req, res, next) => {
  const { usuario, rol } = req.session;

  if (usuario === "Pao" && rol === "empleado") {
    return next();
  }

  return res.status(403).send("Acceso no autorizado");
};

// ❌ Bloquear a Pao empleado en cualquier otra ruta
const bloquearPaoEmpleado = (req, res, next) => {
  const { usuario, rol } = req.session;

  if (usuario === "Pao" && rol === "empleado") {
    return res.status(403).send("Acceso restringido para tu perfil");
  }

  return next();
};

module.exports = {
  soloPaoEmpleado,
  bloquearPaoEmpleado,
};
