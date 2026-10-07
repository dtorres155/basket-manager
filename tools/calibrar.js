// Calibrado del simulador: puntos por equipo, diferencia media, victorias locales y prórrogas por competición
// tras una temporada completa. Uso: node tools/calibrar.js [semilla]
const path = require('path'); process.chdir(path.join(__dirname, '..'));
const L = require('../load');
L(['core', 'datos_util', 'datos_nba_este', 'datos_nba_oeste', 'datos_nba_fin', 'datos_euroliga', 'datos_ligas', 'datos_ligas2', 'datos_movimientos', 'datos_ligas3', 'finanzas', 'ciudad', 'partidos', 'competiciones', 'mercado', 'cantera', 'copas', 'continental', 'rivalidades']);
const sem = +process.argv[2] || 5; GM.rng.seed(sem);
const st = GM.newGame('joventut-badalona', sem, { modo: 'gestor', personaje: { nombre: 'M' } }), C = GM.mods.competiciones;
while (!st.temporadaTerminada) C.jugarDia(st);
const ag = {};
st.calendario.filter(g => g.resultado).forEach(g => { const a = ag[g.comp] = ag[g.comp] || { n: 0, p: 0, dif: 0, local: 0, ot: 0, cerca: 0 }; const d = Math.abs(g.resultado.local - g.resultado.visitante); a.n++; a.p += g.resultado.local + g.resultado.visitante; a.dif += d; a.local += g.resultado.local > g.resultado.visitante ? 1 : 0; a.ot += g.resultado.ot ? 1 : 0; a.cerca += d <= 5 ? 1 : 0; });
console.log('Real aprox.: NBA 114-115 pts, Euroliga 81-83, ACB 83-84; diferencia 11-12; local 55-60 %; prórrogas 5-6 %; a 5 o menos ~30 %');
for (const k in ag) { const a = ag[k]; console.log(k.padEnd(9), 'pts', (a.p / a.n / 2).toFixed(1), '| dif', (a.dif / a.n).toFixed(1), '| local', (a.local / a.n * 100).toFixed(0) + '%', '| prórroga', (a.ot / a.n * 100).toFixed(1) + '%', '| a ≤5', (a.cerca / a.n * 100).toFixed(0) + '%', '(' + a.n + ')'); }
