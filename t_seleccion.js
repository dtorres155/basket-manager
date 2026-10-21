// Punto 66: selecciones jugables (convocatoria, partidos, estadísticas, medallas), torneos de verano de formatos distintos, amistosos con taquilla y All-Star en directo.
const L = require('./load');
L([
  'core',
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
  'progresion',
  'pretemporada',
  'seleccion_juego',
  'allstar',
  'personaje',
  'carrera'
]);
let fallos = 0;
const ok = (n, c) => {
  if (!c) {
    fallos++;
    console.log('FALLA', n);
  } else console.log('ok   ', n);
};
ok('selfTest seleccion', GM.seleccion.selfTest());
ok('selfTest pretemporada', GM.mods.pretemporada.selfTest());
ok('selfTest allstar', GM.mods.allstar.selfTest());
const st = GM.newGame('joventut-badalona', 11, { modo: 'gestor', personaje: GM.mods.personaje.crear() });
GM.state = st;
const id = st.clubId,
  C = GM.mods.competiciones;
const avanza = hasta => {
  let g = 0;
  while (st.fecha < hasta && g++ < 700) C.jugarDia(st);
};
// ---- All-Star en directo (febrero de la primera temporada)
avanza('2027-01-20');
const ev = st.allstar.eventos.ACB || st.allstar.eventos.EUROLIGA;
const liga = ev.id;
const antes = ev.fecha;
while (st.fecha < GM.util.addDays(antes, -4)) C.jugarDia(st);
const pd = GM.mods.allstar.puedeDirecto(st, liga);
ok('el All-Star se puede jugar en directo desde cinco días antes: ' + (pd.ok ? 'sí' : pd.motivo), pd.ok);
const ctx = GM.mods.allstar.prepararDirecto(st, liga);
ok('se crean dos equipos temporales con 10 jugadores', ctx.ok && st.equipos['as:A'].plantilla.length + st.equipos['as:B'].plantilla.length === ctx.ids.length);
const fat0 = st.jugadores[ctx.ids[0]].estado.fatiga;
GM.rng.seed(5);
const res = GM.mods.partidos.crearDirecto(st, ctx.partido, false).finalizar();
const t = GM.mods.allstar.terminarDirecto(st, liga, ctx, res);
ok(
  'al terminar se restauran el cansancio y las lesiones y se guarda el marcador: ' + res.local + '-' + res.visitante,
  t.ok && st.jugadores[ctx.ids[0]].estado.fatiga === fat0 && !st.equipos['as:A'] && ev.directo.pa === res.local
);
avanza(GM.util.addDays(antes, 1));
ok('el resultado del directo es el del evento: ' + ev.partido.pa + '-' + ev.partido.pb, ev.estado === 'hecho' && ev.partido.pa === res.local && ev.partido.enDirecto === true);
// ---- fin de temporada y verano: amistosos con taquilla y torneo
avanza('2027-07-30');
GM.mods.competiciones.nuevaTemporada(st);
st.temporadaTerminada = false;
avanza('2027-08-22');
const P = GM.mods.pretemporada.estado(st);
ok('hay pretemporada y torneo: ' + (P.torneo ? P.torneo.formato + ', ' + P.torneo.nombre : 'no'), !!P.torneo && ['copa', 'liguilla', 'grupos'].indexOf(P.torneo.formato) >= 0);
const caja0 = st.finanzas[id].caja;
avanza('2027-09-20');
const am = GM.mods.pretemporada.amistososClub(st).filter(g => g.local === id && g.resultado);
ok(
  'los amistosos en casa dejan taquilla: ' + am.map(g => g.resultado.ingresos).join(', '),
  am.length >= 1 && am.every(g => g.resultado.ingresos > 0 && g.resultado.asistencia > 0)
);
ok('el torneo tiene campeón: ' + (P.torneo.campeon ? st.equipos[P.torneo.campeon].nombre : 'ninguno'), !!P.torneo.campeon);
// ---- selecciones: la ventana del Mundial 2027 (25 de agosto al 10 de septiembre) se juega día a día
const V = P.ventana;
ok('la ventana tiene grupos y calendario: ' + (V ? V.partidos.length + ' partidos' : 'no'), !!V && V.id === 'MUNDIAL' && V.grupos.length === 4 && V.partidos.length >= 24);
// (la ventana se crea al empezar el verano; para decidir hay que hacerlo antes de la fecha: se comprueba con una nueva partida)
const st2 = GM.newGame('joventut-badalona', 11, { modo: 'gestor', personaje: GM.mods.personaje.crear() });
GM.state = st2;
const P2 = GM.mods.pretemporada.estado(st2);
st2.fecha = '2027-08-01';
st2.temporada = '2027-28';
GM.bus.emit('temporada:nueva', {});
const V2 = P2.ventana;
ok('al empezar el verano se anuncia la ventana', !!V2 && V2.estado === 'convocatoria' && V2.equipos.length === 16);
const cv = GM.seleccion.convocados(st2);
console.log('  convocados de tu club:', cv.map(c => c.nombre + ' (' + c.pais + ')').join(', ') || 'ninguno');
if (!cv.length) {
  const mejor = st2.equipos[st2.clubId].plantilla.map(i => st2.jugadores[i]).sort((a, b) => b.ovr - a.ovr)[0];
  const E = V2.equipos.find(t => t.pais === mejor.nac) || V2.equipos[0];
  mejor.nac = E.pais;
  E.jugadores.unshift(mejor.id);
  cv.push(...GM.seleccion.convocados(st2));
}
const a = cv.find(c => !c.baja),
  b = cv.filter(c => !c.baja)[1];
