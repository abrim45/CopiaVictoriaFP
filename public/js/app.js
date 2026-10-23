// Comportamiento común: menús desplegables, cajones laterales, modales, modo edición y notificaciones.
(function () {
  'use strict';

  const storage = {
    get(key, fallback) {
      try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : JSON.parse(value);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) { /* almacenamiento no disponible */ }
    },
  };

  function escapeHtml(text) {
    return String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  async function api(url, options = {}) {
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers: options.body ? { 'Content-Type': 'application/json' } : {},
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: 'same-origin',
    });
    if (res.status === 401) {
      window.location.href = '/login/index.php';
      throw new Error('Sesión caducada');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || 'Error'), { data });
    return data;
  }

  /* ---------- Menús desplegables ---------- */

  function resetUserMenu() {
    const main = document.querySelector('#user-menu .submenu-main');
    const lang = document.querySelector('#user-menu .submenu-lang');
    if (main && lang) {
      main.hidden = false;
      lang.hidden = true;
    }
  }

  function closeDropdowns(except) {
    document.querySelectorAll('.dropdown-menu.show').forEach((menu) => {
      if (menu !== except) {
        menu.classList.remove('show');
        if (menu.id === 'user-menu') resetUserMenu();
      }
    });
    document.querySelectorAll('[data-toggle="dropdown"][aria-expanded="true"]').forEach((t) => {
      if (!except || document.querySelector(t.dataset.target) !== except) t.setAttribute('aria-expanded', 'false');
    });
  }

  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-toggle="dropdown"]');
    if (toggle) {
      e.preventDefault();
      const menu = document.querySelector(toggle.dataset.target);
      if (!menu) return;
      const open = !menu.classList.contains('show');
      closeDropdowns(menu);
      menu.classList.toggle('show', open);
      toggle.setAttribute('aria-expanded', String(open));
      if (!open && menu.id === 'user-menu') resetUserMenu();
      return;
    }

    const submenuOpen = e.target.closest('.submenu-open');
    const submenuBack = e.target.closest('.submenu-back');
    if (submenuOpen || submenuBack) {
      const menu = (submenuOpen || submenuBack).closest('.dropdown-menu');
      menu.querySelector('.submenu-main').hidden = Boolean(submenuOpen);
      menu.querySelector('.submenu-lang').hidden = !submenuOpen;
      return;
    }

    if (!e.target.closest('.dropdown-menu')) closeDropdowns();
    else if (e.target.closest('.dropdown-menu > button, .dropdown-menu > a')) closeDropdowns();
  });

  /* ---------- Modales ---------- */

  let lastFocus = null;

  function openModal(selector) {
    const modal = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!modal) return;
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('modal-open');
    const focusable = modal.querySelector('input:not([type=hidden]):not(.hidden-date), select, textarea, button');
    if (focusable) focusable.focus();
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.hidden = true;
    if (!document.querySelector('.modal:not([hidden])')) document.body.classList.remove('modal-open');
    if (lastFocus) lastFocus.focus();
  }

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-modal]');
    if (opener) {
      e.preventDefault();
      closeDropdowns();
      openModal(opener.dataset.modal);
      return;
    }
    const dismiss = e.target.closest('[data-dismiss="modal"]');
    if (dismiss) {
      closeModal(dismiss.closest('.modal'));
      return;
    }
    if (e.target.classList.contains('modal')) closeModal(e.target);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const modal = [...document.querySelectorAll('.modal:not([hidden])')].pop();
    if (modal) closeModal(modal);
    else closeDropdowns();
  });

  /* ---------- Cajones laterales ---------- */

  const DRAWER_BODY_CLASS = { 'drawer-courseindex': 'courseindex-open', 'drawer-blocks': 'blocks-open' };

  function setDrawer(drawer, open, remember = true) {
    drawer.classList.toggle('show', open);
    const bodyClass = DRAWER_BODY_CLASS[drawer.id];
    if (bodyClass) document.body.classList.toggle(bodyClass, open);
    document.querySelectorAll(`.drawer-toggler[data-drawer="#${drawer.id}"]`).forEach((t) => {
      t.hidden = open;
    });
    if (remember && bodyClass) storage.set(drawer.id, open);
  }

  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-drawer]');
    if (!toggle) return;
    const drawer = document.querySelector(toggle.dataset.drawer);
    if (!drawer) return;
    const open = !drawer.classList.contains('show');
    // Solo un cajón a la derecha a la vez
    if (open && drawer.classList.contains('drawer-right')) {
      document.querySelectorAll('.drawer-right.show').forEach((d) => d !== drawer && setDrawer(d, false));
    }
    setDrawer(drawer, open);
  });

  ['drawer-courseindex', 'drawer-blocks'].forEach((id) => {
    const drawer = document.getElementById(id);
    if (drawer && storage.get(id, false) && window.innerWidth >= 1200) setDrawer(drawer, true, false);
  });

  // Índice del curso: plegar secciones
  document.addEventListener('click', (e) => {
    const chevron = e.target.closest('.courseindex-chevron');
    if (!chevron) return;
    const list = chevron.closest('.courseindex-section').querySelector('.courseindex-items');
    const expanded = chevron.getAttribute('aria-expanded') === 'true';
    chevron.setAttribute('aria-expanded', String(!expanded));
    list.classList.toggle('collapsed', expanded);
  });

  // Fieldsets plegables (formularios)
  document.addEventListener('click', (e) => {
    const chevron = e.target.closest('.collapsible-fieldset legend .section-chevron');
    if (!chevron) return;
    const body = chevron.closest('.collapsible-fieldset').querySelector('.fieldset-body');
    const expanded = chevron.getAttribute('aria-expanded') === 'true';
    chevron.setAttribute('aria-expanded', String(!expanded));
    body.classList.toggle('collapsed', expanded);
  });

  /* ---------- Modo de edición ---------- */

  const editToggle = document.getElementById('editmode-toggle');
  if (editToggle) {
    editToggle.addEventListener('change', () => {
      document.body.classList.toggle('editing', editToggle.checked);
      api('/my/editmode', { method: 'POST', body: { on: editToggle.checked } }).catch(() => {});
    });
  }

  /* ---------- Notificaciones ---------- */

  const markAll = document.getElementById('mark-all-read');
  if (markAll) {
    markAll.addEventListener('click', async () => {
      await api('/api/notifications/read-all', { method: 'POST', body: {} });
      document.querySelectorAll('.notif-item.unread').forEach((n) => n.classList.remove('unread'));
      const badge = document.getElementById('notif-count');
      if (badge) badge.remove();
    });
  }

  /* ---------- Confirmaciones ---------- */

  document.addEventListener('submit', (e) => {
    const form = e.target.closest('form[data-confirm]');
    if (form && !window.confirm(form.dataset.confirm)) e.preventDefault();
  });

  window.Campus = { api, escapeHtml, openModal, closeModal, storage, closeDropdowns };
})();
