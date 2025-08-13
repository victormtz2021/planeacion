/* public/js/reportes.js */

let logoBase64 = null;

// Convierte una imagen a Base64 (para encabezado del PDF)
function convertirImagenABase64(url, cb) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = function () {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    cb(canvas.toDataURL("image/png"));
  };
  img.src = url;
}
convertirImagenABase64("/images/aguila2.png", (b64) => (logoBase64 = b64));

$(document).ready(function () {
  // Construye la URL inicial (usa los filtros actuales de la barra)
  const initialParams = new URLSearchParams(window.location.search);
  const ajaxUrl = `/reporte-operadores.json?${initialParams.toString()}`;

  // Helper: pinta el resumen de filtros con valores actuales
  const setResumen = ({ area, del, al, nombreArea }) => {
    if (nombreArea) {
      $("#lblArea").text(nombreArea);
    } else if (area) {
      $("#lblArea").text(area);
    }
    if (del !== undefined) $("#lblDel").text(del || "—");
    if (al !== undefined) $("#lblAl").text(al || "—");
  };

  // Inicializa DataTable
  const table = $("#tablaReporte").DataTable({
    ajax: {
      url: ajaxUrl,
      dataSrc: "data",
    },
    columns: [
      { data: "id_personal" },
      { data: "nombre" },
      { data: "nombre_area" },
      {
        data: "status", // ← viene 'A' o 'B'
        render: (code) => {
          let texto = "";
          let clase = "";
          if (code === "A") {
            texto = "Activo";
            clase = "bg-success";
          } else if (code === "B") {
            texto = "Baja";
            clase = "bg-secondary";
          } else {
            texto = "Desconocido";
            clase = "bg-warning";
          }
          return `<span class="badge ${clase}">${texto}</span>`;
        },
      },
      {
        data: "Viajes",
        render: (v) =>
          `<span class="badge ${
            v === "Si tiene viajes" ? "bg-success" : "bg-danger"
          }">${v}</span>`,
      },
      {
        data: "Liquidaciones",
        render: (v) =>
          `<span class="badge ${
            v === "Si tiene Liquidaciones" ? "bg-success" : "bg-warning"
          }">${v}</span>`,
      },
    ],

    dom: "Bfrtip",
    buttons: [
      {
        extend: "excelHtml5",
        text: '<i class="bi bi-file-earmark-excel"></i> Excel',
        className: "btn btn-success",
      },
      {
        extend: "pdfHtml5",
        text: '<i class="bi bi-file-earmark-pdf"></i> PDF',
        className: "btn btn-danger",
        title: function () {
          const params = new URLSearchParams(window.location.search);
          const del = params.get("del") || "";
          const al = params.get("al") || "";
          return del && al
            ? `Reporte de Operadores (${del} a ${al})`
            : "Reporte de Operadores";
        },
        exportOptions: {
          // Si usas Responsive/columnas ocultas, exporta solo las visibles:
          columns: ":visible",
          // Convierte celdas con HTML (badges) a texto plano en el PDF:
          format: {
            body: function (data, row, col, node) {
              return node && node.textContent
                ? node.textContent.trim()
                : data || "";
            },
          },
        },
        customize: function (doc) {
          // Encabezado con logo y título
          if (logoBase64) {
            doc.content.splice(0, 0, {
              columns: [
                { image: logoBase64, width: 50, alignment: "left" },
                {
                  text: "REPORTE DE OPERADORES\nViajes y Liquidaciones",
                  alignment: "center",
                  fontSize: 14,
                  margin: [0, 10],
                },
                {
                  text: new Date().toLocaleDateString(),
                  alignment: "right",
                  fontSize: 10,
                  margin: [0, 10],
                },
              ],
            });
          }

          doc.pageOrientation = "landscape";

          // 👉 Localiza la tabla generada por Buttons (la 1ª con "table")
          const tableNode = doc.content.find((c) => c.table && c.table.body);
          if (tableNode) {
            const headerRow = tableNode.table.body[0] || [];
            const colCount = headerRow.length;

            // Evita el crash: asegura que widths tiene EXACTAMENTE colCount entradas
            const widths = new Array(colCount).fill("*");

            // (Opcional) afina algunos anchos si existen esas columnas
            // [ID, Nombre, Área, Estado, Viajes, Liquidaciones] → ajusta según tu orden real
            if (colCount > 0) widths[0] = 70; // ID
            if (colCount > 2) widths[2] = 200; // Área
            if (colCount > 3) widths[3] = 90; // Estado
            if (colCount > 4) widths[4] = 110; // Viajes
            if (colCount > 5) widths[5] = 130; // Liquidaciones

            tableNode.table.widths = widths;
          }

          // Estilos
          doc.styles.tableHeader.fontSize = 10;
          doc.defaultStyle.fontSize = 9;
        },
      },
      {
        extend: "print",
        text: '<i class="bi bi-printer"></i> Imprimir',
        className: "btn btn-primary",
      },
    ],
    language: {
      url: "/datatables/es-ES.json", // tu archivo local
    },
    responsive: true,
    pageLength: 10,
  });

  // Pinta valores iniciales del resumen (desde URL o inputs)
  (function initResumen() {
    const params = new URLSearchParams(window.location.search);
    const area = params.get("area") || $("#fArea").val() || "—";
    const del = params.get("del") || $("#fDel").val() || "—";
    const al = params.get("al") || $("#fAl").val() || "—";
    setResumen({ area, del, al });
  })();

  // Al terminar de cargar por AJAX, si hay datos, usa el nombre del área del JSON
  table.on("xhr", function () {
    const json = table.ajax.json();
    if (json && json.data && json.data.length) {
      setResumen({ nombreArea: json.data[0].nombre_area });
    }
  });

  // Maneja el submit del formulario de filtros SIN recargar la página
  const $form = $('form[action="/reporte-operadores"], #formFiltros'); // soporta ambas formas
  $form.on("submit", function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    const params = new URLSearchParams(formData);
    const newJson = `/reporte-operadores.json?${params.toString()}`;
    const newView = `/reporte-operadores?${params.toString()}`;

    // Actualiza resumen con lo que el usuario envió
    setResumen({
      area: $("#fArea").val() || params.get("area") || "—",
      del: $("#fDel").val() || params.get("del") || "—",
      al: $("#fAl").val() || params.get("al") || "—",
    });

    // Actualiza la barra del navegador (opcional, mantiene estado)
    window.history.replaceState({}, "", newView);

    // Recarga DataTables con la nueva URL
    table.ajax.url(newJson).load();
  });
});
