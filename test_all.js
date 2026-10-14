// Ejecuta la batería de pruebas (cada t_*.js imprime su resultado) en paralelo. Falla si algún proceso termina con error o imprime una excepción.
// Uso: node test_all.js                 todas (con build)
//      node test_all.js --solo=hogar,casa   solo las pruebas cuyo nombre contiene alguno de esos textos (sin build si pasas --sin-build)
//      node test_all.js --rapido           salta las pruebas lentas (los recorridos t_flow y t_all), para comprobar cambios pequeños
//      node test_all.js --tiempos          muestra lo que tarda cada una
const { spawn, spawnSync } = require('child_process'), os = require('os');
const PRUEBAS = [
  ['t_all'], ['t_comp'], ['t_copas'], ['t_cont'], ['t_directo'], ['t_entrenador'], ['t_social'], ['t_sponsor'], ['t_rep'], ['t_cadete', 'lenta'], ['t_carrera', 'lenta'], ['t_vida'], ['t_hogar'], ['t_pueblo'],
  ['t_calle'], ['t_campus'], ['t_ui'], ['t_html', 'lenta'], ['t_presui', 'lenta'], ['t_ciui'],
  ['t_flow', 'gestor', 'lenta'], ['t_flow', 'presidente', 'lenta'], ['t_flow', 'entrenador', 'lenta'], ['t_flow', 'carrera-ncaa', 'lenta'], ['t_flow', 'carrera-europa', 'lenta'], ['t_flow', 'carrera-cadete', 'lenta'], ['t_aserciones'], ['t_vecinos'], ['t_movilidad'], ['t_ciudad_dia'], ['t_demografia'], ['t_interaccion'], ['t_casa_editor'], ['t_casas_producto'], ['t_patrimonio'], ['t_economia'], ['t_negocios'], ['t_pueblo_gestion'], ['t_rutina'], ['t_logros_eco'], ['t_temporada'], ['t_sol'], ['t_migracion']
].map(p => ({ t: p[0], a: p.slice(1).filter(x => x !== 'lenta'), lenta: p.includes('lenta') }));
const arg = k => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : null; }, flag = k => process.argv.includes('--' + k);
const MAL = /(TypeError|ReferenceError|SyntaxError|RangeError|AssertionError|ERRORES \[[^\]])|selfTest \w+ false|fallos [1-9]/, ruido = l => /Not implemented: HTMLCanvasElement/.test(l);
const solo = arg('solo') ? arg('solo').split(',') : null, lista = PRUEBAS.filter(p => (!solo || solo.some(s => (p.t + ' ' + p.a.join(' ')).includes(s))) && !(flag('rapido') && p.lenta));
if (!solo || !flag('sin-build')) spawnSync('node', ['build.js'], { stdio: 'inherit', cwd: __dirname });
const paralelo = Math.max(2, Math.min(6, os.cpus().length - 1)), resultados = []; let fallos = 0, sig = 0, vivos = 0; const t0 = Date.now();
function lanzar() {
  while (vivos < paralelo && sig < lista.length) {
    const p = lista[sig++], i = sig - 1, ini = Date.now(); vivos++; let out = '';
    const h = spawn('node', [p.t + '.js', ...p.a], { cwd: __dirname }); h.stdout.on('data', d => { out += d; }); h.stderr.on('data', d => { out += d; });
    const corte = setTimeout(() => { out += '\nTimeout de 240 s'; h.kill(); }, 240000);
    h.on('close', code => { clearTimeout(corte); vivos--; const limpia = out.split('\n').filter(l => !ruido(l)).join('\n'), ok = code === 0 && !MAL.test(limpia) && !/Timeout de 240/.test(limpia); if (!ok) fallos++; resultados[i] = { p, ok, limpia, ms: Date.now() - ini }; if (sig >= lista.length && vivos === 0) fin(); else lanzar(); });
  }
}
function fin() {
  resultados.forEach(r => { console.log((r.ok ? 'OK    ' : 'FALLA ') + [r.p.t, ...r.p.a].join(' ') + (flag('tiempos') ? '  ' + (r.ms / 1000).toFixed(1) + ' s' : '')); if (!r.ok) console.log(r.limpia.split('\n').filter(l => MAL.test(l) || /Error|Timeout/.test(l)).slice(0, 4).map(l => '      ' + l.slice(0, 160)).join('\n')); });
  console.log((fallos ? '\n' + fallos + ' pruebas con fallos' : '\nTodas las pruebas pasan') + ' (' + lista.length + ' pruebas, ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s, ' + paralelo + ' en paralelo)'); process.exit(fallos ? 1 : 0);
}
if (!lista.length) { console.log('Ninguna prueba coincide'); process.exit(1); } lanzar();
