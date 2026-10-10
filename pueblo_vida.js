/* VIDA Y DETALLES DEL PUEBLO (GM.puebloVida) — fauna, rutinas de los vecinos, mobiliario y noche (lo usa pueblo_mundo.js)
   - Fauna animada por código: golondrinas que dan vueltas al campanario, mariposas, un rebaño de ovejas que pasta en la ladera y
     perros que acompañan a sus dueños.
   - Vecinos con perfil (niños, adultos y mayores) y rutinas según la hora: sentarse en los bancos a charlar, ir a la plaza, a las
     tiendas (algunos entran y salen), a la canasta o dar un paseo; a la hora de la siesta casi todo el mundo se recoge.
   - Mobiliario: bancos de madera con patas de forja curvas, puestos de mercado con toldo de lona y género, rosa de los vientos en el
     adoquinado de la plaza, tapas de alcantarilla, placas con el nombre de cada calle, terraza del bar con mesas, sillas y sombrilla,
     barriles y sacos.
   - Noche: las ventanas encendidas y los faroles brillan según la hora (S.noche, que calcula sede3d.aplicarAmbiente).
   Expone: banco, puestoMercado, rosaPlaza, alcantarillas, cartelCalle, terraza, fauna, nocturno, perfilVecino, siguiente, actualizar, perros. */
