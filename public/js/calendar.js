// Calendario mensual (bloque del Área personal y página /calendar), detalle de eventos y modal "Nuevo evento".
(function () {
  'use strict';

  const { api, escapeHtml, openModal, closeModal } = window.Campus;
  const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MAX_EVENTS_PER_DAY = 4;
  const fullDate = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

  const widgets = [];

  function stripTags(html) {
    const div = document.createElement('div');
    div.innerHTML = html || '';
    return div.textContent.trim();
  }

  /* ---------- Rejilla mensual ---------- */

  function initWidget(root) {
    const today = new Date();
    const state = { year: today.getFullYear(), month: today.getMonth() + 1, course: Number(root.dataset.course) || 0, events: [] };
    const tbody = root.querySelector('tbody');
    const title = root.querySelector('.cal-current');
    const prev = root.querySelector('.cal-prev');
    const next = root.querySelector('.cal-next');

    function shift(delta) {
      const d = new Date(state.year, state.month - 1 + delta, 1);
      state.year = d.getFullYear();
      state.month = d.getMonth() + 1;
      load();
    }

    async function load() {
      const data = await api(`/api/calendar?year=${state.year}&month=${state.month}&course=${state.course}`);
      state.events = data.events;
      render();
    }

    function render() {
      title.textContent = `${MONTHS[state.month - 1]} ${state.year}`;
      prev.querySelector('span').textContent = MONTHS[(state.month + 10) % 12];
      next.querySelector('span').textContent = MONTHS[state.month % 12];

      const byDay = new Map();
      state.events.forEach((ev, index) => {
        const day = new Date(ev.timestart * 1000).getDate();
        if (!byDay.has(day)) byDay.set(day, []);
        byDay.get(day).push({ ev, index });
      });

      const first = new Date(state.year, state.month - 1, 1);
      const offset = (first.getDay() + 6) % 7;
      const daysInMonth = new Date(state.year, state.month, 0).getDate();
      const now = new Date();
      const isCurrentMonth = now.getFullYear() === state.year && now.getMonth() + 1 === state.month;

      let html = '<tr>';
      for (let i = 0; i < offset; i++) html += '<td class="empty"></td>';
      for (let day = 1; day <= daysInMonth; day++) {
        const col = (offset + day - 1) % 7;
        if (col === 0 && day !== 1) html += '</tr><tr>';
        const events = byDay.get(day) || [];
        const classes = [isCurrentMonth && now.getDate() === day ? 'today' : ''].join(' ');
        html += `<td class="${classes}" data-day="${day}">`;
        html += `<span class="day-number${events.length ? ' has-events' : ''}">${day}</span>`;
        if (events.length) {
          html += '<ul class="cal-events">';
          events.slice(0, MAX_EVENTS_PER_DAY).forEach(({ ev, index }) => {
            html += `<li><button type="button" class="cal-event" data-index="${index}" title="${escapeHtml(ev.name)}">` +
              `<span class="cal-dot type-${ev.type}"></span><span class="cal-event-name">${escapeHtml(ev.name)}</span></button></li>`;
          });
          html += '</ul>';
          if (events.length > MAX_EVENTS_PER_DAY) html += `<span class="cal-more">${events.length - MAX_EVENTS_PER_DAY} más</span>`;
        }
        html += '</td>';
      }
      const trailing = (7 - ((offset + daysInMonth) % 7)) % 7;
      for (let i = 0; i < trailing; i++) html += '<td class="empty"></td>';
      tbody.innerHTML = `${html}</tr>`;
    }

    prev.addEventListener('click', (e) => { e.preventDefault(); shift(-1); });
    next.addEventListener('click', (e) => { e.preventDefault(); shift(1); });
    root.querySelector('.calendar-course').addEventListener('change', (e) => {
      state.course = Number(e.target.value);
      load();
    });
    root.querySelector('.btn-new-event').addEventListener('click', () => openNewEvent(new Date()));

    tbody.addEventListener('click', (e) => {
      const eventBtn = e.target.closest('.cal-event');
      if (eventBtn) {
        showEvent(state.events[Number(eventBtn.dataset.index)]);
        return;
      }
      const cell = e.target.closest('td[data-day]');
      if (cell) {
        const now = new Date();
        openNewEvent(new Date(state.year, state.month - 1, Number(cell.dataset.day), now.getHours(), now.getMinutes()));
      }
    });

    widgets.push({ load });
    load();
  }

  document.querySelectorAll('.calendar-widget').forEach(initWidget);
  const reloadAll = () => widgets.forEach((w) => w.load());

  /* ---------- Detalle de un evento ---------- */

  const eventModal = document.getElementById('modal-event');
  const TYPE_NAMES = { due: 'Evento de actividad', course: 'Evento de curso', user: 'Evento de usuario' };

  function showEvent(ev) {
    eventModal.querySelector('#modal-event-title').textContent = ev.name;
    const end = ev.duration ? ` » ${new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date((ev.timestart + ev.duration) * 1000))}` : '';
    let html = '<dl>';
    html += `<dt title="Cuándo"><i class="fa fa-clock"></i></dt><dd>${escapeHtml(fullDate.format(new Date(ev.timestart * 1000)))}${end}</dd>`;
    html += `<dt title="Tipo de evento"><i class="fa fa-calendar"></i></dt><dd>${TYPE_NAMES[ev.type]}</dd>`;
    if (ev.courseName) html += `<dt title="Curso"><i class="fa fa-graduation-cap"></i></dt><dd><a href="/course/view.php?id=${ev.courseId}">${escapeHtml(ev.courseName)}</a></dd>`;
    if (ev.location) html += `<dt title="Ubicación"><i class="fa fa-location-dot"></i></dt><dd>${escapeHtml(ev.location)}</dd>`;
    const description = stripTags(ev.description);
    if (description) html += `<dt title="Descripción"><i class="fa fa-align-left"></i></dt><dd>${escapeHtml(description)}</dd>`;
    html += '</dl>';
    eventModal.querySelector('.event-details').innerHTML = html;

    const go = eventModal.querySelector('#event-go');
    go.hidden = ev.type !== 'due';
    go.href = ev.url || '#';
    const del = eventModal.querySelector('#event-delete');
    del.hidden = !ev.canDelete;
    del.onclick = async () => {
      if (!window.confirm(`¿Está seguro de que desea borrar el evento "${ev.name}"?`)) return;
      await api(`/api/events/${ev.id}`, { method: 'DELETE' });
      closeModal(eventModal);
      reloadAll();
    };
    openModal(eventModal);
  }

  /* ---------- Nuevo evento ---------- */

  const newModal = document.getElementById('modal-new-event');
  const form = document.getElementById('new-event-form');
  const fields = form.elements;
  const pad = (n) => String(n).padStart(2, '0');

  function fillSelect(select, values, labelFn = (v) => v) {
    select.innerHTML = values.map((v) => `<option value="${v}">${labelFn(v)}</option>`).join('');
  }

  const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const thisYear = new Date().getFullYear();
  fillSelect(fields.day, range(1, 31));
  fillSelect(fields.month, range(1, 12), (m) => MONTHS[m - 1]);
  fillSelect(fields.year, range(thisYear - 2, thisYear + 5));
  fillSelect(fields.hour, range(0, 23), pad);
  fillSelect(fields.minute, range(0, 59), pad);

  function setDate(date) {
    fields.day.value = date.getDate();
    fields.month.value = date.getMonth() + 1;
    fields.year.value = date.getFullYear();
    fields.hour.value = date.getHours();
    fields.minute.value = date.getMinutes();
  }

  function setError(input, feedback, message) {
    if (input) input.classList.toggle('is-invalid', Boolean(message));
    feedback.textContent = message || '';
    feedback.classList.toggle('show', Boolean(message));
  }

  function openNewEvent(date) {
    form.reset();
    setDate(date);
    setError(fields.name, document.getElementById('ev-name-error'), '');
    setError(null, document.getElementById('ev-date-error'), '');
    form.querySelector('.more-fields').hidden = true;
    form.querySelector('.show-more').textContent = 'Mostrar más...';
    openModal(newModal);
    fields.name.focus();
  }

  form.querySelector('.show-more').addEventListener('click', (e) => {
    e.preventDefault();
    const more = form.querySelector('.more-fields');
    more.hidden = !more.hidden;
    e.target.textContent = more.hidden ? 'Mostrar más...' : 'Mostrar menos...';
  });

  const hiddenDate = form.querySelector('.hidden-date');
  form.querySelector('.calendar-picker').addEventListener('click', () => {
    hiddenDate.value = `${fields.year.value}-${pad(fields.month.value)}-${pad(fields.day.value)}`;
    if (typeof hiddenDate.showPicker === 'function') hiddenDate.showPicker();
    else hiddenDate.focus();
  });
  hiddenDate.addEventListener('change', () => {
    if (!hiddenDate.value) return;
    const [y, m, d] = hiddenDate.value.split('-').map(Number);
    fields.year.value = y;
    fields.month.value = m;
    fields.day.value = d;
  });

  fields.name.addEventListener('input', () => {
    if (fields.name.value.trim()) setError(fields.name, document.getElementById('ev-name-error'), '');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = fields.name.value.trim();
    if (!name) {
      setError(fields.name, document.getElementById('ev-name-error'), 'Requerido');
      fields.name.focus();
      return;
    }
    const body = Object.fromEntries(new FormData(form));
    try {
      await api('/api/events', { method: 'POST', body });
      closeModal(newModal);
      reloadAll();
    } catch (err) {
      if (err.data && err.data.field === 'date') setError(null, document.getElementById('ev-date-error'), err.data.error);
      else setError(fields.name, document.getElementById('ev-name-error'), err.message);
    }
  });
})();
