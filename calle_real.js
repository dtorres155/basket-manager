/* LA CIUDAD REAL (GM.calleReal) — la calle del club con el plano de verdad (OpenStreetMap)
   Para cada club con datos (vendor/osm/<id>.json, que tools/osm_generar.js saca de OpenStreetMap, © colaboradores, ODbL) se pasea la ciudad real
   en 300 m alrededor del pabellón: sus calles con su nombre y su ancho, sus manzanas, la huella y las plantas de cada edificio, parques, ríos
   y lagos. El pabellón es el edificio real; la sede, la tienda, la peña, el ayuntamiento, el colegio, el hospital, tus viviendas y los locales
   se colocan en edificios reales (con su puerta hacia la calle más cercana). Usa el motor de sede3d.js y las mismas piezas que calle3d.js.
   Expone: cargar(id), datos(id), construir(S, M, st), poblar(S, M, st), actualizar(S, M, dt). */
(function () {
  const U = GM.util, R = 300, CELDA = 0.75;
  const ANCHO = [16, 12, 10, 8.5, 7, 5.5, 4], ACERA = 2.3;
  const CACHE = {};
  function cargar(id) {
    if (id in CACHE) return Promise.resolve(CACHE[id]);
    if (typeof fetch !== 'function' || typeof location === 'undefined' || !/^(https?|app|file):$/.test(location.protocol || '')) return Promise.resolve(CACHE[id] = null);
    return fetch('osm/' + id + '.json').then(r => r.ok ? r.json() : null).catch(() => null).then(d => (CACHE[id] = d && d.e && d.e.length >= 10 && d.c && d.c.length >= 20 ? d : null));
  }
  const datos = id => CACHE[id] || null;
  const rnd = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const PALETA = {
    ES: ['#ead9bd', '#dcc3a0', '#f2e6d2', '#d1b38c', '#e6cfae', '#cdb497'], IT: ['#d9a86c', '#c98f58', '#e2bb85', '#cf9c63', '#dcb79a'],
    GR: ['#f4f2ec', '#ebe8e0', '#f7f6f1', '#e3ddd0'], TR: ['#ddd2bd', '#c9bba2', '#e5dccb', '#d6c6ad'],
    DE: ['#d8d4cc', '#c3ccd2', '#e2d6c2', '#bfc6c0', '#cfc7bb'], US: ['#9c4a35', '#b5654a', '#7d3b2c', '#a85a40', '#8f8a82', '#b9b2a6']
  };
  const TEJAS = { ES: '#a65a3e', IT: '#b0603f', GR: '#a8553a', TR: '#9a4f36', DE: '#6a5448', US: '#5a5551' };
  const col = h => new THREE.Color(h);
  const pip = (x, z, p) => { let d = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { if ((p[i][1] > z) !== (p[j][1] > z) && x < (p[j][0] - p[i][0]) * (z - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) d = !d; } return d; };
  const dSeg = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l)); return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz); };
  const pts = (a, h) => { const o = []; for (let i = h; i + 1 < a.length; i += 2) o.push([a[i] / 10, a[i + 1] / 10]); return o; };

  // ---------- Materiales ----------
  function suelo(id, o, color, nivel) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.93, side: THREE.DoubleSide });
    if (GM.texturas) GM.texturas.aplicar(m, id, o);
    m.polygonOffset = true; m.polygonOffsetFactor = -nivel; m.polygonOffsetUnits = -nivel; return m;
  }
  // Recorte: la pared, el techo y lo que hay entre la cámara y tu personaje se perfora (con borde difuminado) para no perderte detrás de un edificio
  function recortable(S, m) {
    m.onBeforeCompile = sh => {
      sh.uniforms.uRecP = S.rec.p; sh.uniforms.uRecC = S.rec.c; sh.uniforms.uRecR = S.rec.r;
      sh.vertexShader = 'varying vec3 vWp;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = 'varying vec3 vWp; uniform vec3 uRecP; uniform vec3 uRecC; uniform float uRecR;\n' + sh.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' +
        ' { vec3 ab = uRecP - uRecC; float t = clamp(dot(vWp - uRecC, ab) / max(dot(ab, ab), 0.001), 0.0, 1.0); float d = distance(vWp, uRecC + ab * t);\n' +
        '   if (t < 0.96 && d < uRecR && vWp.y > 0.9) { float k = smoothstep(uRecR * 0.72, uRecR, d); float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453); if (n > k) discard; } }');
    };
    m.customProgramCacheKey = () => 'recorte';
    return m;
  }
  function texFachada(M) {
    const base = M.textura('real-fachada', 128, (x, n) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, n, n); x.fillStyle = 'rgba(0,0,0,.07)'; x.fillRect(0, 0, n, 5);
      x.fillStyle = '#36424f'; x.fillRect(n * 0.3, n * 0.28, n * 0.4, n * 0.46); x.fillStyle = 'rgba(255,255,255,.2)'; x.fillRect(n * 0.32, n * 0.3, n * 0.16, n * 0.18);
      x.fillStyle = '#e9e4da'; x.fillRect(n * 0.27, n * 0.74, n * 0.46, n * 0.05); x.fillStyle = '#d2ccc0'; x.fillRect(n * 0.49, n * 0.28, n * 0.02, n * 0.46); });
    const luz = M.textura('real-fachada-luz', 128, (x, n) => { x.fillStyle = '#000'; x.fillRect(0, 0, n, n); x.fillStyle = '#ffd9a0'; x.fillRect(n * 0.31, n * 0.29, n * 0.38, n * 0.44); });
    const tienda = M.textura('real-tienda', 128, (x, n) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, n, n); x.fillStyle = '#26323b'; x.fillRect(n * 0.06, n * 0.16, n * 0.88, n * 0.72); x.fillStyle = 'rgba(255,240,200,.35)'; x.fillRect(n * 0.08, n * 0.18, n * 0.84, n * 0.68);
      x.fillStyle = 'rgba(0,0,0,.28)'; for (let i = 1; i < 3; i++) x.fillRect(n * 0.06 + i * n * 0.29, n * 0.16, 3, n * 0.74); x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(0, n * 0.92, n, n * 0.08); });
    return { base, luz, tienda };
  }

  // ---------- Geometría ----------
  function geo(P, I, N, UV, C) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    if (N) g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); else g.computeVertexNormals();
    if (UV) g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); if (C) g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    if (I) g.setIndex(I); g.computeBoundingSphere(); return g;
  }
  function cinta(q, w, y, A) {   // cinta de ancho w por la poligonal q, con esquinas en inglete
    const n = q.length; if (n < 2) return; const b = A.P.length / 3, h = w / 2;
    for (let i = 0; i < n; i++) {
      const p = q[Math.max(0, i - 1)], c = q[i], s = q[Math.min(n - 1, i + 1)];
      let d1x = c[0] - p[0], d1z = c[1] - p[1], l1 = Math.hypot(d1x, d1z); if (l1 < 1e-6) { d1x = s[0] - c[0]; d1z = s[1] - c[1]; l1 = Math.hypot(d1x, d1z) || 1; } d1x /= l1; d1z /= l1;
      let d2x = s[0] - c[0], d2z = s[1] - c[1], l2 = Math.hypot(d2x, d2z); if (l2 < 1e-6) { d2x = d1x; d2z = d1z; l2 = 1; } else { d2x /= l2; d2z /= l2; }
      let mx = -d1z - d2z, mz = d1x + d2x, ml = Math.hypot(mx, mz); if (ml < 1e-3) { mx = -d1z; mz = d1x; ml = 1; } mx /= ml; mz /= ml;
      const k = h / Math.max(0.55, mx * -d1z + mz * d1x);
      A.P.push(c[0] + mx * k, y, c[1] + mz * k, c[0] - mx * k, y, c[1] - mz * k); A.N.push(0, 1, 0, 0, 1, 0);
    }
    for (let i = 0; i < n - 1; i++) { const a = b + i * 2; A.I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  function rellenar(q, y, A) {   // polígono plano triangulado
    const v = q.map(p => new THREE.Vector2(p[0], p[1])), t = THREE.ShapeUtils.triangulateShape(v, []), b = A.P.length / 3;
    v.forEach(p => { A.P.push(p.x, y, p.y); A.N.push(0, 1, 0); }); t.forEach(k => A.I.push(b + k[0], b + k[1], b + k[2]));
  }
  const nuevo = () => ({ P: [], N: [], I: [] });
  const malla = (A, m, nom) => { if (!A.P.length) return null; const me = new THREE.Mesh(geo(A.P, A.I, A.N), m); me.userData = { real: nom || 1 }; me.receiveShadow = true; return me; };

  // ---------- Preparar datos ----------
  function preparar(D) {
    const B = D.e.map((e, i) => {
      let p = pts(e, 3), s = 0; for (let k = 0; k < p.length; k++) { const a = p[k], b = p[(k + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; }
      if (s < 0) p = p.reverse(); const ar = Math.abs(s) / 2;
      let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9, cx = 0, cz = 0; p.forEach(q => { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[1]); z1 = Math.max(z1, q[1]); cx += q[0]; cz += q[1]; });
      return { i, p, lv: e[0], cl: e[1], nom: e[2] >= 0 ? D.s[e[2]] : '', ar, bb: [x0, z0, x1, z1], cx: cx / p.length, cz: cz / p.length, dc: 0, rol: null };
    }).filter(b => Math.hypot(b.cx, b.cz) < R + 5);
    B.forEach(b => { b.dc = Math.hypot(b.cx, b.cz); });
    const C = D.c.map(c => ({ k: c[0], nom: c[1] >= 0 ? D.s[c[1]] : '', uno: c[2], p: pts(c, 3) })).filter(c => c.p.length > 1);
    return { B, C, A: D.a.map(a => ({ t: a[0], p: pts(a, 1) })), P: D.p.map(a => ({ t: a[0], p: pts(a, 1) })) };
  }

  // ---------- Construcción ----------
  function construir(S, M, st) {
    const D = datos(st.clubId), club = st.equipos[st.clubId], W = S.mundo, T = M;
    const rr = rnd(U.hash(club.id + 'real')), c1 = club.colores[0] === '#000000' ? '#222222' : club.colores[0], c2 = club.colores[1] || '#ffffff';
    const ciu = (st.ciudad && st.ciudad[st.clubId]) || { aficion: 50 }, afi = ciu.aficion || 50;
    const alta = !GM.campus || !GM.campus.config || GM.campus.config.calidad !== 'normal';
    S.real = true; S.ventanas = []; S.persianas = []; S.obrasRect = []; S.oclusores = []; S.distritos = null; S.reales = false;
    S.rec = { p: { value: new THREE.Vector3(0, 0, 0) }, c: { value: new THREE.Vector3(0, 50, 50) }, r: { value: 1.7 } };
    const G = M.rejilla({ limites: [-R - 20, -R - 20, R + 20, R + 20], CELDA }); S.G = G;
    const X = preparar(D), { B } = X;
    // fuera del círculo de datos no se anda
    for (let j = 0; j < G.H; j++) for (let i = 0; i < G.W; i++) { const [x, z] = G.centro(i, j); if (x * x + z * z > (R - 4) * (R - 4)) G.b[G.idx(i, j)] = 1; }
    const bloquearPoli = (p, margen) => {
      const x0 = Math.min(...p.map(q => q[0])) - margen, x1 = Math.max(...p.map(q => q[0])) + margen, z0 = Math.min(...p.map(q => q[1])) - margen, z1 = Math.max(...p.map(q => q[1])) + margen;
      const [ia, ja] = G.celda(x0, z0), [ib, jb] = G.celda(x1, z1);
      for (let j = Math.max(0, ja); j <= Math.min(G.H - 1, jb); j++) for (let i = Math.max(0, ia); i <= Math.min(G.W - 1, ib); i++) {
        const [x, z] = G.centro(i, j); let b = pip(x, z, p);
        if (!b && margen > 0) for (let k = 0; k < p.length && !b; k++) if (dSeg(x, z, p[k], p[(k + 1) % p.length]) < margen) b = true;
        if (b) G.b[G.idx(i, j)] = 1;
      }
    };
    // Suelo general (adoquín gris), parques, agua, aceras y calzadas
    const mSuelo = suelo('Concrete034', { color: false, escala: 2.4, relieve: 0.5 }, 0x77746e, 0), mAsf = suelo('Asphalt010', { escala: 5, tinte: 0xb4b4b4 }, 0x4a4c50, 3), mAcera = suelo('PavingStones070', { escala: 1.4, tinte: 0x97948d }, 0x8c8982, 1);
    mSuelo.polygonOffset = false;
    const base = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600).rotateX(-Math.PI / 2), mSuelo); base.position.y = -0.02; base.receiveShadow = true; base.userData = { real: 'suelo' }; W.add(base);
    const verde = suelo('Grass004', { escala: 3, tinte: 0xb8d0a0 }, 0x6f9a4a, 1.6), pista = suelo('Ground054', { escala: 1.2, tinte: 0xb9806a }, 0x9a6a58, 1.6);
    { const AV = nuevo(), AP = nuevo(), AG = nuevo();
      X.P.forEach(a => { if (a.p.length >= 3) rellenar(a.p, 0, a.t === 1 ? AP : AV); });
      [[AV, verde, 'parques'], [AP, pista, 'pistas']].forEach(([A, m, n]) => { const me = malla(A, m, n); if (me) { me.receiveShadow = true; W.add(me); } });
      X.A.forEach(a => { if (a.t === 1) { for (let i = 0; i + 1 < a.p.length; i++) { /* río: cinta de 9 m */ } cinta(a.p, 9, 0, AG); } else if (a.p.length >= 3) rellenar(a.p, 0, AG); });
      const mAgua = GM.arquitectura && GM.arquitectura.agua ? GM.arquitectura.agua({ color: 0x3f7f9f, opacidad: 0.93 }) : new THREE.MeshStandardMaterial({ color: 0x3f7f9f, roughness: 0.2 });
      mAgua.side = THREE.DoubleSide; mAgua.polygonOffset = true; mAgua.polygonOffsetFactor = -2; mAgua.polygonOffsetUnits = -2;
      const ag = malla(AG, mAgua, 'agua'); if (ag) { ag.position.y = -0.01; ag.receiveShadow = false; W.add(ag); }
      X.A.forEach(a => { if (a.t === 0 && a.p.length >= 3) bloquearPoli(a.p, 0.2); else if (a.t === 1) for (let i = 0; i + 1 < a.p.length; i++) { const f = a.p[i], g = a.p[i + 1]; bloquearPoli([[f[0] - 3.5, f[1] - 3.5], [g[0] + 3.5, g[1] - 3.5], [g[0] + 3.5, g[1] + 3.5], [f[0] - 3.5, f[1] + 3.5]], 0); } });
    }
    { const PA = nuevo(), PR = nuevo(), MR = nuevo(), MK = nuevo();
      X.C.forEach(c => { const w = ANCHO[c.k] || 4; if (c.k === 0) return; if (c.k <= 5) cinta(c.p, w + ACERA * 2, 0, PA); if (c.k !== 5) cinta(c.p, w, 0, PR); });
      const mp = malla(PA, mAcera, 'aceras'); if (mp) W.add(mp); const ma = malla(PR, mAsf, 'calzadas'); if (ma) W.add(ma);
      // marcas viales: línea discontinua en el eje de las calles de doble sentido
      const mBl = new THREE.MeshStandardMaterial({ color: 0xf1efe8, roughness: 0.8, side: THREE.DoubleSide }); mBl.polygonOffset = true; mBl.polygonOffsetFactor = -5; mBl.polygonOffsetUnits = -5;
      X.C.forEach(c => { if (c.k > 4 || c.uno) return; let acum = 0; for (let i = 0; i + 1 < c.p.length; i++) { const a = c.p[i], b = c.p[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 1) continue; const ux = (b[0] - a[0]) / l, uz = (b[1] - a[1]) / l;
        for (let s = (3 - (acum % 5) + 5) % 5; s + 2 < l; s += 5) cinta([[a[0] + ux * s, a[1] + uz * s], [a[0] + ux * (s + 2), a[1] + uz * (s + 2)]], 0.14, 0, MK); acum += l; } });
      const mk = malla(MK, mBl, 'marcas'); if (mk) { mk.receiveShadow = false; W.add(mk); }
    }
    // Edificios: paredes y tejados por cuadrantes de 90 m (se dibujan solo los visibles)
    const tex = texFachada(M), pal = (PALETA[club.pais] || PALETA.ES).map(col), teja = col(TEJAS[club.pais] || TEJAS.ES);
    const mPared = recortable(S, new THREE.MeshStandardMaterial({ map: tex.base, vertexColors: true, roughness: 0.9, emissive: 0xffc98a, emissiveMap: tex.luz, emissiveIntensity: 0, side: THREE.DoubleSide }));
    const mTienda = recortable(S, new THREE.MeshStandardMaterial({ map: tex.tienda, vertexColors: true, roughness: 0.7, emissive: 0xffd9a0, emissiveMap: tex.tienda, emissiveIntensity: 0, side: THREE.DoubleSide }));
    const mTecho = recortable(S, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide }));
    S.ventanas.push(mPared, mTienda);
    const chunks = {};
    const ch = b => { const k = Math.floor(b.cx / 90) + ',' + Math.floor(b.cz / 90); return chunks[k] || (chunks[k] = { w: { P: [], N: [], U: [], C: [], I: [] }, t: { P: [], N: [], U: [], C: [], I: [] }, r: { P: [], N: [], C: [], I: [] } }); };
    const altura = b => {
      const h = U.hash(club.id + b.i), a = (h % 1000) / 1000;
      const lv = b.lv || ({ 1: b.ar < 220 ? 2 + (a < 0.3 ? 1 : 0) : 4 + Math.floor(a * 4), 2: 2 + Math.floor(a * 2.4), 3: 4 + Math.floor(a * 5), 4: 3, 5: 6, 6: 4, 7: 1, 8: 6, 9: 2, 10: 1, 11: 1, 12: 2, 13: 2, 0: b.ar > 700 ? 5 : 3 + Math.floor(a * 3) }[b.cl] || 3);
      b.lv = lv;
      return b.cl === 7 ? 13 : b.cl === 10 ? 17 : b.cl === 9 ? Math.min(9, lv * 4) : lv * 3.1 + (b.cl === 2 || b.cl === 12 || b.cl === 11 ? 0.4 : 0.3);
    };
    const color = b => {
      if (b.cl === 10) return col(c1).lerp(col('#e8e8ea'), 0.5);
      if (b.cl === 5) return col('#e4e9ee'); if (b.cl === 4) return col('#d9b08a'); if (b.cl === 7) return col('#d9d0bd'); if (b.cl === 9) return col('#b7b9bb'); if (b.cl === 3 && b.lv > 4) return col('#aeb9c4');
      const h = U.hash(club.id + 'c' + b.i); return pal[h % pal.length].clone().offsetHSL(0, 0, (((h >>> 8) % 100) / 100 - 0.5) * 0.07);
    };
    const pared = (b, h, k) => {
      const c = b.col, tienda = b.cl === 2 || b.cl === 12 || b.cl === 11, A = ch(b), p = b.p; let u = 0;
      for (let i = 0; i < p.length; i++) {
        const a = p[i], e = p[(i + 1) % p.length], l = Math.hypot(e[0] - a[0], e[1] - a[1]); if (l < 0.25) continue;
        const nx = (e[1] - a[1]) / l, nz = -(e[0] - a[0]) / l;
        const quad = (S0, y0, y1, ua, ub, v0, v1, cc) => { const v = S0.P.length / 3; S0.P.push(a[0], y0, a[1], e[0], y0, e[1], e[0], y1, e[1], a[0], y1, a[1]); for (let j = 0; j < 4; j++) { S0.N.push(nx, 0, nz); S0.C.push(cc.r, cc.g, cc.b); } S0.U.push(ua, v0, ub, v0, ub, v1, ua, v1); S0.I.push(v, v + 1, v + 2, v, v + 2, v + 3); };
        if (tienda) { quad(A.t, 0, 3.4, u / 3, (u + l) / 3, 0, 1, b.colBajo); quad(A.w, 3.4, h, u / 3, (u + l) / 3, 0, (h - 3.4) / 3.1, c); } else quad(A.w, 0, h, u / 3, (u + l) / 3, 0, h / 3.1, c);
        u += l;
      }
    };
    const techo = (b, h) => {
      const A = ch(b).r, p = b.p, tc = b.cl === 10 ? col('#9aa3ab') : col('#5b5753').offsetHSL(0, 0, ((U.hash(b.i + 'r') % 100) / 100 - 0.5) * 0.08);
      if (b.cl === 1 && b.ar < 230 && b.lv <= 3 && p.length <= 12) {   // tejado a dos aguas sobre el rectángulo orientado de la casa
        let li = 0, ml = 0; for (let i = 0; i < p.length; i++) { const a = p[i], e = p[(i + 1) % p.length], l = Math.hypot(e[0] - a[0], e[1] - a[1]); if (l > ml) { ml = l; li = i; } }
        const a0 = p[li], e0 = p[(li + 1) % p.length], ux = (e0[0] - a0[0]) / ml, uz = (e0[1] - a0[1]) / ml, vx = -uz, vz = ux;
        let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9; p.forEach(q => { const u = (q[0] - a0[0]) * ux + (q[1] - a0[1]) * uz, v = (q[0] - a0[0]) * vx + (q[1] - a0[1]) * vz; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); });
        u0 -= 0.35; u1 += 0.35; v0 -= 0.35; v1 += 0.35; const vm = (v0 + v1) / 2, rh = Math.min(2.4, (v1 - v0) * 0.32), P = (u, v, y) => [a0[0] + ux * u + vx * v, y, a0[1] + uz * u + vz * v];
        const tj = teja.clone().offsetHSL(0, 0, ((U.hash(b.i + 't') % 100) / 100 - 0.5) * 0.08), vs = [P(u0, v0, h), P(u1, v0, h), P(u1, vm, h + rh), P(u0, vm, h + rh), P(u0, v1, h), P(u1, v1, h)], base = A.P.length / 3;
        vs.forEach(q => { A.P.push(...q); A.N.push(0, 1, 0); A.C.push(tj.r, tj.g, tj.b); }); A.I.push(base, base + 1, base + 2, base, base + 2, base + 3, base + 3, base + 2, base + 5, base + 3, base + 5, base + 4);
        const gb = A.P.length / 3, cg = col('#e9e2d4'); [P(u0, v0, h), P(u0, v1, h), P(u0, vm, h + rh), P(u1, v0, h), P(u1, v1, h), P(u1, vm, h + rh)].forEach(q => { A.P.push(...q); A.N.push(1, 0, 0); A.C.push(cg.r, cg.g, cg.b); }); A.I.push(gb, gb + 1, gb + 2, gb + 3, gb + 5, gb + 4);
        return;
      }
      const v = p.map(q => new THREE.Vector2(q[0], q[1])), t = THREE.ShapeUtils.triangulateShape(v, []), base = A.P.length / 3;
      v.forEach(q => { A.P.push(q.x, h, q.y); A.N.push(0, 1, 0); A.C.push(tc.r, tc.g, tc.b); }); t.forEach(k => A.I.push(base + k[0], base + k[1], base + k[2]));
    };
    const roles = asignar(X, st, club);   // qué edificio hace de qué (cambia la clase del edificio: la peña lleva escaparates, el pabellón es grande…)
    B.forEach(b => { const h = altura(b); b.h = h; b.col = color(b); b.colBajo = col(['#3a3f45', '#5a3b26', '#2f4f6e', '#7a2f22', '#2e5d3a', '#6b4a3a'][U.hash(club.id + 'b' + b.i) % 6]); });
    B.forEach(b => { pared(b, b.h, 0); if (b !== roles.pabellon) techo(b, b.h); bloquearPoli(b.p, 0.35); });
    { const b = roles.pabellon, [x0, z0, x1, z1] = b.bb, hx = (x1 - x0) / 2, hz = (z1 - z0) / 2, alto = Math.min(9, Math.max(hx, hz) * 0.22);
      const cu = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 14, 0, Math.PI * 2, 0, Math.PI / 2), recortable(S, new THREE.MeshStandardMaterial({ color: 0xc9ced4, metalness: 0.45, roughness: 0.38 })));
      cu.scale.set(hx * 0.97, alto, hz * 0.97); cu.position.set((x0 + x1) / 2, b.h, (z0 + z1) / 2); cu.castShadow = alta; cu.userData = { cupula: true }; W.add(cu);
      const aro = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 64).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: c1, roughness: 0.6 })); aro.scale.set(hx * 0.97, 1, hz * 0.97); aro.position.set((x0 + x1) / 2, b.h + 0.15, (z0 + z1) / 2); aro.userData = { cupula: true }; W.add(aro); }
    Object.keys(chunks).forEach(k => {
      const c = chunks[k], me = (A, mat, tri) => { if (!A.P.length) return; const g = geo(A.P, A.I, A.N, A.U, A.C), m = new THREE.Mesh(g, mat); m.userData = { real: 'edif' }; m.castShadow = alta; m.receiveShadow = alta; W.add(m); };
      me(c.w, mPared); me(c.t, mTienda); me(c.r, mTecho);
    });
    montar(S, M, st, X, roles, { W, G, club, c1, c2, afi, alta, rr, bloquearPoli, mAsf });
    GM.kit.fusionar(W);
    return W;
  }
  // ---------- Frente de cada edificio: qué lado da a la calle y dónde se pone la puerta ----------
  let SEGS = null;
  function segmentos(X) { if (SEGS && SEGS.X === X) return SEGS.L; const L = []; X.C.forEach(c => { if (c.k > 5) return; for (let i = 0; i + 1 < c.p.length; i++) L.push([c.p[i], c.p[i + 1], c.k]); }); SEGS = { X, L }; return L; }
  function frente(b, X) {
    if (b._fr !== undefined) return b._fr; const L = segmentos(X); let mejor = null;
    for (let i = 0; i < b.p.length; i++) {
      const a = b.p[i], e = b.p[(i + 1) % b.p.length], l = Math.hypot(e[0] - a[0], e[1] - a[1]); if (l < 2.4) continue;
      const nx = (e[1] - a[1]) / l, nz = -(e[0] - a[0]) / l, mx = (a[0] + e[0]) / 2, mz = (a[1] + e[1]) / 2, px = mx + nx * 2.5, pz = mz + nz * 2.5; let d = 1e9;
      for (let k = 0; k < L.length; k++) { const s = L[k], dd = dSeg(px, pz, s[0], s[1]) - ANCHO[s[2]] / 2; if (dd < d) d = dd; }
      const sc = d - Math.min(l, 14) * 0.12; if (!mejor || sc < mejor.sc) mejor = { i, mx, mz, nx, nz, d, l, sc, ax: a[0], az: a[1], ex: e[0], ez: e[1] };
    }
    return (b._fr = mejor || { i: 0, mx: b.cx, mz: b.cz, nx: 0, nz: 1, d: 99, l: 3, sc: 99, ax: b.cx, az: b.cz, ex: b.cx, ez: b.cz });
  }
  // Punto libre delante de la puerta (en la acera), o el libre más cercano
  function puntoPuerta(b, X, G, fuera) {
    const fr = frente(b, X), libre = (x, z) => { const [i, j] = G.celda(x, z); return G.libre(i, j) && G.libre(i + 1, j) && G.libre(i - 1, j) && G.libre(i, j + 1) && G.libre(i, j - 1); };
    for (const dd of [fuera || 1.4, 1.9, 2.5, 3.2]) for (const t of [0, 0.25, -0.25, 0.4, -0.4]) {
      const ux = (fr.ex - fr.ax) / fr.l, uz = (fr.ez - fr.az) / fr.l, x = fr.mx + ux * fr.l * t + fr.nx * dd, z = fr.mz + uz * fr.l * t + fr.nz * dd;
      if (libre(x, z)) return { x, z, nx: fr.nx, nz: fr.nz, mx: fr.mx + ux * fr.l * t, mz: fr.mz + uz * fr.l * t, l: fr.l, ry: Math.atan2(fr.nx, fr.nz) };
    }
    return { x: fr.mx + fr.nx * 2, z: fr.mz + fr.nz * 2, nx: fr.nx, nz: fr.nz, mx: fr.mx, mz: fr.mz, l: fr.l, ry: Math.atan2(fr.nx, fr.nz) };
  }

  // ---------- Qué edificio hace de qué ----------
  // Si en la zona no hay un edificio adecuado para un papel (alrededor de un pabellón en las afueras suele haber aparcamientos), se levanta uno junto a una calle real
  function sintetizar(X, rol, cl, dMin, dMax, w, d, lv, azar) {
    const B = X.B, rr = azar || Math.random, N = X.muestras || (X.muestras = (() => { const L = []; X.C.forEach(c => { if (c.k < 1) return; let acum = 0; for (let i = 0; i + 1 < c.p.length; i++) { const a = c.p[i], b = c.p[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 1) continue; for (let s = 6 - (acum % 12); s < l; s += 12) { if (s < 0) continue; L.push({ x: a[0] + (b[0] - a[0]) * s / l, z: a[1] + (b[1] - a[1]) * s / l, tx: (b[0] - a[0]) / l, tz: (b[1] - a[1]) / l, k: c.k }); } acum += l; } }); return L; })());
    const orden = N.map((m, i) => [Math.hypot(m.x, m.z), i]).filter(q => q[0] >= dMin && q[0] <= dMax).sort((a, b) => Math.abs(a[0] - (dMin + dMax) / 2) - Math.abs(b[0] - (dMin + dMax) / 2) + (rr() - 0.5) * 60);
    for (const [, i] of orden) for (const lado of [1, -1]) {
      const m = N[i], nx = -m.tz * lado, nz = m.tx * lado, off = ANCHO[m.k] / 2 + ACERA + d / 2 + 0.4, cx = m.x + nx * off, cz = m.z + nz * off;
      const ux = m.tx, uz = m.tz, P = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [cx + ux * a * w / 2 + nx * b * d / 2, cz + uz * a * w / 2 + nz * b * d / 2]);
      if (Math.hypot(cx, cz) > R - 25) continue;
      const x0 = Math.min(...P.map(q => q[0])) - 1.2, x1 = Math.max(...P.map(q => q[0])) + 1.2, z0 = Math.min(...P.map(q => q[1])) - 1.2, z1 = Math.max(...P.map(q => q[1])) + 1.2;
      if (B.some(b => b.bb[0] < x1 && b.bb[2] > x0 && b.bb[1] < z1 && b.bb[3] > z0)) continue;
      if (X.P.some(q => q.t === 0 && P.some(pp => pip(pp[0], pp[1], q.p))) || X.A.some(q => q.p.length >= 3 && P.some(pp => pip(pp[0], pp[1], q.p)))) continue;
      const pol = P.slice(); let s2 = 0; for (let k = 0; k < 4; k++) { const a = pol[k], e = pol[(k + 1) % 4]; s2 += a[0] * e[1] - e[0] * a[1]; } if (s2 < 0) pol.reverse();
      const b = { i: B.length + 2000, p: pol, lv, cl, nom: '', ar: w * d, bb: [x0 + 1.2, z0 + 1.2, x1 - 1.2, z1 - 1.2], cx, cz, dc: Math.hypot(cx, cz), rol, sint: true };
      B.push(b); return b;
    }
    return null;
  }
  function asignar(X, st, club) {
    const { B } = X, R = { viviendas: [], locales: [] }, ELIGE = {}, rs = rnd(U.hash(club.id + 'sint')), sint = (rol, cl, dMin, dMax, w, d, lv) => { const b = sintetizar(X, rol, cl, dMin, dMax, w, d, lv, rs) || sintetizar(X, rol, cl, 15, 270, w, d, lv, rs); if (b) R[rol] = b; return b; };
    const acc = b => frente(b, X).d < 15 && frente(b, X).l >= 4;
    const tomar = (rol, filtro, puntos, cl) => { let mejor = null, mp = 1e18; for (const b of B) { if (b.rol || !filtro(b)) continue; const p = puntos(b); if (p < mp) { mp = p; mejor = b; } } if (mejor) { mejor.rol = rol; if (cl !== undefined) mejor.cl = cl; R[rol] = mejor; } return mejor; };
    const rr = rnd(U.hash(club.id + 'roles'));
    // pabellón: el edificio que contiene el origen, o el deportivo más cercano, o uno inventado
    let pab = B.filter(b => pip(0, 0, b.p) && b.ar > 350).sort((a, b) => b.ar - a.ar)[0] || B.filter(b => b.cl === 10 && b.dc < 160 && b.ar > 300).sort((a, b) => a.dc - b.dc)[0] || B.filter(b => b.dc < 90 && b.ar > 1100).sort((a, b) => a.dc - b.dc)[0];
    if (!pab) { const p = []; for (let k = 0; k < 16; k++) p.push([Math.cos(k / 16 * Math.PI * 2) * 26, Math.sin(k / 16 * Math.PI * 2) * 19]); pab = { i: B.length + 1000, p: p.reverse(), lv: 0, cl: 10, nom: '', ar: 1500, bb: [-26, -19, 26, 19], cx: 0, cz: 0, dc: 0, rol: null }; B.push(pab); }
    pab.rol = 'pabellon'; pab.cl = 10; R.pabellon = pab; pab._fr = undefined;
    tomar('sede', b => acc(b) && b.ar > 140 && b.ar < 1500 && [0, 1, 2, 3].indexOf(b.cl) >= 0 && b.dc > 40 && b.dc < 200, b => Math.abs(b.dc - 70) + (b.lv >= 2 ? 0 : 40), 3) || sint('sede', 3, 45, 120, 16, 10, 4);
    tomar('tienda', b => acc(b) && b.ar > 70 && b.ar < 900 && [0, 1, 2, 3, 12, 9].indexOf(b.cl) >= 0 && b.dc > 20 && b.dc < 230, b => b.dc + (b.cl === 2 ? -30 : 0), 2) || sint('tienda', 2, 25, 110, 12, 9, 2);
    tomar('pena', b => acc(b) && b.ar > 55 && b.ar < 600 && [0, 1, 2, 12].indexOf(b.cl) >= 0 && b.dc > 25 && b.dc < 190, b => b.dc + (b.cl === 12 ? -60 : 0), 12) || sint('pena', 12, 30, 130, 10, 8, 2);
    tomar('ayuntamiento', b => b.cl === 6 && b.ar > 150, b => b.dc, 6) || tomar('ayuntamiento', b => acc(b) && b.ar > 350 && b.ar < 1800 && [0, 3].indexOf(b.cl) >= 0 && b.dc > 60 && b.dc < 210, b => Math.abs(b.dc - 130), 6) || sint('ayuntamiento', 6, 70, 200, 20, 12, 4);
    tomar('kiosco', b => b.cl === 11 && b.dc < 220 && acc(b), b => b.dc, 11);
    tomar('mercado', b => acc(b) && b.ar > 500 && b.ar < 2500 && [0, 2].indexOf(b.cl) >= 0 && b.dc > 60 && b.dc < 230, b => b.dc, 2) || sint('mercado', 2, 80, 210, 22, 14, 1);
    tomar('terraza', b => acc(b) && b.cl === 12 && b.ar > 40 && b.dc > 30 && b.dc < 220, b => b.dc, 12) || tomar('terraza', b => acc(b) && [0, 2].indexOf(b.cl) >= 0 && b.ar > 60 && b.ar < 500 && b.dc > 40 && b.dc < 220, b => b.dc, 12) || sint('terraza', 12, 40, 160, 9, 8, 2);
    tomar('heladeria', b => acc(b) && [12, 2, 0].indexOf(b.cl) >= 0 && b.ar > 40 && b.ar < 450 && b.dc > 30 && b.dc < 230, b => 100 + b.dc * (rr() * 0.5 + 0.7), 12) || sint('heladeria', 12, 40, 190, 8, 8, 1);
    tomar('colegio', b => b.cl === 4 && b.ar > 200 && acc(b), b => b.dc, 4) || tomar('colegio', b => acc(b) && b.ar > 600 && b.ar < 3000 && [0, 9].indexOf(b.cl) >= 0 && b.dc > 100, b => b.dc, 4) || sint('colegio', 4, 90, 220, 28, 14, 2);
    tomar('hospital', b => b.cl === 5 && b.ar > 250 && acc(b), b => b.dc, 5) || tomar('hospital', b => acc(b) && b.ar > 1200 && [0, 3].indexOf(b.cl) >= 0 && b.dc > 120, b => b.dc, 5) || sint('hospital', 5, 120, 230, 30, 16, 6);
    tomar('estacion', b => b.cl === 13 && acc(b), b => b.dc, 13);
    tomar('campus', b => acc(b) && b.ar > 500 && [0, 9, 3].indexOf(b.cl) >= 0 && b.dc > 150 && b.dc < 265, b => -b.dc, 9) || sint('campus', 9, 150, 250, 22, 12, 2);
    tomar('bus', b => acc(b) && b.ar > 80 && b.dc > 130 && b.dc < 230, b => Math.abs(b.dc - 190), undefined) || sint('bus', 0, 130, 230, 9, 7, 2);
    // tus viviendas
    const vivs = GM.mods.hogar && GM.mods.hogar.viviendas ? GM.mods.hogar.viviendas(st) : [];
    vivs.forEach((v, k) => {
      const casa = ['casa', 'mansion'].indexOf({ residencia: 'bloque', loft: 'bloque', buhardilla: 'bloque', bloque: 'bloque', 'bloque-moderno': 'bloque', moderno: 'atico', rustico: 'atico', mediterranea: 'casa', piedra: 'casa', moderna: 'casa', clasica: 'mansion', 'mansion-moderna': 'mansion', villa: 'mansion' }[v.ext] || 'bloque') >= 0;
      const b = tomar('viv' + k, b => acc(b) && b.cl === 1 && b.dc > 50 + (v.actual ? 0 : 20) && (casa ? b.ar < 260 : b.ar >= 120), b => (casa ? b.dc * 0.6 + b.ar * 0.2 : -b.ar * 0.1 + b.dc * 0.5) + (v.actual ? 0 : rr() * 90), undefined) || tomar('viv' + k, b => acc(b) && b.dc > 40 && b.ar > 80 && [0, 1].indexOf(b.cl) >= 0, b => b.dc, undefined) || sint('viv' + k, 1, 50, 200, casa ? 10 : 16, casa ? 9 : 12, casa ? 2 : 5);
      if (b) R.viviendas.push({ v, b });
    });
    // locales con interior
    if (GM.interiores) [['restaurante', 'RESTAURANTE EL TAPÓN', '#5a1020', 'Entrar en el restaurante', [12, 2, 0]], ['gimnasio_barrio', 'GIMNASIO', '#1d2024', 'Entrar en el gimnasio', [2, 0, 3]], ['cine_ciudad', 'CINE', '#7a1a22', 'Entrar en el cine', [2, 0]], ['bolera', 'BOLERA STRIKE', '#1d4f91', 'Entrar en la bolera', [2, 0, 9]], ['barberia', 'BARBERÍA PACO', '#1d4f91', 'Entrar en la barbería', [2, 12, 0]]].forEach(([tipo, txt, fondo, boton, cls], k) => {
      const b = tomar('local_' + tipo, b => acc(b) && cls.indexOf(b.cl) >= 0 && b.ar > 90 && b.ar < 1100 && b.dc > 30 && b.dc < 240, b => b.dc * (0.6 + rr() * 0.8) + k * 6, 2) || sint('local_' + tipo, 2, 30, 210, 11, 9, 2); if (b) R.locales.push({ tipo, txt, fondo, boton, b });
    });
    return R;
  }
  // ---------- Carteles, zonas y puertas ----------
  function cartel(W, M, txt, fondo, letra, x, y, z, ry, ancho) {
    const t = M.textura('real-cartel-' + txt + fondo, 512, (c, n) => {
      c.fillStyle = fondo; c.fillRect(0, 0, n, n / 4); c.fillStyle = letra; let fs = 64; c.font = 'bold ' + fs + 'px sans-serif';
      while (c.measureText(txt).width > n * 0.92 && fs > 18) { fs -= 4; c.font = 'bold ' + fs + 'px sans-serif'; }
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, n / 2, n / 8);
    });
    const g = new THREE.PlaneGeometry(ancho, ancho / 4.2);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
    m.position.set(x, y, z); m.rotation.y = ry; m.userData = { cartel: true }; W.add(m); return m;
  }
  function puertaVisual(W, p, ancho) {
    const a = ancho || 1.8, m = new THREE.Mesh(new THREE.PlaneGeometry(a, 2.5), new THREE.MeshStandardMaterial({ color: 0x23272c, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    m.position.set(p.mx + p.nx * 0.05, 1.25, p.mz + p.nz * 0.05); m.rotation.y = p.ry; m.userData = { puerta: true }; W.add(m);
    const t = new THREE.Mesh(new THREE.BoxGeometry(a + 0.5, 0.1, 0.55), new THREE.MeshStandardMaterial({ color: 0x2a2f35 }));
    t.position.set(p.mx + p.nx * 0.45, 2.7, p.mz + p.nz * 0.45); t.rotation.y = p.ry; t.userData = { puerta: true }; W.add(t);
  }
  function montar(S, M, st, X, R, c) {
    const { W, G, club, c1, c2 } = c, C3 = GM.mods.ciudad3d;
    const bar = C3 && C3.barrios ? C3.barrios(st).map(b => b.nombre) : [];
    S.plazaNombre = bar[2] || club.ciudad;
    const zonas = {}, SALAS = {}, paseo = []; S.puertas = {};
    const lugar = tipo => { const l = C3 && C3.lugares ? C3.lugares(st).find(x => x.tipo === tipo) : null; return l ? l.id : null; };
    const salaLugar = (id, nombre, tipo) => {
      const lid = lugar(tipo), nada = () => [{ id: 'nada', t: nombre, d: '', disponible: false, motivo: 'Sin actividades', fn: () => ({ ok: false }) }];
      SALAS[id] = { id, nombre, accion: '', destino: {}, acciones: s2 => {
        if (!lid) return nada(); const L = C3.acciones(s2, lid);
        return L.length ? L.map(a => ({ id: a.id, t: a.t, d: (a.coste ? (a.jugador ? a.coste + ' mil €' : U.eur(a.coste)) : 'Gratis') + (a.ef && a.ef.barrio ? ', cariño del barrio' : ''), disponible: a.disponible, motivo: a.motivo || 'No disponible', fn: () => { const r2 = C3.hacer(s2, lid, a.id); return r2.ok ? { ok: true, texto: a.t } : r2; } })) : nada();
      } };
    };
    const poner = (clave, b, txt, fondo, letra, o) => {
      o = o || {}; const p = puntoPuerta(b, X, G, o.fuera), fr = frente(b, X);
      const ancho = Math.min(o.ancho || 6, Math.max(2.5, fr.l * 0.85)), y = o.y || (b.cl === 2 || b.cl === 12 ? 3.05 : 3.7);
      cartel(W, M, txt, fondo, letra, p.mx + p.nx * 0.07, y, p.mz + p.nz * 0.07, p.ry, ancho); puertaVisual(W, p);
      zonas[clave] = [p.x, p.z]; paseo.push([p.x, p.z]); b.puerta = p; return p;
    };
    const entrada = (id, p) => { S.puertas[id] = { x: p.x + p.nx * 0.5, z: p.z + p.nz * 0.5, ry: p.ry }; };
    const nombreCalle = b => { const fr = frente(b, X); let m = null, md = 1e9; X.C.forEach(cc => { if (!cc.nom) return; for (let i = 0; i + 1 < cc.p.length; i++) { const d = dSeg(fr.mx, fr.mz, cc.p[i], cc.p[i + 1]); if (d < md) { md = d; m = cc.nom; } } }); return m; };
    // Pabellón: el edificio real con su rótulo grande y las banderas del club
    { const b = R.pabellon, p = poner('pabellon', b, club.pabellon.nombre.toUpperCase(), '#14181d', '#ffffff', { ancho: 12, y: 6.2, fuera: 2.2 });
      S.ptoPab = [p.x, p.z]; entrada('interior:pabellon', p); S.puertas.pabellon = S.puertas['interior:pabellon'];
      const ux = p.nz, uz = -p.nx;
      for (const s of [-3.4, 3.4]) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 4.4), GM.kit.viento(new THREE.MeshStandardMaterial({ color: s < 0 ? c1 : c2, side: THREE.DoubleSide, roughness: 0.85 }), 'tela')); pl.position.set(p.mx + p.nx * 0.12 + ux * s, 4.2, p.mz + p.nz * 0.12 + uz * s); pl.rotation.y = p.ry; pl.userData = { bandera: true }; W.add(pl); } }
    SALAS.pabellon = { id: 'pabellon', nombre: club.pabellon.nombre, accion: 'Taquillas y estado del pabellón', destino: { todos: 'club' } };
    if (R.sede) { const p = poner('sede', R.sede, club.nombre.toUpperCase(), c1, '#ffffff', { ancho: 8, y: 3.6 }); S.spawnCalle = { x: p.x, z: p.z, ry: p.ry }; entrada('sede', p); SALAS.sede = { id: 'sede_calle', nombre: 'Sede del club', accion: 'Volver a las instalaciones', destino: {}, irA: 'sede', boton: 'Entrar en la sede' }; }
    else { const p = puntoPuerta(R.pabellon, X, G, 5); S.spawnCalle = { x: p.x, z: p.z, ry: p.ry }; }
    if (R.tienda) { poner('tienda', R.tienda, 'TIENDA OFICIAL ' + club.siglas, '#14181d', '#ffffff', { ancho: 6.2 }); SALAS.tienda = { id: 'tienda', nombre: 'Tienda oficial', accion: 'Camisetas, bufandas y aficionados', destino: {} }; }
    if (R.pena) { const p = poner('pena', R.pena, 'BAR LA PEÑA', '#5a3b26', '#f2d27a', { ancho: 5.5 }); S.ptoPena = [p.x, p.z]; SALAS.pena = { id: 'pena', nombre: 'Bar La Peña', accion: 'Donde se reúne la afición', destino: {} }; }
    if (R.ayuntamiento) { poner('ayuntamiento', R.ayuntamiento, 'AYUNTAMIENTO DE ' + club.ciudad.toUpperCase(), '#1d4f91', '#ffffff', { ancho: 9, y: 4.4 }); SALAS.ayuntamiento = { id: 'ayuntamiento', nombre: 'Ayuntamiento de ' + club.ciudad, accion: 'Convenios y relación con la ciudad', destino: { todos: 'ciudad' } }; }
    if (R.kiosco) { poner('kiosco', R.kiosco, 'PRENSA', '#2a2f35', '#ffffff', { ancho: 3 }); SALAS.kiosco = { id: 'kiosco', nombre: 'Quiosco de prensa', accion: 'Lo que dicen los periódicos', destino: {} }; }
    if (R.mercado) { poner('mercado', R.mercado, 'MERCADO DE ' + S.plazaNombre.toUpperCase(), '#2e5d3a', '#f2d27a', { ancho: 8 }); SALAS.mercado = { id: 'mercado', nombre: 'Mercado de ' + S.plazaNombre, accion: 'Fruta, pescado y charla con los tenderos', destino: {} }; }
    if (R.terraza) { poner('terraza', R.terraza, 'CAFÉ CENTRAL', '#6b3a2a', '#ffffff', { ancho: 5 }); SALAS.terraza = { id: 'terraza', nombre: 'Terraza del Café Central', accion: 'Un café y escuchar a la gente', destino: {} }; terrazaMesas(W, R.terraza, X, G); }
    if (R.heladeria) { poner('heladeria', R.heladeria, 'HELADERÍA LA OLA', '#d86a8a', '#ffffff', { ancho: 5 }); SALAS.heladeria = { id: 'heladeria', nombre: 'Heladería La Ola', accion: 'Helados artesanos', destino: {} }; }
    if (R.colegio) { poner('lugar_colegio', R.colegio, (R.colegio.nom || 'COLEGIO ' + (bar[3] || club.ciudad)).toUpperCase().slice(0, 28), '#f4efe3', '#2a2a2a', { ancho: 9 }); salaLugar('lugar_colegio', 'Colegio ' + (bar[3] || club.ciudad), 'colegio'); }
    if (R.hospital) { poner('lugar_hospital', R.hospital, 'HOSPITAL ' + (R.hospital.nom || bar[1] || club.ciudad).toUpperCase().slice(0, 22), '#ffffff', '#c0392b', { ancho: 9 }); salaLugar('lugar_hospital', 'Hospital ' + (bar[1] || club.ciudad), 'hospital'); }
    if (R.estacion) { poner('lugar_estacion', R.estacion, (R.estacion.nom || 'ESTACIÓN').toUpperCase().slice(0, 24), '#1d4f91', '#ffffff', { ancho: 8 }); salaLugar('lugar_estacion', R.estacion.nom || 'Estación', 'estacion'); }
    if (R.campus) {
      const nom = club.ciudadDeportiva && club.ciudadDeportiva.nombre ? club.ciudadDeportiva.nombre : 'Ciudad deportiva', p = poner('lugar_campus', R.campus, nom.toUpperCase().slice(0, 26), c1, '#ffffff', { ancho: 10, y: 4.2 });
      salaLugar('lugar_campus', nom, 'campus'); if (GM.deportivaMundo) { Object.assign(SALAS.lugar_campus, { irA: 'deportiva', boton: 'Entrar en la ciudad deportiva' }); S.puertas.deportiva = { x: p.x + p.nx * 0.5, z: p.z + p.nz * 0.5, ry: p.ry }; }
    }
    R.viviendas.forEach(({ v, b }) => {
      const id = 'casa_' + v.id.replace(/[^a-zA-Z0-9]/g, ''), p = poner(id, b, (v.nombre || 'Tu casa').toUpperCase().slice(0, 24), '#f4efe3', '#2a2a2a', { ancho: 3.6, y: 2.7 });
      SALAS[id] = { id, nombre: v.nombre + (v.actual ? ' (vives aquí)' : ' (tuya)'), accion: v.barrioNombre ? 'Tu casa en ' + v.barrioNombre : 'Tu casa', destino: {}, irA: 'casa:' + v.id, boton: 'Entrar en casa' };
      entrada('casa:' + v.id, p); if (v.actual) S.puertas.casa = S.puertas['casa:' + v.id];
    });
    R.locales.forEach(l => { const p = poner('local_' + l.tipo, l.b, l.txt, l.fondo, '#ffffff', { ancho: 5.5 }); SALAS['local_' + l.tipo] = { id: 'local_' + l.tipo, nombre: l.txt.charAt(0) + l.txt.slice(1).toLowerCase(), accion: '', destino: {}, irA: 'interior:' + l.tipo, boton: l.boton }; entrada('interior:' + l.tipo, p); });
    if (GM.interiores) [['pabellon', 'Entrar al pabellón'], ['tienda', 'Entrar en la tienda'], ['pena', 'Entrar en el bar'], ['ayuntamiento', 'Entrar en el ayuntamiento']].forEach(([k, bt]) => {
      if (!SALAS[k]) return; SALAS[k] = Object.assign({}, SALAS[k], { irA: 'interior:' + k, boton: bt }); const p = R[k] && R[k].puerta; if (p && k !== 'pabellon') entrada('interior:' + k, p);
    });
    // Autobús a tu pueblo
    if (st.modo === 'carrera' && st.carrera && st.carrera.pueblo && R.bus) {
      const P = st.carrera.pueblo, carr = (P.edificios.find(b => b.tipo === 'carretera') || {}).nivel || 0, p = puntoPuerta(R.bus, X, G, 2.2);
      cartel(W, M, 'AUTOBÚS A ' + P.nombre.toUpperCase().slice(0, 18), '#2a8a4a', '#ffffff', p.mx + p.nx * 0.07, 3.0, p.mz + p.nz * 0.07, p.ry, 5); zonas.bus_pueblo = [p.x, p.z]; paseo.push([p.x, p.z]);
      SALAS.bus_pueblo = { id: 'bus_pueblo', nombre: 'Autobús a ' + P.nombre, accion: '', destino: {}, irA: 'pueblo', boton: carr >= 2 ? 'Coger la línea diaria a ' + P.nombre : 'Coger el autobús a ' + P.nombre }; S.puertas.pueblo = { x: p.x, z: p.z, ry: p.ry };
    }
    // Parque: el más grande cerca del centro, con su canasta
    { const ps = X.P.filter(q => q.t === 0 && q.p.length >= 3).map(q => {
        let cx = 0, cz = 0, s = 0; q.p.forEach(p => { cx += p[0]; cz += p[1]; }); cx /= q.p.length; cz /= q.p.length;
        for (let i = 0; i < q.p.length; i++) { const a = q.p[i], e = q.p[(i + 1) % q.p.length]; s += a[0] * e[1] - e[0] * a[1]; } return { q, cx, cz, ar: Math.abs(s) / 2 };
      }).filter(q => q.ar > 500 && Math.hypot(q.cx, q.cz) > 30 && Math.hypot(q.cx, q.cz) < 230 && pip(q.cx, q.cz, q.q.p)).sort((a, b) => Math.hypot(a.cx, a.cz) - Math.hypot(b.cx, b.cz))[0];
      if (ps) { S.parqueReal = ps; canasta(W, G, S, ps.cx, ps.cz); zonas.parque = [ps.cx - 3, ps.cz + 2]; SALAS.parque = { id: 'parque', nombre: 'Canasta del parque', accion: 'Donde juegan los chavales del barrio', destino: {} }; paseo.push(zonas.parque); } }
    // Quiosco y músico inventados si no hay datos reales
    S.paseoBase = muestreoAceras(X, G);
    const sitioAcera = (dMin, dMax, k) => { const L = S.paseoBase.filter(q => { const d = Math.hypot(q[0], q[1]); return d >= dMin && d < dMax; }); return L.length ? L[(k * 7919) % L.length] : null; };
    if (!zonas.kiosco) {
      const q = sitioAcera(40, 110, 3);
      if (q) {
        const k = new THREE.Group(), cu = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.3, 1.6), new THREE.MeshStandardMaterial({ color: 0x2f5d8a, roughness: 0.6 })); cu.position.y = 1.15; k.add(cu);
        const te = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 2.0), new THREE.MeshStandardMaterial({ color: 0xc43d3d })); te.position.y = 2.4; k.add(te); k.position.set(q[0], 0, q[1]); k.userData = { kiosco: true }; W.add(k);
        G.bloquea(q[0] - 1.2, q[1] - 0.9, q[0] + 1.2, q[1] + 0.9); zonas.kiosco = [q[0], q[1] + 1.8]; SALAS.kiosco = { id: 'kiosco', nombre: 'Quiosco de prensa', accion: 'Lo que dicen los periódicos', destino: {} }; paseo.push(zonas.kiosco);
      }
    }
    { const q = sitioAcera(30, 120, 11); if (q) { zonas.musico = [q[0], q[1]]; S.musicoPos = [q[0], q[1]]; SALAS.musico = { id: 'musico', nombre: 'Músico callejero', accion: 'Toca en la plaza', destino: {} }; } }
    S.zonas = Object.keys(SALAS).filter(k => zonas[k]).map(k => M.zona(W, SALAS[k], zonas[k][0], zonas[k][1], club));
    S.paseo = S.paseoBase.concat(paseo); S.portales = S.paseoBase.filter((_, i) => i % 6 === 0);
    S.calles = X.C.filter(cc => cc.nom && cc.k <= 5); S.vias = X.C.filter(cc => cc.k >= 1 && cc.k <= 4);
    S.calleNombre = nombreCalle(R.sede || R.pabellon) || ('Calle de ' + club.ciudad);
    mobiliario(S, M, X, G, W, c);
    S.cielo = true; S.scene.background = new THREE.Color(0xa9c6dc); S.scene.fog = new THREE.Fog(0xa9c6dc, 60, 170);
  }
  function muestreoAceras(X, G) {
    const out = [], libre = (x, z) => { const [i, j] = G.celda(x, z); return G.libre(i, j) && G.libre(i + 1, j) && G.libre(i, j + 1) && G.libre(i - 1, j) && G.libre(i, j - 1); };
    X.C.forEach(c => {
      if (c.k > 5) return; const off = c.k === 5 ? 0 : ANCHO[c.k] / 2 + 1.1; let acum = 0;
      for (let i = 0; i + 1 < c.p.length; i++) {
        const a = c.p[i], b = c.p[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 0.5) continue; const ux = (b[0] - a[0]) / l, uz = (b[1] - a[1]) / l;
        for (let s = 7 - (acum % 7); s < l; s += 7) for (const lado of off ? [1, -1] : [0]) { const x = a[0] + ux * s - uz * off * lado, z = a[1] + uz * s + ux * off * lado; if (x * x + z * z < (R - 12) * (R - 12) && libre(x, z)) out.push([x, z]); }
        acum += l;
      }
    });
    return out;
  }
  function terrazaMesas(W, b, X, G) {
    const p = puntoPuerta(b, X, G, 3.2), ux = p.nz, uz = -p.nx, mesa = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.6 }), pata = new THREE.MeshStandardMaterial({ color: 0x2a2f35 });
    [-2.2, 2.2].forEach(s => {
      const x = p.x + p.nx * 1.3 + ux * s, z = p.z + p.nz * 1.3 + uz * s, [i, j] = G.celda(x, z); if (!G.libre(i, j)) return;
      const g = new THREE.Group(), t = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.05, 14), mesa); t.position.y = 0.75; g.add(t);
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.75, 6), pata); l.position.y = 0.37; g.add(l); g.position.set(x, 0, z); g.userData = { mesa: true }; W.add(g); G.bloquea(x - 0.5, z - 0.5, x + 0.5, z + 0.5);
    });
  }
  function canasta(W, G, S, x, z) {
    const g = new THREE.Group(), met = new THREE.MeshStandardMaterial({ color: 0x3a3f45, metalness: 0.5, roughness: 0.5 }), p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.1, 8), met); p.position.set(0, 1.55, 0); g.add(p);
    const tab = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.06), new THREE.MeshStandardMaterial({ color: 0xf2f2f2 })); tab.position.set(0, 3.0, 0.3); g.add(tab);
    const aro = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.02, 6, 16).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xe8590c })); aro.position.set(0, 2.85, 0.6); g.add(aro);
    g.position.set(x, 0, z); g.userData = { canasta: true }; W.add(g); S.aroParque = new THREE.Vector3(x, 2.85, z + 0.6);
    const pista = new THREE.Mesh(new THREE.PlaneGeometry(14, 9).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x4a6b8a, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })); pista.position.set(x, 0, z + 3.2); pista.userData = { pista: true }; W.add(pista);
  }
  // ---------- Árboles y farolas ----------
  function mobiliario(S, M, X, G, W, c) {
    const rr = rnd(U.hash(c.club.id + 'mob')), libre = (x, z) => { const [i, j] = G.celda(x, z); return G.libre(i, j) && G.libre(i + 1, j) && G.libre(i, j + 1) && G.libre(i - 1, j) && G.libre(i, j - 1); };
    const zonasP = (S.zonas || []).map(z => [z.obj.position.x, z.obj.position.z]), cerca = (x, z) => zonasP.some(q => Math.hypot(q[0] - x, q[1] - z) < 2.2), arb = [];
    X.C.forEach(cc => {
      if (cc.k < 1 || cc.k > 5) return; const off = ANCHO[cc.k] / 2 + 1.5 + (cc.k === 5 ? 0.5 : 0); let acum = 0;
      for (let i = 0; i + 1 < cc.p.length; i++) {
        const a = cc.p[i], b = cc.p[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 0.5) continue; const ux = (b[0] - a[0]) / l, uz = (b[1] - a[1]) / l;
        for (let s = 9 - (acum % 9); s < l; s += 9 + rr() * 5) { const lado = rr() < 0.5 ? 1 : -1, x = a[0] + ux * s - uz * off * lado, z = a[1] + uz * s + ux * off * lado; if (arb.length < 900 && libre(x, z) && !cerca(x, z) && rr() < 0.75) arb.push([x, z]); }
        acum += l;
      }
    });
    X.P.forEach(q => {
      if (q.t === 1 || q.p.length < 3) return; let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; q.p.forEach(p => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); });
      let n = 0; for (let t = 0; t < 120 && n < 28; t++) { const x = x0 + rr() * (x1 - x0), z = z0 + rr() * (z1 - z0); if (pip(x, z, q.p) && libre(x, z) && !cerca(x, z) && arb.length < 1100) { arb.push([x, z]); n++; } }
    });
    if (arb.length) {
      const tr = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.17, 2.4, 6).translate(0, 1.2, 0), new THREE.MeshStandardMaterial({ color: 0x6b5136, roughness: 1 }), arb.length);
      const co = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.5, c.alta ? 1 : 0).translate(0, 3.4, 0), GM.kit.viento(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }), 'copa'), arb.length), m4 = new THREE.Matrix4(), cc = new THREE.Color();
      arb.forEach(([x, z], i) => {
        const s = 0.8 + rr() * 0.6; m4.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rr() * 6.28), new THREE.Vector3(s, s * (0.9 + rr() * 0.3), s));
        tr.setMatrixAt(i, m4); co.setMatrixAt(i, m4); cc.setHSL(0.25 + rr() * 0.06, 0.38 + rr() * 0.12, 0.2 + rr() * 0.08); co.setColorAt(i, cc); G.bloquea(x - 0.3, z - 0.3, x + 0.3, z + 0.3);
      });
      tr.userData = { arboles: true }; co.userData = { arboles: true }; tr.castShadow = co.castShadow = c.alta; W.add(tr); W.add(co); S.arbolesN = arb.length;
    }
    // farolas, sobre todo cerca del centro
    GM.urbano.luz(S, M); let nf = 0; const tope = c.alta ? 90 : 50;
    X.C.forEach(cc => {
      if (cc.k < 1 || cc.k > 4) return; const off = ANCHO[cc.k] / 2 + 0.9; let acum = 0, lado = 1;
      for (let i = 0; i + 1 < cc.p.length && nf < tope; i++) {
        const a = cc.p[i], b = cc.p[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 0.5) continue; const ux = (b[0] - a[0]) / l, uz = (b[1] - a[1]) / l;
        for (let s = 14 - (acum % 14); s < l && nf < tope; s += 28) {
          const x = a[0] + ux * s - uz * off * lado, z = a[1] + uz * s + ux * off * lado, hx = -(-uz * lado), hz = -(ux * lado); lado = -lado;
          if (Math.hypot(x, z) < 190 && libre(x, z) && !cerca(x, z)) { GM.urbano.farola(W, G, S, x, z, Math.atan2(hx, hz)); nf++; }
        }
        acum += l;
      }
    });
  }

  GM.register('calleReal', { cargar, datos, construir, preparar });
})();
