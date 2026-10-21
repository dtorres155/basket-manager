// Clima medio de cada ciudad (2015-2024) desde Open-Meteo (reanálisis ERA5 de Copernicus, CC BY 4.0) -> datos_clima.js
// Con --esperar reintenta cada 5 minutos hasta una hora por ciudad si el servicio limita las peticiones. Por mes: [máxima media, mínima media, % de días con lluvia (>= 1 mm), % de días con nieve]. Uso: node tools/clima_datos.js [ids...]
const fs = require('fs'),
  path = require('path');
const raiz = path.join(__dirname, '..');
const dormir = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const sel = process.argv.slice(2).filter(x => !x.startsWith('--')),
    ids = fs
      .readdirSync(path.join(raiz, 'vendor', 'osm'))
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''))
      .filter(id => !sel.length || sel.includes(id));
  const salida = fs.existsSync(path.join(raiz, 'recursos', 'datos_clima.json')) ? JSON.parse(fs.readFileSync(path.join(raiz, 'recursos', 'datos_clima.json'), 'utf8')) : {};
  for (const id of ids) {
    if (salida[id] && !sel.length) continue;
    const g = JSON.parse(fs.readFileSync(path.join(raiz, 'vendor', 'osm', id + '.json'), 'utf8')).g;
    if (!g) continue;
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${g[0]}&longitude=${g[1]}&start_date=2015-01-01&end_date=2024-12-31&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum&timezone=UTC`;
    let j = null;
    const ESPERAR = process.argv.includes('--esperar');
    for (let i = 0; i < (ESPERAR ? 60 : 4) && !j; i++) {
      try {
        const r = await fetch(url),
          t = r.ok ? await r.json() : null;
        if (t && t.daily) j = t;
        else if (ESPERAR) {
          console.log('límite del servicio, espero 5 minutos');
          await dormir(300000);
        } else await dormir(15000 * (i + 1));
      } catch (e) {
        await dormir(3000);
      }
    }
    if (!j || !j.daily) {
      console.log('SIN DATOS', id);
      continue;
    }
    const d = j.daily,
      m = Array.from({ length: 12 }, () => ({ n: 0, tx: 0, tn: 0, ll: 0, ni: 0 }));
    d.time.forEach((t, i) => {
      const k = +t.slice(5, 7) - 1,
        o = m[k];
      if (d.temperature_2m_max[i] == null) return;
      o.n++;
      o.tx += d.temperature_2m_max[i];
      o.tn += d.temperature_2m_min[i];
      if (d.precipitation_sum[i] >= 1) {
        if ((d.snowfall_sum[i] || 0) >= 0.3) o.ni++;
        else o.ll++;
      }
    });
    salida[id] = m.map(o => [Math.round(o.tx / o.n), Math.round(o.tn / o.n), Math.round((100 * o.ll) / o.n), Math.round((100 * o.ni) / o.n)]);
    console.log(id.padEnd(24), JSON.stringify(salida[id][0]), JSON.stringify(salida[id][6]));
    await dormir(2500);
    fs.writeFileSync(path.join(raiz, 'recursos', 'datos_clima.json'), JSON.stringify(salida));
  }
  fs.writeFileSync(
    path.join(raiz, 'datos_clima.js'),
    '/* Clima medio por ciudad y mes (2015-2024): [máxima, mínima, % de días de lluvia, % de días de nieve]. Datos: Open-Meteo.com (reanálisis ERA5, Copernicus), CC BY 4.0. Generado por tools/clima_datos.js. */\n(function () { GM.climaCiudad = ' +
      JSON.stringify(salida) +
      '; })();\n'
  );
  console.log('ciudades:', Object.keys(salida).length);
})();
