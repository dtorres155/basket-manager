// Casas como producto (punto 52): valor que sube o baja con el barrio y el estado, obras con fases, averías, vecinos y venta con beneficio o pérdida.
global.window = global;
global.THREE = require('./tools/three_node');
require('./load.js')(['core', 'datos_util', 'hogar', 'casas_producto']);
const GM = global.GM,
  CP = GM.casasProd,
  assert = require('assert');
assert(CP.selfTest(), 'casasProd.selfTest');
const st = {
  modo: 'gestor',
  fecha: '2026-10-01',
  clubId: 'a',
  equipos: { a: { id: 'a', ciudad: 'X', reputacion: 90, plantilla: ['p1'] } },
  jugadores: { p1: { id: 'p1', edad: 25, xp: 0, estado: { moral: 60, fatiga: 20 } } },
  historial: [],
  ligas: { ACB: { equipos: ['a'] } },
  noticias: [],
  hogar: {
    ahorros: 900,
    casa: { id: 'h1', tipo: 'casa', modo: 'compra', barrio: 1, barrioNombre: 'Centro', ciudad: 'X', precio: 900, desde: '2026-10-01' },
    muebles: {},
    propiedades: []
  }
};
GM.mods.mercado = GM.mods.mercado || { ligaDe: () => 'ACB' };
GM.noticia = GM.noticia || ((s, t) => s.noticias.push(t));
const p = st.hogar.casa;
assert(CP.valor(st, p) > 800, 'valor inicial');
// reforma: se paga, dura, termina y sube el valor
const d0 = GM.mods.hogar.dinero(st),
  v0 = CP.valor(st, p),
  r = CP.encargar(st, 'h1', 'piscina');
assert(r.ok && GM.mods.hogar.dinero(st) < d0, 'encargar piscina');
assert(!CP.encargar(st, 'h1', 'cocina').ok, 'una sola obra a la vez');
const P = CP.ini(st, p);
assert(P.obras.length === 1 && CP.avance(st, P.obras[0]).t === 0, 'fase 0');
st.fecha = '2026-10-20';
CP.dia(st);
assert(P.obras.length === 1 && CP.avance(st, P.obras[0]).t > 0.5, 'a mitad de obra');
st.fecha = '2026-10-27';
CP.dia(st);
assert(P.obras.length === 0 && P.extras.piscina && P.mejoras.length === 1, 'obra terminada');
assert(CP.valor(st, p) > v0 - 5, 'la mejora mantiene valor');
assert(CP.encargar(st, 'h1', 'piscina').motivo === 'Ya lo tienes.' || !CP.encargar(st, 'h1', 'piscina').ok, 'no se repite');
// mantenimiento y averías a lo largo de dos años
const e0 = P.estado;
let averias = 0;
for (let i = 0; i < 36; i++) {
  const d = new Date(Date.UTC(2026, 10 + i, 1));
  st.fecha = d.toISOString().slice(0, 10);
  CP.dia(st);
  averias = Math.max(averias, P.averias.length);
}
assert(P.estado < e0 - 10, 'se desgasta: ' + e0 + ' a ' + P.estado);
assert(averias >= 1, 'alguna avería en tres años');
if (P.averias.length) {
  const a = P.averias[0];
  GM.mods.hogar.gastar(st, -50);
  const rr = CP.reparar(st, 'h1', a.id);
  assert(rr.ok && P.averias.indexOf(a) < 0, 'reparar');
}
// vecinos
const d1 = GM.mods.hogar.dinero(st);
assert(CP.cafe(st, 'h1', 0).ok && GM.mods.hogar.dinero(st) < d1 && !CP.cafe(st, 'h1', 0).ok, 'café con un vecino y una vez por semana');
// venta: beneficio o pérdida
const res = CP.ficha(st, p),
  venta = CP.vender(st, 'h1');
assert(venta.ok && typeof venta.resultado === 'number' && !st.hogar.casa, 'vender: ' + JSON.stringify(venta));
assert(Math.abs(venta.resultado - res.resultado) < 0.2, 'el resultado anunciado es el real');
console.log('OK t_casas_producto (valor ' + res.valor + ', resultado ' + venta.resultado + ')');
