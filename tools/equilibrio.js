// Punto de equilibrio: juega varias temporadas SIN tocar nada (solo avanzar y renovar lo imprescindible) en cada modo y club de muestra, y resume cómo van la clasificación, la caja, la masa salarial y la media del equipo.
// Sirve para ver si el juego deriva solo hacia algo raro (clubes que quiebran, equipos que se hunden o dominan para siempre, inflación de sueldos). Uso: node tools/equilibrio.js [temporadas=5] [semilla=1]
const L = require('../load');
const fs = require('fs'),
  path = require('path');
const uniq = [
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
  'datos_plantillas_extra',
  'datos_ligas_extra',
  'datos_ligas_ascenso',
  'datos_ligas_ascenso2',
  'finanzas',
  'ciudad',
  'contratos',
  'partidos',
  'competiciones',
  'mercado',
  'cantera',
  'copas',
  'continental',
  'rivalidades',
  'personaje',
  'carrera',
  'estilo',
  'movil',
  'entrenador',
  'ojeadores',
  'economia',
  'vida',
  'ascensos'
];
L(uniq);
const T = +process.argv[2] || 5,
  SEM = +process.argv[3] || 1;
const C = GM.mods.competiciones;
const CLUBES = [
  ['fc-barcelona', 'gestor'],
  ['joventut-badalona', 'gestor'],
  ['unicaja', 'presidente'],
  ['olympiacos', 'gestor'],
  ['alba-berlin', 'entrenador'],
  ['fenerbahce', 'gestor']
];
const pos = (st, club) => {
  const lg = Object.keys(st.ligas).find(l => st.ligas[l].equipos.indexOf(club) >= 0 && st.clasificaciones[l]);
  if (!lg) return '-';
  const t = C.clasificacion(st, lg),
    i = t.findIndex(r => r.equipoId === club);
  return i + 1 + '/' + t.length + ' ' + lg;
};
let alertas = 0;
console.log('club (modo)'.padEnd(28) + 'temporadas: posición, caja M€, masa M€, media del equipo');
for (const [club, modo] of CLUBES) {
  const st = GM.newGame(club, SEM, { modo, personaje: GM.mods.personaje.crear() });
  GM.state = st;
  const fila = [];
  for (let t = 0; t < T; t++) {
    let n = 0;
    while (!st.temporadaTerminada && n++ < 500) C.jugarDia(st);
    const e = st.equipos[club],
      f = st.finanzas && st.finanzas[club],
      masa = e.plantilla.reduce((s, i) => s + ((st.jugadores[i].contrato || {}).salario || 0), 0) / 1e6,
      ovr = Math.round(GM.mods.partidos.ovrEquipo(st, club) * 10) / 10;
    fila.push(pos(st, club) + ', ' + (f ? (f.caja / 1e6).toFixed(1) : '?') + ', ' + masa.toFixed(1) + ', ' + ovr);
    if (f && f.caja < -5e6) alertas++;
    if (GM.mods.mercado.cerrarContratos) {
      /* nuevaTemporada lo hace */
    }
    C.nuevaTemporada(st);
  }
  console.log((club + ' (' + modo + ')').padEnd(28) + fila.join(' | '));
}
const dist = {};
Object.values(GM.state.jugadores).forEach(p => {
  if (!p.ficticio && p.ovr) dist[Math.floor(p.ovr / 10) * 10] = (dist[Math.floor(p.ovr / 10) * 10] || 0) + 1;
});
console.log('Distribución de medias tras ' + T + ' temporadas:', JSON.stringify(dist));
console.log(alertas ? 'ALERTA: ' + alertas + ' clubes con la caja en negativo grave' : 'Sin alertas económicas');
process.exit(0);