(function () {
  const T = THREE, U = GM.util;
  const MATS = {}; const mat = (c, o) => { const k = c + JSON.stringify(o || {}); return MATS[k] || (MATS[k] = new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.9 }, o || {}))); };
  const K = () => GM.casasReal, CV = () => GM.curvas;
  const caja = (G, w, h, d, m, x, y, z, ry) => { const me = new T.Mesh(new T.BoxGeometry(w, h, d), typeof m === 'string' ? mat(m) : m); me.position.set(x, y + h / 2, z); if (ry) me.rotation.y = ry; me.castShadow = true; me.receiveShadow = true; G.add(me); return me; };
  const rn = seed => { let a = (U.hash(String(seed)) >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const hierro = () => mat('#23282d', { roughness: 0.5, metalness: 0.7 });

  // ---------- Mobiliario ----------
  // Banco de madera con respaldo curvo y patas de forja en voluta (mira a +z; ry lo gira)
  function banco(W, x, z, ry) {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry || 0; W.add(g);
    const mad = K() ? K().maderaMat('#7a5230') : mat('#7a5230'), fe = hierro();
    for (let i = 0; i < 4; i++) caja(g, 1.7, 0.035, 0.1, mad, 0, 0.44, -0.2 + i * 0.12);
    for (let i = 0; i < 3; i++) { const r = new T.Mesh(new T.BoxGeometry(1.7, 0.1, 0.03), mad); r.position.set(0, 0.62 + i * 0.13, -0.27 - i * 0.025); r.rotation.x = -0.18; r.castShadow = true; g.add(r); }
    for (const s of [-1, 1]) {
      const cr = new T.CatmullRomCurve3([new T.Vector3(s * 0.78, 0, -0.25), new T.Vector3(s * 0.78, 0.3, -0.24), new T.Vector3(s * 0.78, 0.44, -0.12), new T.Vector3(s * 0.78, 0.44, 0.22), new T.Vector3(s * 0.78, 0.3, 0.3), new T.Vector3(s * 0.78, 0.18, 0.2), new T.Vector3(s * 0.78, 0.2, 0.1)]); g.add(new T.Mesh(new T.TubeGeometry(cr, 14, 0.018, 5), fe));
      const resp = new T.CatmullRomCurve3([new T.Vector3(s * 0.78, 0.44, -0.24), new T.Vector3(s * 0.78, 0.7, -0.28), new T.Vector3(s * 0.78, 0.9, -0.33)]); g.add(new T.Mesh(new T.TubeGeometry(resp, 8, 0.018, 5), fe));
      const bra = new T.Mesh(new T.TorusGeometry(0.1, 0.014, 5, 10, Math.PI * 1.4), fe); bra.rotation.y = Math.PI / 2; bra.position.set(s * 0.78, 0.55, 0.12); g.add(bra);
    }
    return g;
  }
  // Silla de terraza de madera curvada y mesa de pie central
  function silla(W, x, z, ry) {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry || 0; W.add(g); const mad = mat('#5b4330', { roughness: 0.8 });
    caja(g, 0.4, 0.04, 0.4, mad, 0, 0.44, 0); for (const sx of [-0.17, 0.17]) for (const sz of [-0.17, 0.17]) { const p = new T.Mesh(new T.CylinderGeometry(0.012, 0.016, 0.44, 5), mad); p.position.set(sx, 0.22, sz); g.add(p); }
    const resp = new T.Mesh(new T.TorusGeometry(0.2, 0.013, 5, 12, Math.PI), mad); resp.position.set(0, 0.62, -0.2); resp.rotation.x = 0.0; g.add(resp);
    for (const sx of [-0.19, 0.19]) { const p = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.42, 5), mad); p.position.set(sx, 0.64, -0.2); g.add(p); }
    return g;
  }
  function mesa(W, x, z, color) {
    const g = new T.Group(); g.position.set(x, 0, z); W.add(g);
    const pie = CV() ? CV().lathe('mesa-t', [[0.0, 0], [0.22, 0], [0.24, 0.04], [0.06, 0.12], [0.05, 0.7], [0.1, 0.72]], 12, hierro()) : null; if (pie) g.add(pie);
    const tab = new T.Mesh(new T.CylinderGeometry(0.42, 0.42, 0.035, 20), mat(color || '#e8e2d4', { roughness: 0.6 })); tab.position.y = 0.73; tab.castShadow = true; g.add(tab);
    return g;
  }
  // Terraza del bar: tres mesas con sillas, sombrilla de lona con varillas y un par de barriles de roble
  function terraza(W, S, L, r) {
    if (!L) return; const px = -L.fz, pz = L.fx, base = [L.zx + L.fx * 0.9, L.zz + L.fz * 0.9], tabs = [-2.6, 0.2, 3.0];
    tabs.forEach((o, i) => { const x = base[0] + px * o, z = base[1] + pz * o; mesa(W, x, z, '#efe8d8'); const ry = Math.atan2(L.fx, L.fz); silla(W, x - px * 0.6, z - pz * 0.6, ry + Math.PI / 2); silla(W, x + px * 0.6, z + pz * 0.6, ry - Math.PI / 2);
      if (i === 1) { const col = ['#8f2d24', '#2f6f9e'][(r() * 2) | 0], m = new T.Mesh(new T.ConeGeometry(1.5, 0.55, 12), mat(col, { side: T.DoubleSide })); m.position.set(x, 2.45, z); m.castShadow = true; W.add(m); const pa = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 2.5, 6), hierro()); pa.position.set(x, 1.25, z); W.add(pa); for (let k = 0; k < 8; k++) { const vr = new T.Mesh(new T.CylinderGeometry(0.008, 0.008, 1.5, 4), hierro()); vr.position.set(x + Math.cos(k * 0.785) * 0.7, 2.28, z + Math.sin(k * 0.785) * 0.7); vr.rotation.set(Math.sin(k * 0.785) * 1.15, 0, -Math.cos(k * 0.785) * 1.15); W.add(vr); } } });
    for (const o of [-4.9, -4.2]) { const b = CV() ? CV().lathe('barril', [[0.0, 0], [0.26, 0], [0.34, 0.12], [0.38, 0.4], [0.34, 0.72], [0.26, 0.82], [0.0, 0.82]], 14, K() ? K().maderaMat('#6b4a2b') : mat('#6b4a2b')) : null; if (b) { b.position.set(base[0] + px * o, 0, base[1] + pz * o); W.add(b); for (const yy of [0.14, 0.68]) { const aro = new T.Mesh(new T.TorusGeometry(0.34 + (yy > 0.3 && yy < 0.6 ? 0.04 : 0), 0.013, 4, 14).rotateX(Math.PI / 2), hierro()); aro.position.set(b.position.x, yy, b.position.z); W.add(aro); } } }
  }
  // Puesto de mercado: mostrador, toldo de lona con festón, cajas con fruta y verdura, balanza y letrero
  function puestoMercado(W, M, x, z, ry, color, r, idx) {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry || 0; W.add(g);
    const mad = K() ? K().maderaMat('#8a6d3b') : mat('#8a6d3b'), lona = M.textura('lona-' + color, 128, (c, n) => { c.fillStyle = '#f2ecdc'; c.fillRect(0, 0, n, n); c.fillStyle = color; for (let k = 0; k < 8; k += 2) c.fillRect(k * n / 8, 0, n / 8, n); for (let i = 0; i < 300; i++) { c.fillStyle = 'rgba(0,0,0,' + (Math.random() * 0.05) + ')'; c.fillRect(Math.random() * n, Math.random() * n, 2, 2); } });
    const ml = lona ? new T.MeshStandardMaterial({ map: lona, roughness: 1, side: T.DoubleSide }) : mat(color, { side: T.DoubleSide });
    caja(g, 2.2, 0.85, 0.9, mad, 0, 0, 0); caja(g, 2.3, 0.06, 1.0, '#a5845a', 0, 0.85, 0);
    for (const sx of [-1.05, 1.05]) { for (const sz of [-0.5, 0.5]) { const p = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 2.3, 6), hierro()); p.position.set(sx, 1.15, sz); p.castShadow = true; g.add(p); } }
    const tl = new T.Mesh(new T.PlaneGeometry(2.5, 1.5), ml); tl.position.set(0, 2.2, 0.0); tl.rotation.x = -Math.PI / 2 + 0.3; tl.castShadow = true; g.add(tl);
    for (let k = 0; k < 9; k++) { const fe = new T.Mesh(new T.CircleGeometry(0.14, 8, Math.PI, Math.PI), ml); fe.position.set(-1.1 + k * 0.275, 1.99, 0.69); g.add(fe); }
    const gen = [['#d6452f', '#e8a02a', '#7cb342'], ['#8e44ad', '#f1c40f', '#c0392b'], ['#e67e22', '#2e7d32', '#e84393']][idx % 3];
    for (let i = 0; i < 4; i++) { const cx = -0.8 + i * 0.55; caja(g, 0.46, 0.18, 0.5, '#b58a5a', cx, 0.91, 0.05); for (let q = 0; q < 8; q++) { const f = new T.Mesh(new T.SphereGeometry(0.075, 6, 5), mat(gen[(i + q) % 3])); f.position.set(cx - 0.14 + (q % 4) * 0.09, 1.16 + ((q / 4) | 0) * 0.04, 0.05 - 0.1 + ((q / 4) | 0) * 0.16); g.add(f); } }
    for (let i = 0; i < 3; i++) { const cs = new T.Mesh(new T.CylinderGeometry(0.2, 0.15, 0.2, 8), mat('#b58a5a')); cs.position.set(-0.7 + i * 0.7, 0.1, 0.8); g.add(cs); for (let q = 0; q < 5; q++) { const f = new T.Mesh(new T.SphereGeometry(0.07, 6, 5), mat(gen[(i + q) % 3])); f.position.set(-0.7 + i * 0.7 + (q % 3 - 1) * 0.08, 0.24, 0.8 + (((q / 3) | 0) - 0.5) * 0.1); g.add(f); } }
    for (let q = 0; q < 5; q++) { const aj = new T.Mesh(new T.SphereGeometry(0.06, 6, 5).scale(1, 1.4, 1), mat(['#efe8d8', '#d9c9a0'][q % 2])); aj.position.set(-0.5 + q * 0.25, 1.85, 0.6); g.add(aj); caja(g, 0.01, 0.2, 0.01, '#6b5a48', -0.5 + q * 0.25, 1.9, 0.6); }
    return g;
  }
  // Rosa de los vientos en el adoquinado de la plaza (piedras claras y oscuras en anillos y una estrella de ocho puntas)
  function rosaPlaza(W, M, x, z, R) {
    const t = M.textura('rosa-plaza', 512, (c, n) => {
      c.clearRect(0, 0, n, n); const cx = n / 2, cy = n / 2;
      const anillo = (r0, r1, col, seg, off) => { for (let i = 0; i < seg; i++) { if ((i + off) % 2) continue; c.fillStyle = col; c.beginPath(); c.arc(cx, cy, r1, i / seg * 6.283, (i + 1) / seg * 6.283); c.arc(cx, cy, r0, (i + 1) / seg * 6.283, i / seg * 6.283, true); c.closePath(); c.fill(); } };
      anillo(n * 0.455, n * 0.5, 'rgba(236,228,208,0.85)', 72, 0); anillo(n * 0.4, n * 0.45, 'rgba(70,64,56,0.6)', 64, 1); c.strokeStyle = 'rgba(236,228,208,0.9)'; c.lineWidth = 5; c.beginPath(); c.arc(cx, cy, n * 0.385, 0, 6.3); c.stroke();
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, L = k % 2 ? n * 0.26 : n * 0.38, W2 = n * 0.045; c.fillStyle = k % 2 ? 'rgba(236,228,208,0.9)' : 'rgba(70,64,56,0.72)'; c.beginPath(); c.moveTo(cx + Math.sin(a) * L, cy - Math.cos(a) * L); c.lineTo(cx + Math.sin(a + 0.35) * W2 * 1.6, cy - Math.cos(a + 0.35) * W2 * 1.6); c.lineTo(cx, cy); c.lineTo(cx + Math.sin(a - 0.35) * W2 * 1.6, cy - Math.cos(a - 0.35) * W2 * 1.6); c.closePath(); c.fill(); }
      anillo(n * 0.1, n * 0.14, 'rgba(236,228,208,0.9)', 24, 0);
    });
    if (!t) return null; const m = new T.Mesh(new T.CircleGeometry(R, 48).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.95, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })); m.position.set(x, 0.018, z); m.receiveShadow = true; W.add(m); return m;
  }
  function alcantarillas(W, M, puntos, r) {
    const t = M.textura('alcantarilla', 128, (c, n) => { c.fillStyle = '#2b2f33'; c.beginPath(); c.arc(n / 2, n / 2, n / 2 - 2, 0, 6.3); c.fill(); c.strokeStyle = '#4a5056'; c.lineWidth = 4; for (const k of [0.84, 0.62, 0.38]) { c.beginPath(); c.arc(n / 2, n / 2, n / 2 * k, 0, 6.3); c.stroke(); } for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.beginPath(); c.moveTo(n / 2 + Math.cos(a) * n * 0.1, n / 2 + Math.sin(a) * n * 0.1); c.lineTo(n / 2 + Math.cos(a) * n * 0.46, n / 2 + Math.sin(a) * n * 0.46); c.stroke(); } });
    if (!t) return; const m = new T.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.6, metalness: 0.4, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, depthWrite: false });
    for (let i = 0; i < 9 && puntos.length; i++) { const p = puntos[(r() * puntos.length) | 0], d = new T.Mesh(new T.CircleGeometry(0.38, 16).rotateX(-Math.PI / 2), m); d.position.set(p[0] + (r() - 0.5) * 0.8, 0.016, p[1] + (r() - 0.5) * 0.8); W.add(d); }
  }
  // Placa de calle: poste de hierro con dos placas azules esmaltadas con el nombre
  function cartelCalle(W, M, x, z, nombre, ry) {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = ry || 0; W.add(g);
    const pa = new T.Mesh(new T.CylinderGeometry(0.035, 0.05, 2.6, 8), hierro()); pa.position.y = 1.3; pa.castShadow = true; g.add(pa); const bo = new T.Mesh(new T.SphereGeometry(0.06, 8, 6), hierro()); bo.position.y = 2.65; g.add(bo);
    const tx = M.textura('placa-' + nombre, 512, (c, n) => { const H = n / 4; c.fillStyle = '#1c4f91'; c.fillRect(0, 0, n, H); c.strokeStyle = '#f4f1e8'; c.lineWidth = 6; c.strokeRect(6, 6, n - 12, H - 12); let fs = 56; c.font = 'bold ' + fs + 'px Georgia, serif'; while (c.measureText(nombre).width > n - 40 && fs > 20) { fs -= 3; c.font = 'bold ' + fs + 'px Georgia, serif'; } c.fillStyle = '#f4f1e8'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(nombre, n / 2, H / 2 + 2); });
    if (tx) for (const s of [1, -1]) { const geo = new T.PlaneGeometry(1.1, 0.275), uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 0.75 + uv.getY(i) * 0.25); const p = new T.Mesh(geo, new T.MeshStandardMaterial({ map: tx, roughness: 0.4, metalness: 0.2, side: T.DoubleSide })); p.position.set(s * 0.6, 2.3, 0); p.rotation.y = s > 0 ? 0 : 0; g.add(p); caja(g, 1.14, 0.3, 0.02, '#e8e4da', s * 0.6, 2.15, -0.012); }
    return g;
  }

  // ---------- Fauna ----------
  function golondrina() {
    const g = new T.Group(), m = mat('#1a1d24', { roughness: 0.6 }), blanco = mat('#efece4');
    const cu = new T.Mesh(new T.ConeGeometry(0.045, 0.3, 6).rotateX(Math.PI / 2), m); g.add(cu); const pe = new T.Mesh(new T.SphereGeometry(0.035, 6, 5), blanco); pe.position.set(0, -0.015, 0.06); g.add(pe);
    const colaG = new T.Mesh(new T.ConeGeometry(0.04, 0.2, 3).rotateX(-Math.PI / 2), m); colaG.position.z = -0.2; colaG.scale.y = 0.2; g.add(colaG);
    const alas = []; for (const s of [-1, 1]) { const p = new T.Group(); p.position.set(0, 0.01, 0.02); g.add(p); const a = new T.Mesh(new T.BoxGeometry(0.34, 0.008, 0.11), m); a.position.x = s * 0.17; p.add(a); alas.push([p, s]); }
    g.userData = { vida: 'golondrina', alas }; return g;
  }
  function mariposa(color) {
    const g = new T.Group(), m = mat(color, { side: T.DoubleSide, roughness: 0.7 }), alas = [];
    for (const s of [-1, 1]) { const p = new T.Group(); g.add(p); const a = new T.Mesh(new T.CircleGeometry(0.06, 7), m); a.rotation.x = -Math.PI / 2; a.position.x = s * 0.055; a.scale.set(1, 1.15, 1); p.add(a); alas.push([p, s]); }
    g.userData = { vida: 'mariposa', alas }; return g;
  }
  function oveja() {
    const g = new T.Group(), lana = mat('#efe9dc', { roughness: 1 }), osc = mat('#2b2622', { roughness: 0.9 });
    const cu = new T.Mesh(new T.IcosahedronGeometry(0.45, 1), lana); cu.scale.set(0.8, 0.7, 1.15); cu.position.y = 0.62; cu.castShadow = true; g.add(cu);
    for (const [x, z] of [[-0.18, 0.2], [0.18, 0.2], [-0.2, -0.2], [0.2, -0.2]]) { const b = new T.Mesh(new T.IcosahedronGeometry(0.2, 0), lana); b.position.set(x, 0.72, z); g.add(b); }
    const cab = new T.Group(); cab.position.set(0, 0.7, 0.5); g.add(cab); const c = new T.Mesh(new T.SphereGeometry(0.16, 8, 6), osc); c.scale.set(0.85, 1, 1.25); cab.add(c); for (const s of [-1, 1]) { const o = new T.Mesh(new T.SphereGeometry(0.06, 6, 5), osc); o.scale.set(1.8, 0.5, 0.9); o.position.set(s * 0.17, 0.05, -0.04); o.rotation.z = s * 0.4; cab.add(o); }
    const pat = []; for (const [x, z] of [[-0.16, 0.3], [0.16, 0.3], [-0.16, -0.3], [0.16, -0.3]]) { const p = new T.Mesh(new T.CylinderGeometry(0.03, 0.025, 0.4, 5), osc); p.position.set(x, 0.2, z); g.add(p); pat.push(p); }
    g.userData = { vida: 'oveja', cab }; g.scale.setScalar(0.9 + Math.random() * 0.2); return g;
  }
  function perro(color) {
    const g = new T.Group(), m = mat(color, { roughness: 0.95 }), osc = mat('#1d1815'), B = (geo, x, y, z, mt) => { const me = new T.Mesh(geo, mt || m); me.position.set(x, y, z); me.castShadow = true; g.add(me); return me; };
    B(new T.SphereGeometry(0.18, 10, 8).scale(0.8, 0.85, 1.7), 0, 0.42, 0); B(new T.SphereGeometry(0.15, 8, 6).scale(1, 1, 1), 0, 0.46, 0.22);
    const cab = new T.Group(); cab.position.set(0, 0.55, 0.38); g.add(cab); const c = new T.Mesh(new T.SphereGeometry(0.115, 8, 6), m); cab.add(c); const ho = new T.Mesh(new T.SphereGeometry(0.07, 8, 6).scale(0.9, 0.8, 1.5), m); ho.position.set(0, -0.03, 0.12); cab.add(ho); const na = new T.Mesh(new T.SphereGeometry(0.02, 5, 4), osc); na.position.set(0, -0.015, 0.2); cab.add(na);
    for (const s of [-1, 1]) { const o = new T.Mesh(new T.SphereGeometry(0.05, 6, 5).scale(0.7, 1.4, 0.8), osc); o.position.set(s * 0.1, 0.03, -0.02); o.rotation.z = s * 0.3; cab.add(o); }
    const pat = []; for (const [x, z] of [[-0.09, 0.2], [0.09, 0.2], [-0.09, -0.2], [0.09, -0.2]]) { const pv = new T.Group(); pv.position.set(x, 0.34, z); g.add(pv); const p = new T.Mesh(new T.CylinderGeometry(0.03, 0.022, 0.34, 5), m); p.position.y = -0.17; pv.add(p); pat.push(pv); }
    const cola = new T.Group(); cola.position.set(0, 0.5, -0.3); g.add(cola); const cm = new T.Mesh(new T.CylinderGeometry(0.02, 0.012, 0.28, 5), m); cm.position.y = 0.12; cm.rotation.x = -0.5; cola.add(cm);
    g.userData = { vida: 'perro', pat, cola, cab }; return g;
  }

  // Rebaño, golondrinas, mariposas; devuelve funciones para el bucle de animación
  function fauna(S, W, ctx) {
    const { altura, MES, IG, dMes, r, lotes } = ctx, aves = [], maris = [], ovejas = [], hierba = new T.Vector3();
    for (let i = 0; i < 12; i++) { const a = golondrina(); a.userData.R = 4.5 + (i % 4) * 2.1; a.userData.w = (0.55 + (i % 5) * 0.09) * (i % 2 ? 1 : -1); a.userData.h = 17 + (i % 6) * 1.7; a.userData.f = r() * 6.28; a.userData.cx = IG.x + 3.4; a.userData.cz = IG.z + 4.8; W.add(a); aves.push(a); }
    const colores = ['#f1c40f', '#f4f1e8', '#e67e22', '#8ec5ff', '#e84393'];
    const L = lotes && lotes.parque ? lotes.parque : { x: 14, z: 10 };
    for (let i = 0; i < 9; i++) { const m = mariposa(colores[i % 5]); const fuera = i >= 5; let cx = fuera ? (r() < 0.5 ? -1 : 1) * (50 + r() * 22) : L.x + (r() - 0.5) * 5, cz = fuera ? MES.cz + 18 + r() * 20 : L.z + (r() - 0.5) * 5; m.userData.cx = cx; m.userData.cz = cz; m.userData.f = r() * 6.28; m.userData.a = 2 + r() * 2.5; W.add(m); maris.push(m); }
    // ovejas en una ladera sur
    { let d = 1.16, a = 1.15, cx, cz, cy; for (; d > 1.02; d -= 0.02) { cx = MES.cx + Math.cos(a) * MES.rx * d; cz = MES.cz + Math.sin(a) * MES.rz * d; cy = altura(cx, cz); if (cy > -14 && cy < 0) break; }
      for (let i = 0; i < 8; i++) { const o = oveja(); o.userData.cx = cx; o.userData.cz = cz; o.userData.x = cx + (r() - 0.5) * 8; o.userData.z = cz + (r() - 0.5) * 6; o.userData.tx = o.userData.x; o.userData.tz = o.userData.z; o.userData.t = r() * 6; o.userData.ang = r() * 6.28; o.position.set(o.userData.x, altura(o.userData.x, o.userData.z), o.userData.z); W.add(o); ovejas.push(o); } }
    S.puebloAnim.push(function (t) {
      const dia = 1 - Math.min(1, Math.max(0, ((S.noche || 0) - 0.3) / 0.4));
      aves.forEach((a, i) => { const u = a.userData; a.visible = dia > 0.3; if (!a.visible) return; const th = t * u.w + u.f, R = u.R + Math.sin(t * 0.3 + i) * 1.2; a.position.set(u.cx + Math.cos(th) * R, u.h + Math.sin(t * 0.9 + u.f) * 1.4, u.cz + Math.sin(th) * R); a.rotation.y = Math.atan2(-Math.sin(th) * Math.sign(u.w), Math.cos(th) * Math.sign(u.w)) + (u.w < 0 ? Math.PI : 0) * 0; a.rotation.z = Math.sign(u.w) * 0.35; const fl = Math.sin(t * 17 + i * 2) * 0.65; u.alas.forEach(([p, s]) => { p.rotation.z = s * fl; }); });
      maris.forEach(m => { const u = m.userData; m.visible = dia > 0.5; if (!m.visible) return; const x = u.cx + Math.sin(t * 0.37 + u.f) * u.a + Math.sin(t * 1.1 + u.f) * 0.6, z = u.cz + Math.cos(t * 0.29 + u.f * 2) * u.a, y = (u.cz > MES.cz + 14 ? altura(x, z) : 0) + 0.8 + Math.sin(t * 1.6 + u.f) * 0.35 + Math.abs(Math.sin(t * 0.8 + u.f)) * 0.3; m.position.set(x, y, z); m.rotation.y = Math.atan2(Math.cos(t * 0.37 + u.f), -Math.sin(t * 0.29 + u.f * 2)) ; const fl = Math.abs(Math.sin(t * 12 + u.f)) * 1.1; u.alas.forEach(([p, s]) => { p.rotation.z = s * fl; }); });
      ovejas.forEach((o, i) => { const u = o.userData; if (t > u.t) { u.t = t + 3 + Math.random() * 6; if (Math.random() < 0.55) { u.tx = u.cx + (Math.random() - 0.5) * 12; u.tz = u.cz + (Math.random() - 0.5) * 9; } else { u.tx = u.x; u.tz = u.z; } }
        const dx = u.tx - u.x, dz = u.tz - u.z, d = Math.hypot(dx, dz); if (d > 0.1) { u.x += dx / d * 0.012; u.z += dz / d * 0.012; u.ang = Math.atan2(dx, dz); } o.position.set(u.x, altura(u.x, u.z), u.z); let da = u.ang - o.rotation.y; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283; o.rotation.y += da * 0.05; u.cab.rotation.x = d > 0.1 ? Math.sin(t * 6 + i) * 0.1 : 0.45 + Math.sin(t * 2.2 + i) * 0.12; });
    });
  }

  // ---------- Perros que siguen a su dueño ----------
  const PERROS = [];
  function perros(S, W, duenos, r) {
    PERROS.length = 0; duenos.forEach((d, i) => { const p = perro(['#8a6a45', '#2b2622', '#d6c8a8', '#a0522d'][i % 4]); p.position.set(d.obj.position.x - 0.8, 0, d.obj.position.z); W.add(p); PERROS.push({ obj: p, dueno: d, x: p.position.x, z: p.position.z, ang: 0, fase: r() * 6 }); });
  }
  // Oficios, saludos por tu nombre según tu fama y el último resultado, y charlas entre vecinos que se cruzan
  const OFICIOS = ['Panadero', 'Maestra', 'Tendero', 'Mecánico', 'Pastor', 'Camarera', 'Jubilado', 'Enfermera', 'Albañil', 'Agricultora', 'Cartero', 'Carnicero'];
  const DIALOGOS = [['¿Has visto el partido?', 'Menudo tiro metió el chaval.'], ['Qué calor hace hoy.', 'Pues ya verás en agosto.'], ['¿Vas a la fiesta?', 'No me la pierdo.'], ['Dicen que arreglan la carretera.', 'Ya era hora.'], ['Hoy el pan está recién hecho.', 'Guárdame una barra.'], ['¿Cómo está tu madre?', 'Mejor, gracias.']];
  function ultimoResultado(st) { let g = null; (st.calendario || []).forEach(x => { if (x.resultado && (x.local === st.clubId || x.visitante === st.clubId) && (!g || x.fecha > g.fecha)) g = x; }); if (!g) return null; const loc = g.local === st.clubId, nos = loc ? g.resultado.local : g.resultado.visitante, ellos = loc ? g.resultado.visitante : g.resultado.local; return { gana: nos > ellos, nos, ellos }; }
  function saludos(S, M, t) {
    const yo = S.yo && S.yo.obj.position; if (!yo) return; S.vgT = S.vgT || 0; if (t < S.vgT) return; S.vgT = t + 0.6;
    const st = S.st, nom = (st.jugadores.yo && st.jugadores.yo.nombre || 'campeón').split(' ')[0], fama = st.carrera ? st.carrera.fama : 30, u = ultimoResultado(st), gente = S.gente.filter(n => n.vecino && n.obj.visible);
    S.saludados = S.saludados || {}; const hoy = st.fecha;
    gente.forEach(n => { const d = Math.hypot(n.obj.position.x - yo.x, n.obj.position.z - yo.z), id = n.obj.id; if (!n.oficio) n.oficio = n.perfil === 'nino' ? 'Estudiante' : n.perfil === 'mayor' ? 'Jubilado' : OFICIOS[(id * 7) % OFICIOS.length];
      if (d < 3.2 && S.saludados[id] !== hoy && !n.sentado) { S.saludados[id] = hoy; const f = n.perfil === 'nino' ? ['¡' + nom + '! ¿Me firmas un autógrafo?', '¡Quiero ser como tú!', '¿Jugamos un rato?'] : fama >= 70 ? ['¡Mira, ' + nom + '! Qué orgullo.', '¡' + nom + ', eres el mejor!', 'Saludos, ' + nom + '. El pueblo entero te sigue.'] : fama >= 40 ? ['Buenas, ' + nom + '.', '¡Ánimo en la próxima, ' + nom + '!', u ? (u.gana ? 'Vaya partido ganasteis, ' + nom + '.' : 'Ya ganaréis, ' + nom + '.') : 'Hola, ' + nom + '.'] : ['Buenas, chaval.', '¿Tú eres el que juega al baloncesto?', 'Hola.'];
        M.bocadillo(f[(id + hoy.length) % f.length], n.obj); n.rol = n.oficio + (n.perfil === 'nino' ? '' : ', vecino de ' + (S.calleNombre || 'tu pueblo')); } });
    // charla entre dos vecinos que pasan cerca
    S.dialT = S.dialT || 0; if (t > S.dialT) { S.dialT = t + 4; for (let i = 0; i < gente.length; i++) for (let j = i + 1; j < gente.length; j++) { const a = gente[i], b = gente[j]; if (Math.hypot(a.obj.position.x - b.obj.position.x, a.obj.position.z - b.obj.position.z) < 2.2 && Math.hypot(a.obj.position.x - yo.x, a.obj.position.z - yo.z) < 14 && !a.hablando && !b.hablando) { const d = DIALOGOS[(i * 3 + j) % DIALOGOS.length]; a.hablando = b.hablando = true; a.espera = b.espera = Math.max(a.espera || 0, 5); a.camino = b.camino = null; M.anim(a, 'idle'); M.anim(b, 'idle'); a.obj.lookAt(b.obj.position.x, a.obj.position.y, b.obj.position.z); b.obj.lookAt(a.obj.position.x, b.obj.position.y, a.obj.position.z); M.bocadillo(d[0], a.obj); setTimeout(() => { if (S.vivo !== false) M.bocadillo(d[1], b.obj); }, 1800); setTimeout(() => { a.hablando = b.hablando = false; }, 5000); return; } } }
  }
  function actualizar(S, M, dt) {
    const t = performance.now() / 1000;
    saludos(S, M, t); if (GM.arquitectura) GM.arquitectura.aguaMover(t);
    animarDetalles(S, t);
    PERROS.forEach(P => { const o = P.dueno.obj.position, dx = o.x - P.x, dz = o.z - P.z, d = Math.hypot(dx, dz), sg = !P.dueno.sentado && !(P.dueno.camino && !P.dueno.camino.length) ? 1 : 1;
      if (d > 30) { P.x = o.x - 1; P.z = o.z; }
      const mueve = d > 1.5; if (mueve) { const v = Math.min(3.4, 1.2 + d * 0.9) * dt; P.x += dx / d * v; P.z += dz / d * v; P.ang = Math.atan2(dx, dz); }
      const h = ctxAltura ? ctxAltura(P.x, P.z) : 0; P.obj.position.set(P.x, Math.max(0, h) * 0, P.z); let da = P.ang - P.obj.rotation.y; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283; P.obj.rotation.y += da * Math.min(1, dt * 8);
      const u = P.obj.userData, sw = mueve ? Math.sin(t * 13 + P.fase) * 0.7 : 0; u.pat.forEach((pv, k) => { pv.rotation.x = (k % 3 === 0 ? 1 : -1) * sw; }); u.cola.rotation.z = Math.sin(t * (mueve ? 9 : 5) + P.fase) * 0.5; u.cab.rotation.x = mueve ? 0 : Math.sin(t * 1.3 + P.fase) * 0.15; void sg; });
  }
  let ctxAltura = null;
  // Humo de las chimeneas (de otoño a primavera, y a primera y última hora) y ropa tendida que se mece
  function animarDetalles(S, t) {
    const H = K() && K().humos, h = S.hora || 9, frio = S.estacion && S.estacion !== 'verano' || h < 10 || h > 19.5;
    if (H) H.forEach((p, i) => { const u = p.userData.humo; p.visible = frio && i % 4 !== 3; if (!p.visible) return; const ph = (t * 0.16 + u.f) % 1; p.position.set(u.x + ph * 1.1, u.y + ph * 2.6, u.z + Math.sin(t + u.f * 5) * 0.12); p.scale.setScalar((0.35 + ph * 1.2) * (ph > 0.8 ? (1 - ph) / 0.2 : 1)); });
  }

  // ---------- Noche: ventanas encendidas y faroles ----------
  function nocturno(S) {
    S.puebloAnim.push(function () { const n = S.noche || 0, K1 = K(), CV1 = CV(); if (K1 && K1.luzVentana) K1.luzVentana.emissiveIntensity = n * 2.2; if (CV1 && CV1.lampMat && CV1.lampMat.on) CV1.lampMat.on.emissiveIntensity = 0.15 + n * 2.6; });
  }

  // ---------- Vecinos: perfiles y rutinas ----------
  const ROPA = ['#c0392b', '#2f6f9e', '#f1c40f', '#2e7d32', '#e84393', '#e67e22', '#8e44ad'];
  function perfilVecino(r, PIEL, PELO, MODELOS, club, fan) {
    const k = r(), tipo = k < 0.18 ? 'nino' : k < 0.42 ? 'mayor' : 'adulto', o = { modelo: MODELOS[(r() * MODELOS.length) | 0], piel: PIEL[(r() * PIEL.length) | 0], pelo: PELO[(r() * PELO.length) | 0], ropa: fan ? [club.colores[0], club.colores[1] || '#222'] : null };
    if (tipo === 'nino') { o.altura = 108 + r() * 30; o.ropa = [ROPA[(r() * ROPA.length) | 0], ROPA[(r() * ROPA.length) | 0]]; }
    else if (tipo === 'mayor') { o.altura = 150 + r() * 20; o.pelo = '#c9c9c9'; if (!fan) o.ropa = ['#6b5a48', '#8a7a68']; }
    else o.altura = 158 + r() * 28;
    return { tipo, o };
  }
  function siguiente(S, M, n, ctx) {
    const h = S.hora || 9, r = n.r; if (!n.obj.visible) n.obj.visible = true;
    const siesta = h >= 14.3 && h < 17.2, noche = h >= 21.3, tipo = n.perfil || 'adulto';
    const lotes = Object.values(S.lotes || {}), u = r();
    // casi todo el mundo se recoge en la siesta y de madrugada: va a una puerta y entra
    if ((siesta && u < 0.7) || (noche && u < 0.8)) { const L = lotes[(r() * lotes.length) | 0]; if (L) { const ok = M.irA(n, L.zx, L.zz, () => { n.obj.visible = false; n.espera = 12 + r() * 25; }); if (ok) return; } }
    // bancos: sobre todo los mayores
    if (S.bancos && S.bancos.length && u < (tipo === 'mayor' ? 0.4 : 0.14)) { const libres = S.bancos.filter(b => !b.ocupado); const b = libres[(r() * libres.length) | 0];
      if (b) { b.ocupado = true; const ok = M.irA(n, b.x - Math.sin(b.ry) * 0.05, b.z - Math.cos(b.ry) * 0.05, () => { n.obj.rotation.y = b.ry; n.asiento = 0.44; M.anim(n, 'sit'); n.espera = 14 + r() * 28; n.banco = b; if (S.yo && n.obj.position.distanceTo(S.yo.obj.position) < 8 && r() < 0.5) M.bocadillo(['Buenos ratos se echan aquí.', 'Siéntate un rato, anda.', 'Antes esto era todo campo.', 'Qué bien se está al sol.'][(r() * 4) | 0], n.obj); });
        if (ok) { setTimeout(() => { b.ocupado = false; }, 1000 * 40); return; } b.ocupado = false; } }
    if (n.banco) { n.banco.ocupado = false; n.banco = null; }
    // los niños corren a la canasta y a la plaza
    if (tipo === 'nino' && u < 0.5) { const L = (S.lotes || {}).canasta || (S.lotes || {}).escuela; if (L) { const ok = M.irA(n, L.zx + (r() - 0.5) * 3, L.zz + (r() - 0.5) * 3, () => { M.anim(n, r() < 0.5 ? 'emote-yes' : 'idle'); n.espera = 4 + r() * 8; }); if (ok) { M.anim(n, 'sprint'); return; } } }
    // plaza: corrillos junto a la fuente
    if (u < 0.35) { const a = r() * 6.28, ok = M.irA(n, 1 + Math.cos(a) * (3.6 + r() * 2), Math.sin(a) * (3.6 + r() * 2), () => { M.anim(n, 'idle'); n.espera = 4 + r() * 9; if (S.yo && n.obj.position.distanceTo(S.yo.obj.position) < 7 && r() < 0.4) M.bocadillo(ctx.frase(S.st, n), n.obj); }); if (ok) return; }
    // comercios: se acercan a la puerta y algunos entran
    if (u < 0.55 && lotes.length) { const L = lotes[(r() * lotes.length) | 0], ok = M.irA(n, L.zx, L.zz, () => { if (r() < 0.45) { n.obj.visible = false; n.espera = 8 + r() * 14; } else { M.anim(n, 'idle'); n.espera = 3 + r() * 6; } }); if (ok) return; }
    const q = S.paseo[(r() * S.paseo.length) | 0], ok = M.irA(n, q[0] + (r() - 0.5) * 1.2, q[1] + (r() - 0.5) * 1.2, () => { M.anim(n, 'idle'); n.espera = 2 + r() * 6; if (S.yo && n.obj.position.distanceTo(S.yo.obj.position) < 7 && r() < 0.35) M.bocadillo(ctx.frase(S.st, n), n.obj); });
    if (!ok) n.espera = 1;
  }
  GM.puebloVida = { golondrina, mariposa, banco, silla, mesa, terraza, puestoMercado, rosaPlaza, alcantarillas, cartelCalle, fauna, perros, actualizar, nocturno, perfilVecino, siguiente, perro, setAltura: f => { ctxAltura = f; } };
})();
