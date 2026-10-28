// Relieve (punto 31): alturas del terreno (Copernicus DEM de 90 m, a través de Open-Meteo) en una cuadrícula de 17x17 puntos cada 125 m alrededor del pabellón, para cada ciudad.
// Uso: node tools/osm_relieve.js [id-club ...]   -> recursos/osm/<id>.dem.json ({ n: 17, paso: 125, h: [metros] }; las alturas van de oeste a este y de norte a sur). Después node tools/osm_generar.js
const fs = require('fs'),
  path = require('path');
const DIR = path.join(__dirname, '..', 'recursos', 'osm'),
  FINO = !!process.env.FINO; // FINO=1: 17x17 puntos cada 125 m; si no, 9x9 cada 250 m (Open-Meteo limita a 5000 puntos por hora: la descarga se reanuda sola al repetir el comando)
const dormir = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const sel = process.argv.slice(2),
    ids = fs
      .readdirSync(DIR)
      .filter(f => f.endsWith('.json') && !/\.(poi|ring|dem|tr|pl|ex|hor|costa|cat|mdt)\.json$/.test(f) && f !== 'clubes.json' && f !== 'centros.json')
      .map(f => f.replace('.json', ''));
  for (const id of ids) {
    if (sel.length && !sel.includes(id)) continue;
    const out = path.join(DIR, id + '.dem.json');
    if (fs.existsSync(out) && !sel.length) continue;
    const N = FINO ? 17 : 9,
      PASO = FINO ? 125 : 250,
      c = JSON.parse(fs.readFileSync(path.join(DIR, id + '.json'), 'utf8')),
      k = 110574,
      kx = 111320 * Math.cos((c.lat * Math.PI) / 180),
      lat = [],
      lon = [];
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++) {
        const x = (i - (N - 1) / 2) * PASO,
          z = (j - (N - 1) / 2) * PASO;
        lat.push(+(c.lat - z / k).toFixed(5));
        lon.push(+(c.lon + x / kx).toFixed(5));
      }
    const h = [];
    let ok = true;
    for (let a = 0; a < lat.length && ok; a += 100) {
      let r = null;
      for (let t = 0; t < 3 && !r; t++) {
        try {
          const f = await fetch('https://api.open-meteo.com/v1/elevation?latitude=' + lat.slice(a, a + 100).join(',') + '&longitude=' + lon.slice(a, a + 100).join(','), {
            signal: AbortSignal.timeout(30000)
          });
          if (f.ok) r = (await f.json()).elevation;
          else if (f.status === 429) {
            console.log('LÍMITE de Open-Meteo: repite el comando dentro de una hora');
            process.exit(2);
          } else await dormir(4000 * (t + 1));
        } catch (e) {
          await dormir(3000);
        }
      }
      if (!r) ok = false;
      else h.push(...r);
      await dormir(400);
    }
    if (!ok) {
      console.log('SIN DATOS', id);
      continue;
    }
    fs.writeFileSync(out, JSON.stringify({ id, n: N, paso: PASO, h: h.map(v => Math.round(v * 10) / 10) }));
    const mn = Math.min(...h),
      mx = Math.max(...h);
    console.log(id, 'de ' + mn + ' a ' + mx + ' m');
  }
})();
