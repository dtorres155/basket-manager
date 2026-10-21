// Extrae de las pantallas del juego los textos fijos en español (los literales entre comillas que parecen frases) y mide cuántos tienen ya traducción al catalán y al inglés (i18n_datos.js).
// Escribe docs/TEXTOS.json (texto, veces, archivos) para traducirlos en bloque. Uso: node tools/i18n_extraer.js [--sin-traducir] [--max=N]
const fs = require('fs'),
  path = require('path');
const raiz = path.join(__dirname, '..');
require(path.join(raiz, 'load'))(['core', 'i18n_datos', 'datos_i18n', 'i18n']);
const archivos = fs
  .readdirSync(raiz)
  .filter(
    f =>
      /.js$/.test(f) &&
      !/^(datos_|t_|i18n|three|load|build|test_all|serve|eslint|vehiculos|mobiliario|monumentos|calle_real|relieve|texturas|urbano|nav_worker|multitud|kit)/.test(f)
  );
const acorn = require('acorn'),
  cuenta = {};
const sirve = t =>
  /[a-záéíóúñ]{3}/i.test(t) &&
  /\s|^[A-ZÁÉÍÓÚÑ]/.test(t) &&
  !/[{}<>=;]|\.js|\.png|https?:|^#|^\.|\dpx\b|\$\{/.test(t) &&
  !/^[a-z0-9_.#:\-/[\]=,>*( )]+$/.test(t) &&
  !/^[a-z]+[A-Z]/.test(t) &&
  t.length >= 4 &&
  t.length <= 120;
archivos.forEach(f => {
  let ast;
  try {
    ast = acorn.parse(fs.readFileSync(path.join(raiz, f), 'utf8'), { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true });
  } catch (e) {
    return;
  }
  const visita = n => {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'Literal' && typeof n.value === 'string' && sirve(n.value.trim())) {
      const t = n.value.trim().replace(/\s+/g, ' ');
      const e = cuenta[t] || (cuenta[t] = { texto: t, veces: 0, archivos: [] });
      e.veces++;
      if (e.archivos.indexOf(f) < 0 && e.archivos.length < 3) e.archivos.push(f);
    }
    for (const k in n) {
      const v = n[k];
      if (Array.isArray(v)) v.forEach(visita);
      else if (v && typeof v.type === 'string') visita(v);
    }
  };
  visita(ast);
});
const lista = Object.values(cuenta).sort((a, b) => b.veces - a.veces);
const traduce = (t, l) => {
  GM.i18n.setIdioma(l);
  const r = GM.i18n.t(t) !== t;
  GM.i18n.setIdioma('es');
  return r;
};
lista.forEach(e => {
  e.ca = traduce(e.texto, 'ca');
  e.en = traduce(e.texto, 'en');
});
const ca = lista.filter(e => e.ca).length,
  en = lista.filter(e => e.en).length;
fs.writeFileSync(path.join(raiz, 'docs', 'TEXTOS.json'), JSON.stringify(lista, null, 1));
console.log(
  archivos.length +
    ' archivos, ' +
    lista.length +
    ' textos distintos; con traducción: catalán ' +
    ca +
    ' (' +
    Math.round((ca / lista.length) * 100) +
    ' %), inglés ' +
    en +
    ' (' +
    Math.round((en / lista.length) * 100) +
    ' %)'
);
if (process.argv.includes('--sin-traducir')) {
  const max = +(process.argv.find(a => a.startsWith('--max=')) || '--max=60').split('=')[1];
  lista
    .filter(e => !e.ca)
    .slice(0, max)
    .forEach(e => console.log(e.veces + '  ' + e.texto));
}
