// Árbol de instalaciones (punto 62) y progresión del jugador (punto 63): ramas con requisitos, obras por fases, efectos medibles; rasgos, curvas, carga, lesiones con historial y secuelas.
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><div id="app"></div>', { pretendToBeVisual: true });
global.window = global;
global.document = dom.window.document;
global.THREE = require('./tools/three_node');
const assert = require('assert');
const L = require('./load');
L([
  'core',
  'datos_util',
  'datos_nba_este',
  'datos_nba_oeste',
  'datos_nba_fin',
  'datos_euroliga',
  'datos_ligas',
  'datos_ligas2',
  'datos_movimientos',
  'datos_ligas3',
  'three_kit',
  'finanzas',
  'ciudad',
  'campus',
  'contratos',
  'ciudad3d',
  'ciudad_deportiva',
  'estadio',
  'arbol_instalaciones',
  'progresion',
  'partidos',
  'competiciones',
  'mercado',
  'cantera',
  'personaje'
]);
let fallos = 0;
const ok = (n, c) => {
  if (!c) {
    fallos++;
    console.log('FALLA', n);
  } else console.log('ok   ', n);
};
ok('selfTest arbolInst', GM.arbolInst.selfTest());
ok('selfTest progresion', GM.progresion.selfTest());
const st = GM.newGame('joventut-badalona', 11, { modo: 'gestor', personaje: GM.mods.personaje.crear() });
GM.state = st;
const id = st.clubId,
  A = GM.arbolInst,
  CD = GM.mods.ciudadDeportiva;
st.finanzas[id].caja = 5e8;
// ---- Árbol: requisitos, obra por fases y efectos
const ar0 = A.arbol(st, id);
ok('seis ramas con nodos', Object.keys(ar0).length === 6 && ar0.cantera.length >= 10 && ar0.medico.length >= 5 && ar0.analitica.length === 3 && ar0.pabellon.length >= 10);
const e0 = A.efectos(st, id);
ok('efectos base', e0.prevencion === 1 && e0.cupo === 0 && e0.analitica === 0 && e0.recuperacion >= 1);
const bloq = A.construir(st, id, 'datos3');
ok('requisitos: no se salta nada', !bloq.ok && /Necesita|Primero/.test(bloq.motivo));
// mejorar los edificios necesarios (en 2 obras a la vez) y esperar
const avanza = dias => {
  for (let i = 0; i < dias; i++) {
    st.fecha = GM.util.addDays(st.fecha, 1);
    GM.bus.emit('dia:avanzado', {});
  }
};
['cantera', 'medico', 'oficinas'].forEach(sl => {
  const p = CD.parcelas(st, id).find(x => x.slot === sl);
  if (p && p.estado !== 'obra') {
    const r = p.nivel ? CD.mejorar(st, id, sl) : CD.construir(st, id, sl);
    if (!r.ok) console.log('  (nota) ' + sl + ': ' + r.motivo);
  }
  avanza(50);
});
['cantera', 'medico', 'oficinas'].forEach(sl => {
  let p = CD.parcelas(st, id).find(x => x.slot === sl);
  let g = 0;
  while (p && p.nivel < 3 && p.estado !== 'bloqueado' && g++ < 6) {
    const r = p.nivel ? CD.mejorar(st, id, sl) : CD.construir(st, id, sl);
    if (!r.ok) break;
    avanza(46);
    p = CD.parcelas(st, id).find(x => x.slot === sl);
  }
});
const niv = t => CD.parcelas(st, id).find(x => x.tipo === t).nivel;
ok(
  'edificios al nivel 3: cantera ' + niv('cantera') + ', médico ' + niv('medico') + ', oficinas ' + niv('oficinas'),
  niv('cantera') >= 3 && niv('medico') >= 3 && niv('oficinas') >= 3
);
const r1 = A.construir(st, id, 'prev1'),
  r2 = A.construir(st, id, 'cat_infantil'),
  r3 = A.construir(st, id, 'datos1');
ok('tres obras a la vez', r1.ok && r2.ok && r3.ok);
ok('cuarta obra, no', !A.construir(st, id, 'ojeo_l1').ok);
avanza(10);
const f = A.estado(st, id, 'prev1').fase;
ok('fases de la obra: ' + JSON.stringify(f && { n: f.nombre, p: f.pct }), f && f.pct > 0 && f.pct < 100);
avanza(40);
ok('obras terminadas', A.estado(st, id, 'prev1').estado === 'hecha' && A.estado(st, id, 'cat_infantil').estado === 'hecha' && A.estado(st, id, 'datos1').estado === 'hecha');
const e1 = A.efectos(st, id);
ok(
  'cada mejora cambia un número: prevención ' + e1.prevencion + ', cupo ' + e1.cupo + ', analítica ' + e1.analitica,
  Math.abs(e1.prevencion - 0.9) < 1e-9 && e1.cupo === 1 && e1.analitica === 1 && e1.cantera > e0.cantera
);
ok('mantenimiento sube', A.mantenimiento(st, id) > 0);
const m0 = CD.mantenimiento(st, id);
ok('el mantenimiento total lo incluye', m0 >= A.mantenimiento(st, id));
const W = new THREE.Group(),
  Lc = GM.campus.layout(st.equipos[id]);
