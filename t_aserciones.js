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
ok('potencial dinámico entre ±8', () => {
  GM.rng.seed(3); const sc = GM.newGame('joventut-badalona', 3, { modo: 'carrera', personaje: { nombre: 'Marc', apellido: 'Soler' }, carrera: { origen: 'cantera', clubId: 'joventut-badalona', pos: 'SG', perfil: 'tirador', nac: 'ES', agente: 'equilibrado' } });
  const K = GM.mods.carrera, p0 = sc.jugadores.yo.pot; for (let i = 0; i < 40; i++) K.ajustarPot(sc, 1, 'prueba'); assert.strictEqual(sc.jugadores.yo.pot, p0 + 8);
  for (let i = 0; i < 80; i++) K.ajustarPot(sc, -1, 'prueba'); assert.ok(sc.jugadores.yo.pot >= p0 - 8 && sc.jugadores.yo.pot >= sc.jugadores.yo.ovr);
  assert.strictEqual(sc.carrera.dinero, 4, 'ahorros iniciales de cantera');
});
console.log('aserciones', n, 'de', n);
