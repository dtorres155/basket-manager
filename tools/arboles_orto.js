// Árboles reales desde la foto aérea (punto 147 de la hoja de ruta 2): donde no hay inventario municipal de arbolado, las copas se buscan
// en la ortofoto (recursos/orto/<id>.rgb, 2 m por píxel, tools/ortofoto.js): píxeles verdes con textura (las copas tienen luces y sombras;
// el césped y el césped artificial son lisos), agrupados en celdas de 6 m y separados al menos 6 m. Fuera: dentro de edificios, de pistas
// deportivas y del agua. Las copas que caen sobre la calzada se llevan a la acera más cercana (el tronco está en el alcorque).
// La usa tools/osm_generar.js: devuelve [[x, z], ...] en metros a menos de `radio` metros del pabellón.
const fs = require('fs');
function arboles(rgbRuta, X, radio) {
  if (!fs.existsSync(rgbRuta)) return null;
  const RGB = fs.readFileSync(rgbRuta),
    N = 2048,
    M = 2, // metros por píxel
    pix = (i, j) => {
      const o = (j * N + i) * 3;
      return [RGB[o], RGB[o + 1], RGB[o + 2]];
    },
    verde = (i, j) => {
      const [r, g, b] = pix(i, j);
      return g > r * 1.04 && g > b * 1.08 && g - Math.min(r, b) > 10 && r + g + b < 430;
    };
  const pip = (x, z, p) => {
    let c = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) if (p[i][1] > z !== p[j][1] > z && x < ((p[j][0] - p[i][0]) * (z - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) c = !c;
    return c;
  };
  const polis = [].concat(X.edificios || [], (X.pistas || []).filter(Boolean), (X.agua || []).filter(Boolean));
  const cajas = polis.map(p => {
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
  });
  const dentroDeAlgo = (x, z) => polis.some((p, k) => x >= cajas[k][0] && x <= cajas[k][2] && z >= cajas[k][1] && z <= cajas[k][3] && pip(x, z, p));
  // celdas de 6 m (3 x 3 píxeles): fracción verde y contraste (copas con textura)
  const C = 3,
    nC = Math.floor(N / C),
    puntos = [];
  for (let cj = 0; cj < nC; cj++)
    for (let ci = 0; ci < nC; ci++) {
      const x = ((ci + 0.5) * C - N / 2) * M,
        z = ((cj + 0.5) * C - N / 2) * M;
      if (Math.hypot(x, z) > radio) continue;
      let v = 0,
        mn = 999,
        mx = 0;
      for (let dj = 0; dj < C; dj++)
        for (let di = 0; di < C; di++) {
          const i = ci * C + di,
            j = cj * C + dj;
          if (verde(i, j)) v++;
          const [r, g, b] = pix(i, j),
            l = r + g + b;
          mn = Math.min(mn, l);
          mx = Math.max(mx, l);
        }
      if (v >= 5 && mx - mn > 60) puntos.push({ x, z, v });
    }
  // separación mínima de 6 m: primero las celdas más verdes
  puntos.sort((a, b) => b.v - a.v);
  const elegidos = [],
    G = new Map(),
    k = (x, z) => Math.floor(x / 6) + ',' + Math.floor(z / 6);
  for (const p of puntos) {
    let cerca = false;
    for (let a = -1; a <= 1 && !cerca; a++)
      for (let b = -1; b <= 1 && !cerca; b++) {
        const L = G.get(Math.floor(p.x / 6) + a + ',' + (Math.floor(p.z / 6) + b));
        if (L && L.some(q => Math.hypot(q.x - p.x, q.z - p.z) < 6)) cerca = true;
      }
    if (cerca || dentroDeAlgo(p.x, p.z)) continue;
    // sobre la calzada: a la acera más cercana
    let mejor = null;
    for (const s of X.calles || []) {
      const dx = s[2] - s[0],
        dz = s[3] - s[1],
        l2 = dx * dx + dz * dz || 1,
        t = Math.max(0, Math.min(1, ((p.x - s[0]) * dx + (p.z - s[1]) * dz) / l2)),
        px = s[0] + dx * t,
        pz = s[1] + dz * t,
        d = Math.hypot(p.x - px, p.z - pz);
      if (d < s[4] / 2 + 0.6 && (!mejor || d < mejor.d)) mejor = { d, px, pz, s };
    }
    if (mejor) {
      const l = Math.hypot(p.x - mejor.px, p.z - mejor.pz) || 1,
        nx = (p.x - mejor.px) / l,
        nz = (p.z - mejor.pz) / l,
        off = mejor.s[4] / 2 + 0.95;
      p.x = mejor.px + nx * off;
      p.z = mejor.pz + nz * off;
    }
    elegidos.push(p);
    const kk = k(p.x, p.z);
    if (!G.has(kk)) G.set(kk, []);
    G.get(kk).push(p);
  }
  return elegidos.map(p => [Math.round(p.x * 10) / 10, Math.round(p.z * 10) / 10]);
}
module.exports = { arboles };