const piezas = A.decorar(W, st, id, Lc, new THREE.Color(0xaa0000));
ok('decorar crea modelos: ' + piezas, piezas >= 3 && W.children.length >= 2);
// ---- La cantera usa cupo y ojeo
GM.rng.seed(9);
const c = st.cantera[id];
c.juveniles.forEach(j => delete st.jugadores[j]);
c.juveniles = [];
const n = GM.mods.cantera.generarJuveniles(st, id);
ok('cupo extra de juveniles: ' + n, n === 7);
// ---- Progresión: dos jugadores de igual media evolucionan distinto por su trabajo
const P = GM.progresion,
  mk = (n, edad) => {
    const p = GM.mkJugador(id, 90 + n, 'Gemelo ' + n, 'SG', edad, 195, 'ES', 'UE', 66, 82, 'E', 1e6, 2029);
    p.id = 'gem' + n;
    p.equipoId = id;
    st.jugadores[p.id] = p;
    return p;
  };
const a = mk(1, 20),
  b = mk(2, 20);
P.curva(a);
P.curva(b);
b.curva = a.curva;
b.ext = JSON.parse(JSON.stringify(P.ext(a)));
b.rasgos = a.rasgos = [];
ok('mismos ovr de partida', a.ovr === b.ovr);
P.fijarIndividual(st, a.id, 'equilibrado', 3);
P.fijarIndividual(st, b.id, 'equilibrado', 1);
const hist = { a: [], b: [] };
for (let s = 0; s < 40; s++) {
  GM.rng.seed(100 + s);
  P.aplicarSemana(st, a, 1, false);
  GM.rng.seed(100 + s);
  P.aplicarSemana(st, b, 1, false);
  P.sumarMinutos(a, 30);
  P.sumarMinutos(b, 30);
  for (let d = 0; d < 7; d++) {
    P.descansoDiario(a, 1);
    P.descansoDiario(b, 1);
  }
  a.estado.lesion = null;
  b.estado.lesion = null;
}
ok('carga acumulada distinta: ' + Math.round(a.estado.carga) + ' vs ' + Math.round(b.estado.carga), a.estado.carga > b.estado.carga + 20);
ok('evolucionan distinto: ' + a.ovr + ' vs ' + b.ovr + ', xp ' + a.xp.toFixed(2) + ' vs ' + b.xp.toFixed(2), a.ovr !== b.ovr || Math.abs(a.xp - b.xp) > 0.05);
// carga alta + sobrecarga genera lesiones con historial
const c2 = mk(3, 26);
c2.estado.carga = 95;
P.fijarIndividual(st, c2.id, 'fisico', 3);
let les = 0;
for (let s = 0; s < 40 && les === 0; s++) {
  GM.rng.seed(500 + s);
  c2.estado.lesion = null;
  c2.estado.carga = 95;
  const r = P.aplicarSemana(st, c2, 1, false);
  if (r.lesion) les++;
}
ok('la sobrecarga lesiona y deja historial', les > 0 && P.historial(c2).lesiones.some(l => l.origen === 'entrenamiento'));
// prevención baja el riesgo; el factor sube con la carga
const x = mk(4, 25);
x.rasgos = [];
x.estado.carga = 0;
const fl0 = P.factorLesion(st, x);
x.estado.carga = 90;
const fl1 = P.factorLesion(st, x);
ok('factor de lesión sube con la carga: ' + fl0.toFixed(2) + ' -> ' + fl1.toFixed(2), fl1 > fl0 * 1.2);
ok('con prevención el factor es menor', fl0 <= 0.9 * 1.01);
// secuelas: lesiones graves
let sec = 0;
for (let i = 0; i < 60; i++) {
  const y = mk(10 + i, 28);
  const r = P.lesionar(st, y, 'Esguince de rodilla', 60, 'partido');
  if (r.secuela) sec++;
}
ok('algunas lesiones graves dejan secuela: ' + sec + ' de 60', sec > 3 && sec < 45);
// curvas
const jov = mk(70, 19),
  vet = mk(71, 33);
ok('curva: crece de joven, cae de veterano', P.crecimiento(jov) > 0.1 && P.crecimiento(vet) < 0);
const pivote = mk(72, 20);
pivote.pos = 'C';
const base = mk(73, 20);
base.pos = 'PG';
pivote.curva = base.curva = 'normal';
ok('el pívot madura más tarde', P.pico(pivote) > P.pico(base));
ok('rasgos y atributos ocultos', Array.isArray(P.rasgos(mk(74, 25))) && P.ext(mk(75, 25)).clutch > 0);
// partido: acumula minutos y recupera con los días
const jug = st.equipos[id].plantilla.map(i => st.jugadores[i]);
jug.forEach(p => {
  p.estado.carga = 0;
});
const rival = st.calendario.find(g => g.local === id || g.visitante === id);
GM.mods.partidos.simular && GM.mods.partidos.simular(st, rival);
const con = jug.filter(p => p.estado.carga > 0).length;
ok('los minutos suman carga: ' + con + ' jugadores', con >= 5);
console.log(fallos ? 'fallos ' + fallos : 'Sin fallos');
process.exit(fallos ? 1 : 0);
