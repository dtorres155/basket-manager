// Prepara las personas de Quaternius (CC0) para el juego: cada personaje sin animaciones en glb y un único
// archivo de animaciones compartido (mismo esqueleto). Uso: node tools/preparar_personas.mjs
// Origen: recursos/quaternius_hombres y recursos/quaternius_mujeres (.gltf descargados, fuera de git).
import { NodeIO } from '@gltf-transform/core';
import { prune, dedup } from '@gltf-transform/functions';
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(raiz, 'vendor', 'modelos', 'personas'); fs.mkdirSync(OUT, { recursive: true });
const io = new NodeIO();
const ANIMS = ['Idle', 'Idle_Neutral', 'Walk', 'Run', 'Interact', 'Wave', 'HitRecieve', 'Punch_Right', 'Kick_Right', 'Death', 'Roll'];
const grupos = [['hombres', 'h'], ['mujeres', 'm']];
let hecho = false, total = 0;
for (const [dir, pref] of grupos) {
  const src = path.join(raiz, 'recursos', 'quaternius_' + dir);
  for (const f of fs.readdirSync(src).filter(f => f.endsWith('.gltf'))) {
    const doc = await io.read(path.join(src, f));
    // El primero aporta el archivo de animaciones (solo las que usa el juego)
    if (!hecho) {
      const a = await io.read(path.join(src, f));
      a.getRoot().listAnimations().forEach(x => { if (!ANIMS.includes(x.getName())) x.dispose(); });
      a.getRoot().listMeshes().forEach(m => m.listPrimitives().forEach(p => p.dispose()));
      await a.transform(prune(), dedup());
      await io.write(path.join(OUT, 'animaciones.glb'), a); hecho = true;
    }
    doc.getRoot().listAnimations().forEach(x => x.dispose());
    await doc.transform(prune({ keepLeaves: true }), dedup());
    const nombre = pref + '-' + f.replace('.gltf', '').toLowerCase() + '.glb';
    await io.write(path.join(OUT, nombre), doc); const kb = fs.statSync(path.join(OUT, nombre)).size / 1024; total += kb;
    console.log(nombre, kb.toFixed(0) + ' KB');
  }
}
console.log('animaciones.glb', (fs.statSync(path.join(OUT, 'animaciones.glb')).size / 1024).toFixed(0) + ' KB', '| total personas', (total / 1024).toFixed(1) + ' MB');
fs.copyFileSync(path.join(raiz, 'recursos', 'quaternius_hombres', 'License.txt'), path.join(OUT, 'LICENSE-quaternius.txt'));
