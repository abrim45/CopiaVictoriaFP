// Bloque "Línea de tiempo": filtro por fechas, orden por fecha o por curso, búsqueda y paginación.
(function () {
  'use strict';

  const { escapeHtml, storage } = window.Campus;
  const list = document.getElementById('timeline-list');
  if (!list) return;

  const items = JSON.parse(document.getElementById('timeline-data').textContent);
  const assignIcon = JSON.parse(document.getElementById('assign-icon').textContent);
  const PAGE = 5;

  const FILTER_LABELS = { all: 'Todos', overdue: 'Vencidas', 7: 'Próximos 7 días', 30: 'Próximos 30 días', 90: 'Próximos 3 meses', 180: 'Próximos 6 meses' };
  const SORT_LABELS = { date: 'Ordenar por fecha', course: 'Ordenar por cursos' };

  const state = {
    filter: storage.get('timeline-filter', '7'),
    sort: storage.get('timeline-sort', 'date'),
    search: '',
    limit: PAGE,
  };

  const dayFormat = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeFormat = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });

  const normalize = (text) => String(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  function filtered() {
    const now = Date.now() / 1000;
    const search = normalize(state.search.trim());
    return items
      .filter((item) => {
        if (state.filter === 'overdue') return item.due < now;
        if (state.filter === 'all') return true;
        return item.due >= now && item.due <= now + Number(state.filter) * 86400;
      })
      .filter((item) => !search || normalize(`${item.name} tarea ${item.courseName}`).includes(search))
      .sort((a, b) => a.due - b.due);
  }

  function itemHtml(item, showDate) {
    const date = new Date(item.due * 1000);
    const overdue = item.due < Date.now() / 1000;
    return `
      <div class="timeline-item">
        <div class="timeline-time">${timeFormat.format(date)}</div>
        <div class="timeline-icon" title="Tarea">${assignIcon}</div>
        <div class="timeline-info">
          <a class="timeline-name" href="${item.url}">${escapeHtml(item.name)}</a>
          <div class="timeline-meta">Vencimiento de Tarea · ${escapeHtml(item.courseName)}${overdue ? ' <span class="timeline-overdue">Vencida</span>' : ''}</div>
          ${showDate ? `<div class="timeline-meta text-muted">${dayFormat.format(date)}</div>` : ''}
        </div>
        <div class="timeline-action"><a class="btn btn-outline" href="${item.actionUrl}">Agregar entrega</a></div>
      </div>`;
  }

  function groupBy(array, keyFn) {
    const groups = new Map();
    for (const item of array) {
      const key = keyFn(item);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    }
    return groups;
  }

  function render() {
    document.getElementById('timeline-filter-label').textContent = FILTER_LABELS[state.filter];
    document.getElementById('timeline-sort-label').textContent = SORT_LABELS[state.sort];
    document.querySelectorAll('#timeline-filter [data-filter]').forEach((b) => b.classList.toggle('active', b.dataset.filter === String(state.filter)));
    document.querySelectorAll('#timeline-sort [data-sort]').forEach((b) => b.classList.toggle('active', b.dataset.sort === state.sort));

    const all = filtered();
    if (!all.length) {
      list.innerHTML = '<div class="timeline-empty"><i class="fa fa-calendar-check"></i>No hay actividades que requieran acciones</div>';
      return;
    }

    let html = '';
    if (state.sort === 'date') {
      const visible = all.slice(0, state.limit);
      for (const [day, dayItems] of groupBy(visible, (i) => new Date(i.due * 1000).toDateString())) {
        html += `<div class="timeline-day"><h5>${dayFormat.format(new Date(day))}</h5>${dayItems.map((i) => itemHtml(i, false)).join('')}</div>`;
      }
      if (all.length > state.limit) {
        html += '<div class="timeline-more"><button type="button" class="btn btn-secondary" id="timeline-more">Mostrar más actividades</button></div>';
      }
    } else {
      const byCourse = groupBy(all, (i) => i.courseName);
      for (const [course, courseItems] of [...byCourse].sort((a, b) => a[0].localeCompare(b[0], 'es'))) {
        html += `<div class="timeline-day"><h5 class="timeline-course-name">${escapeHtml(course)}</h5>${courseItems.map((i) => itemHtml(i, true)).join('')}</div>`;
      }
    }
    list.innerHTML = html;
  }

  document.getElementById('timeline-filter').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;
    state.filter = btn.dataset.filter;
    state.limit = PAGE;
    storage.set('timeline-filter', state.filter);
    render();
  });

  document.getElementById('timeline-sort').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-sort]');
    if (!btn) return;
    state.sort = btn.dataset.sort;
    storage.set('timeline-sort', state.sort);
    render();
  });

  document.getElementById('timeline-search').addEventListener('input', (e) => {
    state.search = e.target.value;
    state.limit = PAGE;
    render();
  });

  list.addEventListener('click', (e) => {
    if (e.target.id === 'timeline-more') {
      state.limit += PAGE;
      render();
    }
  });

  if (!(String(state.filter) in FILTER_LABELS)) state.filter = '7';
  render();
})();
