// Descarga de OpenStreetMap (© colaboradores de OSM, ODbL) los edificios y calles que rodean el pabellón de cada club.
// Uso: node tools/osm_descargar.js [id-club ...]   -> recursos/osm/<id>.json (en crudo; recursos/ no se sube a git)
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, '..', 'recursos', 'osm');
const clubes = JSON.parse(fs.readFileSync(path.join(DIR, 'clubes.json'), 'utf8'));
const UA = 'basket-manager-personal/1.0 (uso personal)';
const R = 300;
const dormir = ms => new Promise(r => setTimeout(r, ms));
async function get(url, opc) {
  for (let i = 0; i < 2; i++) {
    try { const r = await fetch(url, Object.assign({ headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(45000) }, opc)); if (r.ok) return await r.json(); if (r.status === 429 || r.status >= 500) await dormir(3000); else return null; } catch (e) { await dormir(4000); }
  }
  return null;
}
async function centro(id, ciudad, pais, pab) {
  const q = s => 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(s);
  for (const s of [pab + ', ' + ciudad, pab, ciudad]) {
    const j = await get(q(s)); await dormir(1200);
    if (j && j[0]) return { lat: +j[0].lat, lon: +j[0].lon, de: s };
  }
  return null;
}
(async () => {
  const sel = process.argv.slice(2);
  for (const [id, ciudad, pais, pab] of (process.env.INVERSO ? clubes.slice().reverse() : clubes)) {
    if (sel.length && !sel.includes(id)) continue;
    const f = path.join(DIR, id + '.json');
    if (fs.existsSync(f) && !sel.length) continue;
    const c = await centro(id, ciudad, pais, pab);
    if (!c) { console.log('SIN CENTRO', id); continue; }
    const q = `[out:json][timeout:60];(way["building"](around:${R},${c.lat},${c.lon});way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|living_street|pedestrian|service)$"](around:${R},${c.lat},${c.lon});way["natural"="water"](around:${R},${c.lat},${c.lon});way["waterway"~"river|canal"](around:${R},${c.lat},${c.lon});way["leisure"~"park|pitch|garden"](around:${R},${c.lat},${c.lon}););out geom tags;`;
    let j = null; for (const ep of ['https://overpass.kumi.systems/api/interpreter', 'https://overpass-api.de/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter']) { j = await get(ep, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' }, signal: AbortSignal.timeout(60000) }); if (j) break; }
    if (!j) { console.log('SIN DATOS', id); continue; }
    fs.writeFileSync(f, JSON.stringify({ id, lat: c.lat, lon: c.lon, de: c.de, el: j.elements }));
    console.log(id, c.de, j.elements.length);
    await dormir(2500);
  }
})();
