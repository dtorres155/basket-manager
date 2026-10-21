// Rutina y necesidades (punto 58): ligera, opcional y nunca punitiva: acotada, se puede desactivar sin cambios, y las acciones de los muebles recuperan energía y comida.
global.window = global;
global.THREE = require('./tools/three_node');
require('./load.js')(['core', 'datos_util', 'hogar', 'interaccion', 'rutina']);
const GM = global.GM,
  R = GM.rutina,
  U = GM.util,
  assert = require('assert');
assert(R.selfTest(), 'rutina.selfTest');
const mk = () => ({
  modo: 'carrera',
  fecha: '2026-10-05',
  clubId: 'a',
  equipos: { a: { id: 'a', ciudad: 'X', pais: 'ES', reputacion: 80, plantilla: ['yo'] } },
  noticias: [],
  jugadores: { yo: { id: 'yo', estado: { fatiga: 30, moral: 60 }, xp: 0, edad: 22 } },
  carrera: { moral: 60, dinero: 50, fama: 20, fase: 'pro', hitos: [], social: { contactos: [{ tipo: 'familia', rel: 50 }] }, historial: [] }
});
GM.noticia = () => {};
GM.mods.mercado = GM.mods.mercado || { ligaDe: () => 'ACB' };
GM.mods.carrera = GM.mods.carrera || {};
// 1) un mes con el plan por defecto: todo acotado
const st = mk();
GM.state = st;
const r = R.estado(st);
for (let i = 0; i < 30; i++) {
  st.fecha = U.addDays(st.fecha, 1);
  R.dia(st);
}
assert(r.energia >= 0 && r.energia <= 100 && r.hambre >= 0 && r.hambre <= 100, 'energía y comida acotadas');
assert(Math.abs(st.carrera.moral - 60) <= 12, 'el ánimo apenas se mueve (' + st.carrera.moral + ')');
assert(r.hist.length === 30, 'historial de días');
// 2) un plan sin comer deja poca comida, pero el castigo está acotado
const st2 = mk();
GM.state = st2;
const r2 = R.estado(st2);
r2.plan = ['entrenar', 'entrenar', 'entrenar', 'entrenar'];
const f0 = st2.jugadores.yo.estado.fatiga,
  m0 = st2.carrera.moral;
for (let i = 0; i < 10; i++) {
  st2.fecha = U.addDays(st2.fecha, 1);
  R.dia(st2);
}
assert(r2.hambre < 15 && r2.energia < 15, 'sin comer ni descansar');
assert(st2.jugadores.yo.estado.fatiga - f0 <= 10 * 2 + 0.01 && m0 - st2.carrera.moral <= 4.01, 'castigo acotado');
// 3) desactivada, el juego no cambia
const st3 = mk();
GM.state = st3;
R.estado(st3).activa = false;
const m3 = st3.carrera.moral,
  f3 = st3.jugadores.yo.estado.fatiga;
for (let i = 0; i < 10; i++) {
  st3.fecha = U.addDays(st3.fecha, 1);
  R.dia(st3);
}
assert(st3.carrera.moral === m3 && st3.jugadores.yo.estado.fatiga === f3 && st3.carrera.dinero === 50, 'desactivada no hace nada');
// 4) el reloj del mundo: pasan horas y baja la comida; una acción de comer la recupera
const st4 = mk();
GM.state = st4;
const r4 = R.estado(st4);
R.tick(st4, 8);
R.tick(st4, 12);
assert(r4.hambre < 55 && r4.energia < 76, 'pasan cuatro horas');
const h0 = r4.hambre;
GM.mods.hogar.aplicar(st4, { hambre: 55, moral: 1 });
assert(r4.hambre > h0 + 40, 'cocinar recupera comida');
R.tick(st4, 3);
assert(R.estado(st4).horaPrev === 3, 'el reloj puede reiniciarse (nuevo día)');
// 5) las acciones de los muebles llevan energía y comida
const dorm = GM.interaccion.defDe('bedDouble').acc.find(a => a.id === 'dormir'),
  coc = GM.interaccion.defDe('kitchenStove').acc[0];
assert(dorm.ef.energia >= 60 && coc.ef.hambre >= 50, 'efectos en los muebles');
// 6) en otros modos no hace nada
assert(R.estado({ modo: 'gestor' }) === null, 'solo carrera');
console.log('OK t_rutina');
