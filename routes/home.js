const fs = require('node:fs');
const path = require('node:path');
const express = require('express');

const router = express.Router();
const IMG_DIR = path.join(__dirname, '..', 'public', 'img');

// Si el usuario coloca su propia foto en public/img/edificio.jpg se usa; si no, la ilustración SVG
function buildingImage() {
  for (const name of ['edificio.jpg', 'edificio.jpeg', 'edificio.png', 'edificio.webp']) {
    if (fs.existsSync(path.join(IMG_DIR, name))) return `/img/${name}`;
  }
  return '/img/edificio.svg';
}

router.get('/', (req, res) => {
  if (!res.locals.user && !res.locals.guest) return res.redirect('/login/index.php');
  res.render('home', { title: 'Campus Virtual Victoria FP Institute of Technology', nav: 'home', buildingImage: buildingImage() });
});

module.exports = router;
