// Reduce los triángulos de los modelos realistas de vendor/modelos/reales (Poly Haven 1K) con gltf-transform (weld + simplify).
// Uso: node tools/modelos_optimizar.js [maximo=12000] [--aplicar]   (sin --aplicar solo informa). Copia los originales a recursos/modelos_originales/.
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const MAX = +(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 12000), aplicar = process.argv.includes('--aplicar');
const raiz = path.join(__dirname, '..'), dir = path.join(raiz, 'vendor', 'modelos', 'reales'), orig = path.join(raiz, 'recursos', 'modelos_originales');
const GT = path.join(raiz, 'recursos', 'herramientas', 'node_modules', '.bin', 'gltf-transform' + (process.platform === 'win32' ? '.cmd' : ''));
const tris = f => { const j = JSON.parse(fs.readFileSync(f, 'utf8')); let n = 0; (j.meshes || []).forEach(m => m.primitives.forEach(p => { n += (p.indices !== undefined ? j.accessors[p.indices].count : j.accessors[p.attributes.POSITION].count) / 3; })); return Math.round(n); };
let antes = 0, despues = 0;
for (const d of fs.readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory())) {
  const g = fs.readdirSync(path.join(dir, d.name)).find(f => f.endsWith('.gltf')); if (!g) continue; const f = path.join(dir, d.name, g), n = tris(f); antes += n;
  if (n <= MAX) { despues += n; continue; }
  const ratio = Math.max(0.03, MAX / n); console.log(d.name.padEnd(28), n, '->', Math.round(n * ratio), '(ratio ' + ratio.toFixed(3) + ')');
  if (!aplicar) { despues += Math.round(n * ratio); continue; }
  const o = path.join(orig, d.name); if (!fs.existsSync(o)) fs.cpSync(path.join(dir, d.name), o, { recursive: true });
  const tmp = path.join(dir, d.name, '_t.gltf'), sh = process.platform === 'win32';
  let r = spawnSync(GT, ['weld', f, tmp], { shell: sh, encoding: 'utf8' }); if (r.status) { console.log('weld falló', r.stderr); continue; }
  r = spawnSync(GT, ['simplify', tmp, f, '--ratio', String(ratio), '--error', '0.08'], { shell: sh, encoding: 'utf8' }); if (r.status) { console.log('simplify falló', r.stderr); continue; }
  fs.rmSync(tmp, { force: true }); const m = tris(f); despues += m; console.log('   hecho:', m);
}
console.log('Triángulos de todos los modelos:', antes, '->', despues);
