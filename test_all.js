// Ejecuta la batería de pruebas (cada t_*.js imprime su resultado). Falla si algún proceso termina con error o imprime una excepción.
const { spawnSync } = require('child_process');
const PRUEBAS = [
  ['t_all'], ['t_comp'], ['t_copas'], ['t_cont'], ['t_directo'], ['t_entrenador'], ['t_social'], ['t_sponsor'], ['t_rep'], ['t_cadete'], ['t_carrera'], ['t_vida'], ['t_hogar'], ['t_pueblo'],
  ['t_calle'], ['t_campus'], ['t_ui'], ['t_html'], ['t_presui'], ['t_ciui'],
  ['t_flow', 'gestor'], ['t_flow', 'presidente'], ['t_flow', 'entrenador'], ['t_flow', 'carrera-ncaa'], ['t_flow', 'carrera-europa'], ['t_flow', 'carrera-cadete'], ['t_aserciones']
];
const MAL = /(TypeError|ReferenceError|SyntaxError|RangeError|AssertionError|ERRORES \[[^\]])|selfTest \w+ false|fallos [1-9]/;
const ruido = l => /Not implemented: HTMLCanvasElement/.test(l);
let fallos = 0;
spawnSync('node', ['build.js'], { stdio: 'inherit', cwd: __dirname });
PRUEBAS.forEach(([t, ...a]) => {
  const r = spawnSync('node', [t + '.js', ...a], { cwd: __dirname, encoding: 'utf8', timeout: 240000 });
  const salida = (r.stdout || '') + (r.stderr || ''), limpia = salida.split('\n').filter(l => !ruido(l)).join('\n');
  const ok = r.status === 0 && !MAL.test(limpia);
  if (!ok) fallos++;
  console.log((ok ? 'OK    ' : 'FALLA ') + [t, ...a].join(' '));
  if (!ok) console.log(limpia.split('\n').filter(l => MAL.test(l) || /Error/.test(l)).slice(0, 4).map(l => '      ' + l.slice(0, 160)).join('\n'));
});
console.log(fallos ? '\n' + fallos + ' pruebas con fallos' : '\nTodas las pruebas pasan');
process.exit(fallos ? 1 : 0);
