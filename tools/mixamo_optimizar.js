// Simplifica los glb de personajes de Mixamo (weld, simplify al 15 %, texturas webp) y copia las animaciones. Uso: node tools/mixamo_optimizar.js [carpeta] [razon]
// Entrada: <carpeta>/glb/{personajes,animaciones}. Salida: <carpeta>/opt/{personajes,animaciones} (≈1,3 MB y ≈8 000 triángulos por personaje, fuera de git).
// Y <carpeta>/opt/personajes/lod/<id>.glb: la versión de media distancia (punto 106), al 25 % (≈2 000 triángulos) y con las texturas
// reducidas a 8 px (el juego usa la lámina de la versión normal).
const { execFileSync } = require('child_process'),
  fs = require('fs'),
  path = require('path');
const carpeta = process.argv[2] || 'C:/Users/Dabvid-/mixamo',
  razon = process.argv[3] || '0.15';
const G = path.resolve(__dirname, '..', 'recursos/herramientas/node_modules/.bin/gltf-transform' + (process.platform === 'win32' ? '.cmd' : ''));
const dest = path.join(carpeta, 'opt');
['personajes', 'animaciones', 'personajes/lod'].forEach(d => fs.mkdirSync(path.join(dest, d), { recursive: true }));
const gt = (...a) => execFileSync(G, a, { stdio: 'pipe', shell: process.platform === 'win32' });
fs.readdirSync(path.join(carpeta, 'glb/animaciones')).forEach(f => fs.copyFileSync(path.join(carpeta, 'glb/animaciones', f), path.join(dest, 'animaciones', f)));
for (const f of fs.readdirSync(path.join(carpeta, 'glb/personajes')).filter(f => f.endsWith('.glb'))) {
  const src = path.join(carpeta, 'glb/personajes', f),
    out = path.join(dest, 'personajes', f),
    t1 = out + '.1',
    t2 = out + '.2';
  if (!(fs.existsSync(out) && fs.statSync(out).mtimeMs > fs.statSync(src).mtimeMs)) {
    gt('weld', src, t1);
    gt('simplify', t1, t2, '--ratio', razon, '--error', '0.02');
    gt('webp', t2, out, '--quality', '80');
    fs.unlinkSync(t1);
    fs.unlinkSync(t2);
    console.log(f, (fs.statSync(src).size / 1048576).toFixed(1) + ' MB ->', (fs.statSync(out).size / 1048576).toFixed(2) + ' MB');
  }
  const lod = path.join(dest, 'personajes', 'lod', f);
  if (!(fs.existsSync(lod) && fs.statSync(lod).mtimeMs > fs.statSync(out).mtimeMs)) {
    gt('simplify', out, t1, '--ratio', '0.25', '--error', '0.05');
    gt('resize', t1, lod, '--width', '8', '--height', '8');
    fs.unlinkSync(t1);
    console.log(f, 'media distancia', (fs.statSync(lod).size / 1024).toFixed(0) + ' KB');
  }
}
