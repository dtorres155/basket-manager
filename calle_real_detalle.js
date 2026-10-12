/* DETALLE DE LA CIUDAD REAL (GM.calleRealDetalle) — lo que hace que parezca una ciudad y no una maqueta
   Se llama desde calle_real.js al terminar de colocar los lugares. Pone, sobre el plano real:
   - Edificios: balcones con barandilla, cornisas, toldos en los comercios, portales con puerta, antenas, depósitos, aires acondicionados y chimeneas.
   - Urbanismo: pasos de cebra y semáforos en los cruces reales, bordillos de granito, parches y alcantarillas en el asfalto, bancos, papeleras,
     bolardos, hidrantes, contenedores, marquesinas, coches aparcados (también en los aparcamientos reales) y vías de tren.
   - Menos vacío: patios con césped, tierra y arbustos dentro de las manzanas, usos del suelo (bosque, cementerio, obras, industria), vallas y setos,
     los árboles reales de OpenStreetMap y los comercios con nombre (rótulo en la fachada que da a la calle).
   Todo en mallas instanciadas o fundidas: pocas llamadas de dibujo. Expone: detallar(S, M, st, X, roles, ctx). */
(function () {
  const U = GM.util;
  const COLORES_COCHE = ['#c8102e', '#f4f4f4', '#1d2024', '#2f6f9e', '#8a8f94', '#e8b923', '#3a5a3a', '#7a2f22', '#d9d9d6', '#4a4f55'];
  const TOLDOS = ['#c0392b', '#2f6f9e', '#2e7d32', '#d4a017', '#7a3b69', '#1f2f4a', '#e67e22'];
  const PUERTAS = ['#3b2a22', '#23303a', '#4a3a1f', '#2f4a3a', '#5a1f1f', '#2a2f35'];

  function detallar(S, M, st, X, roles, c) {
    const I = GM.mods.calleReal._int, { W, G, club, alta } = c, { pip, dSeg, ANCHO, ACERA, R } = I, rr = I.rnd(U.hash(club.id + 'detalle'));
    const B = X.B, m4 = new THREE.Matrix4(), cc = new THREE.Color(), q = new THREE.Quaternion(), eje = new THREE.Vector3(0, 1, 0), v3 = new THREE.Vector3(), esc = new THREE.Vector3();
    const libre = (x, z) => { const [i, j] = G.celda(x, z); return G.libre(i, j) && G.libre(i + 1, j) && G.libre(i - 1, j) && G.libre(i, j + 1) && G.libre(i, j - 1); };
    const caja = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z), fundir = l => THREE.mergeGeometries(l);
    const inst = (geom, mat, items, nom, sombra) => {
      if (!items.length) return null; const im = new THREE.InstancedMesh(geom, mat, items.length);
      items.forEach((o, i) => { q.setFromAxisAngle(eje, o.ry || 0); esc.set(o.sx || 1, o.sy || 1, o.sz || 1); m4.compose(v3.set(o.x, o.y || 0, o.z), q, esc); im.setMatrixAt(i, m4); if (o.c !== undefined) { cc.set(o.c); im.setColorAt(i, cc); } });
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.userData = { detalle: nom }; im.castShadow = !!sombra && alta; im.receiveShadow = alta; W.add(im); return im;
    };
    const mat = (color, o) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.8 }, o || {}));
    const blanco = mat(0xffffff);
    // Rejilla de segmentos de calle para saber lo cerca que está cada cosa de una calle
    const SG = new Map(), CEL = 40, kc = (i, j) => i + ',' + j;
    X.C.forEach(cl => { if (cl.k > 5) return; for (let i = 0; i + 1 < cl.p.length; i++) { const a = cl.p[i], b = cl.p[i + 1], s = { a, b, k: cl.k, w: ANCHO[cl.k] }; const i0 = Math.floor(Math.min(a[0], b[0]) / CEL), i1 = Math.floor(Math.max(a[0], b[0]) / CEL), j0 = Math.floor(Math.min(a[1], b[1]) / CEL), j1 = Math.floor(Math.max(a[1], b[1]) / CEL); for (let ii = i0; ii <= i1; ii++) for (let jj = j0; jj <= j1; jj++) { const k = kc(ii, jj); if (!SG.has(k)) SG.set(k, []); SG.get(k).push(s); } } });
    // distancia al borde de la calzada más cercana (y su segmento)
    const calleCerca = (x, z) => { const i = Math.floor(x / CEL), j = Math.floor(z / CEL); let mejor = 1e9, seg = null; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const L = SG.get(kc(i + a, j + b)); if (!L) continue; for (const s of L) { const d = dSeg(x, z, s.a, s.b) - (s.k === 5 ? 0 : s.w / 2); if (d < mejor) { mejor = d; seg = s; } } } return { d: mejor, seg }; };
    const usados = new Map(), gc = (x, z) => Math.round(x / 2.4) + ',' + Math.round(z / 2.4), ocupa = (x, z) => usados.set(gc(x, z), 1), ocupado = (x, z) => { for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (usados.has(gc(x + a * 2.4, z + b * 2.4))) return true; return false; };
    (S.zonas || []).forEach(z => ocupa(z.obj.position.x, z.obj.position.z)); (S.arbolesPos || []).forEach(a => ocupa(a[0], a[1]));
    const bloquea = (x, z, r) => G.bloquea(x - r, z - r, x + r, z + r);

    // ---------- Edificios ----------
    const balcones = [], rejas = [], toldos = [], puertas = [], aires = [], tanques = [], antenas = [], chimeneas = [], corn = { P: [], N: [], C: [], I: [] };
    const sorted = B.filter(b => b.h && b !== roles.pabellon).sort((a, b) => a.dc - b.dc), CAPB = alta ? 2600 : 1200;
    sorted.forEach(b => {
      const p = b.p, shop = b.cl === 2 || b.cl === 12 || b.cl === 11, fr = I.frente(b, X); let u = 0;
      const clar = b.col.clone().lerp(new THREE.Color('#ffffff'), 0.45);
      for (let i = 0; i < p.length; i++) {
        const a = p[i], e = p[(i + 1) % p.length], l = Math.hypot(e[0] - a[0], e[1] - a[1]); if (l < 0.25) continue;
        const ux = (e[0] - a[0]) / l, uz = (e[1] - a[1]) / l, nx = uz, nz = -ux, mx = (a[0] + e[0]) / 2, mz = (a[1] + e[1]) / 2, da = calleCerca(mx + nx * 2.5, mz + nz * 2.5).d, cara = da < 16, ry = Math.atan2(nx, nz), u0 = u; u += l;
        // cornisa
        if (!b.gable && b.lv >= 2 && l > 2) { const h = b.h, o = 0.3, C = corn, v = C.P.length / 3, y0 = h - 0.32, y1 = h + 0.12;
          C.P.push(a[0] + nx * o, y0, a[1] + nz * o, e[0] + nx * o, y0, e[1] + nz * o, e[0] + nx * o, y1, e[1] + nz * o, a[0] + nx * o, y1, a[1] + nz * o, a[0], y1, a[1], e[0], y1, e[1]);
          for (let k = 0; k < 4; k++) C.N.push(nx, 0, nz); C.N.push(0, 1, 0, 0, 1, 0); for (let k = 0; k < 6; k++) C.C.push(clar.r, clar.g, clar.b); C.I.push(v, v + 1, v + 2, v, v + 2, v + 3, v + 3, v + 2, v + 5, v + 3, v + 5, v + 4); }
        // balcones: una vez por cada hueco de ventana (cada 3 m) y planta
        if (cara && l >= 5 && (b.cl === 1 || b.cl === 0 || b.cl === 8) && b.lv >= 3 && b.estilo !== 2 && balcones.length < CAPB) {
          for (let s = ((1.5 - (u0 % 3)) + 3) % 3; s < l - 0.9; s += 3) { if (s < 0.9) continue; const hs = U.hash(club.id + b.i + 'b' + i + Math.round(s)); if (hs % 5 > 2) continue;
            for (let f = 1; f < b.lv; f++) { if (b.rol && f < 2) continue; const y = (shop ? 3.4 + (f - 1) * 3.1 : f * 3.1) + 0.8; if (y > b.h - 1.2) continue; if (balcones.length >= CAPB) break; const o = { x: a[0] + ux * s, y, z: a[1] + uz * s, ry }; balcones.push(Object.assign({ c: b.col.clone().lerp(new THREE.Color('#cfc9bd'), 0.6).getHex() }, o)); rejas.push(Object.assign({ c: ['#2b2f33', '#3a4a3f', '#4a3b2f'][hs % 3] }, o)); } }
        }
      }
      // frente: toldo o puerta
      if (fr && fr.d < 16) {
        const ry = Math.atan2(fr.nx, fr.nz);
        if (shop && !b.rol && fr.l >= 3.5) toldos.push({ x: fr.mx + fr.nx * 0.02, y: 2.55, z: fr.mz + fr.nz * 0.02, ry, sx: Math.min(fr.l * 0.8, 5.5), c: TOLDOS[U.hash(club.id + b.i + 't') % TOLDOS.length] });
        else if (!b.rol && (b.cl === 1 || b.cl === 0 || b.cl === 8 || b.cl === 3) && fr.l >= 4 && b.lv >= 2 && !b.puerta) puertas.push({ x: fr.mx + fr.nx * 0.03, y: 0, z: fr.mz + fr.nz * 0.03, ry, c: PUERTAS[U.hash(club.id + b.i + 'p') % PUERTAS.length] });
      }
      // azotea
      if (b.gable) { if (rr() < 0.5) { const g = b.gable; chimeneas.push({ x: b.cx + g.ux * (rr() - 0.5) * 3, y: b.h + g.rh * 0.55, z: b.cz + g.uz * (rr() - 0.5) * 3, c: '#8a4b3a' }); } }
      else if (b.cl !== 7) {
        const nA = Math.min(4, 1 + Math.floor(b.ar / 90)), [x0, z0, x1, z1] = b.bb;
        for (let k = 0, t = 0; k < nA && t < 14; t++) { const x = x0 + rr() * (x1 - x0), z = z0 + rr() * (z1 - z0); if (!pip(x, z, p) || !pip(x + 1.2, z, p) || !pip(x - 1.2, z, p) || !pip(x, z + 1.2, p) || !pip(x, z - 1.2, p)) continue; k++; aires.push({ x, y: b.h + 0.25, z, ry: rr() * 3, sx: 0.8 + rr() * 0.6, c: ['#c9cdd0', '#aeb4b9', '#dedfd9'][k % 3] }); }
        if (b.ar > 260 && rr() < 0.3 && b.cl !== 10) tanques.push({ x: b.cx, y: b.h + 0.8, z: b.cz, c: '#8d99a3' });
        if (rr() < 0.4 && (b.cl === 1 || b.cl === 0) && b.lv >= 3) antenas.push({ x: b.cx + (rr() - 0.5) * 2, y: b.h, z: b.cz + (rr() - 0.5) * 2, ry: rr() * 6, c: '#6b7078' });
      }
    });
    const balcon = fundir([caja(1.7, 0.12, 0.75, 0, 0, 0.375)]), reja = fundir([caja(1.7, 0.05, 0.05, 0, 0.95, 0.72), caja(1.7, 0.04, 0.04, 0, 0.5, 0.72), caja(0.05, 0.95, 0.05, -0.82, 0.47, 0.72), caja(0.05, 0.95, 0.05, 0.82, 0.47, 0.72), caja(0.05, 0.95, 0.05, 0, 0.47, 0.72), caja(0.05, 0.95, 0.75, -0.82, 0.47, 0.37), caja(0.05, 0.95, 0.75, 0.82, 0.47, 0.37)]);
    inst(balcon, blanco, balcones, 'balcones'); inst(reja, blanco, rejas, 'rejas');
    { const g = new THREE.BoxGeometry(1, 0.08, 1.3).translate(0, 0, 0.65); g.rotateX(0.3); inst(g, mat(0xffffff, { side: THREE.DoubleSide }), toldos, 'toldos'); }
    { const p = fundir([caja(1.5, 2.3, 0.1, 0, 1.15, 0.05), caja(1.8, 0.16, 0.3, 0, 2.38, 0.15)]); inst(p, blanco, puertas, 'portales'); }
    inst(fundir([caja(0.9, 0.55, 0.5, 0, 0, 0), caja(0.7, 0.4, 0.04, 0, 0, 0.27)]), blanco, aires, 'aires');
    inst(new THREE.CylinderGeometry(0.85, 0.85, 1.5, 12), blanco, tanques, 'depositos');
    inst(fundir([new THREE.CylinderGeometry(0.03, 0.03, 3.2, 5).translate(0, 1.6, 0), caja(1.1, 0.03, 0.03, 0, 2.7, 0), caja(0.8, 0.03, 0.03, 0, 2.2, 0)]), blanco, antenas, 'antenas');
    inst(caja(0.55, 1.2, 0.55, 0, 0.6, 0), blanco, chimeneas, 'chimeneas');
    if (corn.P.length) { const me = new THREE.Mesh(I.geo(corn.P, corn.I, corn.N, null, corn.C), c.mTecho); me.userData = { real: 'cornisas' }; me.receiveShadow = alta; W.add(me); }

    // ---------- Urbanismo: cruces, semáforos, bordillos, asfalto ----------
    const nodos = new Map(), kn = (x, z) => Math.round(x / 1.4) + ',' + Math.round(z / 1.4);
    X.C.forEach(cl => { if (cl.k > 5) return; for (let i = 0; i < cl.p.length; i++) { const k = kn(cl.p[i][0], cl.p[i][1]); let n = nodos.get(k); if (!n) nodos.set(k, n = { x: cl.p[i][0], z: cl.p[i][1], seg: [] });
      for (const j of [i - 1, i + 1]) { if (j < 0 || j >= cl.p.length) continue; const d = Math.hypot(cl.p[j][0] - cl.p[i][0], cl.p[j][1] - cl.p[i][1]); if (d < 1) continue; n.seg.push({ dx: (cl.p[j][0] - cl.p[i][0]) / d, dz: (cl.p[j][1] - cl.p[i][1]) / d, k: cl.k, w: ANCHO[cl.k], len: d }); } } });
    const cebra = { P: [], N: [], I: [] }, cebraPaso = (x, z, dx, dz, w) => {
      const px = -dz, pz = dx, v0 = cebra.P.length / 3; void v0;
      for (let t = -w / 2 + 0.55; t <= w / 2 - 0.45; t += 1.0) { const cx = x + px * t, cz = z + pz * t, v = cebra.P.length / 3; cebra.P.push(cx - dx * 1.3 - px * 0.25, 0, cz - dz * 1.3 - pz * 0.25, cx + dx * 1.3 - px * 0.25, 0, cz + dz * 1.3 - pz * 0.25, cx + dx * 1.3 + px * 0.25, 0, cz + dz * 1.3 + pz * 0.25, cx - dx * 1.3 + px * 0.25, 0, cz - dz * 1.3 + pz * 0.25); for (let k = 0; k < 4; k++) cebra.N.push(0, 1, 0); cebra.I.push(v, v + 2, v + 1, v, v + 3, v + 2); }
    };
    const semaforos = []; let nz = 0;
    nodos.forEach(n => {
      if (n.seg.length < 3 || Math.hypot(n.x, n.z) > R - 12) return; const grandes = n.seg.filter(s => s.k <= 4), wmax = Math.max(...grandes.map(s => s.w), 0); if (grandes.length < 3 && !(grandes.length >= 2 && n.seg.length >= 3)) return;
      const vistas = []; n.seg.forEach(s => { if (s.k > 4 || s.len < 12) return; if (vistas.some(v => v.dx * s.dx + v.dz * s.dz > 0.92)) return; vistas.push(s); });
      vistas.forEach((s, ai) => {
        const d = Math.max(wmax, s.w) / 2 + 2.6; if (cebra.P.length < 4 * 3 * 4200) cebraPaso(n.x + s.dx * d, n.z + s.dz * d, s.dx, s.dz, s.w);
        if (wmax >= 8 && grandes.length >= 3 && ai < 3 && vistas.length >= 3) { const px = -s.dz, pz = s.dx, x = n.x + s.dx * (d + 1.6) + px * (s.w / 2 + 0.9), z = n.z + s.dz * (d + 1.6) + pz * (s.w / 2 + 0.9); if (libre(x, z) && !ocupado(x, z)) { semaforos.push({ x, z, fase: (nz + ai) % 2, ry: Math.atan2(-s.dx, -s.dz), ax: -s.dx, az: -s.dz }); ocupa(x, z); bloquea(x, z, 0.25); } }
      }); nz++;
    });
    X.PT.forEach(p => { if (p.t !== 2) return; const cs = calleCerca(p.x, p.z); if (!cs.seg || cs.d > 4 || cs.seg.k > 4) return; const dx = cs.seg.b[0] - cs.seg.a[0], dz = cs.seg.b[1] - cs.seg.a[1], l = Math.hypot(dx, dz) || 1; cebraPaso(p.x, p.z, dx / l, dz / l, cs.seg.w); });
    if (cebra.P.length) { const m = mat(0xf1efe8, { roughness: 0.8, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }), me = I.malla(cebra, m, 'cebras'); if (me) { me.receiveShadow = false; W.add(me); } }
    // semáforos: poste y cabeza con luces que cambian (dos fases)
    if (semaforos.length) {
      const mP = mat(0x2a2f35), mH = mat(0x15181b), verde = [0, 1].map(() => mat(0x1a3a22, { emissive: 0x22e070, emissiveIntensity: 0 })), roja = [0, 1].map(() => mat(0x3a1a1a, { emissive: 0xff3030, emissiveIntensity: 0 }));
      semaforos.forEach(s => { const g = new THREE.Group(); g.position.set(s.x, 0, s.z); g.rotation.y = s.ry; const po = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.4, 8).translate(0, 1.7, 0), mP), ca = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 0.28).translate(0, 3.3, 0), mH), r = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6).translate(0, 3.55, 0.15), roja[s.fase]), v = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6).translate(0, 3.1, 0.15), verde[s.fase]); g.add(po, ca, r, v); g.userData = { semaforo: true }; W.add(g); });
      S.semaforos = semaforos; S.puebloAnim = S.puebloAnim || []; S.puebloAnim.push(t => { const f = (t % 24) < 12 ? 0 : 1; S.semFase = f; for (let k = 0; k < 2; k++) { const on = k === f; verde[k].emissiveIntensity = on ? 2.4 : 0; roja[k].emissiveIntensity = on ? 0 : 2.4; } });
    }
    // bordillos de granito a los dos lados de la calzada, parches y alcantarillas en el asfalto
    const desplazar = (p, d) => p.map((pt, i) => { const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)]; let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l; return [pt[0] - tz * d, pt[1] + tx * d]; });
    { const BO = I.nuevo(), PA = I.nuevo(), PB = I.nuevo(), AL = I.nuevo();
      X.C.forEach(cl => { if (cl.k > 4 || cl.p.length < 2) return; const w = ANCHO[cl.k]; I.cinta(desplazar(cl.p, w / 2 + 0.14), 0.3, 0, BO); I.cinta(desplazar(cl.p, -(w / 2 + 0.14)), 0.3, 0, BO);
        let acum = 0; for (let i = 0; i + 1 < cl.p.length; i++) { const a = cl.p[i], b = cl.p[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 2) continue; const ux = (b[0] - a[0]) / l, uz = (b[1] - a[1]) / l;
          for (let s = 6 + (acum % 20); s < l - 3; s += 20 + rr() * 16) { const off = (rr() - 0.5) * (w - 2.4), len = 1.8 + rr() * 3, wd = 0.9 + rr() * 1.5, x = a[0] + ux * s - uz * off, z = a[1] + uz * s + ux * off, T = rr() < 0.55 ? PA : PB; if (Math.hypot(x, z) > R - 10) continue; I.cinta([[x - ux * len / 2, z - uz * len / 2], [x + ux * len / 2, z + uz * len / 2]], wd, 0, T); }
          for (let s = 12 + (acum % 30); s < l - 4; s += 38 + rr() * 30) { const off = (rr() - 0.5) * (w - 3), x = a[0] + ux * s - uz * off, z = a[1] + uz * s + ux * off; if (Math.hypot(x, z) > R - 10) continue; for (let k = 0, v0 = AL.P.length / 3; k < 10; k++) { AL.P.push(x + Math.cos(k / 10 * 6.283) * 0.34, 0, z + Math.sin(k / 10 * 6.283) * 0.34); AL.N.push(0, 1, 0); if (k > 1) AL.I.push(v0, v0 + k, v0 + k - 1); } }
          acum += l; } });
      const deco = (m, n) => { m.polygonOffset = true; m.polygonOffsetFactor = -n; m.polygonOffsetUnits = -n; m.side = THREE.DoubleSide; return m; };
      [[BO, deco(mat(0x9a9a95, { roughness: 0.9 }), 4.4), 'bordillos'], [PA, deco(mat(0x303337, { roughness: 1 }), 4), 'parches'], [PB, deco(mat(0x3c4045, { roughness: 1 }), 4), 'parches'], [AL, deco(mat(0x25282b, { roughness: 0.6, metalness: 0.5 }), 4.2), 'alcantarillas']].forEach(([A, m, n]) => { const me = I.malla(A, m, n); if (me) { me.receiveShadow = false; W.add(me); } });
    }

    // ---------- Mobiliario urbano ----------
    const base = (S.paseoBase || []).slice().sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1])), bancos = [], papeleras = [], bolardos = [], hidrantes = [], contenedores = [];
    const mirar = (x, z) => { const cs = calleCerca(x, z); if (!cs.seg) return null; const s = cs.seg, dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1], l = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - s.a[0]) * dx + (z - s.a[1]) * dz) / l)), px = s.a[0] + dx * t - x, pz = s.a[1] + dz * t - z, d = Math.hypot(px, pz) || 1; return { ry: Math.atan2(px / d, pz / d), k: s.k, d: cs.d }; };
    base.forEach((p, i) => {
      if (ocupado(p[0], p[1]) || !libre(p[0], p[1])) return; const m = mirar(p[0], p[1]); if (!m) return; const h = U.hash(club.id + 'mob' + i) % 100;
      if (h < 9 && bancos.length < 120 && m.k !== 1) { bancos.push({ x: p[0], z: p[1], ry: m.ry, c: ['#5a4630', '#3a3f45', '#6b4a2f'][h % 3] }); ocupa(p[0], p[1]); bloquea(p[0], p[1], 0.8); }
      else if (h < 16 && papeleras.length < 120) { papeleras.push({ x: p[0], z: p[1], c: ['#2f4f3a', '#3a3f45', '#4a4f55'][h % 3] }); ocupa(p[0], p[1]); bloquea(p[0], p[1], 0.3); }
      else if (h < 19 && hidrantes.length < 28) { hidrantes.push({ x: p[0], z: p[1] }); ocupa(p[0], p[1]); bloquea(p[0], p[1], 0.3); }
      else if (h < 23 && contenedores.length < 60 && m.k >= 3) { for (let k = 0; k < 3; k++) { const ox = p[0] + Math.cos(m.ry + 1.57) * (k - 1) * 1.25, oz = p[1] - Math.sin(m.ry + 1.57) * (k - 1) * 1.25; contenedores.push({ x: ox, z: oz, ry: m.ry, c: ['#2e6b3a', '#d4a017', '#2f6f9e'][k] }); bloquea(ox, oz, 0.6); } ocupa(p[0], p[1]); }
    });
    X.PT.forEach(p => { if (ocupado(p.x, p.z) || !libre(p.x, p.z)) return; const m = mirar(p.x, p.z); if (p.t === 4) bancos.push({ x: p.x, z: p.z, ry: m ? m.ry : 0, c: '#5a4630' }); else if (p.t === 5) papeleras.push({ x: p.x, z: p.z, c: '#2f4f3a' }); else return; ocupa(p.x, p.z); });
    inst(fundir([caja(1.6, 0.06, 0.45, 0, 0.45, 0), caja(1.6, 0.4, 0.05, 0, 0.78, -0.2), caja(0.06, 0.45, 0.4, -0.7, 0.22, 0), caja(0.06, 0.45, 0.4, 0.7, 0.22, 0)]), blanco, bancos, 'bancos', true);
    inst(fundir([new THREE.CylinderGeometry(0.22, 0.2, 0.9, 10).translate(0, 0.45, 0), new THREE.CylinderGeometry(0.25, 0.25, 0.06, 10).translate(0, 0.93, 0)]), blanco, papeleras, 'papeleras', true);
    inst(fundir([new THREE.CylinderGeometry(0.1, 0.12, 0.7, 8).translate(0, 0.35, 0), new THREE.SphereGeometry(0.1, 8, 6).translate(0, 0.72, 0)]), mat(0xc0392b), hidrantes, 'hidrantes', true);
    inst(caja(1.1, 1.15, 0.9, 0, 0.58, 0), blanco, contenedores, 'contenedores', true);
    // bolardos a los lados de cada paso de peatones (dos por borde de calzada)
    { const dx = [], zs = []; void dx; void zs; nodos.forEach(n => { if (n.seg.length < 3 || bolardos.length > 260 || Math.hypot(n.x, n.z) > R - 14) return; n.seg.forEach(s => { if (s.k > 4 || s.len < 12) return; const d = s.w / 2 + 3.1; for (const lado of [-1, 1]) { const x = n.x + s.dx * d - s.dz * (s.w / 2 + 0.5) * lado, z = n.z + s.dz * d + s.dx * (s.w / 2 + 0.5) * lado; if (libre(x, z) && !ocupado(x, z) && bolardos.length < 260) { bolardos.push({ x, z }); bloquea(x, z, 0.15); } } }); }); }
    inst(new THREE.CylinderGeometry(0.07, 0.08, 0.8, 8).translate(0, 0.4, 0), mat(0x4a4f55, { metalness: 0.4 }), bolardos, 'bolardos');
    // marquesinas de autobús: las paradas reales o, si no hay, cada 150 m por las calles grandes
    { let pun = X.PT.filter(p => p.t === 0).map(p => [p.x, p.z]); if (pun.length < 3) pun = base.filter(pp => { const m = mirar(pp[0], pp[1]); return m && m.k <= 3 && Math.hypot(pp[0], pp[1]) < 230; }).filter((pp, i, A) => A.slice(0, i).every(o => Math.hypot(o[0] - pp[0], o[1] - pp[1]) > 130)).slice(0, 8);
      const cristal = mat(0xbfdcee, { transparent: true, opacity: 0.35, roughness: 0.1 }), met = mat(0x2a2f35, { metalness: 0.5 });
      const marquesina = (x, z, ryCalle) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ryCalle + Math.PI; const t = new THREE.Mesh(new THREE.BoxGeometry(3, 0.08, 1.4).translate(0, 2.5, 0), met), f = new THREE.Mesh(new THREE.BoxGeometry(3, 2.2, 0.04).translate(0, 1.3, -0.65), cristal), b = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.4).translate(0, 0.5, -0.4), met); g.add(t, f, b); for (const sx of [-1.45, 1.45]) g.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.5, 0.06).translate(sx, 1.25, 0.6), met)); g.userData = { marquesina: true }; W.add(g); bloquea(x, z, 1.4); (S.paradas = S.paradas || []).push([x, z]); };
      S.crearMarquesina = marquesina;
      pun.slice(0, 14).forEach(([x, z]) => { if (!libre(x, z) || (S.zonas || []).some(zz => Math.hypot(zz.obj.position.x - x, zz.obj.position.z - z) < 5.5)) return; const m = mirar(x, z); if (!m) return; marquesina(x, z, m.ry); }); }
    // coches aparcados a los lados de las calles pequeñas y en los aparcamientos reales
    const carroceria = fundir([caja(1.8, 0.55, 4.3, 0, 0.55, 0), caja(1.55, 0.5, 2.3, 0, 1.08, -0.2), caja(1.82, 0.12, 0.3, 0, 0.35, 1.9), caja(1.82, 0.12, 0.3, 0, 0.35, -1.9)]);
    const aparcados = [], tope = alta ? 300 : 150;
    X.C.forEach(cl => { if (cl.k < 3 || cl.k > 6) return; const w = ANCHO[cl.k]; if (w < 4) return; let acum = 0;
      for (let i = 0; i + 1 < cl.p.length && aparcados.length < tope; i++) { const a = cl.p[i], b = cl.p[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 8) continue; const ux = (b[0] - a[0]) / l, uz = (b[1] - a[1]) / l;
        for (let s = 5 + (acum % 6); s < l - 5; s += 6.2) { const lado = U.hash(club.id + 'ap' + Math.round(a[0] + s)) % 2 ? 1 : -1, off = w / 2 - 0.55, x = a[0] + ux * s - uz * off * lado, z = a[1] + uz * s + ux * off * lado; if ((U.hash(club.id + 'pk' + Math.round(x * 3) + Math.round(z * 3)) % 100) > 48 || Math.hypot(x, z) > R - 12 || aparcados.length >= tope) continue;
          let cerca = false; nodos.forEach(n => { if (!cerca && n.seg.length >= 3 && Math.abs(n.x - x) < 9 && Math.abs(n.z - z) < 9) cerca = true; }); if (cerca || ocupado(x, z) && false) continue; if ((S.zonas || []).some(zz => Math.hypot(zz.obj.position.x - x, zz.obj.position.z - z) < 4)) continue;
          aparcados.push({ x, z, ry: Math.atan2(ux, uz), c: COLORES_COCHE[(Math.abs(Math.round(x * 7 + z * 3))) % COLORES_COCHE.length] }); bloquea(x, z, 1.1); }
        acum += l; } });
    X.K.forEach(k => { const pts = k.p; let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; pts.forEach(pp => { x0 = Math.min(x0, pp[0]); x1 = Math.max(x1, pp[0]); z0 = Math.min(z0, pp[1]); z1 = Math.max(z1, pp[1]); });
      let li = 0, ml = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l > ml) { ml = l; li = i; } } const a0 = pts[li], b0 = pts[(li + 1) % pts.length], ux = (b0[0] - a0[0]) / ml, uz = (b0[1] - a0[1]) / ml;
      for (let s = 2.7; s < ml; s += 2.7) for (let t = 3; t < 160; t += 5.3) { const x = a0[0] + ux * s - uz * t, z = a0[1] + uz * s + ux * t; if (!pip(x, z, pts) || !pip(x + ux * 1.5, z + uz * 1.5, pts) || !pip(x - uz * 2.2, z + ux * 2.2, pts) || aparcados.length >= tope + 500) continue; if (U.hash(club.id + 'pa' + Math.round(x * 3) + Math.round(z * 3)) % 100 > 62) continue; aparcados.push({ x, z, ry: Math.atan2(-uz, ux), c: COLORES_COCHE[(Math.abs(Math.round(x * 5 + z))) % COLORES_COCHE.length] }); bloquea(x, z, 1.2); } });
    inst(carroceria, blanco, aparcados, 'aparcados', true);

    // ---------- Menos vacío: patios, usos del suelo, vallas, vías, árboles reales ----------
    const verde = I.suelo('Grass004', { escala: 3, tinte: 0xa9c692 }, 0x6f9a4a, 1.8), tierra = I.suelo('Ground054', { escala: 1.1, tinte: 0xb09a80 }, 0x8a7458, 1.8), grava = I.suelo('Ground054', { escala: 1.3, tinte: 0xd9cdb2 }, 0xcdbd9d, 1.8), indus = I.suelo('Concrete034', { color: true, escala: 2.2, tinte: 0x77746e }, 0x6d6a64, 1.8), bosque = I.suelo('Grass004', { escala: 3, tinte: 0x7fa070 }, 0x4f7f3a, 1.8);
    const arbExtra = [], arbustos = [], AVd = I.nuevo(), ATi = I.nuevo(), AGr = I.nuevo(), AIn = I.nuevo(), ABo = I.nuevo();
    const blob = (x, z, r, A) => { const n = 9, p = []; for (let k = 0; k < n; k++) { const a = k / n * 6.283, rad = r * (0.72 + rr() * 0.5); p.push([x + Math.cos(a) * rad, z + Math.sin(a) * rad]); } I.rellenar(p, 0, A); };
    X.U.forEach(u => { const A = [AVd, ABo, null, null, null, AIn, AGr, AGr, ATi, ATi][u.t]; if (!A) return; I.rellenar(u.p, 0, A);
      if (u.t === 1 || u.t === 6 || u.t === 0) { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; u.p.forEach(pp => { x0 = Math.min(x0, pp[0]); x1 = Math.max(x1, pp[0]); z0 = Math.min(z0, pp[1]); z1 = Math.max(z1, pp[1]); }); const n = u.t === 1 ? 70 : 24; for (let t = 0, k = 0; t < n * 4 && k < n; t++) { const x = x0 + rr() * (x1 - x0), z = z0 + rr() * (z1 - z0); if (Math.hypot(x, z) < R - 8 && pip(x, z, u.p) && libre(x, z) && arbExtra.length < 900) { arbExtra.push([x, z]); k++; } } } });
    // patios y solares dentro de las manzanas
    const celdas = new Map(); B.forEach(b => { const k = Math.floor(b.cx / 45) + ',' + Math.floor(b.cz / 45); celdas.set(k, (celdas.get(k) || 0) + 1); });
    const vn = (x, z) => { const xi = Math.floor(x / 60), zi = Math.floor(z / 60), fx = x / 60 - xi, fz = z / 60 - zi, h = (i, j) => (U.hash(club.id + 'n' + i + ',' + j) % 1000) / 1000, sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz); return (h(xi, zi) * (1 - sx) + h(xi + 1, zi) * sx) * (1 - sz) + (h(xi, zi + 1) * (1 - sx) + h(xi + 1, zi + 1) * sx) * sz; };
    { const paso = 6.5; let n = 0; const dist = []; for (let z = -R + 10; z < R - 10; z += paso) for (let x = -R + 10; x < R - 10; x += paso) dist.push([x + (rr() - 0.5) * 3, z + (rr() - 0.5) * 3]);
      dist.sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]));
      for (const [x, z] of dist) { if (n > (alta ? 700 : 380)) break; if (Math.hypot(x, z) > R - 12) continue; if (!libre(x, z) || !libre(x + 2.2, z) || !libre(x - 2.2, z) || !libre(x, z + 2.2) || !libre(x, z - 2.2)) continue; const cs = calleCerca(x, z); if (cs.d < ACERA + 3.2 || (cs.seg && cs.seg.k === 5 && cs.d < 14)) continue;
        if (X.P.some(pk => pk.p.length >= 3 && pip(x, z, pk.p)) || X.A.some(pk => pk.p.length >= 3 && pip(x, z, pk.p))) continue;
        const vN = vn(x, z), cerca = [[0, 0], [45, 0], [-45, 0], [0, 45], [0, -45]].reduce((t, [a, b]) => t + (celdas.get(Math.floor((x + a) / 45) + ',' + Math.floor((z + b) / 45)) || 0), 0);
        if (cerca === 0 && rr() > 0.1) continue; if (cerca <= 2 && rr() > 0.4) continue; if (rr() < 0.18) continue;
        const denso = cerca >= 7, r0 = rr(); if (denso && r0 < 0.55) continue;
        const tipo = denso ? (r0 < 0.75 ? 2 : r0 < 0.87 ? 1 : 0) : vN > 0.52 ? 0 : vN > 0.34 ? 2 : 1, h = tipo === 0 ? 10 : tipo === 2 ? 75 : 55;
        if (h < 45) { blob(x, z, 3.4 + rr() * 2.2, AVd); for (let k = 0, m = 1 + (rr() * 3 | 0); k < m; k++) arbustos.push({ x: x + (rr() - 0.5) * 3, y: 0.35, z: z + (rr() - 0.5) * 3, sx: 0.7 + rr() * 0.7, sy: 0.6 + rr() * 0.5, sz: 0.7 + rr() * 0.7 }); if (rr() < 0.3 && arbExtra.length < 900) arbExtra.push([x, z]); }
        else if (h < 70) { blob(x, z, 3.2 + rr() * 2.2, ATi); if (rr() < 0.4) arbustos.push({ x, y: 0.3, z, sx: 0.6, sy: 0.5, sz: 0.6 }); }
        else if (h < 84) { blob(x, z, 3.4 + rr() * 1.6, AGr); if (rr() < 0.5 && aparcados.length < tope + 560) { aparcados.push({ x, z, ry: rr() * 6.28, c: COLORES_COCHE[(Math.abs(Math.round(x + z))) % COLORES_COCHE.length] }); } }
        else continue; n++; }
    }
    [[AVd, verde, 'patios'], [ATi, tierra, 'solares'], [AGr, grava, 'gravas'], [AIn, indus, 'industria'], [ABo, bosque, 'bosques']].forEach(([A, m, nom]) => { const me = I.malla(A, m, nom); if (me) { me.receiveShadow = true; W.add(me); } });
    // árboles reales de OpenStreetMap y los de bosques y patios
    X.T.forEach(t => { if (Math.hypot(t[0], t[1]) < R - 8 && libre(t[0], t[1]) && !ocupado(t[0], t[1]) && arbExtra.length < 1300) { arbExtra.push(t); ocupa(t[0], t[1]); } });
    if (arbExtra.length) { const bos = [], cem = [], res = []; arbExtra.forEach(t => { const u = X.U.find(uu => (uu.t === 1 || uu.t === 6) && pip(t[0], t[1], uu.p)); (u ? (u.t === 1 ? bos : cem) : res).push(t); }); I.plantar(W, G, res, club, alta, rr); I.plantar(W, G, bos, club, alta, rr, club.pais === 'US' || club.pais === 'DE' ? 'pino' : undefined); I.plantar(W, G, cem, club, alta, rr, 'cipres'); }
    inst(new THREE.IcosahedronGeometry(0.8, 0).translate(0, 0.3, 0), GM.kit.viento(mat(0x4f7f3a, { roughness: 1 }), 'copa'), arbustos.map(b => Object.assign({ c: ['#5a8f45', '#6a9c4f', '#4f7f3a', '#78a85a'][Math.floor(rr() * 4)] }, b)), 'arbustos');
    // vallas, setos y muros
    { const FE = { P: [], N: [], I: [] }, SE = { P: [], N: [], I: [] }, MU = { P: [], N: [], I: [] }; let seg = 0;
      X.F.forEach(f => { const A = f.t === 1 ? SE : f.t === 2 ? MU : FE, h = f.t === 1 ? 1.1 : f.t === 2 ? 1.6 : 1.3; for (let i = 0; i + 1 < f.p.length && seg < 700; i++) { const a = f.p[i], b = f.p[i + 1]; if (Math.hypot(a[0], a[1]) > R - 8) continue; const v = A.P.length / 3; A.P.push(a[0], 0, a[1], b[0], 0, b[1], b[0], h, b[1], a[0], h, a[1]); for (let k = 0; k < 4; k++) A.N.push(0, 0, 1); A.I.push(v, v + 1, v + 2, v, v + 2, v + 3); seg++; const l = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let s = 0; s <= l; s += 1.6) bloquea(a[0] + (b[0] - a[0]) * s / (l || 1), a[1] + (b[1] - a[1]) * s / (l || 1), 0.25); } });
      [[FE, mat(0x6b7078, { side: THREE.DoubleSide, transparent: true, opacity: 0.55 }), 'vallas'], [SE, mat(0x3f6e33, { side: THREE.DoubleSide }), 'setos'], [MU, mat(0xcfc7b8, { side: THREE.DoubleSide }), 'muros']].forEach(([A, m, nom]) => { const me = I.malla(A, m, nom); if (me) { me.receiveShadow = alta; W.add(me); } });
    }
    // vías de tren: balasto y dos carriles
    { const BA = I.nuevo(), CA = I.nuevo(); X.V.forEach(v => { if (v.p.length < 2) return; I.cinta(v.p, 3.8, 0, BA); I.cinta(desplazar(v.p, 0.72), 0.1, 0, CA); I.cinta(desplazar(v.p, -0.72), 0.1, 0, CA); });
      const m1 = I.malla(BA, I.suelo('Ground054', { escala: 1.2, tinte: 0x9a948a }, 0x8a847a, 2), 'balasto'), m2 = I.malla(CA, (() => { const m = mat(0x3a3d42, { metalness: 0.6 }); m.side = THREE.DoubleSide; m.polygonOffset = true; m.polygonOffsetFactor = -3; m.polygonOffsetUnits = -3; return m; })(), 'carriles'); [m1, m2].forEach(me => { if (me) { me.receiveShadow = false; W.add(me); } }); }
    // aparcamientos: asfalto del suelo
    { const AP = I.nuevo(); X.K.forEach(k => I.rellenar(k.p, 0, AP)); const me = I.malla(AP, (() => { const m = I.suelo('Asphalt010', { escala: 5, tinte: 0x9a9a9a }, 0x484a4e, 2.2); return m; })(), 'aparcamientos'); if (me) { me.receiveShadow = false; W.add(me); } }
    // los coches aparcados añadidos en patios también cuentan
    // ---------- Comercios con nombre de OpenStreetMap ----------
    { const TIPO = { cafe: ['#6b3a2a', '#ffffff'], bar: ['#5a3b26', '#f2d27a'], pub: ['#2f3a2a', '#f2d27a'], restaurant: ['#7a1a22', '#ffffff'], fast_food: ['#c0392b', '#fff2a8'], bank: ['#1d4f91', '#ffffff'], pharmacy: ['#1f8f5f', '#ffffff'], cinema: ['#7a1a22', '#ffffff'], theatre: ['#4a2a6a', '#ffffff'], supermarket: ['#2e5d3a', '#ffffff'], bakery: ['#c9a36a', '#3a2a1a'], ice_cream: ['#d86a8a', '#ffffff'], fuel: ['#1d4f91', '#ffd23f'], library: ['#2a2f35', '#ffffff'], post_office: ['#e0b020', '#1d2024'] };
      const lista = X.N.filter(n => Math.hypot(n.x, n.z) < R - 20).sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z)); let puestos = 0;
      for (const n of lista) {
        if (puestos >= 110) break; let mejor = null, md = 1e9; for (const b of B) { if (b === roles.pabellon || Math.abs(b.cx - n.x) > 60 || Math.abs(b.cz - n.z) > 60) continue; for (let i = 0; i < b.p.length; i++) { const d = dSeg(n.x, n.z, b.p[i], b.p[(i + 1) % b.p.length]); if (d < md) { md = d; mejor = { b, i }; } } }
        if (!mejor || md > 9 || mejor.b.rol || mejor.b.puerta || mejor.b.rotulo) continue; const b = mejor.b, a = b.p[mejor.i], e = b.p[(mejor.i + 1) % b.p.length], l = Math.hypot(e[0] - a[0], e[1] - a[1]); if (l < 3.2) continue;
        const ux = (e[0] - a[0]) / l, uz = (e[1] - a[1]) / l, nx = uz, nz = -ux, t = Math.max(1.4, Math.min(l - 1.4, (n.x - a[0]) * ux + (n.z - a[1]) * uz)), ancho = Math.min(l - 0.6, 4.6); if (ancho < 2.2) continue;
        if (calleCerca(a[0] + ux * t + nx * 2.5, a[1] + uz * t + nz * 2.5).d > 14) continue;
        const col = TIPO[n.t] || ['#2a2f35', '#ffffff'], txt = n.nom.toUpperCase().slice(0, 22), px = a[0] + ux * t + nx * 0.06, pz = a[1] + uz * t + nz * 0.06, ry = Math.atan2(nx, nz);
        I.cartel(W, M, txt, col[0], col[1], px, b.cl === 2 || b.cl === 12 ? 3.05 : 3.2, pz, ry, ancho); b.rotulo = true; puestos++; if (b.cl === 1 || b.cl === 0) { toldosExtra(px, pz, ry, ancho, b); }
      }
      function toldosExtra(px, pz, ry, ancho, b) { const g = new THREE.BoxGeometry(ancho * 0.9, 0.08, 1.2).translate(0, 0, 0.6); g.rotateX(0.3); const m = new THREE.Mesh(g, mat(TOLDOS[U.hash(club.id + b.i + 'x') % TOLDOS.length], { side: THREE.DoubleSide })); m.position.set(px + Math.sin(ry) * 0.02, 2.5, pz + Math.cos(ry) * 0.02); m.rotation.y = ry; m.userData = { toldo: true }; W.add(m); }
    }
    // Monumentos, fuentes y esculturas con nombre: pedestal con su placa
    { const MON = { monument: 1, memorial: 1, statue: 1, attraction: 1, artwork: 1, fountain: 1, city_gate: 1, ruins: 1, wayside_cross: 1, archaeological_site: 1, castle: 1, viewpoint: 1 };
      const piedra = mat(0xbdb6a6, { roughness: 0.9 }), oscuro = mat(0x6e675c, { roughness: 0.8 }), agua = GM.arquitectura && GM.arquitectura.agua ? GM.arquitectura.agua({ color: 0x4f94b0, opacidad: 0.9 }) : mat(0x4f94b0, { roughness: 0.1 });
      X.N.filter(n => MON[n.t] && Math.hypot(n.x, n.z) < R - 15).sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z)).slice(0, 16).forEach(n => {
        if (B.some(b => b.bb[0] < n.x && b.bb[2] > n.x && b.bb[1] < n.z && b.bb[3] > n.z && pip(n.x, n.z, b.p))) return;
        let x = n.x, z = n.z; if (!libre(x, z)) { let ok = false; for (let r = 1.5; r <= 6 && !ok; r += 1.5) for (let a = 0; a < 6.28 && !ok; a += 0.8) { const px = n.x + Math.cos(a) * r, pz = n.z + Math.sin(a) * r; if (libre(px, pz)) { x = px; z = pz; ok = true; } } if (!ok) return; }
        const g = new THREE.Group(); g.position.set(x, 0, z); const h = U.hash(club.id + n.nom) % 3;
        if (n.t === 'fountain') { const b = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2, 0.6, 20).translate(0, 0.3, 0), piedra), w = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.05, 20).translate(0, 0.58, 0), agua), c = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.6, 8).translate(0, 1.2, 0), piedra); g.add(b, w, c); }
        else if (h === 0) { g.add(new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 1.8).translate(0, 0.45, 0), piedra), new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 4.6, 4).translate(0, 3.2, 0), piedra), new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 4).translate(0, 5.85, 0), oscuro)); }
        else if (h === 1) { g.add(new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 1.4).translate(0, 0.55, 0), piedra), new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 1.3, 4, 8).translate(0, 2.2, 0), oscuro)); }
        else { g.add(new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 0.5, 12).translate(0, 0.25, 0), piedra), new THREE.Mesh(new THREE.TorusKnotGeometry(0.7, 0.2, 40, 6).translate(0, 1.7, 0), oscuro)); }
        g.userData = { monumento: n.nom }; W.add(g); bloquea(x, z, 1.5); ocupa(x, z);
        I.cartel(W, M, n.nom.toUpperCase().slice(0, 24), '#3a3f45', '#ffffff', x, 0.95, z + 1.4, 0, 2.2);
      }); }
    // ---------- El anillo lejano: de 300 a 480 m, solo volumen (sin colisión), para que la ciudad no acabe en seco ----------
    if (X.L) {
      const L = X.L, pal = (c.PALETA || []).length ? c.PALETA : [new THREE.Color('#d8d0c0')], PW = [], PI = [], PN = [], PC = [], RP = [], RI = [], RN = [], RC = [];
      L.e.forEach((e, k) => { const lv = e[0] || 2 + (U.hash(club.id + 'rg' + k) % 5), h = lv * 3.1 + 0.4, p = []; for (let i = 1; i + 1 < e.length; i += 2) p.push([e[i], e[i + 1]]); if (p.length < 3) return;
        let sA = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; sA += a[0] * b[1] - b[0] * a[1]; } if (sA < 0) p.reverse();
        const col = pal[U.hash(club.id + 'rc' + k) % pal.length].clone().multiplyScalar(0.92), rf = new THREE.Color('#6a6661');
        for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 0.4) continue; const nx = (b[1] - a[1]) / l, nz = -(b[0] - a[0]) / l, v = PW.length / 3; PW.push(a[0], 0, a[1], b[0], 0, b[1], b[0], h, b[1], a[0], h, a[1]); for (let j = 0; j < 4; j++) { PN.push(nx, 0, nz); PC.push(col.r, col.g, col.b); } PI.push(v, v + 1, v + 2, v, v + 2, v + 3); }
        const vv = p.map(q => new THREE.Vector2(q[0], q[1])), tri = THREE.ShapeUtils.triangulateShape(vv, []), b0 = RP.length / 3; vv.forEach(q => { RP.push(q.x, h, q.y); RN.push(0, 1, 0); RC.push(rf.r, rf.g, rf.b); }); tri.forEach(t => RI.push(b0 + t[0], b0 + t[1], b0 + t[2])); });
      const mAn = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide }), mk = (P, I2, N, C2, nom) => { if (!P.length) return; const me = new THREE.Mesh(I.geo(P, I2, N, null, C2), mAn); me.userData = { anillo: nom }; me.receiveShadow = false; W.add(me); };
      mk(PW, PI, PN, PC, 'muros'); mk(RP, RI, RN, RC, 'tejados');
      const calles = I.nuevo(), agua = I.nuevo(), verde = I.nuevo(), tren = I.nuevo(), sub = a => { const p = []; for (let i = 1; i + 1 < a.length; i += 2) p.push([a[i], a[i + 1]]); return p; };
      L.c.forEach(cl => { const p = []; for (let i = 1; i + 1 < cl.length; i += 2) p.push([cl[i], cl[i + 1]]); if (p.length > 1) I.cinta(p, ANCHO[cl[0]] + 2, 0, calles); });
      L.a.forEach(a => { const p = []; for (let i = 1; i + 1 < a.length; i += 2) p.push([a[i], a[i + 1]]); if (a[0] === 1 && p.length >= 3) I.rellenar(p, 0, agua); else if (p.length >= 2) I.cinta(p, 9, 0, agua); });
      L.p.forEach(a => { const p = []; for (let i = 0; i + 1 < a.length; i += 2) p.push([a[i], a[i + 1]]); if (p.length >= 3) I.rellenar(p, 0, verde); });
      L.v.forEach(a => { const p = []; for (let i = 0; i + 1 < a.length; i += 2) p.push([a[i], a[i + 1]]); if (p.length > 1) I.cinta(p, 3.6, 0, tren); });
      const dec = (m, n) => { m.polygonOffset = true; m.polygonOffsetFactor = -n; m.polygonOffsetUnits = -n; m.side = THREE.DoubleSide; return m; };
      [[calles, dec(mat(0x4a4c50, { roughness: 1 }), 3), -0.01], [agua, dec(mat(0x3f7f9f, { roughness: 0.3 }), 2.4), -0.02], [verde, dec(mat(0x5c8a47, { roughness: 1 }), 1.6), -0.015], [tren, dec(mat(0x7a756c, { roughness: 1 }), 2), -0.012]].forEach(([A, m, y]) => { const me = I.malla(A, m, 'anillo'); if (me) { me.position.y = y; me.receiveShadow = false; W.add(me); } });
      void sub;
    }
    // Banderines con los colores del club cruzando las calles principales cerca del pabellón cuando la afición es alta
    if (c.afi >= 55 && S.vidaAnc && S.vidaAnc.fiesta.length) {
      const pos = [], col = [], cc1 = new THREE.Color(c.c1), cc2 = new THREE.Color(c.c2 === '#ffffff' ? '#f1c40f' : c.c2), polos = [];
      S.vidaAnc.fiesta.forEach(f => { let acum = 0; for (let i = 0; i + 1 < f.p.length; i++) { const a = f.p[i], b = f.p[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 1) continue; const ux = (b[0] - a[0]) / l, uz = (b[1] - a[1]) / l;
        for (let s = 10 - (acum % 18); s < l; s += 18) { if (s < 0) continue; const x = a[0] + ux * s, z = a[1] + uz * s, w = f.w / 2 + 1.2, p0 = [x - uz * w, z + ux * w], p1 = [x + uz * w, z - ux * w]; if (!libre(p0[0], p0[1]) || !libre(p1[0], p1[1])) continue;
          polos.push(p0, p1); for (let k = 0; k < 14; k++) { const t = (k + 0.5) / 14, px = p0[0] + (p1[0] - p0[0]) * t, pz = p0[1] + (p1[1] - p0[1]) * t, y = 6.2 - Math.sin(t * Math.PI) * 1.2, ox = ux * 0.25, oz = uz * 0.25; pos.push(px - ox, y, pz - oz, px + ox, y, pz + oz, px, y - 0.55, pz); const cc = k % 2 ? cc1 : cc2; for (let q = 0; q < 3; q++) col.push(cc.r, cc.g, cc.b); } }
        acum += l; } });
      if (pos.length) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); const me = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })); me.userData = { banderines: true }; W.add(me);
        inst(new THREE.CylinderGeometry(0.07, 0.09, 6.4, 8).translate(0, 3.2, 0), mat(0x2a2f35), polos.map(p => ({ x: p[0], z: p[1] })), 'mastiles'); polos.forEach(p => bloquea(p[0], p[1], 0.25)); }
    }
    S.mapaVec && (S.mapaVec.N = X.N.map(n => ({ t: n.t, nom: n.nom, x: n.x, z: n.z })));
  }
  GM.register('calleRealDetalle', { detallar });
})();
