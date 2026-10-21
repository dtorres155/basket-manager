// Traspasos en los modos entrenador (la directiva negocia) y carrera (tu representante negocia), y rumores en la prensa de la ciudad.
const L = require('./load');
L(['core', 'datos_util', 'datos_nba_este', 'datos_nba_oeste', 'datos_nba_fin', 'datos_euroliga', 'datos_ligas', 'datos_ligas2', 'datos_movimientos', 'datos_ligas3', 'finanzas', 'ciudad', 'contratos', 'partidos', 'competiciones', 'mercado', 'cantera', 'negociacion', 'traspasos', 'traspasos_modos', 'personaje', 'carrera', 'estilo', 'movil', 'entrenador']);
let fallos = 0; const ok = (n, c) => { if (!c) { fallos++; console.log('FALLA', n); } else console.log('ok   ', n); };
ok('selfTest', GM.traspasosModos.selfTest()); GM.noticia = GM.noticia || ((s, t) => s.noticias.push(t));
const avanza = (st, d) => { for (let i = 0; i < d; i++) { st.fecha = GM.util.addDays(st.fecha, 1); GM.bus.emit('dia:avanzado', {}); } };
// ---- entrenador
let st = GM.newGame('joventut-badalona', 11, { modo: 'entrenador', personaje: GM.mods.personaje.crear() }); GM.state = st; const T = GM.traspasos, TM = GM.traspasosModos, Me = GM.mods.mercado; st.finanzas[st.clubId].caja = 3e8; st.entrenador.peticiones = 3;
const objetivo = Me.buscar(st, { liga: 'ACB', minOvr: 68 }).find(p => !st.equipos[p.equipoId].plantilla.map(i => st.jugadores[i]).sort((a, b) => b.ovr - a.ovr).slice(0, 2).some(q => q.id === p.id));
const d = TM.delegar(st, objetivo.id); ok('el entrenador delega el fichaje en la directiva', d.ok && d.negociacion.estado === 'en curso'); avanza(st, 12);
const dn = TM.delegados(st)[0]; ok('la directiva negocia en rondas y cierra o rompe: ' + dn.estado + ' tras ' + dn.ronda + ' rondas', dn.estado !== 'en curso' && dn.ronda >= 1 && dn.log.length >= 1); console.log('   ' + dn.log.join(' | ').slice(0, 300));
if (dn.estado === 'hecho') ok('el jugador llega al club', objetivo.equipoId === st.clubId);
ok('con el mercado cerrado no se delega', (() => { st.fecha = '2026-11-20'; const o2 = Me.buscar(st, { liga: 'ACB', minOvr: 68 })[5]; const r = TM.delegar(st, o2.id); return !r.ok && /cerrado/.test(r.motivo); })());
// ---- carrera
GM.bus.emit && 0; const pj = GM.mods.personaje.crear(); pj.nombre = 'Marc'; st = GM.newGame('joventut-badalona', 11, { modo: 'carrera', personaje: pj, carrera: { pos: 'SG', perfil: 'tirador', nac: 'ES', origen: 'europa', agente: 'equilibrado', clubId: 'joventut-badalona' } }); GM.state = st; const yo = st.jugadores.yo; yo.ovr = 82; yo.pot = 88;
const dest = Object.keys(st.equipos).find(c => c !== yo.equipoId && Me.ligaDe(st, c) === Me.ligaDe(st, yo.equipoId) && st.equipos[c].reputacion >= 60);
const r = TM.pedirSalir(st, dest); ok('el jugador pide salir a un club: ' + (r.ok ? 'ok' : r.motivo), r.ok); avanza(st, 10); const N = st.carrera.traspaso;
ok('el representante negocia entre los clubes en rondas: ' + N.estado + ' (' + N.ronda + ' rondas)', N.estado !== 'en curso' && N.ronda >= 1); console.log('   ' + N.log.join(' | ').slice(0, 300));
const msgs = GM.mods.movil.chat(st, 'agente').filter(m => /ronda|acuerdo|negoci|Ronda/i.test(m.t)); ok('cada ronda llega al móvil: ' + msgs.length + ' mensajes', msgs.length >= 1);
if (N.estado === 'acuerdo') { const of = st.carrera.ofertas.find(o => o.tipo === 'Traspaso'); ok('con acuerdo aparece la oferta de traspaso', !!of && of.clubId === dest); const a = GM.mods.carrera.aceptar(st, of.id); ok('aceptarla cambia de club', a.ok && st.jugadores.yo.equipoId === dest); }
// consultas por el móvil
st = GM.newGame('joventut-badalona', 12, { modo: 'carrera', personaje: pj, carrera: { pos: 'SG', perfil: 'tirador', nac: 'ES', origen: 'europa', agente: 'equilibrado', clubId: 'joventut-badalona' } }); GM.state = st; st.jugadores.yo.ovr = 85; let vistas = 0; for (let k = 0; k < 60; k++) { st.fecha = GM.util.addDays('2026-09-28', (k % 3) * 7 + Math.floor(k / 3) * 91 % 7 * 0); st.fecha = GM.util.addDays('2026-09-21', 7 * (k % 3) + 0); while (GM.util.weekday(st.fecha) !== 1) st.fecha = GM.util.addDays(st.fecha, 1); st.fecha = GM.util.addDays(st.fecha, 0); st.seed = 'x' + k; GM.mods.movil.noLeidos(st); TM.consulta(st); const c = GM.mods.movil.chat(st, 'agente'); vistas = c.filter(m => m.dec && m.dec.tipo === 'traspaso').length; st.carrera.traspaso = null; if (vistas) break; }
ok('el representante avisa de clubes interesados', vistas >= 1);
// ---- prensa de la ciudad
st = GM.newGame('joventut-badalona', 11, { modo: 'gestor', personaje: GM.mods.personaje.crear() }); GM.state = st; for (let i = 0; i < 30; i++) { st.fecha = GM.util.addDays(st.fecha, 1); GM.bus.emit('dia:avanzado', {}); }
const t = T.titulares(st, 4), ac = T.accionesPrensa(st); ok('la prensa cuenta los rumores: ' + t.length + ' titulares', t.length >= 1 && ac.length === t.length && ac[0].fn().ok);
console.log(fallos ? 'fallos ' + fallos : 'Sin fallos'); process.exit(fallos ? 1 : 0);
