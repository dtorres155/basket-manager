// Vida del jugador (vida.js): una temporada de carrera con lesión, redes, vestuario, familia, logros, mascota y la retirada a entrenador.
// Uso: node tools/vida_prueba.js
process.chdir(require('path').join(__dirname, '..'));
global.LZString = require('lz-string'); const L = require('../load');
L(['core', 'datos_util', 'datos_valoraciones', 'datos_nba_este', 'datos_nba_oeste', 'datos_nba_fin', 'datos_euroliga', 'datos_ligas', 'datos_ligas2', 'datos_movimientos', 'datos_ligas3', 'finanzas', 'ciudad', 'partidos', 'competiciones', 'mercado', 'cantera', 'copas', 'continental', 'rivalidades', 'personaje', 'carrera', 'estilo', 'movil', 'ciudad3d', 'social', 'sponsor', 'pueblo', 'vida', 'gente', 'guardado', 'hogar', 'sede_plano', 'sede_acciones', 'entrenador', 'rua']);
const U = GM.util; GM.rng.seed(5);
const st = GM.newGame('joventut-badalona', 5, { modo: 'carrera', personaje: { nombre: 'Marc', apellido: 'Soler' }, carrera: { origen: 'europa', clubId: 'joventut-badalona', pos: 'SG', perfil: 'tirador', nac: 'ES', agente: 'equilibrado' } });
{ const y = st.jugadores.yo; y.ovr = 79; Object.keys(y.att).forEach(k => { y.att[k] = Math.max(y.att[k], 80); }); }
const V = GM.mods.vida, C = GM.mods.competiciones; console.log('selfTest', V.selfTest(), 'fase', st.carrera.fase);
const t0 = Date.now(); let n = 0, lesion = false;
while (!st.temporadaTerminada && n < 400) { C.jugarDia(st); n++; if (st.jugadores.yo.estado.lesion) lesion = true; if (n === 20) console.log('publicar', V.publicar(st, 'entreno').texto, '|', JSON.stringify(V.publicar(st, 'fiesta'))); if (n === 60) { st.jugadores.yo.estado.lesion = { tipo: 'Esguince de tobillo', dias: 14 }; } }
console.log('días', n, (Date.now() - t0) + ' ms', 'lesión vista', lesion);
const Mv = GM.mods.movil, chats = Mv.chats(st); console.log('chats', chats.map(c => c.nombre + (c.pendientes ? '*' : '')).join(', '));
const med = Mv.chat(st, 'medico'); console.log('médico:', med.map(m => m.t + ' [' + (m.estado || '') + ']').join(' / ').slice(0, 300));
console.log('vestuario', JSON.stringify(V.vestuario(st)).slice(0, 300));
console.log('redes', V.redes(st).seg, V.redes(st).posts.length);
console.log('logros', V.logros(st).filter(x => x.fecha).map(x => x.t).join(', '));
console.log('retos', JSON.stringify(V.retos(st)));
for (let s = 0; s < 3; s++) { C.nuevaTemporada(st); st.temporadaTerminada = false; for (let i = 0; i < 3; i++) C.jugarDia(st); }
GM.mods.competiciones.nuevaTemporada && GM.mods.competiciones.nuevaTemporada(st); for (let i = 0; i < 5; i++) C.jugarDia(st);
console.log('familia', JSON.stringify(V.familia(st)).slice(0, 400));
console.log('adoptar', V.adoptar(st, 'perro').texto, V.jugarMascota(st).texto);
// retirada
console.log('retiro', JSON.stringify(GM.mods.carrera.retirarse(st)).slice(0, 80));
const of = V.ofertasRetiro(st); console.log('ofertas', of.map(o => o.id + ':' + o.clubes.map(e => e.nombre).join('/')).join(' | '));
const r = V.elegirRetiro(st, 'entrenador', of[0].clubes[0].id); console.log('elegir', JSON.stringify(r), st.modo, st.clubId, !!st.entrenador);
for (let i = 0; i < 10; i++) C.jugarDia(st); console.log('10 días como entrenador sin errores; ahorros', st.hogar.ahorros);
const G = GM.mods.guardado; console.log('guardado', JSON.stringify(st).length);
