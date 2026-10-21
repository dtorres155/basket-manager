// Segunda pasada de OpenStreetMap: lo puntual (comercios con nombre, árboles, paradas, semáforos, pasos de peatones, bancos, papeleras, farolas, monumentos)
// y los aparcamientos y usos del suelo, en el mismo radio que la primera. Usa el centro de recursos/osm/<id>.json (tools/osm_descargar.js).
// Uso: node tools/osm_descargar2.js [id-club ...]   -> recursos/osm/<id>.poi.json
const fs = require('fs'),
  path = require('path');
const DIR = path.join(__dirname, '..', 'recursos', 'osm');
const UA = 'basket-manager-personal/1.0 (uso personal)',
  R = 300;
const dormir = ms => new Promise(r => setTimeout(r, ms));
async function consulta(q) {
  for (const ep of ['https://overpass.kumi.systems/api/interpreter', 'https://overpass-api.de/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter']) {
    try {
      const r = await fetch(ep, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(q),
        headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: AbortSignal.timeout(70000)
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
      .filter(f => f.endsWith('.json') && !f.endsWith('.poi.json') && f !== 'clubes.json')
      .map(f => f.replace('.json', ''));
  for (const id of ids) {
    if (sel.length && !sel.includes(id)) continue;
    const out = path.join(DIR, id + '.poi.json');
    if (fs.existsSync(out) && !sel.length) continue;
    const c = JSON.parse(fs.readFileSync(path.join(DIR, id + '.json'), 'utf8')),
      a = `(around:${R},${c.lat},${c.lon})`;
    const q = `[out:json][timeout:60];(node["name"]["shop"]${a};node["name"]["amenity"~"restaurant|cafe|bar|pub|fast_food|bank|pharmacy|cinema|theatre|library|post_office|ice_cream|fuel|hospital|school|townhall|police|fire_station"]${a};node["tourism"]["name"]${a};node["historic"]["name"]${a};node["natural"="tree"]${a};node["highway"~"bus_stop|traffic_signals|crossing|street_lamp"]${a};node["amenity"~"bench|waste_basket|bicycle_parking|recycling|vending_machine|atm|drinking_water|fountain"]${a};way["amenity"="parking"]${a};way["landuse"~"grass|forest|residential|commercial|retail|industrial|cemetery|railway|construction|brownfield"]${a};way["railway"~"rail|tram|subway|light_rail"]${a};way["barrier"~"fence|wall|hedge"]${a};way["man_made"~"bridge|pier"]${a};way["natural"~"wood|scrub|beach"]${a};);out geom tags;`;
    const j = await consulta(q);
    if (!j) {
      console.log('SIN DATOS', id);
      continue;
    }
    fs.writeFileSync(out, JSON.stringify({ id, lat: c.lat, lon: c.lon, el: j.elements }));
    console.log(id, j.elements.length);
    await dormir(1500);
  }
})();
