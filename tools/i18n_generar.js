// Junta las traducciones de datos_i18n/*.json (texto en español -> [catalán, inglés]) en datos_i18n.js, que se carga justo después de i18n_datos.js.
// Las frases enteras entran como «exactas»; las que parecen trozos de una frase (acaban en dos puntos, paréntesis, coma o signo, o empiezan en minúscula o con signo) entran además como fragmentos que se sustituyen dentro de textos más largos.
// Uso: node tools/i18n_generar.js     (después: node tools/i18n_extraer.js para ver la cobertura)
const fs = require('fs'),
  path = require('path');
const raiz = path.join(__dirname, '..'),
  dir = path.join(raiz, 'datos_i18n'),
  E = {};
fs.readdirSync(dir)
  .filter(f => /\.json$/.test(f))
  .sort()
  .forEach(f => {
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    Object.keys(j).forEach(k => {
      if (Array.isArray(j[k]) && j[k].length === 2) E[k] = j[k];
    });
  });
const esFragmento = k => /[:(,+×\-−]\s*$|^[,)(%|.»«]|^[a-záéíóúñ]/.test(k) && k.length >= 4;
const frag = Object.keys(E).filter(esFragmento);
const salida =
  '/* Traducciones al catalán y al inglés generadas por tools/i18n_generar.js a partir de datos_i18n/*.json (no se edita a mano). Se suman a las de i18n_datos.js. */\n(function () {\n  const E = ' +
  JSON.stringify(E) +
  ',\n    F = ' +
  JSON.stringify(frag) +
  ";\n  ['ca', 'en'].forEach((l, i) => {\n    const d = GM.i18nDatos[l];\n    Object.keys(E).forEach(k => {\n      if (d.exacta[k] === undefined) d.exacta[k] = E[k][i];\n    });\n    F.forEach(k => d.frag.push([k, E[k][i]]));\n  });\n})();\n";
fs.writeFileSync(path.join(raiz, 'datos_i18n.js'), salida);
console.log(Object.keys(E).length + ' traducciones, ' + frag.length + ' como fragmentos, ' + Math.round(salida.length / 1024) + ' KB');
