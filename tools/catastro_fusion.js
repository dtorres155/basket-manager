// Fusión del Catastro con los datos de OpenStreetMap (punto 145 de la hoja de ruta 2). La usa tools/osm_generar.js cuando hay
// recursos/osm/<id>.cat.json (tools/catastro.js).
// - Núcleo (hasta donde llegan los edificios de OpenStreetMap): cada edificio de OSM que contiene partes del Catastro se sustituye por esas
//   partes, con sus plantas reales y su año; heredan la clase, el color y el tejado del edificio de OSM. Se quedan como están los singulares
//   (colegio, hospital, ayuntamiento, iglesia, pabellón, estación o con nombre) y lo que el Catastro no tiene. Las partes sueltas (dentro de
//   ningún edificio de OSM) entran con la clase de su uso en el Catastro. Las partes de edificio de OSM (bp) dentro de lo sustituido se quitan.
// - Anillo lejano (más allá del núcleo, hasta 1,4 km): los edificios del Catastro con la altura de su parte principal (la más alta que cubre al
//   menos la quinta parte), en lugar de los de OSM que caen dentro de ellos.
// Devuelve un resumen. r: el objeto que escribe osm_generar (e, ex, bp, l); utilidades: area, dp, ent.
const CLASE_USO = { 1: 1, 2: 2, 3: 3, 4: 6, 5: 9, 6: 0 };
const SINGULAR = new Set([4, 5, 6, 7, 10, 13]);
function fusionar(r, CA, { area, dp, ent }) {
  const pts = (a, d) => {
      const p = [];
      for (let i = d; i + 1 < a.length; i += 2) p.push([a[i] / 10, a[i + 1] / 10]);
      return p;
    },
    centro = p => [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length],
    caja = p => {
      let x0 = 1e9,
        z0 = 1e9,
        x1 = -1e9,
        z1 = -1e9;
      p.forEach(q => {
        x0 = Math.min(x0, q[0]);
        x1 = Math.max(x1, q[0]);
        z0 = Math.min(z0, q[1]);
        z1 = Math.max(z1, q[1]);
      });
      return [x0, z0, x1, z1];
    },
    pip = (x, z, p) => {
      let c = false;
      for (let i = 0, j = p.length - 1; i < p.length; j = i++) if (p[i][1] > z !== p[j][1] > z && x < ((p[j][0] - p[i][0]) * (z - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) c = !c;
      return c;
    };
  // rejilla para buscar rápido en qué polígono cae un punto
  const rejilla = (lista, cel) => {
    const G = new Map();
    lista.forEach((o, i) => {
      const [x0, z0, x1, z1] = o.bb;
      for (let a = Math.floor(x0 / cel); a <= Math.floor(x1 / cel); a++)
        for (let b = Math.floor(z0 / cel); b <= Math.floor(z1 / cel); b++) {
          const k = a + ',' + b;
          if (!G.has(k)) G.set(k, []);
          G.get(k).push(i);
        }
    });
    return (x, z) => {
      const L = G.get(Math.floor(x / cel) + ',' + Math.floor(z / cel)) || [];
      for (const i of L) {
        const o = lista[i];
        if (x >= o.bb[0] && x <= o.bb[2] && z >= o.bb[1] && z <= o.bb[3] && pip(x, z, o.p)) return i;
      }
      return -1;
    };
  };
  const osm = r.e.map((e, i) => {
    const p = pts(e, 5);
    return { e, ex: r.ex[i], p, bb: caja(p) };
  });
  let RC = 0;
  osm.forEach(o => o.p.forEach(q => (RC = Math.max(RC, Math.hypot(q[0], q[1])))));
  const enOsm = rejilla(osm, 40),
    edif = CA.b.map(b => ({ uso: b[0], anio: b[1], p: pts(b, 2) })),
    partes = CA.p.map(a => ({ pl: a[0], ed: a[1], p: pts(a, 2) })).filter(q => q.p.length >= 3);
  // --- núcleo ---
  const sustituido = new Set(),
    nuevas = [];
  partes.forEach(q => {
    if (q.pl <= 0 || area(q.p) < 8) return;
    const c = centro(q.p);
    if (Math.hypot(c[0], c[1]) > RC + 5) return;
    const i = enOsm(c[0], c[1]),
      o = i >= 0 ? osm[i] : null;
    if (o && (SINGULAR.has(o.e[1]) || o.e[2] >= 0)) return; // singular: se queda el de OSM
    if (o) sustituido.add(i);
    let p = dp(q.p.concat([q.p[0]]), 0.35).slice(0, -1);
    if (p.length < 3) return;
    if (p.length > 24) p = p.filter((_, k) => k % Math.ceil(p.length / 24) === 0);
    const ed = edif[q.ed] || { uso: 0, anio: 0 },
      cl = o ? o.e[1] : CLASE_USO[ed.uso] || 0;
    nuevas.push({
      e: [Math.min(q.pl, 60), cl, -1, o ? o.e[3] : -1, o ? o.e[4] : 0].concat(...p.map(v => [ent(v[0]), ent(v[1])])),
      ex: [ed.anio >= 1000 ? Math.floor(ed.anio / 10) : o ? o.ex[0] : 0, o ? o.ex[1] : 0, o ? o.ex[2] : 0]
    });
  });
  const quedan = osm.filter((o, i) => !sustituido.has(i));
  r.e = quedan.map(o => o.e).concat(nuevas.map(n => n.e));
  r.ex = quedan.map(o => o.ex).concat(nuevas.map(n => n.ex));
  // partes de edificio de OSM: solo las que caen en un edificio que se queda
  if (r.bp && r.bp.length) {
    const quedanR = quedan.map(o => ({ p: o.p, bb: o.bb })),
      enQ = rejilla(quedanR, 40);
    r.bp = r.bp.filter(b => {
      const c = centro(pts(b, 4));
      return Math.hypot(c[0], c[1]) > RC + 5 || enQ(c[0], c[1]) >= 0;
    });
  }
  // --- anillo lejano ---
  let nAn = 0;
  if (r.l) {
    const porEd = new Map();
    partes.forEach(q => {
      if (!porEd.has(q.ed)) porEd.set(q.ed, []);
      porEd.get(q.ed).push(q);
    });
    const cat = [];
    edif.forEach((b, i) => {
      if (b.p.length < 3) return;
      const c = centro(b.p),
        d = Math.hypot(c[0], c[1]);
      if (d <= RC || d > 1400) return;
      const A = area(b.p);
      if (A < 40) return;
      const ps = (porEd.get(i) || []).filter(q => q.pl > 0);
      if (!ps.length) return;
      const pl = Math.max(...ps.filter(q => area(q.p) >= A * 0.2).map(q => q.pl), 0) || Math.max(...ps.map(q => q.pl));
      let p = dp(b.p.concat([b.p[0]]), 1.5).slice(0, -1);
      if (p.length < 3) return;
      if (p.length > 10) p = p.filter((_, k) => k % Math.ceil(p.length / 10) === 0);
      cat.push({ pl, p, bb: caja(p) });
    });
    const enCat = rejilla(cat, 60);
    // los del anillo de OSM (metros enteros) que caen dentro de uno del Catastro se van
    r.l.e = r.l.e.filter(e => {
      const p = [];
      for (let i = 1; i + 1 < e.length; i += 2) p.push([e[i], e[i + 1]]);
      const c = centro(p);
      return enCat(c[0], c[1]) < 0;
    });
    cat.forEach(o => r.l.e.push([Math.min(o.pl, 40)].concat(...o.p.map(q => [Math.round(q[0]), Math.round(q[1])]))));
    nAn = cat.length;
  }
  return { nucleo: RC, sustituidos: sustituido.size, partes: nuevas.length, anillo: nAn, edificios: r.e.length };
}
module.exports = { fusionar };
