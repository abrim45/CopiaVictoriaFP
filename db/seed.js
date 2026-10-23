// Rellena la base de datos con datos de prueba.
// Todas las fechas son relativas al día de hoy para que la línea de tiempo y el calendario siempre tengan contenido.
const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const { db, transaction } = require('./database');
const { makePdf } = require('../lib/pdf');

const UPLOADS = path.join(__dirname, '..', 'uploads');

const now = Math.floor(Date.now() / 1000);
const MIN = 60;
const HOUR = 3600;
const DAY = 86400;

// Marca de tiempo de hoy + `days` días a la hora indicada (hora local)
function at(days, hour, minute = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

function ddmmyyyy(ts) {
  const d = new Date(ts * 1000);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

const assign = (key, name, intro, open, due) => ({ key, type: 'assign', name, intro, open_date: open, due_date: due });
const resource = (key, name, filename) => ({ key, type: 'resource', name, filename: filename || `${name}.pdf` });
const forum = (key, name, intro) => ({ key, type: 'forum', name, intro });
const url = (key, name, href, intro = '') => ({ key, type: 'url', name, url: href, intro });
const label = (html) => ({ type: 'label', name: 'Área de texto y medios', intro: html });

const FORMA_ENTREGA_INTRO =
  '<p><span style="background-color: #ffff00;">FORMA DE NOMBRAR LAS ACTIVIDADES</span></p>' +
  '<p>Fecha. Act nº. Unidad nº. Nombre 1ºapellido</p>' +
  '<p>ejemplo: 23.09.26.Act1.Unidad1.AnaLopez</p>';

function tablon(prefix, fullname, extra = []) {
  return {
    name: 'Tablón de anuncios',
    items: [
      assign(`${prefix}_forma`, 'Forma de entregar las actividades', FORMA_ENTREGA_INTRO, at(-30, 18), at(-23, 18)),
      resource(`${prefix}_normas`, 'Normas de convivencia'),
      ...extra,
      label(
        `<p>Exámenes ${fullname.replace(/ \(.*\)$/, '')}</p>` +
          `<p>Examen Unidad 1: ${ddmmyyyy(at(-9, 9))}</p>` +
          `<p>Examen Unidad 2: ${ddmmyyyy(at(11, 9))}</p>`
      ),
    ],
  };
}

const TEACHERS = [
  { key: 'marta', username: 'marta.ruiz', firstname: 'Marta', lastname: 'Ruiz Navarro' },
  { key: 'javier', username: 'javier.ortega', firstname: 'Javier', lastname: 'Ortega Molina' },
  { key: 'elena', username: 'elena.castro', firstname: 'Elena', lastname: 'Castro Prieto' },
  { key: 'daniel', username: 'daniel.herrera', firstname: 'Daniel', lastname: 'Herrera Gil' },
  { key: 'patricia', username: 'patricia.vega', firstname: 'Patricia', lastname: 'Vega Romero' },
];

const STUDENTS = [
  { key: 'abraham', username: 'abrahamreyes.alum', firstname: 'Abraham', lastname: 'Reyes', courses: ['AD', 'PSP', 'DI', 'PMDM', 'IPE'] },
  { key: 'carlos', username: 'carlosmartin.alum', firstname: 'Carlos', lastname: 'Martín', courses: ['AD', 'PSP', 'DI'] },
  { key: 'lucia', username: 'luciagomez.alum', firstname: 'Lucía', lastname: 'Gómez', courses: ['PSP', 'PMDM', 'IPE'] },
];

const COURSES = [
  {
    key: 'AD',
    fullname: 'Acceso a Datos',
    shortname: 'AD_2627',
    image: '/img/courses/acceso-datos.svg',
    teacher: 'marta',
    completion: 0,
    summary: 'Gestión de ficheros, conectores JDBC, bases de datos objeto-relacionales y mapeo ORM.',
    sections: [
      tablon('ad', 'Acceso a Datos'),
      { name: 'PRESENTACIÓN AD', items: [resource('ad_pres', 'Presentación')] },
      {
        name: 'RA 1. Gestión de ficheros',
        items: [
          resource('ad_teo1', 'Teoría RA 1: Ficheros en Java'),
          url('ad_javaio', 'Documentación del paquete java.io', 'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/io/package-summary.html'),
          assign('ad_ra1', 'Ejercicios RA 1', '<p>Realiza los ejercicios del boletín del RA 1 (lectura y escritura de ficheros de texto, binarios y de acceso aleatorio). Entrega un único archivo .zip con el proyecto.</p>', at(-6, 9), at(2, 23)),
          assign('ad_ra1b', 'Ejercicios RA 1 - Parte 2', '<p>Segunda parte del boletín: serialización de objetos, ficheros XML con DOM y SAX, y JSON.</p>', at(-3, 9), at(4, 23)),
        ],
      },
      {
        name: 'RA 2. Conectores y bases de datos relacionales',
        items: [
          resource('ad_teo2', 'Teoría RA 2: JDBC'),
          assign('ad_jdbc', 'Práctica JDBC: Gestión de alumnos', '<p>Desarrolla una aplicación de consola que realice un CRUD completo sobre una base de datos MySQL usando JDBC y sentencias preparadas.</p>', at(3, 9), at(18, 23)),
        ],
      },
    ],
  },
  {
    key: 'PSP',
    fullname: 'Programación de Servicios y Procesos (PSP)',
    shortname: 'PSP_2627',
    image: '/img/courses/psp.svg',
    teacher: 'javier',
    completion: 1,
    summary: 'Programación multiproceso, multihilo, comunicaciones en red y servicios seguros.',
    sections: [
      tablon('psp', 'Programación de Servicios y Procesos', [
        forum('psp_dudas', 'Foro de dudas', '<p>Utiliza este foro para plantear dudas sobre el temario y las actividades.</p>'),
      ]),
      { name: 'PRESENTACIÓN PSP', items: [resource('psp_pres', 'Presentación')] },
      {
        name: 'Tema 1. Programación multiproceso',
        items: [
          resource('psp_teo1', 'Teoría Tema 1: Procesos'),
          assign('psp_a1', 'Actividad 01: ProcessBuilder', '<p>Crea un programa Java que lance el bloc de notas mediante ProcessBuilder y espere a que termine mostrando su código de salida.</p>', at(-21, 9), at(-14, 23, 59)),
          assign('psp_a2', 'Actividad 02: Lanzar procesos y leer su salida', '<p>Ejecuta un comando del sistema y muestra por consola su salida estándar y su salida de error.</p>', at(-16, 9), at(-9, 23, 59)),
          assign('psp_a3', 'Actividad 03: Comunicación entre procesos', '<p>Implementa dos programas que se comuniquen mediante la entrada y salida estándar redirigida.</p>', at(-2, 9), at(6, 23, 59)),
        ],
      },
      {
        name: 'Tema 2. Programación multihilo',
        items: [
          resource('psp_teo2', 'Teoría Tema 2: Hilos'),
          assign('psp_a4', 'Actividad 04: Hilos y sincronización', '<p>Resuelve el problema del productor-consumidor usando wait() y notify().</p>', at(5, 9), at(13, 23, 59)),
        ],
      },
    ],
  },
  {
    key: 'DI',
    fullname: 'Desarrollo de Interfaces',
    shortname: 'DI_2627',
    image: 'pattern:plaid:#2eaa6e',
    teacher: 'elena',
    completion: 0,
    summary: 'Diseño e implementación de interfaces gráficas, usabilidad, informes y distribución de aplicaciones.',
    sections: [
      tablon('di', 'Desarrollo de Interfaces'),
      { name: 'PRESENTACIÓN DI', items: [resource('di_pres', 'Presentación')] },
      {
        name: 'Unidad 1. Confección de interfaces de usuario',
        items: [
          resource('di_teo1', 'Componentes Swing y JavaFX'),
          assign('di_e1', 'Ejercicio 1: Layouts', '<p>Reproduce las tres ventanas del enunciado utilizando los gestores de distribución adecuados.</p>', at(-15, 9), at(-8, 23, 59)),
          assign('di_p1', 'Práctica 1: Formulario de registro', '<p>Diseña un formulario de registro con validación de campos y mensajes de error accesibles.</p>', at(-1, 9), at(9, 23, 59)),
        ],
      },
      {
        name: 'Unidad 2. Generación de interfaces a partir de XML',
        items: [
          resource('di_teo2', 'Teoría Unidad 2: FXML'),
          assign('di_p2', 'Práctica 2: Interfaz con FXML y Scene Builder', '<p>Rediseña la práctica 1 separando la vista en un fichero FXML.</p>', at(8, 9), at(20, 23, 59)),
        ],
      },
    ],
  },
  {
    key: 'PMDM',
    fullname: 'Programación Multimedia y Dispositivos Móviles',
    shortname: 'PMDM_2627',
    image: 'pattern:concentric:#1fbf9c',
    teacher: 'daniel',
    completion: 0,
    summary: 'Desarrollo de aplicaciones Android con Kotlin, multimedia y juegos.',
    sections: [
      tablon('pmdm', 'Programación Multimedia y Dispositivos Móviles'),
      { name: 'PRESENTACIÓN PMDM', items: [resource('pmdm_pres', 'Presentación')] },
      {
        name: 'Unidad 1. Introducción a Android y Kotlin',
        items: [
          resource('pmdm_teo1', 'Teoría Unidad 1: Kotlin básico'),
          url('pmdm_android', 'Android Developers', 'https://developer.android.com/'),
          assign('pmdm_a1', 'Actividad 1: Hola Mundo en Android', '<p>Crea tu primer proyecto en Android Studio y personaliza la pantalla principal.</p>', at(-12, 9), at(-5, 23, 59)),
          assign('pmdm_a2', 'Actividad 2: Ciclo de vida de una Activity', '<p>Registra en Logcat cada método del ciclo de vida y explica en qué momento se invoca.</p>', at(-4, 9), at(5, 23, 59)),
        ],
      },
      {
        name: 'Unidad 2. Interfaces en Android',
        items: [
          resource('pmdm_teo2', 'Teoría Unidad 2: Layouts y vistas'),
          assign('pmdm_a3', 'Actividad 3: Calculadora con ConstraintLayout', '<p>Implementa una calculadora básica respetando las guías de Material Design.</p>', at(6, 9), at(16, 23, 59)),
        ],
      },
    ],
  },
  {
    key: 'IPE',
    fullname: 'Itinerario Personal para la Empleabilidad II (2026-2027)',
    shortname: 'IPE_II_DAM_1',
    image: 'pattern:triangles:#1fb386',
    teacher: 'patricia',
    completion: 1,
    summary: 'Emprendimiento, innovación, idea de negocio y plan de empresa.',
    sections: [
      tablon('ipe', 'Itinerario Personal para la Empleabilidad'),
      { name: 'PRESENTACIÓN IPE II', items: [resource('ipe_pres', 'Presentación')] },
      {
        name: 'Unidad 1. Innovación y emprendimiento',
        items: [
          resource('ipe_teo1', 'Unidad 1. La innovación'),
          assign('ipe_a1', 'Actividad 1: La innovación y la sostenibilidad', '<p>Busca una empresa innovadora y sostenible de tu entorno y analiza qué la diferencia de su competencia.</p>', at(-7, 9), at(1, 23, 59)),
          assign('ipe_a2', 'Actividad 2: El emprendimiento', '<p>Responde a las preguntas sobre los tipos de emprendimiento y pon un ejemplo de cada uno.</p>', at(-4, 9), at(3, 23, 59)),
          assign('ipe_a3', 'Actividad 3: Las habilidades emprendedoras', '<p>Realiza el test de habilidades emprendedoras y reflexiona sobre tus puntos fuertes y débiles.</p>', at(-4, 9), at(3, 23, 59)),
          forum('ipe_foro', 'Foro Virtual: ¿El emprendedor nace o se hace?', '<p>Participa en el debate aportando tu opinión argumentada y responde al menos a un compañero.</p>'),
        ],
      },
      {
        name: 'Unidad 2. La idea de negocio',
        items: [
          resource('ipe_teo2', 'Unidad 2. La idea de negocio'),
          assign('ipe_a4', 'Actividad 4: Lienzo Canvas de tu idea de negocio', '<p>Completa el modelo Canvas de tu idea de negocio.</p>', at(4, 9), at(25, 23, 59)),
        ],
      },
    ],
  },
];

function clear() {
  for (const table of [
    'forum_posts', 'forum_discussions', 'private_files', 'notifications', 'events', 'completions',
    'submission_comments', 'submission_files', 'submissions', 'activities', 'sections', 'enrolments', 'courses', 'users',
  ]) {
    db.exec(`DELETE FROM ${table}`);
  }
  db.exec('DELETE FROM sqlite_sequence');
  fs.rmSync(UPLOADS, { recursive: true, force: true });
}

function seed() {
  transaction(() => {
    clear();

    const users = {};
    const insertUser = db.prepare(
      'INSERT INTO users (username, password_hash, firstname, lastname, email, city, firstaccess, lastaccess) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const hash = bcrypt.hashSync('1234', 10);
    for (const t of TEACHERS) {
      users[t.key] = insertUser.run(t.username, null, t.firstname, t.lastname, `${t.username}@campus.local`, '', at(-60, 9), now - 2 * HOUR).lastInsertRowid;
    }
    STUDENTS.forEach((s, i) => {
      users[s.key] = insertUser.run(s.username, hash, s.firstname, s.lastname, `${s.username}@campus.local`, '', at(-50, 10), now - (i + 1) * DAY).lastInsertRowid;
    });

    const courses = {};
    const acts = {};
    const insertCourse = db.prepare(
      'INSERT INTO courses (fullname, shortname, category, image, summary, enablecompletion, startdate, enddate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const insertSection = db.prepare('INSERT INTO sections (course_id, position, name) VALUES (?, ?, ?)');
    const insertActivity = db.prepare(
      'INSERT INTO activities (course_id, section_id, position, type, name, intro, filename, url, open_date, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const insertEnrol = db.prepare('INSERT INTO enrolments (user_id, course_id, role, lastaccess) VALUES (?, ?, ?, ?)');

    COURSES.forEach((c, ci) => {
      const courseId = insertCourse.run(c.fullname, c.shortname, '2DAM', c.image, c.summary, c.completion, at(-45, 0), at(240, 0)).lastInsertRowid;
      courses[c.key] = { id: courseId, ...c };
      insertEnrol.run(users[c.teacher], courseId, 'editingteacher', now - 3 * HOUR);
      c.sections.forEach((s, si) => {
        const sectionId = insertSection.run(courseId, si, s.name).lastInsertRowid;
        s.items.forEach((a, ai) => {
          const id = insertActivity.run(courseId, sectionId, ai, a.type, a.name, a.intro || '', a.filename || null, a.url || null, a.open_date || null, a.due_date || null).lastInsertRowid;
          if (a.key) acts[a.key] = id;
        });
      });
      for (const s of STUDENTS) {
        if (s.courses.includes(c.key)) insertEnrol.run(users[s.key], courseId, 'student', now - (ci + 1) * 5 * HOUR);
      }
    });

    // Entregas precargadas
    const insertSubmission = db.prepare(
      'INSERT INTO submissions (activity_id, user_id, status, modified, grade, grader_id, graded_at, feedback) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const insertFile = db.prepare('INSERT INTO submission_files (submission_id, path, filename, size, created) VALUES (?, ?, ?, ?, ?)');
    const insertCompletion = db.prepare('INSERT OR IGNORE INTO completions (user_id, activity_id, timecompleted) VALUES (?, ?, ?)');

    function submit(studentKey, actKey, modified, filename, graded) {
      const userId = users[studentKey];
      const activityId = acts[actKey];
      const subId = insertSubmission.run(
        activityId, userId, 'submitted', modified,
        graded ? graded.grade : null, graded ? users[graded.by] : null, graded ? modified + 3 * DAY : null, graded ? graded.feedback : null
      ).lastInsertRowid;
      const dir = path.join(UPLOADS, 'submissions', String(userId), String(activityId));
      fs.mkdirSync(dir, { recursive: true });
      const pdf = makePdf(filename.replace(/\.pdf$/, ''), ['Entrega de ejemplo generada automáticamente para los datos de prueba del campus.']);
      const stored = `${Date.now()}-${subId}.pdf`;
      fs.writeFileSync(path.join(dir, stored), pdf);
      insertFile.run(subId, path.join('submissions', String(userId), String(activityId), stored), filename, pdf.length, modified);
      insertCompletion.run(userId, activityId, modified);
    }

    submit('abraham', 'ipe_a1', now - 46 * MIN, '20.10.26.Act1.Unidad1.AbrahamReyes.pdf');
    submit('abraham', 'psp_a1', at(-15, 18, 30), '08.10.26.Act01.Tema1.AbrahamReyes.pdf', {
      grade: 8.5, by: 'javier', feedback: '<p>Buen trabajo. El programa funciona correctamente; recuerda controlar la excepción InterruptedException en waitFor().</p>',
    });
    submit('abraham', 'pmdm_a1', at(-6, 20, 10), '17.10.26.Act1.Unidad1.AbrahamReyes.pdf');
    submit('carlos', 'ad_forma', at(-25, 17), '28.09.26.Act0.Unidad0.CarlosMartin.pdf');
    submit('carlos', 'psp_a1', at(-14, 22, 15), '09.10.26.Act01.Tema1.CarlosMartin.pdf', {
      grade: 7, by: 'javier', feedback: '<p>Correcto, aunque falta mostrar el código de salida del proceso.</p>',
    });
    submit('carlos', 'di_e1', at(-9, 19), '14.10.26.Ej1.Unidad1.CarlosMartin.pdf');
    submit('lucia', 'psp_a1', at(-16, 12), '07.10.26.Act01.Tema1.LuciaGomez.pdf', {
      grade: 9.25, by: 'javier', feedback: '<p>Excelente. Código limpio y bien comentado.</p>',
    });
    submit('lucia', 'pmdm_a1', at(-7, 11), '16.10.26.Act1.Unidad1.LuciaGomez.pdf');
    submit('lucia', 'ipe_a1', at(-1, 16), '22.10.26.Act1.Unidad1.LuciaGomez.pdf');

    // Recursos vistos (cuentan para el % completado)
    const viewed = {
      abraham: ['ipe_normas', 'ipe_pres', 'ipe_teo1', 'psp_normas', 'psp_pres', 'psp_teo1'],
      carlos: ['psp_pres', 'psp_teo1', 'psp_teo2'],
      lucia: ['ipe_pres', 'ipe_teo1', 'ipe_normas', 'ipe_foro', 'psp_pres'],
    };
    for (const [student, list] of Object.entries(viewed)) {
      for (const key of list) insertCompletion.run(users[student], acts[key], now - 5 * DAY);
    }

    // Comentarios de la entrega
    db.prepare('INSERT INTO submission_comments (activity_id, user_id, author_id, content, created) VALUES (?, ?, ?, ?, ?)').run(
      acts.ipe_a1, users.abraham, users.patricia, 'Recibida. La revisaré esta semana, pero a primera vista el análisis está muy completo.', now - 40 * MIN
    );

    // Foros
    const insertDiscussion = db.prepare('INSERT INTO forum_discussions (activity_id, user_id, subject, created) VALUES (?, ?, ?, ?)');
    const insertPost = db.prepare('INSERT INTO forum_posts (discussion_id, user_id, message, created) VALUES (?, ?, ?, ?)');
    let d = insertDiscussion.run(acts.ipe_foro, users.patricia, 'Bienvenida al debate', at(-4, 10)).lastInsertRowid;
    insertPost.run(d, users.patricia, '¿Creéis que las habilidades emprendedoras son innatas o se pueden aprender? Argumentad vuestra respuesta con ejemplos.', at(-4, 10));
    insertPost.run(d, users.lucia, 'Yo creo que se hace. La creatividad o la tolerancia al riesgo se entrenan con la práctica y con formación.', at(-3, 18, 20));
    d = insertDiscussion.run(acts.psp_dudas, users.carlos, 'Duda con waitFor() en la actividad 01', at(-16, 19)).lastInsertRowid;
    insertPost.run(d, users.carlos, 'Cuando llamo a waitFor() el programa se queda bloqueado hasta cerrar el bloc de notas, ¿es lo esperado?', at(-16, 19));
    insertPost.run(d, users.javier, 'Sí, waitFor() bloquea el hilo actual hasta que el proceso hijo termina. Es justo lo que pide el enunciado.', at(-16, 21));

    // Eventos de curso
    const insertEvent = db.prepare('INSERT INTO events (user_id, course_id, name, description, timestart, duration, type) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const courseEvents = [
      ['IPE', 'Trabajo Escrito Unidad 1', 'Entrega en clase del trabajo escrito de la Unidad 1.', at(-22, 9)],
      ['IPE', 'Trabajo Escrito Unidad 2', 'Entrega en clase del trabajo escrito de la Unidad 2.', at(-16, 9)],
      ['IPE', 'Foro Virtual: apertura del debate', 'Se abre el foro virtual de la Unidad 1.', at(-14, 9)],
      ['IPE', 'Examen Unidad 1', 'Examen presencial de la Unidad 1.', at(-9, 9)],
      ['IPE', 'Examen Unidad 2', 'Examen presencial de la Unidad 2.', at(11, 9)],
      ['PSP', 'Examen Tema 1', 'Examen práctico en el aula de los procesos.', at(15, 10)],
      ['AD', 'Examen RA 1', 'Examen práctico de ficheros.', at(12, 11)],
      ['DI', 'Presentación Práctica 1', 'Cada alumno presentará su formulario en clase.', at(10, 12)],
      ['PMDM', 'Taller de Jetpack Compose', 'Sesión práctica guiada en el aula.', at(7, 10)],
    ];
    for (const [courseKey, name, desc, ts] of courseEvents) insertEvent.run(null, courses[courseKey].id, name, desc, ts, 0, 'course');
    insertEvent.run(users.abraham, null, 'Estudiar para el examen de AD', 'Repasar ficheros de acceso aleatorio.', at(10, 17), 7200, 'user');

    // Notificaciones
    const insertNotification = db.prepare('INSERT INTO notifications (user_id, from_id, subject, body, url, read, created) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const actUrl = (key) => `/mod/assign/view.php?id=${acts[key]}`;
    const courseUrl = (key) => `/course/view.php?id=${courses[key].id}`;
    const templates = [
      { course: 'PSP', from: 'javier', subject: 'PSP_2627: Nuevo material disponible y recordatorio importante para la clase de mañana.', body: 'Se ha publicado la teoría del Tema 2 (Hilos). Mañana traed el portátil cargado: haremos la práctica de sincronización en clase.', url: courseUrl('PSP'), ago: DAY + HOUR },
      { course: 'PSP', from: 'javier', subject: 'Programación de Servicios y Procesos (PSP) cambio de contenido', body: 'Se ha actualizado el contenido "Actividad 03: Comunicación entre procesos".', url: actUrl('psp_a3'), ago: DAY + HOUR + 5 * MIN },
      { course: 'PSP', from: 'javier', subject: 'Programación de Servicios y Procesos (PSP) contenido nuevo', body: 'Nuevo contenido: "Actividad 04: Hilos y sincronización".', url: actUrl('psp_a4'), ago: DAY + HOUR + 8 * MIN },
      { course: 'AD', from: 'marta', subject: 'AD_2627: Publicado el enunciado de Ejercicios RA 1 - Parte 2', body: 'Ya tenéis disponible la segunda parte del boletín del RA 1.', url: actUrl('ad_ra1b'), ago: 2 * DAY + 3 * HOUR },
      { course: 'IPE', from: 'patricia', subject: 'IPE_II_DAM_1: Recordatorio del examen de la Unidad 2', body: 'Os recuerdo que el examen de la Unidad 2 está fijado en el tablón de anuncios.', url: courseUrl('IPE'), ago: 3 * DAY },
      { course: 'AD', from: 'marta', subject: 'Acceso a Datos contenido nuevo', body: 'Nuevo contenido: "Teoría RA 2: JDBC".', url: courseUrl('AD'), ago: 4 * DAY + 2 * HOUR },
      { course: 'DI', from: 'elena', subject: 'Desarrollo de Interfaces contenido nuevo', body: 'Nuevo contenido: "Práctica 1: Formulario de registro".', url: actUrl('di_p1'), ago: 5 * DAY },
      { course: 'PMDM', from: 'daniel', subject: 'PMDM_2627: Nueva práctica disponible', body: 'Nuevo contenido: "Actividad 2: Ciclo de vida de una Activity".', url: actUrl('pmdm_a2'), ago: 6 * DAY },
      { course: 'IPE', from: 'patricia', subject: 'Itinerario Personal para la Empleabilidad II (2026-2027) contenido nuevo', body: 'Nuevo contenido: "Actividad 2: El emprendimiento" y "Actividad 3: Las habilidades emprendedoras".', url: courseUrl('IPE'), ago: 4 * DAY + 5 * HOUR },
      { course: 'DI', from: 'elena', subject: 'DI_2627: Cambio de aula para la clase del jueves', body: 'La clase del jueves se impartirá en el aula 2.3.', url: courseUrl('DI'), ago: 8 * DAY },
    ];
    for (const s of STUDENTS) {
      for (const t of templates) {
        if (s.courses.includes(t.course)) insertNotification.run(users[s.key], users[t.from], t.subject, t.body, t.url, 0, now - t.ago);
      }
    }
    insertNotification.run(users.abraham, users.patricia,
      'Patricia Vega Romero ha hecho un comentario en la tarea Actividad 1: La innovación y la sostenibilidad',
      'Recibida. La revisaré esta semana, pero a primera vista el análisis está muy completo.', actUrl('ipe_a1'), 0, now - 39 * MIN - 50);
    insertNotification.run(users.abraham, users.abraham,
      'Usted ha realizado su entrega en la tarea Actividad 1: La innovación y la sostenibilidad',
      'Ha enviado una entrega para la tarea "Actividad 1: La innovación y la sostenibilidad".', actUrl('ipe_a1'), 0, now - 45 * MIN - 59);
    insertNotification.run(users.abraham, users.javier,
      'Su entrega en la tarea Actividad 01: ProcessBuilder ha sido calificada',
      'Calificación: 8,50 / 10,00', actUrl('psp_a1'), 1, at(-12, 10));
    insertNotification.run(users.carlos, users.javier,
      'Su entrega en la tarea Actividad 01: ProcessBuilder ha sido calificada',
      'Calificación: 7,00 / 10,00', actUrl('psp_a1'), 1, at(-11, 10));
    insertNotification.run(users.lucia, users.javier,
      'Su entrega en la tarea Actividad 01: ProcessBuilder ha sido calificada',
      'Calificación: 9,25 / 10,00', actUrl('psp_a1'), 1, at(-13, 10));
  });
}

module.exports = { seed };

if (require.main === module) {
  seed();
  console.log('Base de datos rellenada. Usuarios: abrahamreyes.alum, carlosmartin.alum, luciagomez.alum (contraseña 1234)');
}
