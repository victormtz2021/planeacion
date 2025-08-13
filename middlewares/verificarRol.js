// middlewares/verificarRol.js

const soloPaoEmpleado = (req, res, next) => {
  const { usuario, rol } = req.session;

  if (usuario === "Pao" && rol === "empleado") {
    return next();
  }

  return res.status(403).render("error-permiso", {
    title: "Acceso Denegado",
    usuario,
    modulo: "soloPaoEmpleado"
  });
};

// middlewares/verificarRol.js


const bloquearPaoEmpleado = (req, res, next) => {
  const { usuario, rol, permisos } = req.session;

  // Asegúrate que permisos esté definido
  if (!permisos || !Array.isArray(permisos)) {
    console.log("⚠️ Sesión sin permisos definidos.");
    return res.status(403).render("error-permiso", {
      title: "Acceso Denegado",
      usuario: usuario || "Desconocido",
      modulo: "desconocido"
    });
  }

  // Detectar el módulo según la URL
  const path = req.originalUrl.toLowerCase();
  let modulo = "";

  if (path.startsWith("/planeaciones")) modulo = "planeaciones";
  else if (path.startsWith("/usuarios")) modulo = "usuarios";
  else if (path.startsWith("/reporte")) modulo = "reportes";
  else modulo = "desconocido";

  console.log("🧩 Permisos cargados:", permisos);
  console.log("🔐 Módulo solicitado:", modulo);

  // ✅ Solo bloquear a Pao con rol empleado si NO tiene permiso al módulo actual
  if (usuario === "Pao" && rol === "empleado" && !permisos.includes(modulo)) {
    return res.status(403).render("error-permiso", {
      title: "Acceso Denegado",
      usuario,
      modulo
    });
  }

  return next(); // ✅ Permitir acceso
};
module.exports = {
 soloPaoEmpleado,
  bloquearPaoEmpleado,
};
