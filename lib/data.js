// Consultas compartidas. Todo lo que ve un usuario se filtra por sus matrículas.
const { db } = require('../db/database');
const { now } = require('./format');
const { courseImage } = require('./patterns');

function getUserCourses(userId) {
  return db
    .prepare(
      `SELECT c.*, e.starred, e.hidden, e.lastaccess AS userlastaccess
         FROM courses c JOIN enrolments e ON e.course_id = c.id
        WHERE e.user_id = ? AND e.role = 'student'
        ORDER BY c.fullname`
    )
    .all(userId)
    .map((c) => ({ ...c, imageUrl: courseImage(c), progress: courseProgress(userId, c) }));
}

// Devuelve el curso si el usuario está matriculado como estudiante, si no null
function getEnrolledCourse(userId, courseId) {
  const course = db
    .prepare(
      `SELECT c.* FROM courses c JOIN enrolments e ON e.course_id = c.id
        WHERE e.user_id = ? AND c.id = ? AND e.role = 'student'`
    )
    .get(userId, Number(courseId));
  return course ? { ...course } : null;
}

function touchCourse(userId, courseId) {
  db.prepare('UPDATE enrolments SET lastaccess = ? WHERE user_id = ? AND course_id = ?').run(now(), userId, courseId);
}

function courseProgress(userId, course) {
  if (!course.enablecompletion) return null;
  const total = db.prepare("SELECT COUNT(*) AS n FROM activities WHERE course_id = ? AND type != 'label'").get(course.id).n;
  if (!total) return 0;
  const done = db
    .prepare('SELECT COUNT(*) AS n FROM completions cc JOIN activities a ON a.id = cc.activity_id WHERE cc.user_id = ? AND a.course_id = ?')
    .get(userId, course.id).n;
  return Math.round((done * 100) / total);
}

function getSections(courseId) {
  const sections = db.prepare('SELECT * FROM sections WHERE course_id = ? ORDER BY position').all(courseId).map((s) => ({ ...s, activities: [] }));
  const byId = new Map(sections.map((s) => [s.id, s]));
  for (const a of db.prepare('SELECT * FROM activities WHERE course_id = ? ORDER BY position').all(courseId)) {
    byId.get(a.section_id).activities.push({ ...a });
  }
  return sections;
}

// Actividad + curso + sección, solo si el usuario está matriculado
function getActivity(userId, activityId, type) {
  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(Number(activityId));
  if (!activity || (type && activity.type !== type)) return null;
  const course = getEnrolledCourse(userId, activity.course_id);
  if (!course) return null;
  const section = db.prepare('SELECT * FROM sections WHERE id = ?').get(activity.section_id);
  return { activity: { ...activity }, course, section: { ...section } };
}

function markComplete(userId, activityId) {
  db.prepare('INSERT OR IGNORE INTO completions (user_id, activity_id, timecompleted) VALUES (?, ?, ?)').run(userId, activityId, now());
}

function getTeachers(courseId) {
  return db
    .prepare("SELECT u.* FROM users u JOIN enrolments e ON e.user_id = u.id WHERE e.course_id = ? AND e.role = 'editingteacher'")
    .all(courseId);
}

function getSubmission(userId, activityId) {
  const sub = db.prepare('SELECT * FROM submissions WHERE user_id = ? AND activity_id = ?').get(userId, activityId);
  if (!sub) return null;
  return { ...sub, files: db.prepare('SELECT * FROM submission_files WHERE submission_id = ? ORDER BY id').all(sub.id) };
}

// Tareas de los cursos del usuario que todavía no ha entregado (línea de tiempo)
function getPendingAssignments(userId) {
  return db
    .prepare(
      `SELECT a.id, a.name, a.due_date, a.open_date, c.id AS course_id, c.fullname AS course_name
         FROM activities a
         JOIN courses c ON c.id = a.course_id
         JOIN enrolments e ON e.course_id = c.id AND e.user_id = ? AND e.role = 'student'
         LEFT JOIN submissions s ON s.activity_id = a.id AND s.user_id = e.user_id AND s.status = 'submitted'
        WHERE a.type = 'assign' AND a.due_date IS NOT NULL AND s.id IS NULL AND e.hidden = 0
        ORDER BY a.due_date`
    )
    .all(userId);
}

