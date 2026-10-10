// recursos/osm/<id>.json (crudo, de tools/osm_descargar.js) -> datos_osm.js (compacto, coordenadas en metros alrededor del pabellón).
// Datos © colaboradores de OpenStreetMap (ODbL). Solo se guardan los elementos fuera de la zona jugable de la calle.
// Formato: GM.osm[id] = { e: [[plantas, x0, z0, x1, z1, ...]], c: [[clase, x0, z0, ...]], a: [[x0, z0, ...]], p: [[x0, z0, ...]] }  (decímetros enteros; z crece hacia el sur)
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, '..', 'recursos', 'osm');
const INX = 152, INZ = 90;                  // zona jugable (± metros alrededor del origen del mapa)
const CLASE = { motorway: 0, trunk: 0, primary: 1, secondary: 1, tertiary: 2, residential: 2, unclassified: 2, living_street: 3, pedestrian: 3, service: 3 };
const area = p => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; };
function dp(p, eps, cerrado) {
  if (p.length < 4) return p;
  const d = (q, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dz) / l)); return Math.hypot(q[0] - a[0] - t * dx, q[1] - a[1] - t * dz); };
  const rec = (i, j, out) => { let m = 0, k = -1; for (let n = i + 1; n < j; n++) { const v = d(p[n], p[i], p[j]); if (v > m) { m = v; k = n; } } if (m > eps) { rec(i, k, out); out.push(k); rec(k, j, out); } };
  const idx = [0]; rec(0, p.length - 1, idx); idx.push(p.length - 1);
  return idx.map(i => p[i]);
}
const ent = v => Math.round(v * 10);
const fuera = p => p.some(q => Math.abs(q[0]) > INX || Math.abs(q[1]) > INZ);
const out = {};
let total = 0;
for (const f of fs.readdirSync(DIR).filter(n => n.endsWith('.json') && n !== 'clubes.json').sort()) {
  const j = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  const k = 110574, kx = 111320 * Math.cos(j.lat * Math.PI / 180);
  const pr = g => g.map(q => [(q.lon - j.lon) * kx, -(q.lat - j.lat) * k]);
  const r = { e: [], c: [], a: [], p: [] };
  for (const w of j.el) {
    if (!w.geometry || w.geometry.length < 3) continue;
    const t = w.tags || {};
    let p = pr(w.geometry);
    if (t.building) {
      if (p.length > 1 && p[0][0] === p[p.length - 1][0] && p[0][1] === p[p.length - 1][1]) p.pop();
      if (p.length < 3 || area(p) < 30 || !fuera(p)) continue;
      p = dp(p.concat([p[0]]), 1.3).slice(0, -1); if (p.length < 3) continue;
      if (p.length > 12) p = p.filter((_, i) => i % Math.ceil(p.length / 12) === 0);
      const pl = +t['building:levels'] || (t.height ? Math.max(1, Math.round(+t.height / 3.1)) : 0);
      r.e.push([Math.min(pl, 40) || 0].concat(...p.map(q => [ent(q[0]), ent(q[1])])));
    } else if (t.highway) {
      if (!fuera(p)) continue;
      p = dp(p, 1.5); r.c.push([CLASE[t.highway] === undefined ? 3 : CLASE[t.highway]].concat(...p.map(q => [ent(q[0]), ent(q[1])])));
    } else if (t.natural === 'water' || t.waterway) {
      if (!fuera(p)) continue;
      p = dp(p, 2); r.a.push([t.waterway ? 1 : 0].concat(...p.map(q => [ent(q[0]), ent(q[1])])));
    } else if (t.leisure) {
      if (!fuera(p)) continue;
      p = dp(p, 2); r.p.push([t.leisure === 'pitch' ? 1 : 0].concat(...p.map(q => [ent(q[0]), ent(q[1])])));
    }
  }
  out[j.id] = r; total += r.e.length;
}
const s = '/* Generado por tools/osm_generar.js a partir de OpenStreetMap (© colaboradores de OSM, ODbL). No lo edites a mano. */\n(function () { GM.osm = ' + JSON.stringify(out) + '; })();\n';
fs.writeFileSync(path.join(__dirname, '..', 'datos_osm.js'), s);
console.log(Object.keys(out).length + ' ciudades, ' + total + ' edificios, ' + Math.round(s.length / 1024) + ' KB');
