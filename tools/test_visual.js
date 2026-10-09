// Pruebas en el navegador real (Edge): arranca el servidor, pasa los recorridos 3D y falla si hay errores de página.
// Uso: npm run test:visual   (necesita `npm run build` antes; tarda unos minutos)
const { spawn, spawnSync } = require('child_process'), path = require('path'), http = require('http');
const raiz = path.join(__dirname, '..'), PORT = 8099, URL = 'http://localhost:' + PORT + '/';
const PRUEBAS = ['sin_red.js', 'escenas_todas.js', 'sede_capturas.js', 'sede_vida.js', 'calle_capturas.js', 'barrio_capturas.js', 'casa_capturas.js'];
const srv = spawn(process.execPath, ['serve.js'], { cwd: raiz, env: Object.assign({}, process.env, { PORT }), stdio: 'ignore' });
const listo = () => new Promise(res => { const t = () => http.get(URL, r => { r.resume(); res(); }).on('error', () => setTimeout(t, 200)); t(); });
listo().then(() => {
  let fallos = 0;
  for (const f of PRUEBAS) {
    const r = spawnSync(process.execPath, [path.join(__dirname, f)], { cwd: raiz, env: Object.assign({}, process.env, { URL }), encoding: 'utf8', timeout: 300000 });
    const salida = (r.stdout || '') + (r.stderr || ''), err = /errores: \[\s*\]|errores: ninguno|errores: \[\]/.test(salida) || /peticiones externas bloqueadas: ninguna/.test(salida);
    const okp = r.status === 0 && err && !/pageerror|TypeError|ReferenceError/.test(salida);
    if (!okp) fallos++; console.log((okp ? 'OK    ' : 'FALLA ') + f); if (!okp) console.log(salida.split('\n').slice(-8).map(l => '      ' + l).join('\n'));
  }
  srv.kill(); console.log(fallos ? '\n' + fallos + ' pruebas visuales con fallos' : '\nTodas las pruebas visuales pasan'); process.exit(fallos ? 1 : 0);
});
