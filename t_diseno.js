// Tanda 33: sistema de diseño, HUD del mundo, etiquetas del mapa, idiomas, controles, accesibilidad y canteras (incluida la real de Dabone)
const L = require('./load');
L(['core', 'ligas_config', 'datos_util', 'datos_valoraciones', 'datos_nba_este', 'datos_nba_oeste', 'datos_nba_fin', 'datos_euroliga', 'datos_ligas', 'datos_ligas2', 'datos_movimientos', 'datos_ligas3', 'datos_plantillas_extra', 'datos_ligas_extra', 'finanzas', 'ciudad', 'contratos', 'partidos', 'competiciones', 'mercado', 'cantera', 'copas', 'continental', 'personaje', 'carrera', 'i18n_datos', 'i18n', 'controles', 'accesibilidad', 'vehiculos', 'mobiliario_ciudad', 'monumentos_ciudad']);
let fallos = 0; const ok = (n, c) => { if (!c) { fallos++; console.log('FALLA', n); } else console.log('ok   ', n); };
ok('selfTest i18n', GM.i18n.selfTest());
ok('selfTest controles', GM.controles.selfTest()); ok('selfTest vehiculos, mobiliario y monumentos', GM.vehiculos.selfTest() && GM.mobiliario.selfTest() && GM.monumentos.selfTest());
ok('selfTest accesibilidad', typeof document === 'undefined' || GM.accesibilidad.selfTest());
GM.i18n.setIdioma('ca'); ok('catalán: Plantilla/Mercado', GM.i18n.t('Mercado') === 'Mercat' && GM.i18n.t('12 años') === '12 anys');
GM.i18n.setIdioma('en'); ok('inglés: Aceptar oferta', GM.i18n.t('Aceptar oferta') === 'Accept offer'); GM.i18n.setIdioma('es');
const st = GM.newGame('fc-barcelona', 5, { modo: 'gestor', personaje: GM.mods.personaje.crear() }); GM.state = st;
const cb = (st.cantera['fc-barcelona'] || {}).juveniles || [];
ok('cantera del Barça con Dabone real', cb.some(i => /Dabone/.test(st.jugadores[i].nombre)));
ok('todos los clubes tienen cantera', Object.keys(st.equipos).filter(id => !st.cantera[id] || !st.cantera[id].juveniles.length).length === 0);
const antes = JSON.stringify(Object.keys(st.jugadores).length); GM.mods.cantera.renovarCanterasIA(st);
ok('renovar canteras de la IA no rompe nada (' + antes + ' -> ' + Object.keys(st.jugadores).length + ')', Object.values(st.equipos).every(e => e.plantilla.every(i => st.jugadores[i])));
console.log(fallos ? fallos + ' fallos' : 'Todo ok'); process.exit(fallos ? 1 : 0);
