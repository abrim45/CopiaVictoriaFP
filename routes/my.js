const express = require('express');
const { db } = require('../db/database');
const format = require('../lib/format');
const data = require('../lib/data');

const router = express.Router();

function onlineUsers() {
  return db
    .prepare('SELECT id, firstname, lastname FROM users WHERE password_hash IS NOT NULL AND lastaccess > ? ORDER BY lastaccess DESC')
    .all(format.now() - 300)
    .map((u) => ({ ...u, initials: format.initials(u), fullname: format.fullname(u) }));
}

router.get('/my/', (req, res) => {
  const userId = res.locals.user.id;
  const timeline = data.getPendingAssignments(userId).map((a) => ({
    id: a.id,
    name: a.name,
    due: a.due_date,
    courseId: a.course_id,
    courseName: a.course_name,
    url: `/mod/assign/view.php?id=${a.id}`,
    actionUrl: `/mod/assign/view.php?id=${a.id}&action=editsubmission`,
  }));
  res.render('dashboard', {
    title: 'Área personal',
    nav: 'my',
    editToggle: true,
    blockDrawer: true,
    timeline,
    courses: data.getUserCourses(userId),
    onlineUsers: onlineUsers(),
  });
});

router.get('/my', (req, res) => res.redirect('/my/'));

router.post('/my/editmode', (req, res) => {
  req.session.editMode = Boolean(req.body.on);
  res.json({ editMode: req.session.editMode });
});

router.get('/my/courses.php', (req, res) => {
  const courses = data.getUserCourses(res.locals.user.id).map((c) => ({
    id: c.id,
    fullname: c.fullname,
    shortname: c.shortname,
    category: c.category,
    summary: c.summary,
    imageUrl: c.imageUrl,
    progress: c.progress,
    starred: Boolean(c.starred),
    hidden: Boolean(c.hidden),
    lastaccess: c.userlastaccess,
    startdate: c.startdate,
    enddate: c.enddate,
  }));
  res.render('courses', { title: 'Mis cursos', nav: 'courses', courses });
});

router.post('/api/courses/:id/pref', (req, res) => {
  const userId = res.locals.user.id;
  const course = data.getEnrolledCourse(userId, req.params.id);
  if (!course) return res.status(403).json({ error: 'No está matriculado en este curso' });
  for (const field of ['starred', 'hidden']) {
    if (field in req.body) {
      db.prepare(`UPDATE enrolments SET ${field} = ? WHERE user_id = ? AND course_id = ?`).run(req.body[field] ? 1 : 0, userId, course.id);
    }
  }
  res.json({ ok: true });
});

module.exports = router;
