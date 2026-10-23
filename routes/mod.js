const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const multer = require('multer');
const { db, transaction } = require('../db/database');
const format = require('../lib/format');
const data = require('../lib/data');
const { makePdf } = require('../lib/pdf');
const { renderError } = require('../middleware/auth');

const router = express.Router();
const UPLOADS = path.join(__dirname, '..', 'uploads');
const NOT_AVAILABLE = 'Esta actividad no está disponible: no está matriculado en el curso.';

// Carga actividad + curso comprobando la matrícula y prepara el cajón "Índice del curso"
function loadActivity(type, param = 'id') {
  return (req, res, next) => {
    const found = data.getActivity(res.locals.user.id, req.query[param] || req.params[param], type);
    if (!found) return renderError(res, NOT_AVAILABLE);
    Object.assign(res.locals, found);
    res.locals.courseIndex = data.buildCourseIndex(res.locals.user.id, found.course, found.activity.id);
    data.touchCourse(res.locals.user.id, found.course.id);
    next();
  };
}

function breadcrumb(course, section, activity, extra) {
  const items = [
    { name: course.shortname, url: `/course/view.php?id=${course.id}` },
    { name: section.name, url: `/course/view.php?id=${course.id}#section-${section.position}` },
    { name: activity.name, url: extra ? `/mod/${activity.type}/view.php?id=${activity.id}` : null },
  ];
  if (extra) items.push({ name: extra, url: null });
  return items;
}

/* ---------- Tarea ---------- */

function assignViewData(userId, activity) {
  const submission = data.getSubmission(userId, activity.id);
  const comments = db
    .prepare(
      `SELECT sc.*, u.firstname, u.lastname FROM submission_comments sc JOIN users u ON u.id = sc.author_id
        WHERE sc.activity_id = ? AND sc.user_id = ? ORDER BY sc.created`
    )
    .all(activity.id, userId);
  const grader = submission && submission.grader_id ? db.prepare('SELECT * FROM users WHERE id = ?').get(submission.grader_id) : null;
  return { submission, comments, grader };
}

router.get('/mod/assign/view.php', loadActivity('assign'), (req, res) => {
  const { activity, course, section, user } = res.locals;
  const view = assignViewData(user.id, activity);
  if (req.query.action === 'editsubmission') {
    return res.render('assign-edit', {
      title: `${course.shortname}: ${activity.name}: Editar entrega`,
      breadcrumb: breadcrumb(course, section, activity, 'Editar entrega'),
      error: req.query.error || null,
      ...view,
    });
  }
  res.render('assign', {
    title: `${course.shortname}: ${activity.name}`,
    breadcrumb: breadcrumb(course, section, activity),
    ...view,
  });
});

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, req.uploadDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 200 * 1024 * 1024, files: 20 },
  defParamCharset: 'utf8',
});

function prepareUploadDir(req, res, next) {
  const { user, activity } = res.locals;
  req.uploadDir = path.join(UPLOADS, 'submissions', String(user.id), String(activity.id));
  fs.mkdirSync(req.uploadDir, { recursive: true });
  next();
}

function removeFile(relPath) {
  fs.rm(path.join(UPLOADS, relPath), { force: true }, () => {});
}

