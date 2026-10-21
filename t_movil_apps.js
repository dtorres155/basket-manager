// Punto 69: apps del móvil (banco, inmobiliaria, prensa, redes, calendario) en todos los modos y personajes con historia que avanzan con el tiempo.
global.window = global;
global.THREE = require('./tools/three_node');
const L = require('./load');
L([
  'core',
  'ligas_config',
  'datos_util',
  'datos_valoraciones',
  'datos_nba_este',
  'datos_nba_oeste',
  'datos_nba_fin',
  'datos_euroliga',
  'datos_ligas',
  'datos_ligas2',
  'datos_movimientos',
  'datos_ligas3',
  'finanzas',
  'ciudad',
  'contratos',
  'partidos',
  'competiciones',
  'mercado',
  'cantera',
  'copas',
  'negociacion',
  'traspasos',
  'rivalidades',
  'prensa',
  'crecimiento',
  'allstar',
  'pretemporada',
  'personaje',
  'carrera',
  'estilo',
  'movil',
  'vida',
  'social',
  'hogar',
  'casas_producto',
  'economia',
  'patrimonio',
  'negocios',
  'pueblo',
  'gente',
  'gente_historias',
  'ciudad_juego',
  'movil_apps'
]);
let fallos = 0;
const ok = (n, c) => {
  if (!c) {
    fallos++;
    console.log('FALLA', n);
  } else console.log('ok   ', n);
};
const avanza = (st, d) => {
  for (let i = 0; i < d; i++) {
    st.fecha = GM.util.addDays(st.fecha, 1);
    GM.bus.emit('dia:avanzado', {});
  }
};
ok('selfTest movilApps', GM.movilApps.selfTest());
ok('selfTest genteHist', GM.genteHist.selfTest());
// ---- gestor
let st = GM.newGame('joventut-badalona', 11, { modo: 'gestor', personaje: GM.mods.personaje.crear() });
GM.state = st;
const A = GM.movilApps;
GM.noticia = GM.noticia || ((s, t) => s.noticias.unshift({ fecha: s.fecha, texto: t }));
const ap = A.disponibles(st).map(a => a.id);
ok('apps del gestor: ' + ap.join(', '), ['banco', 'inmobiliaria', 'prensa', 'redes', 'calendario'].every(x => ap.indexOf(x) >= 0) && ap.indexOf('mensajes') < 0);
const b = A.banco(st);
ok('banco del club: caja ' + b.saldo, b.tipo === 'club' && b.saldo > 0);
avanza(st, 20);
const cal = A.calendario(st, 12);
ok(
  'calendario con partidos y mercado: ' + cal.map(e => e.tipo).join(','),
  cal.some(e => e.tipo === 'partido') && cal.some(e => e.tipo === 'mercado') && cal.every((e, i) => i === 0 || cal[i - 1].f <= e.f)
);
const pr = A.prensa(st);
ok('prensa: ' + pr.titulares.length + ' titulares, ' + pr.rumores.length + ' rumores', pr.titulares.length >= 1);
const r = A.redes(st);
ok('redes del club', r.tipo === 'club' && r.seguidores > 1000 && r.puede);
const p = A.publicar(st, 'abonos');
ok('publicar sube seguidores: ' + (p.texto || p.motivo), p.ok && !A.publicar(st, 'victoria').ok);
const inm = A.inmobiliaria(st);
ok('inmobiliaria con ofertas: ' + inm.ofertas.length, inm.ofertas.length >= 3);
// ---- carrera
const pj = GM.mods.personaje.crear();
pj.nombre = 'Marc';
st = GM.newGame('joventut-badalona', 11, {
  modo: 'carrera',
  personaje: pj,
  carrera: { pos: 'SG', perfil: 'tirador', nac: 'ES', origen: 'europa', agente: 'equilibrado', clubId: 'joventut-badalona' }
});
GM.state = st;
st.carrera.dinero = 400;
avanza(st, 3);
const apc = A.disponibles(st).map(a => a.id);
ok('apps del jugador: ' + apc.join(', '), apc.indexOf('mensajes') >= 0 && apc.indexOf('banco') >= 0);
const bj = A.banco(st);
ok('banco personal: ' + bj.saldo + ' €, neto ' + bj.neto, bj.tipo === 'jugador' && bj.saldo > 100000 && bj.puedeEnviar);
const d0 = GM.mods.hogar.dinero(st),
  env = A.enviarDinero(st, 5);
ok('enviar dinero a la familia: ' + (env.texto || env.motivo), env.ok && GM.mods.hogar.dinero(st) < d0 && A.banco(st).movimientos.some(m => /familia/i.test(m.t)));
const inmj = A.inmobiliaria(st),
  of = inmj.ofertas.find(o => o.plazos) || inmj.ofertas[0];
const comp = A.comprarBien(st, of.id, 'contado');
ok('comprar desde el móvil: ' + (comp.ok ? of.nombre : comp.motivo), comp.ok || /faltan|Te faltan|No tienes|dinero/i.test(comp.motivo || ''));
if (comp.ok)
  ok(
    'aparece entre tus bienes',
    A.inmobiliaria(st).bienes.some(x => x.nombre === of.nombre)
  );
