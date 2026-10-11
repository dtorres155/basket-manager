// recursos/osm/<id>.json (crudo, de tools/osm_descargar.js) -> vendor/osm/<id>.json (compacto; build.js los copia a dist/osm).
// Datos © colaboradores de OpenStreetMap (ODbL). Coordenadas en decímetros enteros alrededor del pabellón (x al este, z al sur).
// Formato: { s: [textos], e: [[plantas, clase, nombre, x0, z0, x1, z1, ...]], c: [[clase, nombre, sentidoUnico, x0, z0, ...]], a: [[tipo, x0, z0, ...]], p: [[tipo, x0, z0, ...]] }
// clase de edificio: 0 otro, 1 vivienda, 2 comercio, 3 oficina, 4 colegio, 5 hospital, 6 ayuntamiento/público, 7 iglesia, 8 hotel, 9 industrial, 10 deporte, 11 quiosco, 12 restauración, 13 estación
// clase de calle: 0 autovía, 1 principal, 2 secundaria, 3 terciaria, 4 residencial, 5 peatonal, 6 servicio
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, '..', 'recursos', 'osm'), OUT = path.join(__dirname, '..', 'vendor', 'osm');
fs.mkdirSync(OUT, { recursive: true });
const CALLE = { motorway: 0, trunk: 0, primary: 1, secondary: 2, tertiary: 3, residential: 4, unclassified: 4, living_street: 5, pedestrian: 5, service: 6 };
const area = p => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; };
function dp(p, eps) {
  if (p.length < 4) return p;
  const d = (q, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dz) / l)); return Math.hypot(q[0] - a[0] - t * dx, q[1] - a[1] - t * dz); };
  const rec = (i, j, out) => { let m = 0, k = -1; for (let n = i + 1; n < j; n++) { const v = d(p[n], p[i], p[j]); if (v > m) { m = v; k = n; } } if (m > eps) { rec(i, k, out); out.push(k); rec(k, j, out); } };
  const idx = [0]; rec(0, p.length - 1, idx); idx.push(p.length - 1);
  return idx.map(i => p[i]);
}
function claseEdificio(t) {
  const b = t.building, a = t.amenity, s = t.shop;
  if (t.leisure === 'stadium' || t.leisure === 'sports_centre' || b === 'stadium' || b === 'sports_hall' || t.sport === 'basketball') return 10;
  if (b === 'hospital' || a === 'hospital' || a === 'clinic') return 5;
  if (b === 'school' || b === 'kindergarten' || b === 'university' || a === 'school' || a === 'kindergarten' || a === 'university' || a === 'college') return 4;
  if (a === 'townhall' || b === 'civic' || b === 'public' || b === 'government' || a === 'courthouse' || a === 'police') return 6;
  if (b === 'church' || b === 'cathedral' || b === 'chapel' || b === 'mosque' || b === 'synagogue' || b === 'temple' || a === 'place_of_worship') return 7;
  if (b === 'hotel' || t.tourism === 'hotel') return 8;
  if (b === 'train_station' || t.railway === 'station' || t.public_transport === 'station') return 13;
  if (s === 'kiosk' || s === 'newsagent' || b === 'kiosk') return 11;
  if (a === 'restaurant' || a === 'cafe' || a === 'bar' || a === 'fast_food' || a === 'pub') return 12;
  if (s || b === 'retail' || b === 'commercial' || b === 'supermarket' || b === 'mall' || a === 'bank' || a === 'theatre' || a === 'cinema') return 2;
  if (b === 'office') return 3;
  if (b === 'industrial' || b === 'warehouse' || b === 'garage' || b === 'garages' || b === 'service' || b === 'roof' || b === 'shed' || b === 'carport' || b === 'hangar' || b === 'parking') return 9;
  if (b === 'apartments' || b === 'house' || b === 'residential' || b === 'detached' || b === 'terrace' || b === 'semidetached_house' || b === 'dormitory' || b === 'bungalow') return 1;
  return 0;
}
const ent = v => Math.round(v * 10);
let total = 0, bytes = 0;
for (const f of fs.readdirSync(DIR).filter(n => n.endsWith('.json') && n !== 'clubes.json').sort()) {
  const j = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  const k = 110574, kx = 111320 * Math.cos(j.lat * Math.PI / 180);
  const pr = g => g.map(q => [(q.lon - j.lon) * kx, -(q.lat - j.lat) * k]);
  const S = [], SI = new Map(), nom = n => { if (!n) return -1; n = String(n).slice(0, 40); if (!SI.has(n)) { SI.set(n, S.length); S.push(n); } return SI.get(n); };
  const r = { s: S, e: [], c: [], a: [], p: [] };
  for (const w of j.el) {
    if (!w.geometry || w.geometry.length < 3 && !w.tags.highway) continue;
    const t = w.tags || {};
    let p = pr(w.geometry);
    if (t.building) {
      if (p.length > 1 && p[0][0] === p[p.length - 1][0] && p[0][1] === p[p.length - 1][1]) p.pop();
      if (p.length < 3 || area(p) < 18) continue;
      p = dp(p.concat([p[0]]), 0.9).slice(0, -1); if (p.length < 3) continue;
      if (p.length > 18) p = p.filter((_, i) => i % Math.ceil(p.length / 18) === 0);
      const pl = +t['building:levels'] || (t.height ? Math.max(1, Math.round(+t.height / 3.1)) : 0);
      r.e.push([Math.min(pl, 60) || 0, claseEdificio(t), nom(t.name)].concat(...p.map(q => [ent(q[0]), ent(q[1])])));
    } else if (t.highway) {
      if (t.tunnel && t.tunnel !== 'no') continue;
      p = dp(p, 1.2); r.c.push([CALLE[t.highway] === undefined ? 6 : CALLE[t.highway], nom(t.name), t.oneway === 'yes' ? 1 : 0].concat(...p.map(q => [ent(q[0]), ent(q[1])])));
    } else if (t.natural === 'water' || t.waterway) {
      p = dp(p, 1.8); r.a.push([t.waterway ? 1 : 0].concat(...p.map(q => [ent(q[0]), ent(q[1])])));
    } else if (t.leisure) {
      p = dp(p, 1.8); r.p.push([t.leisure === 'pitch' ? 1 : t.leisure === 'garden' ? 2 : 0].concat(...p.map(q => [ent(q[0]), ent(q[1])])));
    }
  }
  const s = JSON.stringify(r); fs.writeFileSync(path.join(OUT, j.id + '.json'), s);
  total++; bytes += s.length;
}
console.log(total + ' ciudades, ' + Math.round(bytes / 1024) + ' KB en vendor/osm');
