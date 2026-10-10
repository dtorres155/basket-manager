/* CURVAS Y PIEZAS COMPLEJAS DEL PUEBLO (GM.curvas) — fuente, farolas de forja, pozo, iglesia, puertas de muralla
   Piezas con perfiles de revolución (LatheGeometry), arcos (toros y semicírculos), cúpulas y ábsides, para que el pueblo no sea
   solo cajas, cilindros y triángulos. Se apoyan en los materiales de casas_realistas.js (revoco, piedra y tejas con textura real).
   Expone: lathe(perfil, seg, material), fuente(W, x, z, nivel), farola(W, x, z, haciaX, haciaZ, encendida), pozo(W, x, z),
   iglesia(W, M, E, r, club, x, z), puertaMuralla(W, piedra, x, z, alto), almenasTorre(W, x, z, alto, piedra). */
(function () {
  const T = THREE, U = GM.util;
  const MATS = {}; const mat = (c, o) => { const k = c + JSON.stringify(o || {}); return MATS[k] || (MATS[k] = new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.9 }, o || {}))); };
  const C = () => GM.casasReal;
  const GEOS = {};
  // Superficie de revolución: perfil = [[radio, altura], …] de abajo arriba
  function latheGeo(k, perfil, seg) { return GEOS[k] || (GEOS[k] = new T.LatheGeometry(perfil.map(p => new T.Vector2(p[0], p[1])), seg || 24)); }
  function lathe(k, perfil, seg, m) { const me = new T.Mesh(latheGeo(k, perfil, seg), m); me.castShadow = true; me.receiveShadow = true; return me; }
  const caja = (G, w, h, d, m, x, y, z, ry) => { const me = new T.Mesh(new T.BoxGeometry(w, h, d), typeof m === 'string' ? mat(m) : m); me.position.set(x, y + h / 2, z); if (ry) me.rotation.y = ry; me.castShadow = true; me.receiveShadow = true; G.add(me); return me; };
  const rn = seed => { let a = (U.hash(String(seed)) >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

  // ---------- Fuente barroca de tres pilas ----------
  function fuente(W, x, z, nivel) {
    const g = new T.Group(); g.position.set(x, 0, z); W.add(g); const k = nivel ? 1 : 0.62, pie = C() ? C().piedraMat('#cfc7b6') : mat('#cfc7b6');
    const pila = lathe('f-pila', [[0, 0], [2.25, 0], [2.4, 0.12], [2.46, 0.3], [2.42, 0.5], [2.52, 0.6], [2.5, 0.68], [2.3, 0.66], [2.28, 0.5], [2.2, 0.42]], 32, pie); pila.scale.set(k, 1, k); g.add(pila);
    const agua = new T.Mesh(new T.CircleGeometry(2.2 * k, 32).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({ color: 0x5aa9d6, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.88 })); agua.position.y = 0.5; g.add(agua);
    const bal = lathe('f-balaustre', [[0, 0.4], [0.55, 0.4], [0.62, 0.55], [0.4, 0.7], [0.26, 0.95], [0.34, 1.25], [0.2, 1.55], [0.18, 1.9], [0.28, 2.0]], 20, pie); g.add(bal);
    const pila2 = lathe('f-pila2', [[0, 2.0], [0.4, 2.0], [1.0, 2.1], [1.28, 2.3], [1.34, 2.5], [1.22, 2.52], [1.15, 2.4], [0.5, 2.3]], 28, pie); g.add(pila2);
    const agua2 = new T.Mesh(new T.CircleGeometry(1.15, 28).rotateX(-Math.PI / 2), agua.material); agua2.position.y = 2.42; g.add(agua2);
    const col2 = lathe('f-col2', [[0, 2.3], [0.2, 2.3], [0.14, 2.6], [0.1, 3.0], [0.2, 3.1], [0.12, 3.25], [0.2, 3.5], [0.1, 3.7], [0.0, 3.85]], 16, pie); g.add(col2);
    // chorros que caen en arco (tubos curvos) hacia la pila de abajo
    const chorro = new T.MeshStandardMaterial({ color: 0xbfe3f5, transparent: true, opacity: 0.55, roughness: 0.1 });
    for (let a = 0; a < 6; a++) { const an = a / 6 * Math.PI * 2, cr = new T.CatmullRomCurve3([new T.Vector3(Math.cos(an) * 0.18, 3.3, Math.sin(an) * 0.18), new T.Vector3(Math.cos(an) * 0.7, 3.4, Math.sin(an) * 0.7), new T.Vector3(Math.cos(an) * 1.15, 2.9, Math.sin(an) * 1.15), new T.Vector3(Math.cos(an) * 1.2, 2.44, Math.sin(an) * 1.2)]); g.add(new T.Mesh(new T.TubeGeometry(cr, 10, 0.025, 5), chorro)); }
    for (let a = 0; a < 8; a++) { const an = a / 8 * Math.PI * 2 + 0.2, cr = new T.CatmullRomCurve3([new T.Vector3(Math.cos(an) * 1.2, 2.5, Math.sin(an) * 1.2), new T.Vector3(Math.cos(an) * 1.7 * k, 2.2, Math.sin(an) * 1.7 * k), new T.Vector3(Math.cos(an) * 2.0 * k, 1.2, Math.sin(an) * 2.0 * k), new T.Vector3(Math.cos(an) * 2.05 * k, 0.5, Math.sin(an) * 2.05 * k)]); g.add(new T.Mesh(new T.TubeGeometry(cr, 10, 0.02, 5), chorro)); }
    // mascarones (cabezas esféricas) en el borde de la pila baja
    for (let a = 0; a < 4; a++) { const an = a * Math.PI / 2 + Math.PI / 4, s = new T.Mesh(new T.SphereGeometry(0.17, 8, 6), pie); s.position.set(Math.cos(an) * 2.2 * k, 0.55, Math.sin(an) * 2.2 * k); g.add(s); }
    return g;
  }

  // ---------- Farola de forja con brazo curvo y farol ----------
  const LAMP_MAT = {};
  function farola(W, x, z, hx, hz, encendida) {
    const g = new T.Group(); g.position.set(x, 0, z); g.rotation.y = Math.atan2(hx - x, hz - z); W.add(g);
    const fe = mat('#23282d', { roughness: 0.5, metalness: 0.7 }), k = encendida ? 'on' : 'off';
    const vid = LAMP_MAT[k] || (LAMP_MAT[k] = new T.MeshStandardMaterial({ color: 0xfff3c4, emissive: encendida ? 0xffd27a : 0x2a2418, emissiveIntensity: encendida ? 0.9 : 0.2, transparent: true, opacity: 0.92, roughness: 0.2 }));
    g.add(lathe('l-col', [[0.2, 0], [0.2, 0.16], [0.13, 0.3], [0.1, 0.55], [0.06, 0.7], [0.055, 2.5], [0.09, 2.62], [0.07, 2.72], [0.12, 2.82], [0.05, 2.95]], 10, fe));
    for (const s of [0, 1]) { const dir = s ? -1 : 1, cr = new T.CatmullRomCurve3([new T.Vector3(0, 2.7, 0), new T.Vector3(0, 3.0, dir * 0.12), new T.Vector3(0, 3.32, dir * 0.35), new T.Vector3(0, 3.38, dir * 0.62), new T.Vector3(0, 3.22, dir * 0.78)]); const arm = new T.Mesh(new T.TubeGeometry(cr, 14, 0.02, 5), fe); arm.castShadow = true; g.add(arm);
      const volut = new T.Mesh(new T.TorusGeometry(0.1, 0.014, 5, 12, Math.PI * 1.5), fe); volut.rotation.y = Math.PI / 2; volut.position.set(0, 2.98, dir * 0.1); g.add(volut);
      const far = lathe('l-farol', [[0, 0], [0.09, 0.03], [0.14, 0.2], [0.11, 0.36], [0.05, 0.42], [0, 0.44]], 8, vid); far.position.set(0, 2.8, dir * 0.78); g.add(far);
      const tapa = new T.Mesh(new T.ConeGeometry(0.17, 0.14, 8), fe); tapa.position.set(0, 3.28, dir * 0.78); g.add(tapa);
    }
    return g;
  }

  // ---------- Pozo de piedra con arco de hierro y cubo ----------
  function pozo(W, x, z) {
    const g = new T.Group(); g.position.set(x, 0, z); W.add(g); const pie = C() ? C().piedraMat('#a89f8d') : mat('#a89f8d'), mad = C() ? C().maderaMat('#5b4330') : mat('#5b4330');
    g.add(lathe('pozo', [[0.0, 0], [0.95, 0], [1.0, 0.1], [1.0, 0.85], [1.12, 0.9], [1.12, 1.0], [0.85, 1.0], [0.82, 0.9], [0.82, 0.2]], 20, pie));
    const ag = new T.Mesh(new T.CircleGeometry(0.8, 16).rotateX(-Math.PI / 2), mat('#1d3a4a', { roughness: 0.1 })); ag.position.y = 0.4; g.add(ag);
    for (const s of [-1, 1]) caja(g, 0.1, 2.0, 0.1, mad, s * 0.95, 0.9, 0);
    const arc = new T.Mesh(new T.TorusGeometry(0.95, 0.045, 6, 18, Math.PI), mat('#23282d', { metalness: 0.7, roughness: 0.5 })); arc.position.set(0, 2.5, 0); arc.rotation.y = 0; g.add(arc);
    caja(g, 2.0, 0.08, 0.08, mad, 0, 2.4, 0); const rodillo = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 1.8, 8).rotateZ(Math.PI / 2), mad); rodillo.position.set(0, 2.2, 0); g.add(rodillo);
    const cuerda = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 1.0, 5), mat('#8a7a5a')); cuerda.position.set(0.3, 1.7, 0); g.add(cuerda);
    const cubo = lathe('cubo', [[0.1, 0], [0.16, 0.02], [0.2, 0.2], [0.19, 0.22]], 10, mad); cubo.position.set(0.3, 1.18, 0); g.add(cubo);
    return g;
  }

  // ---------- Iglesia ----------
  function vidriera(M, k) {
    const cols = [['#b3262e', '#2a5fa8', '#e8b53a', '#2e7d4a'], ['#2a5fa8', '#7a3d94', '#e8b53a', '#b3262e']][k % 2];
    return M.textura('vidriera-' + k, 128, (x, n) => { const r = rn('vid' + k); x.fillStyle = '#1b1f27'; x.fillRect(0, 0, n, n); const f = 6, w = n / f; for (let i = 0; i < f; i++) for (let j = 0; j < f; j++) { x.fillStyle = cols[(r() * 4) | 0]; x.fillRect(i * w + 3, j * w + 3, w - 6, w - 6); } x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(0, 0, n, n * 0.4); });
  }
  function ventanaOjival(g, M, x, y, z, ry, w, h, k, pie) {
    const G = new T.Group(); G.position.set(x, y, z); G.rotation.y = ry; g.add(G);
    const vt = vidriera(M, k), mv = vt ? new T.MeshStandardMaterial({ map: vt, roughness: 0.2, emissive: 0x222222, emissiveIntensity: 0.4 }) : mat('#2a5fa8');
    const r = new T.Mesh(new T.PlaneGeometry(w, h), mv); r.position.y = h / 2; G.add(r); const c = new T.Mesh(new T.CircleGeometry(w / 2, 14, 0, Math.PI), mv); c.position.y = h; G.add(c);
    const arc = new T.Mesh(new T.TorusGeometry(w / 2 + 0.06, 0.07, 6, 14, Math.PI), pie); arc.position.set(0, h, 0.02); arc.scale.z = 0.7; G.add(arc);
    for (const s of [-1, 1]) caja(G, 0.12, h, 0.12, pie, s * (w / 2 + 0.06), 0, 0.02); caja(G, w + 0.3, 0.12, 0.3, pie, 0, -0.1, 0.1);
    caja(G, 0.05, h + w / 2, 0.05, pie, 0, 0, 0.02);
  }
  function iglesia(W, M, E, r, club, x, z) {
    const K = C(), g = new T.Group(); g.position.set(x, 0, z); W.add(g);
    const cm = K.envejecer(E.clave === 'andaluz' ? '#f4f1ea' : '#bfa985', r, 0.92, 0.05), mM = K.murMat(cm), mP = K.piedraMat('#b3a78f'), mPc = K.piedraMat('#c8bda6'), mad = K.maderaMat('#4a3020'), hierro = mat('#23282d', { roughness: 0.5, metalness: 0.7 }), teja = K.envejecer(E.teja || '#b4643d', r, 1.0, 0.1), dark = mat('#0d1116');
    const nave = new T.Mesh(new T.BoxGeometry(10, 9.5, 13), mM); nave.position.y = 4.75; nave.castShadow = true; nave.receiveShadow = true; g.add(nave);
    caja(g, 10.2, 1.1, 13.2, mP, 0, 0, 0); caja(g, 10.3, 0.12, 13.3, mPc, 0, 1.1, 0);
    // cubierta a dos aguas con la cumbrera a lo largo de la nave (z)
    const rg = new T.Group(); rg.rotation.y = Math.PI / 2; rg.position.y = 9.5; g.add(rg); K.tejado(rg, 13, 10, 3.6, teja, 0, r, mM);
    // contrafuertes escalonados con talud y ventanas ojivales con vidrieras entre ellos
    const sh = new T.Shape(); sh.moveTo(0, 0); sh.lineTo(0.9, 0); sh.lineTo(0.9, 4.6); sh.lineTo(0.55, 6.4); sh.lineTo(0.2, 7.3); sh.lineTo(0, 7.4); sh.lineTo(0, 0);
    const gc = new T.ExtrudeGeometry(sh, { depth: 0.8, bevelEnabled: false }); for (const s of [-1, 1]) for (const zz of [-5.4, -1.8, 1.8, 5.4]) { const cf = new T.Mesh(gc, mP); cf.position.set(s * 5.0, 0.2, zz - 0.4); if (s < 0) cf.scale.x = -1; cf.castShadow = true; g.add(cf); }
    [-3.6, 0, 3.6].forEach((zz, i) => { for (const s of [-1, 1]) ventanaOjival(g, M, s * 5.02, 3.0, zz, s * Math.PI / 2, 0.9, 3.0, i + (s > 0 ? 1 : 0), mPc); });
    // fachada: portal con tres arquivoltas, puerta de dos hojas, escalinata semicircular, rosetón y cruz
    const pz = 6.52;
    for (let k = 0; k < 3; k++) { const a = new T.Mesh(new T.TorusGeometry(1.0 + k * 0.28, 0.12, 6, 20, Math.PI), k % 2 ? mPc : mP); a.position.set(0, 2.9, pz + 0.02 + k * 0.03); a.scale.z = 0.8; g.add(a); }
    for (let k = 0; k < 3; k++) for (const s of [-1, 1]) caja(g, 0.2, 2.9, 0.2, k % 2 ? mPc : mP, s * (1.0 + k * 0.28), 0, pz + 0.04 + k * 0.03);
    for (const s of [-1, 1]) { caja(g, 0.98, 2.9, 0.1, mad, s * 0.5, 0, pz - 0.02); for (let b = 0; b < 3; b++) caja(g, 0.98, 0.07, 0.04, hierro, s * 0.5, 0.5 + b * 0.9, pz + 0.04); } const tim = new T.Mesh(new T.CircleGeometry(1.0, 18, 0, Math.PI), mad); tim.position.set(0, 2.9, pz - 0.02); g.add(tim);
    for (let k = 0; k < 4; k++) { const e = new T.Mesh(new T.CylinderGeometry(2.6 - k * 0.3, 2.6 - k * 0.3, 0.17, 24, 1, false, -Math.PI / 2, Math.PI), k % 2 ? mPc : mP); e.position.set(0, 0.08 + (3 - k) * 0.17 + 0.0, pz + 0.25); g.add(e); }
    const rosa = new T.Group(); rosa.position.set(0, 7.0, pz + 0.04); g.add(rosa);
    const rt = M.textura('rosetón', 256, (c, n) => { const rr = rn('rosa'); c.fillStyle = '#16181f'; c.fillRect(0, 0, n, n); const cols = ['#b3262e', '#2a5fa8', '#e8b53a', '#2e7d4a', '#7a3d94']; for (let ring = 0; ring < 3; ring++) for (let i = 0; i < 8 + ring * 4; i++) { const a0 = i / (8 + ring * 4) * 6.283, a1 = (i + 1) / (8 + ring * 4) * 6.283, r0 = n * (0.08 + ring * 0.13), r1 = r0 + n * 0.12; c.fillStyle = cols[(rr() * 5) | 0]; c.beginPath(); c.arc(n / 2, n / 2, r1, a0 + 0.03, a1 - 0.03); c.arc(n / 2, n / 2, r0, a1 - 0.03, a0 + 0.03, true); c.closePath(); c.fill(); } c.fillStyle = '#e8b53a'; c.beginPath(); c.arc(n / 2, n / 2, n * 0.07, 0, 6.3); c.fill(); });
    const rd = new T.Mesh(new T.CircleGeometry(1.15, 32), rt ? new T.MeshStandardMaterial({ map: rt, emissive: 0x222222, emissiveIntensity: 0.5, roughness: 0.2 }) : mat('#2a5fa8')); rosa.add(rd); const rr1 = new T.Mesh(new T.TorusGeometry(1.2, 0.13, 8, 32), mPc); rosa.add(rr1); const rr2 = new T.Mesh(new T.TorusGeometry(0.36, 0.05, 6, 20), mPc); rosa.add(rr2);
    for (let i = 0; i < 8; i++) { const sp = new T.Mesh(new T.BoxGeometry(0.06, 1.15, 0.06), mPc); sp.position.set(Math.sin(i * Math.PI / 4) * 0.58, Math.cos(i * Math.PI / 4) * 0.58, 0.01); sp.rotation.z = -i * Math.PI / 4; rosa.add(sp); }
    caja(g, 0.18, 1.5, 0.18, mPc, 0, 13.0, 6.3); caja(g, 0.8, 0.18, 0.18, mPc, 0, 14.0, 6.3);
    // ábside semicircular con tejado cónico y ventanas
    const ab = new T.Mesh(new T.CylinderGeometry(3.4, 3.4, 7.2, 20, 1, false, Math.PI / 2, Math.PI), mM); ab.position.set(0, 3.6, -6.5); ab.castShadow = true; g.add(ab);
    const abz = new T.Mesh(new T.CylinderGeometry(3.5, 3.5, 1.0, 20, 1, false, Math.PI / 2, Math.PI), mP); abz.position.set(0, 0.5, -6.5); g.add(abz);
    const abt = new T.Mesh(new T.ConeGeometry(3.7, 2.6, 20, 1, false, Math.PI / 2, Math.PI), K.tejaMat(teja)); abt.position.set(0, 7.2 + 1.3, -6.5); abt.castShadow = true; g.add(abt);
    for (let i = -1; i <= 1; i++) { const ph = i * 0.7; ventanaOjival(g, M, Math.sin(ph) * 3.42, 2.6, -6.5 - Math.cos(ph) * 3.42, Math.PI - ph, 0.7, 2.4, 2 + i, mPc); }
    // campanario: fuste, reloj, cuerpo de campanas con arcos, cornisa y aguja octogonal con bola y cruz
    const tx = 3.4, tz = 4.8, tg = new T.Group(); tg.position.set(tx, 0, tz); g.add(tg);
    const fuste = new T.Mesh(new T.BoxGeometry(3.4, 17.5, 3.4), mM); fuste.position.y = 8.75; fuste.castShadow = true; tg.add(fuste); caja(tg, 3.7, 1.2, 3.7, mP, 0, 0, 0); caja(tg, 3.55, 0.15, 3.55, mPc, 0, 1.2, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let q = 0; q < 35; q++) { const wq = q % 2 ? 0.5 : 0.3; caja(tg, wq, 0.46, 0.36, mPc, sx * (1.7 - wq / 2 + 0.03), 1.4 + q * 0.46, sz * 1.55); }
    const reloj = M.textura('reloj-iglesia', 128, (c, n) => { c.fillStyle = '#f2ecda'; c.beginPath(); c.arc(n / 2, n / 2, n / 2 - 2, 0, 6.3); c.fill(); c.strokeStyle = '#23282d'; c.lineWidth = 6; c.stroke(); for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; c.lineWidth = k % 3 ? 2 : 4; c.beginPath(); c.moveTo(n / 2 + Math.sin(a) * (n / 2 - 18), n / 2 - Math.cos(a) * (n / 2 - 18)); c.lineTo(n / 2 + Math.sin(a) * (n / 2 - 8), n / 2 - Math.cos(a) * (n / 2 - 8)); c.stroke(); } c.lineWidth = 6; c.beginPath(); c.moveTo(n / 2, n / 2); c.lineTo(n / 2 - 14, n / 2 - 24); c.stroke(); c.lineWidth = 4; c.beginPath(); c.moveTo(n / 2, n / 2); c.lineTo(n / 2 + 30, n / 2 - 22); c.stroke(); });
    for (const [rx, px, pz2] of [[0, 0, 1.75], [Math.PI / 2, 1.75, 0]]) { const cl = new T.Mesh(new T.CircleGeometry(0.62, 28), reloj ? new T.MeshBasicMaterial({ map: reloj }) : mat('#f2ecda')); cl.position.set(px, 10.4, pz2); cl.rotation.y = rx; tg.add(cl); const aro = new T.Mesh(new T.TorusGeometry(0.65, 0.07, 6, 28), mPc); aro.position.copy(cl.position); aro.rotation.y = rx; tg.add(aro); }
    for (let f = 0; f < 4; f++) { const fg = new T.Group(); fg.rotation.y = f * Math.PI / 2; tg.add(fg); for (const s of [-1, 1]) { const ox = s * 0.55; caja(fg, 0.8, 1.5, 0.12, dark, ox, 14.3, 1.7); const hd = new T.Mesh(new T.CircleGeometry(0.4, 14, 0, Math.PI), dark); hd.position.set(ox, 15.8, 1.72); fg.add(hd); const ar = new T.Mesh(new T.TorusGeometry(0.45, 0.07, 6, 14, Math.PI), mPc); ar.position.set(ox, 15.8, 1.74); fg.add(ar); for (const t of [-0.42, 0.42]) caja(fg, 0.1, 1.55, 0.2, mPc, ox + t, 14.25, 1.72); }
      const cam = new T.Mesh(new T.SphereGeometry(0.28, 10, 8, 0, 6.283, 0, 1.9), mat('#b08a3a', { metalness: 0.8, roughness: 0.4 })); cam.position.set(0, 14.6, 0.2); cam.scale.y = 1.2; if (f === 0) tg.add(cam); }
    caja(tg, 3.9, 0.28, 3.9, mPc, 0, 17.5, 0); for (const s of [-1, 1]) for (const t of [-1, 1]) { const pi = lathe('pinaculo', [[0.0, 0], [0.17, 0.0], [0.13, 0.25], [0.15, 0.4], [0.07, 0.8], [0.0, 1.1]], 8, mPc); pi.position.set(s * 1.78, 17.78, t * 1.78); tg.add(pi); }
    const aguja = new T.Mesh(new T.ConeGeometry(2.3, 5.2, 8), K.tejaMat(K.envejecer('#4a4f57', r, 1, 0.04))); aguja.rotation.y = Math.PI / 8; aguja.position.y = 17.78 + 2.6; aguja.castShadow = true; tg.add(aguja);
    const bola = new T.Mesh(new T.SphereGeometry(0.28, 10, 8), mat('#c9a227', { metalness: 0.8, roughness: 0.35 })); bola.position.y = 23.2; tg.add(bola); caja(tg, 0.1, 1.2, 0.1, '#c9a227', 0, 23.3, 0); caja(tg, 0.55, 0.1, 0.1, '#c9a227', 0, 24.1, 0);
    return g;
  }

  // ---------- Muralla: puerta con arco de medio punto, torres con matacanes y aspilleras ----------
  function puertaMuralla(W, piedra, px, pz, alto) {
    const spring = 3.2, R = 1.5, sh = new T.Shape(); sh.moveTo(-R, 0); sh.lineTo(-R, 2.0); sh.lineTo(R, 2.0); sh.lineTo(R, 0); sh.absarc(0, 0, R, 0, Math.PI, false);
    const geo = new T.ExtrudeGeometry(sh, { depth: 1.6, bevelEnabled: false }), blk = new T.Mesh(geo, piedra); blk.position.set(px, spring, pz - 0.8); blk.castShadow = true; blk.receiveShadow = true; W.add(blk);
    const dov = new T.Mesh(new T.TorusGeometry(R + 0.2, 0.22, 8, 24, Math.PI), piedra); dov.position.set(px, spring, pz + 0.82); dov.scale.z = 0.7; W.add(dov); const dov2 = dov.clone(); dov2.position.z = pz - 0.82; W.add(dov2);
    for (const s of [-1, 1]) { caja(W, 0.5, spring, 1.6, piedra, px + s * (R + 0.05), 0, pz); const imp = caja(W, 0.7, 0.2, 1.7, piedra, px + s * (R + 0.05), spring - 0.1, pz); void imp; }
    caja(W, 5.4, Math.max(0.6, alto + 1.3 - (spring + 2.0)), 1.7, piedra, px, spring + 2.0, pz);
    for (let i = 0; i < 6; i++) { const my = alto + 1.3; caja(W, 0.55, 0.7, 1.7, piedra, px - 2.4 + i * 0.96, my, pz); }
    const reja = mat('#23282d', { roughness: 0.5, metalness: 0.7 }); for (let i = -4; i <= 4; i++) caja(W, 0.05, 1.5, 0.05, reja, px + i * 0.3, spring + 1.2, pz - 0.3); for (let j = 0; j < 4; j++) caja(W, 2.9, 0.05, 0.05, reja, px, spring + 1.3 + j * 0.35, pz - 0.3);
  }
  function almenasTorre(W, x, z, alto, piedra) {
    const mc = new T.Mesh(new T.TorusGeometry(2.3, 0.3, 8, 22), piedra); mc.rotation.x = Math.PI / 2; mc.position.set(x, alto + 1.9, z); mc.castShadow = true; W.add(mc);
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; const co = new T.Mesh(new T.ConeGeometry(0.2, 0.55, 5).rotateX(Math.PI), piedra); co.position.set(x + Math.cos(a) * 2.28, alto + 1.55, z + Math.sin(a) * 2.28); W.add(co); }
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; const sl = new T.Mesh(new T.BoxGeometry(0.14, 0.9, 0.3), mat('#0d1116')); sl.position.set(x + Math.cos(a) * 2.32, alto * 0.55, z + Math.sin(a) * 2.32); sl.rotation.y = -a; W.add(sl); const a2 = new T.Mesh(new T.CircleGeometry(0.07, 8, 0, Math.PI), mat('#0d1116')); a2.position.set(x + Math.cos(a) * 2.34, alto * 0.55 + 0.45, z + Math.sin(a) * 2.34); a2.rotation.y = Math.PI / 2 - a; W.add(a2); }
  }
  GM.curvas = { lathe, fuente, farola, pozo, iglesia, puertaMuralla, almenasTorre };
})();
