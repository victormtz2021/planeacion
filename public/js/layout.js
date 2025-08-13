document.addEventListener("DOMContentLoaded", async () => {
    const contenedor = document.getElementById("modulosExtras");

    try {
      const res = await fetch("/modulos/activos");
      const modulos = await res.json();

      if (Array.isArray(modulos)) {
        modulos.forEach(mod => {
          // Ignora rutas fijas ya existentes
          const rutasFijas = ["/", "/usuarios", "/reporte-operadores", "/planeaciones", "/graficas"];
          if (rutasFijas.includes(mod.ruta)) return;

          const a = document.createElement("a");
          a.href = mod.ruta;
          a.title = mod.nombre;
          a.classList.add("text-dark", "d-block", "my-2");
          a.innerHTML = `<i class="${mod.icono} fs-5"></i>`;
          contenedor.appendChild(a);
        });
      }
    } catch (err) {
      console.error("❌ Error al cargar los módulos:", err);
    }
  });