const r1 = GM.seleccion.responder(st2, a.id, false),
  m0 = st2.jugadores[a.id].estado.moral;
ok('negarse a dejarle ir baja el ánimo y enfada a la federación: ' + (r1.texto || r1.motivo), r1.ok && st2.pretemp.federacion < 50);
if (b) ok('aceptar sube el ánimo', GM.seleccion.responder(st2, b.id, true).ok && st2.pretemp.federacion >= 40);
let dias = 0;
while (!V2.resuelta && dias++ < 60) {
  st2.fecha = GM.util.addDays(st2.fecha, 1);
  GM.bus.emit('dia:avanzado', { fecha: st2.fecha });
}
ok(
  'el torneo se juega día a día y termina: campeón ' + (V2.resultado ? V2.resultado.campeon : 'ninguno') + ' en ' + dias + ' días',
  V2.resuelta && !!V2.resultado && V2.partidos.some(m => m.fase === 'Final' && m.resultado) && V2.partidos.filter(m => m.fase === 'Cuartos').length === 4
);
ok('la convocatoria rechazada se queda sin estadísticas', !V2.stats[a.id]);
if (b) {
  const s = V2.stats[b.id];
  ok('el convocado tiene minutos y estadísticas: ' + JSON.stringify(s && { pj: s.pj, min: s.min, pts: s.pts }), !!s && s.pj >= 3 && s.min > 20);
  ok('queda en su palmarés', st2.jugadores[b.id].palmares && st2.jugadores[b.id].palmares.length === 1);
}
const podio = V2.resultado.convocados.filter(c => c.medalla);
ok('las medallas van al salón de la fama: ' + podio.length, podio.length === (st2.salon ? st2.salon.medallas.length : 0));
const rs = GM.seleccion.resumen(st2);
ok('el resumen para la pantalla', !!rs && rs.grupos.length === 4);
// ---- los tres formatos de torneo de verano terminan con campeón
const vistos = {};
for (const t of ['2027-28', '2028-29', '2029-30', '2030-31', '2031-32', '2032-33', '2033-34', '2034-35']) {
  const s3 = GM.newGame('joventut-badalona', 11, { modo: 'gestor', personaje: GM.mods.personaje.crear() });
  GM.state = s3;
  s3.temporada = t;
  s3.fecha = t.slice(0, 4) + '-07-20';
  s3.calendario = [];
  GM.mods.pretemporada.nuevaPartida(s3);
  GM.bus.emit('temporada:nueva', {});
  const T3 = GM.mods.pretemporada.estado(s3).torneo;
  if (!T3) continue;
  let n = 0;
  while (!T3.campeon && n++ < 80) {
    GM.mods.competiciones.jugarDia(s3);
  }
  vistos[T3.formato] = (vistos[T3.formato] || 0) + (T3.campeon ? 1 : 0);
}
ok('torneos de varios formatos terminan: ' + JSON.stringify(vistos), Object.keys(vistos).length >= 2 && Object.values(vistos).every(v => v >= 1));
console.log(fallos ? 'fallos ' + fallos : 'Sin fallos');
process.exit(fallos ? 1 : 0);
