// Relieve fino (punto 147 de la hoja de ruta 2): modelo digital del terreno del IGN (MDT de 25 m, CC BY 4.0 scne.es, servicio WCS) en una
// cuadrícula de 137 x 137 puntos cada 50 m (6,8 x 6,8 km) alrededor del pabellón. Sustituye a la de Open-Meteo (17 x 17 cada 125 m, 2 km):
// el relieve ya no se estira desde el borde a partir de 1 km (el mar, la costa y el suelo lejano quedan a su altura).
// Solo España. Uso: node tools/mdt.js <id-club> [...]   -> recursos/osm/<id>.mdt.json ({ n, paso, h }, de oeste a este y de norte a sur;
// el mar, a 0). Después node tools/osm_generar.js
const fs = require('fs'),
  path = require('path');
const OSM = path.join(__dirname, '..', 'recursos', 'osm'),
  N = 137,
  PASO = 50;
(async () => {
  const ids = process.argv.slice(2);
  if (!ids.length) {
    console.log('Uso: node tools/mdt.js <id-club> [...]');
    process.exit(1);
  }
  for (const id of ids) {
    const c = JSON.parse(fs.readFileSync(path.join(OSM, id + '.json'), 'utf8')),
      k = 110574,
      kx = 111320 * Math.cos((c.lat * Math.PI) / 180),
      h = ((N - 1) / 2) * PASO,
      // los centros de las celdas de los extremos caen a ±h: la petición cubre media celda más
      m = PASO / 2,
      url =
        'https://servicios.idee.es/wcs-inspire/mdt?SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage&COVERAGEID=Elevacion4258_25' +
        '&SUBSET=Lat(' +
        (c.lat - (h + m) / k).toFixed(6) +
        ',' +
        (c.lat + (h + m) / k).toFixed(6) +
        ')&SUBSET=Long(' +
        (c.lon - (h + m) / kx).toFixed(6) +
        ',' +
        (c.lon + (h + m) / kx).toFixed(6) +
        ')&FORMAT=application/asc&SCALESIZE=Long(' +
        N +
        '),Lat(' +
        N +
        ')',
      r = await fetch(url, { signal: AbortSignal.timeout(120000) });
    const txt = r.ok ? await r.text() : '';
    const ini = txt.indexOf('ncols');
    if (ini < 0) {
      console.log('SIN DATOS', id, r.status);
      continue;
    }
    const lineas = txt.slice(ini).split('\n'),
      cab = {};
    let i = 0;
    for (; i < lineas.length; i++) {
      const m2 = lineas[i].trim().match(/^([a-zA-Z_]+)\s+(-?[\d.]+)$/);
      if (!m2) break;
      cab[m2[1].toLowerCase()] = +m2[2];
    }
    const vals = lineas
      .slice(i)
      .join(' ')
      .split(/\s+/)
      .filter(s => /^-?[\d.]+$/.test(s))
      .map(Number)
      .slice(0, cab.ncols * cab.nrows);
    if (cab.ncols !== N || cab.nrows !== N || vals.length !== N * N) {
      console.log('FORMATO INESPERADO', id, cab.ncols, cab.nrows, vals.length);
      continue;
    }
    const nd = cab.nodata_value,
      hs = vals.map(v => (v === nd || v < -50 ? 0 : Math.round(v * 10) / 10));
    fs.writeFileSync(path.join(OSM, id + '.mdt.json'), JSON.stringify({ id, n: N, paso: PASO, h: hs }));
    console.log(id, 'relieve fino de ' + Math.min(...hs) + ' a ' + Math.max(...hs) + ' m');
  }
})();
