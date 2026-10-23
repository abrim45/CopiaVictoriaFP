const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { db } = require('../db/database');
const format = require('../lib/format');
const data = require('../lib/data');
const { renderError } = require('../middleware/auth');

const router = express.Router();
const UPLOADS = path.join(__dirname, '..', 'uploads');

router.get('/user/profile.php', (req, res) => {
  const { user } = res.locals;
  res.render('profile', { title: `${user.fullname}: Perfil público`, courses: data.getUserCourses(user.id), session: req.session });
});

router.get('/grade/report/overview/index.php', (req, res) => {
  const userId = res.locals.user.id;
  const rows = data.getUserCourses(userId).map((c) => {
    const g = db
      .prepare("SELECT AVG(s.grade) AS avg FROM submissions s JOIN activities a ON a.id = s.activity_id WHERE a.course_id = ? AND s.user_id = ? AND s.grade IS NOT NULL")
      .get(c.id, userId);
    return { id: c.id, fullname: c.fullname, grade: g.avg };
  });
  res.render('grades', { title: 'Calificaciones', rows });
});

/* ---------- Archivos privados ---------- */

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(UPLOADS, 'private', String(req.session.userId));
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 200 * 1024 * 1024, files: 20 },
  defParamCharset: 'utf8',
});

function privateFiles(userId) {
  return db.prepare('SELECT * FROM private_files WHERE user_id = ? ORDER BY filename').all(userId);
}

router.get('/user/files.php', (req, res) => {
  res.render('files', { title: 'Archivos privados', files: privateFiles(res.locals.user.id) });
});

router.post('/user/files.php', upload.array('files', 20), (req, res) => {
  const userId = res.locals.user.id;
  const removeIds = String(req.body.remove || '').split(',').map(Number).filter(Boolean);
  for (const id of removeIds) {
    const file = db.prepare('SELECT * FROM private_files WHERE id = ? AND user_id = ?').get(id, userId);
    if (file) {
      db.prepare('DELETE FROM private_files WHERE id = ?').run(id);
      fs.rm(path.join(UPLOADS, file.path), { force: true }, () => {});
    }
  }
  for (const f of req.files || []) {
    db.prepare('INSERT INTO private_files (user_id, path, filename, size, created) VALUES (?, ?, ?, ?, ?)').run(
      userId, path.relative(UPLOADS, f.path), f.originalname, f.size, format.now()
    );
  }
  res.redirect('/user/files.php');
});

router.get('/pluginfile.php/private/:id', (req, res) => {
  const file = db.prepare('SELECT * FROM private_files WHERE id = ? AND user_id = ?').get(Number(req.params.id), res.locals.user.id);
  if (!file) return renderError(res, 'No se ha encontrado el archivo.', 404);
  res.download(path.join(UPLOADS, file.path), file.filename);
});

/* ---------- Informes ---------- */

router.get('/report/usersessions/user.php', (req, res) => {
  res.render('sessions', { title: 'Sesiones del navegador', session: req.session });
});

/* ---------- Preferencias ---------- */

router.get('/user/preferences.php', (req, res) => {
  res.render('preferences', { title: 'Preferencias' });
});

router.get('/user/edit.php', (req, res) => {
  res.render('edit-profile', { title: 'Editar perfil', saved: false, error: null });
});

router.post('/user/edit.php', (req, res) => {
  const firstname = String(req.body.firstname || '').trim();
  const lastname = String(req.body.lastname || '').trim();
  const email = String(req.body.email || '').trim();
  if (!firstname || !lastname || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.render('edit-profile', { title: 'Editar perfil', saved: false, error: 'Revise los campos obligatorios: nombre, apellidos y una dirección de correo válida.' });
  }
  db.prepare('UPDATE users SET firstname = ?, lastname = ?, email = ?, city = ?, description = ? WHERE id = ?').run(
    firstname, lastname, email, String(req.body.city || '').trim(), String(req.body.description || '').trim(), res.locals.user.id
  );
  res.redirect('/user/profile.php');
});

router.get('/login/change_password.php', (req, res) => {
  res.render('change-password', { title: 'Cambiar contraseña', error: null, saved: false });
});

router.post('/login/change_password.php', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(res.locals.user.id);
  const { password, newpassword1, newpassword2 } = req.body;
  let error = null;
  if (!bcrypt.compareSync(String(password || ''), user.password_hash)) error = 'Contraseña actual incorrecta';
  else if (!newpassword1 || String(newpassword1).length < 4) error = 'La nueva contraseña debe tener al menos 4 caracteres';
  else if (newpassword1 !== newpassword2) error = 'Las contraseñas no coinciden';
  if (error) return res.render('change-password', { title: 'Cambiar contraseña', error, saved: false });
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(String(newpassword1), 10), user.id);
  res.render('change-password', { title: 'Cambiar contraseña', error: null, saved: true });
});

module.exports = router;
