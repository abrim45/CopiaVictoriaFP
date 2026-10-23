const express = require('express');
const { db } = require('../db/database');
const data = require('../lib/data');

const router = express.Router();

router.get('/calendar/view.php', (req, res) => {
  res.render('calendar', {
    title: 'Calendario',
    courses: data.getUserCourses(res.locals.user.id),
    selectedCourse: Number(req.query.course) || 0,
  });
});

router.get('/api/calendar', (req, res) => {
  const today = new Date();
  const year = Number(req.query.year) || today.getFullYear();
  const month = Number(req.query.month) || today.getMonth() + 1;
  const from = Math.floor(new Date(year, month - 1, 1).getTime() / 1000);
  const to = Math.floor(new Date(year, month, 1).getTime() / 1000) - 1;
  const courseId = Number(req.query.course) || null;
  if (courseId && !data.getEnrolledCourse(res.locals.user.id, courseId)) {
    return res.status(403).json({ error: 'No está matriculado en este curso' });
  }
  res.json({ year, month, events: data.getCalendarEvents(res.locals.user.id, from, to, courseId) });
});

router.post('/api/events', (req, res) => {
  const { name, year, month, day, hour, minute, description, location, duration } = req.body;
  const title = String(name || '').trim();
  if (!title) return res.status(400).json({ error: 'Requerido', field: 'name' });

  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  if (Number.isNaN(date.getTime()) || date.getDate() !== Number(day)) {
    return res.status(400).json({ error: 'La fecha no es válida', field: 'date' });
  }
  const minutes = Math.max(0, Math.min(Number(duration) || 0, 60 * 24 * 7));
  const result = db
    .prepare("INSERT INTO events (user_id, course_id, name, description, location, timestart, duration, type) VALUES (?, NULL, ?, ?, ?, ?, ?, 'user')")
    .run(res.locals.user.id, title.slice(0, 255), String(description || ''), String(location || ''), Math.floor(date.getTime() / 1000), minutes * 60);
  res.json({ id: result.lastInsertRowid });
});

router.delete('/api/events/:id', (req, res) => {
  const result = db.prepare("DELETE FROM events WHERE id = ? AND user_id = ? AND type = 'user'").run(Number(req.params.id), res.locals.user.id);
  if (!result.changes) return res.status(404).json({ error: 'No se ha encontrado el evento' });
  res.json({ ok: true });
});

module.exports = router;