const rc = A.redes(st);
ok('redes del jugador', rc.tipo === 'jugador' && rc.seguidores > 100 && rc.tipos.length >= 3);
const pub = A.publicar(st, rc.tipos.find(t => t.disponible).id);
ok('publicar en carrera: ' + (pub.texto || pub.motivo || 'ok'), pub.ok);
const cc = A.calendario(st);
ok('calendario del jugador con su contrato', cc.some(e => e.tipo === 'contrato') && cc.some(e => e.tipo === 'partido'));
// ---- gente con historia (calle, carrera y pueblo)
const H = GM.genteHist,
  calle = GM.mods.gente.personas(st, 'calle');
ok(
  'gente con historia en la calle: ' +
    calle
      .filter(x => x.hist)
      .map(x => x.nombre + ' (' + x.rol + ')')
      .join(', '),
  calle.filter(x => x.hist).length >= 3
);
const pueblo = st.carrera.pueblo ? GM.mods.gente.personas(st, 'pueblo').filter(x => x.hist) : [];
ok('y en el pueblo: ' + pueblo.map(x => x.nombre).join(', '), !st.carrera.pueblo || pueblo.length === 1);
const f0 = GM.mods.gente.ficha(st, 'nino_fan');
ok('la ficha muestra el capítulo: ' + f0.texto.slice(0, 80), /Historia 1 de 5/.test(f0.texto) && f0.acciones.length >= 2);
const rr = f0.acciones[0].fn();
ok('actuar cierra el capítulo: ' + rr.texto, rr.ok && H.estado(st, 'nino_fan').cap === 1);
const f1 = GM.mods.gente.ficha(st, 'nino_fan');
ok('hasta pasar unos días no hay novedades', !f1.acciones[0].disponible && /Todavía no/.test(f1.texto));
let cap = 1;
for (let i = 0; i < 12 && cap < 5; i++) {
  avanza(st, 100);
  const f = GM.mods.gente.ficha(st, 'nino_fan');
  if (f.acciones[0] && f.acciones[0].disponible) {
    f.acciones[0].fn();
    cap = H.estado(st, 'nino_fan').cap;
  }
}
ok('la historia llega al final: capítulo ' + cap, cap === 5 && /Sigue creciendo/.test(H.texto(st, 'nino_fan')));
const ne = st.noticias.filter(n => /tiene novedades/.test(n.texto)).length;
ok('la prensa avisa de historias: ' + ne, ne >= 1);
['cronista', 'empresario'].forEach(id => {
  let c = 0;
  const len = H.PERSONAJES[id].caps.length;
  for (let i = 0; i < 16 && c < len; i++) {
    avanza(st, 130);
    const f = GM.mods.gente.ficha(st, id);
    if (f.acciones[0] && f.acciones[0].disponible) {
      f.acciones[0].fn();
      c = H.estado(st, id).cap;
    }
  }
  ok(id + ' completa su historia (' + c + '/' + len + ')', c === len);
});
// ---- gestor: Pau entra en la cantera
st = GM.newGame('joventut-badalona', 11, { modo: 'gestor', personaje: GM.mods.personaje.crear() });
GM.state = st;
st.cantera[st.clubId].juveniles = st.cantera[st.clubId].juveniles.slice(0, 5);
for (let i = 0; i < 6; i++) {
  const f = GM.mods.gente.ficha(st, 'nino_fan');
  if (f.acciones[0].disponible) f.acciones[0].fn();
  avanza(st, 100);
}
ok('en gestor, el chaval entra de verdad en la cantera', !!H.estado(st, 'nino_fan').flags.juvenil && st.jugadores[H.estado(st, 'nino_fan').flags.juvenil].equipoId === st.clubId);
// ---- prensa en la calle: la reportera de los días de partido
st = GM.newGame('joventut-badalona', 11, { modo: 'gestor', personaje: GM.mods.personaje.crear() });
GM.state = st;
const g1 = st.calendario.find(g => (g.local === st.clubId || g.visitante === st.clubId) && g.fase !== 'amistoso');
st.fecha = g1.fecha;
GM.mods.prensa.estado(st);
ok(
  'los días de partido hay una reportera en la puerta',
  GM.mods.gente.personas(st, 'calle').some(x => x.id === 'reportero')
);
const fr = GM.mods.gente.ficha(st, 'reportero');
ok('sus preguntas son las de la rueda de prensa: ' + fr.acciones.length + ' opciones', fr.acciones.length >= 3);
const rr2 = fr.acciones[1].fn();
ok('contestar tiene efecto y una vez al día: ' + (rr2.texto || rr2.motivo), rr2.ok && GM.mods.gente.ficha(st, 'reportero').acciones.length === 0);
st.fecha = GM.util.addDays(g1.fecha, -5);
ok('otros días no está', !GM.mods.gente.personas(st, 'calle').some(x => x.id === 'reportero'));
console.log(fallos ? 'fallos ' + fallos : 'Sin fallos');
process.exit(fallos ? 1 : 0);
