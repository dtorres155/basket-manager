// Optimiza los personajes de Rocketbox convertidos (tools/rocketbox_convertir.js) y los instala para la versión de escritorio (punto 107):
// weld, simplify a unos 8 000 triángulos y texturas WebP; la versión de media distancia al 25 % con las texturas reducidas a 8 px (el juego
// usa la lámina de la normal). Copia personajes, lod/ y anim/ a recursos/pesados/modelos/personas/rocketbox (y a dist con --dist) y escribe
// lista.json ({ h: [ids], m: [ids], roles: { obrero: [...] } }) según ETIQUETAS. Los modelos no van a git (licencia MIT, pero pesan).
// Uso: node tools/rocketbox_optimizar.js [--dist]
const { execFileSync } = require('child_process'),
  fs = require('fs'),
  path = require('path');
const raiz = path.resolve(__dirname, '..'),
  G = path.join(raiz, 'recursos/rocketbox/glb'),
  O = path.join(raiz, 'recursos/rocketbox/opt'),
  GT = path.join(raiz, 'recursos/herramientas/node_modules/.bin/gltf-transform' + (process.platform === 'win32' ? '.cmd' : ''));
// h, m o r:<papel>; sin etiqueta no se instala (Police_Male_01 lleva el escudo de Afganistán en la manga)
const ETIQUETAS = {
  Male_Adult_01: 'h',
  Male_Adult_06: 'h',
  Male_Adult_08: 'h',
  Male_Adult_12: 'h',
  Male_Adult_16: 'h',
  Female_Adult_01: 'm',
  Female_Adult_04: 'm',
  Female_Adult_12: 'm',
  Female_Adult_17: 'm',
  Construction_Male_02: 'r:obrero'
};
const gt = (...a) => execFileSync(GT, a, { stdio: 'pipe', shell: process.platform === 'win32' });
fs.mkdirSync(path.join(O, 'lod'), { recursive: true });
for (const f of fs.readdirSync(path.join(G, 'personajes')).filter(f => f.endsWith('.glb'))) {
  const src = path.join(G, 'personajes', f),
    out = path.join(O, f),
    lod = path.join(O, 'lod', f),
    t1 = out + '.1',
    t2 = out + '.2';
  if (!(fs.existsSync(out) && fs.statSync(out).mtimeMs > fs.statSync(src).mtimeMs)) {
    gt('weld', src, t1);
    gt('simplify', t1, t2, '--ratio', '0.3', '--error', '0.01');
    gt('webp', t2, out, '--quality', '82');
    fs.unlinkSync(t1);
    fs.unlinkSync(t2);
  }
  if (!(fs.existsSync(lod) && fs.statSync(lod).mtimeMs > fs.statSync(out).mtimeMs)) {
    gt('simplify', out, t1, '--ratio', '0.25', '--error', '0.05');
    gt('resize', t1, lod, '--width', '8', '--height', '8');
    fs.unlinkSync(t1);
  }
  console.log(
    f,
    (fs.statSync(src).size / 1048576).toFixed(1) + ' MB ->',
    (fs.statSync(out).size / 1048576).toFixed(2) + ' MB, media distancia',
    (fs.statSync(lod).size / 1024).toFixed(0) + ' KB'
  );
}
// instalar
const destinos = [path.join(raiz, 'recursos/pesados/modelos/personas/rocketbox')];
if (process.argv.includes('--dist')) destinos.push(path.join(raiz, 'dist/modelos/personas/rocketbox'));
const lista = { h: [], m: [], roles: {} };
for (const [id, k] of Object.entries(ETIQUETAS)) {
  if (!fs.existsSync(path.join(O, id + '.glb'))) continue;
  if (/^r:/.test(k)) (lista.roles[k.slice(2)] = lista.roles[k.slice(2)] || []).push(id);
  else lista[k].push(id);
}
destinos.forEach(d => {
  fs.mkdirSync(path.join(d, 'lod'), { recursive: true });
  fs.mkdirSync(path.join(d, 'anim'), { recursive: true });
  Object.keys(ETIQUETAS).forEach(id => {
    if (!fs.existsSync(path.join(O, id + '.glb'))) return;
    fs.copyFileSync(path.join(O, id + '.glb'), path.join(d, id + '.glb'));
    fs.copyFileSync(path.join(O, 'lod', id + '.glb'), path.join(d, 'lod', id + '.glb'));
  });
  fs.readdirSync(path.join(G, 'anim')).forEach(f => fs.copyFileSync(path.join(G, 'anim', f), path.join(d, 'anim', f)));
  fs.writeFileSync(path.join(d, 'lista.json'), JSON.stringify(lista));
});
console.log('instalados: hombres ' + lista.h.length + ', mujeres ' + lista.m.length + ', papeles ' + Object.keys(lista.roles).join(' '));
