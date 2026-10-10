/* ÁRBOLES Y ESTACIONES (GM.arboles) — árboles orgánicos con copas irregulares y colores por estación
   Cada especie (olivo retorcido, ciprés, frutal/higuera, pino piñonero) se construye una vez como una sola geometría con color por
   vértice: tronco curvo que se afina, ramas y copa de varias masas deformadas con ruido y más claras arriba. Hay cuatro variantes
   por especie y estación. Estaciones según la fecha: primavera (floración), verano, otoño (hojas ocres y rojizas) e invierno
   (frutales desnudos con nieve; el resto, con las copas cubiertas). También da las partículas de la estación (hojas, pétalos, nieve).
   Expone: estacion(st), geo(tipo, est, variante), mat(), mesh(tipo, est, variante, escala), PALETAS, particulas(S, W, est). */
(function () {
  const T = THREE, U = GM.util;
  function estacion(st) { const m = +String(st.fecha || '2026-09-24').slice(5, 7), d = +String(st.fecha || '2026-09-24').slice(8, 10); if (m === 12 && d >= 15 || m === 1 || m === 2) return 'invierno'; if (m === 12 || m === 11 || m === 10 || (m === 9 && d >= 22)) return 'otono'; if (m >= 3 && m <= 5 || (m === 6 && d < 21)) return 'primavera'; if (m === 9) return 'verano'; return 'verano'; }
  const PALETAS = {
    verano: { olivo: ['#7d8f62', '#8a9d6c', '#6f8355', '#98a97a'], frutal: ['#4f7d3a', '#5d8c41', '#456f33', '#6a9a48'], pino: ['#3f6e33', '#4a7a3a', '#365f2d'], cipres: ['#2f4a2c', '#385a33', '#284226'] },
    primavera: { olivo: ['#8fa06e', '#9bb07a', '#80965f', '#a8b98a'], frutal: ['#e8b6c8', '#f3d4de', '#7fb04f', '#f6ecef'], pino: ['#4a8240', '#58903f', '#3f7338'], cipres: ['#34562f', '#3f6a38', '#2c4b29'] },
    otono: { olivo: ['#8b9163', '#7a8556', '#a29a5a', '#6f7a4d'], frutal: ['#c9772a', '#d9a23a', '#a8431f', '#8f9a2f'], pino: ['#4a6a33', '#556f30', '#3d5a2b'], cipres: ['#2f4a2c', '#344f2a', '#28402a'] },
    invierno: { olivo: ['#7d8a6a', '#a4b09a', '#6f7d62', '#e4eaee'], frutal: ['#4a4036'], pino: ['#3a5a3a', '#e4eaee', '#2f4d33'], cipres: ['#2b452c', '#dfe7ea', '#243b27'] }
  };
  const rn = seed => { let a = (U.hash(String(seed)) >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const GEOS = {}; let MAT = null;
  function colorear(g, fn) { const p = g.attributes.position, c = new Float32Array(p.count * 3), col = new T.Color(); for (let i = 0; i < p.count; i++) { fn(col, p.getX(i), p.getY(i), p.getZ(i), i); c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; } g.setAttribute('color', new T.BufferAttribute(c, 3)); return g; }
  // Masa de follaje: icosaedro deformado con ruido, más oscuro abajo y con matiz propio
  let DET = 2;
  function masa(r, px, py, pz, rad, sx, sy, sz, paleta, rr) {
    let g = new T.IcosahedronGeometry(rad, DET); g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = T.mergeVertices(g); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + (Math.sin(x * 3.1 + rr() * 0.1) * Math.cos(z * 2.7) * 0.18 + Math.sin(y * 4.3 + x * 2.2) * 0.1); p.setXYZ(i, x * k * sx, y * k * sy, z * k * sz); }
    g.translate(px, py, pz); g.computeVertexNormals(); const base = new T.Color(paleta[(rr() * paleta.length) | 0]);
    return colorear(g, (c, x, y) => { const t = Math.max(0, Math.min(1, (y - py) / (rad * sy) * 0.5 + 0.5)); c.copy(base).multiplyScalar(0.72 + t * 0.42); });
  }
  function tronco(pts, r0, r1, color) {
    const seg = DET < 2 ? 5 : 12, rad = DET < 2 ? 5 : 8, cr = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(p[0], p[1], p[2]))), g = new T.TubeGeometry(cr, seg, 1, rad - 1), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const ring = Math.floor(i / rad), t = Math.min(1, ring / seg), c = cr.getPoint(t), k = r0 + (r1 - r0) * t; p.setXYZ(i, c.x + (p.getX(i) - c.x) * k, c.y + (p.getY(i) - c.y) * k, c.z + (p.getZ(i) - c.z) * k); }
    g.computeVertexNormals(); const col = new T.Color(color); return colorear(g, (c, x, y) => { c.copy(col).multiplyScalar(0.8 + (Math.sin(y * 9) * 0.5 + 0.5) * 0.3); });
  }
  function ramas(n, rr, desde, hasta, color) { const out = []; if (DET < 2) n = Math.min(n, 1); for (let i = 0; i < n; i++) { const a = rr() * 6.283, L = 0.8 + rr() * 0.9, y0 = desde + rr() * (hasta - desde); out.push(tronco([[0, y0, 0], [Math.cos(a) * L * 0.5, y0 + 0.35, Math.sin(a) * L * 0.5], [Math.cos(a) * L, y0 + 0.8 + rr() * 0.4, Math.sin(a) * L]], 0.07, 0.025, color)); } return out; }
  function construir(tipo, est, v, baja) {
    DET = baja ? 1 : 2;
    const rr = rn(tipo + est + v), P = PALETAS[est][tipo === 'ciprés' ? 'cipres' : tipo] || PALETAS.verano.frutal, partes = [], corteza = tipo === 'ciprés' ? '#4a3b2c' : tipo === 'olivo' ? '#7a6a58' : '#5b4630';
    if (tipo === 'olivo') {
      const s = 0.8 + rr() * 0.4; partes.push(tronco([[0, 0, 0], [0.18 * s, 0.7, 0.1], [-0.12 * s, 1.4, 0.2 * s], [0.16 * s, 2.0, -0.08], [0.0, 2.5, 0.0]], 0.3 * s, 0.1, corteza)); partes.push(...ramas(4, rr, 1.4, 2.2, corteza));
      for (let k = 0; k < (DET < 2 ? 3 : 6); k++) { const a = rr() * 6.283, d = k ? 0.5 + rr() * 0.8 : 0; partes.push(masa(0, Math.cos(a) * d, 2.6 + (k ? 0.2 + rr() * 0.9 : 0.5), Math.sin(a) * d, 0.75 + rr() * 0.35, 1.15, 0.75, 1.15, P, rr)); }
    } else if (tipo === 'ciprés') {
      const h = 6 + rr() * 2.5, pf = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pf.push([Math.max(0.02, Math.sin(Math.min(1, t * 1.15) * Math.PI) * 0.9 * (0.8 + 0.2 * t) * (1 - t * 0.35)), 0.6 + t * h]); } pf[10][0] = 0; const g = new T.LatheGeometry(pf.map(p => new T.Vector2(p[0], p[1])), DET < 2 ? 7 : 10), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + Math.sin(p.getY(i) * 2.3 + p.getX(i) * 3) * 0.07; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } g.computeVertexNormals(); const base = new T.Color(P[0]); partes.push(colorear(g, (c, x, y, z) => { const t = (y - 0.6) / h; c.copy(base).multiplyScalar(0.62 + t * 0.55 + (Math.sin(x * 9 + z * 7 + y * 3) * 0.06)); if (est === 'invierno' && t > 0.45 && rr() < 0.0) c.set('#dfe7ea'); if (est === 'invierno') c.lerp(new T.Color('#dfe7ea'), Math.max(0, t - 0.5) * 0.7 * (0.5 + Math.sin(x * 11 + z * 5) * 0.5)); }));
      partes.push(tronco([[0, 0, 0], [0.03, 0.4, 0], [0, 0.8, 0]], 0.14, 0.1, corteza));
    } else if (tipo === 'pino') {
      partes.push(tronco([[0, 0, 0], [0.3, 1.2, 0.1], [-0.1, 2.4, 0.25], [0.15, 3.6, 0]], 0.2, 0.1, corteza)); partes.push(...ramas(3, rr, 2.6, 3.4, corteza));
      for (let k = 0; k < (DET < 2 ? 3 : 5); k++) { const a = k / 5 * 6.283 + rr(), d = k ? 1.2 + rr() * 0.8 : 0; partes.push(masa(0, Math.cos(a) * d, 3.9 + rr() * 0.5, Math.sin(a) * d, 1.15 + rr() * 0.3, 1.4, 0.45, 1.4, P, rr)); }
    } else {   // frutal / higuera
      partes.push(tronco([[0, 0, 0], [0.1, 0.6, -0.05], [-0.08, 1.3, 0.1], [0.05, 1.9, 0]], 0.22, 0.09, corteza)); partes.push(...ramas(est === 'invierno' ? 9 : 5, rr, 1.3, 2.1, corteza));
      if (est === 'invierno') { for (let i = 0; i < 12; i++) { const a = rr() * 6.283, L = 1.2 + rr() * 1.1, y0 = 1.8 + rr() * 0.6; partes.push(tronco([[0, y0, 0], [Math.cos(a) * L * 0.4, y0 + 0.5, Math.sin(a) * L * 0.4], [Math.cos(a) * L, y0 + 1.1 + rr() * 0.5, Math.sin(a) * L]], 0.05, 0.012, corteza)); } for (let k = 0; k < 3; k++) partes.push(masa(0, (rr() - 0.5) * 1.6, 3.3 + rr() * 0.4, (rr() - 0.5) * 1.6, 0.35, 1.5, 0.28, 1.5, ['#e8eef2'], rr)); }
      else for (let k = 0; k < (DET < 2 ? 3 : 6); k++) { const a = rr() * 6.283, d = k ? 0.6 + rr() * 0.9 : 0; partes.push(masa(0, Math.cos(a) * d, 2.5 + (k ? 0.3 + rr() * 0.9 : 0.6), Math.sin(a) * d, 0.9 + rr() * 0.45, 1.1, 0.88, 1.1, P, rr)); }
    }
    partes.forEach(p => { if (p.attributes.uv) p.deleteAttribute('uv'); });
    const g = T.mergeGeometries ? T.mergeGeometries(partes.map(p => p.index ? p.toNonIndexed() : p)) : partes[0]; g.computeBoundingSphere(); return g;
  }
  // baja: versión de pocos triángulos para bosques lejanos y para calidad «normal» (móvil)
  function geo(tipo, est, v, baja) { const bj = baja || (GM.campus && GM.campus.config.calidad !== 'alta'), k = tipo + '|' + est + '|' + (v % 4) + (bj ? 'b' : ''); return GEOS[k] || (GEOS[k] = construir(tipo, est, v % 4, bj)); }
  function mat() { if (!MAT) { MAT = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }); if (GM.kit && GM.kit.viento) GM.kit.viento(MAT, 'copa', 0.1); } return MAT; }
  function mesh(tipo, est, v, escala, baja) { const m = new T.Mesh(geo(tipo, est, v, baja), mat()); m.castShadow = true; m.receiveShadow = true; if (escala) m.scale.setScalar(escala); return m; }

  // ---------- Partículas de la estación: nieve, hojas que caen y pétalos (siguen la cámara) ----------
  function particulas(S, W, est) {
    if (est === 'verano') return null;
    const N = est === 'invierno' ? 1800 : 380, pos = new Float32Array(N * 3), rr = rn('part' + est), g = new T.BufferGeometry(), R = 40;
    for (let i = 0; i < N; i++) { pos[i * 3] = (rr() - 0.5) * R * 2; pos[i * 3 + 1] = rr() * 26; pos[i * 3 + 2] = (rr() - 0.5) * R * 2; } g.setAttribute('position', new T.BufferAttribute(pos, 3));
    const col = est === 'invierno' ? 0xffffff : est === 'otono' ? 0xd9822b : 0xf6c6d6, m = new T.PointsMaterial({ color: col, size: est === 'invierno' ? 0.16 : 0.26, transparent: true, opacity: 0.9, depthWrite: false, sizeAttenuation: true });
    const pts = new T.Points(g, m); pts.frustumCulled = false; pts.userData = { estacional: true }; W.add(pts);
    S.puebloAnim.push(t => { const c = S.foco || { x: 0, y: 0, z: 0 }, v = est === 'invierno' ? 1.6 : 0.8, a = g.attributes.position, d = 1 / 60; for (let i = 0; i < N; i++) { let y = a.getY(i) - v * d * (0.6 + (i % 7) * 0.12), x = a.getX(i) + Math.sin(t * 0.8 + i) * 0.012 * (est === 'invierno' ? 1 : 3), z = a.getZ(i) + Math.cos(t * 0.6 + i) * 0.01; if (y < 0) y += 26; a.setXYZ(i, x, y, z); } a.needsUpdate = true; pts.position.set(c.x - (c.x % 1) * 0, 0, c.z); });
    return pts;
  }
  GM.arboles = { estacion, geo, mat, mesh, PALETAS, particulas };
})();
