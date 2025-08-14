(function () {
  const $form = document.getElementById('formUpload');
  const $input = document.getElementById('inputXMLs');
  const $drop = document.getElementById('dropArea');
  const $preview = document.getElementById('filesPreview');
  const $msg = document.getElementById('resultMsg');

  function bytesToSize(b) {
    if (b === 0) return '0 B';
    const k = 1024, sizes = ['B','KB','MB','GB','TB'];
    const i = Math.floor(Math.log(b)/Math.log(k));
    return (b/Math.pow(k,i)).toFixed(2)+' '+sizes[i];
  }

  function showPreview(files) {
    if (!files || !files.length) { $preview.textContent = ''; return; }
    const items = [...files].map(f => `${f.name} (${bytesToSize(f.size)})`);
    $preview.textContent = items.join(' • ');
  }

  ['dragenter','dragover'].forEach(ev => {
    $drop.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); $drop.classList.add('bg-light'); });
  });
  ['dragleave','drop'].forEach(ev => {
    $drop.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); $drop.classList.remove('bg-light'); });
  });
  $drop.addEventListener('drop', e => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length) {
      $input.files = dt.files;
      showPreview(dt.files);
    }
  });

  $input.addEventListener('change', () => showPreview($input.files));

  $form.addEventListener('submit', async (e) => {
    e.preventDefault();
    $msg.textContent = '';

    if (!$input.files || !$input.files.length) {
      $msg.innerHTML = '<span class="text-danger">Selecciona al menos un XML.</span>';
      return;
    }

    const fd = new FormData();
    [...$input.files].forEach(f => fd.append('xmls', f));

    const btn = $form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Subiendo...';

    try {
      const r = await fetch('/reseteos/upload', { method: 'POST', body: fd });
      const json = await r.json();
      if (!json.ok) throw new Error(json.msg || 'Error al subir');

      $msg.innerHTML = `
        <span class="text-success">Subida completa.</span>
        <div class="small">Total: ${json.total} • Guardados: ${json.guardados} • Duplicados: ${json.duplicados}</div>
      `;
      if (window.reseteosTable) window.reseteosTable.ajax.reload(null, false);
      $input.value = ''; showPreview(null);
    } catch (err) {
      $msg.innerHTML = `<span class="text-danger">${err.message}</span>`;
    } finally {
      btn.disabled = false; btn.innerHTML = '<i class="bi bi-cloud-upload"></i> Subir XML';
    }
  });

  $(function () {
    window.reseteosTable = $('#tablaReseteos').DataTable({
      ajax: { url: '/reseteos/lista', dataSrc: 'data' },
      pageLength: 10,
      columns: [
        { data: 'id' },
        { data: 'archivo_nombre' },
        { data: 'archivo_tamano', render: bytesToSize },
        { data: 'ruta_destino' },
        { data: 'subido_por' },
        { data: 'subido_area',   defaultContent: '' },
        { data: 'subido_puesto', defaultContent: '' },
        { data: 'fecha_subida' },
        { data: 'procesado', render: v => v ? 'Sí' : 'No' },
        { data: 'observaciones', defaultContent: '' }
      ],
      responsive: true
    });
  });
})();
