// Iconos de actividad (SVG en línea) y colores por "propósito", como en Moodle 4.

const ICONS = {
  assign:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M13.5 2.75H7.25a2 2 0 0 0-2 2v14.5a2 2 0 0 0 2 2h9.5a2 2 0 0 0 2-2V8z"/><path d="M13.5 2.75V8h5.25"/>' +
    '<path d="M12 18v-7.25"/><path d="M9.25 13.25 12 10.5l2.75 2.75"/></svg>',
  resource:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M14.5 2.75H9a2 2 0 0 0-2 2v14.5a2 2 0 0 0 2 2h8.75a2 2 0 0 0 2-2V8z"/><path d="M14.5 2.75V8h5.25"/>' +
    '<rect x="1.75" y="11.25" width="12.5" height="7" rx="1.25" fill="#fff" stroke="currentColor"/>' +
    '<text x="8" y="16.85" text-anchor="middle" font-family="Arial, sans-serif" font-size="5.6" font-weight="700" fill="currentColor" stroke="none">PDF</text></svg>',
  forum:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M3.5 5.75a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v5.5a2 2 0 0 1-2 2H9l-3.5 3v-3a2 2 0 0 1-2-2z"/>' +
    '<path d="M16.5 8.25h2a2 2 0 0 1 2 2v5.5a2 2 0 0 1-2 2v3l-3.5-3h-4.5a2 2 0 0 1-2-2"/></svg>',
  url:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="8.75"/><path d="M3.25 12h17.5"/><path d="M12 3.25c2.4 2.4 3.6 5.3 3.6 8.75S14.4 18.35 12 20.75C9.6 18.35 8.4 15.45 8.4 12S9.6 5.65 12 3.25z"/></svg>',
};

// Colores de propósito de Moodle 4.x
const PURPOSE = {
  assign: '#f90086',
  resource: '#0099ad',
  forum: '#11a676',
  url: '#0099ad',
};

const TYPE_NAMES = {
  assign: 'Tarea',
  resource: 'Archivo',
  forum: 'Foro',
  url: 'URL',
  label: 'Área de texto y medios',
};

function modIcon(type, extraClass = '') {
  const svg = ICONS[type];
  if (!svg) return '';
  return `<span class="activityicon ${extraClass}" style="color:${PURPOSE[type]}">${svg}</span>`;
}

function modUrl(activity) {
  if (activity.type === 'label') return null;
  return `/mod/${activity.type}/view.php?id=${activity.id}`;
}

module.exports = { ICONS, PURPOSE, TYPE_NAMES, modIcon, modUrl };
