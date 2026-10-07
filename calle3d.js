/* LA CALLE DEL CLUB EN 3D (GM.calle) — se sale de la sede andando, como en Big Ambitions
   Un cruce de la ciudad del club: avenida y calle con aceras, pasos de peatones elevados, semáforos y tráfico;
   pabellón, sede del club, tienda oficial, bar de la peña, ayuntamiento, quiosco y tu edificio. Vecinos que pasean
   (más con los colores del club cuanto más afición hay; día de partido, riadas de aficionados hacia el pabellón).
   La ciudad refleja al club: banderas en los balcones según la afición, más árboles y mural del escudo con más
   reputación, estilo de fachadas según el país. Usa el motor de sede3d.js (personas, caminos, paneles de sala).
   Expone: construir(S, M, st), poblar(S, M, st), siguiente(S, M, n), actualizar(S, M, dt). No escribe en el estado. */
(function () {
  const U = GM.util;
  const LIM = [-40, -22, 40, 22];
  const ESTILO = {
    ES: { muros: ['#ead9bd', '#dcc3a0', '#f2e6d2', '#d1b38c', '#e6cfae'], postigo: '#5a4630', persiana: true, balcon: true, teja: false },
    IT: { muros: ['#d9a86c', '#c98f58', '#e2bb85', '#cf9c63'], postigo: '#3f5f3a', persiana: true, balcon: true },
    GR: { muros: ['#f4f2ec', '#ebe8e0', '#f7f6f1'], postigo: '#2f6f9e', persiana: true, balcon: true },
    TR: { muros: ['#ddd2bd', '#c9bba2', '#e5dccb'], postigo: '#6b4a3a', persiana: false, balcon: true },
    DE: { muros: ['#d8d4cc', '#c3ccd2', '#e2d6c2', '#bfc6c0'], postigo: '#3b4148', persiana: false, balcon: false },
    US: { muros: ['#9c4a35', '#b5654a', '#7d3b2c', '#a85a40'], postigo: '#2a2a2a', persiana: false, balcon: false }
  };
  const rnd = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const MATS = {}; const mat = (hex, o) => { const k = hex + JSON.stringify(o || {}); return MATS[k] || (MATS[k] = new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness: 0.85 }, o || {}))); };
  // UV en metros para que las texturas de fachada se repitan por planta (3 m de ancho, 3,2 m de alto)
  function uvM(geo, ex, ey) {
    const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)); const u = ay > 0.5 ? p.getX(i) : ax > 0.5 ? p.getZ(i) : p.getX(i), v = ay > 0.5 ? p.getZ(i) : p.getY(i); uv.setXY(i, u / ex, v / ey); }
    return geo;
  }
  function caja(W, w, h, d, m, x, y, z, ry, sombra) { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof m === 'string' ? mat(m) : m); me.position.set(x, y + h / 2, z); if (ry) me.rotation.y = ry; me.castShadow = sombra !== false; me.receiveShadow = true; W.add(me); return me; }
  function cil(W, r, h, m, x, y, z, seg) { const me = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg || 10), typeof m === 'string' ? mat(m) : m); me.position.set(x, y + h / 2, z); me.castShadow = true; W.add(me); return me; }
  function plano(W, w, h, m, x, y, z, ry) { const me = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); me.position.set(x, y, z); me.rotation.y = ry || 0; W.add(me); return me; }
  function suelo(W, w, d, m, x, y, z) { const g = new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2); uvM(g, 2, 2); const me = new THREE.Mesh(g, m); me.position.set(x, y, z); me.receiveShadow = true; W.add(me); return me; }

  // ---------- Texturas ----------
  function texturas(M, E, club) {
    const t = {};
    const fach = (muro, k) => M.textura('fach-' + muro + k, 128, (x, n) => {
      x.fillStyle = muro; x.fillRect(0, 0, n, n); const r = rnd(k + 3); for (let i = 0; i < 500; i++) { x.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.06)'; x.fillRect(r() * n, r() * n, 2, 2); }
      x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(0, n - 6, n, 3); // cornisa entre plantas
      const wx = n * 0.3, ww = n * 0.4, wy = n * 0.18, wh = n * 0.55;
      if (E.persiana) { x.fillStyle = E.postigo; x.fillRect(wx - 14, wy, 12, wh); x.fillRect(wx + ww + 2, wy, 12, wh); }
      x.fillStyle = '#2d3b46'; x.fillRect(wx, wy, ww, wh); x.fillStyle = 'rgba(160,200,230,.35)'; x.fillRect(wx + 3, wy + 3, ww / 2 - 4, wh - 6);
      x.strokeStyle = '#f2f2ee'; x.lineWidth = 3; x.strokeRect(wx, wy, ww, wh); x.beginPath(); x.moveTo(wx + ww / 2, wy); x.lineTo(wx + ww / 2, wy + wh); x.stroke();
      x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(wx - 3, wy + wh, ww + 6, 4);
      if (E.balcon) { x.strokeStyle = '#2a2a2a'; x.lineWidth = 2; x.strokeRect(wx - 8, wy + wh * 0.62, ww + 16, wh * 0.38); for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(wx - 8 + i * (ww + 16) / 8, wy + wh * 0.62); x.lineTo(wx - 8 + i * (ww + 16) / 8, wy + wh); x.stroke(); } }
    }, null);
    t.fachadas = E.muros.map((m, i) => fach(m, i));
    t.cristal = M.textura('muro-cristal', 128, (x, n) => { const g = x.createLinearGradient(0, 0, n, n); g.addColorStop(0, '#5f7f96'); g.addColorStop(1, '#2c3f50'); x.fillStyle = g; x.fillRect(0, 0, n, n); x.fillStyle = '#d9dee2'; x.fillRect(0, 0, n, 5); x.fillRect(0, 0, 5, n); x.fillStyle = 'rgba(255,255,255,.18)'; x.beginPath(); x.moveTo(10, n); x.lineTo(n * 0.6, 0); x.lineTo(n * 0.75, 0); x.lineTo(30, n); x.fill(); });
    t.tienda = (fondo, clave) => M.textura('escap-' + clave, 128, (x, n) => { x.fillStyle = fondo; x.fillRect(0, 0, n, n); x.fillStyle = '#26323b'; x.fillRect(n * 0.08, n * 0.2, n * 0.84, n * 0.72); x.fillStyle = 'rgba(255,240,200,.35)'; x.fillRect(n * 0.1, n * 0.22, n * 0.8, n * 0.68); x.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 1; i < 3; i++) x.fillRect(n * 0.08 + i * n * 0.28, n * 0.2, 3, n * 0.72); });
    t.persiana = M.textura('persiana-metal', 128, (x, n) => { x.fillStyle = '#8b9196'; x.fillRect(0, 0, n, n); for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#7a8085' : '#9aa0a5'; x.fillRect(0, i * n / 16, n, n / 16); } x.fillStyle = 'rgba(40,40,40,.5)'; x.font = 'bold 26px sans-serif'; x.fillText(club.siglas, 20, n / 2); });
    t.asfalto = M.textura('asfalto', 256, (x, n) => { x.fillStyle = '#3c4044'; x.fillRect(0, 0, n, n); const r = rnd(7); for (let i = 0; i < 6000; i++) { x.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.05)'; x.fillRect(r() * n, r() * n, 2, 2); } });
    t.acera = M.textura('acera-panot', 128, (x, n) => { x.fillStyle = '#b9b3a8'; x.fillRect(0, 0, n, n); x.fillStyle = '#a7a196'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.beginPath(); x.arc(n / 8 + i * n / 4, n / 8 + j * n / 4, 7, 0, 6.3); x.fill(); } x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 2; x.strokeRect(0, 0, n, n); });
    t.letrero = (txt, fondo, letra, clave) => M.textura('letrero-' + clave + txt, 512, (x, n) => { x.fillStyle = fondo; x.fillRect(0, 0, n, n / 4); x.fillStyle = letra; let fs = 64; x.font = 'bold ' + fs + 'px sans-serif'; while (x.measureText(txt).width > n * 0.92 && fs > 20) { fs -= 4; x.font = 'bold ' + fs + 'px sans-serif'; } x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, n / 2, n / 8); });
    t.escudo = M.textura('escudo-calle-' + club.siglas, 256, (x, n) => { const c1 = club.colores[0], c2 = club.colores[1] || '#fff'; x.clearRect(0, 0, n, n); x.beginPath(); x.moveTo(20, 16); x.lineTo(n - 20, 16); x.lineTo(n - 20, 130); x.quadraticCurveTo(n - 20, 210, n / 2, n - 12); x.quadraticCurveTo(20, 210, 20, 130); x.closePath(); x.fillStyle = c1; x.fill(); x.lineWidth = 10; x.strokeStyle = c2; x.stroke(); x.fillStyle = '#fff'; x.strokeStyle = '#111'; x.lineWidth = 5; x.font = 'bold 66px sans-serif'; x.textAlign = 'center'; x.strokeText(club.siglas, n / 2, 140); x.fillText(club.siglas, n / 2, 140); });
    return t;
  }
  // Plano de letrero: usa la franja superior del lienzo (1/4)
  function letrero(W, tex, w, h, x, y, z, ry) { const g = new THREE.PlaneGeometry(w, h); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 0.75 + uv.getY(i) * 0.25); const me = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 })); me.position.set(x, y, z); me.rotation.y = ry || 0; W.add(me); return me; }

  // ---------- Edificios ----------
  // Fachada principal hacia la calle: lado 'n' (mira a -z) o 's' (mira a +z). rect = [x0, z0, x1, z1]
  let OCL = [];
  function ocluye(m) { m.userData = { ocluye: true }; OCL.push(m); return m; }
  function edificio(W, G, T, E, r, rect, pisos, lado, o) {
    o = o || {};
    const [x0, z0, x1, z1] = rect, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, hB = 3.4, hP = 3.2;
    const fach = o.cristal ? new THREE.MeshStandardMaterial({ map: T.cristal, roughness: 0.25, metalness: 0.3 }) : new THREE.MeshStandardMaterial({ map: T.fachadas[(r() * T.fachadas.length) | 0], roughness: 0.9 });
    const cuerpo = new THREE.BoxGeometry(w, pisos * hP, d); uvM(cuerpo, 3, hP); cuerpo.translate(0, hB + pisos * hP / 2, 0);
    const me = new THREE.Mesh(cuerpo, fach); me.position.set(cx, 0, cz); me.castShadow = me.receiveShadow = true; W.add(me); ocluye(me);
    // Planta baja con escaparates (o persianas metálicas)
    const bajo = new THREE.BoxGeometry(w, hB, d); uvM(bajo, 3, hB); bajo.translate(0, hB / 2, 0);
    const mb = new THREE.Mesh(bajo, new THREE.MeshStandardMaterial({ map: o.persiana ? T.persiana : T.tienda(o.colorBajo || '#3a3f45', o.colorBajo || 'gen'), roughness: 0.7 })); mb.position.set(cx, 0, cz); mb.receiveShadow = true; W.add(mb); ocluye(mb);
    // Cornisa y azotea con instalaciones
    const techo = hB + pisos * hP; ocluye(caja(W, w, 0.06, d, new THREE.MeshStandardMaterial({ color: 0x8e8a84, roughness: 1 }), cx, techo, cz));
    for (const [pw, pd, px, pz] of [[w + 0.3, 0.3, cx, z0], [w + 0.3, 0.3, cx, z1], [0.3, d, x0, cz], [0.3, d, x1, cz]]) ocluye(caja(W, pw, 0.9, pd, new THREE.MeshStandardMaterial({ color: 0xd8d2c6 }), px, techo, pz));
    caja(W, w + 0.3, 0.25, d + 0.3, '#cfc8bb', cx, hB - 0.25, cz);
    for (let i = 0; i < 2 + (r() * 3 | 0); i++) ocluye(caja(W, 1 + r(), 0.8 + r() * 0.6, 1 + r(), new THREE.MeshStandardMaterial({ color: 0x9aa1a6 }), x0 + 1.2 + r() * (w - 2.4), hB + pisos * hP, z0 + 1.2 + r() * (d - 2.4)));
    const fz = lado === 'n' ? z0 - 0.02 : z1 + 0.02, ry = lado === 'n' ? Math.PI : 0, sgn = lado === 'n' ? -1 : 1;
    if (o.toldo) { const t = caja(W, o.toldo.ancho || w * 0.8, 0.12, 1.4, o.toldo.color, o.toldo.x !== undefined ? o.toldo.x : cx, 2.75, fz + sgn * 0.7); t.rotation.x = sgn * 0.2; }
    if (o.letrero) letrero(W, T.letrero(o.letrero.txt, o.letrero.fondo, o.letrero.letra, o.letrero.clave || ''), o.letrero.ancho || Math.min(w * 0.85, 9), (o.letrero.ancho || Math.min(w * 0.85, 9)) / 4.2, o.letrero.x !== undefined ? o.letrero.x : cx, o.letrero.y || 3.05, fz + sgn * 0.03, ry);
    // Banderas del club en los balcones (según la afición)
    if (o.banderas) for (let i = 0; i < o.banderas; i++) { const bx = x0 + 1.5 + ((r() * (w / 3)) | 0) * 3, by = hB + ((r() * pisos) | 0) * hP + 1.0; plano(W, 1.1, 0.8, new THREE.MeshStandardMaterial({ color: r() < 0.5 ? o.c1 : o.c2, side: THREE.DoubleSide }), bx, by, fz + sgn * 0.12, ry); }
    G.bloquea(x0, z0, x1, z1);
    return { fz, sgn, ry, alto: hB + pisos * hP };
  }
  function pabellon(W, G, T, club, st, c1) {
    const cx = -19.5, cz = -15, rx = 10, rz = 7, alto = 9;
    const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, alto, 48), new THREE.MeshStandardMaterial({ color: 0xd9dde0, roughness: 0.6 })); cuerpo.scale.set(rx, 1, rz); cuerpo.position.set(cx, alto / 2, cz); cuerpo.castShadow = cuerpo.receiveShadow = true; W.add(cuerpo); ocluye(cuerpo);
    for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(1.004, 1.004, 0.5, 48, 1, true), mat(i === 1 ? (club.colores[1] || '#ffffff') : c1)); b.scale.set(rx, 1, rz); b.position.set(cx, alto - 1.2 - i * 0.55, cz); W.add(b); }
    const vid = new THREE.Mesh(new THREE.CylinderGeometry(1.006, 1.006, 2.4, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0x2d3b46, roughness: 0.2, metalness: 0.4 })); vid.scale.set(rx, 1, rz); vid.position.set(cx, 1.6, cz); W.add(vid);
    const cup = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat('#b9c0c6', { metalness: 0.5, roughness: 0.35 })); cup.scale.set(rx, 2.6, rz); cup.position.set(cx, alto, cz); cup.castShadow = true; W.add(cup); ocluye(cup);
    // Marquesina de la entrada, letrero con el nombre y lonas del club
    caja(W, 9, 0.25, 3, '#2a2f35', cx, 3.6, cz + rz - 0.2); for (const dx of [-4, 4]) cil(W, 0.12, 3.6, '#2a2f35', cx + dx, 0, cz + rz + 1.1);
    letrero(W, T.letrero(club.pabellon.nombre.toUpperCase(), '#14181d', '#ffffff', 'pab'), 9, 2.1, cx, 5.4, cz + rz + 0.05, 0);
    for (const dx of [-7.5, 7.5]) { const lona = plano(W, 2.2, 5.5, new THREE.MeshStandardMaterial({ map: T.escudo, transparent: true, side: THREE.DoubleSide }), cx + dx, 4.5, cz + rz * 0.72 + 0.4, dx < 0 ? -0.6 : 0.6); lona.renderOrder = 1; }
    G.bloquea(cx - rx, cz - rz, cx + rx, cz + rz + 0.5); G.bloquea(cx - 4.3, cz + rz + 0.8, cx - 3.7, cz + rz + 1.4); G.bloquea(cx + 3.7, cz + rz + 0.8, cx + 4.3, cz + rz + 1.4);
    // Explanada delante
    suelo(W, 26, 7, mat('#c9c2b4'), cx, 0.005, cz + rz + 2.5);
    return { puerta: [cx, -5.2] };
  }

  // ---------- Construcción ----------
  function construir(S, M, st) {
    const W = S.mundo, club = st.equipos[st.clubId], E = Object.assign({}, ESTILO.ES, ESTILO[club.pais] || {}), T = texturas(M, E, club), r = rnd(U.hash(club.id + 'calle'));
    const c1 = club.colores[0] === '#000000' ? '#222222' : club.colores[0], c2 = club.colores[1] || '#ffffff';
    const ciu = (st.ciudad && st.ciudad[st.clubId]) || { aficion: 50 }, rep = club.reputacion || 60, afi = ciu.aficion || 50;
    const G = M.rejilla({ limites: LIM, CELDA: 0.5 }); S.G = G; OCL = []; S.oclusores = OCL;
    // Suelo: asfalto, aceras de panot y pasos de peatones elevados
    suelo(W, 90, 50, new THREE.MeshStandardMaterial({ map: T.asfalto, roughness: 0.95 }), 0, -0.12, 0);
    const mAcera = new THREE.MeshStandardMaterial({ map: T.acera, roughness: 0.9 });
    const acera = (x0, z0, x1, z1) => { const w = x1 - x0, d = z1 - z0, g = new THREE.BoxGeometry(w, 0.12, d); uvM(g, 1.5, 1.5); const me = new THREE.Mesh(g, mAcera); me.position.set((x0 + x1) / 2, -0.06, (z0 + z1) / 2); me.receiveShadow = true; W.add(me); };
    acera(-42, -24, -3, -3); acera(3, -24, 42, -3); acera(-42, 3, -3, 24); acera(3, 3, 42, 24);
    G.bloquea(-42, -3, 42, 3); G.bloquea(-3, -24, 3, 24); // la calzada no se pisa…
    const blanco = mat('#f2f2ee');
    const paso = (x0, z0, x1, z1, eje) => { acera(x0, z0, x1, z1); const n = 6; for (let i = 0; i < n; i++) { if (eje === 'x') caja(W, 0.45, 0.01, z1 - z0, blanco, x0 + (i + 0.5) * (x1 - x0) / n, 0.0, (z0 + z1) / 2, 0, false); else caja(W, x1 - x0, 0.01, 0.45, blanco, (x0 + x1) / 2, 0.0, z0 + (i + 0.5) * (z1 - z0) / n, 0, false); } for (let i = 0; i * 0.5 < x1 - x0; i++) for (let j = 0; j * 0.5 < z1 - z0; j++) { const cx = x0 + i * 0.5 + 0.25, cz = z0 + j * 0.5 + 0.25, [ci, cj] = G.celda(cx, cz); if (ci >= 0 && cj >= 0 && ci < G.W && cj < G.H) G.b[G.idx(ci, cj)] = 0; } };
    paso(-9.5, -3, -6.5, 3, 'z'); paso(6.5, -3, 9.5, 3, 'z'); paso(-3, -9.5, 3, -6.5, 'x'); paso(-3, 6.5, 3, 9.5, 'x'); // …salvo los pasos de peatones
    // Líneas de carril
    for (let x = -40; x < 40; x += 4) if (Math.abs(x) > 10) caja(W, 2, 0.01, 0.15, blanco, x + 1, -0.115, 0, 0, false);
    for (let z = -22; z < 22; z += 4) if (Math.abs(z) > 10) caja(W, 0.15, 0.01, 2, blanco, 0, -0.115, z + 1, 0, false);
    // Edificios
    const zonas = {};
    zonas.pabellon = pabellon(W, G, T, club, st, c1).puerta;
    const sede = edificio(W, G, T, E, r, [8, -18, 22, -6.5], 4, 'n', { cristal: true, colorBajo: '#20262c' });
    letrero(W, T.letrero(club.nombre.toUpperCase(), c1, '#ffffff', 'sede'), 9, 2.15, 15, 3.0, -6.53, Math.PI);
    plano(W, 3.4, 3.4, new THREE.MeshStandardMaterial({ map: T.escudo, transparent: true }), 15, 11, -6.55, Math.PI);
    zonas.sede = [15, -5.2];
    edificio(W, G, T, E, r, [-40, -20, -31, -6.5], 5, 'n', { banderas: Math.round(afi / 25), c1, c2, toldo: { color: '#7a2f22', ancho: 5 }, letrero: { txt: 'FARMACIA', fondo: '#1f8f5f', letra: '#fff', clave: 'f', ancho: 4.2 } });
    edificio(W, G, T, E, r, [23, -20, 31, -6.5], 6, 'n', { banderas: Math.round(afi / 22), c1, c2, toldo: { color: '#2f4f6e', ancho: 6 }, letrero: { txt: 'PANADERÍA', fondo: '#f4efe3', letra: '#5a3b26', clave: 'p', ancho: 5 } });
    edificio(W, G, T, E, r, [31.5, -20, 40, -6.5], 5, 'n', { persiana: true, banderas: Math.round(afi / 30), c1, c2 });
    // Acera sur: tienda oficial, bar de la peña, ayuntamiento y tu edificio
    edificio(W, G, T, E, r, [8, 6.5, 15, 18], 4, 's', { colorBajo: c1, toldo: { color: c1, ancho: 6 }, letrero: { txt: 'TIENDA OFICIAL ' + club.siglas, fondo: '#14181d', letra: '#fff', clave: 't', ancho: 6.2 }, banderas: 2, c1, c2 });
    zonas.tienda = [11.5, 5.2];
    edificio(W, G, T, E, r, [15.5, 6.5, 22.5, 18], 4, 's', { colorBajo: '#5a3b26', toldo: { color: c2 === '#ffffff' ? c1 : c2, ancho: 6 }, letrero: { txt: 'BAR LA PEÑA', fondo: '#5a3b26', letra: '#f2d27a', clave: 'b', ancho: 5.5 }, banderas: Math.round(afi / 20), c1, c2 });
    zonas.pena = [19, 5.2];
    for (const [x, z] of [[17.6, 7.8], [20.4, 7.8]]) { cil(W, 0.35, 0.75, '#2a2a2a', x, 0, z + 0.4); const so = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.4, 10), mat(c1)); so.position.set(x, 2.3, z + 0.4); W.add(so); cil(W, 0.03, 2.2, '#555', x, 0, z + 0.4); G.bloquea(x - 0.5, z, x + 0.5, z + 0.9); }
    edificio(W, G, T, E, r, [23.5, 6.5, 40, 18], 5, 's', { persiana: r() < 0.5, banderas: Math.round(afi / 18), c1, c2, toldo: { color: '#2e5d3a', ancho: 5, x: 28 }, letrero: { txt: 'FRUTERÍA', fondo: '#2e5d3a', letra: '#fff', clave: 'fr', ancho: 4, x: 28 } });
    // Ayuntamiento: piedra, columnas, reloj y banderas
    ocluye(caja(W, 13, 9, 10.5, new THREE.MeshStandardMaterial({ color: 0xd8cdb8 }), -15.5, 0, 12.5)); ocluye(caja(W, 13.6, 0.5, 11, new THREE.MeshStandardMaterial({ color: 0xc9bda6 }), -15.5, 9, 12.5)); caja(W, 4, 2, 0.4, '#c9bda6', -15.5, 9.5, 7.3);
    for (let i = 0; i < 6; i++) cil(W, 0.32, 6.5, '#efe8d8', -21 + i * 2.2, 0, 6.9, 14);
    caja(W, 13, 0.6, 1.2, '#efe8d8', -15.5, 6.5, 6.9); cil(W, 0.75, 0.12, '#f4f1e8', -15.5, 10.3, 7.2, 24).rotation.x = Math.PI / 2;
    letrero(W, T.letrero('AYUNTAMIENTO', '#d8cdb8', '#3a2e22', 'ay'), 7, 1.7, -15.5, 7.6, 6.6, 0);
    [[-18, c1], [-15.5, '#c8102e'], [-13, '#f1bf00']].forEach(([x, c]) => { cil(W, 0.04, 2.6, '#d7d7d7', x, 7.1, 6.5); plano(W, 1.0, 0.65, new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide }), x + 0.52, 9.3, 6.5, 0); });
    G.bloquea(-22, 7.3, -9, 18); for (let i = 0; i < 6; i++) G.bloquea(-21.4 + i * 2.2, 6.5, -20.6 + i * 2.2, 7.3);
    zonas.ayuntamiento = [-15.5, 5.2];
    edificio(W, G, T, E, r, [-39, 6.5, -24, 17], 6, 's', { banderas: Math.round(afi / 16), c1, c2, colorBajo: '#5c6a73', letrero: { txt: 'PORTAL 7', fondo: '#2a2f35', letra: '#fff', clave: 'portal', ancho: 3, x: -31.5 } });
    zonas.casa = [-31.5, 5.2];
    // Mural del escudo en una medianera si el club tiene reputación
    if (rep >= 68) plano(W, 6, 6, new THREE.MeshStandardMaterial({ map: T.escudo, transparent: true }), 31.45, 10, -13, -Math.PI / 2);
    // Mobiliario: árboles (más con más reputación), farolas, bancos, papeleras, parada de autobús, quiosco y semáforos
    const tronco = mat('#6b5136'), copas = [mat('#4f7f3a'), mat('#5d8c41'), mat('#476f34')];
    const nArb = rep >= 75 ? 7 : rep >= 60 ? 5 : 3;
    for (const z of [-4.2, 4.2]) for (let k = 0; k < nArb; k++) for (const s of [-1, 1]) {
      const x = s * (12 + k * (26 / nArb)); if ((z < 0 && x > 25 && x < 31) || (z > 0 && x > 16 && x < 22)) continue;
      caja(W, 1.2, 0.02, 1.2, '#5a4632', x, 0.001, z, 0, false); cil(W, 0.14, 2.2, tronco, x, 0, z, 6); const c = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 1), copas[k % 3]); c.position.set(x, 3.0, z); c.scale.y = 0.9; c.castShadow = true; W.add(c); G.bloquea(x - 0.3, z - 0.3, x + 0.3, z + 0.3);
    }
    S.farolas = new THREE.MeshStandardMaterial({ color: 0xfff6d6, emissive: 0xffd99a, emissiveIntensity: 0.4 });
    const tLuz = M.textura('charco-farola', 128, (x, n) => { const g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); g.addColorStop(0, 'rgba(255,214,150,0.75)'); g.addColorStop(1, 'rgba(255,214,150,0)'); x.fillStyle = g; x.fillRect(0, 0, n, n); });
    S.charcosNoche = new THREE.MeshBasicMaterial({ map: tLuz, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const farola = (x, z, ry) => { cil(W, 0.07, 4.6, '#2a2f35', x, 0, z, 8); const b = caja(W, 1.1, 0.08, 0.12, '#2a2f35', x + Math.sin(ry) * 0.5, 4.5, z + Math.cos(ry) * 0.5, ry); caja(W, 0.55, 0.14, 0.3, '#2a2f35', x + Math.sin(ry) * 1.0, 4.42, z + Math.cos(ry) * 1.0, ry); caja(W, 0.45, 0.03, 0.22, S.farolas, x + Math.sin(ry) * 1.0, 4.39, z + Math.cos(ry) * 1.0, ry, false); const ch = new THREE.Mesh(new THREE.PlaneGeometry(7, 7).rotateX(-Math.PI / 2), S.charcosNoche); ch.position.set(x + Math.sin(ry) * 1.0, 0.02, z + Math.cos(ry) * 1.0); ch.renderOrder = 2; W.add(ch); G.bloquea(x - 0.2, z - 0.2, x + 0.2, z + 0.2); };
    for (let x = -36; x <= 36; x += 12) { if (Math.abs(x) < 6) continue; farola(x + 2, -3.4, 0); farola(x - 2, 3.4, Math.PI); }
    const banco = (x, z, ry) => { const g = new THREE.Group(); [[0, 0.42, 0, 1.6, 0.06, 0.45], [0, 0.7, -0.2, 1.6, 0.4, 0.05]].forEach(([px, py, pz, w, h, d]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat('#7a5638')); m.position.set(px, py, pz); g.add(m); }); for (const s of [-0.7, 0.7]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.45), mat('#2a2f35')); p.position.set(s, 0.21, 0); g.add(p); } g.position.set(x, 0, z); g.rotation.y = ry; g.traverse(m => { if (m.isMesh) m.castShadow = true; }); W.add(g); G.bloquea(x - 0.8, z - 0.3, x + 0.8, z + 0.3); };
    banco(-26, -5.6, 0); banco(-13, -5.6, 0); banco(-24, 5.6, Math.PI); banco(34, 5.6, Math.PI); banco(36, -5.6, 0);
    for (const [x, z] of [[-11, -3.6], [11, 3.6], [-29, 3.6], [26, -3.6]]) { cil(W, 0.22, 0.85, '#3a5a3a', x, 0, z, 10); G.bloquea(x - 0.25, z - 0.25, x + 0.25, z + 0.25); }
    // Parada de autobús con anuncio del club
    caja(W, 4, 0.1, 1.4, '#2a2f35', -36, 2.5, 5.4); caja(W, 0.08, 2.5, 1.4, mat('#a8c6d6', { transparent: true, opacity: 0.4 }), -38, 0, 5.4); cil(W, 0.05, 2.5, '#2a2f35', -34.1, 0, 4.8);
    plano(W, 1.3, 1.9, new THREE.MeshStandardMaterial({ map: T.escudo, transparent: true }), -38.06, 1.3, 5.4, Math.PI / 2); G.bloquea(-38.2, 4.7, -37.8, 6.1);
    // Quiosco de prensa
    caja(W, 1.8, 2.3, 1.3, '#2e5d3a', 28, 0, -5.6); caja(W, 2.2, 0.15, 1.7, '#244a2e', 28, 2.3, -5.6); for (let i = 0; i < 4; i++) caja(W, 0.35, 0.45, 0.02, ['#f4efe3', '#ffe6a0', '#cfe8ff', '#f4efe3'][i], 27.4 + i * 0.4, 1.0, -4.94, 0, false);
    letrero(W, T.letrero('PRENSA', '#244a2e', '#f2d27a', 'k'), 1.6, 0.4, 28, 2.05, -4.93, 0); G.bloquea(27, -6.3, 29, -4.9);
    zonas.kiosco = [28, -4.2];
    // Semáforos en las cuatro esquinas (se encienden desde actualizar)
    S.semaforos = [];
    for (const [x, z, eje] of [[-3.4, -3.4, 'x'], [3.4, 3.4, 'x'], [3.4, -3.4, 'z'], [-3.4, 3.4, 'z']]) {
      cil(W, 0.06, 3, '#2a2f35', x, 0, z, 8); const caj = caja(W, 0.3, 0.8, 0.3, '#1d2024', x, 3, z);
      const luz = c => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshStandardMaterial({ color: 0x333333, emissive: c, emissiveIntensity: 0 })); m.userData = { semaforo: true }; W.add(m); return m; };
      const roja = luz(0xff2a1a), verde = luz(0x2aff6a); roja.position.set(x, 3.6, z + 0.16 * Math.sign(-z)); verde.position.set(x, 3.25, z + 0.16 * Math.sign(-z));
      S.semaforos.push({ eje, roja, verde }); G.bloquea(x - 0.15, z - 0.15, x + 0.15, z + 0.15);
    }
    // Placas con el nombre de las calles
    const bar = (GM.mods.ciudad3d && GM.mods.ciudad3d.barrios ? GM.mods.ciudad3d.barrios(st).map(b => b.nombre) : []);
    S.calleNombre = 'Avenida de ' + (bar[0] || club.ciudad);
    letrero(W, T.letrero(S.calleNombre, '#1d4f91', '#fff', 'av'), 3.2, 0.62, -6.9, 2.6, -6.4, 0);
    letrero(W, T.letrero('Calle de ' + (bar[1] || club.siglas), '#1d4f91', '#fff', 'cc'), 3.2, 0.62, 6.4, 2.6, 8.4, -Math.PI / 2);
    // Zonas interactivas (puertas)
    const SALAS = {
      sede: { id: 'sede_calle', nombre: 'Sede del club', accion: 'Volver a las instalaciones', destino: {}, irA: 'sede', boton: 'Entrar en la sede' },
      pabellon: { id: 'pabellon', nombre: club.pabellon.nombre, accion: 'Taquillas y estado del pabellón', destino: { todos: 'club' } },
      tienda: { id: 'tienda', nombre: 'Tienda oficial', accion: 'Camisetas, bufandas y aficionados', destino: {} },
      pena: { id: 'pena', nombre: 'Bar La Peña', accion: 'Donde se reúne la afición', destino: {} },
      ayuntamiento: { id: 'ayuntamiento', nombre: 'Ayuntamiento de ' + club.ciudad, accion: 'Convenios y relación con la ciudad', destino: { todos: 'ciudad' } },
      casa: { id: 'casa', nombre: st.modo === 'carrera' ? 'Tu edificio' : 'Tu casa', accion: 'Descansar y vida personal', destino: { todos: 'ciudad' } },
      kiosco: { id: 'kiosco', nombre: 'Quiosco de prensa', accion: 'Lo que dicen los periódicos', destino: {} }
    };
    S.zonas = Object.keys(SALAS).map(k => M.zona(W, SALAS[k], zonas[k][0], zonas[k][1], club));
    S.spawnCalle = { x: 15, z: -4.4, ry: 0 };
    // Puntos de paseo para los vecinos
    S.paseo = [];
    for (let x = -38; x <= 38; x += 3) { S.paseo.push([x, -4.8], [x, 4.8]); }
    for (let z = 8; z <= 21; z += 3) { S.paseo.push([-4.8, z], [4.8, z], [-4.8, -z], [4.8, -z]); }
    Object.keys(zonas).forEach(k => S.paseo.push(zonas[k]));
    S.cielo = true; S.scene.background = new THREE.Color(0xa9c6dc); S.scene.fog = new THREE.Fog(0xa9c6dc, 45, 110);
    GM.kit.fusionar(W);
    return W;
  }

  // ---------- Vecinos y aficionados ----------
  const MODELOS = ['h-casual_2', 'm-casual', 'h-beach', 'm-formal', 'h-casual_hoodie', 'm-punk', 'h-farmer', 'm-suit', 'h-suit', 'm-adventurer', 'h-worker', 'm-worker', 'h-punk', 'h-adventurer'];
  const PIEL = ['#f1c7a5', '#e0ac85', '#c68863', '#9a6142', '#6e4329'], PELO = ['#1d1510', '#3b2617', '#6a4425', '#a9793e', '#d8b46a', '#8a8a8a'];
  async function poblar(S, M, st) {
    const club = st.equipos[st.clubId], ciu = (st.ciudad && st.ciudad[st.clubId]) || { aficion: 50 }, afi = ciu.aficion || 50, partido = S.dia && S.dia.tipo === 'partido' && S.dia.casa;
    const n = partido ? 26 : 16, r = rnd(U.hash(st.fecha + 'vecinos')), c1 = club.colores[0], c2 = club.colores[1] || '#222';
    const lista = await Promise.all(Array.from({ length: n }, (_, k) => { const hincha = r() * 100 < afi * (partido ? 1.4 : 0.6); return M.personaje({ modelo: MODELOS[(r() * MODELOS.length) | 0], altura: 158 + r() * 30, piel: PIEL[(r() * 5) | 0], pelo: PELO[(r() * 6) | 0], ropa: hincha ? [r() < 0.6 ? c1 : c2, c1] : null }).then(p => Object.assign(p, { hincha })); }));
    lista.forEach((p, k) => {
      const q = S.paseo[(r() * S.paseo.length) | 0]; p.obj.position.set(q[0] + (r() - 0.5), 0, q[1] + (r() - 0.5) * 0.6);
      Object.assign(p, { peaton: true, rol: p.hincha ? 'Aficionado del ' + club.siglas : 'Vecino de ' + club.ciudad, r: rnd(U.hash(st.fecha + 'p' + k)), espera: r() * 3 });
      p.obj.userData = { npc: S.gente.length }; M.anim(p, 'idle'); S.mundo.add(p.obj); S.gente.push(p);
    });
    // Coches
    S.coches = []; const colores = ['#c8102e', '#f4f4f4', '#1d2024', '#2f6f9e', '#8a8f94', '#e8b923', '#3a5a3a', '#7a2f22'];
    const carriles = [['x', 1, 1.5], ['x', -1, -1.5], ['z', 1, -1.5], ['z', -1, 1.5]];
    carriles.forEach(([eje, dir, c], ci) => { const largo = eje === 'x' ? 88 : 48; for (let i = 0; i < (eje === 'x' ? 3 : 2); i++) { const obj = coche(colores[(ci * 3 + i) % colores.length]); S.mundo.add(obj); S.coches.push({ obj, eje, dir, c, pos: -largo / 2 + i * (largo / 3) + r() * 4, vel: 6, largo, len: 4.1 }); } });
    // Autobús urbano con el anuncio del club: carril sur de la avenida, para en la parada
    { const obj = autobus(club); S.mundo.add(obj); S.coches.push({ obj, eje: 'x', dir: 1, c: 1.5, pos: -20, vel: 5, largo: 88, len: 10.5, bus: true, parada: -36, tParada: 0 }); }
    S.tSem = 0;
  }
  function autobus(club) {
    const g = new THREE.Group(), c1 = club.colores[0] === '#000000' ? '#222222' : club.colores[0];
    const B = (w, h, d, m, x, y, z) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x, y, z); me.castShadow = true; g.add(me); return me; };
    B(2.5, 2.6, 10.4, mat('#e9edf0', { roughness: 0.4 }), 0, 1.65, 0); B(2.52, 0.9, 10.2, mat('#22303a', { roughness: 0.1, metalness: 0.5 }), 0, 2.2, 0.1); B(2.54, 0.35, 10.42, mat(c1), 0, 0.7, 0);
    B(2.4, 0.06, 10.2, mat('#c9cdd1'), 0, 2.98, 0);
    for (const [x, z] of [[-1.1, 3.6], [1.1, 3.6], [-1.1, -3.4], [1.1, -3.4]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 14), mat('#151515')); w.rotation.z = Math.PI / 2; w.position.set(x, 0.5, z); g.add(w); }
    g.position.y = -0.12; g.userData = { coche: true }; return g;
  }
  function coche(color) {
    const g = new THREE.Group(), cuerpo = mat(color, { roughness: 0.35, metalness: 0.4 }), cristal = mat('#22303a', { roughness: 0.1, metalness: 0.6 }), rueda = mat('#151515');
    const B = (w, h, d, m, x, y, z) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x, y, z); me.castShadow = true; g.add(me); };
    B(1.8, 0.55, 4.1, cuerpo, 0, 0.5, 0); B(1.6, 0.5, 2.1, cristal, 0, 0.98, -0.2); B(1.62, 0.06, 2.0, cuerpo, 0, 1.25, -0.2);
    B(0.4, 0.15, 0.05, mat('#fff6d6', { emissive: 0xfff1c4, emissiveIntensity: 0.5 }), -0.6, 0.55, 2.05); B(0.4, 0.15, 0.05, mat('#fff6d6', { emissive: 0xfff1c4, emissiveIntensity: 0.5 }), 0.6, 0.55, 2.05);
    B(0.4, 0.12, 0.05, mat('#a81010', { emissive: 0x800000 }), -0.6, 0.6, -2.05); B(0.4, 0.12, 0.05, mat('#a81010', { emissive: 0x800000 }), 0.6, 0.6, -2.05);
    for (const [x, z] of [[-0.85, 1.3], [0.85, 1.3], [-0.85, -1.3], [0.85, -1.3]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.25, 14), rueda); w.rotation.z = Math.PI / 2; w.position.set(x, 0.34, z); g.add(w); }
    g.position.y = -0.12; g.userData = { coche: true }; return g;
  }
  function siguiente(S, M, n) {
    const q = S.paseo[(n.r() * S.paseo.length) | 0];
    if (S.dia && S.dia.tipo === 'partido' && n.hincha && n.r() < 0.6) { const ok = M.irA(n, -19.5 + (n.r() - 0.5) * 8, -5.4 + (n.r() - 0.5) * 1.2, () => { M.anim(n, 'emote-yes'); n.espera = 6 + n.r() * 8; }); if (ok) return; }
    const ok = M.irA(n, q[0] + (n.r() - 0.5) * 0.8, q[1] + (n.r() - 0.5) * 0.5, () => { M.anim(n, n.r() < 0.15 ? 'emote-yes' : 'idle'); n.espera = 1 + n.r() * 6; });
    if (!ok) n.espera = 1;
  }
  // ---------- Tráfico, semáforos y saludos ----------
  function actualizar(S, M, dt) {
    if (!S.coches) return;
    S.tSem = (S.tSem + dt) % 18; const verdeX = S.tSem < 8, verdeZ = S.tSem >= 9 && S.tSem < 17;
    S.semaforos.forEach(s => { const v = s.eje === 'x' ? verdeX : verdeZ; s.verde.material.emissiveIntensity = v ? 2.5 : 0; s.roja.material.emissiveIntensity = v ? 0 : 2.5; });
    S.coches.forEach(c => {
      const verde = c.eje === 'x' ? verdeX : verdeZ, delante = c.dir * c.pos;
      let objetivo = c.bus ? 5.5 : 7;
      // Ceder el paso: pasos de peatones a 6,5-9,5 m del cruce en cada eje
      const frente = delante + c.len / 2;
      for (const ini of [-9.5, 6.5]) { const dist = ini - frente; if (dist > -0.5 && dist < 4) { const ocupado = (S.gente.concat(S.yo ? [S.yo] : [])).some(p => { const a = c.eje === 'x' ? p.obj.position.x : p.obj.position.z, b = c.eje === 'x' ? p.obj.position.z : p.obj.position.x; return Math.abs(b) < 3.2 && c.dir * a > ini - 0.3 && c.dir * a < ini + 3.3; }); if (ocupado) objetivo = Math.min(objetivo, Math.max(0, dist * 1.5)); } }
      // Autobús: parada de 6 s en la marquesina
      if (c.bus) { const d = c.parada - c.pos; if (c.tParada > 0) { c.tParada -= dt; objetivo = 0; } else if (d > 0 && d < 0.6 && c.vel < 1.5) { c.tParada = 6; } else if (d > 0 && d < 12) objetivo = Math.min(objetivo, Math.max(0.4, d * 0.6)); }
      if (!verde && delante > -16 && delante < -10.6) objetivo = Math.min(objetivo, Math.max(0, (-10.8 - delante) * 1.6));
      S.coches.forEach(o => { if (o === c || o.eje !== c.eje || o.dir !== c.dir) return; let gap = c.dir * (o.pos - c.pos); if (gap < 0) gap += c.largo; const hueco = gap - (c.len + o.len) / 2; if (hueco < 4) objetivo = Math.min(objetivo, Math.max(0, (hueco - 1.2) * 2)); });
      c.vel += Math.max(-9 * dt, Math.min(3 * dt, objetivo - c.vel)); c.pos += c.dir * c.vel * dt;
      if (c.pos > c.largo / 2) c.pos -= c.largo; if (c.pos < -c.largo / 2) c.pos += c.largo;
      if (c.eje === 'x') { c.obj.position.set(c.pos, -0.12, c.c); c.obj.rotation.y = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2; } else { c.obj.position.set(c.c, -0.12, c.pos); c.obj.rotation.y = c.dir > 0 ? 0 : Math.PI; }
    });
    S.tOcl = (S.tOcl || 0) - dt;
    if (S.oclusores && S.yo && S.tOcl <= 0) {
      S.tOcl = 0.1; const ojo = S.camera.position, obj = S.yo.obj.position.clone().setY(1.0), dir = obj.clone().sub(ojo), dist = dir.length();
      _ray.set(ojo, dir.normalize()); _ray.far = dist; const tapan = new Set(_ray.intersectObjects(S.oclusores, false).map(h => h.object));
      S.oclusores.forEach(m => { const meta = tapan.has(m) ? 0.2 : 1, mt = m.material; if (!tapan.has(m) && mt.opacity === 1) return; mt.transparent = true; mt.opacity += (meta - mt.opacity) * 0.6; if (Math.abs(mt.opacity - 1) < 0.02) { mt.opacity = 1; mt.transparent = false; } mt.depthWrite = mt.opacity > 0.95; mt.needsUpdate = true; });
    }
    // Los aficionados reconocen a tu personaje
    S.tFan = (S.tFan || 0) - dt; if (S.tFan > 0 || !S.yo) return; S.tFan = 2.5;
    const cerca = S.gente.filter(p => p.hincha && p.obj.position.distanceTo(S.yo.obj.position) < 3.2);
    if (!cerca.length || Math.random() < 0.4) return;
    const st = S.st, p = cerca[(Math.random() * cerca.length) | 0], riv = S.dia && S.dia.rival;
    const fr = st.modo === 'carrera' ? ['¡Eres un crack!', '¿Me firmas la camiseta?', '¡Mete muchos el sábado!', '¡Mi hijo quiere ser como tú!'] : st.modo === 'entrenador' ? ['¡Ánimo, míster!', '¡Hay que defender más!', '¡Confiamos en usted!'] : st.modo === 'presidente' ? ['¡Presi, un fichaje bueno!', '¡Baje el precio de los abonos!', '¡Gracias por el club!'] : ['¡Ficha a un pívot!', '¡Gran trabajo este verano!', '¿Para cuándo un base?'];
    if (riv) fr.push(S.dia.tipo === 'partido' ? '¡Hoy a ganar al ' + riv.siglas + '!' : S.dia.tipo === 'derrota' ? 'Lo del ' + riv.siglas + ' dolió…' : '¡Qué paliza al ' + riv.siglas + '!');
    M.bocadillo(fr[(Math.random() * fr.length) | 0], p.obj); p.obj.lookAt(S.yo.obj.position.x, 0, S.yo.obj.position.z); M.anim(p, 'emote-yes'); p.espera = Math.max(p.espera, 2);
  }
  const _ray = new THREE.Raycaster();
  GM.calle = { construir, poblar, siguiente, actualizar, LIM };
})();
