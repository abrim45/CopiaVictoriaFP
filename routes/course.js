const express = require('express');
const { db } = require('../db/database');
const format = require('../lib/format');
const data = require('../lib/data');
const { renderError } = require('../middleware/auth');

const router = express.Router();

const NOT_ENROLLED = 'No puede acceder a este curso porque no está matriculado en él.';

// Carga el curso de ?id= (o ?courseid=) comprobando la matrícula
function loadCourse(req, res, next) {
  const course = data.getEnrolledCourse(res.locals.user.id, req.query.id || req.query.courseid);
  if (!course) return renderError(res, NOT_ENROLLED);
  data.touchCourse(res.locals.user.id, course.id);
  res.locals.course = course;
  res.locals.courseIndex = data.buildCourseIndex(res.locals.user.id, course);
  next();
}

router.get('/course/view.php', loadCourse, (req, res) => {
  const { course } = res.locals;
  res.render('course', {
    title: `Curso: ${course.fullname}`,
    tab: 'course',
    sections: data.getSections(course.id),
  });
});

router.get('/user/index.php', loadCourse, (req, res) => {
  const { course } = res.locals;
  const participants = db
    .prepare(
      `SELECT u.*, e.role, e.lastaccess AS courseaccess FROM users u JOIN enrolments e ON e.user_id = u.id
        WHERE e.course_id = ? ORDER BY e.role DESC, u.firstname`
    )
    .all(course.id)
    .map((u) => ({ ...u, initials: format.initials(u), fullname: format.fullname(u) }));
  res.render('participants', { title: `${course.shortname}: Participantes`, tab: 'participants', participants });
});

router.get('/grade/report/user/index.php', loadCourse, (req, res) => {
  const { course, user } = res.locals;
  const items = db
    .prepare(
      `SELECT a.id, a.name, a.due_date, s.status, s.grade, s.feedback
         FROM activities a LEFT JOIN submissions s ON s.activity_id = a.id AND s.user_id = ?
        WHERE a.course_id = ? AND a.type = 'assign' ORDER BY a.section_id, a.position`
    )
    .all(user.id, course.id);
  const graded = items.filter((i) => i.grade !== null);
  const total = graded.length ? graded.reduce((sum, i) => sum + i.grade, 0) / graded.length : null;
  res.render('course-grades', { title: `${course.shortname}: Informe del usuario`, tab: 'grades', items, total });
});

router.get('/admin/tool/lp/coursecompetencies.php', loadCourse, (req, res) => {
  res.render('competencies', { title: `${res.locals.course.shortname}: Competencias del curso`, tab: 'competencies' });
});

module.exports = router;
