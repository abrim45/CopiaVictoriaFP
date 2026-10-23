const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db/database');
const format = require('../lib/format');

const router = express.Router();

router.get('/login/index.php', (req, res) => {
  if (res.locals.user) return res.redirect('/my/');
  res.render('login', { title: 'Campus Virtual Victoria FP: Entrar al sitio', error: null, username: '' });
});

router.post('/login/index.php', (req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND password_hash IS NOT NULL').get(username);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).render('login', {
      title: 'Campus Virtual Victoria FP: Entrar al sitio',
      error: 'Acceso no válido. Por favor, inténtelo otra vez.',
      username,
    });
  }

  const wantsurl = req.session.wantsurl;
  req.session.regenerate((err) => {
    if (err) throw err;
    req.session.userId = user.id;
    req.session.loginTime = format.now();
    req.session.ip = req.ip;
    if (!user.firstaccess) db.prepare('UPDATE users SET firstaccess = ? WHERE id = ?').run(format.now(), user.id);
    res.redirect(wantsurl && wantsurl.startsWith('/') && !wantsurl.startsWith('//') ? wantsurl : '/my/');
  });
});

router.post('/login/guest', (req, res) => {
  req.session.regenerate(() => {
    req.session.guest = true;
    res.redirect('/');
  });
});

router.get('/login/logout.php', (req, res) => {
  req.session.destroy(() => res.redirect('/login/index.php'));
});

router.get('/login/forgot_password.php', (req, res) => {
  res.render('forgot-password', { title: 'Contraseña olvidada', sent: false });
});

router.post('/login/forgot_password.php', (req, res) => {
  res.render('forgot-password', { title: 'Contraseña olvidada', sent: true });
});

module.exports = router;
