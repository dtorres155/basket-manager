// Pruebas con aserciones: comprueban VALORES (no solo que no haya errores). Las ejecuta test_all.js.
const assert = require('assert');
global.LZString = require('lz-string');
const L = require('./load');
L(['core', 'datos_util', 'datos_nba_este', 'datos_nba_oeste', 'datos_nba_fin', 'datos_euroliga', 'datos_ligas', 'datos_ligas2', 'datos_movimientos', 'datos_ligas3', 'finanzas', 'ciudad', 'partidos', 'competiciones', 'mercado', 'cantera', 'copas', 'continental', 'rivalidades', 'personaje', 'carrera', 'social', 'sponsor', 'pueblo', 'guardado', 'hogar', 'sede_plano', 'sede_acciones', 'casa3d']);
let n = 0; const ok = (nombre, fn) => { fn(); n++; console.log('  ok', nombre); };
const U = GM.util, C = GM.mods.competiciones;

// ---- Partida nueva ----
GM.rng.seed(7); const st = GM.newGame('joventut-badalona', 7, { modo: 'gestor', personaje: { nombre: 'Marc', apellido: 'Soler' } });
ok('estado inicial', () => {
  assert.strictEqual(st.version, GM.VERSION_ESTADO);
  assert.strictEqual(st.clubId, 'joventut-badalona');
  assert.ok(Object.keys(st.equipos).length >= 100, 'equipos');
  assert.ok(Object.keys(st.jugadores).length >= 1400, 'jugadores');
  assert.ok(st.calendario.length > 2000, 'calendario');
  Object.values(st.equipos).forEach(e => assert.ok(e.plantilla.length >= 10, e.id + ' tiene menos de 10 jugadores'));
  Object.values(st.jugadores).forEach(p => { assert.ok(p.ovr >= 20 && p.ovr <= 99, p.id + ' ovr'); assert.ok(p.pot >= p.ovr - 1, p.id + ' pot < ovr'); });
});
// ---- Simulación ----
for (let i = 0; i < 70; i++) C.jugarDia(st);
const jugados = st.calendario.filter(g => g.resultado);
ok('resultados coherentes', () => {
  assert.ok(jugados.length > 300, 'se han jugado partidos');
  jugados.forEach(g => { const r = g.resultado; assert.ok(r.local > 30 && r.visitante > 30, 'marcador bajo ' + g.id); assert.notStrictEqual(r.local, r.visitante, 'empate ' + g.id); const suma = r.cuartos.reduce((s, q) => [s[0] + q[0], s[1] + q[1]], [0, 0]); assert.deepStrictEqual(suma, [r.local, r.visitante], 'cuartos ' + g.id); });
});
ok('medias realistas por liga', () => {
  const med = comp => { const gs = jugados.filter(g => g.comp === comp); return gs.reduce((s, g) => s + g.resultado.local + g.resultado.visitante, 0) / gs.length / 2; };
  const nba = med('NBA'), eu = med('EUROLIGA');
  assert.ok(nba > 105 && nba < 125, 'NBA ' + nba.toFixed(1)); assert.ok(eu > 74 && eu < 92, 'Euroliga ' + eu.toFixed(1));
  const dif = jugados.reduce((s, g) => s + Math.abs(g.resultado.local - g.resultado.visitante), 0) / jugados.length; assert.ok(dif > 7 && dif < 14, 'diferencia media ' + dif.toFixed(1));
});
ok('clasificación cuadra con los partidos', () => {
  const acb = jugados.filter(g => g.comp === 'ACB' && g.fase === 'regular'), T = {}; const f = id => (T[id] = T[id] || { g: 0, pj: 0, pf: 0 });
  acb.forEach(g => { const r = g.resultado, l = f(g.local), v = f(g.visitante); l.pj++; v.pj++; l.pf += r.local; v.pf += r.visitante; (r.local > r.visitante ? l : v).g++; });
  const filas = st.clasificaciones.ACB; assert.ok(Array.isArray(filas) && filas.length === 18, 'tabla ACB de 18');
  let comprobadas = 0; filas.forEach(x => { const e = T[x.equipoId] || { g: 0, pj: 0, pf: 0 }; assert.strictEqual(x.g, e.g, 'victorias de ' + x.equipoId); assert.strictEqual(x.pj, e.pj, 'jugados de ' + x.equipoId); assert.strictEqual(x.pf, e.pf, 'puntos de ' + x.equipoId); comprobadas++; });
  assert.strictEqual(comprobadas, 18);
});
ok('finanzas del club con movimientos', () => { const f = st.finanzas[st.clubId]; assert.ok(typeof f.caja === 'number' && isFinite(f.caja)); assert.ok(f.movimientos.length > 0); });
// ---- Guardado comprimido y migraciones ----
ok('guardado comprimido ida y vuelta', () => {
  const G = GM.mods.guardado; GM.state = st; const plano = JSON.stringify(st);
  assert.ok(G.guardar(1).ok); GM.state = null; assert.ok(G.cargar(1).ok); assert.strictEqual(JSON.stringify(GM.state), plano);
  const ex = G.exportar(); assert.ok(ex.startsWith('GM2:')); assert.ok(ex.length < plano.length / 3, 'la copia comprime');
  GM.state = null; assert.ok(G.importar(ex).ok); assert.strictEqual(JSON.stringify(GM.state), plano);
});
ok('migración desde la versión 1', () => { const v = JSON.parse(JSON.stringify(st)); v.version = 1; delete v.copia; delete v.sede; GM.mods.guardado.migrar(v); assert.strictEqual(v.version, GM.VERSION_ESTADO); assert.ok(v.copia && v.sede && v.sede.charlas); });
// ---- Acciones de la sede ----
ok('charla motivadora: efecto y espera semanal', () => {
  GM.state = st; const A = GM.mods.sedeAcciones, pl = st.equipos[st.clubId].plantilla.map(i => st.jugadores[i]), antes = pl.map(p => p.estado.moral);
  const r = A.hacer(st, 'charla_animo'); assert.ok(r.ok, r.motivo);
  pl.forEach((p, i) => assert.strictEqual(p.estado.moral, Math.min(100, antes[i] + 4)));
  assert.strictEqual(A.hacer(st, 'charla_animo').ok, false, 'no se repite en la misma semana');
});
ok('tratamiento intensivo acorta la baja', () => { const A = GM.mods.sedeAcciones, p = st.jugadores[st.equipos[st.clubId].plantilla[2]]; p.estado.lesion = { tipo: 'Esguince', dias: 20 }; const r = A.tratar(st, p.id); assert.ok(r.ok, r.motivo); assert.strictEqual(p.estado.lesion.dias, 14); assert.strictEqual(A.tratar(st, p.id).ok, false); });
// ---- Casa ----
ok('casa: muebles iniciales y confort', () => { const d = GM.casa.datos(st); assert.ok(d.muebles.length >= 4); assert.ok(GM.casa.confort(st) > 0); assert.ok(GM.casa.CATALOGO.every(c => c[2] > 0)); });
// ---- Carrera: potencial dinámico acotado ----
ok('potencial dinámico entre ±15', () => {
  GM.rng.seed(3); const sc = GM.newGame('joventut-badalona', 3, { modo: 'carrera', personaje: { nombre: 'Marc', apellido: 'Soler' }, carrera: { origen: 'cantera', clubId: 'joventut-badalona', pos: 'SG', perfil: 'tirador', nac: 'ES', agente: 'equilibrado' } });
  const K = GM.mods.carrera, p0 = sc.jugadores.yo.pot; for (let i = 0; i < 40; i++) K.ajustarPot(sc, 1, 'prueba'); assert.strictEqual(sc.jugadores.yo.pot, Math.min(99, p0 + K.POT_MAX));
  for (let i = 0; i < 80; i++) K.ajustarPot(sc, -1, 'prueba'); assert.ok(sc.jugadores.yo.pot >= p0 - K.POT_MAX && sc.jugadores.yo.pot >= sc.jugadores.yo.ovr);
  assert.strictEqual(sc.carrera.dinero, 4, 'ahorros iniciales de cantera');
});
// ---- Datos y calendario 2026-27 ----
ok('ligas de 2026-27 y fechas reales', () => {
  const tam = { ACB: 18, LEGA: 16, GBL: 14, BBL: 18, BSL: 16, EUROLIGA: 20 };
  for (const l in tam) assert.strictEqual(st.ligas[l].equipos.length, tam[l], l + ': número de clubes');
  const primera = comp => st.calendario.filter(g => g.comp === comp && g.fase === 'regular').reduce((m, g) => g.fecha < m ? g.fecha : m, '9999');
  assert.strictEqual(primera('ACB'), '2026-09-26', 'la ACB empieza el 26 de septiembre');
  assert.strictEqual(primera('EUROLIGA'), '2026-09-24', 'la Euroliga empieza el 24 de septiembre');
  const reales = st.equipos['leyma-coruna'].plantilla.map(i => st.jugadores[i]).filter(j => !j.ficticio).length;
  assert.ok(reales >= 10, 'Leyma Coruña con plantilla real');
});
// ---- Draft ----
ok('clase del draft: 72 candidatos y techo lógico', () => {
  const cl = GM.mods.mercado.claseDraft(st);
  assert.strictEqual(cl.length, 72);
  assert.ok(cl.every(p => p.pot >= p.ovr && p.pot <= 97 && p.edad >= 19 && p.edad <= 22));
  assert.ok(cl[0].pot > cl[60].pot, 'los primeros tienen más techo');
});
ok('draft: elegibilidad, informe de ojeadores y proyección', () => {
  GM.rng.seed(5); const sc = GM.newGame('joventut-badalona', 5, { modo: 'carrera', personaje: { nombre: 'Marc', apellido: 'Soler' }, carrera: { origen: 'europa', clubId: 'joventut-badalona', pos: 'SG', perfil: 'tirador', nac: 'ES', agente: 'equilibrado' } });
  const K = GM.mods.carrera, p = sc.jugadores.yo;
  assert.strictEqual(K.elegibleDraft(sc), true, 'con 20 años desde la ACB');
  p.edad = 23; assert.strictEqual(K.elegibleDraft(sc), false, 'con 23 ya no'); p.edad = 20;
  const o = K.informeOjeadores(sc); assert.ok(o >= -5 && o <= 6, 'informe acotado');
  p.ovr = 74; p.pot = 94; const alto = K.mock(sc).pick; p.ovr = 55; p.pot = 66; const bajo = K.mock(sc).pick;
  assert.ok(alto <= 5, 'un 74/94 sale en el top 5 (' + alto + ')'); assert.ok(bajo > 50, 'un 55/66 apenas tiene sitio (' + bajo + ')');
  // Retirada: el salón de la fama resume la carrera
  K.retirarse(sc); const lg = K.legado(sc);
  assert.ok(lg.veredicto && lg.pico >= 55 && lg.clubes !== undefined && typeof lg.salon === 'boolean');
});
ok('potencial dinámico: minutos y talento tardío', () => {
  GM.rng.seed(9); const sc = GM.newGame('unicaja', 9, { modo: 'gestor', personaje: { nombre: 'M' } }), Ca = GM.mods.cantera;
  const jov = Object.values(sc.jugadores).filter(j => j.edad <= 22 && j.equipoId && !j.esYo).slice(0, 200);
  let conMin = 0, sinMin = 0;
  jov.forEach((j, i) => { const pot0 = j.pot; sc.estadisticas[j.id] = i % 2 ? { pj: 30, min: 30 * 28 } : { pj: 30, min: 0 }; Ca.potAnual(sc, j); if (i % 2) conMin += j.pot - pot0; else sinMin += j.pot - pot0; });
  assert.ok(conMin / 100 > sinMin / 100 + 1, 'jugar sube el potencial y no jugar lo baja (' + (conMin / 100).toFixed(2) + ' frente a ' + (sinMin / 100).toFixed(2) + ')');
  assert.ok(jov.every(j => j.pot >= j.ovr && j.pot <= 99));
});
console.log('aserciones', n, 'de', n);