router.post(
  '/mod/assign/view.php',
  loadActivity('assign'),
  (req, res, next) => (req.query.action === 'savesubmission' ? next() : next('route')),
  prepareUploadDir,
  upload.array('files', 20),
  (req, res) => {
    const { activity, user } = res.locals;
    const editUrl = `/mod/assign/view.php?id=${activity.id}&action=editsubmission`;
    const removeIds = String(req.body.remove || '').split(',').map(Number).filter(Boolean);
    const existing = data.getSubmission(user.id, activity.id);
    const keptFiles = existing ? existing.files.filter((f) => !removeIds.includes(f.id)) : [];
    const newFiles = req.files || [];

    if (keptFiles.length + newFiles.length === 0) {
      newFiles.forEach((f) => fs.rmSync(f.path, { force: true }));
      return res.redirect(`${editUrl}&error=${encodeURIComponent('Debe añadir al menos un archivo para poder guardar la entrega.')}`);
    }
    if (keptFiles.length + newFiles.length > 20) {
      newFiles.forEach((f) => fs.rmSync(f.path, { force: true }));
      return res.redirect(`${editUrl}&error=${encodeURIComponent('Ha superado el número máximo de archivos (20).')}`);
    }

    const ts = format.now();
    transaction(() => {
      let submissionId;
      if (existing) {
        submissionId = existing.id;
        db.prepare("UPDATE submissions SET status = 'submitted', modified = ? WHERE id = ?").run(ts, submissionId);
        for (const f of existing.files.filter((f) => removeIds.includes(f.id))) {
          db.prepare('DELETE FROM submission_files WHERE id = ?').run(f.id);
          removeFile(f.path);
        }
      } else {
        submissionId = db.prepare("INSERT INTO submissions (activity_id, user_id, status, modified) VALUES (?, ?, 'submitted', ?)").run(activity.id, user.id, ts).lastInsertRowid;
      }
      for (const f of newFiles) {
        db.prepare('INSERT INTO submission_files (submission_id, path, filename, size, created) VALUES (?, ?, ?, ?, ?)').run(
          submissionId, path.relative(UPLOADS, f.path), f.originalname, f.size, ts
        );
      }
      data.markComplete(user.id, activity.id);
      data.addNotification(user.id, user.id, `Usted ha realizado su entrega en la tarea ${activity.name}`,
        `Ha enviado una entrega para la tarea "${activity.name}".`, `/mod/assign/view.php?id=${activity.id}`);
    });
    res.redirect(`/mod/assign/view.php?id=${activity.id}`);
  }
);

router.post('/mod/assign/view.php', (req, res, next) => (req.query.action === 'removesubmission' ? next() : next('route')), loadActivity('assign'), (req, res) => {
  const { activity, user } = res.locals;
  const existing = data.getSubmission(user.id, activity.id);
  if (existing) {
    if (existing.grade !== null) return renderError(res, 'No puede borrar una entrega que ya ha sido calificada.', 403, `/mod/assign/view.php?id=${activity.id}`);
    transaction(() => {
      existing.files.forEach((f) => removeFile(f.path));
      db.prepare('DELETE FROM submissions WHERE id = ?').run(existing.id);
      db.prepare('DELETE FROM completions WHERE user_id = ? AND activity_id = ?').run(user.id, activity.id);
    });
  }
  res.redirect(`/mod/assign/view.php?id=${activity.id}`);
});

router.post('/api/assign/:id/comments', loadActivity('assign'), (req, res) => {
  const content = String(req.body.content || '').trim();
  if (!content) return res.status(400).json({ error: 'El comentario está vacío' });
  const { activity, user } = res.locals;
  const ts = format.now();
  db.prepare('INSERT INTO submission_comments (activity_id, user_id, author_id, content, created) VALUES (?, ?, ?, ?, ?)').run(activity.id, user.id, user.id, content, ts);
  res.json({ author: user.fullname, initials: user.initials, content, date: format.userdate(ts) });
});

router.get('/pluginfile.php/submission/:fileId', (req, res) => {
  const file = db
    .prepare('SELECT f.* FROM submission_files f JOIN submissions s ON s.id = f.submission_id WHERE f.id = ? AND s.user_id = ?')
    .get(Number(req.params.fileId), res.locals.user.id);
  if (!file) return renderError(res, 'No se ha encontrado el archivo.', 404);
  res.download(path.join(UPLOADS, file.path), file.filename);
});

/* ---------- Archivo (recurso) ---------- */

const RESOURCE_TEXT = {
  'Normas de convivencia': [
    'Se ruega puntualidad tanto en la entrada como en el regreso del descanso.',
    'El uso del móvil en el aula queda limitado a las actividades indicadas por el profesorado.',
    'Los equipos del aula deben quedar apagados y ordenados al terminar la última sesión.',
    'Las entregas fuera de plazo se penalizarán según los criterios de calificación de cada módulo.',
    'El plagio en cualquier actividad supondrá su calificación con un cero.',
  ],
};

function resourceParagraphs(activity, course) {
  return RESOURCE_TEXT[activity.name] || [
    `Módulo: ${course.fullname}.`,
    'Documento de ejemplo del campus de pruebas. Aquí iría el contenido teórico o la presentación del profesorado.',
  ];
}

