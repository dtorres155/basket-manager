// Transporte público (punto 31): tranvía, tren ligero y metro de superficie alrededor del pabellón (radio 1000 m) -> recursos/osm/<id>.tr.json. Uso: node tools/osm_transporte.js [id-club ...]
// Después: node tools/osm_generar.js (guarda `tr` en vendor/osm/<id>.json: [tipo (0 tranvía, 1 tren ligero, 2 metro en superficie), x0, z0, ...] en décimas de metro)
const fs = require('fs'), path = require('path'); const DIR = path.join(__dirname, '..', 'recursos', 'osm'), UA = 'basket-manager-personal/1.0 (uso personal)', R = 1000;
const dormir = ms => new Promise(r => setTimeout(r, ms));
async function consulta(q) { for (const ep of ['https://overpass-api.de/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter']) { try { const r = await fetch(ep, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' }, signal: AbortSignal.timeout(80000) }); if (r.ok) return await r.json(); } catch (e) { /* siguiente */ } await dormir(1500); } return null; }
(async () => {
  const sel = process.argv.slice(2), ids = fs.readdirSync(DIR).filter(f => f.endsWith('.json') && !/\.(poi|ring|dem|tr)\.json$/.test(f) && f !== 'clubes.json' && f !== 'centros.json').map(f => f.replace('.json', ''));
  for (const id of ids) {
    if (sel.length && !sel.includes(id)) continue; const out = path.join(DIR, id + '.tr.json'); if (fs.existsSync(out) && !sel.length) continue;
    const c = JSON.parse(fs.readFileSync(path.join(DIR, id + '.json'), 'utf8')), q = `[out:json][timeout:60];way["railway"~"^(tram|light_rail|subway)$"](around:${R},${c.lat},${c.lon});out geom tags;`, j = await consulta(q); if (!j) { console.log('SIN DATOS', id); continue; }
    const k = 110574, kx = 111320 * Math.cos(c.lat * Math.PI / 180), el = [];
    for (const w of j.elements) { const t = w.tags || {}; if (!w.geometry || w.geometry.length < 2) continue; if ((t.tunnel && t.tunnel !== 'no') || t.location === 'underground' || t.layer && +t.layer < 0) continue; el.push({ t: t.railway === 'tram' ? 0 : t.railway === 'light_rail' ? 1 : 2, g: w.geometry.map(p => [Math.round((p.lon - c.lon) * kx * 10), Math.round(-(p.lat - c.lat) * k * 10)]) }); }
    fs.writeFileSync(out, JSON.stringify({ id, el })); console.log(id, el.length); await dormir(1500);
  }
})();
