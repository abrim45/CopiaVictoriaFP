const { db } = require('../db/database');
const format = require('../lib/format');

// Carga el usuario de la sesión y los datos comunes de la barra de navegación
function loadUser(req, res, next) {
  res.locals.user = null;
  res.locals.guest = Boolean(req.session.guest);
  res.locals.notifications = [];
  res.locals.unreadCount = 0;

  if (req.session.userId) {
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND password_hash IS NOT NULL').get(req.session.userId);
    if (!user) {
      delete req.session.userId;
    } else {
      db.prepare('UPDATE users SET lastaccess = ? WHERE id = ?').run(format.now(), user.id);
      res.locals.user = { ...user, initials: format.initials(user), fullname: format.fullname(user) };
      res.locals.unreadCount = db.prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read = 0').get(user.id).n;
      res.locals.notifications = db
        .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created DESC LIMIT 20')
        .all(user.id);
    }
  }
  next();
}

function requireLogin(req, res, next) {
  if (res.locals.user) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Sesión caducada' });
  if (req.method === 'GET') req.session.wantsurl = req.originalUrl;
  res.redirect('/login/index.php');
}

// Página de error al estilo de Moodle
function renderError(res, message, status = 403, continueUrl = '/my/') {
  res.status(status).render('error', { title: 'Error', message, continueUrl });
}

module.exports = { loadUser, requireLogin, renderError };
