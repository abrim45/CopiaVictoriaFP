// Modo de edición del Área personal: ocultar bloques y volver a añadirlos.
(function () {
  'use strict';

  const { storage, openModal, closeModal } = window.Campus;
  const NAMES = { timeline: 'Línea de tiempo', calendar: 'Calendario' };
  let hidden = storage.get('hidden-blocks', []);

  function apply() {
    document.querySelectorAll('.block[data-block]').forEach((block) => {
      block.hidden = hidden.includes(block.dataset.block);
    });
    const list = document.getElementById('addblock-list');
    list.innerHTML = hidden.map((b) => `<button type="button" data-add-block="${b}">${NAMES[b]}</button>`).join('');
    document.getElementById('addblock-empty').hidden = hidden.length > 0;
    storage.set('hidden-blocks', hidden);
  }

  document.addEventListener('click', (e) => {
    const hide = e.target.closest('[data-hide-block]');
    if (hide) {
      hidden = [...new Set([...hidden, hide.dataset.hideBlock])];
      apply();
      return;
    }
    const add = e.target.closest('[data-add-block]');
    if (add) {
      hidden = hidden.filter((b) => b !== add.dataset.addBlock);
      apply();
      closeModal(document.getElementById('modal-addblock'));
    }
  });

  document.getElementById('add-block').addEventListener('click', () => openModal('#modal-addblock'));
  document.getElementById('reset-blocks').addEventListener('click', () => {
    hidden = [];
    apply();
  });

  apply();
})();
