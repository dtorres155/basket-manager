// Comprueba que el centro de cada club (vendor/osm/<id>.json, clave g) cae cerca de su ciudad: geocodifica el nombre de la ciudad con Nominatim y lista las que distan más de 25 km.
// Uso: node tools/auditar_centros.js   (tarda unos 3 minutos; corregir con recursos/osm/centros.json y repetir tools/datos.js)
const fs = require('fs'),
  path = require('path');
const raiz = path.join(__dirname, '..');
const dormir = ms => new Promise(r => setTimeout(r, ms));
const km = (a, b) => {
  const r = Math.PI / 180,
    dx = (b[1] - a[1]) * Math.cos(((a[0] + b[0]) / 2) * r),
    dy = b[0] - a[0];
  return Math.hypot(dx, dy) * 111.2;
};
(async () => {
  const cl = JSON.parse(fs.readFileSync(path.join(raiz, 'recursos', 'osm', 'clubes.json'), 'utf8')),
    mal = [];
  for (const [id, ciudad, pais] of cl) {
    const g = JSON.parse(fs.readFileSync(path.join(raiz, 'vendor', 'osm', id + '.json'), 'utf8')).g;
    let c = null;
    for (let i = 0; i < 3 && !c; i++) {
      try {
        const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(ciudad + ', ' + pais), {
          headers: { 'User-Agent': 'basket-manager-personal/1.0' }
        });
        const j = await r.json();
        if (j[0]) c = [+j[0].lat, +j[0].lon];
      } catch (e) {
        await dormir(2000);
      }
    }
    await dormir(1100);
    if (!c) {
      console.log('sin geocodificar', ciudad);
      continue;
    }
    const d = km(g, c);
    if (d > 25) {
      mal.push([id, ciudad, Math.round(d)]);
      console.log('LEJOS', id, ciudad, Math.round(d) + ' km', JSON.stringify(g), 'ciudad', JSON.stringify(c));
    }
  }
  console.log(mal.length, 'clubes con el centro a más de 25 km de su ciudad');
})();
