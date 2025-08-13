// public/js/modulos.js
document.addEventListener("DOMContentLoaded", () => {
  const tbody = document.querySelector("#tablaModulos tbody");
  const btnNuevo = document.getElementById("btnNuevoModulo");

  const form = document.getElementById("formModulo");
  const tituloModal = document.getElementById("tituloModalModulo");
  const moduloId = document.getElementById("moduloId");
  const clave = document.getElementById("clave");
  const descripcion = document.getElementById("descripcion");
  const icono = document.getElementById("icono");
  const orden = document.getElementById("orden");
  const activo = document.getElementById("activo");
  const prefixesText = document.getElementById("prefixesText");

  const modal = new bootstrap.Modal(document.getElementById("modalModulo"));

  function limpiarFormulario() {
    moduloId.value = "";
    clave.value = "";
    descripcion.value = "";
    icono.value = "";
    orden.value = "0";
    activo.value = "1";
    prefixesText.value = "";
  }

  btnNuevo?.addEventListener("click", () => {
    limpiarFormulario();
    tituloModal.textContent = "Nuevo módulo";
  });

  async function cargarLista() {
    tbody.innerHTML = `<tr><td colspan="6">Cargando...</td></tr>`;
    const resp = await fetch("/modulos/lista");
    const data = await resp.json();
    tbody.innerHTML = "";

    data.forEach(m => {
      const tr = document.createElement("tr");
      const pref = (m.prefixes || []).join("<br>");

      tr.innerHTML = `
        <td><code>${m.clave}</code></td>
        <td>${m.descripcion}</td>
        <td style="font-family: ui-monospace, SFMono-Regular, Menlo, Consolas;">${pref || "<em>—</em>"}</td>
        <td>${m.orden}</td>
        <td>
          <div class="form-check form-switch">
            <input class="form-check-input sw-activo" type="checkbox" data-id="${m.id}" ${m.activo ? "checked" : ""}>
          </div>
        </td>
        <td>
          <button class="btn btn-sm btn-outline-primary btn-editar" data-id="${m.id}">
            <i class="bi bi-pencil-square"></i> Editar
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Eventos dinámicos
    tbody.querySelectorAll(".btn-editar").forEach(btn => {
      btn.addEventListener("click", () => editar(+btn.dataset.id));
    });
    tbody.querySelectorAll(".sw-activo").forEach(sw => {
      sw.addEventListener("change", () => toggleActivo(+sw.dataset.id, sw.checked));
    });
  }

  async function editar(id) {
    // Reusar /modulos/lista en memoria rápida: recarga simple y filtra
    const resp = await fetch("/modulos/lista");
    const data = await resp.json();
    const m = data.find(x => x.id === id);
    if (!m) return;

    moduloId.value = m.id;
    clave.value = m.clave;
    descripcion.value = m.descripcion;
    icono.value = m.icono || "";
    orden.value = m.orden || 0;
    activo.value = m.activo ? "1" : "0";
    prefixesText.value = (m.prefixes || []).join("\n");

    tituloModal.textContent = `Editar módulo: ${m.clave}`;
    modal.show();
  }

  async function toggleActivo(id, checked) {
    const resp = await fetch(`/modulos/${id}/activo`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: checked ? 1 : 0 })
    });
    if (!resp.ok) {
      alert("No se pudo cambiar el estado");
      cargarLista();
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      clave: clave.value,
      descripcion: descripcion.value,
      icono: icono.value,
      orden: orden.value,
      activo: activo.value,
      prefixesText: prefixesText.value
    };

    let url = "/modulos";
    let method = "POST";
    if (moduloId.value) {
      url = `/modulos/${moduloId.value}`;
      method = "PUT";
    }

    const resp = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (resp.ok) {
      modal.hide();
      await cargarLista();
      alert("✅ Guardado correctamente");
    } else {
      const err = await resp.json().catch(() => ({}));
      alert(`❌ Error: ${err.error || "No se pudo guardar"}`);
    }
  });

  cargarLista();
});
