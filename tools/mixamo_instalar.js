// Instala las personas de Mixamo ya optimizadas en recursos/pesados/modelos/personas/mixamo (solo versión de escritorio, fuera de git) y escribe lista.json.
// Entrada: <carpeta>/opt/{personajes,animaciones} y <carpeta>/etiquetas.json ({ "id": "h|m|n" }; sin etiqueta se ignora). Además (punto 107
// y 108): "r:<papel>" para los modelos de un papel (policía, obrero), "kit" para la equipación de los jugadores y "_chandal":
// { claro: [ids], oscuro: [ids] } para los jugadores en chándal según su piel (ids que ya están como h). Uso: node tools/mixamo_instalar.js [carpeta] [--dist]
// Con --dist copia también a dist/modelos/personas/mixamo (para probar con npm run serve; build.js borra dist, así que hay que repetirlo tras compilar).
const fs = require('fs'),
  path = require('path');
const carpeta = process.argv.find(a => /^[A-Za-z]:[\/]/.test(a)) || 'C:/Users/Dabvid-/mixamo';
const raiz = path.resolve(__dirname, '..');
const destinos = [path.join(raiz, 'recursos/pesados/modelos/personas/mixamo')];
if (process.argv.includes('--dist')) destinos.push(path.join(raiz, 'dist/modelos/personas/mixamo'));
const et = JSON.parse(fs.readFileSync(path.join(carpeta, 'etiquetas.json'), 'utf8'));
const lista = { h: [], m: [], n: [], roles: {}, kit: [], chandal: et._chandal || null };
destinos.forEach(d => {
  fs.mkdirSync(path.join(d, 'anim'), { recursive: true });
  fs.readdirSync(path.join(carpeta, 'opt/animaciones')).forEach(f => fs.copyFileSync(path.join(carpeta, 'opt/animaciones', f), path.join(d, 'anim', f)));
});
for (const f of fs.readdirSync(path.join(carpeta, 'opt/personajes')).filter(f => f.endsWith('.glb'))) {
  const id = f.replace('.glb', ''),
    k = et[id];
  if (!k || id[0] === '_') continue;
  if (/^r:/.test(k)) (lista.roles[k.slice(2)] = lista.roles[k.slice(2)] || []).push(id);
  else if (k === 'kit') lista.kit.push(id);
  else lista[k].push(id);
  destinos.forEach(d => fs.copyFileSync(path.join(carpeta, 'opt/personajes', f), path.join(d, f)));
  // versión de media distancia (punto 106)
  const lod = path.join(carpeta, 'opt/personajes/lod', f);
  if (fs.existsSync(lod))
    destinos.forEach(d => {
      fs.mkdirSync(path.join(d, 'lod'), { recursive: true });
      fs.copyFileSync(lod, path.join(d, 'lod', f));
    });
}
destinos.forEach(d => fs.writeFileSync(path.join(d, 'lista.json'), JSON.stringify(lista)));
console.log(
  'instalados: hombres ' +
    lista.h.length +
    ', mujeres ' +
    lista.m.length +
    ', niños ' +
    lista.n.length +
    ', papeles ' +
    Object.keys(lista.roles).join(' ') +
    ', equipación ' +
    lista.kit.length
);
