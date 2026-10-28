// Catastro (punto 145 de la hoja de ruta 2): edificios y partes de edificio del Catastro (INSPIRE, ATOM por municipio; toda España salvo
// el País Vasco y Navarra) con el número exacto de plantas de cada parte, su uso y su año. Baja el ZIP del municipio, lo pasa de UTM
// (ETRS89) a las coordenadas del juego (metros desde el pabellón) y guarda lo que cae a menos de 1,4 km en recursos/osm/<id>.cat.json:
//   { p: [[plantas, edificio, x0, z0, ...]], b: [[uso, año, x0, z0, ...]] }   (décimas de metro; «edificio» es el índice en b)
// uso: 0 otro, 1 vivienda, 2 comercio, 3 oficina, 4 servicio público, 5 industria, 6 agrario. Después: node tools/osm_generar.js, que
// sustituye los volúmenes de OpenStreetMap por los del Catastro.
// Uso: node tools/catastro.js <id-club> <código INE de 5 cifras> [<código INE> ...]   (Badalona: 08015). Datos © Dirección General del Catastro.
const fs = require('fs'),
  path = require('path'),
  { execFileSync } = require('child_process');
const RAIZ = path.join(__dirname, '..'),
  DIR = path.join(RAIZ, 'recursos', 'catastro'),
  OSM = path.join(RAIZ, 'recursos', 'osm'),
  UA = 'basket-manager-personal/1.0 (uso personal)',
  RADIO = 1400;
