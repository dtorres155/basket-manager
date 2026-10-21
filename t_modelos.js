// Punto 79: ningún modelo de vendor/modelos supera su presupuesto de triángulos y de peso (tools/modelos_presupuesto.js)
const R = require('./tools/modelos_presupuesto');
const filas = R.revisar(),
  fuera = filas.filter(x => x.error || !x.pasa);
fuera.forEach(x => console.log('FALLA', x.rel, x.error || x.tris + ' triángulos, ' + x.kb + ' KB'));
console.log(filas.length + ' modelos, ' + fuera.length + ' fuera de presupuesto');
process.exit(fuera.length ? 1 : 0);
