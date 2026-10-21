// Punto 64: libro de jugadas, emparejamientos, minutos objetivo, química, análisis avanzado y charla del descanso. Preparar un partido cambia el resultado de forma medible.
const L = require('./load');
L(['core', 'datos_util', 'datos_nba_este', 'datos_nba_oeste', 'datos_nba_fin', 'datos_euroliga', 'datos_ligas', 'datos_ligas2', 'datos_movimientos', 'datos_ligas3', 'finanzas', 'ciudad', 'contratos', 'partidos', 'competiciones', 'mercado', 'cantera', 'tactica', 'tactica_plus', 'progresion', 'personaje']);
let fallos = 0; const ok = (n, c) => { if (!c) { fallos++; console.log('FALLA', n); } else console.log('ok   ', n); };
ok('selfTest tacticaPlus', GM.tacticaPlus.selfTest());
const st = GM.newGame('joventut-badalona', 11, { modo: 'gestor', personaje: GM.mods.personaje.crear() }); GM.state = st; const id = st.clubId, T = GM.tacticaPlus, Pt = GM.mods.partidos;
const g0 = st.calendario.find(g => (g.local === id || g.visitante === id) && g.comp), rival = g0.local === id ? g0.visitante : g0.local;
const jug = st.equipos[id].plantilla.map(i => st.jugadores[i]), jugR = st.equipos[rival].plantilla.map(i => st.jugadores[i]);
const reset = () => jug.concat(jugR).forEach(p => { p.estado.fatiga = 0; p.estado.lesion = null; p.estado.moral = 70; p.estado.carga = 0; });
const partido = () => Object.assign({}, g0, { local: id, visitante: rival, resultado: null });
const sim = (n, semilla) => { let dif = 0, gana = 0; for (let i = 0; i < n; i++) { GM.rng.seed(semilla + i * 7); reset(); T.est(st).vistas = {}; const r = Pt.simular(st, partido()); dif += r.local - r.visitante; if (r.local > r.visitante) gana++; } return { dif: dif / n, gana: gana / n }; };
const base = sim(260, 1000); console.log('  sin preparar: margen', base.dif.toFixed(2), 'victorias', base.gana.toFixed(2));
const rec = T.recomendar(st, rival); ok('recomendación con jugadas y emparejamientos: ' + rec.razones.join('; '), rec.libro.length >= 1 && Object.keys(rec.emp).length >= 2);
ok('no más de tres jugadas', !T.fijarLibro(st, [{ id: 'poste', w: 1 }, { id: 'corte', w: 1 }, { id: 'zona', w: 1 }, { id: 'movimiento', w: 1 }]).ok);
ok('preparar el partido', T.preparar(st, rival).ok && T.est(st).libro.length >= 1 && T.est(st).prep.rival === rival);
const sinDom = sim(260, 1000); ok('sin dominio de las jugadas el resultado cambia poco: ' + sinDom.dif.toFixed(2), Math.abs(sinDom.dif - base.dif) < 3.2);
for (let i = 0; i < 40; i++) { st.fecha = GM.util.addDays(st.fecha, 1); GM.bus.emit('dia:avanzado', {}); }
ok('el dominio sube entrenando: ' + JSON.stringify(T.est(st).dominio), Math.max(...Object.values(T.est(st).dominio)) > 50);
const prep = sim(260, 1000); console.log('  preparado: margen', prep.dif.toFixed(2), 'victorias', prep.gana.toFixed(2));
ok('preparar el partido cambia el resultado de forma medible (+' + (prep.dif - base.dif).toFixed(2) + ' puntos de margen)', prep.dif - base.dif > 1.2 && prep.gana > base.gana);
// emparejamientos
const estrella = jugR.slice().sort((a, b) => b.ovr - a.ovr)[0], defensores = jug.slice().sort((a, b) => (b.att.defPer + b.att.defInt) - (a.att.defPer + a.att.defInt)); T.est(st).libro = []; T.est(st).emp = {};
const ptsEstrella = n => { let s = 0; for (let i = 0; i < n; i++) { GM.rng.seed(5000 + i * 11); reset(); const r = Pt.simular(st, partido()); s += (r.stats[estrella.id] ? r.stats[estrella.id].pts : 0); } return s / n; };
defensores.slice(0, 2).forEach(d => { d.att.defPer = 95; d.att.defInt = 95; }); const sin = ptsEstrella(260); defensores.slice(0, 2).forEach(d => T.fijarEmparejamiento(st, d.id, estrella.id)); const con = ptsEstrella(260);
ok('el emparejamiento sobre la estrella rival le quita puntos: ' + sin.toFixed(1) + ' -> ' + con.toFixed(1), con < sin - 0.3);
// minutos objetivo
T.est(st).emp = {}; const j0 = jug.slice().sort((a, b) => b.ovr - a.ovr)[0]; T.fijarMinutos(st, j0.id, 12);
const minutos = (n, semilla) => { let s = 0; for (let i = 0; i < n; i++) { GM.rng.seed(semilla + i); reset(); const r = Pt.simular(st, partido()); s += (r.stats[j0.id] ? r.stats[j0.id].min : 0); } return s / n; };
const m12 = minutos(30, 77); ok('minutos objetivo: la estrella juega unos 12 (' + m12.toFixed(1) + ')', m12 <= 20); T.fijarMinutos(st, j0.id, 36); const m36 = minutos(30, 78); ok('y unos 36 si se pide (' + m36.toFixed(1) + ')', m36 >= 27); T.fijarMinutos(st, j0.id, null);
// química y análisis
const Q = st.quimica; ok('la química se registra por parejas y quintetos', Q && Object.keys(Q.pares).length > 5 && Object.keys(Q.quintetos).length >= 1); const q5 = Object.keys(Q.quintetos)[0].split(','); ok('química del quinteto: ' + T.quimicaQuinteto(st, q5), T.quimicaQuinteto(st, q5) > 45);
st.estadisticas = st.estadisticas || {}; for (let i = 0; i < 3; i++) { GM.rng.seed(300 + i); reset(); const r = Pt.simular(st, partido()); Object.keys(r.stats).forEach(pid => { const s = r.stats[pid], t = st.estadisticas[pid] || (st.estadisticas[pid] = { pj: 0, min: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, fal: 0 }); t.pj++; t.min += s.min; t.pts += s.pts; t.reb += s.reb; t.ast += s.ast; t.stl += s.stl; t.blk += s.blk; t.tov += s.tov; t.pm = (t.pm || 0) + (r.pm && r.pm[pid] || 0); }); }
const tab = T.tablaAvanzada(st); ok('análisis avanzado: +/-, +/- por 40 y valoración por 36', tab.length >= 8 && tab.every(x => typeof x.pm === 'number' && x.val36 !== undefined) && tab.some(x => x.pm !== 0));
const sumaPm = Object.values(st.estadisticas).reduce((s, x) => s + (x.pm || 0), 0); ok('el +/- suma cero entre los dos equipos (' + sumaPm + ')', Math.abs(sumaPm) <= 12);
// la IA se adapta a lo que ve
T.est(st).libro = [{ id: 'pick_roll', w: 3 }]; T.est(st).dominio.pick_roll = 100;
const adapt = vistas => { let m = 0; for (let i = 0; i < 160; i++) { GM.rng.seed(8000 + i); reset(); T.est(st).vistas = { pick_roll: vistas }; const r = Pt.simular(st, partido()); m += r.local - r.visitante; } return m / 160; };
const mA = adapt(0), mB = adapt(7); ok('repetir la jugada hace que el rival se adapte: margen ' + mA.toFixed(2) + ' -> ' + mB.toFixed(2), mB < mA - 0.2);
// charla del descanso
reset(); const D = Pt.crearDirecto(st, partido(), true); D.jugarCuarto(); D.jugarCuarto(); const ch = D.charlaDescanso('A', 'motivar'); ok('charla del descanso', ch.ok && ch.bono > 0 && !D.charlaDescanso('A', 'calma').ok); const fin = D.finalizar(); ok('el partido con charla termina', fin.local > 0);
console.log(fallos ? 'fallos ' + fallos : 'Sin fallos'); process.exit(fallos ? 1 : 0);
