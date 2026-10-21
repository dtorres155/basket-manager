// Segunda y tercera categoría: LEB Oro y LEB Plata, ascensos y descensos, cesiones de canteranos y la propuesta de cesión en el modo carrera
const L = require('./load');
L(['core', 'ligas_config', 'datos_util', 'datos_valoraciones', 'datos_nba_este', 'datos_nba_oeste', 'datos_nba_fin', 'datos_euroliga', 'datos_ligas', 'datos_ligas2', 'datos_movimientos', 'datos_ligas3', 'datos_plantillas_extra', 'datos_ligas_extra', 'datos_ligas_ascenso', 'finanzas', 'ciudad', 'contratos', 'partidos', 'competiciones', 'mercado', 'cantera', 'copas', 'continental', 'rivalidades', 'personaje', 'carrera', 'estilo', 'movil', 'entrenador', 'ojeadores', 'economia', 'vida', 'ascensos']);
let fallos = 0; const ok = (n, c) => { if (!c) { fallos++; console.log('FALLA', n); } else console.log('ok   ', n); };
ok('selfTest ascensos', GM.mods.ascensos.selfTest());
const st = GM.newGame('fc-barcelona', 7, { modo: 'gestor', personaje: GM.mods.personaje.crear() }); GM.state = st;
ok('LEB Oro y LEB Plata existen', st.ligas.LEBORO && st.ligas.LEBORO.equipos.length === 16 && st.ligas.LEBPLATA && st.ligas.LEBPLATA.equipos.length === 14);
ok('los clubes de LEB tienen plantilla y cantera', st.ligas.LEBORO.equipos.every(i => st.equipos[i].plantilla.length >= 8) && st.cantera['leb-palencia']);
ok('mercado.ligaDe de Palencia', GM.mods.mercado.ligaDe(st, 'leb-palencia') === 'LEBORO');
const A = GM.mods.ascensos, cand = A.candidatos(st, 'fc-barcelona'); const dab = cand.find(c => /Dabone/.test(c.p.nombre));
ok('Dabone es candidato a cesión desde la cantera', !!dab && dab.desdeCantera);
const r = A.ceder(st, dab.p.id, 'leb-palencia'); ok('cesión de Dabone al Palencia', r.ok && st.equipos['leb-palencia'].plantilla.indexOf(dab.p.id) >= 0 && st.cantera['fc-barcelona'].juveniles.indexOf(dab.p.id) < 0);
const C = GM.mods.competiciones; let n = 0; while (!st.temporadaTerminada && n++ < 500) C.jugarDia(st);
ok('la temporada termina (' + n + ' días)', st.temporadaTerminada);
ok('Dabone vuelve a la cantera del Barça', st.cantera['fc-barcelona'].juveniles.indexOf(dab.p.id) >= 0 && st.equipos['leb-palencia'].plantilla.indexOf(dab.p.id) < 0 && !dab.p.cesionDe);
const h = st.ascensos.hist; ok('hay ascensos y descensos anotados', h.length === 1 && h[0].sube.length === 5 && h[0].baja.length === 5);
ok('las ligas conservan su tamaño', st.ligas.ACB.equipos.length === 18 && st.ligas.LEBORO.equipos.length === 16 && st.ligas.LEBPLATA.equipos.length === 14);
C.nuevaTemporada(st); ok('el calendario de la nueva temporada incluye a los ascendidos', st.calendario.some(g => g.comp === 'ACB' && h[0].sube.indexOf(g.local) >= 0));
console.log(fallos ? fallos + ' fallos' : 'Todo ok'); process.exit(fallos ? 1 : 0);
