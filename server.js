const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const session = require('express-session');

const { isEmpty } = require('./db/database');
const { seed } = require('./db/seed');
const { loadUser, requireLogin, renderError } = require('./middleware/auth');
const format = require('./lib/format');
const icons = require('./lib/icons');

if (isEmpty()) {
  seed();
  console.log('Base de datos vacía: se han cargado los datos de prueba.');
}

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(
  session({
    name: 'MoodleSession',
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax' },
  })
);

app.use((req, res, next) => {
  res.locals.fmt = format;
  res.locals.icons = icons;
  res.locals.currentUrl = req.originalUrl;
  res.locals.nav = '';
  res.locals.courseIndex = null;
  res.locals.blockDrawer = false;
  res.locals.editToggle = false;
  res.locals.editMode = Boolean(req.session.editMode);
  next();
});
app.use(loadUser);

// Páginas públicas
app.use(require('./routes/auth'));
app.use(require('./routes/home'));

// A partir de aquí hace falta haber iniciado sesión
app.use(requireLogin);
app.use(require('./routes/my'));
app.use(require('./routes/course'));
app.use(require('./routes/mod'));
app.use(require('./routes/calendar'));
app.use(require('./routes/user'));
app.use(require('./routes/notifications'));

app.use((req, res) => renderError(res, 'No se ha encontrado la página solicitada.', 404));

app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === 'LIMIT_FILE_SIZE') return renderError(res, 'El archivo es demasiado grande (máximo 200 MB).', 413, req.originalUrl);
  if (err.code === 'LIMIT_FILE_COUNT') return renderError(res, 'Ha superado el número máximo de archivos (20).', 413, req.originalUrl);
  renderError(res, 'Se ha producido un error inesperado.', 500);
});

app.listen(PORT, () => {
  console.log(`Campus Virtual Victoria FP en http://localhost:${PORT}`);
  console.log('Usuarios de prueba (contraseña 1234): abrahamreyes.alum, carlosmartin.alum, luciagomez.alum');
});
