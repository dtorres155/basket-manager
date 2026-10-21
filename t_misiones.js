// Puntos 80 a 82: música dinámica, misiones de inicio, registro de errores y comprobaciones de los módulos nuevos que no necesitan navegador
const L = require('./load');
L([
  'core',
  'registro',
  'ligas_config',
  'datos_util',
  'datos_valoraciones',
  'datos_nba_este',
  'datos_nba_oeste',
  'datos_nba_fin',
  'datos_euroliga',
  'datos_ligas',
  'datos_ligas2',
  'datos_movimientos',
  'datos_ligas3',
  'datos_plantillas_extra',
  'datos_ligas_extra',
  'finanzas',
  'ciudad',
  'contratos',
  'partidos',
  'competiciones',
  'mercado',
  'cantera',
  'copas',
  'personaje',
  'carrera',
  'muestras',
  'musica',
  'misiones'
]);
let fallos = 0;
const ok = (n, c) => {
  if (!c) {
    fallos++;
    console.log('FALLA', n);
  } else console.log('ok   ', n);
};
ok('selfTest musica', GM.musica.selfTest());
ok('selfTest muestras', GM.muestras.selfTest());
ok('selfTest misiones', GM.misiones.selfTest());
ok('selfTest registro', GM.registro.selfTest());
ok('los ajustes de mezcla tienen cinco niveles', Object.keys(GM.musica.mezcla()).length === 5 && GM.musica.nivel('general') > 0);
GM.musica.setNivel('musica', 0.3);
ok('setNivel guarda el valor', Math.abs(GM.musica.nivel('musica') - 0.3) < 1e-9);
ok('el estado de la música sin contexto de audio no falla', GM.musica.estado().actual === null && GM.musica.estado().contexto === false);
ok(
  'las misiones cubren los cuatro modos',
  ['gestor', 'presidente', 'entrenador', 'carrera'].every(m => GM.misiones.lista({ modo: m }).length >= 5)
);
const st = GM.newGame('fc-barcelona', 3, { modo: 'gestor', personaje: GM.mods.personaje.crear() });
GM.state = st;
GM.bus.emit('pantalla:abierta', { id: 'plantilla' });
GM.bus.emit('dia:avanzado', {});
const p = GM.misiones.progreso(st);
ok('abrir Plantilla y avanzar un día completan dos misiones', p.hechas === 2 && p.siguiente && p.siguiente.id !== 'plantilla');
const C = GM.mods.competiciones;
let n = 0;
while (!st.misiones.hechas.partido && n++ < 60) C.jugarDia(st);
ok('jugar el primer partido completa su misión (' + n + ' días)', !!st.misiones.hechas.partido);
GM.registro.anotar('error de prueba', 'test');
ok(
  'el registro anota un error',
  GM.registro.lista().some(e => e.m === 'error de prueba')
);
GM.registro.informe().then(t => {
  const j = JSON.parse(t);
  ok('el informe es JSON con partida y errores', j.partida && j.partida.modo === 'gestor' && Array.isArray(j.errores));
  GM.registro.vaciar();
  console.log(fallos ? fallos + ' fallos' : 'Todo ok');
  process.exit(fallos ? 1 : 0);
});
