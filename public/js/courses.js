// "Mis cursos": agrupación, búsqueda, orden, vistas (Tarjeta, Lista, Resumen), destacar y ocultar cursos.
(function () {
  'use strict';

  const { api, escapeHtml, storage } = window.Campus;
  const container = document.getElementById('courses-container');
  const courses = JSON.parse(document.getElementById('courses-data').textContent);

  const GROUPING_LABELS = { all: 'Todos', inprogress: 'En progreso', future: 'Futuros', past: 'Pasados', favourites: 'Destacados', hidden: 'Eliminado de la vista' };
  const SORT_LABELS = { title: 'Ordenar por nombre del curso', lastaccess: 'Ordenar por último acceso' };
  const VIEW_LABELS = { card: 'Tarjeta', list: 'Lista', summary: 'Resumen' };

  const state = {
    grouping: storage.get('courses-grouping', 'all'),
    sort: storage.get('courses-sort', 'title'),
    view: storage.get('courses-view', 'card'),
    search: '',
  };

  const normalize = (text) => String(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  function visibleCourses() {
    const now = Date.now() / 1000;
    const search = normalize(state.search.trim());
    return courses
      .filter((c) => {
        switch (state.grouping) {
          case 'inprogress': return !c.hidden && c.startdate <= now && (!c.enddate || c.enddate > now);
          case 'future': return !c.hidden && c.startdate > now;
          case 'past': return !c.hidden && c.enddate && c.enddate < now;
          case 'favourites': return !c.hidden && c.starred;
          case 'hidden': return c.hidden;
          default: return !c.hidden;
        }
      })
      .filter((c) => !search || normalize(`${c.fullname} ${c.shortname}`).includes(search))
      .sort((a, b) => (state.sort === 'lastaccess' ? (b.lastaccess || 0) - (a.lastaccess || 0) : a.fullname.localeCompare(b.fullname, 'es')));
  }

  function menuHtml(c) {
    return `
      <div class="course-menu">
        <button type="button" class="icon-link" data-toggle="dropdown" data-target="#course-menu-${c.id}" aria-label="Acciones del curso ${escapeHtml(c.fullname)}"><i class="fa fa-ellipsis-vertical"></i></button>
        <div class="dropdown-menu dropdown-menu-right" id="course-menu-${c.id}">
          <button type="button" data-action="star" data-id="${c.id}">${c.starred ? 'Quitar de destacados' : 'Destacar este curso'}</button>
          <button type="button" data-action="hide" data-id="${c.id}">${c.hidden ? 'Restaurar a la vista' : 'Eliminar de la vista'}</button>
        </div>
      </div>`;
  }

  const url = (c) => `/course/view.php?id=${c.id}`;
  const star = (c) => (c.starred ? '<i class="fa fa-star course-star" title="Curso destacado"></i>' : '');
  const progress = (c) => (c.progress === null ? '' : `<div class="course-progress">${c.progress}% completado</div>`);

  function cardHtml(c) {
    return `
      <div class="card course-card">
        <a class="course-card-img" href="${url(c)}" data-img="${c.id}" tabindex="-1" aria-hidden="true"></a>
        <div class="course-card-body">
          <a class="course-card-name" href="${url(c)}">${star(c)}${escapeHtml(c.fullname)}</a>
          <div class="course-card-cat">${escapeHtml(c.category)}</div>
        </div>
        <div class="course-card-footer">${progress(c)}${menuHtml(c)}</div>
      </div>`;
  }

  function listHtml(c) {
    return `
      <div class="card course-list-item">
        <a class="course-list-img" href="${url(c)}" data-img="${c.id}" tabindex="-1" aria-hidden="true"></a>
        <div class="course-list-info">
          <div class="text-muted">${escapeHtml(c.category)}</div>
          <a href="${url(c)}">${star(c)}${escapeHtml(c.fullname)}</a>
          ${progress(c)}
        </div>
        ${menuHtml(c)}
      </div>`;
  }

  function summaryHtml(c) {
    return `
      <div class="card course-summary-item">
        <a class="course-list-img" href="${url(c)}" data-img="${c.id}" tabindex="-1" aria-hidden="true"></a>
        <div class="course-list-info">
          <div class="text-muted">${escapeHtml(c.category)}</div>
          <a href="${url(c)}">${star(c)}${escapeHtml(c.fullname)}</a>
          <p class="text-muted" style="margin:.4rem 0">${escapeHtml(c.summary)}</p>
          ${progress(c)}
        </div>
        ${menuHtml(c)}
      </div>`;
  }

  function render() {
    document.getElementById('grouping-label').textContent = GROUPING_LABELS[state.grouping];
    document.getElementById('sort-label').textContent = SORT_LABELS[state.sort];
    document.getElementById('view-label').textContent = VIEW_LABELS[state.view];
    document.querySelectorAll('#courses-grouping [data-grouping]').forEach((b) => b.classList.toggle('active', b.dataset.grouping === state.grouping));
    document.querySelectorAll('#courses-sort [data-sort]').forEach((b) => b.classList.toggle('active', b.dataset.sort === state.sort));
    document.querySelectorAll('#courses-view [data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === state.view));

    const list = visibleCourses();
    if (!list.length) {
      container.innerHTML = '<div class="courses-empty"><i class="fa fa-graduation-cap"></i>No hay cursos</div>';
      return;
    }
    if (state.view === 'card') container.innerHTML = `<div class="course-grid">${list.map(cardHtml).join('')}</div>`;
    else if (state.view === 'list') container.innerHTML = list.map(listHtml).join('');
    else container.innerHTML = list.map(summaryHtml).join('');

    container.querySelectorAll('[data-img]').forEach((el) => {
      const course = courses.find((c) => c.id === Number(el.dataset.img));
      el.style.backgroundImage = `url("${course.imageUrl}")`;
    });
  }

  function bindMenu(menuId, key, labels) {
    document.getElementById(menuId).addEventListener('click', (e) => {
      const btn = e.target.closest(`[data-${key}]`);
      if (!btn) return;
      state[key] = btn.dataset[key];
      storage.set(`courses-${key}`, state[key]);
      render();
    });
    if (!(state[key] in labels)) state[key] = Object.keys(labels)[0];
  }

  bindMenu('courses-grouping', 'grouping', GROUPING_LABELS);
  bindMenu('courses-sort', 'sort', SORT_LABELS);
  bindMenu('courses-view', 'view', VIEW_LABELS);

  document.getElementById('courses-search').addEventListener('input', (e) => {
    state.search = e.target.value;
    render();
  });

  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const course = courses.find((c) => c.id === Number(btn.dataset.id));
    const field = btn.dataset.action === 'star' ? 'starred' : 'hidden';
    const value = !course[field];
    await api(`/api/courses/${course.id}/pref`, { method: 'POST', body: { [field]: value } });
    course[field] = value;
    render();
  });

  render();
})();
