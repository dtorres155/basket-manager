// Punto 83: `npm run calidad` ejecuta todas las comprobaciones de una versión y acaba diciendo PUBLICABLE o NO PUBLICABLE (y escribe docs/CALIDAD.md con el detalle).
// Pasos: build, las pruebas de Node (npm test, con las partidas antiguas fabricadas de t_migracion y el presupuesto de modelos), partidas reales (tools/partidas_antiguas/), todas las escenas, las ciudades reales (una muestra; --completo las 117, unos 40 min),
// presupuesto de rendimiento del banco de capturas, regresión visual de las pantallas fijas y las pruebas de navegador de las tandas.
// Uso: node tools/calidad.js [--rapido] [--completo]   --rapido: solo el test rápido y la regresión visual (para mirar antes de seguir); --completo: barrido de todas las ciudades. Arranca el servidor si no está en marcha.
const { spawn, spawnSync } = require('child_process');
const fs = require('fs'),
  path = require('path'),
  http = require('http');
const raiz = path.join(__dirname, '..'),
  rapido = process.argv.includes('--rapido'),
  completo = process.argv.includes('--completo'),
  node = process.execPath;
const FORMATO = [
  ['Linter (errores reales)', ['node_modules/eslint/bin/eslint.js', '.'], 300],
  ['Formato (Prettier)', ['node_modules/prettier/bin/prettier.cjs', '--check', '*.js', 'tools/*.js'], 300]
];
const PASOS = rapido
  ? [...FORMATO, ['Build y pruebas rápidas', ['test_all.js', '--rapido'], 900], ['Regresión visual', ['tools/regresion_visual.js'], 300]]
  : [
      ...FORMATO,
      ['Pruebas de Node (npm test)', ['test_all.js'], 1500],
      ['Partidas reales', ['tools/partidas_antiguas.js'], 300],
      ['Todas las escenas', ['tools/escenas_todas.js'], 900],
      completo ? ['Barrido de las ciudades reales', ['tools/barrido_ciudades.js'], 4500] : ['Ciudades reales (muestra)', ['tools/real_clubes.js'], 900],
      ['Presupuesto de rendimiento', ['tools/banco.js', 'joventut-badalona', 'calidad', '--escenas=calle,pueblo'], 900],
      ['Regresión visual', ['tools/regresion_visual.js'], 300],
      ['Tanda 33: diseño, mundo y accesibilidad', ['tools/tanda33_ui.js'], 600],
      ['Tanda 35: ajustes, misiones y sonido', ['tools/tanda35_ui.js'], 600],
      ['Tanda 37: resumen del día, contratos y autoguardado', ['tools/tanda37_ui.js'], 300]
    ];
const vivo = () =>
  new Promise(r => {
    const q = http.get('http://localhost:8080/', x => {
      x.resume();
      r(true);
    });
    q.on('error', () => r(false));
    q.setTimeout(1500, () => {
      q.destroy();
      r(false);
    });
  });
(async () => {
  let servidor = null;
  if (!(await vivo())) {
    servidor = spawn(node, ['serve.js'], { cwd: raiz, stdio: 'ignore' });
    for (let i = 0; i < 20 && !(await vivo()); i++) await new Promise(r => setTimeout(r, 500));
  }
  if (!rapido) spawnSync(node, ['build.js'], { cwd: raiz, stdio: 'ignore' });
  const filas = [];
  let todo = true;
  const t0 = Date.now();
  for (const [nombre, args, seg] of PASOS) {
    const t = Date.now();
    process.stdout.write(nombre.padEnd(44));
    const r = spawnSync(node, args, { cwd: raiz, encoding: 'utf8', timeout: seg * 1000, maxBuffer: 64 * 1024 * 1024 }),
      ok = r.status === 0,
      s = Math.round((Date.now() - t) / 1000);
    console.log((ok ? 'ok' : 'FALLA') + '  ' + s + ' s');
    if (!ok) {
      todo = false;
      const cola = ((r.stdout || '') + (r.stderr || ''))
        .split('\n')
        .filter(l => /FALLA|Error|fallo|errores:/.test(l))
        .slice(0, 6);
      cola.forEach(l => console.log('    ' + l.slice(0, 200)));
      filas.push({ nombre, ok, s, cola });
    } else filas.push({ nombre, ok, s, cola: [] });
  }
  if (servidor) servidor.kill();
  const veredicto = todo ? 'PUBLICABLE' : 'NO PUBLICABLE';
  const md =
    '# Calidad de la versión\n\n' +
    new Date().toISOString().slice(0, 16).replace('T', ' ') +
    ', ' +
    Math.round((Date.now() - t0) / 60000) +
    ' min, modo ' +
    (rapido ? 'rápido' : completo ? 'completo' : 'normal') +
    '.\n\n**' +
    veredicto +
    '**\n\n| Paso | Resultado | Tiempo |\n|---|---|---|\n' +
    filas.map(f => '| ' + f.nombre + ' | ' + (f.ok ? 'ok' : 'FALLA') + ' | ' + f.s + ' s |').join('\n') +
    '\n' +
    filas
      .filter(f => !f.ok)
      .map(f => '\n### ' + f.nombre + '\n```\n' + f.cola.join('\n') + '\n```')
      .join('\n') +
    '\n';
  if (!rapido) fs.writeFileSync(path.join(raiz, 'docs', 'CALIDAD.md'), md);
  console.log('\n' + veredicto);
  process.exit(todo ? 0 : 1);
})();
