// Gestor de archivos (entregas y archivos privados): botón Agregar, arrastrar y soltar, borrar y vistas.
(function () {
  'use strict';

  const { escapeHtml } = window.Campus;

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace('.', ',')} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
  }

  document.querySelectorAll('.filemanager-form').forEach((form) => {
    const fm = form.querySelector('.filemanager');
    const input = fm.querySelector('.fm-input');
    const filesBox = fm.querySelector('.fm-files');
    const removeInput = fm.querySelector('.fm-remove');
    const errorBox = fm.querySelector('.fm-error');
    const content = fm.querySelector('.fm-content');
    const maxFiles = Number(fm.dataset.maxFiles);
    const maxBytes = Number(fm.dataset.maxBytes);
    const added = [];
    const removed = [];

    const count = () => filesBox.querySelectorAll('.fm-file').length;
    const refresh = () => content.classList.toggle('has-files', count() > 0);

    function showError(message) {
      errorBox.textContent = message;
      errorBox.classList.toggle('show', Boolean(message));
    }

    function addFiles(fileList) {
      showError('');
      for (const file of fileList) {
        if (file.size > maxBytes) {
          showError(`El archivo "${file.name}" es demasiado grande. El tamaño máximo es 200 MB.`);
          continue;
        }
        if (count() >= maxFiles) {
          showError(`Solo se permiten ${maxFiles} archivos.`);
          break;
        }
        added.push(file);
        filesBox.insertAdjacentHTML(
          'beforeend',
          `<div class="fm-file is-new" data-new="${added.length - 1}">
             <span class="fm-file-icon"><i class="fa fa-file-arrow-up"></i></span>
             <span class="fm-file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
             <span class="fm-file-size">${formatSize(file.size)}</span>
             <button type="button" class="fm-file-remove" title="Borrar"><i class="fa fa-xmark"></i></button>
           </div>`
        );
      }
      refresh();
    }

    fm.querySelector('.fm-add').addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
      addFiles(input.files);
      input.value = '';
    });

    filesBox.addEventListener('click', (e) => {
      const btn = e.target.closest('.fm-file-remove');
      if (!btn) return;
      const tile = btn.closest('.fm-file');
      if (tile.dataset.new !== undefined) {
        added[Number(tile.dataset.new)] = null;
      } else {
        removed.push(tile.dataset.id);
        removeInput.value = removed.join(',');
      }
      tile.remove();
      refresh();
      showError('');
    });

    ['dragenter', 'dragover'].forEach((type) =>
      content.addEventListener(type, (e) => {
        e.preventDefault();
        content.classList.add('dragover');
      })
    );
    ['dragleave', 'drop'].forEach((type) =>
      content.addEventListener(type, (e) => {
        e.preventDefault();
        if (type === 'dragleave' && content.contains(e.relatedTarget)) return;
        content.classList.remove('dragover');
      })
    );
    content.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));
    content.addEventListener('dblclick', (e) => {
      if (!e.target.closest('.fm-file')) input.click();
    });

    fm.querySelectorAll('.fm-views [data-view]').forEach((btn) =>
      btn.addEventListener('click', () => {
        fm.querySelectorAll('.fm-views [data-view]').forEach((b) => b.classList.toggle('active', b === btn));
        content.classList.remove('view-icons', 'view-list', 'view-tree');
        content.classList.add(`view-${btn.dataset.view}`);
      })
    );
    fm.querySelector('.fm-path a').addEventListener('click', (e) => e.preventDefault());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submit = form.querySelector('[type=submit]');
      submit.disabled = true;
      const data = new FormData(form);
      added.filter(Boolean).forEach((file) => data.append('files', file, file.name));
      try {
        const res = await fetch(form.action, { method: 'POST', body: data, credentials: 'same-origin' });
        if (res.redirected) {
          window.location.href = res.url;
          return;
        }
        document.open();
        document.write(await res.text());
        document.close();
      } catch (err) {
        showError('No se ha podido subir el archivo. Inténtelo de nuevo.');
        submit.disabled = false;
      }
    });
  });
})();
