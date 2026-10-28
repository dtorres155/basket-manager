// Ortofoto (punto 146 de la hoja de ruta 2): foto aérea del PNOA (IGN, CC BY 4.0 scne.es) de 4 x 4 km alrededor del pabellón, a 1 m por
// píxel, pedida en latitud y longitud para que encaje con las coordenadas del juego sin reproyectar (x hacia el este, z hacia el sur).
// Guarda recursos/orto/<id>_4096.jpg (original), vendor/orto/<id>.jpg (2048 px, 2 m por píxel, para el suelo lejano del juego) y
// recursos/orto/<id>.rgb (2048 x 2048 píxeles RGB sin comprimir, para que tools/osm_generar.js saque el color de cada tejado).
// Solo España (el PNOA); para otros países haría falta su ortofoto. Uso: node tools/ortofoto.js <id-club> [...]   (necesita sharp en
// recursos/herramientas). Después: node tools/osm_generar.js
const fs = require('fs'),
  path = require('path');
const RAIZ = path.join(__dirname, '..'),
  OSM = path.join(RAIZ, 'recursos', 'osm'),
  ORTO = path.join(RAIZ, 'recursos', 'orto'),
  VEN = path.join(RAIZ, 'vendor', 'orto'),
  UA = 'basket-manager-personal/1.0 (uso personal)',
  H = 2048; // medio lado en metros
const sharp = require(path.join(RAIZ, 'recursos', 'herramientas', 'node_modules', 'sharp'));
(async () => {
  const ids = process.argv.slice(2);
  if (!ids.length) {
    console.log('Uso: node tools/ortofoto.js <id-club> [...]');
    process.exit(1);
  }
  fs.mkdirSync(ORTO, { recursive: true });
  fs.mkdirSync(VEN, { recursive: true });
  for (const id of ids) {
    const c = JSON.parse(fs.readFileSync(path.join(OSM, id + '.json'), 'utf8')),
      k = 110574,
      kx = 111320 * Math.cos((c.lat * Math.PI) / 180),
      bbox = [c.lat - H / k, c.lon - H / kx, c.lat + H / k, c.lon + H / kx].map(v => v.toFixed(6)).join(','),
      orig = path.join(ORTO, id + '_4096.jpg');
    if (!fs.existsSync(orig)) {
      const url =
        'https://www.ign.es/wms-inspire/pnoa-ma?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=OI.OrthoimageCoverage&STYLES=&CRS=EPSG:4326&BBOX=' +
        bbox +
        '&WIDTH=4096&HEIGHT=4096&FORMAT=image/jpeg';
      const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(300000) });
      if (!r.ok || !/jpeg/.test(r.headers.get('content-type') || '')) {
        console.log('SIN DATOS', id, r.status);
        continue;
      }
      fs.writeFileSync(orig, Buffer.from(await r.arrayBuffer()));
    }
    await sharp(orig)
      .resize(2048, 2048)
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(path.join(VEN, id + '.jpg'));
    const raw = await sharp(orig).resize(2048, 2048).removeAlpha().raw().toBuffer();
    fs.writeFileSync(path.join(ORTO, id + '.rgb'), raw);
    console.log(id, 'ortofoto', Math.round(fs.statSync(path.join(VEN, id + '.jpg')).size / 1024) + ' KB en vendor/orto');
  }
})();