// UTM (ETRS89 / GRS80) a latitud y longitud
function utm(E, N, zona) {
  const a = 6378137,
    f = 1 / 298.257222101,
    k0 = 0.9996,
    e2 = f * (2 - f),
    ep2 = e2 / (1 - e2),
    x = E - 500000,
    mu = N / k0 / (a * (1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 ** 3) / 256)),
    e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2)),
    p1 =
      mu +
      ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu) +
      ((21 * e1 * e1) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu) +
      ((151 * e1 ** 3) / 96) * Math.sin(6 * mu) +
      ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu),
    s = Math.sin(p1),
    c = Math.cos(p1),
    N1 = a / Math.sqrt(1 - e2 * s * s),
    T1 = Math.tan(p1) ** 2,
    C1 = ep2 * c * c,
    R1 = (a * (1 - e2)) / Math.pow(1 - e2 * s * s, 1.5),
    D = x / (N1 * k0),
    lat =
      p1 -
      ((N1 * Math.tan(p1)) / R1) *
        ((D * D) / 2 - ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D ** 4) / 24 + ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * D ** 6) / 720),
    lon =
      (((zona - 1) * 6 - 180 + 3) * Math.PI) / 180 + (D - ((1 + 2 * T1 + C1) * D ** 3) / 6 + ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * D ** 5) / 120) / c;
  return [(lat * 180) / Math.PI, (lon * 180) / Math.PI];
}
const USO = { '1_residential': 1, '4_2_retail': 2, '4_1_office': 3, '4_3_publicServices': 4, '3_industrial': 5, '2_agriculture': 6 };
async function bajar(ine) {
  const carpeta = path.join(DIR, ine);
  if (fs.existsSync(path.join(carpeta, 'A.ES.SDGC.BU.' + ine + '.buildingpart.gml'))) return carpeta;
  fs.mkdirSync(DIR, { recursive: true });
  const prov = ine.slice(0, 2),
    feed = await (await fetch('https://www.catastro.hacienda.gob.es/INSPIRE/buildings/' + prov + '/ES.SDGC.bu.atom_' + prov + '.xml', { headers: { 'User-Agent': UA } })).text(),
    m = feed.match(new RegExp('https?://[^"<\\s]*/' + ine + '-[^"<\\s]*\\.zip'));
  if (!m) throw new Error('no está el municipio ' + ine + ' en el Catastro');
  const zip = path.join(DIR, ine + '.zip'),
    r = await fetch(m[0], { headers: { 'User-Agent': UA } });
  fs.writeFileSync(zip, Buffer.from(await r.arrayBuffer()));
  fs.mkdirSync(carpeta, { recursive: true });
  execFileSync('unzip', ['-o', '-q', zip, '-d', carpeta]);
  return carpeta;
}
// recorre los featureMember de un GML grande sin cargar un árbol XML
function* miembros(txt) {
  let i = 0;
  for (;;) {
    const a = txt.indexOf('<gml:featureMember>', i);
    if (a < 0) return;
    const b = txt.indexOf('</gml:featureMember>', a);
    yield txt.slice(a, b);
    i = b + 1;
  }
}
const anillo = bloque => {
  const m = bloque.match(/<gml:exterior>[\s\S]*?<gml:posList[^>]*>([^<]+)<\/gml:posList>/);
  if (!m) return null;
  const v = m[1].trim().split(/\s+/).map(Number),
    p = [];
  for (let i = 0; i + 1 < v.length; i += 2) p.push([v[i], v[i + 1]]);
  if (p.length > 1 && p[0][0] === p[p.length - 1][0] && p[0][1] === p[p.length - 1][1]) p.pop();
  return p.length >= 3 ? p : null;
};
(async () => {
  const [id, ...ines] = process.argv.slice(2);
  if (!id || !ines.length) {
    console.log('Uso: node tools/catastro.js <id-club> <código INE> [...]');
    process.exit(1);
  }
  const C = JSON.parse(fs.readFileSync(path.join(OSM, id + '.json'), 'utf8')),
    k = 110574,
    kx = 111320 * Math.cos((C.lat * Math.PI) / 180),
    local = (E, N, zona) => {
      const [la, lo] = utm(E, N, zona);
      return [(lo - C.lon) * kx, -(la - C.lat) * k];
    },
    dm = v => Math.round(v * 10),
    res = { p: [], b: [] },
    idx = new Map();
  for (const ine of ines) {
    const carpeta = await bajar(ine),
      tb = fs.readFileSync(path.join(carpeta, 'A.ES.SDGC.BU.' + ine + '.building.gml'), 'utf8'),
      zona = +((tb.match(/EPSG::258(\d\d)/) || [])[1] || 31);
    let nb = 0;
    for (const f of miembros(tb)) {
      const idm = f.match(/<base:localId>([^<]+)<\/base:localId>/),
        g = anillo(f);
      if (!idm || !g) continue;
      const p = g.map(q => local(q[0], q[1], zona));
      if (!p.some(q => Math.hypot(q[0], q[1]) < RADIO)) continue;
      const uso = USO[(f.match(/<bu-ext2d:currentUse>([^<]+)</) || [])[1]] || 0,
        anio = +((f.match(/<bu-core2d:beginning>(\d{4})/) || [])[1] || 0);
      idx.set(idm[1], res.b.length);
      res.b.push([uso, anio].concat(...p.map(q => [dm(q[0]), dm(q[1])])));
      nb++;
    }
    const tp = fs.readFileSync(path.join(carpeta, 'A.ES.SDGC.BU.' + ine + '.buildingpart.gml'), 'utf8');
    let np = 0;
    for (const f of miembros(tp)) {
      const idm = f.match(/<base:localId>([^<]+)<\/base:localId>/),
        pl = f.match(/<bu-ext2d:numberOfFloorsAboveGround>(\d+)</),
        g = anillo(f);
      if (!idm || !g) continue;
      const ed = idx.get(idm[1].replace(/_part\d+$/, ''));
      if (ed === undefined) continue;
      const p = g.map(q => local(q[0], q[1], zona));
      res.p.push([pl ? +pl[1] : 0, ed].concat(...p.map(q => [dm(q[0]), dm(q[1])])));
      np++;
    }
    console.log(ine, nb + ' edificios y ' + np + ' partes a menos de ' + RADIO + ' m');
  }
  const out = path.join(OSM, id + '.cat.json');
  fs.writeFileSync(out, JSON.stringify(res));
  console.log('guardado', path.relative(RAIZ, out), Math.round(fs.statSync(out).size / 1024) + ' KB');
})();
