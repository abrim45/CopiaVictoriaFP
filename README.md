# Copia Campus Virtual Victoria FP

Réplica local del Campus Virtual de Victoria FP (Moodle 4, tema Boost) hecha con **Node.js + Express + EJS + SQLite**.

## Requisitos

- [Node.js](https://nodejs.org/) **22.13 o superior** (se usa el módulo `node:sqlite` integrado, no hace falta instalar ninguna base de datos).
- Conexión a internet para cargar los iconos (Font Awesome) y la fuente del logo (Google Fonts). Sin conexión la web funciona, pero sin iconos.

## Puesta en marcha

```bash
npm install
npm start
```

Abre **http://localhost:3000** en el navegador.

La primera vez que arranca se crea la base de datos (`data/campus.db`) con los datos de prueba.

### Otros comandos

| Comando | Descripción |
|---|---|
| `npm start` | Arranca el servidor en el puerto 3000 |
| `npm run dev` | Arranca el servidor y lo reinicia al cambiar el código |
| `npm run seed` | Borra la base de datos y los archivos subidos y vuelve a cargar los datos de prueba |

Para usar otro puerto: `PORT=8080 npm start` (en PowerShell: `$env:PORT=8080; npm start`).

## Usuarios de prueba

Todos tienen la contraseña **`1234`**.

| Usuario | Nombre | Asignaturas matriculadas |
|---|---|---|
| `abrahamreyes.alum` | Abraham Reyes | Acceso a Datos, PSP, Desarrollo de Interfaces, PMDM, Itinerario Personal para la Empleabilidad II |
| `carlosmartin.alum` | Carlos Martín | Acceso a Datos, PSP, Desarrollo de Interfaces |
| `luciagomez.alum` | Lucía Gómez | PSP, PMDM, Itinerario Personal para la Empleabilidad II |

Cada usuario solo ve sus asignaturas, tareas, eventos y notificaciones. También se puede entrar como invitado (solo ve la página principal).

## Funcionalidades

- **Login** con usuario y contraseña (contraseñas cifradas con bcrypt), acceso como invitado y cierre de sesión.
- **Área personal**: línea de tiempo (filtros por fecha, orden por fecha o curso, buscador) y calendario mensual (filtro por curso, crear y borrar eventos).
- **Mis cursos**: vista tarjeta / lista / resumen, búsqueda, ordenación, destacar y ocultar cursos, porcentaje completado.
- **Curso**: secciones plegables, índice lateral, participantes, calificaciones y competencias.
- **Tareas**: estado de la entrega, subida de archivos (botón o arrastrar y soltar), editar y borrar entrega, comentarios.
- **Recursos PDF**, **foros** (crear debates y responder) y **enlaces**.
- **Menú de usuario**: perfil, calificaciones, calendario, archivos privados, informes, preferencias (editar perfil y cambiar contraseña).
- **Notificaciones** con contador, marcar todas como leídas y vista completa.

Las fechas de las tareas se generan relativas al día actual, así que la línea de tiempo siempre tiene contenido.

## Estructura

```
server.js          Arranque de Express, sesión y rutas
db/                Esquema SQLite (database.js) y datos de prueba (seed.js)
lib/               Consultas, formato de fechas, iconos, PDF de ejemplo
middleware/        Autenticación
routes/            Rutas (login, área personal, cursos, actividades, calendario, usuario...)
views/             Plantillas EJS
public/            CSS, JavaScript del navegador e imágenes
data/              Base de datos (se genera, no se sube a git)
uploads/           Archivos entregados (se genera, no se sube a git)
```

## Imágenes

- La foto del edificio de la página principal es una ilustración provisional. Para usar la real, guárdala como `public/img/edificio.jpg`.
- Las portadas de los cursos están en `public/img/courses/` (los cursos sin imagen usan un patrón generado).
