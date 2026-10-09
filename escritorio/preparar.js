// Prepara escritorio/app: compila el juego (build.js -> dist/), lo copia y le añade los recursos pesados de recursos/pesados/
// (los que no caben o no conviene subir a la web: árboles, modelos grandes...), respetando sus rutas. Uso: node preparar.js
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const RAIZ = path.join(__dirname, '..'), APP = path.join(__dirname, 'app'), PESADOS = path.join(RAIZ, 'recursos', 'pesados');
execSync('node build.js', { cwd: RAIZ, stdio: 'inherit' });
// versión del programa: la del juego más el número de commits (cada publicación sube y el actualizador la reconoce)
{ const base = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8')).version.split('.').slice(0, 2).join('.'), n = execSync('git rev-list --count HEAD', { cwd: RAIZ }).toString().trim(), pj = path.join(__dirname, 'package.json'), P = JSON.parse(fs.readFileSync(pj, 'utf8')); P.version = base + '.' + n; fs.writeFileSync(pj, JSON.stringify(P, null, 2) + String.fromCharCode(10)); console.log('versión de escritorio ' + P.version); }
fs.rmSync(APP, { recursive: true, force: true });
let n = 0, bytes = 0;
const copia = (src, dst) => { fs.mkdirSync(dst, { recursive: true }); for (const e of fs.readdirSync(src, { withFileTypes: true })) { const a = path.join(src, e.name), b = path.join(dst, e.name); if (e.isDirectory()) copia(a, b); else { fs.copyFileSync(a, b); n++; bytes += fs.statSync(a).size; } } };
copia(path.join(RAIZ, 'dist'), APP);
const n0 = n, b0 = bytes; if (fs.existsSync(PESADOS)) copia(PESADOS, APP);
// en el escritorio no hace falta el service worker (el juego ya está en disco)
fs.rmSync(path.join(APP, 'sw.js'), { force: true });
console.log('escritorio/app: ' + n0 + ' archivos del juego (' + (b0 / 1048576).toFixed(1) + ' MB) y ' + (n - n0) + ' pesados (' + ((bytes - b0) / 1048576).toFixed(1) + ' MB)');
