// Costa (punto 101 de la hoja de ruta 2): línea de costa, playas, espigones, pantalanes y muelles a menos de 3,5 km del pabellón, de
// OpenStreetMap (Overpass): natural=coastline, natural=beach, man_made=pier/groyne/breakwater. Con ellos horizonte.js dibuja el mar, la arena
// y los pantalanes (en Badalona, el Pont del Petroli).
// Uso: node tools/osm_costa.js [id-club ...]   -> recursos/osm/<id>.costa.json ({ c: [[x0,z0,...]], p: [...], m: [...] } en décimas de metro;
// la costa va con la tierra a la izquierda, como en OpenStreetMap). Después node tools/osm_generar.js. Las ciudades sin costa cerca guardan
// listas vacías para no volver a pedirlas.
const fs = require('fs'),
  path = require('path');
const DIR = path.join(__dirname, '..', 'recursos', 'osm'),
  UA = 'basket-manager-personal/1.0 (uso personal)',
  R = 3500;
const dormir = ms => new Promise(r => setTimeout(r, ms));
async function consulta(q) {
  for (const ep of ['https://overpass-api.de/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter']) {
    try {
      const r = await fetch(ep, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(q),
        headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: AbortSignal.timeout(90000)
      });
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
      .filter(f => f.endsWith('.json') && !/\.(poi|ring|dem|tr|pl|ex|hor|costa|cat|mdt)\.json$/.test(f) && f !== 'clubes.json' && f !== 'centros.json')
      .map(f => f.replace('.json', ''));
  for (const id of ids) {
    if (sel.length && !sel.includes(id)) continue;
    const out = path.join(DIR, id + '.costa.json');
    if (fs.existsSync(out) && !sel.length) continue;
    const c = JSON.parse(fs.readFileSync(path.join(DIR, id + '.json'), 'utf8')),
      a = `(around:${R},${c.lat},${c.lon})`,
      q = `[out:json][timeout:80];(way["natural"="coastline"]${a};way["natural"="beach"]${a};relation["natural"="beach"]${a};way["man_made"~"^(pier|groyne|breakwater)$"]${a};);out geom tags;`,
      j = await consulta(q);
    if (!j) {
      console.log('SIN DATOS', id);
      continue;
    }
    const k = 110574,
      kx = 111320 * Math.cos((c.lat * Math.PI) / 180),
      pt = p => [Math.round((p.lon - c.lon) * kx * 10), Math.round(-(p.lat - c.lat) * k * 10)],
      res = { id, c: [], p: [], m: [] };
    for (const w of j.elements) {
      const t = w.tags || {};
      if (w.type === 'relation') {
        (w.members || []).forEach(m => {
          if (m.role === 'outer' && m.geometry && m.geometry.length >= 4) res.p.push([].concat(...m.geometry.map(pt)));
        });
        continue;
      }
      if (!w.geometry || w.geometry.length < 2) continue;
      const g = [].concat(...w.geometry.map(pt));
      if (t.natural === 'coastline') res.c.push(g);
      else if (t.natural === 'beach' && w.geometry.length >= 4) res.p.push(g);
      else if (t.man_made) res.m.push([t.man_made === 'pier' ? 0 : 1, (t.name || '').slice(0, 40)].concat(g));
    }
    fs.writeFileSync(out, JSON.stringify(res));
    console.log(id, 'costa ' + res.c.length + ', playas ' + res.p.length + ', muelles ' + res.m.length);
    await dormir(2000);
  }
})();
