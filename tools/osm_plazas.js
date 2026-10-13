// Plazas reales (punto 34): place=square y zonas peatonales (highway=pedestrian con area=yes) alrededor del pabellón -> recursos/osm/<id>.pl.json. Uso: node tools/osm_plazas.js [id-club ...]
// Después: node tools/osm_generar.js (guarda `pl` en vendor/osm/<id>.json: [tipo, x0, z0, ...] en décimas de metro). Si no hay datos, el juego busca un hueco junto al ayuntamiento, la iglesia y el mercado.
const fs = require('fs'), path = require('path'); const DIR = path.join(__dirname, '..', 'recursos', 'osm'), UA = 'basket-manager-personal/1.0 (uso personal)', R = 700;
const dormir = ms => new Promise(r => setTimeout(r, ms));
async function consulta(q) { for (const ep of ['https://overpass-api.de/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter']) { try { const r = await fetch(ep, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' }, signal: AbortSignal.timeout(80000) }); if (r.ok) return await r.json(); } catch (e) { /* siguiente */ } await dormir(1500); } return null; }
(async () => {
  const sel = process.argv.slice(2), ids = fs.readdirSync(DIR).filter(f => f.endsWith('.json') && !/\.(poi|ring|dem|tr|pl)\.json$/.test(f) && f !== 'clubes.json' && f !== 'centros.json').map(f => f.replace('.json', ''));
  for (const id of ids) {
    if (sel.length && !sel.includes(id)) continue; const out = path.join(DIR, id + '.pl.json'); if (fs.existsSync(out) && !sel.length) continue;
    const c = JSON.parse(fs.readFileSync(path.join(DIR, id + '.json'), 'utf8')), a = `(around:${R},${c.lat},${c.lon})`, q = `[out:json][timeout:60];(way["place"="square"]${a};way["highway"="pedestrian"]["area"="yes"]${a};way["leisure"="pedestrian"]${a};);out geom tags;`, j = await consulta(q); if (!j) { console.log('SIN DATOS', id); continue; }
    const k = 110574, kx = 111320 * Math.cos(c.lat * Math.PI / 180), el = [];
    for (const w of j.elements) { if (!w.geometry || w.geometry.length < 4) continue; const t = w.tags || {}; el.push({ t: t.place === 'square' ? 0 : 1, nom: t.name || '', g: w.geometry.map(p => [Math.round((p.lon - c.lon) * kx * 10), Math.round(-(p.lat - c.lat) * k * 10)]) }); }
    fs.writeFileSync(out, JSON.stringify({ id, el })); console.log(id, el.length); await dormir(1500);
  }
})();
