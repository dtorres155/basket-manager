// Datos extra de OpenStreetMap (punto 31c): partes de edificio (building:part) y rutas de autobús (relation route=bus) alrededor del pabellón -> recursos/osm/<id>.ex.json
// Uso: node tools/osm_extra.js [id-club ...]   Después: node tools/osm_generar.js (guarda `bp` y `rb` en vendor/osm/<id>.json)
const fs = require('fs'),
  path = require('path');
const DIR = path.join(__dirname, '..', 'recursos', 'osm'),
  UA = 'basket-manager-personal/1.0 (uso personal)';
const dormir = ms => new Promise(r => setTimeout(r, ms));
async function consulta(q) {
  for (const ep of [
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
    'https://overpass-api.de/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
  ]) {
    try {
      const r = await fetch(ep, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(90000) });
      if (r.ok) return await r.json();
    } catch (e) {
      /* siguiente */
    }
    await dormir(1500);
  }
  return null;
}
(async () => {
  const sel = process.argv.slice(2),
    ids = fs
      .readdirSync(DIR)
      .filter(f => f.endsWith('.json') && !/\.(poi|ring|dem|tr|pl|ex|hor|costa|cat)\.json$/.test(f) && f !== 'clubes.json' && f !== 'centros.json')
      .map(f => f.replace('.json', ''));
  for (const id of ids) {
    if (sel.length && !sel.includes(id)) continue;
    const out = path.join(DIR, id + '.ex.json');
    if (fs.existsSync(out) && !sel.length) continue;
    const c = JSON.parse(fs.readFileSync(path.join(DIR, id + '.json'), 'utf8')),
      q = `[out:json][timeout:80];(way["building:part"](around:420,${c.lat},${c.lon});relation["route"="bus"](around:420,${c.lat},${c.lon}););out geom;`,
      j = await consulta(q);
    if (!j) {
      console.log('SIN DATOS', id);
      continue;
    }
    const k = 110574,
      kx = 111320 * Math.cos((c.lat * Math.PI) / 180),
      pr = g => g.map(p => [Math.round((p.lon - c.lon) * kx * 10), Math.round(-(p.lat - c.lat) * k * 10)]),
      bp = [],
      rb = [];
    for (const e of j.elements) {
      const t = e.tags || {};
      if (e.type === 'way' && t['building:part'] && e.geometry && e.geometry.length >= 4)
        bp.push({
          lv: +t['building:levels'] || 0,
          h: parseFloat(t.height) || 0,
          mlv: +t['building:min_level'] || 0,
          mh: parseFloat(t.min_height) || 0,
          col: t['building:colour'] || '',
          roof: t['roof:shape'] || '',
          g: pr(e.geometry)
        });
      else if (e.type === 'relation' && t.route === 'bus')
        rb.push({
          ref: t.ref || '',
          nom: t.name || '',
          ways: (e.members || []).filter(m => m.type === 'way' && m.geometry && m.geometry.length > 1 && !/stop|platform/.test(m.role || '')).map(m => pr(m.geometry))
        });
    }
    fs.writeFileSync(out, JSON.stringify({ id, bp, rb }));
    console.log(id, bp.length + ' partes, ' + rb.length + ' rutas');
    await dormir(1500);
  }
})();
