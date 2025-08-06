/*REPORTE LIQUIDACIONES OPERADOR */

let logoBase64 = null;

// Convertir imagen a base64
function convertirImagenABase64(url, callback) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = function () {
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const dataURL = canvas.toDataURL("image/png");
    callback(dataURL);
  };
  img.src = url;
}

// Ejecutar la conversión
convertirImagenABase64("/images/aguila2.png", function (base64) {
  logoBase64 = base64;
});

$(document).ready(function () {
  $("#tablaReporte").DataTable({
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
  title: "Reporte de Operadores",
  customize: function (doc) {
    if (logoBase64) {
      doc.content.splice(0, 0, {
        columns: [
          {
            image: logoBase64, // ✅ Aquí usas el logo dinámico
            width: 50,
            alignment: "left",
          },
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
      url: "https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-MX.json",
    },
    responsive: true,
    pageLength: 10,
  });
});
