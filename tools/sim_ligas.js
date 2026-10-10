// Distribución de niveles y potenciales de todas las ligas a lo largo de varias temporadas (sin intervención del usuario),
// y coherencia entre la media (ovr) y los atributos. Uso: node tools/sim_ligas.js [temporadas] [semilla]
const path = require('path');
process.chdir(path.join(__dirname, '..'));
global.LZString = require('lz-string');
const L = require('../load');
L(['core', 'datos_util', 'datos_valoraciones', 'datos_nba_este', 'datos_nba_oeste', 'datos_nba_fin', 'datos_euroliga', 'datos_ligas', 'datos_ligas2', 'datos_movimientos', 'datos_ligas3', 'finanzas', 'ciudad', 'partidos', 'competiciones', 'mercado', 'cantera', 'copas', 'continental', 'rivalidades', 'personaje', 'carrera', 'ciudad3d', 'social', 'sponsor', 'pueblo', 'gente', 'estilo', 'movil', 'vida', 'entrenador', 'guardado', 'hogar', 'sede_plano', 'sede_acciones', 'casa3d', 'rua']);
const TEMPS = +process.argv[2] || 6, C = GM.mods.competiciones;
GM.rng.seed(+process.argv[3] || 5);
const st = GM.newGame('joventut-badalona', 7, { modo: 'gestor', personaje: { nombre: 'Marc', apellido: 'Soler' } });
const LIGAS = () => { const m = {}; Object.values(st.equipos).forEach(e => { (m[e.liga || e.ligaId || '?'] = m[e.liga || e.ligaId || '?'] || []).push(e); }); return m; };
function informe(t) {
  const todos = Object.values(st.jugadores).filter(p => !p.prospecto && p.equipoId && st.equipos[p.equipoId]);
  const mx = p => Math.max.apply(null, Object.values(p.att));
  const sinTecho = todos.filter(p => p.ovr >= 80 && mx(p) < p.ovr).length, grandes = todos.filter(p => p.ovr >= 80).length;
  const por = {}; todos.forEach(p => { const l = st.equipos[p.equipoId].liga || '?'; (por[l] = por[l] || []).push(p); });
  console.log('--- temporada', t, st.temporada, '| jugadores', todos.length, '| con ovr>=80:', grandes, '| de ellos sin ningún atributo >= ovr:', sinTecho);
  Object.keys(por).sort().forEach(l => {
    const o = por[l].map(p => p.ovr).sort((a, b) => b - a), n = o.length, med = o.reduce((s, x) => s + x, 0) / n;
    const pot = por[l].map(p => p.pot).sort((a, b) => b - a);
    console.log(' ', l.padEnd(10), 'n', String(n).padStart(3), 'media', med.toFixed(1), 'top5', o.slice(0, 5).join(','), '| ovr>=90:', o.filter(x => x >= 90).length, '>=85:', o.filter(x => x >= 85).length, '| pot>=95:', pot.filter(x => x >= 95).length, '| jóvenes<=23 con pot>=90:', por[l].filter(p => p.edad <= 23 && p.pot >= 90).length);
  });
  const tam = Object.values(st.equipos).map(e => e.plantilla.length).sort((a, b) => a - b); console.log('  plantillas: min', tam[0], 'mediana', tam[tam.length >> 1], 'max', tam[tam.length - 1], '| libres', (st.mercado.libres || []).length, '| edad media', (todos.reduce((s, p) => s + p.edad, 0) / todos.length).toFixed(1), '| jugadores con edad<=21:', todos.filter(p => p.edad <= 21).length);
  const nba = (por.NBA || []).filter(p => p.edad >= 25 && p.edad <= 31).map(p => p.ovr), media = a => a.length ? (a.reduce((s, x) => s + x, 0) / a.length).toFixed(1) : '-';
  console.log('  NBA 25-31 años: media', media(nba), '| edad media de los 10 mejores:', ((por.NBA || []).slice().sort((a, b) => b.ovr - a.ovr).slice(0, 10).reduce((s, p) => s + p.edad, 0) / 10).toFixed(1));
}
informe(0);
for (let y = 1; y <= TEMPS; y++) {
  while (!st.temporadaTerminada) C.jugarDia(st);
  C.nuevaTemporada(st); informe(y);
}
