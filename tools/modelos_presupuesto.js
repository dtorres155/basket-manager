// Punto 79: comprueba que ningún modelo de vendor/modelos supera su presupuesto de triángulos y de peso, y (con --optimizar) lo arregla con gltf-transform (weld + simplify; originales en recursos/modelos_originales).
// Uso: node tools/modelos_presupuesto.js [--optimizar] [--estricto]    (build.js lo llama en modo informe; t_modelos.js lo usa en modo estricto)
// Presupuestos por carpeta: triángulos y peso en KB (archivo glTF/glb, buffers y texturas del modelo). Se leen de docs/PRESUPUESTOS.md solo como referencia: la tabla vive aquí.
const fs = require('fs'),
  path = require('path'),
  { spawnSync } = require('child_process');
const raiz = path.join(__dirname, '..'),
  base = path.join(raiz, 'vendor', 'modelos');
const PRESUPUESTOS = {
  reales: { tris: 12000, kb: 3500 },
  objetos: { tris: 12000, kb: 3500 },
  muebles: { tris: 6000, kb: 300 },
  edificio: { tris: 4000, kb: 200 },
  personas: { tris: 40000, kb: 6000 },
  vehiculos: { tris: 6000, kb: 400 },
  _: { tris: 12000, kb: 3500 }
};
const GT = path.join(raiz, 'recursos', 'herramientas', 'node_modules', '.bin', 'gltf-transform' + (process.platform === 'win32' ? '.cmd' : ''));
function lista(dir, out) {
  out = out || [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) lista(p, out);
    else if (/\.(gltf|glb)$/i.test(e.name)) out.push(p);
  }
  return out;
}
function triangulos(f) {
  let j;
  if (/\.glb$/i.test(f)) {
    const b = fs.readFileSync(f),
      len = b.readUInt32LE(12);
    j = JSON.parse(b.slice(20, 20 + len).toString('utf8'));
  } else j = JSON.parse(fs.readFileSync(f, 'utf8'));
  let n = 0;
  (j.meshes || []).forEach(m =>
    m.primitives.forEach(p => {
      if (p.mode !== undefined && p.mode !== 4) return;
      n += (p.indices !== undefined ? j.accessors[p.indices].count : j.accessors[p.attributes.POSITION].count) / 3;
    })
  );
  return { n: Math.round(n), j };
}
function peso(f, j) {
  let kb = fs.statSync(f).size;
  const d = path.dirname(f);
  ((j && j.buffers) || []).concat((j && j.images) || []).forEach(x => {
    if (x.uri && !/^data:/.test(x.uri)) {
      const p = path.join(d, decodeURIComponent(x.uri));
      if (fs.existsSync(p)) kb += fs.statSync(p).size;
    }
  });
  return Math.round(kb / 1024);
}
function revisar() {
  const filas = [];
  lista(base).forEach(f => {
    const rel = path.relative(base, f).split(path.sep).join('/'),
      cat = rel.split('/')[0],
      B = PRESUPUESTOS[cat] || PRESUPUESTOS._;
    let t;
    try {
      t = triangulos(f);
    } catch (e) {
      filas.push({ rel, error: e.message });
      return;
    }
    const kb = peso(f, t.j);
    filas.push({ rel, f, cat, tris: t.n, kb, B, pasa: t.n <= B.tris && kb <= B.kb });
  });
  return filas;
}
function optimizar(fila) {
  const ratio = Math.max(0.03, (fila.B.tris * 0.9) / fila.tris),
    sh = process.platform === 'win32',
    orig = path.join(raiz, 'recursos', 'modelos_originales', path.dirname(fila.rel));
  if (!fs.existsSync(GT)) return 'gltf-transform no está instalado (recursos/herramientas)';
  if (!fs.existsSync(orig)) fs.cpSync(path.dirname(fila.f), orig, { recursive: true });
  const tmp = path.join(path.dirname(fila.f), '_t.gltf');
  let r = spawnSync(GT, ['weld', fila.f, tmp], { shell: sh, encoding: 'utf8' });
  if (r.status) return 'weld falló';
  r = spawnSync(GT, ['simplify', tmp, fila.f, '--ratio', String(ratio), '--error', '0.08'], { shell: sh, encoding: 'utf8' });
  fs.rmSync(tmp, { force: true });
  return r.status ? 'simplify falló' : null;
}
if (require.main === module) {
  const arg = process.argv.slice(2),
    filas = revisar();
  const fuera = filas.filter(x => x.error || !x.pasa);
  console.log(filas.length + ' modelos, ' + fuera.length + ' fuera de presupuesto');
  fuera.forEach(x => {
    console.log('  ' + x.rel.padEnd(52) + (x.error ? 'ERROR ' + x.error : x.tris + ' triángulos (máx ' + x.B.tris + '), ' + x.kb + ' KB (máx ' + x.B.kb + ')'));
    if (arg.includes('--optimizar') && !x.error) {
      const e = optimizar(x);
      console.log('     ' + (e || 'optimizado'));
    }
  });
  process.exit(fuera.length && arg.includes('--estricto') ? 1 : 0);
}
module.exports = { PRESUPUESTOS, revisar, optimizar };
