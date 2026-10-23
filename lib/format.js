// Formato de fechas, duraciones y números al estilo de Moodle en español.

const dayLong = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const timeShort = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
const dateShort = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

const now = () => Math.floor(Date.now() / 1000);

// "domingo, 25 de octubre de 2026"
function dayDate(ts) {
  return dayLong.format(new Date(ts * 1000));
}

// "23:59"
function time(ts) {
  return timeShort.format(new Date(ts * 1000));
}

// "miércoles, 23 de septiembre de 2026, 18:00"
function userdate(ts) {
  if (!ts) return '-';
  return `${dayDate(ts)}, ${time(ts)}`;
}

// "23/09/2026"
function shortDate(ts) {
  return dateShort.format(new Date(ts * 1000));
}

const UNITS = [
  [31536000, 'año', 'años'],
  [86400, 'día', 'días'],
  [3600, 'hora', 'horas'],
  [60, 'minuto', 'minutos'],
  [1, 'segundo', 'segundos'],
];

// Igual que format_time() de Moodle: las dos unidades más significativas. "22 días 20 horas"
function duration(seconds) {
  seconds = Math.abs(Math.round(seconds));
  if (seconds === 0) return 'ahora';
  const parts = [];
  for (const [size, one, many] of UNITS) {
    const n = Math.floor(seconds / size);
    if (n > 0) {
      parts.push(`${n} ${n === 1 ? one : many}`);
      seconds -= n * size;
    }
    if (parts.length === 2) break;
  }
  return parts.join(' ');
}

// "hace 1 día 1 hora"
function timeAgo(ts) {
  return `hace ${duration(now() - ts)}`;
}

// 8.5 -> "8,50"
function grade(value) {
  if (value === null || value === undefined) return '-';
  return Number(value).toFixed(2).replace('.', ',');
}

function fileSize(bytes) {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace('.', ',')} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

function initials(user) {
  return `${user.firstname[0] || ''}${user.lastname[0] || ''}`.toUpperCase();
}

function fullname(user) {
  return `${user.firstname} ${user.lastname}`;
}

function stripTags(html) {
  return String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

module.exports = { now, dayDate, time, userdate, shortDate, duration, timeAgo, grade, fileSize, initials, fullname, stripTags };
