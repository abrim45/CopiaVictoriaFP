const express = require('express');
const { db } = require('../db/database');
const format = require('../lib/format');

const router = express.Router();

router.get('/message/output/popup/notifications.php', (req, res) => {
  const userId = res.locals.user.id;
  const list = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created DESC').all(userId);
  const selectedId = Number(req.query.notificationid) || (list[0] && list[0].id);
  let selected = list.find((n) => n.id === selectedId) || null;
  if (selected) {
    db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(selected.id, userId);
    const from = selected.from_id ? db.prepare('SELECT firstname, lastname FROM users WHERE id = ?').get(selected.from_id) : null;
    selected = { ...selected, read: 1, fromName: from ? format.fullname(from) : 'Campus Virtual' };
    res.locals.unreadCount = Math.max(0, res.locals.unreadCount - (list.find((n) => n.id === selectedId).read ? 0 : 1));
    res.locals.notifications = res.locals.notifications.map((n) => (n.id === selected.id ? { ...n, read: 1 } : n));
  }
  res.render('notifications', { title: 'Notificaciones', list, selected });
});

router.post('/api/notifications/read-all', (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(res.locals.user.id);
  res.json({ ok: true });
});

module.exports = router;
