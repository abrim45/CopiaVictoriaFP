// Página de curso: plegar/desplegar secciones (recordado por curso) y "Colapsar todo / Expandir todo".
(function () {
  'use strict';

  const { storage } = window.Campus;
  const content = document.querySelector('.course-content');
  if (!content) return;

  const key = `course-collapsed-${content.dataset.course}`;
  let collapsed = new Set(storage.get(key, []));
  const sections = [...content.querySelectorAll('.course-section')];
  const collapseAll = content.querySelector('.collapse-all');

  function setSection(section, isCollapsed) {
    const chevron = section.querySelector('.section-chevron');
    chevron.setAttribute('aria-expanded', String(!isCollapsed));
    chevron.title = isCollapsed ? 'Expandir' : 'Colapsar';
    section.querySelector('.section-body').classList.toggle('collapsed', isCollapsed);
    if (isCollapsed) collapsed.add(section.dataset.section);
    else collapsed.delete(section.dataset.section);
  }

  function save() {
    storage.set(key, [...collapsed]);
    if (collapseAll) collapseAll.textContent = collapsed.size === sections.length ? 'Expandir todo' : 'Colapsar todo';
  }

  sections.forEach((s) => setSection(s, collapsed.has(s.dataset.section)));

  // Si se llega con #section-N, esa sección se abre
  const target = location.hash && document.querySelector(location.hash);
  if (target && target.classList.contains('course-section')) {
    setSection(target, false);
    target.scrollIntoView();
  }
  save();

  content.addEventListener('click', (e) => {
    const chevron = e.target.closest('.section-chevron');
    if (chevron) {
      const section = chevron.closest('.course-section');
      setSection(section, chevron.getAttribute('aria-expanded') === 'true');
      save();
      return;
    }
    if (e.target === collapseAll) {
      e.preventDefault();
      const collapse = collapsed.size !== sections.length;
      sections.forEach((s) => setSection(s, collapse));
      save();
    }
  });
})();
