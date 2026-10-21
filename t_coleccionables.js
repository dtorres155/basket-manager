// Coleccionables (punto 61): catálogo con rareza y lugar de aparición, sobres de cromos, cambio de repetidas, camisetas de rivales tras los partidos y balones firmados; usa una partida de carrera completa.
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<div id=app></div>');
global.window = global;
global.document = dom.window.document;
global.THREE = require('./tools/three_node');
const lista = require('fs')
  .readFileSync(__dirname + '/t_vida.js', 'utf8')
  .match(/L\((\[[^\]]*\])/)[1];
const L = require('./load');
L(eval(lista).concat(['estilo', 'movil', 'vida', 'casas_producto', 'economia', 'patrimonio', 'ciudad_juego', 'coleccionables']));
const GM = global.GM,
  K = GM.coleccionables,
  assert = require('assert');
GM.rng.seed(9);
assert(K.selfTest(), 'coleccionables.selfTest');
const st = GM.newGame('unicaja', 9, {
  modo: 'carrera',
  personaje: { nombre: 'Marc', apellido: 'Soler' },
  carrera: { origen: 'europa', clubId: 'unicaja', pos: 'SG', perfil: 'tirador', nac: 'ES', agente: 'dinero' }
});
GM.state = st;
const c = st.carrera;
const cat = K.catalogo(st),
  por = t => cat.filter(x => x.tipo === t);
assert(por('camiseta').length >= 100 && por('cromo').length >= 300 && por('balon').length === 8, 'catálogo: ' + [por('camiseta').length, por('cromo').length, por('balon').length]);
assert(
  ['comun', 'rara', 'epica', 'legendaria'].every(r => cat.some(x => x.rareza === r)),
  'todas las rarezas'
);
assert(
  cat.every(x => x.lugar && x.nombre),
  'todas dicen dónde se consiguen'
);
// sobres: cuestan dinero, traen cinco cromos y se repiten
c.dinero = 50;
const d0 = c.dinero;
assert(K.comprarSobre(st, 10).ok && c.dinero < d0, 'comprar sobres');
let nuevos = 0,
  rep = 0;
for (let i = 0; i < 10; i++) {
  const r = K.abrirSobre(st);
  assert(r.ok && r.sacados.length === 5, 'sobre de cinco');
  r.sacados.forEach(x => {
    x.nuevo ? nuevos++ : rep++;
  });
}
assert(!K.abrirSobre(st).ok, 'sin sobres');
assert(K.total(st) === nuevos && nuevos > 20, 'cromos distintos: ' + nuevos);
assert(K.progreso(st).cromo.tengo === nuevos, 'progreso');
// con muchos sobres aparecen repetidas y se cambian
c.dinero = 500;
K.comprarSobre(st, 100);
for (let i = 0; i < 100; i++) K.abrirSobre(st);
assert(K.progreso(st).repetidas > 100, 'repetidas');
const ant = K.col(st).sobres;
const cam = K.cambiarRepes(st);
assert(cam.ok && K.col(st).sobres > ant, 'cambiar repetidas por sobres');
// camisetas y balones de partidos, títulos y concursos
const rival = Object.keys(st.equipos).find(i => i !== 'unicaja');
const yo = st.jugadores.yo;
yo.equipoId = 'unicaja';
let ok = false;
for (let i = 0; i < 40 && !ok; i++) {
  GM.bus.emit('partido:jugado', { partido: { local: 'unicaja', visitante: rival, resultado: { stats: { yo: { min: 25, pts: 32 } }, local: 80, visitante: 70 } } });
  ok = K.tiene(st, 'camiseta:' + rival);
}
assert(ok, 'camiseta del rival tras jugar');
assert(K.tiene(st, 'balon:noche'), 'balón de los 30 puntos');
GM.ciudadJuego.datos(st).rec.triples = 9;
st.fecha = '2026-10-02';
GM.bus.emit('dia:avanzado', {});
assert(K.tiene(st, 'balon:triples'), 'balón del concurso de triples');
// vitrina: los coleccionables se eligen por rareza
const s = K.seleccion(st, { camisetas: 3, balones: 3, cromos: 5 });
assert((s.cromos.length === 5 && s.cromos[0].rareza !== 'comun') || K.progreso(st).cromo.tengo < 5, 'selección de vitrina');
console.log('OK t_coleccionables (' + K.total(st) + ' de ' + cat.length + ' piezas)');
