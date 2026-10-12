// Simplificación «sloppy» (ignora la topología) con meshoptimizer para modelos que gltf-transform simplify no consigue reducir.
// Uso: node sloppy.mjs <entrada.gltf> <salida.gltf> <triangulos objetivo>   (se ejecuta desde recursos/herramientas)
import { NodeIO } from '@gltf-transform/core';
import { compactPrimitive, prune } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
const [ent, sal, objetivo] = process.argv.slice(2);
await MeshoptSimplifier.ready;
const io = new NodeIO(), doc = await io.read(ent);
let total = 0; const prims = [];
for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) { prims.push(p); total += p.getIndices().getCount() / 3; }
for (const p of prims) {
  const idx = p.getIndices(), n = idx.getCount() / 3; if (Math.max(60, Math.round(+objetivo * n / total)) >= n) continue; const posA = p.getAttribute('POSITION').getArray();
  const meta = Math.max(60, Math.round(+objetivo * n / total)) * 3, nuevo = MeshoptSimplifier.simplifySloppy(new Uint32Array(idx.getArray()), posA instanceof Float32Array ? posA : new Float32Array(posA), 3, null, meta, 0.2)[0];
  idx.setArray(nuevo.length < 65535 * 3 ? new Uint16Array(nuevo) : new Uint32Array(nuevo)); compactPrimitive(p);
}
await doc.transform(prune());
await io.write(sal, doc);
let n = 0; for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) n += p.getIndices().getCount() / 3;
console.log(ent, Math.round(total), '->', Math.round(n));
