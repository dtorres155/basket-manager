// Gestión del pueblo (punto 56): presupuesto, servicios, población, vecinos que piden cosas, asociaciones, fiestas; y en diez temporadas el pueblo sube de nivel.
global.window = global;
global.THREE = require('./tools/three_node');
require('./load.js')(['core', 'datos_util', 'pueblo', 'pueblo_gestion']);
const GM = global.GM,
  G = GM.puebloGestion,
  U = GM.util,
  assert = require('assert');
GM.noticia = () => {};
GM.mods.carrera = { gradoFama: c => ({ idx: Math.floor(c.fama / 20) }) };
assert(G.selfTest(), 'puebloGestion.selfTest');
const mk = () => ({
  modo: 'carrera',
  fecha: '2026-10-01',
  clubId: 'a',
  equipos: { a: { id: 'a', nombre: 'A', ciudad: 'X' } },
  noticias: [],
  jugadores: { yo: { nombre: 'Marc Soler', nac: 'ES', ovr: 70, edad: 22 } },
  carrera: { dinero: 300, fama: 35, moral: 60, fase: 'pro', hitos: [], social: null }
});
GM.noticia = (st, t) => st.noticias.push(t);
function corre(st, meses, hazlo) {
  for (let i = 0; i < meses; i++) {
    st.fecha = U.addDays(st.fecha, 30);
    GM.bus.emit('dia:avanzado', {});
    st.fecha = st.fecha.slice(0, 8) + '15';
    GM.bus.emit('dia:avanzado', {});
    if (hazlo) hazlo(st, i);
  }
}
// 1) un pueblo bien gobernado crece y sube de nivel en diez temporadas; uno abandonado, no
const bueno = mk();
GM.state = bueno;
GM.mods.pueblo.nuevaPartida(bueno);
const g0 = G.gest(bueno).pob;
const n0 = GM.mods.pueblo.nivel(bueno);
corre(bueno, 120, (st, i) => {
  if (i % 6 === 0) G.donar(st, 5);
  const p = G.gest(st).peticiones[0];
  if (p) G.apoyar(st, p.id);
  if (i === 2) ['basket', 'ampa', 'banda'].forEach(t => G.fundar(st, t));
  st.carrera.fama = Math.min(80, st.carrera.fama + 0.4);
  st.carrera.dinero += 30;
});
const malo = mk();
GM.state = malo;
GM.mods.pueblo.nuevaPartida(malo);
corre(malo, 120);
const rb = G.resumen(bueno),
  rm = G.resumen(malo);
assert(rb.pob > g0 * 1.6, 'el pueblo bien gobernado crece: ' + g0 + ' a ' + rb.pob);
assert(GM.mods.pueblo.estado(bueno).nivel > n0, 'sube de nivel');
assert(rb.pob > rm.pob * 1.25 && rb.cal > rm.cal, 'abandonado va peor: ' + JSON.stringify([rb.pob, rm.pob, rb.cal, rm.cal]));
// 2) decisiones
const st = mk();
GM.state = st;
GM.mods.pueblo.nuevaPartida(st);
const g = G.gest(st);
assert(G.asignar(st, 'colegio', 45).ok && g.asig.colegio === 45 && Object.values(g.asig).reduce((a, b) => a + b, 0) === 100, 'reparto del presupuesto');
const caja0 = g.caja;
assert(G.donar(st, 10).ok && g.caja === caja0 + 10 && st.carrera.dinero === 290, 'donar');
assert(!G.donar(st, 9999).ok, 'no puedes donar lo que no tienes');
assert(G.subvencion(st).ok && !G.subvencion(st).ok, 'subvención cada seis meses');
corre(st, 18);
assert(g.peticiones.length > 0 || st.noticias.some(n => /pide ayuda/.test(n)), 'los vecinos piden cosas');
assert(G.fundar(st, 'basket').ok && !G.fundar(st, 'basket').ok && G.cerrarAsoc(st, 'basket').ok, 'asociaciones');
assert(G.presupuestoFiesta(st, 'mayor', 3).ok && g.fiestas.mayor === 3, 'fiestas');
assert(
  st.noticias.some(n => /celebra/.test(n)),
  'se celebran fiestas'
);
console.log('OK t_pueblo_gestion (bien gobernado: ' + g0 + ' a ' + rb.pob + ' habitantes, ' + GM.mods.pueblo.estado(bueno).etiqueta + '; abandonado: ' + rm.pob + ')');
