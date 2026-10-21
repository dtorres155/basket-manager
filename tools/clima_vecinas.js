// Completa datos_clima.js: las ciudades sin datos propios (el servicio limitó las peticiones) copian el clima de la ciudad con datos más cercana (hasta 300 km),
// con las temperaturas corregidas por la diferencia de latitud (0,6 °C por grado) y marcadas como aproximadas. Uso: node tools/clima_vecinas.js
const fs = require('fs'),
  path = require('path');
const raiz = path.join(__dirname, '..');
const reales = JSON.parse(fs.readFileSync(path.join(raiz, 'recursos', 'datos_clima.json'), 'utf8')),
  osm = id => JSON.parse(fs.readFileSync(path.join(raiz, 'vendor', 'osm', id + '.json'), 'utf8')).g;
const km = (a, b) => {
  const r = Math.PI / 180,
    dx = (b[1] - a[1]) * Math.cos(((a[0] + b[0]) / 2) * r),
    dy = b[0] - a[0];
  return Math.hypot(dx, dy) * 111.2;
};
const todos = fs
    .readdirSync(path.join(raiz, 'vendor', 'osm'))
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', '')),
  con = Object.keys(reales),
  salida = JSON.parse(JSON.stringify(reales)),
  aprox = [];
for (const id of todos) {
  if (reales[id]) continue;
  const g = osm(id);
  let mejor = null,
    md = 1e9;
  for (const o of con) {
    const d = km(g, osm(o));
    if (d < md) {
      md = d;
      mejor = o;
    }
  }
  if (!mejor || md > 300) {
    console.log('sin vecina', id, Math.round(md));
    continue;
  }
  const dl = (osm(mejor)[0] - g[0]) * 0.6;
  salida[id] = reales[mejor].map(r => [Math.round(r[0] + dl), Math.round(r[1] + dl), r[2], r[3]]);
  aprox.push(id + '<-' + mejor + ' (' + Math.round(md) + ' km)');
}
fs.writeFileSync(
  path.join(raiz, 'datos_clima.js'),
  '/* Clima medio por ciudad y mes (2015-2024): [máxima, mínima, % de días de lluvia, % de días de nieve]. Datos: Open-Meteo.com (reanálisis ERA5, Copernicus), CC BY 4.0. Generado por tools/clima_datos.js; las ciudades sin datos propios copian la vecina más cercana (tools/clima_vecinas.js): ' +
    aprox.join(', ') +
    ' */\n(function () { GM.climaCiudad = ' +
    JSON.stringify(salida) +
    '; })();\n'
);
console.log('reales', con.length, 'aproximadas', aprox.length, '\n' + aprox.join('\n'));
