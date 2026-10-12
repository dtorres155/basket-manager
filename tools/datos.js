// Cadena de datos reproducible. Uso: node tools/datos.js <orden> [ids...]
//   descargar [ids]  edificios y calles de cada club (Nominatim + Overpass) -> recursos/osm/<id>.json (corrige centros en recursos/osm/centros.json)
//   poi [ids]        comercios, árboles, paradas, mobiliario y uso del suelo -> .poi.json
//   anillo [ids]     anillo lejano de 300 a 480 m -> .ring.json
//   generar          compacta todo en vendor/osm/<id>.json (con latitud y longitud, clave g)
//   validar          lista los clubes con datos insuficientes (menos de 10 edificios o 20 tramos de calle) y los que no tienen .poi o .ring
//   creditos         regenera la tabla de CREDITOS.md desde docs/licencias.json
//   todo             descargar + poi + anillo + generar + validar (solo los clubes que falten, o los indicados)
const { spawnSync } = require('child_process'), fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..'), [orden, ...ids] = process.argv.slice(2);
const corre = (script, args) => { const r = spawnSync(process.execPath, [path.join(__dirname, script), ...args], { stdio: 'inherit', cwd: raiz }); if (r.status) { console.log('falló', script); process.exit(r.status); } };
function validar() {
  const dir = path.join(raiz, 'vendor', 'osm'), mal = [], sinExtra = [];
  for (const f of fs.readdirSync(dir).filter(n => n.endsWith('.json'))) {
    const id = f.replace('.json', ''), d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (!d.g) mal.push(id + ': sin latitud (regenera)'); else if (d.e.length < 10 || d.c.length < 20) mal.push(id + ': ' + d.e.length + ' edificios, ' + d.c.length + ' tramos de calle (usará la calle inventada)');
    for (const x of ['.poi.json', '.ring.json']) if (!fs.existsSync(path.join(raiz, 'recursos', 'osm', id + x))) sinExtra.push(id + x);
  }
  console.log(mal.length ? 'Datos insuficientes:\n  ' + mal.join('\n  ') : 'Todos los clubes tienen datos suficientes'); if (sinExtra.length) console.log('Faltan archivos:', sinExtra.join(', '));
}
function creditos() {
  const rows = JSON.parse(fs.readFileSync(path.join(raiz, 'docs', 'licencias.json'), 'utf8')), f = path.join(raiz, 'CREDITOS.md'), t = fs.readFileSync(f, 'utf8').split('\n');
  const i = t.findIndex(l => /^\| Recurso/.test(l)); let j = i; while (/^\|/.test(t[j + 1] || '')) j++;
  const tabla = ['| Recurso | Autor | Licencia | Dónde |', '|---|---|---|---|'].concat(rows.map(r => '| ' + [r.recurso, r.autor, r.licencia, r.donde].join(' | ') + ' |'));
  t.splice(i, j - i + 1, ...tabla); fs.writeFileSync(f, t.join('\n')); console.log('CREDITOS.md con', rows.length, 'recursos');
}
if (orden === 'descargar') corre('osm_descargar.js', ids); else if (orden === 'poi') corre('osm_descargar2.js', ids); else if (orden === 'anillo') corre('osm_descargar3.js', ids);
else if (orden === 'generar') corre('osm_generar.js', []); else if (orden === 'validar') validar(); else if (orden === 'creditos') creditos();
else if (orden === 'todo') { corre('osm_descargar.js', ids); corre('osm_descargar2.js', ids); corre('osm_descargar3.js', ids); corre('osm_generar.js', []); validar(); }
else console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(0, 9).join('\n'));
