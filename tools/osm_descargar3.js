// Tercera pasada de OpenStreetMap: el anillo lejano (de 300 a 480 m del pabellón) con edificios, calles principales y agua, para que la ciudad no acabe en seco.
// Usa el centro de recursos/osm/<id>.json. Uso: node tools/osm_descargar3.js [id-club ...]   -> recursos/osm/<id>.ring.json
const fs = require('fs'),
  path = require('path');
const DIR = path.join(__dirname, '..', 'recursos', 'osm'),
  UA = 'basket-manager-personal/1.0 (uso personal)',
  R = +process.env.RADIO || 480;
const dormir = ms => new Promise(r => setTimeout(r, ms));
async function consulta(q) {
  for (const ep of ['https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass-api.de/api/interpreter']) {
    try {
      const r = await fetch(ep, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(q),
        headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: AbortSignal.timeout(100000)
      });
      if (r.ok) return await r.json();
    } catch (e) {
      /* siguiente servidor */
    }
    await dormir(1500);
  }
  return null;
}
(async () => {
  const sel = process.argv.slice(2),
    ids = fs
      .readdirSync(DIR)
      .filter(f => f.endsWith('.json') && !/\.(poi|ring)\.json$/.test(f) && f !== 'clubes.json')
      .map(f => f.replace('.json', ''));
  for (const id of ids) {
    if (sel.length && !sel.includes(id)) continue;
    const out = path.join(DIR, id + '.ring.json');
    if (fs.existsSync(out) && !sel.length) continue;
    const c = JSON.parse(fs.readFileSync(path.join(DIR, id + '.json'), 'utf8')),
      a = `(around:${R},${c.lat},${c.lon})`;
    const q = `[out:json][timeout:90][maxsize:134217728];(way["building"]${a};way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential)$"]${a};way["natural"="water"]${a};way["waterway"~"river|canal"]${a};way["leisure"~"park"]${a};way["landuse"~"forest|grass"]${a};way["railway"~"rail"]${a};);out geom tags;`;
    const j = await consulta(q);
    if (!j) {
      console.log('SIN DATOS', id);
      continue;
    }
    // solo lo que cae fuera del círculo de 285 m (lo de dentro ya está en la primera pasada); los edificios con la mínima información
    const k = 110574,
      kx = 111320 * Math.cos((c.lat * Math.PI) / 180),
      el = [];
    for (const w of j.elements) {
      if (!w.geometry || w.geometry.length < 2) continue;
      const t = w.tags || {};
      const g = w.geometry.map(p => [Math.round((p.lon - c.lon) * kx * 10), Math.round(-(p.lat - c.lat) * k * 10)]);
      if (g.every(p => Math.hypot(p[0], p[1]) < 2850)) continue;
      el.push({
        t: t.building ? 'b' : t.highway ? 'h' : t.railway ? 'r' : t.natural || t.waterway ? 'a' : 'p',
        k: t.highway || '',
        l: +t['building:levels'] || (t.height ? Math.round(+t.height / 3.1) : 0),
        g
      });
    }
    fs.writeFileSync(out, JSON.stringify({ id, el }));
    console.log(id, el.length);
    await dormir(1500);
  }
})();
