// Encargos y minijuegos en la ciudad (punto 60): generación diaria y semanal, plazos, premios y encargos de visita.
global.window = global;
global.THREE = require('./tools/three_node');
require('./load.js')(['core', 'datos_util', 'hogar', 'ciudad_juego']);
const GM = global.GM,
  J = GM.ciudadJuego,
  U = GM.util,
  assert = require('assert');
assert(J.selfTest(), 'ciudadJuego.selfTest');
GM.noticia = () => {};
GM.state = null;
const st = {
  modo: 'carrera',
  fecha: '2026-10-01',
  clubId: 'a',
  equipos: { a: { id: 'a' } },
  noticias: [],
  jugadores: { yo: { ovr: 70 } },
  carrera: { fama: 40, moral: 50, dinero: 5, cjuego: null },
  hogar: { ahorros: 0 }
};
GM.state = st;
const S = { zonas: ['tienda', 'pena', 'kiosco', 'cancha_0', 'ayuntamiento'].map(id => ({ sala: { id }, obj: { position: { x: 0, z: 0 } } })) };
J.generar(st, S);
const L = J.encargos(st);
assert(L.length === 4 && L.filter(e => e.diario).length === 1, '3 semanales y 1 diario');
assert(
  L.every(e => e.premio.dinero > 0 && e.hasta > st.fecha),
  'premios y plazos'
);
assert(
  L.some(e => e.tipo !== 'visitar' || ['tienda', 'pena', 'kiosco', 'ayuntamiento'].indexOf(e.destino) >= 0),
  'los sitios existen en la escena'
);
// visitar cumple y paga
const v = L.find(e => e.tipo === 'visitar') || ((L[0].tipo = 'visitar'), (L[0].destino = 'tienda'), L[0]);
const d0 = st.carrera.dinero;
GM.bus.emit('sala:abierta', { id: v.destino });
assert(v.hecho && st.carrera.dinero > d0 && J.datos(st).calle > 20, 'visitar cumple');
// el plazo diario caduca y se repone
st.fecha = '2026-10-03';
GM.bus.emit('dia:avanzado', {});
J.generar(st, S);
assert(J.encargos(st).filter(e => e.diario && !e.hecho).length === 1, 'se repone el diario');
assert(J.pendientes(st) >= 3, 'pendientes');
console.log('OK t_ciudad_juego');