// Eventos del calendario entre dos marcas de tiempo: vencimientos de tareas, eventos de curso y de usuario
function getCalendarEvents(userId, from, to, courseId) {
  const courseFilter = courseId ? 'AND c.id = ?' : '';
  const params = courseId ? [Number(courseId)] : [];

  const due = db
    .prepare(
      `SELECT a.id AS activity_id, a.name, a.intro AS description, a.due_date AS timestart, c.id AS course_id, c.fullname AS course_name
         FROM activities a
         JOIN courses c ON c.id = a.course_id
         JOIN enrolments e ON e.course_id = c.id AND e.user_id = ? AND e.role = 'student'
        WHERE a.type = 'assign' AND a.due_date BETWEEN ? AND ? ${courseFilter}`
    )
    .all(userId, from, to, ...params)
    .map((r) => ({
      id: `due-${r.activity_id}`,
      name: `Vencimiento de ${r.name}`,
      description: r.description,
      timestart: r.timestart,
      duration: 0,
      type: 'due',
      courseId: r.course_id,
      courseName: r.course_name,
      url: `/mod/assign/view.php?id=${r.activity_id}`,
      canDelete: false,
    }));

  const course = db
    .prepare(
      `SELECT ev.*, c.fullname AS course_name FROM events ev
         JOIN courses c ON c.id = ev.course_id
         JOIN enrolments e ON e.course_id = c.id AND e.user_id = ? AND e.role = 'student'
        WHERE ev.type = 'course' AND ev.timestart BETWEEN ? AND ? ${courseFilter}`
    )
    .all(userId, from, to, ...params)
    .map((ev) => ({
      id: ev.id,
      name: ev.name,
      description: ev.description,
      location: ev.location,
      timestart: ev.timestart,
      duration: ev.duration,
      type: 'course',
      courseId: ev.course_id,
      courseName: ev.course_name,
      url: `/course/view.php?id=${ev.course_id}`,
      canDelete: false,
    }));

  const user = courseId
    ? []
    : db
        .prepare("SELECT * FROM events WHERE type = 'user' AND user_id = ? AND timestart BETWEEN ? AND ?")
        .all(userId, from, to)
        .map((ev) => ({
          id: ev.id,
          name: ev.name,
          description: ev.description,
          location: ev.location,
          timestart: ev.timestart,
          duration: ev.duration,
          type: 'user',
          courseId: null,
          courseName: null,
          url: null,
          canDelete: true,
        }));

  return [...due, ...course, ...user].sort((a, b) => a.timestart - b.timestart);
}

// Datos del cajón lateral "Índice del curso"
function buildCourseIndex(userId, course, activeActivityId = null) {
  const done = new Set(
    db.prepare('SELECT cc.activity_id FROM completions cc JOIN activities a ON a.id = cc.activity_id WHERE cc.user_id = ? AND a.course_id = ?')
      .all(userId, course.id)
      .map((r) => r.activity_id)
  );
  return {
    course,
    activeActivityId,
    sections: getSections(course.id).map((s) => ({
      id: s.id,
      position: s.position,
      name: s.name,
      activities: s.activities
        .filter((a) => a.type !== 'label')
        .map((a) => ({ id: a.id, name: a.name, type: a.type, complete: done.has(a.id) })),
    })),
  };
}

function addNotification(userId, fromId, subject, body, url) {
  db.prepare('INSERT INTO notifications (user_id, from_id, subject, body, url, read, created) VALUES (?, ?, ?, ?, ?, 0, ?)').run(
    userId, fromId, subject, body, url, now()
  );
}

module.exports = {
  getUserCourses,
  getEnrolledCourse,
  touchCourse,
  courseProgress,
  getSections,
  getActivity,
  markComplete,
  getTeachers,
  getSubmission,
  getPendingAssignments,
  getCalendarEvents,
  buildCourseIndex,
  addNotification,
};
