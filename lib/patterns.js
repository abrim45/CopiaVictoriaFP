// Imágenes de curso generadas (como el "geopattern" que usa Moodle cuando un curso no tiene imagen).
// Un curso con image = "pattern:<tipo>:<color>" obtiene un SVG en data URI.

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shade(rand) {
  const light = rand() > 0.5;
  const opacity = (0.02 + rand() * 0.13).toFixed(3);
  return `fill="${light ? '#fff' : '#222'}" fill-opacity="${opacity}"`;
}

function triangles(rand, w, h) {
  const size = 60;
  const th = size * 0.866;
  let out = '';
  for (let row = 0; row * th < h; row++) {
    for (let col = -1; col * (size / 2) < w + size; col++) {
      const x = col * (size / 2);
      const y = row * th;
      const up = (row + col) % 2 === 0;
      const points = up
        ? `${x},${y + th} ${x + size / 2},${y} ${x + size},${y + th}`
        : `${x},${y} ${x + size},${y} ${x + size / 2},${y + th}`;
      out += `<polygon points="${points}" ${shade(rand)} stroke="#000" stroke-opacity="0.02"/>`;
    }
  }
  return out;
}

function plaid(rand, w, h) {
  let out = '';
  for (let y = 0; y < h; ) {
    const size = 4 + Math.floor(rand() * 18);
    out += `<rect x="0" y="${y}" width="${w}" height="${size}" ${shade(rand)}/>`;
    y += size + Math.floor(rand() * 10);
  }
  for (let x = 0; x < w; ) {
    const size = 4 + Math.floor(rand() * 18);
    out += `<rect x="${x}" y="0" width="${size}" height="${h}" ${shade(rand)}/>`;
    x += size + Math.floor(rand() * 10);
  }
  return out;
}

function concentric(rand, w, h) {
  const size = 46;
  let out = '';
  for (let y = 0; y < h; y += size) {
    for (let x = 0; x < w; x += size) {
      out += `<rect x="${x + 4}" y="${y + 4}" width="${size - 8}" height="${size - 8}" fill="none" stroke="#fff" stroke-opacity="${(0.05 + rand() * 0.15).toFixed(3)}" stroke-width="6"/>`;
      out += `<rect x="${x + 16}" y="${y + 16}" width="${size - 32}" height="${size - 32}" ${shade(rand)}/>`;
    }
  }
  return out;
}

function mosaic(rand, w, h) {
  const size = 30;
  let out = '';
  for (let y = 0; y < h; y += size) {
    for (let x = 0; x < w; x += size) out += `<rect x="${x}" y="${y}" width="${size}" height="${size}" ${shade(rand)}/>`;
  }
  return out;
}

function hexagons(rand, w, h) {
  const r = 26;
  const hh = r * Math.sqrt(3);
  let out = '';
  for (let col = 0; col * r * 1.5 < w + r; col++) {
    for (let row = -1; row * hh < h + hh; row++) {
      const cx = col * r * 1.5;
      const cy = row * hh + (col % 2 ? hh / 2 : 0);
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
      }
      out += `<polygon points="${pts.join(' ')}" ${shade(rand)} stroke="#000" stroke-opacity="0.03"/>`;
    }
  }
  return out;
}

const GENERATORS = { triangles, plaid, concentric, mosaic, hexagons };

function patternSvg(kind, color, seed) {
  const w = 400;
  const h = 200;
  const gen = GENERATORS[kind] || mosaic;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">` +
    `<rect width="100%" height="100%" fill="${color}"/>${gen(rng(seed), w, h)}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function courseImage(course) {
  const image = course.image || `pattern:mosaic:#0f6cbf`;
  if (!image.startsWith('pattern:')) return image;
  const [, kind, color] = image.split(':');
  return patternSvg(kind, color, course.id * 7919);
}

module.exports = { courseImage };
