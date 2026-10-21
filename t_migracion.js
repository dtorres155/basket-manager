// Migración de partidas antiguas: se fabrica una partida «de la versión N» (sin los estados que añadieron las versiones siguientes), pasa por el guardado real (comprimido) y debe poder jugar una temporada entera.
const L = require('./load');
L(
  [
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
    'finanzas',
    'ciudad',
    'contratos',
    'guardado',
    'partidos',
    'competiciones',
    'mercado',
    'cantera',
    'personaje',
    'carrera',
    'estilo',
    'movil',
    'fans',
    'copas',
    'continental',
    'rivalidades',
    'entrenador',
    'social',
    'sponsor',
    'pueblo',
    'vida',
    'gente',
    'hogar',
    'pretemporada',
    'allstar',
    'ojeadores',
    'negociacion',
    'prensa',
    'tactica',
    'crecimiento'
  ].filter(f => require('fs').existsSync(__dirname + '/' + f + '.js'))
);
let fallos = 0;
const ok = (n, c) => {
  if (!c) {
    fallos++;
    console.log('FALLA', n);
  } else console.log('ok   ', n);
};
const Gd = GM.mods.guardado;
for (const [modo, vieja] of [
  ['gestor', 3],
  ['gestor', 5],
  ['entrenador', 4],
  ['presidente', 5]
]) {
  const st = GM.newGame('joventut-badalona', 21, { modo, personaje: GM.mods.personaje.crear() });
  GM.state = st;
  for (let i = 0; i < 20; i++) GM.mods.competiciones.jugarDia(st);
  // quitar lo que no existía en esa versión
  const c = JSON.parse(JSON.stringify(st));
  c.version = vieja;
  if (vieja <= 5) {
    delete c.pretemp;
    delete c.allstar;
    delete c.ojeadores;
    delete c.negociacion;
    delete c.prensa;
    delete c.tactica;
    delete c.staff;
    if (c.rivalidades) {
      delete c.rivalidades.rachas;
      delete c.rivalidades.mem;
    }
    if (c.ciudad && c.ciudad[c.clubId]) delete c.ciudad[c.clubId].crec;
  }
  if (vieja <= 3) {
    c.rua = undefined;
    delete c.ruaHist;
  }
  if (vieja <= 2) delete c.sede;
  const m = Gd.migrar(JSON.parse(JSON.stringify(c)));
  GM.state = m;
  ok(modo + ' v' + vieja + ' migrada a la versión ' + GM.VERSION_ESTADO, m.version === GM.VERSION_ESTADO);
  ok(modo + ' v' + vieja + ': estados nuevos creados', !!(m.pretemp && m.allstar && m.ojeadores && m.negociacion));
  let g = 0,
    err = null;
  try {
    while (!m.temporadaTerminada && g++ < 500) GM.mods.competiciones.jugarDia(m);
    GM.mods.competiciones.nuevaTemporada(m);
    m.temporadaTerminada = false;
    for (let i = 0; i < 10; i++) GM.mods.competiciones.jugarDia(m);
  } catch (e) {
    err = e;
  }
  ok(modo + ' v' + vieja + ': una temporada y otra más sin errores' + (err ? ' (' + err.message + ')' : ''), !err);
  ok(modo + ' v' + vieja + ': sigue serializando', JSON.stringify(m).length > 1000);
}
console.log(fallos ? 'fallos ' + fallos : 'Migración OK');
process.exit(fallos ? 1 : 0);
