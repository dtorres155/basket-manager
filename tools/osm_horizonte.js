// Horizonte real (punto 144 de la hoja de ruta 2): alturas del terreno (Copernicus DEM de 90 m, a través de Open-Meteo) en anillos de 1,5 a
// 20 km alrededor del pabellón, en 72 direcciones (cada 5 grados). Con ellas horizonte.js dibuja los montes de verdad y sabe hacia dónde
// está el mar (altura 0 en todos los anillos).
// Uso: node tools/osm_horizonte.js [id-club ...]   -> recursos/osm/<id>.hor.json ({ az: 72, d: [metros], h: [d0a0, d0a1, ... ] }; el
// ángulo 0 es el norte y crece hacia el este). Después node tools/osm_generar.js. Open-Meteo limita a unos 5000 puntos por hora (576 por
// ciudad): si sale «LÍMITE», repite el comando más tarde y sigue donde lo dejó.
const fs = require('fs'),
  path = require('path');
const DIR = path.join(__dirname, '..', 'recursos', 'osm'),
  AZ = 72,
  D = [1500, 2500, 4000, 6000, 8500, 12000, 16000, 20000];
const dormir = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const sel = process.argv.slice(2),
    ids = fs
      .readdirSync(DIR)
      .filter(f => f.endsWith('.json') && !/\.(poi|ring|dem|tr|pl|ex|hor|costa|cat)\.json$/.test(f) && f !== 'clubes.json' && f !== 'centros.json')
      .map(f => f.replace('.json', ''));
  let hechas = 0;
  for (const id of ids) {
    if (sel.length && !sel.includes(id)) continue;
    const out = path.join(DIR, id + '.hor.json');
    if (fs.existsSync(out)) continue;
    const c = JSON.parse(fs.readFileSync(path.join(DIR, id + '.json'), 'utf8')),
      k = 110574,
      kx = 111320 * Math.cos((c.lat * Math.PI) / 180),
      lat = [],
      lon = [];
    for (const d of D)
      for (let a = 0; a < AZ; a++) {
        const ang = (a / AZ) * Math.PI * 2,
          x = Math.sin(ang) * d, // este
          z = -Math.cos(ang) * d; // sur (el norte es z negativa)
        lat.push(+(c.lat - z / k).toFixed(5));
        lon.push(+(c.lon + x / kx).toFixed(5));
      }
    const h = [];
    let ok = true;
    for (let i = 0; i < lat.length && ok; i += 100) {
      let r = null,
        lim = 0;
      for (let t = 0; t < 4 && !r; t++) {
        try {
          const f = await fetch('https://api.open-meteo.com/v1/elevation?latitude=' + lat.slice(i, i + 100).join(',') + '&longitude=' + lon.slice(i, i + 100).join(','), {
            signal: AbortSignal.timeout(30000)
          });
          if (f.ok) r = (await f.json()).elevation;
          else if (f.status === 429) {
            // límite por minuto: se espera; si sigue, es el de la hora y se para
            if (++lim >= 3) {
              console.log('LÍMITE de Open-Meteo: repite el comando dentro de una hora (' + hechas + ' ciudades hechas en esta vuelta)');
              process.exit(2);
            }
            await dormir(70000);
          } else await dormir(4000 * (t + 1));
        } catch (e) {
          await dormir(3000);
        }
      }
      if (!r) ok = false;
      else h.push(...r);
      await dormir(12000); // unos 500 puntos por minuto, por debajo del límite de Open-Meteo
    }
    if (!ok) {
      console.log('SIN DATOS', id);
      continue;
    }
    fs.writeFileSync(out, JSON.stringify({ id, az: AZ, d: D, h: h.map(v => Math.round(v)) }));
    const mar = Array.from({ length: AZ }, (_, a) => D.every((_, r) => h[r * AZ + a] <= 0)).filter(Boolean).length;
    console.log(id, 'hasta ' + Math.max(...h) + ' m; direcciones con mar: ' + mar + ' de ' + AZ);
    hechas++;
  }
})();