router.get('/mod/resource/view.php', loadActivity('resource'), (req, res) => {
  const { activity, course, section, user } = res.locals;
  data.markComplete(user.id, activity.id);
  res.render('resource', {
    title: `${course.shortname}: ${activity.name}`,
    breadcrumb: breadcrumb(course, section, activity),
    fileUrl: `/pluginfile.php/resource/${activity.id}/${encodeURIComponent(activity.filename)}`,
  });
});

router.get('/pluginfile.php/resource/:id/:filename', loadActivity('resource'), (req, res) => {
  const { activity, course } = res.locals;
  res.type('application/pdf');
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(activity.filename)}`);
  res.send(makePdf(activity.name, resourceParagraphs(activity, course)));
});

/* ---------- URL ---------- */

router.get('/mod/url/view.php', loadActivity('url'), (req, res) => {
  data.markComplete(res.locals.user.id, res.locals.activity.id);
  res.redirect(res.locals.activity.url);
});

/* ---------- Foro ---------- */

router.get('/mod/forum/view.php', loadActivity('forum'), (req, res) => {
  const { activity, course, section, user } = res.locals;
  data.markComplete(user.id, activity.id);
  const discussions = db
    .prepare(
      `SELECT d.*, u.firstname, u.lastname,
              (SELECT COUNT(*) - 1 FROM forum_posts p WHERE p.discussion_id = d.id) AS replies,
              (SELECT MAX(created) FROM forum_posts p WHERE p.discussion_id = d.id) AS lastpost
         FROM forum_discussions d JOIN users u ON u.id = d.user_id
        WHERE d.activity_id = ? ORDER BY lastpost DESC`
    )
    .all(activity.id);
  res.render('forum', {
    title: `${course.shortname}: ${activity.name}`,
    breadcrumb: breadcrumb(course, section, activity),
    discussions,
    showForm: req.query.new === '1',
  });
});

router.post('/mod/forum/view.php', loadActivity('forum'), (req, res) => {
  const { activity, user } = res.locals;
  const subject = String(req.body.subject || '').trim();
  const message = String(req.body.message || '').trim();
  if (!subject || !message) return res.redirect(`/mod/forum/view.php?id=${activity.id}&new=1`);
  const ts = format.now();
  const discussionId = transaction(() => {
    const id = db.prepare('INSERT INTO forum_discussions (activity_id, user_id, subject, created) VALUES (?, ?, ?, ?)').run(activity.id, user.id, subject, ts).lastInsertRowid;
    db.prepare('INSERT INTO forum_posts (discussion_id, user_id, message, created) VALUES (?, ?, ?, ?)').run(id, user.id, message, ts);
    return id;
  });
  res.redirect(`/mod/forum/discuss.php?d=${discussionId}`);
});

function loadDiscussion(req, res, next) {
  const discussion = db.prepare('SELECT * FROM forum_discussions WHERE id = ?').get(Number(req.query.d));
  if (!discussion) return renderError(res, 'No se ha encontrado el debate.', 404);
  req.query.id = discussion.activity_id;
  res.locals.discussion = discussion;
  loadActivity('forum')(req, res, next);
}

router.get('/mod/forum/discuss.php', loadDiscussion, (req, res) => {
  const { activity, course, section, discussion } = res.locals;
  const posts = db
    .prepare('SELECT p.*, u.firstname, u.lastname FROM forum_posts p JOIN users u ON u.id = p.user_id WHERE p.discussion_id = ? ORDER BY p.created')
    .all(discussion.id)
    .map((p) => ({ ...p, initials: format.initials(p), fullname: format.fullname(p) }));
  res.render('discussion', {
    title: `${course.shortname}: ${discussion.subject}`,
    breadcrumb: [...breadcrumb(course, section, activity).slice(0, 2), { name: activity.name, url: `/mod/forum/view.php?id=${activity.id}` }, { name: discussion.subject, url: null }],
    posts,
  });
});

router.post('/mod/forum/discuss.php', loadDiscussion, (req, res) => {
  const message = String(req.body.message || '').trim();
  if (message) {
    db.prepare('INSERT INTO forum_posts (discussion_id, user_id, message, created) VALUES (?, ?, ?, ?)').run(res.locals.discussion.id, res.locals.user.id, message, format.now());
  }
  res.redirect(`/mod/forum/discuss.php?d=${res.locals.discussion.id}#ultimo`);
});

module.exports = router;
