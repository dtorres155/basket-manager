/* CIUDAD DEPORTIVA PARA PASEAR (GM.deportivaMundo) — escena 'deportiva' del motor de sede3d.js
   Es el mismo campus que se ve en el menú (ciudadDeportiva.campusEn: entorno, parcelas, edificios por nivel y obras por fases),
   escalado a tamaño real (×4,2: una persona mide lo que mide). Se entra por la puerta del final de la calle central de la ciudad
   (zona del campus en ciudad_barrios.js) o con «Pasear por la ciudad deportiva» en su menú. Todo lo que tiene altura (edificios,
   setos, farolas, árboles) bloquea el paso; delante de cada edificio hay una zona con su panel: estado, construir o mejorar (en los
   modos de gestión) y sus actividades, las mismas que en el menú. Jugadores del club corren por el camino de ronda.
   Expone: construir(S, M, st), poblar(S, M, st), siguiente(S, M, n), ESCALA. */
(function () {
  const U = GM.util, ESCALA = 4.2;

  // ---------- Entorno real de la ciudad deportiva (en metros) ----------
  // Puerta con caseta y barrera, carretera de entrada, aparcamiento, vial de circunvalación con árboles y farolas que lleva a
  // cada edificio, plaza central con monolito y banderas, dos pistas exteriores, campo con pista de atletismo y valla perimetral.
  // Lo usan el paseo (deportiva) y la vista del menú (ciudad_deportiva.campusEn), que así son el mismo sitio.
  function lienzo(w, h, dib) { if (typeof document === 'undefined') return null; const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext && c.getContext('2d'); if (!x) return null; dib(x, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
  function entornoReal(W, L, S, club, o) {
    o = o || {}; const k = ESCALA, czm = L.cz * k, A = L.ancho * k, B = L.fondo * k, gz = (L.cz + L.fondo + 0.4) * k, esc = o.esc || 1;
    const TR = GM.texturas, c1 = club.colores[0] === '#000000' ? '#222222' : club.colores[0], c2 = club.colores[1] || '#ffffff';
    const MM = {}, mat = (c, op) => { const kk = c + JSON.stringify(op || {}); return MM[kk] || (MM[kk] = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.85 }, op || {}))); };
    const real = (id, op, resp) => { const m = new THREE.MeshStandardMaterial({ color: resp, roughness: 0.9 }); if (TR) TR.aplicar(m, id, Object.assign({}, op, { escala: (op.escala || 2) * esc })); return m; };
    const mHierba = real('Grass004', { escala: 4, tinte: 0xb6cf98 }, '#7fb069'), mHierba2 = real('Grass004', { escala: 3, tinte: 0x9fbf7e }, '#6f9e5a'), mAsfalto = real('Asphalt010', { escala: 5, tinte: 0xa8a8a8 }, '#4a4f55'), mAcera = real('Concrete034', { escala: 2.5, tinte: 0xd8d4cc }, '#cfcac0'), mPlaza = real('PavingStones070', { escala: 2.4, tinte: 0xe0d8c8 }, '#b9b0a0'), mTierra = real('Ground054', { escala: 3, tinte: 0xd0b08a }, '#b0906a');
    const out = { arboles: [], paseo: [], pistas: [], pista: null, caseta: null, barrera: null, farolas: null, coches: [], publico: [] };
    const tMalla = lienzo(64, 64, (x, w, h) => { x.clearRect(0, 0, w, h); x.strokeStyle = 'rgba(70,95,80,0.9)'; x.lineWidth = 2; x.beginPath(); for (let i = -64; i < 128; i += 8) { x.moveTo(i, 0); x.lineTo(i + 64, 64); x.moveTo(i + 64, 0); x.lineTo(i, 64); } x.stroke(); });
    if (tMalla) { tMalla.wrapS = tMalla.wrapT = THREE.RepeatWrapping; tMalla.repeat.set(3, 2); }
    const mMalla = new THREE.MeshStandardMaterial({ map: tMalla, color: tMalla ? 0xffffff : 0x3c5a46, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, opacity: tMalla ? 1 : 0.35 });
    const caja = (w, h, d, m, x, y, z, ry) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof m === 'string' ? mat(m) : m); me.position.set(x, y + h / 2, z); if (ry) me.rotation.y = ry; me.castShadow = true; me.receiveShadow = true; W.add(me); return me; };
    const cil = (r, h, m, x, y, z, s) => { const me = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, s || 10), typeof m === 'string' ? mat(m) : m); me.position.set(x, y + h / 2, z); me.castShadow = true; W.add(me); return me; };
    const plano = (geo, m, y) => { const me = new THREE.Mesh(geo, m); me.position.y = y; me.receiveShadow = true; W.add(me); return me; };
    const elipse = (rx, rz, cz, n) => { const s = new THREE.Shape(); for (let i = 0; i <= (n || 96); i++) { const a = i / (n || 96) * Math.PI * 2, x = Math.cos(a) * rx, z = Math.sin(a) * rz + cz; if (i) s.lineTo(x, -z); else s.moveTo(x, -z); } return s; };
    const anillo = (rx, rz, ancho, cz, m, y) => { const s = elipse(rx + ancho / 2, rz + ancho / 2, cz), hueco = elipse(rx - ancho / 2, rz - ancho / 2, cz); s.holes.push(hueco); return plano(new THREE.ShapeGeometry(s, 96).rotateX(-Math.PI / 2), m, y); };
    const rect = (x0, z0, x1, z1, m, y) => { const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2); const me = plano(g, m, y); me.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); return me; };
    const banda = (a, b, ancho, m, y) => { const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz), g = new THREE.PlaneGeometry(ancho, l).rotateX(-Math.PI / 2); const me = plano(g, m, y); me.position.set((a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2); me.rotation.y = Math.atan2(dx, dz); return me; };
    // Suelo: césped dentro del recinto y un prado más oscuro fuera
    rect(-A - 60, czm - B - 60, A + 60, czm + B + 70, mHierba2, -0.06);
    plano(new THREE.ShapeGeometry(elipse(A + 1, B + 1, czm), 96).rotateX(-Math.PI / 2), mHierba, -0.03);
    // Vial de circunvalación (7 m) con aceras y bordillos; entrada desde la puerta
    const RX = 62, RZ = 46; anillo(RX, RZ, 7, czm, mAsfalto, 0.0); anillo(RX + 5, RZ + 5, 3, czm, mAcera, 0.012); anillo(RX - 5, RZ - 5, 3, czm, mAcera, 0.012);
    const rs = czm + RZ; rect(-4, rs, 4, gz + 6, mAsfalto, 0.004); rect(-7, rs + 4, -4, gz, mAcera, 0.014); rect(4, rs + 4, 7, gz, mAcera, 0.014);
    for (let z = rs + 6; z < gz - 2; z += 4) caja(0.15, 0.01, 2, '#f2f2f2', 0, 0.01, z);
    // Explanada y camino desde el vial hasta cada edificio
    L.slots.forEach(sl => { const bx = sl.x * k, bz = sl.z * k, a = Math.atan2(bz - czm, bx), ex = Math.cos(a) * (RX + 7), ez = Math.sin(a) * (RZ + 7) + czm, fx = bx - Math.cos(a) * 15, fz = bz - Math.sin(a) * 15;
      banda([ex, ez], [fx, fz], 5, mAcera, 0.016); const pad = new THREE.Mesh(new THREE.CircleGeometry(15, 40).rotateX(-Math.PI / 2), mPlaza); pad.position.set(bx - Math.cos(a) * 6, 0.01, bz - Math.sin(a) * 6); pad.receiveShadow = true; W.add(pad);
      out.paseo.push([fx, fz]); });
    // Plaza central: adoquines, monolito con el escudo y tres mástiles
    { const p = new THREE.Mesh(new THREE.CircleGeometry(9, 48).rotateX(-Math.PI / 2), mPlaza); p.position.set(0, 0.02, czm); p.receiveShadow = true; W.add(p);
      caja(3.4, 4.4, 0.8, c1, 0, 0.05, czm - 2.5); const esc2 = lienzo(256, 320, (x, w, h) => { x.fillStyle = c1; x.fillRect(0, 0, w, h); x.fillStyle = c2 === c1 ? '#fff' : c2; x.font = 'bold 74px sans-serif'; x.textAlign = 'center'; x.fillText(club.siglas, w / 2, h * 0.45); x.font = 'bold 26px sans-serif'; x.fillText('CIUDAD DEPORTIVA', w / 2, h * 0.72); });
      if (esc2) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 4), new THREE.MeshStandardMaterial({ map: esc2 })); pl.position.set(0, 2.3, czm - 2.08); W.add(pl); }
      [-4, 0, 4].forEach((x, i) => { cil(0.07, 9, '#d9dde0', x, 0, czm - 6, 8); const b = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), new THREE.MeshStandardMaterial({ color: i === 1 ? c1 : i ? c2 : '#ffffff', side: THREE.DoubleSide })); b.position.set(x + 1.25, 8.1, czm - 6); b.userData = { anim: t => { b.rotation.y = Math.sin(t * 2 + i) * 0.25; } }; W.add(b); });
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.5; banco(Math.cos(a) * 7.6, czm + Math.sin(a) * 7.6, a + Math.PI / 2); }
      rect(-2, czm + 9, 2, rs - 3.5, mAcera, 0.016); }
    function banco(x, z, ry) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; W.add(g); const B = (w, h, d, m, px, py, pz) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(m)); me.position.set(px, py, pz); me.castShadow = true; g.add(me); }; B(1.6, 0.06, 0.45, '#8a6a4a', 0, 0.45, 0); B(1.6, 0.4, 0.06, '#8a6a4a', 0, 0.68, -0.2); B(0.06, 0.45, 0.4, '#3a3f45', -0.7, 0.22, 0); B(0.06, 0.45, 0.4, '#3a3f45', 0.7, 0.22, 0); }
    // Pistas exteriores (acrílico con líneas, canastas y valla alta detrás de los aros)
    const tPista = lienzo(512, 280, (x, w, h) => { x.fillStyle = '#2f6f9e'; x.fillRect(0, 0, w, h); x.fillStyle = '#2b8a5b'; x.fillRect(14, 14, w - 28, h - 28); x.fillStyle = '#2f6f9e'; x.fillRect(14, h / 2 - 44, 100, 88); x.fillRect(w - 114, h / 2 - 44, 100, 88); x.strokeStyle = '#fff'; x.lineWidth = 3; x.strokeRect(14, 14, w - 28, h - 28); x.beginPath(); x.moveTo(w / 2, 14); x.lineTo(w / 2, h - 14); x.stroke(); x.beginPath(); x.arc(w / 2, h / 2, 34, 0, 7); x.stroke(); x.strokeRect(14, h / 2 - 44, 100, 88); x.strokeRect(w - 114, h / 2 - 44, 100, 88); x.beginPath(); x.arc(30, h / 2, 120, -1.36, 1.36); x.stroke(); x.beginPath(); x.arc(w - 30, h / 2, 120, Math.PI - 1.36, Math.PI + 1.36); x.stroke(); });
    [[-24, czm - 14], [-24, czm + 4]].forEach(([px, pz], i) => {
      const pm = new THREE.Mesh(new THREE.PlaneGeometry(30, 17).rotateX(-Math.PI / 2), tPista ? new THREE.MeshStandardMaterial({ map: tPista, roughness: 0.7 }) : mat('#2f6f9e')); pm.position.set(px, 0.025, pz); pm.receiveShadow = true; W.add(pm);
      for (const s of [-1, 1]) { const hx = px + s * 14.2; cil(0.09, 3.05, '#2a2f35', hx + s * 0.9, 0, pz, 8); caja(1.0, 0.08, 0.08, '#2a2f35', hx + s * 0.45, 3.0, pz); const tab = caja(0.05, 1.05, 1.8, mat('#f4f6f8', { transparent: true, opacity: 0.85 }), hx, 2.85, pz); void tab; const aro = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.02, 6, 16), mat('#e8590c')); aro.rotation.x = Math.PI / 2; aro.position.set(hx - s * 0.28, 3.05, pz); W.add(aro); }
      // valla: alta en los fondos, baja en los laterales (para mirar)
      for (const s of [-1, 1]) { valla(px + s * 15.2, pz - 8.6, px + s * 15.2, pz + 8.6, 3.2); valla(px - 15.2, pz + s * 8.6, px + 15.2, pz + s * 8.6, i === 0 && s > 0 ? 1.1 : 1.1); }
      out.pistas.push({ x: px, z: pz });
      for (let j = 0; j < 3; j++) banco(px - 6 + j * 6, pz + (i ? 10 : -10), i ? Math.PI : 0);
    });
    // Campo de entrenamiento físico con pista de atletismo
    { const fx = 31, fz = czm - 6; const tr = new THREE.Shape(), hole = new THREE.Path(), oval = (p, rx, rz, n) => { for (let q = 0; q <= 64; q++) { const a = q / 64 * Math.PI * 2, x = Math.cos(a) * rx, z = Math.sin(a) * rz; const R = 1; void R; if (q) p.lineTo(x, z); else p.moveTo(x, z); } void n; };
      oval(tr, 20, 12); oval(hole, 16.5, 8.5); tr.holes.push(hole); const tm = new THREE.Mesh(new THREE.ShapeGeometry(tr, 64).rotateX(Math.PI / 2), mat('#b5523b', { roughness: 0.95 })); tm.position.set(fx, 0.02, fz); tm.receiveShadow = true; W.add(tm);
      const tc = lienzo(256, 128, (x, w, h) => { for (let i = 0; i < 10; i++) { x.fillStyle = i % 2 ? '#4a9e4f' : '#428f45'; x.fillRect(i * w / 10, 0, w / 10, h); } x.strokeStyle = '#fff'; x.lineWidth = 2; x.strokeRect(6, 6, w - 12, h - 12); x.beginPath(); x.moveTo(w / 2, 6); x.lineTo(w / 2, h - 6); x.stroke(); });
      const cm = new THREE.Mesh(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2), tc ? new THREE.MeshStandardMaterial({ map: tc, roughness: 0.95 }) : mat('#4a9e4f')); cm.scale.set(16.4, 1, 8.4); cm.position.set(fx, 0.022, fz); cm.receiveShadow = true; W.add(cm);
      for (let q = 0; q < 16; q++) { const a = q / 16 * Math.PI * 2; out.paseo.push([fx + Math.cos(a) * 18.2, fz + Math.sin(a) * 10.2]); }
      out.pista = { x: fx, z: fz, rx: 18.2, rz: 10.2 };
      for (const s of [-1, 1]) { caja(0.1, 2.2, 0.1, '#ffffff', fx + s * 15, 0, fz - 2); caja(0.1, 2.2, 0.1, '#ffffff', fx + s * 15, 0, fz + 2); caja(0.1, 0.1, 4.1, '#ffffff', fx + s * 15, 2.15, fz); } }
    // Árboles a los dos lados del vial y farolas (las cabezas se encienden de noche)
    const troncos = [], copas = [], mCabeza = new THREE.MeshStandardMaterial({ color: 0xfff6d6, emissive: 0xffd28a, emissiveIntensity: 0.4 }); out.farolas = mCabeza;
    const perim = n => { const L2 = []; for (let i = 0; i < n; i++) L2.push(i / n * Math.PI * 2); return L2; };
    perim(30).forEach((a, i) => { for (const off of [-9, 9]) { const x = Math.cos(a) * (RX + off), z = Math.sin(a) * (RZ + off) + czm; if (Math.abs(x) < 10 && z > czm) continue; if (L.slots.some(sl => Math.hypot(sl.x * k - x, sl.z * k - z) < 22)) continue; if (out.pistas.some(p => Math.abs(p.x - x) < 17 && Math.abs(p.z - z) < 10)) continue; troncos.push([x, z, 0.9 + ((i * 7) % 5) * 0.08]); } });
    perim(18).forEach((a, i) => { const x = Math.cos(a) * (RX + 6.5), z = Math.sin(a) * (RZ + 6.5) + czm; if (Math.abs(x) < 8 && z > czm) return; cil(0.07, 5.2, '#2a2f35', x, 0, z, 8); const hd = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.36), mCabeza); hd.position.set(x, 5.2, z); W.add(hd); void i; });
    // Arboledas en el césped del centro (sin pisar pistas, campo, plaza ni caminos)
    { let s = 7; const rr = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      for (let i = 0; i < 260 && troncos.length < 140; i++) { const x = (rr() - 0.5) * 2 * (RX - 10), z = czm + (rr() - 0.5) * 2 * (RZ - 10); if ((x / (RX - 10)) ** 2 + ((z - czm) / (RZ - 10)) ** 2 > 0.92) continue;
        if (x > -41 && x < -7 && z > czm - 25 && z < czm + 15) continue; if (x > 8 && x < 54 && z > czm - 21 && z < czm + 9) continue; if (Math.hypot(x, z - czm) < 13) continue; if (Math.abs(x) < 6 && z > czm) continue;
        troncos.push([x, z, 0.8 + rr() * 0.5]); } }
    // Arboleda junto a la valla y fuera del recinto
    for (let i = 0; i < 70; i++) { const a = i / 70 * Math.PI * 2 + 0.03, f = 0.86 + ((i * 13) % 7) * 0.012, x = Math.cos(a) * A * f, z = Math.sin(a) * B * f + czm; if (Math.abs(x) < 12 && z > czm) continue; if (L.slots.some(sl => Math.hypot(sl.x * k - x, sl.z * k - z) < 20)) continue; troncos.push([x, z, 1.1 + (i % 4) * 0.12]); }
    for (let i = 0; i < 46; i++) { const a = i / 46 * Math.PI * 2, x = Math.cos(a) * (A + 12 + (i % 3) * 6), z = Math.sin(a) * (B + 12 + (i % 3) * 6) + czm; if (Math.abs(x) < 14 && z > czm) continue; troncos.push([x, z, 1.3]); }
    if (troncos.length) { const gT = new THREE.CylinderGeometry(0.22, 0.3, 3.2, 7), gC = new THREE.IcosahedronGeometry(2.4, 1), iT = new THREE.InstancedMesh(gT, mat('#6b5136'), troncos.length), iC = new THREE.InstancedMesh(gC, mat('#4f8a3c', { roughness: 0.95, flatShading: true }), troncos.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(), cc = new THREE.Color();
      troncos.forEach(([x, z, e], i) => { s.set(e, e, e); m4.compose(v.set(x, 1.6 * e, z), q, s); iT.setMatrixAt(i, m4); s.set(e, e * 0.9, e); m4.compose(v.set(x, 4.2 * e, z), q.setFromEuler(new THREE.Euler(0, i, 0)), s); iC.setMatrixAt(i, m4); iC.setColorAt(i, cc.setHSL(0.27 + ((i * 37) % 10) * 0.006, 0.42, 0.3 + ((i * 17) % 10) * 0.012)); });
      iT.castShadow = iC.castShadow = true; iT.receiveShadow = iC.receiveShadow = true; W.add(iT, iC); out.arboles = troncos.map(t => [t[0], t[1]]); }
    // Valla perimetral metálica con malla, abierta en la puerta
    function valla(xa, za, xb, zb, h) { const dx = xb - xa, dz = zb - za, l = Math.hypot(dx, dz), n = Math.max(1, Math.round(l / 3)); for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n, x0 = xa + dx * t0, z0 = za + dz * t0, x1 = xa + dx * t1, z1 = za + dz * t1, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, ll = l / n;
      const p = new THREE.Mesh(new THREE.PlaneGeometry(ll, h), mMalla); p.position.set(cx, h / 2, cz); p.rotation.y = -Math.atan2(dz, dx); W.add(p); cil(0.04, h + 0.1, '#3c5a46', x0, 0, z0, 6); } }
    { const N = 120, R = []; for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2; R.push([Math.cos(a) * (A + 0.6), Math.sin(a) * (B + 0.6) + czm]); } for (let i = 0; i < N; i++) { const [xa, za] = R[i], [xb, zb] = R[i + 1]; if (Math.abs((xa + xb) / 2) < 9 && (za + zb) / 2 > czm) continue; valla(xa, za, xb, zb, 2.4); } }
    // Puerta: pilares con el nombre, caseta del vigilante y barrera
    { caja(1.2, 5, 1.2, c1, -8.5, 0, gz); caja(1.2, 5, 1.2, c1, 8.5, 0, gz); caja(18.2, 1.3, 1.0, '#2a2f35', 0, 5, gz);
      const nom = lienzo(1024, 80, (x, w, h) => { x.fillStyle = '#2a2f35'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.font = 'bold 52px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText((L.nombre || 'CIUDAD DEPORTIVA').toUpperCase(), w / 2, h / 2 + 2); });
      if (nom) for (const s of [-1, 1]) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(17, 1.2), new THREE.MeshBasicMaterial({ map: nom })); pl.position.set(0, 5.65, gz + s * 0.51); if (s < 0) pl.rotation.y = Math.PI; W.add(pl); }
      const cs = new THREE.Group(); cs.position.set(10, 0, gz - 7); W.add(cs); const B2 = (w, h, d, m, x, y, z) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof m === 'string' ? mat(m) : m); me.position.set(x, y, z); me.castShadow = true; cs.add(me); return me; };
      B2(3, 2.6, 3, '#e8e4dc', 0, 1.3, 0); B2(3.4, 0.2, 3.4, c1, 0, 2.7, 0); B2(0.05, 1.1, 2.2, mat('#9fc4dc', { transparent: true, opacity: 0.55 }), -1.52, 1.5, 0); out.caseta = { x: 10, z: gz - 7 };
      const br = new THREE.Group(); br.position.set(4.2, 1.0, gz - 7); const brazo = new THREE.Mesh(new THREE.BoxGeometry(8, 0.12, 0.12), mat('#e0322c')); brazo.position.x = -4; br.add(brazo); for (let i = 0; i < 4; i++) { const fr = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.13, 0.13), mat('#ffffff')); fr.position.x = -0.8 - i * 2; br.add(fr); } W.add(br); caja(0.4, 1, 0.4, '#e0322c', 4.4, 0, gz - 7);
      br.userData = { barrera: true }; out.barrera = br;
      // carteles de dirección
      const tDir = lienzo(256, 256, (x, w, h) => { x.fillStyle = '#1d4f91'; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.font = 'bold 26px sans-serif'; ['← Pabellón y oficinas', 'Residencia →', '↑ Pistas y campo', 'Aparcamiento →'].forEach((t, i) => x.fillText(t, 12, 50 + i * 56)); });
      if (tDir) { cil(0.05, 3, '#2a2f35', -6, 0, gz - 14); const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7), new THREE.MeshStandardMaterial({ map: tDir })); pl.position.set(-6, 2.6, gz - 13.95); W.add(pl); } }
    // Aparcamiento con plazas pintadas y coches
    { const x0 = 9, x1 = 33, z0 = rs + 8, z1 = gz - 12; rect(x0, z0, x1, z1, mAsfalto, 0.006); for (let z = z0 + 2.5; z < z1 - 1; z += 2.6) { caja(5, 0.01, 0.1, '#f2f2f2', x0 + 2.5, 0.012, z); caja(5, 0.01, 0.1, '#f2f2f2', x1 - 2.5, 0.012, z); }
      const cols = ['#c8102e', '#f4f4f4', '#1d2024', '#2f6f9e', '#8a8f94', '#e8b923', '#3a5a3a', c1]; let n = 0;
      for (let z = z0 + 3.8; z < z1 - 1.5; z += 2.6) for (const lado of [0, 1]) { if (((n * 7) % 10) < 3) { n++; continue; } const cx = lado ? x1 - 2.6 : x0 + 2.6, g = coche(cols[n % cols.length]); g.position.set(cx, 0, z); g.rotation.y = lado ? -Math.PI / 2 : Math.PI / 2; W.add(g); out.coches.push([cx, z]); n++; } }
    function coche(color) { const g = new THREE.Group(), B3 = (w, h, d, m, x, y, z) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof m === 'string' ? mat(m) : m); me.position.set(x, y, z); me.castShadow = true; g.add(me); }; B3(1.8, 0.7, 4.1, color, 0, 0.6, 0); B3(1.6, 0.55, 2.1, color, 0, 1.2, -0.2); B3(1.62, 0.42, 1.9, mat('#1e2a33', { roughness: 0.15, metalness: 0.4 }), 0, 1.2, -0.2); for (const [x, z] of [[-0.85, 1.3], [0.85, 1.3], [-0.85, -1.3], [0.85, -1.3]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.24, 12), mat('#151515')); w.rotation.z = Math.PI / 2; w.position.set(x, 0.33, z); g.add(w); } return g; }
    // Papeleras y parterres en el camino de la entrada
    for (let z = rs + 8; z < gz - 4; z += 10) { cil(0.22, 0.8, '#3a5a46', -6.4, 0, z, 10); const p = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 4), mat('#5f8f45')); p.position.set(-9.5, 0.25, z); W.add(p); }
    out.publico = out.pistas.length ? (() => { const p0 = out.pistas[0], L3 = []; for (let i = 0; i < 22; i++) L3.push({ x: p0.x - 13 + i * 1.2, z: p0.z + 9.6 + (i % 2) * 0.5, ry: Math.PI }); return L3; })() : [];
    return out;
  }
  function construir(S, M, st) {
    const W = S.mundo, id = st.clubId, CD = GM.mods.ciudadDeportiva, club = st.equipos[id];
    const Wc = new THREE.Group(); Wc.scale.setScalar(ESCALA); W.add(Wc);
    const { L, mallas } = CD.campusEn(Wc, st, id);
    const A = L.ancho, B = L.fondo, cz = L.cz, k = ESCALA, gz = (cz + B + 0.4) * k;
    S.scene.background = new THREE.Color(0xa9d6f2); S.scene.fog = new THREE.Fog(0xb9dcf2, 90, 420); S.camera.far = 900; S.camera.updateProjectionMatrix();
    const lim = [-(A + 2) * k, (cz - B - 2) * k, (A + 2) * k, (cz + B + 4) * k], G = M.rejilla({ limites: lim, CELDA: 0.5 }); S.G = G;
    // Fuera del seto no se camina (salvo la puerta, al sur)
    for (let z = lim[1]; z < lim[3]; z += 1) for (let x = lim[0]; x < lim[2]; x += 1) { const e = Math.hypot((x + 0.5) / ((A + 0.4) * k), (z + 0.5 - cz * k) / ((B + 0.4) * k)); if (e > 0.985 && !(Math.abs(x) < 7 && z > gz - 6)) G.bloquea(x, z, x + 1, z + 1); }
    // Lo que tiene altura bloquea: edificios, setos, farolas, árboles, la fuente
    W.updateMatrixWorld(true); const caja = new THREE.Box3();
    Wc.traverse(o => { if (!o.isMesh || o.isInstancedMesh) return; caja.setFromObject(o); if (caja.max.y - caja.min.y < 0.8 || caja.min.y > 1.6 || caja.max.x - caja.min.x > 60 || caja.max.z - caja.min.z > 60) return; const m = 0.15; G.bloquea(caja.min.x + m, caja.min.z + m, caja.max.x - m, caja.max.z - m); });
    // Zonas: una delante de cada edificio (mirando a la plaza central) y la salida
    const modoGestion = st.modo === 'gestor' || st.modo === 'presidente';
    const zonas = []; S.paseoCD = [];
    L.slots.forEach(sl => {
      const dx = 0 - sl.x, dz = cz - sl.z, l = Math.hypot(dx, dz) || 1, zx = (sl.x + dx / l * 3.9) * k, zzz = (sl.z + dz / l * 3.9) * k;
      const sala = { id: 'cd_' + sl.id, nombre: sl.nombre, accion: '', destino: { todos: 'club' }, acciones: s2 => accionesParcela(s2, sl.id, modoGestion) };
      zonas.push([sala, zx, zzz]); S.paseoCD.push([zx, zzz]);
    });
    zonas.push([{ id: 'salir_deportiva', nombre: 'Salir a la ciudad', accion: 'Volver a la calle', destino: {}, irA: 'calle', boton: 'Salir a la calle' }, 0, gz + 4]);
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; S.paseoCD.push([Math.cos(a) * 8.6 * k, (Math.sin(a) * 7.4 + cz) * k]); }
    // Entorno real: los árboles (instanciados) bloquean el paso a mano; paseos por la pista de atletismo y los caminos
    const ER = Wc.userData.campusReal; S.campusReal = ER;
    if (ER) { ER.arboles.forEach(([x, z]) => G.bloquea(x - 0.4, z - 0.4, x + 0.4, z + 0.4)); S.paseoCD = S.paseoCD.concat(ER.paseo); if (ER.farolas) S.farolas = ER.farolas; }
    S.zonas = zonas.map(([sala, x, z]) => M.zona(W, sala, x, z, club));
    S.spawnDeportiva = { x: 0, z: gz - 2, ry: Math.PI };
    S.calleNombre = L.nombre; S.mallasCD = mallas;
    return W;
  }
  // Panel de cada parcela: estado, obra, construir o mejorar (si mandas tú) y actividades
  function accionesParcela(st, slot, gestion) {
    const CD = GM.mods.ciudadDeportiva, id = st.clubId, p = CD.parcelas(st, id).find(x => x.slot === slot); if (!p) return [];
    const out = [{ id: 'info', t: p.nivel ? p.nombre + ', nivel ' + p.nivel + ' de ' + p.nivelMax : p.nombre + ': solar', d: p.actual || p.desc, disponible: false, motivo: p.estado === 'obra' ? 'En obras: ' + p.motivo : p.actual || p.desc, fn: () => ({ ok: false }) }];
    if (p.estado === 'libre' || p.estado === 'mejorable') out.push({ id: 'obra', t: (p.nivel ? 'Mejorar: ' : 'Construir: ') + p.proximo, d: U.eur(p.coste) + ', ' + p.dias + ' días de obra.', disponible: gestion, motivo: gestion ? '' : 'Lo decide la dirección del club', fn: () => { const r = p.nivel ? CD.mejorar(st, id, slot) : CD.construir(st, id, slot); return r.ok ? { ok: true, texto: 'Empiezan las obras' } : r; } });
    (CD.actividades(st, id, slot) || []).forEach(a => out.push({ id: a.id, t: a.t, d: a.coste ? U.eur(a.coste) : 'Sin coste', disponible: a.disponible && (gestion || !a.coste), motivo: a.motivo || 'Lo decide la dirección del club', fn: () => { const r = CD.hacerActividad(st, id, slot, a.id); return r.ok ? { ok: true, texto: a.t } : r; } }));
    return out;
  }
  const PIEL = ['#f1c7a5', '#e0ac85', '#c68863', '#9a6142', '#6e4329'], PELO = ['#1d1510', '#3b2617', '#6a4425', '#a9793e'];
  async function poblar(S, M, st) {
    const club = st.equipos[st.clubId], c1 = club.colores[0], c2 = club.colores[1] || '#222', r = (() => { let a = U.hash(st.fecha + 'cd') >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; })();
    const jug = club.plantilla.map(i => st.jugadores[i]).filter(p => p && p.id !== 'yo').slice(0, 8);
    for (let i = 0; i < jug.length; i++) {
      const j = jug[i], p = await M.personaje({ modelo: ['h-casual_hoodie', 'h-casual_2', 'h-beach'][i % 3], altura: j.altura || 198, piel: PIEL[(U.hash(j.id) >>> 2) % 5], pelo: PELO[(U.hash(j.id) >>> 5) % 4], ropa: [c1, c2] });
      const q = S.paseoCD[(r() * S.paseoCD.length) | 0]; p.obj.position.set(q[0], 0, q[1]); Object.assign(p, { rol: j.nombre, jugador: j.id, r, espera: r() * 3, rapido: i % 2 === 0 });
      p.obj.userData = { npc: S.gente.length }; M.anim(p, 'idle'); S.mundo.add(p.obj); S.gente.push(p);
    }
    const ER = S.campusReal;
    if (ER) {
      const can = await Promise.all(Array.from({ length: 10 }, (_, i) => M.personaje({ modelo: ['h-casual_hoodie', 'h-casual_2', 'h-beach'][i % 3], altura: 176 + r() * 22, piel: PIEL[(r() * 5) | 0], pelo: PELO[(r() * 4) | 0], ropa: [i < 5 ? c1 : c2, c1] })));
      can.forEach((p, i) => { const pi = ER.pistas[i < 5 ? 0 : 1] || ER.pistas[0]; if (!pi) return; p.obj.position.set(pi.x + (r() - 0.5) * 20, 0, pi.z + (r() - 0.5) * 10); Object.assign(p, { rol: 'Canterano (' + (i < 5 ? 'junior' : 'cadete') + ')', canterano: true, pistaN: i < 5 ? 0 : 1, r, espera: r() * 2 }); p.obj.userData = { npc: S.gente.length }; M.anim(p, 'idle'); S.mundo.add(p.obj); S.gente.push(p); });
      for (let i = 0; i < 2; i++) { const pi = ER.pistas[i]; if (!pi) continue; const e = await M.personaje({ modelo: 'h-casual_hoodie', altura: 182, piel: PIEL[2], pelo: PELO[1], ropa: ['#1d2024', c1] }); e.obj.position.set(pi.x, 0, pi.z + (i ? -9.4 : 9.4)); e.obj.rotation.y = i ? 0 : Math.PI; Object.assign(e, { rol: i ? 'Entrenador de la cantera' : 'Ayudante técnico', fijo: true, r, espera: 99 }); e.obj.userData = { npc: S.gente.length }; M.anim(e, 'emote-yes'); S.mundo.add(e.obj); S.gente.push(e); }
      for (let i = 0; i < 4; i++) { const p = await M.personaje({ modelo: i % 2 ? 'm-casual' : 'h-beach', altura: 168 + r() * 20, piel: PIEL[(r() * 5) | 0], pelo: PELO[(r() * 4) | 0] }); const P = ER.pista; if (!P) break; p.obj.position.set(P.x + P.rx, 0, P.z); Object.assign(p, { rol: 'Corriendo por la pista', corredor: true, ang: i * 1.6, r, espera: r() }); p.obj.userData = { npc: S.gente.length }; M.anim(p, 'sprint'); S.mundo.add(p.obj); S.gente.push(p); }
      if (ER.caseta) { const g = await M.personaje({ modelo: 'm-suit', altura: 178, piel: PIEL[1], pelo: PELO[0] }); g.obj.position.set(ER.caseta.x, 0, ER.caseta.z + 0.4); g.obj.rotation.y = -Math.PI / 2; Object.assign(g, { rol: 'Vigilante de la puerta', fijo: true, r, espera: 99 }); g.obj.userData = { npc: S.gente.length }; M.anim(g, 'idle'); S.mundo.add(g.obj); S.gente.push(g); }
      // entrenamiento abierto (miércoles y sábados): aficionados en la valla de la pista y prensa
      const dia = GM.util.weekday(st.fecha); S.publicoCD = null;
      if ((dia === 3 || dia === 6) && ER.publico.length && GM.kit.publico) { const fans = ER.publico.map(f => ({ x: f.x, y: 0.88, z: f.z, ry: f.ry, ropa: r() < 0.7 ? c1 : c2, piel: PIEL[(r() * 5) | 0], pelo: PELO[(r() * 4) | 0], pantalon: '#2f3640' })); const P = GM.kit.publico(fans, 1, true); S.mundo.add(P.grupo); S.publicoCD = P;
        for (let i = 0; i < 2; i++) { const pi = ER.pistas[0], f = await M.personaje({ modelo: 'h-casual_2', altura: 175, piel: PIEL[i + 1], pelo: PELO[i] }); f.obj.position.set(pi.x + 16.4, 0, pi.z - 3 + i * 6); f.obj.rotation.y = -Math.PI / 2; Object.assign(f, { rol: 'Fotógrafo de prensa', fijo: true, r, espera: 99 }); f.obj.userData = { npc: S.gente.length }; M.anim(f, 'interact-right'); S.mundo.add(f.obj); S.gente.push(f); }
        S.cdAbierto = true; } else S.cdAbierto = false;
    }
    for (let i = 0; i < 3; i++) { const p = await M.personaje({ modelo: i % 2 ? 'm-formal' : 'h-worker', altura: 172, piel: PIEL[i + 1], pelo: PELO[i] }); const q = S.paseoCD[i]; p.obj.position.set(q[0], 0, q[1]); Object.assign(p, { rol: i % 2 ? 'Personal del club' : 'Mantenimiento', fijo: true, r, espera: 99 }); p.obj.userData = { npc: S.gente.length }; M.anim(p, i % 2 ? 'idle' : 'interact-right'); S.mundo.add(p.obj); S.gente.push(p); }
  }
  function actualizar(S, M, dt) {
    const ER = S.campusReal; if (!ER || !S.yo) return;
    if (ER.barrera) { const c = ER.caseta, d = Math.hypot(S.yo.obj.position.x - (c.x - 6), S.yo.obj.position.z - c.z), obj = d < 9 ? -1.35 : 0, b = ER.barrera; b.rotation.z += (obj - b.rotation.z) * Math.min(1, dt * 3); }
    if (S.publicoCD) { S.tPubCD = (S.tPubCD || 0) - dt; if (S.tPubCD <= 0) { S.tPubCD = 0.15; const t = performance.now() / 1000; S.publicoCD.colocar(i => (Math.sin(t * 3 + i * 1.9) > 0.75 ? { salto: 0.12, brazos: 1 } : null)); } }
  }
  function siguiente(S, M, n) {
    if (n.fijo) { n.espera = 60; return; }
    const ER = S.campusReal;
    if (n.canterano && ER && ER.pistas.length) { const p = ER.pistas[n.pistaN || 0], x = p.x + (n.r() - 0.5) * 24, z = p.z + (n.r() - 0.5) * 12; n.rapido = n.r() < 0.6; const ok = M.irA(n, x, z, () => { M.anim(n, n.r() < 0.5 ? 'interact-right' : 'idle'); n.espera = 0.6 + n.r() * 2; }); if (!ok) n.espera = 1; return; }
    if (n.corredor && ER && ER.pista) { const P = ER.pista; n.ang = (n.ang || n.r() * 6.28) + 0.5; n.rapido = true; const ok = M.irA(n, P.x + Math.cos(n.ang) * P.rx, P.z + Math.sin(n.ang) * P.rz, () => { n.espera = 0; }); if (!ok) n.espera = 1; return; }
    const q = S.paseoCD[(n.r() * S.paseoCD.length) | 0]; if (!q) { n.espera = 5; return; }
    const ok = M.irA(n, q[0] + (n.r() - 0.5) * 2, q[1] + (n.r() - 0.5) * 2, () => { M.anim(n, 'idle'); n.espera = 2 + n.r() * 5; });
    if (!ok) n.espera = 2;
  }
  GM.deportivaMundo = { construir, poblar, siguiente, actualizar, entornoReal, ESCALA };
})();
