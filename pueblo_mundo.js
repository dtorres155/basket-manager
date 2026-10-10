/* TU PUEBLO PARA PASEAR (GM.puebloMundo) — modo carrera, con el motor del mundo de sede3d.js (como la calle y la casa)
   Pueblo antiguo en lo alto de una colina, en el estilo de su región (pueblo3d.ESTILOS): muralla ovalada con torres y dos puertas,
   calle mayor que serpentea hasta una plaza irregular con iglesia, ayuntamiento, fuente y estatua, callejuelas y, fuera de la
   muralla, rondas y la carretera donde el pueblo crece (casas y edificios grandes). Alrededor, laderas con olivares, campos y
   cipreses que bajan a un valle con río y puente, masías, una ermita y montañas. Cada parcela (pueblo.js) muestra su estado:
   solar, obra por fases (vallas, cimientos, estructura, andamios, acabado; grúa en las grandes y obreros) o el edificio.
   Expone: construir(S, M, st), poblar(S, M, st), siguiente(S, M, n), actualizar(S, M, dt). No escribe en el estado. */
(function () {
  const U = GM.util;
  const rnd = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const MATS = {}; const mat = (c, o) => { const k = c + JSON.stringify(o || {}); return MATS[k] || (MATS[k] = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.9 }, o || {}))); };
  function caja(W, w, h, d, m, x, y, z, ry) { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof m === 'string' || typeof m === 'number' ? mat(m) : m); me.position.set(x, y + h / 2, z); if (ry) me.rotation.y = ry; me.castShadow = true; me.receiveShadow = true; W.add(me); return me; }
  function cil(W, r, h, m, x, y, z, seg, r2) { const me = new THREE.Mesh(new THREE.CylinderGeometry(r2 === undefined ? r : r2, r, h, seg || 12), typeof m === 'string' || typeof m === 'number' ? mat(m) : m); me.position.set(x, y + h / 2, z); me.castShadow = true; W.add(me); return me; }
  // Tejado a dos aguas (prisma) de ancho w, fondo d, alto h; la cumbrera va de lado a lado (eje x local)
  function tejado(G, w, d, h, color, y) {
    const s = new THREE.Shape(); s.moveTo(-d / 2 - 0.3, 0); s.lineTo(d / 2 + 0.3, 0); s.lineTo(0, h); s.lineTo(-d / 2 - 0.3, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: w + 0.6, bevelEnabled: false }); g.translate(0, 0, -(w + 0.6) / 2); g.rotateY(Math.PI / 2);
    const m = new THREE.Mesh(g, mat(color)); m.position.y = y; m.castShadow = true; G.add(m); return m;
  }
  function rotulo(M, txt, fondo) {
    const t = M.textura('rot-pueblo-' + txt + fondo, 256, (x, n) => { x.fillStyle = fondo; x.fillRect(0, 0, n, n); x.fillStyle = '#fff'; x.font = 'bold 30px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; const p = txt.split(' '), mitad = Math.ceil(p.length / 2); if (txt.length > 14) { x.fillText(p.slice(0, mitad).join(' '), n / 2, n / 2 - 20); x.fillText(p.slice(mitad).join(' '), n / 2, n / 2 + 20); } else x.fillText(txt, n / 2, n / 2); });
    return new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.0), t ? new THREE.MeshStandardMaterial({ map: t }) : mat(fondo));
  }
  // Edificio tipo: plantas, ventanas, puerta, tejado y rótulo. G: grupo con el frente mirando a +z.
  function bloque(G, M, E, w, d, pisos, muro, txt, acento, r, opts) {
    if (GM.casasReal) return GM.casasReal.bloque(G, M, E, w, d, pisos, muro, txt, acento, r, opts);   // fachadas realistas (casas_realistas.js)
    const h = pisos * 3.1;
    caja(G, w, h, d, muro, 0, 0, 0);
    if (E.zocalo) caja(G, w + 0.05, 0.7, d + 0.05, E.zocalo, 0, 0, 0);
    const post = E.postigos[(r() * E.postigos.length) | 0], vidrio = mat('#33444f', { roughness: 0.12, metalness: 0.6 }), marco = mat(E.clave === 'andaluz' ? '#f4f1ea' : '#e9e1d0'), piedra = mat('#b9ad98'), persiana = r() < 0.5;
    for (let p = 0; p < pisos; p++) for (let i = 0; i < Math.max(1, Math.floor(w / 2.4)); i++) {
      const x = -w / 2 + (i + 0.5) * w / Math.max(1, Math.floor(w / 2.4)); if (p === 0 && Math.abs(x) < 1) continue;
      const yv = p * 3.1 + 1.1;
      caja(G, 0.9, 1.2, 0.06, vidrio, x, yv, d / 2 + 0.02);                                   // cristal
      caja(G, 1.1, 0.1, 0.12, marco, x, yv + 1.2, d / 2 + 0.05); caja(G, 1.2, 0.09, 0.26, piedra, x, yv - 0.1, d / 2 + 0.1);   // dintel y alféizar
      caja(G, 0.05, 1.2, 0.1, marco, x, yv, d / 2 + 0.06); caja(G, 0.9, 0.05, 0.1, marco, x, yv + 0.6, d / 2 + 0.06);        // cruceta
      caja(G, 0.34, 1.2, 0.07, post, x - 0.66, yv, d / 2 + 0.05); caja(G, 0.34, 1.2, 0.07, post, x + 0.66, yv, d / 2 + 0.05);
      for (const s of [-1, 1]) for (let k = 0; k < 4; k++) caja(G, 0.3, 0.025, 0.02, '#2a2018', x + s * 0.66, yv + 0.2 + k * 0.28, d / 2 + 0.09);   // lamas
      if (persiana && p === 0) caja(G, 0.95, 0.12, 0.1, '#6b5a48', x, yv + 1.3, d / 2 + 0.06);
      if (r() < 0.4) { caja(G, 0.95, 0.16, 0.26, '#6b4a2b', x, yv - 0.3, d / 2 + 0.22); for (let k = 0; k < 4; k++) { const fl = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), mat(['#c0392b', '#e84393', '#f1bf00', '#f4f1ea'][(r() * 4) | 0])); fl.position.set(x - 0.33 + k * 0.22, yv - 0.1, d / 2 + 0.22); G.add(fl); } }
      if (p > 0 && E.clave !== 'castellano' && r() < 0.5) caja(G, 1.3, 0.12, 0.5, '#3b3b3b', x, p * 3.1 + 0.9, d / 2 + 0.25);
    }
    caja(G, 1.4, 2.3, 0.1, '#5a3c26', 0, 0, d / 2 + 0.03); caja(G, 1.7, 0.14, 0.16, marco, 0, 2.3, d / 2 + 0.06); caja(G, 0.14, 2.3, 0.16, marco, -0.78, 0, d / 2 + 0.06); caja(G, 0.14, 2.3, 0.16, marco, 0.78, 0, d / 2 + 0.06); caja(G, 1.9, 0.18, 0.7, piedra, 0, 0, d / 2 + 0.35);   // puerta con marco y escalón
    { const fa = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.26, 0.14), new THREE.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffd27a, emissiveIntensity: 0.6 })); fa.position.set(1.1, 2.0, d / 2 + 0.1); G.add(fa); }
    if (r() < 0.6) cil(G, 0.045, h - 0.2, '#6b6f73', w / 2 - 0.08, 0, d / 2 + 0.07, 6);   // bajante
    if (r() < 0.45) { const hiedra = new THREE.Mesh(new THREE.PlaneGeometry(1.6 + r(), 2 + r() * 1.5), mat('#3f6f2f', { side: THREE.DoubleSide })); hiedra.position.set(-w / 2 + 1.6 + r() * (w - 3.2), 1.6 + r() * 1.2, d / 2 + 0.03); G.add(hiedra); }
    if (acento) { const tl = new THREE.Mesh(new THREE.BoxGeometry(Math.min(w - 0.6, 4.5), 0.15, 1.1), mat(acento)); tl.position.set(0, 2.7, d / 2 + 0.5); tl.rotation.x = 0.25; G.add(tl); }
    caja(G, w + 0.5, 0.2, d + 0.5, E.teja, 0, h - 0.12, 0);   // alero
    tejado(G, w, d, 1.6 + w * 0.06, E.teja, h);
    if (txt) { const s = rotulo(M, txt, acento || '#3a4a5a'); s.position.set(0, Math.min(h - 0.7, 3.6), d / 2 + 0.08); G.add(s); }
    return h;
  }
  // Lo que se ve en cada parcela según tipo y nivel (edificio acabado)
  function construido(G, M, E, tipo, nv, club, r, anims) {
    const muro = E.muros[(r() * E.muros.length) | 0], c1 = club.colores[0] === '#000000' ? '#333333' : club.colores[0], c2 = club.colores[1] || '#ffffff';
    const nombre = (GM.mods.pueblo.EDI[tipo] || {}).n || tipo;
    if (tipo === 'canasta') {
      caja(G, 7, 0.06, 5, nv >= 2 ? '#3f7d5a' : '#9a9a92', 0, 0, 0); caja(G, 6.6, 0.07, 0.06, '#ffffff', 0, 0, 0);
      [-1, 1].forEach(s => { cil(G, 0.07, 3, '#555', s * 3.1, 0, 0, 6); caja(G, 0.08, 0.8, 1.2, '#f2f2f2', s * 2.95, 2.6, 0); const aro = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.02, 6, 16), mat('#e8590c')); aro.rotation.x = Math.PI / 2; aro.position.set(s * 2.6, 3.05, 0); G.add(aro); });
      if (nv >= 2) [-2.6, 2.6].forEach(z => caja(G, 7.2, 1.0, 0.06, '#2f3a46', 0, 0, z));
      if (nv >= 3) { caja(G, 7.4, 0.15, 5.4, c1, 0, 4.4, 0); [[-3.5, -2.5], [3.5, -2.5], [-3.5, 2.5], [3.5, 2.5]].forEach(q => cil(G, 0.1, 4.4, '#666', q[0], 0, q[1], 6)); }
      return;
    }
    if (tipo === 'parque') {
      const cesp = new THREE.Mesh(new THREE.CylinderGeometry(3.7, 3.8, 0.1, 28), mat('#6ea35a', { roughness: 1 })); cesp.scale.set(1, 1, 0.95); cesp.position.y = 0.05; cesp.receiveShadow = true; G.add(cesp);
      const rib = new THREE.Mesh(new THREE.TorusGeometry(3.78, 0.1, 6, 36).rotateX(Math.PI / 2), mat('#a39380')); rib.scale.set(1, 1, 0.95); rib.position.y = 0.08; G.add(rib);
      { const cr = new THREE.CatmullRomCurve3([new THREE.Vector3(-3.6, 0.1, 1.4), new THREE.Vector3(-1.5, 0.1, 0.3), new THREE.Vector3(0.4, 0.1, 0.8), new THREE.Vector3(1.8, 0.1, -0.4), new THREE.Vector3(3.5, 0.1, -1.6)]), pts = cr.getPoints(24), sh = new THREE.Shape(); const ps = pts.map(p => [p.x, p.z]); for (let i = 0; i < ps.length; i++) { const [x, z] = ps[i], [x2, z2] = ps[Math.min(ps.length - 1, i + 1)], [x0, z0] = ps[Math.max(0, i - 1)], tx = x2 - x0, tz = z2 - z0, l = Math.hypot(tx, tz) || 1; ps[i].push(-tz / l * 0.35, tx / l * 0.35); }
        const geo = new THREE.BufferGeometry(), pos = [], idx = []; ps.forEach((q, i) => { pos.push(q[0] + q[2], 0.11, q[1] + q[3], q[0] - q[2], 0.11, q[1] - q[3]); if (i) { const k = (i - 1) * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); } }); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); void sh; const sen = new THREE.Mesh(geo, mat('#c9b99a', { roughness: 1, side: THREE.DoubleSide })); sen.receiveShadow = true; G.add(sen); }
      for (let i = 0; i < 3 + nv * 2; i++) { const a = r() * 6.28, d = 1.7 + r() * 1.6; arbol(G, Math.cos(a) * d, Math.sin(a) * d * 0.9, i % 3 ? 'frutal' : 'olivo', r, 0.08); }
      for (const [bx, bz, br] of [[-1.5, 2.5, 0], [1.6, 2.5, 0]]) { const bg = new THREE.Group(); bg.position.set(bx, 0.1, bz); bg.rotation.y = br; G.add(bg); caja(bg, 1.6, 0.08, 0.5, '#7a5230', 0, 0.42, 0); caja(bg, 1.6, 0.4, 0.06, '#7a5230', 0, 0.55, -0.22); for (const sx of [-0.7, 0.7]) { const pata = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 5, 10, Math.PI), mat('#23282d')); pata.position.set(sx, 0.2, 0); pata.rotation.y = Math.PI / 2; bg.add(pata); } }
      if (GM.curvas) { const f = new THREE.Group(); f.position.set(-0.6, 0.1, -2.2); G.add(f); const fl = GM.curvas.lathe('f-parque', [[0.0, 0], [0.5, 0], [0.55, 0.15], [0.45, 0.35], [0.22, 0.5], [0.12, 0.9], [0.2, 1.0]], 14, mat('#d8cfbb')); f.add(fl); }
      if (nv >= 2) { const sh2 = new THREE.Shape(); sh2.moveTo(0, -0.9); sh2.bezierCurveTo(1.1, -1.2, 1.9, -0.2, 1.4, 0.5); sh2.bezierCurveTo(1.0, 1.2, -0.3, 1.1, -0.9, 0.5); sh2.bezierCurveTo(-1.5, -0.2, -0.8, -0.7, 0, -0.9);
        const borde = new THREE.Mesh(new THREE.ExtrudeGeometry(sh2, { depth: 0.14, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.05, bevelSegments: 2 }).rotateX(Math.PI / 2), mat('#a39380')); borde.scale.set(1.12, 1, 1.12); borde.position.set(1.6, 0.2, 0.2); G.add(borde);
        const lago = new THREE.Mesh(new THREE.ShapeGeometry(sh2, 12).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x3f86a6, roughness: 0.06, metalness: 0.2 })); lago.position.set(1.6, 0.16, 0.2); G.add(lago);
        for (let k = 0; k < 6; k++) { const j = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.5 + r() * 0.3, 4), mat('#6f8a3a')); const a = r() * 6.28; j.position.set(1.6 + Math.cos(a) * 1.2, 0.4, 0.2 + Math.sin(a) * 0.9); G.add(j); } }
      return;
    }
    if (tipo === 'cine') {   // cine de pueblo: marquesina luminosa, carteles y, con la mejora, multicines
      const w0 = 8, d0 = 7, h0 = 5.4 + nv * 0.6; caja(G, w0, h0, d0, muro, 0, 0, 0);
      caja(G, w0 + 0.4, 0.4, d0 + 0.4, '#3a2a30', 0, h0, 0); caja(G, 6.4, 1.0, 1.6, '#7a1a22', 0, 3.6, d0 / 2 + 0.7); caja(G, 6.8, 0.12, 1.8, '#f4f1e8', 0, 4.6, d0 / 2 + 0.7);
      { const mA = new THREE.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffd27a, emissiveIntensity: 1 }), mB = mA.clone(); for (let i = 0; i < 9; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), i % 2 ? mA : mB); l.position.set(-3 + i * 0.75, 3.62, d0 / 2 + 1.52); G.add(l); } if (anims) anims.push(t => { const on = Math.sin(t * 2.6) > 0; mA.emissiveIntensity = on ? 1.4 : 0.15; mB.emissiveIntensity = on ? 0.15 : 1.4; }); }
      const s = rotulo(M, 'CINE', '#7a1a22'); s.scale.setScalar(2); s.position.set(0, h0 - 1.1, d0 / 2 + 0.08); G.add(s); caja(G, 0.4, 3, 0.4, '#7a1a22', w0 / 2 + 0.6, 2, d0 / 2 + 0.3);
      caja(G, 2.2, 2.4, 0.1, '#1d2024', 0, 0, d0 / 2 + 0.05); [-3.3, -2.2, 2.2, 3.3].forEach((px, i) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.4), mat(['#c0392b', '#2f6f9e', '#f1bf00', '#2e7d32'][i], { side: THREE.DoubleSide })); p.position.set(px, 1.5, d0 / 2 + 0.07); G.add(p); });
      if (nv >= 2) { caja(G, 6, h0 + 1.6, 6, muro, -w0 / 2 - 2.6, 0, -1.2); caja(G, 6.4, 0.4, 6.4, '#3a2a30', -w0 / 2 - 2.6, h0 + 1.6, -1.2); for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.7), mat(['#2f6f9e', '#2e7d32', '#8e44ad'][i], { emissive: 0x111111 })); p.position.set(-w0 / 2 - 2.6, 1.4 + i * 1.5, 1.82); G.add(p); } }
      return;
    }
    if (tipo === 'taller') {   // taller mecánico: nave con dos puertas de garaje, coche y neumáticos
      caja(G, 8, 4, 6, '#b9bec2', 0, 0, 0); caja(G, 8.4, 0.3, 6.4, '#4a5560', 0, 4, 0); tejado(G, 8, 6, 1.2, '#6b7176', 4.3);
      for (const x of [-2, 2]) { caja(G, 2.6, 2.7, 0.12, '#d9dde0', x, 0, 3.03); for (let k = 0; k < 6; k++) caja(G, 2.5, 0.04, 0.05, '#8a9096', x, 0.4 + k * 0.42, 3.1); }
      const sg = rotulo(M, 'TALLER', '#c0392b'); sg.position.set(0, 3.3, 3.1); G.add(sg);
      for (let i = 0; i < 4; i++) cil(G, 0.4, 0.28, '#1d2024', 3.4, i * 0.28, 4.4, 12); for (let i = 0; i < 2; i++) cil(G, 0.35, 0.9, '#2f6f9e', -3.6 + i * 0.8, 0, 4.4, 10);
      if (GM.kit && GM.kit.coche) { const c = GM.kit.coche('#c0392b', 'turismo'); c.position.set(-1, 0, 5.6); c.rotation.y = 0.3; G.add(c); } else caja(G, 1.8, 1.0, 4, '#c0392b', -1, 0, 5.6);
      if (nv >= 2) { caja(G, 4, 3, 0.1, mat('#8fb3c4', { transparent: true, opacity: 0.5 }), -2.6, 0, -3.05); caja(G, 4, 3, 5, '#d9dde0', -6.4, 0, 0); const sg2 = rotulo(M, 'Concesionario', '#2f6f9e'); sg2.position.set(-6.4, 3.4, 2.55); G.add(sg2); }
      return;
    }
    if (tipo === 'industrial') {   // polígono: nave con cubierta en dientes de sierra, chimeneas, silos y muelle de carga
      caja(G, 14, 6, 9, '#c9ced2', 0, 0, 0);
      for (let i = 0; i < 4; i++) { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(3.5, 0); sh.lineTo(3.5, 1.8); sh.lineTo(0, 0); const g2 = new THREE.ExtrudeGeometry(sh, { depth: 9.4, bevelEnabled: false }); g2.translate(-7 + i * 3.5, 6, -4.7); const m2 = new THREE.Mesh(g2, mat('#6f8793')); m2.castShadow = true; G.add(m2); }
      for (const x of [-5.5, 5.5]) { cil(G, 0.7, 14, '#8a6a5a', x, 0, -2.8, 12); cil(G, 0.8, 0.5, '#d9d4cb', x, 14, -2.8, 12); const hus = []; for (let k = 0; k < 4; k++) { const hu = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), new THREE.MeshStandardMaterial({ color: 0xc5c9cc, transparent: true, opacity: 0.5, depthWrite: false })); hu.userData = { humo: true }; hu.position.set(x, 15, -2.8); G.add(hu); hus.push(hu); } if (anims) anims.push(t => { hus.forEach((h, k) => { const ph = (t * 0.1 + k / 4 + x * 0.05) % 1; h.position.set(x + ph * 4.5, 14.8 + ph * 8, -2.8); h.scale.setScalar(0.5 + ph * 2.4); h.material.opacity = 0.55 * (1 - ph); }); }); }
      for (const x of [-9, -11.4]) { cil(G, 1.4, 7, '#d9dde0', x, 0, -2, 14); const cp = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.4, 14), mat('#b9bec2')); cp.position.set(x, 7.7, -2); G.add(cp); }
      caja(G, 5, 1.1, 3, '#7a7e82', 3, 0, 6.2); caja(G, 2.2, 2.4, 6, '#2f6f9e', 3, 1.1, 8.4); caja(G, 2.2, 2.2, 2, '#e8e2d4', 3, 1.1, 11.8);
      for (let i = 0; i < 5; i++) caja(G, 1.8, 1.2, 1.4, ['#c0392b', '#2f6f9e', '#e1b81c'][i % 3], -6 + (i % 3) * 1.9, (i / 3 | 0) * 1.2, 7.4);
      const sg = rotulo(M, nv >= 3 ? 'Parque ' + (club.siglas || '') : nv >= 2 ? 'Fábrica de balones' : 'Polígono', '#2f6f9e'); sg.scale.setScalar(1.7); sg.position.set(0, 5, 4.58); G.add(sg);
      if (nv >= 3) { caja(G, 6, 7, 5, mat('#8fb3c4', { metalness: 0.6, roughness: 0.15 }), 11, 0, 5); caja(G, 6.4, 0.3, 5.4, '#4a5560', 11, 7, 5); }
      for (let i = 0; i < 12; i++) cil(G, 0.04, 1.4, '#9aa3a8', -8 + i * 1.5, 0, 12.4, 5); caja(G, 18, 0.05, 0.05, '#9aa3a8', 0, 1.3, 12.4);
      return;
    }
    const DEF = {   // [ancho, fondo, plantas base, color de acento]
      bar: [6, 6, 1, c1], tienda: [6, 6, 1, c1], escuela: [7, 6, 1, '#2f6f9e'], ambulatorio: [7, 6, 1, '#c0392b'], polideportivo: [7, 7, 1, c1], hotel: [7, 6, 2, '#7a2f22'],
      pabellon: [7, 7, 2, c1], panaderia: [6, 5, 1, '#c98d4f'], restaurantep: [7, 6, 1, '#7a2f22'], biblioteca: [6, 6, 1, '#3c6e47'], centrodia: [7, 6, 1, '#8a6d3b'], casapadres: [6, 5, 1, null], casaamigos: [6, 5, 1, null], micasa: [7, 6, 2, null]
    }[tipo] || [6, 6, 1, null];
    if (tipo === 'polideportivo' || tipo === 'pabellon') {   // nave con cubierta curva
      const h = 4 + nv * 1.2; caja(G, DEF[0], h, DEF[1], muro, 0, 0, 0);
      const cub = new THREE.Mesh(new THREE.CylinderGeometry(DEF[1] / 2, DEF[1] / 2, DEF[0] + 0.4, 16, 1, false, 0, Math.PI), mat('#6f8793')); cub.rotation.z = Math.PI / 2; cub.position.y = h; G.add(cub);
      [-2.4, -0.8, 0.8, 2.4].forEach(x => caja(G, 0.5, h, 0.06, c1, x, 0, DEF[1] / 2 + 0.03));
      caja(G, 2, 2.4, 0.1, '#2a3440', 0, 0, DEF[1] / 2 + 0.05); const s = rotulo(M, nombre, c1); s.position.set(0, h - 0.8, DEF[1] / 2 + 0.1); G.add(s);
      return;
    }
    const pisos = DEF[2] + (nv - 1);
    bloque(G, M, E, DEF[0], DEF[1], pisos, muro, tipo === 'casapadres' || tipo === 'casaamigos' || tipo === 'micasa' ? null : nombre, DEF[3], r);
    if (tipo === 'micasa' && nv >= 2) { caja(G, 3.2, 0.04, 2, '#3ea6d6', -1.6, 0.02, -3.6); caja(G, 0.08, 2.6, 0.08, '#d0d4d8', 2.4, 0, -4.2); caja(G, 0.9, 0.6, 0.05, '#ffffff', 2.4, 2.6, -4.15); }
    if (tipo === 'panaderia') { caja(G, 0.6, 1.4, 0.6, muro, 1.8, pisos * 3.1, -1.4); cil(G, 0.3, 0.5, '#6b6f73', 1.8, pisos * 3.1 + 1.4, -1.4, 8); for (let i = 0; i < 4; i++) caja(G, 0.3, 0.1, 0.5, ['#c98d4f', '#b87a3a'][i % 2], -1.2 + i * 0.7, 0.9, 3.1); }
    if (tipo === 'restaurantep') for (let i = 0; i < 3; i++) { cil(G, 0.45, 0.75, '#f4f1ea', -2 + i * 2, 0, 4.2, 12); const so = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.4, 10), mat(['#7a2f22', '#c0392b', '#f39c12'][i])); so.position.set(-2 + i * 2, 2.5, 4.2); G.add(so); cil(G, 0.03, 2.4, '#555', -2 + i * 2, 0.75, 4.2, 5); }
    if (GM.kit && GM.kit.coche && ['hotel', 'polideportivo', 'ambulatorio', 'restaurantep'].indexOf(tipo) >= 0 && (!GM.campus || GM.campus.config.calidad === 'alta')) { const co = GM.kit.coche(tipo === 'hotel' ? '#e8e2d4' : tipo === 'ambulatorio' ? '#f4f6f8' : '#2f6f9e', tipo === 'hotel' ? 'taxi' : tipo === 'ambulatorio' ? 'ambulancia' : 'compacto'); co.position.set(DEF[0] / 2 + 2.6, 0, DEF[1] / 2 + 2.2); co.rotation.y = Math.PI / 2 + (r() - 0.5) * 0.15; G.add(co); }
    if (tipo === 'ambulatorio') { caja(G, 0.9, 0.25, 0.06, '#d62d2d', 2.4, pisos * 3.1 - 1, DEF[1] / 2 + 0.06); caja(G, 0.25, 0.9, 0.06, '#d62d2d', 2.4, pisos * 3.1 - 1.33, DEF[1] / 2 + 0.06); }
    if (tipo === 'casapadres' || tipo === 'casaamigos' || tipo === 'micasa') {   // valla y jardín
      [[-3.2, 0, 0.08, 6.6], [3.2, 0, 0.08, 6.6]].forEach(q => caja(G, q[2], 0.9, q[3], '#ffffff', q[0], 0, 0.6));
      if (nv >= 2) for (let i = 0; i < 3; i++) { const copa = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), mat('#4f8f3a')); copa.position.set(-2.4 + i * 2.4, 0.5, 3.3); G.add(copa); }
      if (tipo === 'casapadres' && nv >= 3) caja(G, 2.4, 0.3, 1.4, '#6b4a2b', 2, 0, -3.3);
    }
  }
  // Obra por fases según el avance (0 a 1). grande: con grúa.
  function obra(G, M, E, tipo, nv, prog, club, r, anims) {
    const tierra = caja(G, 7.2, 0.04, 7.2, '#a5875e', 0, 0, 0);
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; cil(G, 0.04, 1.1, '#d9d9d9', Math.cos(a) * 3.6, 0, Math.sin(a) * 3.6, 5); }
    [0, 1, 2, 3].forEach(k => { const b = caja(G, 7.2, 0.12, 0.03, k % 2 ? '#ffffff' : '#e74c3c', 0, 0.85, 0); b.rotation.y = k * Math.PI / 2; b.position.x = k === 1 ? 3.6 : k === 3 ? -3.6 : 0; b.position.z = k === 0 ? 3.6 : k === 2 ? -3.6 : 0; });
    const cartel = rotulo(M, 'Obra: ' + ((GM.mods.pueblo.EDI[tipo] || {}).n || tipo), '#f39c12'); cartel.position.set(-2.4, 1.6, 3.7); cartel.scale.setScalar(0.8); G.add(cartel); cil(G, 0.04, 1.3, '#555', -2.4, 0, 3.7, 5);
    caja(G, 1.2, 0.8, 1.2, '#c9b28a', 2.5, 0, 2.5); caja(G, 0.9, 0.5, 0.9, '#8f8f8f', 2.5, 0.8, 2.5);   // palés y sacos
    if (prog < 0.15) return;
    caja(G, 6, 0.35, 6, '#9da3a8', 0, 0, 0);   // cimientos
    if (prog < 0.35) { for (let i = 0; i < 9; i++) cil(G, 0.03, 1.2, '#7a3b2e', -2.5 + (i % 3) * 2.5, 0.35, -2.5 + Math.floor(i / 3) * 2.5, 4); return; }
    const pisos = Math.max(1, Math.min(3, nv + (tipo === 'hotel' || tipo === 'pabellon' ? 1 : 0))), hP = 3.1, sube = U.clamp((prog - 0.35) / 0.3, 0, 1), alto = Math.max(1, Math.round(pisos * sube));
    for (let p = 0; p < alto; p++) { [[-2.8, -2.8], [2.8, -2.8], [-2.8, 2.8], [2.8, 2.8]].forEach(q => caja(G, 0.35, hP, 0.35, '#b8bcc0', q[0], 0.35 + p * hP, q[1])); caja(G, 6, 0.25, 6, '#a7adb2', 0, 0.35 + (p + 1) * hP - 0.25, 0); }
    if (prog >= 0.65) {   // muros subiendo y andamios
      const f = U.clamp((prog - 0.65) / 0.3, 0, 1), muro = E.muros[0];
      caja(G, 6, alto * hP * f, 0.25, muro, 0, 0.35, -2.9); caja(G, 0.25, alto * hP * f, 6, muro, -2.9, 0.35, 0); caja(G, 0.25, alto * hP * f, 6, muro, 2.9, 0.35, 0); caja(G, 6, alto * hP * f * 0.85, 0.25, muro, 0, 0.35, 2.9);
      for (let p = 0; p < alto; p++) { caja(G, 6.6, 0.08, 0.8, '#c48a2c', 0, 0.35 + (p + 1) * hP - 0.1, 3.5); [-3.2, -1, 1, 3.2].forEach(x => cil(G, 0.04, hP, '#7f8c8d', x, 0.35 + p * hP, 3.85, 5)); }
    }
    if (pisos >= 2 || tipo === 'polideportivo' || tipo === 'pabellon') {   // grúa torre
      const H = 4 + alto * hP + 6; cil(G, 0.25, H, '#f1c40f', -3.2, 0, -3.2, 4);
      const pluma = new THREE.Group(); pluma.position.set(-3.2, H, -3.2); G.add(pluma);
      const brazo = new THREE.Mesh(new THREE.BoxGeometry(11, 0.35, 0.35), mat('#f1c40f')); brazo.position.x = 3.5; pluma.add(brazo);
      const contra = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1, 1), mat('#7f8c8d')); contra.position.x = -2; pluma.add(contra);
      const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 4), mat('#333')); cable.position.set(7, -2, 0); pluma.add(cable);
      const carga = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 0.6), mat('#c48a2c')); carga.position.set(7, -4.2, 0); pluma.add(carga);
      const fase = r() * 6; anims.push(t => { pluma.rotation.y = Math.sin(t * 0.15 + fase) * 1.1; });
    }
  }
  // Pueblo en lo alto de una colina (al estilo de Monteriggioni): muralla ovalada e irregular con dos puertas, calle mayor que
  // serpentea hasta una plaza irregular presidida por la iglesia, callejuelas, y fuera de la muralla una ronda y la carretera donde el
  // pueblo crece (casas y los edificios grandes, como en los pueblos de verdad). Alrededor, laderas con olivares, campos y cipreses
  // que bajan a un valle con río y puente, masías, una ermita y montañas al fondo.
  // Todo se coloca sobre una rejilla de ocupación de 1 m: las parcelas reservan desde el principio su tamaño máximo (con andamios)
  // y buscan sitio sin pisar nada; las casas solo ocupan celdas libres. Si algo no cabe, se anota en S.conflictos.
  const RX = 46, RZ = 38;
  const fW = a => 1 + 0.06 * Math.sin(3 * a + 0.7) + 0.04 * Math.sin(5 * a + 2);   // forma irregular de la muralla
  const muro = a => [Math.cos(a) * RX * fW(a), Math.sin(a) * RZ * fW(a)];
  const fueraDe = (a, off) => { const [x, z] = muro(a), l = Math.hypot(x, z); return [x * (l + off) / l, z * (l + off) / l]; };
  const PS = muro(Math.PI / 2), PN = muro(-Math.PI / 2);                             // puertas sur y norte
  const MES = { cx: 0, cz: 10, rx: 80, rz: 72 };                                     // meseta llana de la colina (se camina por ella)
  const LIM = [-82, -66, 82, 86];
  const PLAZA = [[-12, -6], [-4, -9.5], [8, -9], [12, -2], [11, 6], [2, 9.5], [-8, 8.5], [-13, 1]];
  const enPlaza = (x, z) => { let d = false; for (let i = 0, j = PLAZA.length - 1; i < PLAZA.length; j = i++) { const [xi, zi] = PLAZA[i], [xj, zj] = PLAZA[j]; if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) d = !d; } return d; };
  const ronda = (a0, a1, n, off) => Array.from({ length: n + 1 }, (_, i) => fueraDe(a0 + (a1 - a0) * i / n, off));
  const CALLES = [
    { n: 'Calle Mayor', w: 7, p: [[PS[0], PS[1] - 1], [3, 26], [-2, 17], [1, 9]] },
    { n: 'Calle de la Iglesia', w: 6, p: [[1, -9], [4, -18], [1, -27], [PN[0], PN[1] + 1]] },
    { n: 'Carrer de Llevant', w: 5.4, p: [[12, -2], [21, -7], [30, -2], [30, 11], [19, 21], [3, 26]] },
    { n: 'Carrer de Ponent', w: 5.4, p: [[-13, 1], [-23, -5], [-30, -14], [-22, -24], [-8, -27], [1, -27]] },
    { n: 'Callejón del Horno', w: 4.6, p: [[-2, 17], [-14, 22], [-26, 14], [-30, 3], [-23, -5]] },
    // Extramuros: carretera desde la puerta sur y las rondas que bordean la muralla
    { n: 'Carretera', w: 6, fuera: true, p: [[PS[0], PS[1] + 1], [PS[0] + 3, PS[1] + 14], [PS[0] - 2, PS[1] + 30]] },
    { n: 'Ronda de Levante', w: 5.5, fuera: true, p: [[PS[0] + 1, PS[1] + 9]].concat(ronda(Math.PI / 2 - 0.25, -0.35, 6, 10)) },
    { n: 'Ronda de Poniente', w: 5.5, fuera: true, p: [[PS[0] - 1, PS[1] + 9]].concat(ronda(Math.PI / 2 + 0.25, Math.PI + 0.35, 6, 10)) },
    { n: 'Camino del norte', w: 4.5, fuera: true, p: [[PN[0], PN[1] - 1], [PN[0] - 4, PN[1] - 12]] }
  ];
  // Parcelas: [tipo, x, z, ancho, fondo, fuera de la muralla]. Buscan el hueco más cercano con el frente a una calle.
  const pFuera = (a, off) => fueraDe(a, off);
  const LOTES = [
    ['escuela', 13, -17, 9, 8], ['canasta', 15, -28, 10, 7], ['ambulatorio', 27, -15, 9, 8], ['tienda', 10, 17, 8, 7],
    ['parque', -19, 9, 11, 9], ['bar', -9, 14, 7, 7], ['biblioteca', -18, -13, 8, 7], ['centrodia', 28, -27, 9, 7],
    ['casapadres', -14, 31, 9, 8], ['casaamigos', 36, -20, 8, 8], ['micasa', -33, -19, 9, 8],
    ['polideportivo'].concat(pFuera(Math.PI / 2 - 0.75, 18), [12, 10, true]), ['pabellon'].concat(pFuera(Math.PI / 2 + 0.75, 18), [12, 12, true]),
    ['hotel'].concat(pFuera(-0.05, 17), [9, 9, true]),
    ['cine', -27, 18, 10, 9], ['panaderia', 4, 25, 7, 6], ['restaurantep'].concat(pFuera(Math.PI / 2 + 0.32, 15), [8, 7, true]),
    ['taller'].concat(pFuera(0.5, 14), [10, 8, true]), ['industrial'].concat(pFuera(-0.62, 36), [18, 13, true])   // el polígono, un poco apartado
  ];
  // Relieve: llano en la meseta y, fuera, laderas que bajan a un valle; montañas al fondo
  function hash2(x, z) { let h = (Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return (h ^ (h >>> 16)) / 4294967296; }
  function ruido(x, z) { const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi, s = t => t * t * (3 - 2 * t), u = s(fx), v = s(fz); return (hash2(xi, zi) * (1 - u) + hash2(xi + 1, zi) * u) * (1 - v) + (hash2(xi, zi + 1) * (1 - u) + hash2(xi + 1, zi + 1) * u) * v; }
  const dMes = (x, z) => Math.hypot((x - MES.cx) / MES.rx, (z - MES.cz) / MES.rz);
  function altura(x, z) {
    const d = dMes(x, z); if (d < 1) return 0;
    const t = d - 1, a = Math.atan2(z - MES.cz, x - MES.cx);
    let h = -Math.min(26, Math.pow(t * 2.2, 1.35) * 22 * (1 + 0.2 * Math.sin(a * 3 + 1)));
    h += Math.max(0, d - 2.7) ** 2 * 26 + Math.max(0, d - 2.7) * ruido(x * 0.02, z * 0.02) * 40;   // montañas
    return h + (ruido(x * 0.045, z * 0.045) - 0.5) * 5 * Math.min(1, t * 4);
  }
  // Rejilla de ocupación (1 m): 0 libre, 1 calle o plaza, 2 parcela o monumento, 3 casa, 4 muralla, 5 árbol o farola
  function ocupacion() {
    const x0 = LIM[0], z0 = LIM[1], W = LIM[2] - x0, H = LIM[3] - z0, b = new Uint8Array(W * H);
    const enRect = (r, px, pz) => { const dx = px - r.x, dz = pz - r.z, c = Math.cos(r.ry || 0), s = Math.sin(r.ry || 0), u = dx * c - dz * s, v = dx * s + dz * c; return Math.abs(u) <= r.w / 2 && Math.abs(v) <= r.d / 2; };
    const celdas = (r, fn) => { const R = Math.hypot(r.w, r.d) / 2 + 1; for (let j = Math.floor(r.z - R - z0); j <= Math.ceil(r.z + R - z0); j++) for (let i = Math.floor(r.x - R - x0); i <= Math.ceil(r.x + R - x0); i++) { if (i < 0 || j < 0 || i >= W || j >= H) { if (fn(-1) === false) return false; continue; } if (enRect(r, x0 + i + 0.5, z0 + j + 0.5) && fn(j * W + i) === false) return false; } return true; };
    const radio = (px, pz) => { const a = Math.atan2(pz / RZ, px / RX), m = muro(a); return [Math.hypot(px, pz), Math.hypot(m[0], m[1])]; };
    return {
      libre: (r, ok) => celdas(r, k => k >= 0 && (b[k] === 0 || !!(ok && ok.indexOf(b[k]) >= 0))),
      quien: r => { const v = new Set(); celdas(r, k => { if (k >= 0 && b[k]) v.add(b[k]); }); return v; },
      marca: (r, val) => celdas(r, k => { if (k >= 0) b[k] = val; }),
      punto: (px, pz, val) => { const i = Math.floor(px - x0), j = Math.floor(pz - z0); if (i >= 0 && j >= 0 && i < W && j < H) { if (val !== undefined) b[j * W + i] = val; return b[j * W + i]; } return 4; },
      datos: () => ({ b, W, H, x0, z0 }),
      dentro: (px, pz) => { const [d, m] = radio(px, pz); return d < m - 2.5; },
      fuera: (px, pz) => { const [d, m] = radio(px, pz); return d > m + 3 && dMes(px, pz) < 0.95; }
    };
  }
  // Polilínea como cinta de suelo (calles y caminos); alt: altura del terreno en cada punto
  function cinta(W, pts, w, m, alt) {
    const pos = [], idx = []; let k = 0, y0 = w < 0.6 ? 0.03 : 0.012; const y = (x, z) => (alt ? alt(x, z) : 0) + y0;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], l = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / l * w / 2, nz = (bx - ax) / l * w / 2;
      pos.push(ax + nx, y(ax + nx, az + nz), az + nz, ax - nx, y(ax - nx, az - nz), az - nz, bx + nx, y(bx + nx, bz + nz), bz + nz, bx - nx, y(bx - nx, bz - nz), bz - nz); idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); k += 4;
      if (!alt) { const gd = new THREE.CircleGeometry(w / 2, 14).rotateX(-Math.PI / 2), pd = gd.attributes.position, ud = gd.attributes.uv; for (let q = 0; q < pd.count; q++) ud.setXY(q, (pd.getX(q) + bx) / 3, (pd.getZ(q) + bz) / 3); const disco = new THREE.Mesh(gd, m); disco.position.set(bx, 0.013, bz); W.add(disco); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const uv = []; for (let i = 0; i < pos.length; i += 3) uv.push(pos[i] / 3, pos[i + 2] / 3); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    const me = new THREE.Mesh(g, m); me.receiveShadow = true; W.add(me);
  }
  function detalle(W, x, z, ry, q) {
    const k = q(), g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; W.add(g);
    if (k < 0.4) [-0.6, 0.6].forEach(dx => { cil(g, 0.28, 0.45, '#b4643d', dx, 0, 0, 8, 0.34); const p = new THREE.Mesh(new THREE.SphereGeometry(0.32, 7, 5), mat(['#c0392b', '#e84393', '#4f8f3a'][(q() * 3) | 0])); p.position.set(dx, 0.62, 0); g.add(p); });
    else if (k < 0.7) caja(g, 1.6, 0.45, 0.5, '#a39380', 0, 0, 0);
    else [-0.4, 0.4].forEach(dx => cil(g, 0.3, 0.8, '#6b4a2b', dx, 0, 0, 10));
  }
  function bordillos(W, pts, w, m, fuera) {
    for (const s of [-1, 1]) { let tramo = [];
      const corta = () => { if (tramo.length > 1) cinta(W, tramo, 0.45, m); tramo = []; };
      for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], l = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / l, nz = (bx - ax) / l;
        for (let t = 0; t <= l; t += 1) { const x = ax + (bx - ax) * t / l + nx * s * (w / 2 + 0.1), z = az + (bz - az) * t / l + nz * s * (w / 2 + 0.1); if (fuera(x, z)) corta(); else tramo.push([x, z]); }
        corta(); }
    }
  }
  function aLoLargo(paso, fn) {
    CALLES.forEach((c, ci) => { for (let i = 0; i < c.p.length - 1; i++) { const [ax, az] = c.p[i], [bx, bz] = c.p[i + 1], l = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / l, tz = (bz - az) / l; for (let d = paso / 2; d < l; d += paso) fn(ax + tx * d, az + tz * d, tx, tz, c, ci); } });
  }
  function calleCercana(x, z) {
    let best = null; CALLES.forEach(c => { for (let i = 0; i < c.p.length - 1; i++) { const [ax, az] = c.p[i], [bx, bz] = c.p[i + 1], dx = bx - ax, dz = bz - az, t = U.clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1), px = ax + dx * t, pz = az + dz * t, d = Math.hypot(x - px, z - pz); if (!best || d < best.d) best = { d, px, pz, w: c.w }; } });
    PLAZA.forEach(([px, pz]) => { const d = Math.hypot(x - px, z - pz); if (d < best.d) best = { d, px, pz, w: 0 }; });
    return best;
  }
  function arbol(W, x, z, tipo, r, y0) {
    const y = y0 || 0;
    if (tipo !== 'ciprés' && ESCRITORIO()) { cil(W, 0.12, 0.02, '#5b4632', x, y, z, 5); SUELTOS.push([x, y, z, 1 + r() * 0.4]); return; }   // en el escritorio, árbol real al poblar
    if (tipo === 'ciprés') { cil(W, 0.15, 1, '#5b4632', x, y, z, 5); const c = new THREE.Mesh(new THREE.ConeGeometry(0.9 + r() * 0.3, 6 + r() * 3, 8), mat('#2f4a2c')); c.position.set(x, y + 4.2, z); c.castShadow = true; W.add(c); return; }
    // Copa de varias masas de hojas con matices distintos (se mecen con el viento) sobre un tronco que se ensancha
    cil(W, 0.26, 1.8, '#6e5a44', x, y, z, 6, 0.12 + r() * 0.05); const verdes = tipo === 'olivo' ? ['#7d8f62', '#8a9d6c', '#6f8355'] : ['#4f7d3a', '#5d8c41', '#456f33', '#6a9a48'];
    for (let k = 0; k < (tipo === 'olivo' ? 5 : 4); k++) { const m2 = mat(verdes[k % verdes.length], { roughness: 1 }); if (!m2.userData.viento && GM.kit.viento) { GM.kit.viento(m2, 'copa'); m2.userData.viento = true; } const c = new THREE.Mesh(new THREE.IcosahedronGeometry((tipo === 'olivo' ? 0.85 : 1.0) + r() * 0.5, 1), m2); const ang = r() * 6.28, rad = k ? 0.7 + r() * 0.5 : 0; c.scale.y = 0.8; c.position.set(x + Math.cos(ang) * rad, y + 2.2 + (k ? 0.3 + r() * 0.9 : 0.4), z + Math.sin(ang) * rad); c.castShadow = true; W.add(c); }
  }
  // Muchos árboles del campo en dos mallas instanciadas (tronco y copa): olivos en hileras y cipreses
  function bosque(W, lista, tipo) {
    if (!lista.length) return; const n = lista.length, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    const tronco = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.25, 1.6, 5), mat('#6e5a44'), n), copa = new THREE.InstancedMesh(tipo === 'ciprés' ? new THREE.ConeGeometry(1, 7, 7) : new THREE.SphereGeometry(1.5, 7, 5), mat(tipo === 'ciprés' ? '#2f4a2c' : '#7d8f62'), n);
    lista.forEach(([x, y, z, e], i) => { s.set(1, 1, 1); p.set(x, y + 0.8, z); m4.compose(p, q, s); tronco.setMatrixAt(i, m4); s.set(e, tipo === 'ciprés' ? e : e * 0.75, e); p.set(x, y + (tipo === 'ciprés' ? 4.2 : 2.2) * e, z); m4.compose(p, q, s); copa.setMatrixAt(i, m4); });
    tronco.userData = { instancias: true }; copa.userData = { instancias: true }; copa.castShadow = true; W.add(tronco, copa);
    if (tipo !== 'ciprés') BOSQUES.push({ tronco, copa, lista });
  }
  let BOSQUES = [], SUELTOS = [];
  const ESCRITORIO = () => typeof location !== 'undefined' && location.protocol === 'app:' && (!GM.campus || GM.campus.config.calidad === 'alta');
  // Casa con personalidad: alturas, colores, balcones, macetas, chimeneas, esquinas de piedra y, en las calles principales, tiendas
  function casa(W, M, E, x, z, ry, w, d, pisos, r, club, comercio, y0) {
    let g = new THREE.Group(); g.position.set(x, y0 || 0, z); g.rotation.y = ry; W.add(g);
    const muroC = E.muros[(r() * E.muros.length) | 0], W0 = w, split = !!GM.casasReal && w >= 5.8 && r() < 0.5, wm = split ? w * 0.62 : w, gm = new THREE.Group(); gm.position.x = split ? -W0 / 2 + wm / 2 : 0; g.add(gm); w = wm;
    const h = bloque(gm, M, E, wm, d, pisos, muroC, null, comercio ? [club.colores[0], '#7a2f22', '#2f6f9e', '#3c6e47', '#c0392b'][(r() * 5) | 0] : null, r);
    if (split) { const ga = new THREE.Group(); ga.position.set(W0 / 2 - (W0 - wm) / 2, 0, -0.175); g.add(ga); bloque(ga, M, E, W0 - wm, d - 0.35, Math.max(1, pisos - 1), muroC, null, null, r, { puerta: false }); }
    const g0 = g; g = gm; void g0;
    // Balcones con losa, barandilla de forja y macetas
    for (let p = 1; p < pisos; p++) if (r() < 0.6) { const bw = Math.min(w - 1.2, 2 + r() * 1.6), by = p * 3.1 + 0.42, bx = (r() - 0.5) * Math.max(0, w - bw - 1); if (GM.casasReal && GM.casasReal.balconCurvo && r() < 0.5) { GM.casasReal.balconCurvo(g, bx, by, bw, d / 2, r); continue; } caja(g, bw, 0.12, 0.8, '#b9ad98', bx, by, d / 2 + 0.4); caja(g, bw, 0.05, 0.05, '#2a2f35', bx, by + 1.0, d / 2 + 0.78); caja(g, 0.05, 1.0, 0.8, '#2a2f35', bx - bw / 2 + 0.03, by, d / 2 + 0.4); caja(g, 0.05, 1.0, 0.8, '#2a2f35', bx + bw / 2 - 0.03, by, d / 2 + 0.4); for (let k = 0; k * 0.2 < bw; k++) caja(g, 0.025, 1.0, 0.025, '#2a2f35', bx - bw / 2 + 0.1 + k * 0.2, by, d / 2 + 0.78);
      for (let k = 0; k < 3; k++) { cil(g, 0.1, 0.18, '#b4643d', bx - bw / 3 + k * bw / 3, by + 0.12, d / 2 + 0.68, 7); const fl = new THREE.Mesh(new THREE.SphereGeometry(0.13, 7, 5), mat(['#c0392b', '#e84393', '#f39c12', '#f4f1ea'][(r() * 4) | 0])); fl.position.set(bx - bw / 3 + k * bw / 3, by + 0.4, d / 2 + 0.68); g.add(fl); } }
    if (GM.kit && GM.kit.gato && r() < 0.14) { const gt = GM.kit.gato(['#3b3b3b', '#c98d4f', '#f2efe8', '#7a6a5a'][(r() * 4) | 0]); gt.position.set(-w / 4 + r() * w / 2, h + (1.6 + w * 0.06) * 0.55, 0.1); gt.rotation.y = r() * 6.28; g.add(gt); }
    if (r() * 100 < (club.cariñoPueblo || 40) * 0.6) { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), mat(r() < 0.5 ? club.colores[0] : club.colores[1] || '#fff', { side: THREE.DoubleSide })); f.position.set(-w / 4, Math.min(h - 0.8, 4.2), d / 2 + 0.35); g.add(f); }
    return g0;
  }
  function muralla(W, G, O, E, nivel, club) {
    const piedra = mat(E.clave === 'toscano' ? '#b4724a' : E.clave === 'andaluz' ? '#ece6da' : '#a99377'); if (GM.texturas) GM.texturas.aplicar(piedra, E.clave === 'andaluz' ? 'Plaster003' : 'Bricks085', E.clave === 'andaluz' ? { color: false, escala: 2, relieve: 1 } : { color: false, escala: 1.4, relieve: 1.3 });
    const N = 84, alto = 5.5 + Math.min(2, nivel * 0.4);
    const puerta = am => Math.abs(am - Math.PI / 2) < 0.07 || Math.abs(am - 3 * Math.PI / 2) < 0.08;
    for (let i = 0; i < N; i++) {
      const a = i / N * Math.PI * 2, b = (i + 1) / N * Math.PI * 2, am = (a + b) / 2, pa = muro(a), pb = muro(b); if (puerta(am)) continue;
      const x = (pa[0] + pb[0]) / 2, z = (pa[1] + pb[1]) / 2, l = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) + 0.2, ang = Math.atan2(pb[1] - pa[1], pb[0] - pa[0]);
      caja(W, l, alto, 1.4, piedra, x, 0, z, -ang); [-0.3, 0.3].forEach(k => { const al = caja(W, 0.7, 0.7, 1.4, piedra, x, alto, z, -ang); al.translateX(k * l); });
      O.marca({ x, z, w: l, d: 2.4, ry: -ang }, 4); for (let t = 0; t <= 1.001; t += 0.125) { const bx = pa[0] + (pb[0] - pa[0]) * t, bz = pa[1] + (pb[1] - pa[1]) * t; G.bloquea(bx - 0.9, bz - 0.9, bx + 0.9, bz + 0.9); }
      if (i % 9 === 4) {
        cil(W, 2.3, alto + 2.6, piedra, x, 0, z, 12); if (GM.curvas) GM.curvas.almenasTorre(W, x, z, alto, piedra); if (E.torre !== 'almenada') { const c = new THREE.Mesh(new THREE.ConeGeometry(2.7, 2.6, 12), mat(E.teja)); c.position.set(x, alto + 3.9, z); W.add(c); }
        if (nivel >= 3) { const st = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 3), mat(club.colores[0], { side: THREE.DoubleSide })); const l2 = Math.hypot(x, z); st.position.set(x * (l2 + 2.35) / l2, alto - 0.5, z * (l2 + 2.35) / l2); st.lookAt(x * 2, alto - 0.5, z * 2); W.add(st); }   // estandartes del club
        O.marca({ x, z, w: 5.5, d: 5.5 }, 4); G.bloquea(x - 2.3, z - 2.3, x + 2.3, z + 2.3);
      }
    }
    [PS, PN].forEach(([px, pz]) => { [-3.6, 3.6].forEach(dx => { cil(W, 2.1, alto + 3.2, piedra, px + dx, 0, pz, 12); O.marca({ x: px + dx, z: pz, w: 4.6, d: 4.6 }, 4); G.bloquea(px + dx - 2.1, pz - 2.1, px + dx + 2.1, pz + 2.1); }); if (GM.curvas) GM.curvas.puertaMuralla(W, piedra, px, pz, alto); else caja(W, 5.2, 1.6, 1.6, piedra, px, alto - 0.3, pz); });
  }
  // El entorno: ladera, campos, río con puente, carretera que baja, olivares, cipreses, masías, ermita y montañas
  function entorno(W, M, E, r, carr, anims, S) {
    const conTextura = !!(GM.texturas && GM.texturas.listo && GM.texturas.listo()), CLARO = new THREE.Color(0xf4f6e8);
    const T = 420, N = 140, g = new THREE.PlaneGeometry(T, T, N, N).rotateX(-Math.PI / 2), pos = g.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
    const verde = new THREE.Color('#7f9a52'), seco = new THREE.Color('#c2ae6a'), oscuro = new THREE.Color('#5e7a3e'), tierra = new THREE.Color(E.tierra || '#a88f62'), agua = new THREE.Color('#6f9a6a');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = altura(x, z), d = dMes(x, z); pos.setY(i, d < 1 ? -0.04 : y);
      const campo = ruido(x * 0.035 + 3, z * 0.035) , franja = Math.floor((x * 0.7 + z * 0.4) / 9) % 3;
      if (d < 1) c.copy(tierra).lerp(verde, 0.35); else if (y < -22) c.copy(agua); else c.copy(campo > 0.62 ? seco : campo > 0.42 ? verde : oscuro).lerp(franja === 0 ? seco : verde, 0.18);
      if (y > 18) c.lerp(new THREE.Color('#8c8a86'), U.clamp((y - 18) / 30, 0, 0.8));   // roca en las cumbres
      if (conTextura) c.lerp(CLARO, 0.42);   // el color de vértice tiñe la hierba real (si no, quedaría oscura)
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
    const suelo = new THREE.Mesh(g, (() => { const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }); if (conTextura) GM.texturas.aplicar(m, 'Grass004', { escala: 7, tinte: 0xf2f4e0, relieve: 0.9, rugMin: 0.75 }); return m; })()); suelo.receiveShadow = true; suelo.userData = { terreno: true }; W.add(suelo);
    // Río en el fondo del valle (al sur) y puente de piedra donde cruza la carretera
    const rioZ = x => MES.cz + MES.rz * 1.62 + Math.sin(x * 0.02) * 10, rio = [];
    for (let x = -210; x <= 210; x += 12) rio.push([x, rioZ(x)]);
    { const ond = M.textura('rio-ondas', 128, (x, n) => { x.fillStyle = '#3f86a6'; x.fillRect(0, 0, n, n); const rr = rnd(5); for (let i = 0; i < 70; i++) { x.strokeStyle = 'rgba(255,255,255,' + (0.08 + rr() * 0.22) + ')'; x.lineWidth = 1 + rr() * 2; const px = rr() * n, py = rr() * n; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + 10 + rr() * 14, py + (rr() - 0.5) * 8, px + 26 + rr() * 22, py + (rr() - 0.5) * 6); x.stroke(); } });
      if (ond) { ond.wrapS = ond.wrapT = THREE.RepeatWrapping; if (anims) anims.push(t => { ond.offset.set(t * 0.012, t * 0.03); }); }
      cinta(W, rio, 9, new THREE.MeshStandardMaterial({ map: ond || null, color: ond ? 0xffffff : 0x4f8fb5, roughness: 0.12, metalness: 0.15, transparent: true, opacity: 0.92 }), () => -24.4); }
    // Carretera que baja serpenteando hasta el puente
    const ini = CALLES.find(c => c.n === 'Carretera').p, ult = ini[ini.length - 1], baja = [ult];
    for (let k = 1; k <= 36; k++) { const t = k / 36, zz = ult[1] + (rioZ(0) + 14 - ult[1]) * t, xx = ult[0] + Math.sin(t * 5.5) * 16 * (1 - t * 0.4); baja.push([xx, zz]); }
    cinta(W, baja, carr ? 6 : 4.5, carr ? mat('#4b5058') : mat('#a5875e'), (x, z) => Math.max(-24, altura(x, z)) + 0.45);
    const pz = rioZ(baja[baja.length - 1][0]), px = baja[baja.length - 1][0] - 2, piedra = mat('#a99377');
    caja(W, 7, 1, 16, piedra, px, -23.6, pz); [-5, 0, 5].forEach(dz => { const arco = new THREE.Mesh(new THREE.TorusGeometry(2, 0.6, 6, 12, Math.PI), piedra); arco.position.set(px, -24.4, pz + dz); arco.rotation.y = Math.PI / 2; W.add(arco); });
    const cip = []; baja.forEach(([x, z], i) => { if (i % 3 === 0) [-4.5, 4.5].forEach(s => cip.push([x + s, Math.max(-24, altura(x + s, z)), z, 0.9 + r() * 0.3])); }); bosque(W, cip, 'ciprés');
    // Olivares en hileras por las laderas y cipreses sueltos
    const olivos = [], sueltos = [];
    for (let k = 0; k < 16; k++) { const a = r() * 6.28, d = 1.25 + r() * 0.6, cx = MES.cx + Math.cos(a) * MES.rx * d, cz = MES.cz + Math.sin(a) * MES.rz * d, ang = r() * 3; if (Math.abs(cx - baja[3][0]) < 14 && cz > MES.cz) continue;
      for (let i = 0; i < 6; i++) for (let j = 0; j < 7; j++) { const x = cx + Math.cos(ang) * (i - 3) * 6 - Math.sin(ang) * (j - 3) * 6, z = cz + Math.sin(ang) * (i - 3) * 6 + Math.cos(ang) * (j - 3) * 6, y = altura(x, z); if (dMes(x, z) < 1.08 || y < -23) continue; olivos.push([x, y, z, 0.8 + r() * 0.35]); } }
    for (let k = 0; k < 90; k++) { const a = r() * 6.28, d = 1.06 + r() * 1.3, x = MES.cx + Math.cos(a) * MES.rx * d, z = MES.cz + Math.sin(a) * MES.rz * d, y = altura(x, z); if (y < -23) continue; sueltos.push([x, y, z, 0.8 + r() * 0.5]); }
    bosque(W, olivos, 'olivo'); bosque(W, sueltos, 'ciprés');
    detallesCampo(W, M, E, r, anims);
    // Masías dispersas por las laderas y una ermita en el cerro de enfrente
    for (let k = 0; k < 9; k++) { const a = r() * 6.28, d = 1.35 + r() * 0.9, x = MES.cx + Math.cos(a) * MES.rx * d, z = MES.cz + Math.sin(a) * MES.rz * d, y = altura(x, z); if (y < -21) continue; const gm = new THREE.Group(); gm.position.set(x, y - 0.3, z); gm.rotation.y = r() * 6; W.add(gm); bloque(gm, M, E, 8, 6, 2, E.muros[(r() * E.muros.length) | 0], null, null, r); caja(gm, 5, 2.5, 4, E.muros[0], 6, 0, 1); }
    { const a = -0.9, d = 2.15, x = MES.cx + Math.cos(a) * MES.rx * d, z = MES.cz + Math.sin(a) * MES.rz * d, y = altura(x, z), ge = new THREE.Group(); ge.position.set(x, y - 0.2, z); ge.rotation.y = 2.4; W.add(ge);
      caja(ge, 6, 6, 9, '#ece4d4', 0, 0, 0); tejado(ge, 6, 9, 2.5, E.teja, 6); caja(ge, 2, 9, 2, '#ece4d4', 0, 0, -4); const cr = caja(ge, 0.2, 1.4, 0.2, '#555', 0, 9, -4); void cr; for (let i = 0; i < 4; i++) arbol(ge, -4 + i * 2.6, 6.5, 'ciprés', r); }
  }
  // Matas de hierba que se mecen, flores silvestres, rocas, viñedos con sus rodrigones, pacas y muretes de piedra seca por las laderas
  function detallesCampo(W, M, E, r, anims) {
    const T = THREE, m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3(), p = new T.Vector3(), col = new T.Color();
    const sitio = (dmin, dmax, fn) => { for (let k = 0; k < 60; k++) { const a = r() * 6.283, d = dmin + r() * (dmax - dmin), x = MES.cx + Math.cos(a) * MES.rx * d, z = MES.cz + Math.sin(a) * MES.rz * d, y = altura(x, z); if (y > -22.5 && y < 14) return fn(x, y, z, a); } return null; };
    // Matas de hierba (dos planos cruzados con briznas pintadas)
    const bl = M.textura('hierba-matas', 128, (x, n) => { const rr = rnd(9); for (let i = 0; i < 16; i++) { const bx = 8 + rr() * (n - 16), h = 40 + rr() * 80, g = x.createLinearGradient(0, n, 0, n - h); g.addColorStop(0, '#3d5a22'); g.addColorStop(1, ['#9cb85a', '#b7c96a', '#7fa046'][i % 3]); x.strokeStyle = g; x.lineWidth = 2 + rr() * 2.4; x.lineCap = 'round'; x.beginPath(); x.moveTo(bx, n); x.quadraticCurveTo(bx + (rr() - 0.5) * 16, n - h * 0.5, bx + (rr() - 0.5) * 30, n - h); x.stroke(); } });
    if (bl) { const mm = new T.MeshStandardMaterial({ map: bl, transparent: true, alphaTest: 0.45, side: T.DoubleSide, roughness: 1 }); if (GM.kit.viento) GM.kit.viento(mm, 'copa');
      const geo = new T.PlaneGeometry(1.1, 0.9).translate(0, 0.45, 0), N = 1700;
      [0, Math.PI / 2].forEach(ry => { const im = new T.InstancedMesh(geo, mm, N); let k = 0; for (let i = 0; i < N * 3 && k < N; i++) { sitio(0.96, 1.9, (x, y, z) => { e.set(0, ry + r() * 0.5, 0); q.setFromEuler(e); s.setScalar(0.7 + r() * 1.0); p.set(x, y, z); m4.compose(p, q, s); im.setMatrixAt(k++, m4); }); } im.count = k; im.userData = { instancias: true }; im.receiveShadow = false; W.add(im); }); }
    // Flores silvestres
    { const N = 520, fg = new T.SphereGeometry(0.09, 5, 4), im = new T.InstancedMesh(fg, new T.MeshStandardMaterial({ roughness: 0.8 }), N); let k = 0; const pal = ['#f4f1e8', '#f1c40f', '#e84393', '#c0392b', '#9b59b6', '#ffffff']; for (let i = 0; i < N * 2 && k < N; i++) sitio(0.98, 1.7, (x, y, z) => { s.setScalar(0.8 + r() * 0.9); p.set(x, y + 0.28, z); q.identity(); m4.compose(p, q, s); im.setMatrixAt(k, m4); im.setColorAt(k, col.set(pal[(r() * pal.length) | 0])); k++; }); im.count = k; im.userData = { instancias: true }; W.add(im); }
    // Rocas
    { const N = 80, im = new T.InstancedMesh(new T.IcosahedronGeometry(0.6, 0), mat('#8d8a82', { roughness: 1 }), N); let k = 0; for (let i = 0; i < N * 2 && k < N; i++) sitio(1.02, 2.1, (x, y, z) => { e.set(r() * 3, r() * 3, r() * 3); q.setFromEuler(e); s.set(0.6 + r() * 1.6, 0.4 + r() * 0.9, 0.6 + r() * 1.4); p.set(x, y + 0.1, z); m4.compose(p, q, s); im.setMatrixAt(k++, m4); }); im.count = k; im.castShadow = true; im.userData = { instancias: true }; W.add(im); }
    // Viñedos: filas de rodrigones con cepas
    { const posts = [], bush = [];
      for (let v = 0; v < 6; v++) sitio(1.12, 1.6, (cx, cy, cz, a) => { const ang = r() * 3.14, cs = Math.cos(ang), sn = Math.sin(ang); for (let i = 0; i < 9; i++) for (let j = 0; j < 16; j++) { const lx = (i - 4) * 2.4, lz = (j - 8) * 1.6, x = cx + lx * cs - lz * sn, z = cz + lx * sn + lz * cs, y = altura(x, z); if (y < -22 || dMes(x, z) < 1.06) continue; posts.push([x, y, z]); bush.push([x, y, z]); } });
      const ps = new T.InstancedMesh(new T.CylinderGeometry(0.03, 0.04, 1.2, 4), mat('#6b4a2b'), posts.length || 1), bs = new T.InstancedMesh(new T.IcosahedronGeometry(0.42, 1), mat('#5f8f3a', { roughness: 1 }), bush.length || 1);
      posts.forEach(([x, y, z], i) => { q.identity(); s.setScalar(1); p.set(x, y + 0.6, z); m4.compose(p, q, s); ps.setMatrixAt(i, m4); s.set(1, 0.8, 1.2); p.set(x, y + 0.5, z); m4.compose(p, q, s); bs.setMatrixAt(i, m4); });
      ps.userData = { instancias: true }; bs.userData = { instancias: true }; bs.castShadow = false; W.add(ps, bs); }
    // Pacas de paja y muretes de piedra seca
    { const N = 26, im = new T.InstancedMesh(new T.CylinderGeometry(0.6, 0.6, 1.1, 12).rotateZ(Math.PI / 2), mat('#d6b45a', { roughness: 1 }), N); let k = 0; for (let i = 0; i < N * 2 && k < N; i++) sitio(1.1, 1.7, (x, y, z) => { e.set(0, r() * 3, 0); q.setFromEuler(e); s.setScalar(1); p.set(x, y + 0.6, z); m4.compose(p, q, s); im.setMatrixAt(k++, m4); }); im.count = k; im.userData = { instancias: true }; W.add(im); }
    { const piedra = mat('#9b9285', { roughness: 1 }); if (GM.texturas) GM.texturas.aplicar(piedra, 'Bricks085', { color: false, escala: 1.2, relieve: 1 }); const N = 260, im = new T.InstancedMesh(new T.BoxGeometry(1.2, 0.7, 0.5), piedra, N); let k = 0;
      for (let t = 0; t < 14 && k < N - 20; t++) sitio(1.08, 1.7, (x0, y0, z0) => { const ang = r() * 3.14, L = 10 + (r() * 8 | 0); for (let i = 0; i < L && k < N; i++) { const x = x0 + Math.cos(ang) * i * 1.15, z = z0 + Math.sin(ang) * i * 1.15, y = altura(x, z); if (y < -22 || dMes(x, z) < 1.05) continue; e.set(0, -ang + (r() - 0.5) * 0.12, 0); q.setFromEuler(e); s.set(1, 0.9 + r() * 0.5, 1); p.set(x, y + 0.3, z); m4.compose(p, q, s); im.setMatrixAt(k++, m4); } });
      im.count = k; im.castShadow = true; im.userData = { instancias: true }; W.add(im); }
  }
  // Nubes que pasan despacio (sprites suaves) y cielo físico con el sol según la hora (la luz y la niebla las lleva aplicarAmbiente)
  function cielo(S, M) {
    const W = S.mundo, T = THREE;
    // Cúpula de cielo con degradado del horizonte (el color de la niebla) al cénit, disco y halo del sol que siguen la hora
    { const u = { zenit: { value: new T.Color(0x2c6cb4) }, horiz: { value: new T.Color(0xb2cce2) }, solDir: { value: new T.Vector3(0.5, 0.5, 0.5) }, solCol: { value: new T.Color(0xfff2d0) } };
      const mat2 = new T.ShaderMaterial({ uniforms: u, side: T.BackSide, depthWrite: false, fog: false, vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: [
          'uniform vec3 zenit; uniform vec3 horiz; uniform vec3 solDir; uniform vec3 solCol; varying vec3 vD;',
          'void main(){ float h = clamp(vD.y, 0.0, 1.0); vec3 c = mix(horiz, zenit, pow(smoothstep(0.0, 0.62, h), 0.8)); float s = max(dot(normalize(vD), normalize(solDir)), 0.0);',
          'c += solCol * (pow(s, 900.0) * 3.0 + pow(s, 14.0) * 0.28 + pow(s, 3.0) * 0.07); gl_FragColor = vec4(c, 1.0);',
          '#include <tonemapping_fragment>', '#include <colorspace_fragment>', '}'].join(String.fromCharCode(10)) });
      const sky = new T.Mesh(new T.SphereGeometry(1300, 32, 16), mat2); sky.userData = { cielo: true }; sky.frustumCulled = false; sky.renderOrder = -10; W.add(sky); S.cieloU = u; }
    const tx = M.textura('nube-suave', 256, (x, n) => { const rr = rnd(21); x.clearRect(0, 0, n, n); for (let i = 0; i < 26; i++) { const cx = n * (0.18 + rr() * 0.64), cy = n * (0.4 + rr() * 0.2), rad = n * (0.1 + rr() * 0.16), g = x.createRadialGradient(cx, cy, 0, cx, cy, rad); g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rad, 0, 6.3); x.fill(); } });
    const nubes = []; if (tx) { const rr = rnd(77); for (let i = 0; i < 18; i++) { const sp = new T.Sprite(new T.SpriteMaterial({ map: tx, transparent: true, opacity: 0.55 + rr() * 0.3, fog: false, depthWrite: false })), a = rr() * 6.283, d = 260 + rr() * 330; sp.position.set(Math.cos(a) * d, 130 + rr() * 110, Math.sin(a) * d); sp.scale.set(170 + rr() * 170, 70 + rr() * 50, 1); sp.userData = { nube: true, v: 0.5 + rr() * 1.2 }; W.add(sp); nubes.push(sp); } }
    let hPrev = -1;
    S.puebloAnim.push(t => {
      nubes.forEach(n => { n.position.x += n.userData.v * 0.016; if (n.position.x > 640) n.position.x = -640; });
      const h = S.hora || 9; if (S.cieloU && Math.abs(h - hPrev) > 0.04) { hPrev = h; const el = Math.sin((h - 6) / 15 * Math.PI) * 72, az = 110 + (h - 6) * 9, u = S.cieloU, noche = Math.max(0, Math.min(1, (h - 19.5) / 1.5)), tarde = Math.max(0, Math.min(1, (h - 17.5) / 2.5)), mix = (a, b, k) => new T.Color(a).lerp(new T.Color(b), k);
        u.solDir.value.setFromSphericalCoords(1, T.MathUtils.degToRad(90 - Math.max(-8, el)), T.MathUtils.degToRad(az)).setY(Math.max(-0.1, u.solDir.value.y)); u.zenit.value.copy(mix(mix(0x2c6cb4, 0x4a5f9a, tarde), 0x070d1c, noche)); u.horiz.value.copy(mix(mix(0xb2cce2, 0xf0a46a, tarde), 0x101a2e, noche)); u.solCol.value.copy(mix(0xfff2d0, 0xffa060, tarde).multiplyScalar(1 - noche)); }
    });
  }
  function construir(S, M, st) {
    BOSQUES = []; SUELTOS = [];
    const W = S.mundo, club = st.equipos[st.clubId], Pm = GM.mods.pueblo, est = Pm.estado(st), nivel = est.nivel, pj = st.carrera.pueblo, eds = Pm.edificios(st), ed = t => eds.find(b => b.tipo === t);
    const clave = GM.pueblo3d ? GM.pueblo3d.estiloDe(pj.nombre, pj.nac) : 'castellano', E = Object.assign({ clave }, GM.pueblo3d ? GM.pueblo3d.ESTILOS[clave] : { muros: ['#d6b47c'], teja: '#b4643d', postigos: ['#5a3b22'], torre: 'campanario' });
    const G = M.rejilla({ limites: LIM, CELDA: 0.5 }), O = ocupacion(); S.G = G; S.ocupacion = O; S.puebloAnim = []; S.oclusores = []; S.conflictos = []; S.lotes = {};
    const r = rnd(U.hash(pj.nombre + 'mundo')), club2 = Object.assign({}, club, { cariñoPueblo: pj.cariño }), hechos = eds.filter(b => b.nivel).length;
    S.scene.background = new THREE.Color(0xa9c6dc); S.scene.fog = new THREE.Fog(0xb2cce2, 300, 820); S.camera.far = 1700; cielo(S, M); S.camera.updateProjectionMatrix();
    // Solo se camina por la meseta: lo demás queda bloqueado en la rejilla de caminos
    for (let z = LIM[1]; z < LIM[3]; z += 1) for (let x = LIM[0]; x < LIM[2]; x += 1) if (dMes(x + 0.5, z + 0.5) > 0.97) { G.bloquea(x, z, x + 1, z + 1); O.punto(x + 0.5, z + 0.5, 4); }
    const emp = M.textura('empedrado-pueblo2', 256, (x, n) => { x.fillStyle = '#6f6352'; x.fillRect(0, 0, n, n); const rr = rnd(7), f = 10, h = n / f; for (let jj = 0; jj < f; jj++) for (let ii = -1; ii <= f; ii++) { const cx = ii * h + (jj % 2) * h / 2 + (rr() - 0.5) * 3, cy = jj * h + h / 2 + (rr() - 0.5) * 3, v = 150 + rr() * 50 | 0; x.fillStyle = 'rgb(' + v + ',' + (v - 8 - rr() * 10 | 0) + ',' + (v - 25 - rr() * 15 | 0) + ')'; x.beginPath(); x.ellipse(cx, cy, h * 0.44, h * 0.38, rr() * 0.6, 0, 6.3); x.fill(); x.fillStyle = 'rgba(255,255,255,.12)'; x.beginPath(); x.ellipse(cx - h * 0.1, cy - h * 0.1, h * 0.18, h * 0.12, 0, 0, 6.3); x.fill(); } });
    if (emp) { emp.wrapS = emp.wrapT = THREE.RepeatWrapping; }
    const mCalle = emp ? new THREE.MeshStandardMaterial({ map: emp, roughness: 1 }) : mat('#b9a98c');
    const tx = (k, dib) => { const t = M.textura(k, 256, dib); return t ? new THREE.MeshStandardMaterial({ map: t, roughness: 1 }) : null; };
    const manchas = (x, n, base, cols, k, tam) => { x.fillStyle = base; x.fillRect(0, 0, n, n); const rr = rnd(k); for (let i = 0; i < 900; i++) { x.fillStyle = cols[(rr() * cols.length) | 0]; const px = rr() * n, py = rr() * n, s = tam * (0.4 + rr()); x.fillRect(px, py, s, s * (0.5 + rr())); } };
    const mTierra = tx('tierra-pueblo', (x, n) => manchas(x, n, '#a99a74', ['rgba(120,140,70,.35)', 'rgba(90,110,55,.3)', 'rgba(150,130,95,.4)', 'rgba(185,170,135,.35)', 'rgba(110,95,70,.3)'], 11, 5)) || mat('#a89a76');
    const mSolar = tx('solar-pueblo', (x, n) => manchas(x, n, '#8e9a62', ['rgba(70,100,45,.45)', 'rgba(140,150,80,.4)', 'rgba(160,140,100,.35)', 'rgba(230,220,120,.5)'], 13, 3)) || mat('#8e9a62');
    const mObra = tx('obra-pueblo', (x, n) => manchas(x, n, '#b5a585', ['rgba(150,130,100,.5)', 'rgba(200,190,160,.4)', 'rgba(120,110,95,.4)'], 17, 4)) || mat('#b5a585');
    const mLosas = tx('losas-pueblo', (x, n) => { x.fillStyle = '#7d705c'; x.fillRect(0, 0, n, n); const rr = rnd(21), f = 8, h = n / f; for (let j = 0; j < f; j++) { const off = (j % 2) * h / 2; for (let i = -1; i < f; i++) { const v = 196 + rr() * 30 | 0; x.fillStyle = 'rgb(' + v + ',' + (v - 10) + ',' + (v - 28) + ')'; x.fillRect(i * h + off + 2, j * h + 2, h - 4, h - 4); x.fillStyle = 'rgba(0,0,0,.06)'; x.fillRect(i * h + off + 2 + rr() * h * 0.5, j * h + 2 + rr() * h * 0.5, h * 0.3, h * 0.2); } } }) || mat('#d8cdb5');
    const mBordillo = mat(E.clave === 'andaluz' ? '#cfc6b4' : '#8f8170'), mAsf = mat('#4b5058'), mGrava = mat('#b49d72');
    if (GM.texturas) { const TR = GM.texturas, claro = E.clave === 'andaluz';
      TR.aplicar(mCalle, 'PavingStones070', { escala: 2.2, tinte: claro ? 0xf2e6d0 : 0xdcc6a2 }); if (mLosas.isMaterial) TR.aplicar(mLosas, 'PavingStones070', { escala: 3.4, tinte: claro ? 0xf0e8d8 : 0xd6cab4 });
      TR.aplicar(mBordillo, 'Concrete034', { escala: 1.4, tinte: claro ? 0xf0e8d8 : 0xb8aa94, relieve: 0.8 }); TR.aplicar(mAsf, 'Asphalt010', { escala: 4, tinte: 0xb4b4b4 }); TR.aplicar(mGrava, 'Ground054', { escala: 3, tinte: 0xf0e2c0, relieve: 0.5 });
      if (mTierra.isMaterial) TR.aplicar(mTierra, 'Ground054', { escala: 6.5, tinte: 0xe9dfc4, relieve: 0.4 }); if (mSolar.isMaterial) TR.aplicar(mSolar, 'Grass004', { escala: 3.5, tinte: 0xc8d0a0 });
      (E.muros || []).forEach(c => TR.aplicar(mat(c), 'Plaster003', { color: false, escala: 1.8, relieve: 1 })); if (E.zocalo) TR.aplicar(mat(E.zocalo), 'Concrete034', { color: false, escala: 1.5 });
      TR.aplicar(mat(E.teja), 'RoofingTiles013A', { color: false, escala: 1.4, relieve: 1.2 }); }
    const uvEsc = (g, e) => { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / e, uv.getY(i) / e); return g; };
    const carr = ed('carretera').nivel;
    entorno(W, M, E, r, carr, S.puebloAnim, S);
    { const s = new THREE.Shape(); for (let i = 0; i <= 96; i++) { const [px, pz] = muro(i / 96 * Math.PI * 2); if (i) s.lineTo(px, -pz); else s.moveTo(px, -pz); } const g = uvEsc(new THREE.ShapeGeometry(s), 7).rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, mTierra); m.position.y = -0.01; m.receiveShadow = true; W.add(m); }
    CALLES.forEach(c => { cinta(W, c.p, c.w, c.n === 'Carretera' && carr ? mAsf : c.fuera ? mGrava : mCalle);
      if (!c.fuera) bordillos(W, c.p, c.w, mBordillo, enPlaza); for (let i = 0; i < c.p.length - 1; i++) { const [ax, az] = c.p[i], [bx, bz] = c.p[i + 1], l = Math.hypot(bx - ax, bz - az); O.marca({ x: (ax + bx) / 2, z: (az + bz) / 2, w: l + c.w, d: c.w + 1, ry: -Math.atan2(bz - az, bx - ax) }, 1); } });
    { const s = new THREE.Shape(); PLAZA.forEach(([px, pz], i) => i ? s.lineTo(px, -pz) : s.moveTo(px, -pz)); const g = uvEsc(new THREE.ShapeGeometry(s), 4).rotateX(-Math.PI / 2); const pl = new THREE.Mesh(g, ed('plaza').nivel ? mLosas : mCalle); pl.position.y = 0.014; pl.receiveShadow = true; W.add(pl);
      for (let z = -11; z <= 11; z++) for (let x = -14; x <= 13; x++) if (enPlaza(x + 0.5, z + 0.5)) O.punto(x + 0.5, z + 0.5, 1); }
    if (carr >= 2) { const bx = PS[0] + 7, bz = PS[1] + 18; caja(W, 3, 0.15, 1.4, '#2f6f9e', bx, 2.6, bz); [-1.3, 1.3].forEach(dx => cil(W, 0.06, 2.6, '#666', bx + dx, 0, bz - 0.5, 5)); caja(W, 2.6, 0.45, 0.6, '#7a5230', bx, 0, bz + 0.4); caja(W, 2.6, 3, 11, '#e67e22', PS[0] - 5.5, 0, PS[1] + 20); O.marca({ x: bx, z: bz, w: 4, d: 3 }, 2); }
    muralla(W, G, O, E, nivel, club);
    // Iglesia (preside la plaza desde el norte) y ayuntamiento con soportales (este)
    const IG = { x: -6.5, z: -16, w: 10, d: 13, ry: 0 };
    if (GM.curvas) GM.curvas.iglesia(W, M, E, r, club, IG.x, IG.z);
    O.marca(IG, 2); G.bloquea(IG.x - 5, IG.z - 6.5, IG.x + 5.2, IG.z + 6.6);
    const AY = { x: 17, z: 6, w: 10, d: 8, ry: -Math.PI / 2 };
    { const g = new THREE.Group(); g.position.set(AY.x, 0, AY.z); g.rotation.y = AY.ry; W.add(g); bloque(g, M, E, 10, 8, 2, E.muros[1 % E.muros.length], 'Ayuntamiento', '#7a2f22', r);
      for (let i = 0; i < 6; i++) cil(g, 0.3, 3, '#e8dcc4', -4.2 + i * 1.68, 0, 5, 10); caja(g, 10.6, 0.4, 2.2, '#d8cbb0', 0, 3, 5);
      cil(g, 0.05, 4, '#ddd', 4.2, 6.2, 4.2, 5); caja(g, 1.4, 0.9, 0.04, club.colores[0], 4.9, 9.1, 4.2); O.marca({ x: AY.x - 1, z: AY.z, w: 10, d: 11, ry: AY.ry }, 2); G.bloquea(AY.x - 4, AY.z - 5, AY.x + 4, AY.z + 5); }
    // Plaza: fuente, bancos, estatua y, con la reforma, farolas; puestos de mercado desde «villa»
    const nPl = ed('plaza').nivel, FX = 1, FZ = 0;
    if (GM.curvas) GM.curvas.fuente(W, FX, FZ, nPl); else { cil(W, nPl ? 2.2 : 1.4, 0.6, '#d9d2c3', FX, 0, FZ, 20); cil(W, 0.25, 1.8, '#d9d2c3', FX, 0, FZ, 10); }
    G.bloquea(FX - 2.7, FZ - 2.7, FX + 2.7, FZ + 2.7);
    if (GM.curvas) for (const [px, pz] of [[-10, 7], [9, 8], [-9, -8]]) { const R = { x: px, z: pz, w: 3, d: 3, ry: 0 }; if (O.libre(R, [1])) { GM.curvas.pozo(W, px, pz); O.marca(R, 2); G.bloquea(px - 1.3, pz - 1.3, px + 1.3, pz + 1.3); break; } }
    S.bancos = [];
    [[-7, -4, 0.3], [6, -6.5, 3.34], [-9, 4, 1.4], [8, 5, -1.2]].concat(nPl ? [[-3, 6.5, 0], [4, -2.8, 3.24]] : []).forEach(([x, z, a]) => { if (GM.puebloVida) { GM.puebloVida.banco(W, x, z, a); S.bancos.push({ x, z, ry: a }); } else caja(W, 1.7, 0.45, 0.55, '#7a5230', x, 0, z, a); G.bloquea(x - 0.8, z - 0.4, x + 0.8, z + 0.4); });
    if (GM.puebloVida) GM.puebloVida.rosaPlaza(W, M, FX, FZ, 8.2);
    if (nPl) [[-10, -3], [9, -6], [-6, 7], [9, 3]].forEach(([x, z]) => { cil(W, 0.6, 0.6, '#b9a98c', x, 0, z, 10); arbol(W, x, z, 'frutal', r); G.bloquea(x - 0.6, z - 0.6, x + 0.6, z + 0.6); });   // árboles en alcorques
    if (nPl >= 2) PLAZA.forEach(([x, z]) => { const lx = x * 0.9, lz = z * 0.9; cil(W, 0.12, 3.4, '#3d3d3d', lx, 0, lz, 6); const l = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffd27a', emissiveIntensity: 0.8 })); l.position.set(lx, 3.5, lz); W.add(l); });
    S.puestos = [];
    if (nivel >= 3) [[5, 6.5, '#c0392b'], [8.5, 3.5, '#2f6f9e'], [-4.5, 6.8, '#f39c12']].forEach(([x, z, c], i) => { if (GM.puebloVida) { GM.puebloVida.puestoMercado(W, M, x, z, 0, c, r, i); S.puestos.push({ x, z }); } else { caja(W, 2, 0.9, 1.2, '#8a6d3b', x, 0, z); const tl = caja(W, 2.3, 0.08, 1.5, c, x, 1.9, z); tl.rotation.x = 0.15; [-0.9, 0.9].forEach(dx => cil(W, 0.04, 1.9, '#555', x + dx, 0, z + 0.6, 4)); } G.bloquea(x - 1.3, z - 0.8, x + 1.3, z + 1.2); });
    if (GM.kit && GM.kit.palomas) S.palomas = GM.kit.palomas(W, [[FX + 4, FZ + 3], [FX - 4.5, FZ - 3], [6, 6], [-8, -2]], 6);
    const nMu = ed('mural').nivel;
    if (nMu) { const t = M.textura('mural-pueblo-' + st.jugadores.yo.nombre, 256, (x, n) => { x.fillStyle = club.colores[0]; x.fillRect(0, 0, n, n); x.fillStyle = club.colores[1] || '#fff'; x.font = 'bold 40px sans-serif'; x.textAlign = 'center'; x.fillText(st.jugadores.yo.nombre.split(' ').pop().toUpperCase(), n / 2, n / 2); x.font = 'bold 80px sans-serif'; x.fillText(String(st.jugadores.yo.dorsal || 7), n / 2, n / 2 + 80); });
      const arch = new THREE.Shape(); arch.moveTo(-1.5, 0); arch.lineTo(1.5, 0); arch.lineTo(1.5, 2.2); arch.absarc(0, 2.2, 1.5, 0, Math.PI, false); arch.lineTo(-1.5, 0);
      const ag = new THREE.ShapeGeometry(arch, 18), apos = ag.attributes.position, auv = ag.attributes.uv; for (let i = 0; i < apos.count; i++) auv.setXY(i, (apos.getX(i) + 1.5) / 3, apos.getY(i) / 3.7);
      const m = new THREE.Mesh(ag, t ? new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }) : mat(club.colores[0])); m.position.set(IG.x - 3.4, 2.9, IG.z + 6.62); W.add(m);
      { const fr = new THREE.Mesh(new THREE.TorusGeometry(1.58, 0.1, 6, 22, Math.PI), mat('#a39380')); fr.position.set(IG.x - 3.4, 5.1, IG.z + 6.64); W.add(fr); for (const sx of [-1.58, 1.58]) caja(W, 0.2, 2.2, 0.16, '#a39380', IG.x - 3.4 + sx, 2.9, IG.z + 6.64); caja(W, 3.4, 0.16, 0.3, '#a39380', IG.x - 3.4, 2.78, IG.z + 6.66); }
      if (nMu >= 3) { const sx = -6, sz = 4.5; cil(W, 0.7, 1.2, '#cfc6b4', sx, 0, sz, 12); const oro = mat('#c9a227', { metalness: 0.8, roughness: 0.35 }); cil(W, 0.35, 1.6, oro, sx, 1.2, sz, 10); const cab = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), oro); cab.position.set(sx, 3.1, sz); W.add(cab); G.bloquea(sx - 0.8, sz - 0.8, sx + 0.8, sz + 0.8); } }
    // Parcelas: reservan su tamaño máximo; buscan en espiral el primer hueco libre del lado que les toca (dentro o fuera de la
    // muralla) con el frente a una calle; las grandes pueden quedar más atrás con una explanada hasta la calle
    const zonas = [];
    const prueba = (x, z, w, d, fuera) => { const c = calleCercana(x, z), fx = c.px - x, fz = c.pz - z, l = Math.hypot(fx, fz) || 1, ry = Math.atan2(fx / l, fz / l), R = { x, z, w, d, ry }, hueco = c.d - c.w / 2 - d / 2;
      const esq = [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]].every(([a, b]) => { const u = a * w / 2, v = b * d / 2, px = x + u * Math.cos(ry) + v * Math.sin(ry), pz = z - u * Math.sin(ry) + v * Math.cos(ry); return fuera ? O.fuera(px, pz) : O.dentro(px, pz); });
      return { R, fx: fx / l, fz: fz / l, hueco, c, ok: esq && hueco > 0.2 && hueco < (w * d > 90 ? 9 : 3.5) && O.libre(R) }; };
    LOTES.forEach(([tipo, x0, z0, w, d, fuera]) => {
      let P = prueba(x0, z0, w, d, fuera);
      for (let rr = 1; !P.ok && rr <= 30; rr++) for (let k = 0; k < 8 + rr * 2 && !P.ok; k++) { const a = k / (8 + rr * 2) * Math.PI * 2, q = prueba(x0 + Math.cos(a) * rr, z0 + Math.sin(a) * rr, w, d, fuera); if (q.ok) P = q; }
      if (!P.ok) S.conflictos.push(tipo + ' no encuentra sitio');
      const { R } = P, x = R.x, z = R.z, ry = R.ry, fx = P.fx, fz = P.fz;
      if (P.ok && P.hueco > 1.5) { const ax = x + fx * d / 2, az = z + fz * d / 2; cinta(W, [[ax, az], [P.c.px, P.c.pz]], 4.5, mCalle); O.marca({ x: (ax + P.c.px) / 2, z: (az + P.c.pz) / 2, w: 4.5, d: P.hueco + 1, ry }, 1); }
      O.marca(R, 2);
      const b = ed(tipo), g = new THREE.Group(), rr = rnd(U.hash(pj.nombre + tipo)); g.position.set(x, 0, z); g.rotation.y = ry; g.userData = { tipo }; W.add(g);   // tipo: se puede tocar en la vista de «Mi pueblo»
      const bajo = new THREE.Mesh(uvEsc(new THREE.PlaneGeometry(w, d), 1 / Math.max(1, w / 5)).rotateX(-Math.PI / 2), b.nivel || b.obra ? mObra : mSolar); bajo.position.y = 0.005; g.add(bajo);
      if (b.obra) obra(g, M, E, tipo, b.obra.dest, b.obra.progreso, club, rr, S.puebloAnim);
      else if (b.nivel) construido(g, M, E, tipo, b.nivel, club, rr, S.puebloAnim);
      else {
        [[0, -d / 2 + 0.2, w, 0.4], [-w / 2 + 0.2, 0, 0.4, d], [w / 2 - 0.2, 0, 0.4, d]].forEach(q => caja(g, q[2], 0.7, q[3], '#a99377', q[0], 0, q[1]));
        for (let i = 0; i < 3; i++) arbol(g, -w / 3 + i * w / 3, -d / 6 + (i % 2) * 0.8, 'olivo', rr);
        const s = rotulo(M, 'Solar: ' + b.nombre, '#5d6d7e'); s.position.set(0, 1.4, d / 2 - 0.6); s.scale.setScalar(0.8); g.add(s); cil(g, 0.05, 1.4, '#555', 0, 0, d / 2 - 0.6, 5);
      }
      if (b.nivel || b.obra) G.bloquea(x - Math.min(w, d) / 2 + 0.3, z - Math.min(w, d) / 2 + 0.3, x + Math.min(w, d) / 2 - 0.3, z + Math.min(w, d) / 2 - 0.3);
      const zx = x + fx * (d / 2 + 0.9), zz = z + fz * (d / 2 + 0.9);
      // El bar y las casas de los tuyos, una vez construidos, tienen interior (interiores.js) y se vuelve a su puerta
      const INT = { bar: 'bar_pueblo', casapadres: 'casa_padres', casaamigos: 'casa_amigos', micasa: 'casa_pueblo', escuela: 'escuela', biblioteca: 'biblioteca', tienda: 'tienda_pueblo', ambulatorio: 'ambulatorio', polideportivo: 'polideportivo', hotel: 'hotel', cine: 'cine', centrodia: 'centrodia', panaderia: 'panaderia', taller: 'taller', restaurantep: 'restaurante_pueblo', industrial: 'industrial', pabellon: 'pabellon_pueblo' }[tipo], dentro = INT && b.nivel > 0 && GM.interiores && GM.interiores.TIPOS[INT];
      zonas.push([Object.assign({ id: 'pueblo_' + tipo, nombre: b.nombre, accion: '', destino: {}, acciones: s2 => accionesLote(s2, tipo), ficha: s2 => fichaLote(s2, tipo) }, dentro ? { irA: 'interior:' + INT, boton: { bar: 'Entrar en el bar', casapadres: 'Entrar en casa', casaamigos: 'Entrar en casa', micasa: 'Entrar en casa' }[tipo] || 'Entrar en ' + b.nombre.toLowerCase() } : {}), zx, zz]);
      if (dentro) (S.puertas = S.puertas || {})['interior:' + INT] = { x: zx + fx * 1.4, z: zz + fz * 1.4, ry: Math.atan2(fx, fz) };   // un poco fuera del círculo
      S.lotes[tipo] = { x, z, zx, zz, fx, fz, w, d };
    });
    zonas.push([{ id: 'pueblo_plaza', nombre: 'Plaza mayor', accion: '', destino: {}, acciones: s2 => accionesPlaza(s2) }, -1.5, 3.2]);
    zonas.push([{ id: 'pueblo_mural', nombre: ed('mural').nombre, accion: '', destino: {}, acciones: s2 => accionesLote(s2, 'mural') }, IG.x - 2.9, IG.z + 8.4]);
    zonas.push([{ id: 'pueblo_alumbrado', nombre: 'Alumbrado y calles', accion: '', destino: {}, acciones: s2 => accionesLote(s2, 'alumbrado') }, 2.6, 23]);
    zonas.push([{ id: 'pueblo_carretera', nombre: 'Carretera y autobús', accion: '', destino: {}, acciones: s2 => accionesLote(s2, 'carretera') }, PS[0] + 2.5, PS[1] + 6]);
    zonas.push([{ id: 'pueblo_bus', nombre: 'Autobús a ' + club.ciudad, accion: 'Viajar a la ciudad de tu club', destino: {}, irA: 'calle', boton: 'Coger el autobús a ' + club.ciudad }, PS[0] - 2.5, PS[1] + 9]);
    (S.puertas = S.puertas || {}).calle = { x: PS[0] - 2.5, z: PS[1] + 7.6, ry: Math.PI };
    zonas.push([{ id: 'pueblo_salir', nombre: 'Salir del pueblo', accion: 'Volver al juego', destino: {}, acciones: () => [{ id: 'salir', t: 'Volver', d: 'Sales del pueblo.', disponible: true, fn: () => { setTimeout(() => GM.sede.cerrar(), 50); return { ok: true, texto: 'Hasta pronto' }; } }] }, PS[0] - 1, PS[1] + 26]);
    // Vehículos para moverse por el pueblo: bicis de siempre y, con la carretera o un pueblo grande, una vespa (junto a la plaza)
    { const U3 = GM.urbano; let sitio = null;
      for (const [vx, vz] of [[5, 13], [-3, 14], [9, 12], [-9, 12], [13, 8], [-14, 5], [6, -13], [11, 4], [-12, -2], [3, -12], [-6, 10], [12, -6], [-14, 10], [14, 12], [0, 15]]) { const R = { x: vx, z: vz, w: 5, d: 3, ry: 0 }; if (O.libre(R, [1])) { sitio = [vx, vz, R]; break; } }
      if (U3 && sitio) { const [vx, vz, R] = sitio, g = new THREE.Group(); g.position.set(vx, 0, vz); W.add(g); O.marca(R, 2); G.bloquea(vx - 2.5, vz - 1.5, vx + 2.5, vz + 1.5);
        caja(g, 4.6, 0.08, 0.5, '#3a4048', 0, 0, 0.9); for (let i = 0; i < 3; i++) { const b = U3.bici(i === 1 ? '#e9e5da' : '#d62d2d'); b.position.set(-1.7 + i * 0.7, 0, 0.2); b.rotation.y = 0.0; g.add(b); }
        const mo = U3.moto('#2f8f7a'); mo.position.set(1.4, 0, 0.1); mo.rotation.y = 0.3; g.add(mo);
        const carretera = (ed('carretera') || {}).nivel || 0, motoOk = carretera >= 1 || nivel >= 3;
        zonas.push([{ id: 'pueblo_vehiculos', nombre: 'Bicis y vespa del pueblo', accion: '', destino: {}, acciones: s2 => { const B = GM.ciudadBarrios, S0 = GM.sede._estado && GM.sede._estado(), en = S0 && S0.yo && S0.yo.bici;
          return en ? [{ id: 'dejar', t: 'Dejar el vehículo', d: 'Vuelves a ir andando.', disponible: true, fn: () => B.bici(false) }]
            : [{ id: 'bici', t: 'Coger una bici', d: 'Vas unas dos veces y media más rápido.', disponible: true, fn: () => B.bici(true, s2, 'bici') },
              { id: 'moto', t: 'Subir a la vespa', d: motoOk ? 'Cuatro veces más rápido que andando.' : 'Hace falta que arreglen la carretera o que el pueblo sea una villa.', disponible: motoOk, motivo: 'Aún no se puede: la carretera está sin arreglar y el pueblo es pequeño.', fn: () => B.bici(true, s2, 'moto') }]; } }, vx, vz + 2.6]); } }
    S.zonas = zonas.map(([sala, x, z]) => M.zona(W, sala, x, z, club));
    // Casas a lo largo de las calles: dentro de la muralla según el nivel; fuera, el pueblo crece con el nivel y con cada edificio que levantas.
    // Cada 3,6 m de calle y a cada lado se prueban tres tamaños y dos retranqueos; la primera que cabe se queda.
    const lleno = 0.55 + nivel * 0.1, llenoFuera = U.clamp(-0.15 + nivel * 0.12 + hechos * 0.025, 0, 0.85); let nCasas = 0, nFuera = 0;
    aLoLargo(3.6, (x, z, tx, tz, c, ci) => {
      [-1, 1].forEach(s => {
        const q = rnd(U.hash(pj.nombre + 'c' + Math.round(x) + ',' + Math.round(z) + s)); if (q() > (c.fuera ? llenoFuera : lleno)) return;
        const nx = -tz * s, nz = tx * s, ry = Math.atan2(-nx, -nz);
        for (const [w, d] of [[5.4 + q() * 1.4, 5.6 + q() * 1.6], [4.4, 5], [3.8, 4.4]]) for (const ret of [0.7, 1.5]) {
          const cx = x + nx * (c.w / 2 + ret + d / 2), cz = z + nz * (c.w / 2 + ret + d / 2), R = { x: cx, z: cz, w, d, ry };
          const lado = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => { const u = a * w / 2, v = b * d / 2; return [cx + u * Math.cos(ry) + v * Math.sin(ry), cz - u * Math.sin(ry) + v * Math.cos(ry)]; });
          if (!(lado.every(p => O.dentro(p[0], p[1])) || lado.every(p => O.fuera(p[0], p[1]))) || !O.libre(R)) continue;
          O.marca(R, 3); const pisos = 1 + ((q() * Math.min(3, 1 + nivel * 0.6)) | 0);
          casa(W, M, E, cx, cz, ry, w, d, pisos, q, club2, ci <= 1 && q() < 0.45); G.bloquea(cx - Math.min(w, d) / 2, cz - Math.min(w, d) / 2, cx + Math.min(w, d) / 2, cz + Math.min(w, d) / 2); nCasas++; if (c.fuera) nFuera++;
          if (ret > 1 && !c.fuera) { const fx = x + nx * (c.w / 2 + 0.55), fz = z + nz * (c.w / 2 + 0.55); detalle(W, fx, fz, ry, q); G.bloquea(fx - 0.6, fz - 0.6, fx + 0.6, fz + 0.6); }
          return;
        }
      });
    });
    // Farolas (nunca dentro de la plaza): con «alumbrado» más y encendidas
    const nAl = ed('alumbrado').nivel; let kF = 0;
    aLoLargo(nAl ? 9 : 16, (x, z, tx, tz, c) => { const s = (kF++ % 2 ? 1 : -1), lx = x - tz * (c.w / 2 + 0.4) * s, lz = z + tx * (c.w / 2 + 0.4) * s; if (O.punto(lx, lz) > 1 || enPlaza(lx, lz)) return; if (GM.curvas) GM.curvas.farola(W, lx, lz, x, z, !!nAl); else { cil(W, 0.08, 3.2, '#6b5a48', lx, 0, lz, 6); } O.punto(lx, lz, 5); });
    // Huertos y árboles en lo que queda libre (nunca en la plaza ni pegados a una calle)
    for (let k = 0; k < 160; k++) { const x = (r() * 2 - 1) * MES.rx * 0.95, z = MES.cz + (r() * 2 - 1) * MES.rz * 0.95; if (dMes(x, z) > 0.92 || enPlaza(x, z) || !O.libre({ x, z, w: 4, d: 4 }) || calleCercana(x, z).d < 4) continue; arbol(W, x, z, r() < 0.35 ? 'ciprés' : r() < 0.6 ? 'olivo' : 'frutal', r); O.marca({ x, z, w: 3, d: 3 }, 5); G.bloquea(x - 0.5, z - 0.5, x + 0.5, z + 0.5); }
    // Manchas de hierba y matojos en la tierra apisonada del casco (donde no hay calles, plaza ni edificios)
    { const mg = new THREE.MeshStandardMaterial({ color: '#7d9a52', roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }); if (GM.texturas) GM.texturas.aplicar(mg, 'Grass004', { escala: 2.6, tinte: 0xe4ecc6, relieve: 0.9 });
      const N = 190, im = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 14).rotateX(-Math.PI / 2), mg, N), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3(); let k = 0;
      for (let i = 0; i < N * 6 && k < N; i++) { const x = (r() * 2 - 1) * MES.rx * 0.62, z = MES.cz + (r() * 2 - 1) * MES.rz * 0.62; if (!O.dentro(x, z) || enPlaza(x, z) || calleCercana(x, z).d < 3.2 || !O.libre({ x, z, w: 3, d: 3 })) continue;
        e.set(0, r() * 6.28, 0); q.setFromEuler(e); s.set(0.8 + r() * 2.2, 1, 0.7 + r() * 1.7); p.set(x, 0.009, z); m4.compose(p, q, s); im.setMatrixAt(k++, m4); }
      im.count = k; im.receiveShadow = true; im.userData = { instancias: true }; W.add(im); }
    S.paseo = []; aLoLargo(6, (x, z) => S.paseo.push([x, z]));
    if (GM.puebloVida) { const V = GM.puebloVida; V.setAltura(altura); CALLES.filter(c => !c.fuera).forEach((c, i) => { const [ax, az] = c.p[0], [bx, bz] = c.p[1], l = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / l, nz = (bx - ax) / l, px = ax + (bx - ax) / l * 3 + nx * (c.w / 2 + 0.7), pz = az + (bz - az) / l * 3 + nz * (c.w / 2 + 0.7); if (O.punto(px, pz) <= 1) V.cartelCalle(W, M, px, pz, c.n, Math.atan2(bx - ax, bz - az) + Math.PI / 2); });
      V.alcantarillas(W, M, S.paseo.filter((p, i) => i % 3 === 0 && !enPlaza(p[0], p[1])), r);
      if (S.lotes.bar && (ed('bar') || {}).nivel) V.terraza(W, S, S.lotes.bar, r);
      V.fauna(S, W, { altura, MES, IG, dMes, r, lotes: S.lotes }); V.nocturno(S); } PLAZA.forEach(([x, z]) => S.paseo.push([x * 0.6, z * 0.6]));
    S.spawnPueblo = { x: PS[0], z: PS[1] - 4, ry: Math.PI };
    S.calleNombre = pj.nombre; S.nCasas = nCasas; S.nCasasFuera = nFuera;
    GM.kit.fusionar(W);
    return W;
  }
  // Acciones de cada parcela: construir o mejorar (obra con su duración), ver el avance y usar el edificio
  function accionesLote(st, tipo) {
    const Pm = GM.mods.pueblo, b = Pm.edificios(st).find(e => e.tipo === tipo), out = [];
    if (b.obra) out.push({ id: 'avance', t: 'Obra en marcha: ' + Math.round(b.obra.progreso * 100) + ' %', d: b.obra.proximo + '. Inauguración el ' + U.fechaLarga(b.obra.fin) + '.', disponible: false, motivo: b.obra.proximo + '. Inauguración el ' + U.fechaLarga(b.obra.fin) + '.', fn: () => ({ ok: false }) });
    else if (b.proximo) out.push({ id: 'obra', t: (b.nivel ? 'Mejorar: ' : 'Construir: ') + b.proximo, d: Pm.fmtK(b.coste) + ', ' + b.dias + ' días de obra.', disponible: !b.motivo, motivo: b.motivo, fn: () => { const r = Pm.invertir(st, tipo); return r.ok ? { ok: true, texto: (b.nivel ? 'Empiezan las obras de mejora' : 'Empiezan las obras') + ': ' + b.dias + ' días' } : r; } });
    if (b.uso) out.push({ id: 'usar', t: b.uso, d: b.actual, disponible: true, fn: () => { const r = Pm.usar(st, tipo); return r.ok ? { ok: true, texto: r.texto + (r.efectos && r.efectos.length ? ': ' + r.efectos.join(', ') : '') } : r; } });
    if (!out.length) out.push({ id: 'info', t: b.actual || b.nombre, d: b.motivo || '', disponible: false, motivo: b.motivo || 'Nivel máximo', fn: () => ({ ok: false }) });
    return out;
  }
  // Ficha de un edificio (la pinta sede3d.pintarFicha): nivel, ruta de mejoras, obra, gestor, renta mensual y acciones
  function fichaLote(st, tipo) {
    const Pm = GM.mods.pueblo, b = Pm.edificios(st).find(e => e.tipo === tipo); if (!b) return null;
    const ic = GM.iconos && GM.iconos.POR_EDIFICIO[tipo] || 'casa', f = Pm.fmtK, dinero = GM.mods.hogar.dinero(st), ef = b.ef || {}, n = Math.max(1, b.nivel);
    const stats = [];
    if (b.nivel) { if (ef.dinero) stats.push({ ico: 'moneda', val: '+' + f(ef.dinero * b.nivel) + '/mes', etq: 'Renta' }); if (ef.cariño) stats.push({ ico: 'corazon', val: '+' + (Math.round(ef.cariño * b.nivel * 0.3 * 10) / 10) + '/mes', etq: 'Cariño del pueblo' }); if (ef.fama) stats.push({ ico: 'estrella', val: '+' + Math.round(ef.fama * b.nivel * 100) / 100 + '/mes', etq: 'Reputación' }); if (ef.moral) stats.push({ ico: 'sol', val: '+' + Math.round(ef.moral * b.nivel * 10) / 10 + '/mes', etq: 'Ánimo' }); }
    const niveles = b.niveles.map((nombre, i) => ({ n: i + 1, nombre, estado: i + 1 <= b.nivel ? 'hecho' : (i + 1 === b.nivel + 1 ? 'sig' : 'bloq') }));
    const out = { icono: ic, titulo: b.nombre, sub: b.nivel ? b.actual : 'Solar sin construir', nivel: b.nivel, max: b.max, niveles, stats, gestor: b.gestor || null, gestorTipo: b.gestorTipo, categoria: b.cat };
    if (b.obra) out.obra = { prog: b.obra.progreso, texto: b.obra.proximo, fin: U.fechaLarga(b.obra.fin), dias: Math.max(0, U.diffDays(st.fecha, b.obra.fin)), fase: b.obra.progreso < 0.15 ? 'Vallado y replanteo' : b.obra.progreso < 0.35 ? 'Cimientos' : b.obra.progreso < 0.65 ? 'Estructura' : b.obra.progreso < 0.95 ? 'Muros y andamios' : 'Acabados' };
    else if (b.proximo) out.mejora = { titulo: (b.nivel ? 'Mejorar a ' : 'Construir: ') + b.proximo, coste: b.coste, costeTxt: f(b.coste), dias: b.dias, disponible: !b.motivo, motivo: b.motivo, falta: dinero < b.coste ? { tienes: dinero, necesitas: b.coste } : null, fn: () => { const r = Pm.invertir(st, tipo); return r.ok ? { ok: true, texto: b.nivel ? 'Empiezan las obras de mejora' : 'Empieza la obra', reconstruir: true } : r; } };
    const acc = [];
    if (b.uso) acc.push({ ico: ic, t: b.uso, d: 'Sube ' + ((EDIUSO(tipo) || []).join(', ') || 'el ánimo'), disponible: true, fn: () => { const r = Pm.usar(st, tipo); return r.ok ? { ok: true, texto: r.texto + (r.efectos && r.efectos.length ? ': ' + r.efectos.join(', ') : '') } : r; } });
    out.acciones = acc; out.entrar = null; return out;
  }
  const EDIUSO = tipo => { const e = GM.mods.pueblo.EDI[tipo], u = e && e.uso && e.uso[1]; if (!u) return null; const l = []; if (u.moral) l.push('ánimo'); if (u.cariño) l.push('cariño del pueblo'); if (u.fama) l.push('reputación'); if (u.xp) l.push('progresión'); if (u.amigos) l.push('amigos'); return l; };
  function accionesPlaza(st) {
    const Pm = GM.mods.pueblo, conv = r => r.ok ? { ok: true, texto: (r.efectos || []).join(', ') || 'Hecho' } : r;
    return [{ id: 'visita', t: 'Visitar a la familia y a los vecinos', d: '0,8 mil €. Ánimo y cariño del pueblo.', disponible: true, fn: () => conv(Pm.visitar(st)) },
      { id: 'clinic', t: 'Clínic con los niños', d: 2 * Pm.estado(st).nivel + ' mil €. Cariño del pueblo.', disponible: true, fn: () => conv(Pm.clinic(st)) },
      { id: 'fiesta', t: 'Fiesta en tu honor', d: Math.round(15 * Math.pow(Pm.estado(st).nivel, 1.4)) + ' mil €. Mucho cariño y algo de reputación.', disponible: true, fn: () => conv(Pm.fiesta(st)) }].concat(accionesLote(st, 'plaza'));
  }
  // Vecinos y obreros
  const MODELOS = ['h-casual_2', 'm-casual', 'h-farmer', 'm-formal', 'h-beach', 'm-adventurer', 'h-adventurer', 'm-punk'];
  const PIEL = ['#f1c7a5', '#e0ac85', '#c68863', '#9a6142'], PELO = ['#1d1510', '#3b2617', '#6a4425', '#a9793e', '#8a8a8a', '#bdbdbd'];
  async function poblar(S, M, st) {
    if (SUELTOS.length && GM.sede.arbolesReales) { const A = await GM.sede.arbolesReales(['tree_small_02', 'island_tree_01']); if (A.length) { const g = A.map(() => []); SUELTOS.forEach(([x, y, z, e], i) => g[i % A.length].push({ x, y, z, ry: i * 2.4, alto: 4.2 + e * 1.8 })); A.forEach((m, k) => S.mundo.add(GM.kit.instanciar(m, g[k], { viento: true }))); } else SUELTOS.forEach(([x, y, z]) => { const c = new THREE.Mesh(new THREE.SphereGeometry(1.6, 9, 7), mat('#4f7d3a')); c.position.set(x, y + 2.3, z); c.scale.y = 0.75; S.mundo.add(c); }); SUELTOS = []; }
    if (BOSQUES.length && GM.sede.arbolesReales) { const A = await GM.sede.arbolesReales(['island_tree_01', 'tree_small_02']); if (A.length) { let s = 3; const rr = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; const g = A.map(() => []);
      BOSQUES.forEach(B => { B.tronco.visible = B.copa.visible = false; B.lista.forEach(([x, y, z, e], i) => g[i % A.length].push({ x, y, z, ry: rr() * 6.28, alto: 3.6 + (e || 1) * 1.6 })); }); A.forEach((m, k) => S.mundo.add(GM.kit.instanciar(m, g[k], { viento: true }))); BOSQUES = []; } }
    const Pm = GM.mods.pueblo, nivel = Pm.estado(st).nivel, club = st.equipos[st.clubId], pj = st.carrera.pueblo, r = rnd(U.hash(st.fecha + 'pueblo'));
    const n = 6 + nivel * 3;
    const perfiles = Array.from({ length: n }, () => { const fan = r() * 100 < pj.cariño * 0.7; return GM.puebloVida ? GM.puebloVida.perfilVecino(r, PIEL, PELO, MODELOS, club, fan) : { tipo: 'adulto', o: { modelo: MODELOS[(r() * MODELOS.length) | 0], altura: 155 + r() * 30, piel: PIEL[(r() * PIEL.length) | 0], pelo: PELO[(r() * PELO.length) | 0], ropa: fan ? [club.colores[0], club.colores[1] || '#222'] : null } }; });
    const vec = await Promise.all(perfiles.map(pf => M.personaje(pf.o)));
    vec.forEach((p, k) => { const q = S.paseo[(r() * S.paseo.length) | 0]; p.obj.position.set(q[0], 0, q[1]); Object.assign(p, { vecino: true, perfil: perfiles[k].tipo, cabizbajo: perfiles[k].tipo === 'mayor', rol: (perfiles[k].tipo === 'nino' ? 'Niño' : perfiles[k].tipo === 'mayor' ? 'Vecino mayor' : 'Vecino') + ' de ' + pj.nombre, r: rnd(U.hash(st.fecha + 'v' + k)), espera: r() * 4 }); p.obj.userData = { npc: S.gente.length }; M.anim(p, 'idle'); S.mundo.add(p.obj); S.gente.push(p); });
    if (GM.puebloVida) { GM.puebloVida.perros(S, S.mundo, vec.filter(p => p.perfil === 'adulto').slice(0, 3), r);
      for (const pu of (S.puestos || [])) { const v = await M.personaje({ modelo: r() < 0.5 ? 'h-farmer' : 'm-casual', altura: 165 + r() * 15, piel: PIEL[(r() * PIEL.length) | 0], pelo: PELO[(r() * PELO.length) | 0] }); v.obj.position.set(pu.x, 0, pu.z - 0.95); v.obj.rotation.y = 0; Object.assign(v, { fijo: true, rol: 'Vendedor del mercado', r: rnd(U.hash(st.fecha + 'm' + pu.x)), espera: 99 }); v.obj.userData = { npc: S.gente.length }; M.anim(v, 'idle'); S.mundo.add(v.obj); S.gente.push(v); } }
    // Gente en las puertas de los edificios nuevos: cola del cine, mecánico, panadera, camareros en la terraza, operarios y niños de la escuela
    { const lug = (t, lx, lz) => { const L = S.lotes[t]; return L ? { x: L.x + lx * L.fz + lz * L.fx, z: L.z - lx * L.fx + lz * L.fz, ry: Math.atan2(L.fx, L.fz), L } : null; };
      const pon = async (t, lx, lz, modelo, rol, opc) => { const q = lug(t, lx, lz); if (!q || !(Pm.edificios(st).find(b => b.tipo === t) || {}).nivel) return; const p = await M.personaje(Object.assign({ modelo, altura: 160 + r() * 28, piel: PIEL[(r() * PIEL.length) | 0], pelo: PELO[(r() * PELO.length) | 0] }, opc && opc.aspecto || {}));
        p.obj.position.set(q.x, 0, q.z); p.obj.rotation.y = q.ry + (opc && opc.dg !== undefined ? opc.dg : Math.PI); Object.assign(p, { fijo: true, rol, r: rnd(U.hash(st.fecha + rol + lx)), espera: 99 }); p.obj.userData = { npc: S.gente.length }; if (opc && opc.sit) { p.asiento = 0.45; M.anim(p, 'sit'); } else M.anim(p, (opc && opc.anim) || 'idle'); S.mundo.add(p.obj); S.gente.push(p); };
      await pon('cine', -1.4, 5.6, 'm-casual', 'Cliente del cine'); await pon('cine', -0.2, 6.6, 'h-beach', 'Cliente del cine'); await pon('cine', 1.2, 7.6, 'm-punk', 'Cliente del cine');
      await pon('taller', -2.4, 5.6, 'h-farmer', 'Mecánico', { anim: 'interact-right' });
      await pon('panaderia', 1.2, 3.8, 'm-casual', 'Panadera', { dg: 0.3 }); await pon('panaderia', -1.6, 4.6, 'h-casual_2', 'Cliente de la panadería');
      await pon('restaurantep', -2, 4.8, 'm-formal', 'Cliente de la terraza', { sit: true, dg: Math.PI / 2 }); await pon('restaurantep', 0, 4.2, 'h-casual_hoodie', 'Camarero de la terraza', { dg: Math.PI });
      await pon('industrial', 4.5, 13.5, 'h-worker', 'Operario', { anim: 'idle' }); await pon('industrial', -2.5, 9.8, 'm-worker', 'Operaria', { anim: 'interact-right' });
      await pon('escuela', -1.5, 6.4, 'h-casual_hoodie', 'Chaval de la escuela', { anim: 'emote-yes' }); await pon('escuela', 1.4, 6.8, 'm-casual', 'Chavala de la escuela'); }
    // Obreros en cada obra (dos o tres según el tamaño)
    const obras = Pm.edificios(st).filter(b => b.obra && S.lotes[b.tipo]);
    for (const b of obras) {
      const L = S.lotes[b.tipo], cuantos = b.coste > 100 ? 3 : 2;
      const ob = await Promise.all(Array.from({ length: cuantos }, (_, i) => M.personaje({ modelo: i % 2 ? 'm-worker' : 'h-worker', altura: 165 + r() * 20, piel: PIEL[(r() * PIEL.length) | 0], pelo: PELO[(r() * PELO.length) | 0] })));
      ob.forEach((p, i) => { const sx = -L.fz, sz = L.fx, x = L.x + L.fx * (L.d / 2 + 1.4) + sx * (i - 1) * 2.2, z = L.z + L.fz * (L.d / 2 + 1.4) + sz * (i - 1) * 2.2; p.obj.position.set(x, 0, z); p.obj.lookAt(L.x, 0, L.z); Object.assign(p, { obrero: true, fijo: true, rol: 'Obrero de la ' + b.nombre.toLowerCase(), r: rnd(U.hash(b.tipo + i)), espera: 3 + i }); p.obj.userData = { npc: S.gente.length }; M.anim(p, 'interact-right'); S.mundo.add(p.obj); S.gente.push(p); });
    }
  }
  function siguiente(S, M, n) {
    if (n.vecino && GM.puebloVida && !n.obrero) return GM.puebloVida.siguiente(S, M, n, { frase });
    if (n.obrero) { M.anim(n, n.r() < 0.7 ? 'interact-right' : 'idle'); n.espera = 3 + n.r() * 5; if (n.r() < 0.06 && S.yo && n.obj.position.distanceTo(S.yo.obj.position) < 8) M.bocadillo(['¡Buenos días!', 'Esto va a quedar precioso.', 'Vamos a buen ritmo.', '¡Cuidado, que pasa la grúa!'][(n.r() * 4) | 0], n.obj); return; }
    const q = S.paseo[(n.r() * S.paseo.length) | 0];
    const ok = M.irA(n, q[0] + (n.r() - 0.5) * 1.2, q[1] + (n.r() - 0.5) * 1.2, () => {
      M.anim(n, 'idle'); n.espera = 2 + n.r() * 6;
      if (S.yo && n.obj.position.distanceTo(S.yo.obj.position) < 7 && n.r() < 0.35) M.bocadillo(frase(S.st, n), n.obj);
    });
    if (!ok) n.espera = 1;
  }
  // Lo que comentan los vecinos: las obras, lo último que se ha inaugurado y el club
  function frase(st, n) {
    const Pm = GM.mods.pueblo, eds = Pm.edificios(st), obra = eds.filter(b => b.obra), hechos = eds.filter(b => b.nivel), pj = st.carrera.pueblo, fr = ['¡Qué orgullo tenerte aquí!', '¡Mucha suerte el próximo partido!', 'Mi nieto quiere ser como tú.'];
    if (obra.length) { const b = obra[(n.r() * obra.length) | 0]; fr.push('¿Cuándo acaban las obras de la ' + b.nombre.toLowerCase() + '?', 'La obra de la ' + b.nombre.toLowerCase() + ' ya va por el ' + Math.round(b.obra.progreso * 100) + ' %.'); }
    if (hechos.length) { const b = hechos[(n.r() * hechos.length) | 0]; fr.push('¡Gracias por ' + b.actual.toLowerCase() + '!', 'Desde que está ' + b.actual.toLowerCase() + ', el pueblo es otro.'); }
    if (pj.cariño < 35) fr.push('Te vemos poco por aquí…', 'Antes venías más.');
    return fr[(n.r() * fr.length) | 0];
  }
  function actualizar(S, M, dt) { const t = performance.now() / 1000; (S.puebloAnim || []).forEach(f => f(t)); if (GM.puebloVida) GM.puebloVida.actualizar(S, M, dt); if (S.palomas && GM.calle && GM.calle.moverPalomas) GM.calle.moverPalomas(S, dt); }
  GM.puebloMundo = { construir, poblar, siguiente, actualizar, accionesLote, fichaLote, LOTES };
})();
