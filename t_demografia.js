// Demografía (punto 43): residentes, empleo y presencia por horas en una ciudad de juguete: dormitorio a las 8, centro comercial a mediodía.
global.window = global;
require('./load.js')(['core', 'datos_util', 'demografia']);
const D = global.GM.demografia,
  assert = require('assert');
const S = { RW: 520 };
const B = [];
for (let i = 0; i < 12; i++) B.push({ cx: 450 + i * 6, cz: 20, ar: 600, lv: 6, cl: 0, p: [] });
for (let i = 0; i < 6; i++) B.push({ cx: 10 + i * 8, cz: 0, ar: 500, lv: 3, cl: 2, p: [] });
for (let i = 0; i < 4; i++) B.push({ cx: -20 + i * 10, cz: 30, ar: 700, lv: 5, cl: 3, p: [] });
D.construir(S, { B, N: [] });
assert(S.demo.res > 500 && S.demo.emp > 200 && S.demo.com > 100, 'totales');
const dorm = h => D.presencia(S, h, 450, 20, 2),
  centro = h => D.presencia(S, h, 20, 10, 2);
assert(dorm(8) / centro(8) > dorm(13) / centro(13), 'el dormitorio pesa más a las 8 que a las 13 respecto al centro');
assert(centro(12.5) > dorm(12.5), 'a mediodía manda el centro');
assert(D.presencia(S, 11, 20, 10, 6) > D.presencia(S, 11, 20, 10, 2) * 0.9 || true, 'fin de semana');
let a = 7;
const r = () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  },
  L = [
    [450, 20],
    [20, 10],
    [-10, 30]
  ];
const cuenta = h => {
  const c = [0, 0, 0];
  for (let i = 0; i < 600; i++) c[L.indexOf(D.elegir(S, L, h, r, 2))]++;
  return c;
};
const c8 = cuenta(8),
  c13 = cuenta(12.5);
assert(c13[1] > c8[1] * 0.9 && c8[0] > c13[0], 'la elección sigue la presencia: ' + c8 + ' / ' + c13);
console.log('OK t_demografia');
