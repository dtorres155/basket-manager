// Resultado económico de una temporada por liga (presupuesto, nómina, beneficio). Uso: node tools/finanzas_calibrar.js
process.chdir(require('path').join(__dirname, '..'));
const L = require('../load');
const fs = require('fs'); eval(fs.readFileSync('tools/calibrar.js', 'utf8').split(/\r?\n/).find(l => l.startsWith('L([')));
GM.rng.seed(5); const st = GM.newGame('unicaja', 5, { modo: 'gestor', personaje: { nombre: 'M' } }), C = GM.mods.competiciones, F = GM.mods.finanzas;
const ini = {}; for (const id in st.finanzas) ini[id] = st.finanzas[id].caja;
console.log('clubes con finanzas', Object.keys(st.finanzas).length, 'de', Object.keys(st.equipos).length);
while (!st.temporadaTerminada) C.jugarDia(st);
// Cierra la temporada como lo hace el juego (los cobros y pagos de temporada:fin)
GM.bus.emit('temporada:fin', { temporada: st.temporada });
const filas = [];
for (const id in st.finanzas) { const e = st.equipos[id], lg = GM.mods.mercado.ligaDe(st, id), d = st.finanzas[id].caja - ini[id], masa = e.plantilla.reduce((s, i) => s + (st.jugadores[i] ? st.jugadores[i].contrato.salario : 0), 0); filas.push({ id, lg, pres: e.presupuesto / 1e6, masa: masa / 1e6, d: d / 1e6, caja: st.finanzas[id].caja / 1e6 }); }
const porLiga = {};
filas.forEach(f => { const a = porLiga[f.lg] = porLiga[f.lg] || []; a.push(f); });
for (const lg in porLiga) {
  const a = porLiga[lg], med = k => a.reduce((s, f) => s + f[k], 0) / a.length, neg = a.filter(f => f.caja < 0).length;
  console.log(lg.padEnd(9), 'clubes', String(a.length).padStart(2), '| presupuesto medio', med('pres').toFixed(1), 'M | nómina', med('masa').toFixed(1), 'M (' + Math.round(med('masa') / med('pres') * 100) + ' %) | resultado medio', med('d').toFixed(2), 'M | peor', Math.min(...a.map(f => f.d)).toFixed(1), '| mejor', Math.max(...a.map(f => f.d)).toFixed(1), '| en negativo', neg);
}
const tuyo = filas.find(f => f.id === st.clubId); console.log('tu club', JSON.stringify(tuyo));
