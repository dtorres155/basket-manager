/* LA CALLE DEL CLUB EN 3D (GM.calle) — se sale de la sede andando, como en Big Ambitions
   Un cruce de la ciudad del club: avenida y calle con aceras, pasos de peatones elevados, semáforos y tráfico;
   pabellón, sede del club, tienda oficial, bar de la peña, ayuntamiento, quiosco y tu edificio. Vecinos que pasean
   (más con los colores del club cuanto más afición hay; día de partido, riadas de aficionados hacia el pabellón).
   La ciudad refleja al club: banderas en los balcones según la afición, más árboles y mural del escudo con más
   reputación, estilo de fachadas según el país. Usa el motor de sede3d.js (personas, caminos, paneles de sala).
   Expone: construir(S, M, st), poblar(S, M, st), siguiente(S, M, n), actualizar(S, M, dt). No escribe en el estado. */
(function () {
  const U = GM.util;
  const LIM = [-150, -110, 150, 64];   // centro (cruce y plaza) y, con ciudad_barrios.js, los barrios de alrededor
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
  // Texturas reales (texturas.js) sobre un material, si están cargadas
  const real = (m, id, o) => (GM.texturas ? GM.texturas.aplicar(m, id, o) : m);
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
    t.ventanas = M.textura('ventanas-noche', 512, (x, n) => { x.fillStyle = '#000'; x.fillRect(0, 0, n, n); const r = rnd(41), b = n / 4; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { if (r() < 0.45) continue; const ox = i * b, oy = j * b; x.fillStyle = r() < 0.7 ? '#ffd28a' : '#cfe3ff'; x.fillRect(ox + b * 0.3, oy + b * 0.18, b * 0.4, b * 0.55); } });
    if (t.ventanas) t.ventanas.repeat.set(0.25, 0.25);
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
    const fach = o.cristal ? real(new THREE.MeshStandardMaterial({ map: T.cristal, roughness: 0.25, metalness: 0.3, emissive: 0xbfd8ff, emissiveIntensity: 0 }), 'Facade006', { escala: 9, rugosidad: 0.3, rugMin: 0.1 }) : real(new THREE.MeshStandardMaterial({ map: T.fachadas[(r() * T.fachadas.length) | 0], roughness: 0.9, emissive: 0xffd28a, emissiveMap: T.ventanas || null, emissiveIntensity: 0 }), 'Plaster003', { color: false, escala: 2.5, relieve: 1.2 });
    (S_.ventanas = S_.ventanas || []).push(fach);
    const cuerpo = new THREE.BoxGeometry(w, pisos * hP, d); uvM(cuerpo, 3, hP); cuerpo.translate(0, hB + pisos * hP / 2, 0);
    const bg = new THREE.Group(); W.add(bg); ocluye(bg); // grupo del edificio: se funde por dentro y se aclara entero
    const me = new THREE.Mesh(cuerpo, fach); me.position.set(cx, 0, cz); me.castShadow = me.receiveShadow = true; bg.add(me);
    // Con o.kit, las plantas se montan con piezas glTF (Building Kit de Kenney): la caja queda mientras cargan o si fallan
    if (o.kit && GM.edificioKit) {
      const vidrio = new THREE.MeshStandardMaterial({ color: 0x5f7f99, roughness: 0.15, metalness: 0.35, emissive: 0xffd28a, emissiveIntensity: 0 }); S_.ventanas.push(vidrio);
      GM.edificioKit.cuerpo({ ancho: w, fondo: d, plantas: pisos, altoPlanta: hP, color: o.colorMuro || E.muros[(r() * E.muros.length) | 0], ventanas: o.kit === 'arcos' ? 'arcos' : 'cuadradas', vidrio }).then(k => {
        if (!k) return; k.position.set(cx, hB, cz); if (lado === 'n') k.rotation.y = Math.PI; me.visible = false; bg.add(k);
      }).catch(() => {});
    }
    // Planta baja con escaparates (o persianas metálicas)
    const bajo = new THREE.BoxGeometry(w, hB, d); uvM(bajo, 3, hB); bajo.translate(0, hB / 2, 0);
    const mb = new THREE.Mesh(bajo, new THREE.MeshStandardMaterial({ map: o.persiana ? T.persiana : T.tienda(o.colorBajo || '#3a3f45', o.colorBajo || 'gen'), roughness: 0.7 })); mb.position.set(cx, 0, cz); mb.receiveShadow = true; bg.add(mb);
    // Cornisa y azotea con instalaciones
    const techo = hB + pisos * hP, mTecho = new THREE.MeshStandardMaterial({ color: 0x8e8a84, roughness: 1 }), mPretil = new THREE.MeshStandardMaterial({ color: 0xd8d2c6 }), mInst = new THREE.MeshStandardMaterial({ color: 0x9aa1a6 });
    caja(bg, w, 0.06, d, mTecho, cx, techo, cz);
    for (const [pw, pd, px, pz] of [[w + 0.3, 0.3, cx, z0], [w + 0.3, 0.3, cx, z1], [0.3, d, x0, cz], [0.3, d, x1, cz]]) caja(bg, pw, 0.9, pd, mPretil, px, techo, pz);
    caja(W, w + 0.3, 0.25, d + 0.3, '#cfc8bb', cx, hB - 0.25, cz);
    for (let i = 0; i < 2 + (r() * 3 | 0); i++) caja(bg, 1 + r(), 0.8 + r() * 0.6, 1 + r(), mInst, x0 + 1.2 + r() * (w - 2.4), hB + pisos * hP, z0 + 1.2 + r() * (d - 2.4));
    const fz = lado === 'n' ? z0 - 0.02 : z1 + 0.02, ry = lado === 'n' ? Math.PI : 0, sgn = lado === 'n' ? -1 : 1;
    if (o.toldo) { const t = caja(W, o.toldo.ancho || w * 0.8, 0.12, 1.4, GM.kit.viento(new THREE.MeshStandardMaterial({ color: o.toldo.color, roughness: 0.9 }), 'tela', 0.035), o.toldo.x !== undefined ? o.toldo.x : cx, 2.75, fz + sgn * 0.7); t.rotation.x = sgn * 0.2; }
    if (o.letrero) letrero(W, T.letrero(o.letrero.txt, o.letrero.fondo, o.letrero.letra, o.letrero.clave || ''), o.letrero.ancho || Math.min(w * 0.85, 9), (o.letrero.ancho || Math.min(w * 0.85, 9)) / 4.2, o.letrero.x !== undefined ? o.letrero.x : cx, o.letrero.y || 3.05, fz + sgn * 0.03, ry);
    // Banderas del club en los balcones (según la afición)
    if (o.banderas) for (let i = 0; i < o.banderas; i++) { const bx = x0 + 1.5 + ((r() * (w / 3)) | 0) * 3, by = hB + ((r() * pisos) | 0) * hP + 1.0; plano(W, 1.1, 0.8, GM.kit.viento(mat(r() < 0.5 ? o.c1 : o.c2, { side: THREE.DoubleSide }), 'tela'), bx, by, fz + sgn * 0.12, ry); }
    G.bloquea(x0, z0, x1, z1);
    if (!o.cristal && GM.kit.calcomania) { const nD = (r() * 3.2) | 0; for (let i = 0; i < nD; i++) { const tipo = r() < 0.5 ? 'cartel' : 'grafiti'; GM.kit.calcomania(W, tipo, x0 + 1 + r() * Math.max(0.2, w - 2), tipo === 'cartel' ? 1.25 + r() * 0.5 : 0.75 + r() * 0.5, fz + sgn * 0.02, ry, r); } }
    if (GM.kit.gato && r() < 0.22) { const gt = GM.kit.gato(['#3b3b3b', '#c98d4f', '#f2efe8', '#7a6a5a', '#1d1d1d'][(r() * 5) | 0]); gt.position.set(x0 + 0.8 + r() * Math.max(0.2, w - 1.6), hB + pisos * hP, fz - sgn * 0.35); gt.rotation.y = ry + (r() - 0.5) * 0.8; gt.scale.setScalar(1.6); W.add(gt); }
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
  let S_ = null;
  function construir(S, M, st) {
    S_ = S; S.ventanas = [];
    const W = S.mundo, club = st.equipos[st.clubId], E = Object.assign({}, ESTILO.ES, ESTILO[club.pais] || {}), T = texturas(M, E, club), r = rnd(U.hash(club.id + 'calle'));
    const c1 = club.colores[0] === '#000000' ? '#222222' : club.colores[0], c2 = club.colores[1] || '#ffffff';
    const ciu = (st.ciudad && st.ciudad[st.clubId]) || { aficion: 50 }, rep = club.reputacion || 60, afi = ciu.aficion || 50;
    const G = M.rejilla({ limites: LIM, CELDA: 0.5 }); S.G = G; OCL = []; S.oclusores = OCL;
    // Suelo: asfalto, aceras de panot y pasos de peatones elevados
    suelo(W, 90, 50, real(new THREE.MeshStandardMaterial({ map: T.asfalto, roughness: 0.95 }), 'Asphalt010', { escala: 5, tinte: 0xb4b4b4 }), 0, -0.12, 0);
    if (GM.kit.calcomania) { const rS = rnd(77); for (let i = 0; i < 46; i++) { const enX = rS() < 0.65, x = enX ? -88 + rS() * 176 : (rS() - 0.5) * 5, z = enX ? (rS() - 0.5) * 5 : -40 + rS() * 64; GM.kit.calcomania(W, 'suelo', x, -0.115, z, 0, rS); } }
    const mAcera = real(new THREE.MeshStandardMaterial({ map: T.acera, roughness: 0.9, color: 0xaea99f }), 'Concrete034', { color: false, escala: 2.4, relieve: 0.6 });
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
    edificio(W, G, T, E, r, [-40, -20, -31, -6.5], 5, 'n', { kit: 'arcos', banderas: Math.round(afi / 25), c1, c2, toldo: { color: '#7a2f22', ancho: 5 }, letrero: { txt: 'FARMACIA', fondo: '#1f8f5f', letra: '#fff', clave: 'f', ancho: 4.2 } });
    edificio(W, G, T, E, r, [23, -20, 31, -6.5], 6, 'n', { kit: true, banderas: Math.round(afi / 22), c1, c2, toldo: { color: '#2f4f6e', ancho: 6 }, letrero: { txt: 'PANADERÍA', fondo: '#f4efe3', letra: '#5a3b26', clave: 'p', ancho: 5 } });
    edificio(W, G, T, E, r, [31.5, -20, 40, -6.5], 5, 'n', { persiana: true, banderas: Math.round(afi / 30), c1, c2 });
    // Acera sur: tienda oficial, bar de la peña, ayuntamiento y tu edificio
    edificio(W, G, T, E, r, [8, 6.5, 15, 18], 4, 's', { colorBajo: c1, toldo: { color: c1, ancho: 6 }, letrero: { txt: 'TIENDA OFICIAL ' + club.siglas, fondo: '#14181d', letra: '#fff', clave: 't', ancho: 6.2 }, banderas: 2, c1, c2 });
    zonas.tienda = [11.5, 5.2];
    edificio(W, G, T, E, r, [15.5, 6.5, 22.5, 18], 4, 's', { colorBajo: '#5a3b26', toldo: { color: c2 === '#ffffff' ? c1 : c2, ancho: 6 }, letrero: { txt: 'BAR LA PEÑA', fondo: '#5a3b26', letra: '#f2d27a', clave: 'b', ancho: 5.5 }, banderas: Math.round(afi / 20), c1, c2 });
    zonas.pena = [19, 5.2];
    for (const [x, z] of [[17.6, 7.8], [20.4, 7.8]]) { cil(W, 0.35, 0.75, '#2a2a2a', x, 0, z + 0.4); const so = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.4, 10), mat(c1)); so.position.set(x, 2.3, z + 0.4); W.add(so); cil(W, 0.03, 2.2, '#555', x, 0, z + 0.4); G.bloquea(x - 0.5, z, x + 0.5, z + 0.9); }
    edificio(W, G, T, E, r, [23.5, 6.5, 40, 18], 5, 's', { kit: 'arcos', persiana: r() < 0.5, banderas: Math.round(afi / 18), c1, c2, toldo: { color: '#2e5d3a', ancho: 5, x: 28 }, letrero: { txt: 'FRUTERÍA', fondo: '#2e5d3a', letra: '#fff', clave: 'fr', ancho: 4, x: 28 } });
    // Ayuntamiento: piedra, columnas, reloj y banderas
    ocluye(caja(W, 13, 9, 10.5, new THREE.MeshStandardMaterial({ color: 0xd8cdb8 }), -15.5, 0, 12.5)); ocluye(caja(W, 13.6, 0.5, 11, new THREE.MeshStandardMaterial({ color: 0xc9bda6 }), -15.5, 9, 12.5)); caja(W, 4, 2, 0.4, '#c9bda6', -15.5, 9.5, 7.3);
    for (let i = 0; i < 6; i++) cil(W, 0.32, 6.5, '#efe8d8', -21 + i * 2.2, 0, 6.9, 14);
    caja(W, 13, 0.6, 1.2, '#efe8d8', -15.5, 6.5, 6.9); cil(W, 0.75, 0.12, '#f4f1e8', -15.5, 10.3, 7.2, 24).rotation.x = Math.PI / 2;
    letrero(W, T.letrero('AYUNTAMIENTO', '#d8cdb8', '#3a2e22', 'ay'), 7, 1.7, -15.5, 7.6, 6.6, 0);
    [[-18, c1], [-15.5, '#c8102e'], [-13, '#f1bf00']].forEach(([x, c]) => { cil(W, 0.04, 2.6, '#d7d7d7', x, 7.1, 6.5); plano(W, 1.0, 0.65, new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide }), x + 0.52, 9.3, 6.5, 0); });
    G.bloquea(-22, 7.3, -9, 18); for (let i = 0; i < 6; i++) G.bloquea(-21.4 + i * 2.2, 6.5, -20.6 + i * 2.2, 7.3);
    zonas.ayuntamiento = [-15.5, 5.2];
    // (la parcela del antiguo «Portal 7» la ocupa una de tus viviendas o un edificio del barrio: ciudad_barrios.js)
    // Mural del escudo en una medianera si el club tiene reputación
    if (rep >= 68) plano(W, 6, 6, new THREE.MeshStandardMaterial({ map: T.escudo, transparent: true }), 31.45, 10, -13, -Math.PI / 2);
    // Mobiliario: árboles (más con más reputación), farolas, bancos, papeleras, parada de autobús, quiosco y semáforos
    const tronco = mat('#6b5136'), copas = [mat('#4f7f3a'), mat('#5d8c41'), mat('#476f34')]; copas.forEach(m => GM.kit.viento(m, 'copa'));
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
    const bz = barrio(S, M, W, G, T, E, r, club, st, c1, c2, afi, rep, bar);
    Object.assign(zonas, bz);
    // Barrios de alrededor con tus viviendas, colegio, hospital, estación y la ciudad deportiva
    const amp = GM.ciudadBarrios ? GM.ciudadBarrios.construir({ S, M, W, G, T, E, r, club, st, c1, c2, afi, h: { caja, cil, plano, letrero, edificio: (W2, G2, T2, E2, r2, rect, pisos, lado, o) => edificio(W2, G2, T2, E2, r2, rect, pisos, lado, o), ocluye, mat, uvM } }) : null;
    if (amp) Object.assign(zonas, amp.zonas);
    S.puertas = amp ? amp.puertas : {}; S.distritos = amp ? amp.distritos : null;
    // Zonas interactivas (puertas)
    const SALAS = {
      sede: { id: 'sede_calle', nombre: 'Sede del club', accion: 'Volver a las instalaciones', destino: {}, irA: 'sede', boton: 'Entrar en la sede' },
      pabellon: { id: 'pabellon', nombre: club.pabellon.nombre, accion: 'Taquillas y estado del pabellón', destino: { todos: 'club' } },
      tienda: { id: 'tienda', nombre: 'Tienda oficial', accion: 'Camisetas, bufandas y aficionados', destino: {} },
      pena: { id: 'pena', nombre: 'Bar La Peña', accion: 'Donde se reúne la afición', destino: {} },
      ayuntamiento: { id: 'ayuntamiento', nombre: 'Ayuntamiento de ' + club.ciudad, accion: 'Convenios y relación con la ciudad', destino: { todos: 'ciudad' } },
      kiosco: { id: 'kiosco', nombre: 'Quiosco de prensa', accion: 'Lo que dicen los periódicos', destino: {} },
      mercado: { id: 'mercado', nombre: 'Mercado de ' + S.plazaNombre, accion: 'Fruta, pescado y charla con los tenderos', destino: {} },
      parque: { id: 'parque', nombre: 'Canasta del parque', accion: 'Donde juegan los chavales del barrio', destino: {} },
      terraza: { id: 'terraza', nombre: 'Terraza del Café Central', accion: 'Un café y escuchar a la gente', destino: {} },
      heladeria: { id: 'heladeria', nombre: 'Heladería La Ola', accion: 'Helados artesanos', destino: {} },
      musico: { id: 'musico', nombre: 'Músico callejero', accion: 'Toca en la plaza', destino: {} }
    };
    if (amp) Object.assign(SALAS, amp.salas);
    // Pabellón, tienda, peña y ayuntamiento tienen interior (interiores.js): se entra por la puerta y dentro está su panel
    if (GM.interiores) [['pabellon', 'Entrar al pabellón'], ['tienda', 'Entrar en la tienda'], ['pena', 'Entrar en el bar'], ['ayuntamiento', 'Entrar en el ayuntamiento']].forEach(([k, b]) => { SALAS[k] = Object.assign({}, SALAS[k], { irA: 'interior:' + k, boton: b }); S.puertas['interior:' + k] = { x: zonas[k][0], z: zonas[k][1] + (zonas[k][1] < 0 ? 0.8 : -0.8), ry: zonas[k][1] < 0 ? 0 : Math.PI }; });
    S.zonas = Object.keys(SALAS).filter(k => zonas[k]).map(k => M.zona(W, SALAS[k], zonas[k][0], zonas[k][1], club));
    S.spawnCalle = { x: 15, z: -4.4, ry: 0 };
    // Puntos de paseo para los vecinos
    S.paseo = [];
    for (let x = -38; x <= 38; x += 3) { S.paseo.push([x, -4.8], [x, 4.8]); }
    for (let z = 8; z <= 21; z += 3) { S.paseo.push([-4.8, z], [4.8, z], [-4.8, -z], [4.8, -z]); }
    for (let x = -10; x <= 10; x += 4) for (let z = 27; z <= 50; z += 5) if (Math.hypot(x + 4, z - 41) > 4) S.paseo.push([x, z]);
    for (let x = -30; x <= -12; x += 6) S.paseo.push([x, 46]); for (let z = 30; z <= 54; z += 6) S.paseo.push([14, z], [32, z]);
    Object.keys(zonas).forEach(k => S.paseo.push(zonas[k])); if (amp) amp.paseo.forEach(p => S.paseo.push(p));
    S.cielo = true; S.scene.background = new THREE.Color(0xa9c6dc); S.scene.fog = new THREE.Fog(0xa9c6dc, 55, 140);
    GM.kit.fusionar(W);
    return W;
  }

  // ---------- Barrio: plaza, mercado, parque, comercios con terraza y fuente ----------
  function barrio(S, M, W, G, T, E, r, club, st, c1, c2, afi, rep, bar) {
    const zonas = {}; S.plazaNombre = bar[2] || bar[1] || club.ciudad;
    const tAdoq = M.textura('adoquin', 128, (x, n) => { x.fillStyle = '#8f8576'; x.fillRect(0, 0, n, n); const rr = rnd(5); for (let f = 0; f < 8; f++) for (let k = -1; k < 8; k++) { const t = 0.85 + rr() * 0.25; x.fillStyle = 'rgb(' + (190 * t | 0) + ',' + (178 * t | 0) + ',' + (160 * t | 0) + ')'; x.fillRect(k * 16 + (f % 2) * 8 + 1, f * 16 + 1, 14, 14); } });
    const plaza = new THREE.PlaneGeometry(84, 40).rotateX(-Math.PI / 2); uvM(plaza, 3, 3); const pm = new THREE.Mesh(plaza, real(new THREE.MeshStandardMaterial({ map: tAdoq, roughness: 0.95 }), 'PavingStones070', { escala: 2.6, tinte: 0xd8d2c8 })); pm.position.set(0, 0.0, 44); pm.receiveShadow = true; W.add(pm);
    // Jardineras que cierran la calle al tráfico
    for (let x = -2.4; x <= 2.4; x += 1.6) { caja(W, 1.2, 0.6, 1.2, '#8a8276', x, 0, 23.4); const ar = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), mat('#4f7f3a')); ar.position.set(x, 0.95, 23.4); W.add(ar); G.bloquea(x - 0.6, 22.8, x + 0.6, 24); }
    letrero(W, T.letrero('Plaza de ' + S.plazaNombre, '#1d4f91', '#fff', 'plaza'), 3.6, 0.7, 4.2, 2.6, 24.6, 0); cil(W, 0.05, 2.9, '#2a2f35', 4.2, 0, 24.5);
    // Fuente en dos alturas
    const fx = -4, fz = 41;
    cil(W, 3, 0.6, '#cfc6b4', fx, 0, fz, 28); cil(W, 2.75, 0.06, mat('#5aa7cf', { roughness: 0.1, metalness: 0.3 }), fx, 0.56, fz, 28); cil(W, 0.35, 1.8, '#cfc6b4', fx, 0.6, fz, 12); cil(W, 1.1, 0.3, '#cfc6b4', fx, 2.2, fz, 18); cil(W, 0.95, 0.04, mat('#5aa7cf', { roughness: 0.1 }), fx, 2.48, fz, 18);
    G.bloquea(fx - 3, fz - 3, fx + 3, fz + 3);
    // Mercado municipal: nave con bóveda y puestos delante
    edificio(W, G, T, E, r, [-34, 26, -14, 38], 1, 's', { colorBajo: '#6b4a3a', letrero: { txt: 'MERCADO MUNICIPAL', fondo: '#2e5d3a', letra: '#f2d27a', clave: 'merc', ancho: 9 }, toldo: { color: '#c9733f', ancho: 14 } });
    { const bo = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 20, 24, 1, false, 0, Math.PI), mat('#9cb3a5', { roughness: 0.6, metalness: 0.2 })); bo.rotation.z = Math.PI / 2; bo.rotation.y = Math.PI / 2; bo.rotation.set(0, 0, Math.PI / 2); bo.position.set(-24, 6.6, 32); bo.scale.set(1, 1, 0.5); W.add(bo); }
    const frutas = ['#e23b2e', '#f2a51d', '#7cb342', '#ffd23f', '#8e44ad', '#ff7043'];
    [-31, -27, -21, -17].forEach((x, i) => {
      caja(W, 3, 0.9, 1.4, '#7a5638', x, 0, 40.2); const aw = caja(W, 3.3, 0.08, 1.9, i % 2 ? '#e8eef2' : c1, x, 2.3, 40.2); aw.rotation.x = 0.15; for (const s of [-1.5, 1.5]) cil(W, 0.04, 2.3, '#555', x + s, 0, 40.9);
      for (let k = 0; k < 6; k++) { const cs = caja(W, 0.42, 0.18, 0.5, '#b58a5a', x - 1.1 + (k % 3) * 0.75, 0.9, 39.95 + (k >> 2 ? 0 : 0) + Math.floor(k / 3) * 0.55); for (let q = 0; q < 4; q++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), mat(frutas[(i * 3 + k) % frutas.length])); f.position.set(cs.position.x - 0.12 + (q % 2) * 0.24, 1.17, cs.position.z - 0.1 + (q >> 1) * 0.2); W.add(f); } }
      letrero(W, T.letrero(['FRUTAS PEPA', 'VERDURAS LUIS', 'FRUTOS SECOS', 'ENCURTIDOS'][i], '#f4efe3', '#2e5d3a', 'pst' + i), 2.2, 0.5, x, 2.55, 41.2, 0);
      G.bloquea(x - 1.6, 39.4, x + 1.6, 41);
    });
    zonas.mercado = [-24, 42.6];
    // Parque: césped, caminos, árboles, pista de baloncesto, columpios y bancos
    const cesped = new THREE.PlaneGeometry(22, 30).rotateX(-Math.PI / 2); const cm = new THREE.Mesh(cesped, mat('#6f9a4a', { roughness: 1 })); cm.position.set(24, 0.02, 42); cm.receiveShadow = true; W.add(cm);
    caja(W, 2.2, 0.01, 30, '#c9b89a', 15, 0.02, 42, 0, false); caja(W, 22, 0.01, 2.2, '#c9b89a', 24, 0.02, 36, 0, false);
    const pista = caja(W, 9, 0.04, 9, '#2f6f9e', 26, 0.02, 48, 0, false); caja(W, 8.4, 0.01, 0.08, '#ffffff', 26, 0.065, 44, 0, false); caja(W, 0.08, 0.01, 8.4, '#ffffff', 21.8, 0.065, 48, 0, false); caja(W, 0.08, 0.01, 8.4, '#ffffff', 30.2, 0.065, 48, 0, false);
    cil(W, 0.08, 3, '#2a2f35', 26, 0, 52.6); caja(W, 1.6, 1.0, 0.06, '#f4f4f4', 26, 2.6, 52.3); { const aro = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.02, 6, 18), mat('#e8590c')); aro.rotation.x = Math.PI / 2; aro.position.set(26, 2.85, 51.9); W.add(aro); S.aroParque = aro.position.clone(); }
    G.bloquea(25.8, 52.4, 26.2, 52.8);
    // Columpios y tobogán
    for (const x of [18, 20]) { cil(W, 0.05, 2.3, '#c8102e', x - 0.8, 0, 30); cil(W, 0.05, 2.3, '#c8102e', x + 0.8, 0, 30); caja(W, 1.7, 0.08, 0.08, '#c8102e', x, 2.3, 30); caja(W, 0.5, 0.05, 0.25, '#333', x, 0.55, 30); G.bloquea(x - 0.9, 29.7, x + 0.9, 30.3); }
    caja(W, 0.9, 1.6, 0.9, '#ffd23f', 29, 0, 30); const tob = caja(W, 0.6, 0.06, 2.6, '#2f9e6f', 29, 0.75, 31.6); tob.rotation.x = 0.55; G.bloquea(28.5, 29.5, 29.5, 32.6);
    // Árboles del parque y de la plaza
    const tronco = mat('#6b5136'), copas = [mat('#4f7f3a'), mat('#5d8c41'), mat('#3f6e33')]; copas.forEach(m => GM.kit.viento(m, 'copa'));
    [[18, 40], [18, 46], [18, 54], [31, 38], [33, 44], [20, 35], [30, 55], [22, 56], [-12, 30], [-12, 52], [6, 30], [8, 47]].forEach(([x, z], i) => { cil(W, 0.16, 2.4, tronco, x, 0, z, 6); const cp = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5 + (i % 3) * 0.25, 1), copas[i % 3]); cp.position.set(x, 3.3, z); cp.castShadow = true; W.add(cp); G.bloquea(x - 0.3, z - 0.3, x + 0.3, z + 0.3); });
    // Comercios con terraza al sur de la plaza (fachada mirando al norte)
    const tiendas = [['HELADERÍA LA OLA', '#7fd1c7', '#14181d', [-2, 0]], ['PIZZERÍA NAPOLI', '#c8102e', '#ffffff', [6, 0]], ['CAFÉ CENTRAL', '#5a3b26', '#f2d27a', [-10, 0]], ['LIBRERÍA PAPEL', '#1d4f91', '#ffffff', [-18, 0]], ['PELUQUERÍA', '#6b3a7a', '#ffffff', [-26, 0]], ['BASKET STORE', c1, '#ffffff', [-34, 0]]];
    tiendas.forEach(([nom, fondo, letra, [x0]], i) => { edificio(W, G, T, E, r, [x0 - 4, 57, x0 + 4, 64], 3 + (i % 3), 'n', { colorBajo: fondo, letrero: { txt: nom, fondo, letra, clave: 'tb' + i, ancho: 6.5 }, toldo: { color: fondo, ancho: 7 }, banderas: Math.round(afi / 30), c1, c2 }); });
    // Terrazas con mesas y sombrillas
    [[-10, 'CAFÉ CENTRAL', '#5a3b26'], [6, 'NAPOLI', '#c8102e'], [-2, 'LA OLA', '#7fd1c7']].forEach(([x, , col], k) => { for (let j = 0; j < 3; j++) { const mx = x - 2.5 + j * 2.5, mz = 54.2; cil(W, 0.45, 0.75, '#e8eef2', mx, 0, mz, 12); cil(W, 0.035, 2.3, '#555', mx, 0.75, mz); const so = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.45, 10), mat(col)); so.position.set(mx, 2.95, mz); W.add(so); for (const s of [-1, 1]) M.mueble('chairCushion').then(o => { o.position.set(mx + s * 0.75, 0, mz); o.rotation.y = s < 0 ? Math.PI / 2 : -Math.PI / 2; o.traverse(q => { if (q.isMesh) q.castShadow = true; }); W.add(o); }).catch(() => {}); G.bloquea(mx - 1.1, mz - 0.4, mx + 1.1, mz + 0.4); } });
    zonas.terraza = [-10, 52.2]; zonas.heladeria = [-2, 52.2];
    // Mural de baloncesto en la medianera del mercado si el club tiene reputación
    if (rep >= 60) plano(W, 5, 5, new THREE.MeshStandardMaterial({ map: T.escudo, transparent: true }), -13.94, 4.2, 32, Math.PI / 2);
    // Banderines con los colores del club cruzando la plaza (si la afición está alta o hay fiesta)
    if (afi > 55 || (S.dia && S.dia.tipo !== 'normal')) {
      const n = 24, geo = new THREE.BufferGeometry(); const pos = [], col = [], cc = new THREE.Color();
      [[-14, 30, 8, 52], [8, 30, -14, 52], [-14, 41, 8, 41]].forEach(([xa, za, xb, zb], li) => { for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, x = xa + (xb - xa) * t, z = za + (zb - za) * t, y = 6.2 - Math.sin(t * Math.PI) * 1.4; pos.push(x - 0.25, y, z, x + 0.25, y, z, x, y - 0.5, z); cc.set((i + li) % 2 ? c1 : c2); for (let k = 0; k < 3; k++) col.push(cc.r, cc.g, cc.b); } });
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
      W.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })));
      for (const [x, z] of [[-14, 30], [8, 30], [-14, 52], [8, 52], [-14, 41], [8, 41]]) { cil(W, 0.07, 6.3, '#2a2f35', x, 0, z, 8); G.bloquea(x - 0.15, z - 0.15, x + 0.15, z + 0.15); }
    }
    // Bancos y farolas de la plaza
    const mBanco = mat('#7a5638');
    [[-9, 37, 0], [1, 37, 0], [-9, 45.5, Math.PI], [1, 45.5, Math.PI], [16.3, 42, Math.PI / 2], [16.3, 48, Math.PI / 2]].forEach(([x, z, ry]) => { const b = caja(W, 1.6, 0.45, 0.45, mBanco, x, 0, z, ry); G.bloquea(x - 0.8, z - 0.8, x + 0.8, z + 0.8); });
    S.fuentePos = [fx, fz];
    zonas.parque = [26, 46.2]; zonas.musico = [-0.6, 44.6]; S.musicoPos = [0.6, 44.6];
    return zonas;
  }
  function moverPalomas(S, dt) {
    const P = S.palomas; if (!P || !P.base) return; const yo = S.yo && S.yo.obj.position;
    P.base.forEach((b, i) => {
      if (b.vuelo <= 0 && yo && Math.hypot(yo.x - b.x, yo.z - b.z) < 2.6) { b.vuelo = 3.5; const a = Math.atan2(b.z - yo.z, b.x - yo.x) + (Math.random() - 0.5); b.vx = Math.cos(a) * 3; b.vz = Math.sin(a) * 3; b.ox = b.x; b.oz = b.z; }
      if (b.vuelo > 0) { b.vuelo -= dt; const sube = b.vuelo > 1.5; b.x += b.vx * dt * (sube ? 1 : -1.1); b.z += b.vz * dt * (sube ? 1 : -1.1); b.y = sube ? Math.min(5, b.y + dt * 3) : Math.max(0.07, b.y - dt * 2.8); b.ry = Math.atan2(b.vx, b.vz) + (sube ? 0 : Math.PI); if (b.vuelo <= 0) { b.x = b.ox; b.z = b.oz; b.y = 0.07; } }
      else if (Math.random() < dt * 0.6) b.ry += (Math.random() - 0.5) * 1.5;
      const aleteo = b.vuelo > 0 ? 1 + Math.abs(Math.sin(performance.now() / 50 + i)) * 1.5 : 1;
      P.e.set(0, b.ry, 0); P.q.setFromEuler(P.e); P.s.set(aleteo, 1, 1); P.p.set(b.x, b.y + (b.vuelo > 0 ? 0 : Math.abs(Math.sin(performance.now() / 300 + i)) * 0.02), b.z); P.m.compose(P.p, P.q, P.s); P.im.setMatrixAt(i, P.m);
    });
    P.im.instanceMatrix.needsUpdate = true;
  }
  function perro(color) {
    const g = new THREE.Group(), m = mat(color), B = (w, h, d, x, y, z) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x, y, z); me.castShadow = true; g.add(me); return me; };
    B(0.26, 0.22, 0.6, 0, 0.38, 0); B(0.2, 0.2, 0.24, 0, 0.55, 0.36); B(0.12, 0.1, 0.14, 0, 0.5, 0.52); const cola = B(0.05, 0.05, 0.26, 0, 0.5, -0.38); cola.rotation.x = 0.7;
    const patas = [[-0.09, 0.22], [0.09, 0.22], [-0.09, -0.22], [0.09, -0.22]].map(([x, z]) => B(0.07, 0.28, 0.07, x, 0.14, z));
    g.userData = { patas, cola }; return g;
  }

  // ---------- Vecinos y aficionados ----------
  const MODELOS = ['h-casual_2', 'm-casual', 'h-beach', 'm-formal', 'h-casual_hoodie', 'm-punk', 'h-farmer', 'm-suit', 'h-suit', 'm-adventurer', 'h-worker', 'm-worker', 'h-punk', 'h-adventurer'];
  const PIEL = ['#f1c7a5', '#e0ac85', '#c68863', '#9a6142', '#6e4329'], PELO = ['#1d1510', '#3b2617', '#6a4425', '#a9793e', '#d8b46a', '#8a8a8a'];
  async function poblar(S, M, st) {
    const club = st.equipos[st.clubId], ciu = (st.ciudad && st.ciudad[st.clubId]) || { aficion: 50 }, afi = ciu.aficion || 50, partido = S.dia && S.dia.tipo === 'partido' && S.dia.casa;
    const n = partido ? 40 : 32, r = rnd(U.hash(st.fecha + 'vecinos')), c1 = club.colores[0], c2 = club.colores[1] || '#222';
    const lista = await Promise.all(Array.from({ length: n }, (_, k) => { const hincha = r() * 100 < afi * (partido ? 1.4 : 0.6); return M.personaje({ modelo: MODELOS[(r() * MODELOS.length) | 0], altura: 158 + r() * 30, piel: PIEL[(r() * 5) | 0], pelo: PELO[(r() * 6) | 0], ropa: hincha ? [r() < 0.6 ? c1 : c2, c1] : null }).then(p => Object.assign(p, { hincha })); }));
    lista.forEach((p, k) => {
      const q = S.paseo[(r() * S.paseo.length) | 0]; p.obj.position.set(q[0] + (r() - 0.5), 0, q[1] + (r() - 0.5) * 0.6);
      Object.assign(p, { peaton: true, rol: p.hincha ? 'Aficionado del ' + club.siglas : 'Vecino de ' + club.ciudad, r: rnd(U.hash(st.fecha + 'p' + k)), espera: r() * 3 });
      p.obj.userData = { npc: S.gente.length }; M.anim(p, 'idle'); S.mundo.add(p.obj); S.gente.push(p);
    });
    // Niños que van al colegio y luego al parque, y vecinos que pasean al perro
    S.destinos = null;
    { const ninos = await Promise.all(Array.from({ length: 6 }, (_, k) => M.personaje({ modelo: ['h-casual_hoodie', 'h-casual_2', 'm-casual'][k % 3], altura: 118 + r() * 26, piel: PIEL[(r() * 5) | 0], pelo: PELO[(r() * 6) | 0], ropa: k % 2 ? [c1, c2] : null })));
      ninos.forEach((p, k) => { const q = S.paseo[(r() * S.paseo.length) | 0]; p.obj.position.set(q[0], 0, q[1]); Object.assign(p, { peaton: true, nino: true, rol: 'Chaval que va al colegio', r: rnd(U.hash(st.fecha + 'n' + k)), espera: r() * 3 }); p.obj.userData = { npc: S.gente.length }; M.anim(p, 'idle'); S.mundo.add(p.obj); S.gente.push(p); }); }
    S.palomas = GM.kit.palomas ? GM.kit.palomas(S.mundo, [S.fuentePos ? [S.fuentePos[0] + 4.5, S.fuentePos[1]] : [2, 40], S.fuentePos ? [S.fuentePos[0] - 4.5, S.fuentePos[1] + 2] : [-6, 47], [24, 44], [-14, 9], [-27, -6.5], [10, 50]], 9) : null;
    // Día de partido en casa: aficionados de pie en la acera del pabellón y a lo largo de la avenida
    S.multitud = null; S.fasePartido = null; S.partidoCasa = !!partido;
    if (partido && GM.kit.publico) {
      const piel = PIEL, fans = [], r2 = rnd(U.hash(st.fecha + 'multitud'));
      for (let i = 0; i < 160; i++) { const x = -40 + r2() * 30, z = -5.4 - r2() * 1.6; fans.push({ x, y: 0.88, z, ry: Math.PI + (r2() - 0.5) * 1.2, ropa: r2() < 0.7 ? c1 : c2, piel: piel[(r2() * 5) | 0], pelo: PELO[(r2() * 6) | 0], pantalon: '#2f3640' }); }
      for (let i = 0; i < 80; i++) { const x = -40 + r2() * 80, z = 5.4 + r2() * 1.2; if (Math.abs(x) < 10) continue; fans.push({ x, y: 0.88, z, ry: (r2() - 0.5) * 1.2, ropa: r2() < 0.6 ? c1 : c2, piel: piel[(r2() * 5) | 0], pelo: PELO[(r2() * 6) | 0], pantalon: '#2f3640' }); }
      const P = GM.kit.publico(fans, 1, true); S.mundo.add(P.grupo); S.multitud = P;
    }
    // Rúa de campeones (rua.js): la avenida cortada al tráfico, multitud a los dos lados, autobús descapotable con la plantilla y el trofeo, y confeti
    S.rua = null;
    if (GM.mods.rua && GM.mods.rua.activa(st) && GM.kit.publico) {
      const r3 = rnd(U.hash(st.fecha + 'rua')), fans = [];
      for (let i = 0; i < 920; i++) { const x = -72 + r3() * 144, sur = i % 3 === 0, z = sur ? 5.4 + r3() * 1.6 : -5.5 - r3() * 3.4; if (Math.abs(x) < 7.5) continue; fans.push({ x, y: 0.88, z, ry: (sur ? Math.PI : 0) + (r3() - 0.5) * 0.7, ropa: r3() < 0.75 ? c1 : c2, piel: PIEL[(r3() * 5) | 0], pelo: PELO[(r3() * 6) | 0], pantalon: '#2f3640' }); }
      const P = GM.kit.publico(fans, 1, true); S.mundo.add(P.grupo);
      const bus = autobusRua(club, st.rua.nombre); bus.position.set(-40, 0, 0); S.mundo.add(bus);
      const jug = club.plantilla.map(i => st.jugadores[i]).filter(Boolean).sort((a, b) => b.ovr - a.ovr).slice(0, 6);
      const gente = await Promise.all(jug.map((j, k) => M.personaje({ modelo: ['h-casual_hoodie', 'h-casual_2', 'h-beach'][k % 3], altura: j.altura || 198, piel: PIEL[(U.hash(j.id) >>> 2) % 5], pelo: PELO[(U.hash(j.id) >>> 5) % 6], ropa: [c1, c2] })));
      gente.forEach((p, k) => { p.obj.position.set(-3.6 + k * 1.35, 2.62, k % 2 ? 0.55 : -0.55); p.obj.rotation.y = k % 2 ? 0 : Math.PI; M.anim(p, k % 3 === 0 ? 'interact-right' : 'emote-yes'); bus.add(p.obj); });
      // confeti: puntos de colores que caen alrededor del autobús
      const n = 700, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), cc = new THREE.Color(), cols = [c1, c2, '#ffd23f', '#ffffff'];
      for (let i = 0; i < n; i++) { pos[i * 3] = (r3() - 0.5) * 30; pos[i * 3 + 1] = r3() * 10; pos[i * 3 + 2] = (r3() - 0.5) * 14; cc.set(cols[i % 4]); col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b; }
      const gConf = new THREE.BufferGeometry(); gConf.setAttribute('position', new THREE.BufferAttribute(pos, 3)); gConf.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const conf = new THREE.Points(gConf, new THREE.PointsMaterial({ size: 0.2, vertexColors: true })); conf.userData = { rua: true }; conf.frustumCulled = false; S.mundo.add(conf);
      S.rua = { x: -40, bus, gente, conf, publico: P, fans, tCol: 0 };
      if (GM.ui && GM.ui.toast) GM.ui.toast('¡Rúa de campeones! El autobús con el trofeo recorre la avenida');
    }
    // Músico callejero con su guitarra
    S.musico = null; S.perros = []; S.chavales = null;
    { const mu = await M.personaje({ modelo: 'h-punk', altura: 176, piel: PIEL[1], pelo: PELO[0] }); mu.fijo = true; mu.rol = 'Músico callejero'; mu.obj.position.set(S.musicoPos[0], 0, S.musicoPos[1]); mu.obj.rotation.y = -Math.PI / 2;
      const gu = new THREE.Group(), cuerpo = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.45, 0.1), mat('#a0522d')), mastil = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.05), mat('#3b2617')); mastil.position.set(0.3, 0.12, 0); mastil.rotation.z = -1.2; gu.add(cuerpo, mastil); gu.position.set(0.05, 1.05, 0.2); gu.rotation.z = 0.5; gu.scale.setScalar(1 / mu.obj.scale.x); gu.position.multiplyScalar(1 / mu.obj.scale.x); mu.obj.add(gu);
      const funda = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.35), mat('#1d2024')); funda.position.set(S.musicoPos[0] - 0.9, 0.06, S.musicoPos[1] + 0.6); S.mundo.add(funda);
      mu.obj.userData = { npc: S.gente.length }; M.anim(mu, 'idle'); S.mundo.add(mu.obj); S.gente.push(mu); S.musico = mu; }
    // Vecinos con perro (el perro sigue a su dueño)
    S.gente.filter(p => p.peaton && !p.hincha).slice(0, 3).forEach((p, k) => { const d = perro(['#c8a06a', '#3a2a1a', '#f2efe8'][k]); S.mundo.add(d); S.perros.push({ d, dueno: p, fase: k }); p.rol = 'Vecino paseando al perro'; });
    // Chavales jugando en la canasta del parque
    { const ch = await Promise.all([0, 1, 2].map(k => M.personaje({ modelo: ['h-casual_hoodie', 'm-casual', 'h-beach'][k], altura: 138 + k * 6, piel: PIEL[k + 1], pelo: PELO[k], ropa: k === 1 ? null : [c1, c2] })));
      const pos = [[24.5, 49.5], [27.8, 48.8], [26, 46.8]], balon = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), mat('#d9692b')); balon.castShadow = true; S.mundo.add(balon);
      ch.forEach((p, k) => { p.fijo = true; p.rol = 'Chaval del barrio'; p.obj.position.set(pos[k][0], 0, pos[k][1]); p.obj.userData = { npc: S.gente.length }; M.anim(p, 'idle'); S.mundo.add(p.obj); S.gente.push(p); });
      S.chavales = { ch, balon, t: 0, de: 0, a: 1, tiro: false }; }
    // Clientes sentados en las terrazas
    { const sillas = [[-12.5 - 0.75, Math.PI / 2], [-10 + 0.75, -Math.PI / 2], [3.5 - 0.75, Math.PI / 2], [6 + 0.75, -Math.PI / 2], [-2 - 0.75, Math.PI / 2], [8.5 + 0.75, -Math.PI / 2]];
      const cl = await Promise.all(sillas.map((q, k) => M.personaje({ modelo: MODELOS[(k * 5 + 2) % MODELOS.length], altura: 160 + k * 4, piel: PIEL[k % 5], pelo: PELO[(k * 2) % 6] })));
      cl.forEach((p, k) => { p.fijo = true; p.rol = 'Cliente de la terraza'; p.obj.position.set(sillas[k][0], 0, 54.2); p.obj.rotation.y = sillas[k][1]; p.asiento = 0.45; p.obj.userData = { npc: S.gente.length }; S.mundo.add(p.obj); M.anim(p, 'sit'); S.gente.push(p); }); }
    // Coches
    S.coches = []; const colores = ['#c8102e', '#f4f4f4', '#1d2024', '#2f6f9e', '#8a8f94', '#e8b923', '#3a5a3a', '#7a2f22'];
    const carriles = [['x', 1, 1.5], ['x', -1, -1.5], ['z', 1, -1.5], ['z', -1, 1.5]];
    const RANGO = { x: [-150, 150], z: [-100, 24] };
    if (!S.rua) carriles.forEach(([eje, dir, c], ci) => { const [mn, mx] = RANGO[eje], largo = mx - mn, n = eje === 'x' ? 7 : 4; for (let i = 0; i < n; i++) { const obj = coche(colores[(ci * 3 + i) % colores.length]); S.mundo.add(obj); S.coches.push({ obj, eje, dir, c, pos: mn + (i + 0.3) * (largo / n) + r() * 4, vel: 6, largo, min: mn, max: mx, len: 4.1 }); } });
    // Autobús urbano con el anuncio del club: carril sur de la avenida, para en la parada
    if (!S.rua) { const obj = autobus(club); S.mundo.add(obj); S.coches.push({ obj, eje: 'x', dir: 1, c: 1.5, pos: -20, vel: 5, largo: 300, min: -150, max: 150, len: 10.5, bus: true, parada: -36, tParada: 0 }); }
    S.tSem = 0;
  }
  // Autobús descapotable de la rúa (a lo largo del eje x): dos pisos, el de arriba abierto con barandilla, pancarta con el título y el trofeo delante
  function autobusRua(club, titulo) {
    const g = new THREE.Group(), c1 = club.colores[0] === '#000000' ? '#222222' : club.colores[0], c2 = club.colores[1] || '#ffffff';
    const B = (w, h, d, m, x, y, z) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof m === 'string' ? mat(m) : m); me.position.set(x, y, z); me.castShadow = true; g.add(me); return me; };
    B(10.6, 2.3, 2.5, c1, 0, 1.45, 0); B(10.4, 0.8, 2.52, mat('#22303a', { roughness: 0.1, metalness: 0.5 }), 0, 1.9, 0); B(10.62, 0.3, 2.54, c2, 0, 0.6, 0); B(10.6, 0.1, 2.5, '#d9d4c8', 0, 2.62, 0);
    for (const z of [-1.2, 1.2]) { B(10.4, 0.06, 0.06, c2, 0, 3.55, z); for (let i = 0; i < 9; i++) B(0.05, 0.9, 0.05, c2, -5 + i * 1.25, 3.1, z); }
    B(0.06, 0.9, 2.4, c2, 5.2, 3.1, 0); B(0.06, 0.9, 2.4, c2, -5.2, 3.1, 0);
    const c = document.createElement('canvas'); c.width = 1024; c.height = 128; const x = c.getContext('2d');
    if (x) { x.fillStyle = c2 === c1 ? '#ffffff' : c2; x.fillRect(0, 0, 1024, 128); x.fillStyle = c1; x.font = 'bold 66px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('¡CAMPEONES! ' + (titulo || '').toUpperCase(), 512, 66); }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    for (const z of [-1.29, 1.29]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 1.05), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })); p.position.set(0, 3.15, z); g.add(p); }
    for (const [px, pz] of [[-3.6, -1.1], [-3.6, 1.1], [3.4, -1.1], [3.4, 1.1]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 14), mat('#151515')); w.rotation.x = Math.PI / 2; w.position.set(px, 0.5, pz); g.add(w); }
    const oro = mat('#d4a72c', { metalness: 0.9, roughness: 0.25 }), copa = new THREE.Group(); copa.position.set(4.6, 2.67, 0); g.add(copa);
    const pie = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.3, 14), oro); pie.position.y = 0.15; copa.add(pie); const cu = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.14, 0.75, 16), oro); cu.position.y = 0.8; copa.add(cu);
    for (const s of [-1, 1]) { const a = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 6, 12), oro); a.position.set(0, 0.85, s * 0.42); a.rotation.y = Math.PI / 2; copa.add(a); }
    g.userData = { rua: true }; return g;
  }
  // Autobús del equipo (cerrado, con los colores y el nombre del club)
  function autobusEquipo(club) {
    const g = new THREE.Group(), c1 = club.colores[0] === '#000000' ? '#222222' : club.colores[0], c2 = club.colores[1] || '#ffffff', B = (w, h, d, m, x, y, z) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof m === 'string' ? mat(m) : m); me.position.set(x, y, z); me.castShadow = true; g.add(me); return me; };
    B(2.5, 3.1, 11.5, c1, 0, 1.95, 0); B(2.52, 0.9, 11.2, mat('#1b2229', { roughness: 0.1, metalness: 0.5 }), 0, 2.5, 0.2); B(2.54, 0.4, 11.52, c2, 0, 0.95, 0);
    const c = document.createElement('canvas'); c.width = 1024; c.height = 128; const x = c.getContext('2d');
    if (x) { x.fillStyle = c1; x.fillRect(0, 0, 1024, 128); x.fillStyle = c2 === c1 ? '#fff' : c2; x.font = 'bold 70px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(club.nombre.toUpperCase(), 512, 66); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.1), new THREE.MeshBasicMaterial({ map: t })); p.position.set(s * 1.27, 1.45, 0); p.rotation.y = s * Math.PI / 2; g.add(p); } }
    for (const [px, pz] of [[-1.1, 3.9], [1.1, 3.9], [-1.1, -3.6], [1.1, -3.6]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.3, 14), mat('#151515')); w.rotation.z = Math.PI / 2; w.position.set(px, 0.52, pz); g.add(w); }
    g.userData = { autobusEquipo: true }; return g;
  }
  function autobus(club) {
    const g = new THREE.Group(), c1 = club.colores[0] === '#000000' ? '#222222' : club.colores[0];
    const B = (w, h, d, m, x, y, z) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x, y, z); me.castShadow = true; g.add(me); return me; };
    B(2.5, 2.6, 10.4, mat('#e9edf0', { roughness: 0.4 }), 0, 1.65, 0); B(2.52, 0.9, 10.2, mat('#22303a', { roughness: 0.1, metalness: 0.5 }), 0, 2.2, 0.1); B(2.54, 0.35, 10.42, mat(c1), 0, 0.7, 0);
    B(2.4, 0.06, 10.2, mat('#c9cdd1'), 0, 2.98, 0);
    for (const [x, z] of [[-1.1, 3.6], [1.1, 3.6], [-1.1, -3.4], [1.1, -3.4]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 14), mat('#151515')); w.rotation.z = Math.PI / 2; w.position.set(x, 0.5, z); g.add(w); }
    g.position.y = -0.12; g.userData = { coche: true }; GM.kit.fusionar(g); return g;
  }
  let nCoche = 0;
  function coche(color) {
    if (GM.kit.coche && (!GM.campus || GM.campus.config.calidad === 'alta')) { const k = nCoche++, tipo = k === 9 ? 'ambulancia' : ['turismo', 'compacto', 'turismo', 'todoterreno', 'compacto', 'furgoneta', 'taxi'][k % 7], o = GM.kit.coche(tipo === 'taxi' || tipo === 'ambulancia' ? '#f4f4f4' : tipo === 'furgoneta' ? '#e8e8e8' : color, tipo); o.position.y = -0.12; o.userData.coche = true; return o; }
    const g = new THREE.Group(), cuerpo = mat(color, { roughness: 0.35, metalness: 0.4 }), cristal = mat('#22303a', { roughness: 0.1, metalness: 0.6 }), rueda = mat('#151515');
    const B = (w, h, d, m, x, y, z) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x, y, z); me.castShadow = true; g.add(me); };
    B(1.8, 0.55, 4.1, cuerpo, 0, 0.5, 0); B(1.6, 0.5, 2.1, cristal, 0, 0.98, -0.2); B(1.62, 0.06, 2.0, cuerpo, 0, 1.25, -0.2);
    B(0.4, 0.15, 0.05, mat('#fff6d6', { emissive: 0xfff1c4, emissiveIntensity: 0.5 }), -0.6, 0.55, 2.05); B(0.4, 0.15, 0.05, mat('#fff6d6', { emissive: 0xfff1c4, emissiveIntensity: 0.5 }), 0.6, 0.55, 2.05);
    B(0.4, 0.12, 0.05, mat('#a81010', { emissive: 0x800000 }), -0.6, 0.6, -2.05); B(0.4, 0.12, 0.05, mat('#a81010', { emissive: 0x800000 }), 0.6, 0.6, -2.05);
    for (const [x, z] of [[-0.85, 1.3], [0.85, 1.3], [-0.85, -1.3], [0.85, -1.3]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.25, 14), rueda); w.rotation.z = Math.PI / 2; w.position.set(x, 0.34, z); g.add(w); }
    g.position.y = -0.12; g.userData = { coche: true }; GM.kit.fusionar(g); return g;
  }
  // ---------- Rutinas por hora ----------
  // Por la mañana se va al trabajo y al colegio, a media mañana de compras, a mediodía a comer y a las terrazas, por la tarde de paseo
  // y al parque, y por la noche a los bares o a casa. Cuánta gente hay en la calle depende de la hora; quien se va a casa entra en un
  // portal y no vuelve a salir hasta que le toca.
  const DENS = h => h < 7 ? 0.15 : h < 9 ? 0.6 : h < 13 ? 0.75 : h < 16 ? 0.9 : h < 20 ? 1 : h < 22 ? 0.6 : 0.3;
  const FRANJA = h => h < 10 ? 'manana' : h < 13 ? 'media' : h < 16 ? 'comida' : h < 20 ? 'tarde' : h < 22.5 ? 'noche' : 'tarde_noche';
  const PESOS = { manana: { trabajo: 0.55, compras: 0.15, paseo: 0.3 }, media: { compras: 0.45, trabajo: 0.15, paseo: 0.4 }, comida: { comer: 0.6, paseo: 0.25, compras: 0.15 }, tarde: { paseo: 0.55, compras: 0.25, comer: 0.2 }, noche: { bares: 0.55, paseo: 0.25, casa: 0.2 }, tarde_noche: { casa: 0.8, bares: 0.2 } };
  function destinos(S) {
    if (S.destinos) return S.destinos; const Z = (S.zonas || []).map(z => [z.sala.id, z.obj.position.x, z.obj.position.z]), de = re => Z.filter(z => re.test(z[0])).map(z => [z[1], z[2]]);
    const portales = []; for (let x = -130; x <= 130; x += 13) { portales.push([x + 2, 5.6], [x - 3, -5.6]); }
    return (S.destinos = { trabajo: de(/hospital|ayuntamiento|sede_calle|estacion|metro|kiosco/), colegio: de(/colegio/), compras: de(/tienda|mercado|kiosco|heladeria/), comer: de(/terraza|pena|heladeria|mercado/), bares: de(/pena|terraza/), paseo: de(/parque|musico|plaza/).concat(S.paseo.filter((_, i) => i % 7 === 0)), parque: de(/parque/), casa: portales });
  }
  function elegir(n, pesos) { let x = n.r(), k; for (k in pesos) { x -= pesos[k]; if (x <= 0) return k; } return k; }
  function siguiente(S, M, n) {
    const h = S.hora || 9, D = destinos(S);
    if (n.k === undefined) n.k = n.r();
    // ¿Le toca estar en la calle a esta hora?
    const activo = n.nino ? (h >= 7.5 && h < 21) : n.k < DENS(h) * (S.clima && S.clima.tipo === 'lluvia' ? 0.55 : 1);
    if (n.enCasa) { if (activo && !(n.hasta && h < n.hasta)) { n.enCasa = false; n.oculto = false; n.hasta = 0; } else { n.espera = 6; return; } }
    if (n.dentro) { if (h >= n.hasta) { n.dentro = false; n.oculto = false; } else { n.espera = 4; return; } }
    if (!activo && !n.hincha) { const q = D.casa[(n.r() * D.casa.length) | 0]; if (M.irA(n, q[0], q[1], () => { n.oculto = true; n.enCasa = true; n.espera = 8; })) return; }
    if (S.dia && S.dia.tipo === 'partido' && S.dia.casa && (n.hincha || n.r() < 0.25) && h >= 16 && h < 20.5 && GM.calle.partidoFase) {   // a la previa
      const q = n.r() < 0.5 ? [19 + (n.r() - 0.5) * 6, 6.2] : [-19.5 + (n.r() - 0.5) * 10, -5.6]; if (M.irA(n, q[0], q[1], () => { M.anim(n, 'emote-yes'); n.espera = 6 + n.r() * 8; })) return;
    }
    if (S.dia && S.dia.tipo === 'partido' && S.dia.casa && h >= 20.4 && h < 22.25 && (n.hincha || n.r() < 0.4)) {   // el partido: los aficionados entran en el pabellón (vuelven a salir al acabar)
      if (M.irA(n, -19.5 + (n.r() - 0.5) * 3, -6.2, () => { n.oculto = true; n.dentro = true; n.hasta = 22.3 + n.r() * 0.3; n.espera = 4; })) return;
    }
    let cat;
    if (n.nino) cat = h < 9 ? 'colegio' : h < 14 ? 'colegio' : h < 20 ? 'parque' : 'casa';
    else cat = elegir(n, PESOS[FRANJA(h)]);
    const L = D[cat] && D[cat].length ? D[cat] : S.paseo, q = L[(n.r() * L.length) | 0];
    n.rapido = !!n.nino && n.r() < 0.5; n.destino = cat;
    const ok = M.irA(n, q[0] + (n.r() - 0.5) * 1.6, q[1] + (n.r() - 0.5) * 1.2, () => {
      if (cat === 'colegio' && h < 14) { n.oculto = true; n.dentro = true; n.hasta = 14 + n.r(); n.espera = 4; return; }
      if (cat === 'trabajo' && n.r() < 0.6) { n.oculto = true; n.dentro = true; n.hasta = h + 2 + n.r() * 5; n.espera = 4; return; }
      if (cat === 'casa') { n.oculto = true; n.enCasa = true; n.hasta = h + 3; n.espera = 8; return; }
      M.anim(n, cat === 'compras' ? 'interact-right' : cat === 'parque' && n.nino ? 'emote-yes' : (cat === 'bares' || cat === 'comer') && n.r() < 0.4 ? 'emote-yes' : 'idle');
      n.espera = cat === 'comer' || cat === 'bares' ? 8 + n.r() * 14 : cat === 'parque' ? 4 + n.r() * 6 : 2 + n.r() * 6; });
    if (ok) return;
    const q2 = S.paseo[(n.r() * S.paseo.length) | 0]; if (!M.irA(n, q2[0], q2[1], () => { M.anim(n, 'idle'); n.espera = 2 + n.r() * 4; })) n.espera = 1;
  }
  // ---------- Tráfico, semáforos y saludos ----------
  async function fasePartido(S, M, st) {
    const h = S.hora || 9, f = h < 16 ? 'antes' : h < 20.5 ? 'previa' : h < 22.25 ? 'juego' : 'salida';
    if (S.fasePartido === f || S.cambiandoFase) return; S.cambiandoFase = true; S.fasePartido = f;
    const club = st.equipos[st.clubId], c1 = club.colores[0], c2 = club.colores[1] || '#222', r = rnd(U.hash(st.fecha + f)), P = S.partidoObj || (S.partidoObj = {});
    const quitar = k => { if (P[k]) { S.mundo.remove(P[k].grupo || P[k]); P[k] = null; } };
    if (S.multitud) S.multitud.grupo.visible = f === 'previa';
    if (f === 'previa') {
      // cola en las taquillas y grupos cantando delante de la peña y la terraza
      const cola = []; for (let i = 0; i < 34; i++) cola.push({ x: -15 + (i % 17) * 0.62, y: 0.88, z: -4.3 - (i >= 17 ? 0.65 : 0) + (r() - 0.5) * 0.2, ry: -Math.PI / 2 + (r() - 0.5) * 0.4, ropa: r() < 0.7 ? c1 : c2, piel: PIEL[(r() * 5) | 0], pelo: PELO[(r() * 6) | 0], pantalon: '#2f3640' });
      P.cola = GM.kit.publico(cola, 1, true); S.mundo.add(P.cola.grupo); P.colaSitios = cola; P.colaT = 0;
      const bar = []; for (let i = 0; i < 40; i++) { const a = r() * Math.PI * 2, d = 0.6 + r() * 2.4, enPena = i < 26, cx = enPena ? 19 : -10, cz = enPena ? 6.6 : 50; bar.push({ x: cx + Math.cos(a) * d * 1.6, y: 0.88, z: cz + Math.sin(a) * d * 0.5, ry: r() * Math.PI * 2, ropa: r() < 0.75 ? c1 : c2, piel: PIEL[(r() * 5) | 0], pelo: PELO[(r() * 6) | 0], pantalon: '#2f3640' }); }
      P.bares = GM.kit.publico(bar, 1, true); S.mundo.add(P.bares.grupo);
    } else { quitar('cola'); quitar('bares'); }
    if (f === 'salida') {
      // al acabar, el público sale del pabellón y se reparte por la avenida hacia el metro y los barrios
      const sal = []; for (let i = 0; i < 260; i++) sal.push({ x: -19.5 + (r() - 0.5) * 6, y: 0.88, z: -6 + (r() - 0.5) * 1.5, ry: 0, ropa: r() < 0.7 ? c1 : c2, piel: PIEL[(r() * 5) | 0], pelo: PELO[(r() * 6) | 0], pantalon: '#2f3640', vx: (r() < 0.5 ? -1 : 1) * (0.9 + r() * 0.7), vz: (r() - 0.5) * 0.15, retraso: r() * 40 });
      P.salida = GM.kit.publico(sal, 1, true); S.mundo.add(P.salida.grupo); P.salidaSitios = sal; P.salidaT = 0;
      sal.forEach(s => { s.ry = s.vx > 0 ? Math.PI / 2 : -Math.PI / 2; s.y = -20; });
    }
    S.cambiandoFase = false;
  }
  async function busEquipo(S, M, st) {
    // a las 19:00 llega el autobús del equipo, se baja la plantilla y entra en el pabellón
    if (S.busEquipo || (S.hora || 9) < 19 || (S.hora || 9) >= 20.5) return; const club = st.equipos[st.clubId], bus = autobusEquipo(club); bus.position.set(90, -0.12, -1.5); bus.rotation.y = -Math.PI / 2; S.mundo.add(bus);
    S.busEquipo = { obj: bus, fase: 'llega', t: 0, jugadores: [] };
    const jug = club.plantilla.map(i => st.jugadores[i]).filter(p => p && p.id !== 'yo').sort((a, b) => b.ovr - a.ovr).slice(0, 6), c1 = club.colores[0], c2 = club.colores[1] || '#222';
    S.busEquipo.jugadores = await Promise.all(jug.map((j, k) => M.personaje({ modelo: ['h-casual_hoodie', 'h-casual_2', 'h-beach'][k % 3], altura: j.altura || 198, piel: PIEL[(U.hash(j.id) >>> 2) % 5], pelo: PELO[(U.hash(j.id) >>> 5) % 6], ropa: [c1, c2] }).then(p => { Object.assign(p, { rol: j.nombre, jugador: j.id, fijo: true, oculto: true, r: rnd(U.hash(j.id)), espera: 999 }); p.obj.visible = false; p.obj.userData = { npc: S.gente.length }; S.mundo.add(p.obj); S.gente.push(p); return p; })));
  }
  function moverPartido(S, M, dt) {
    const P = S.partidoObj; if (!P) return; const t = performance.now() / 1000;
    if (P.cola) { P.colaT -= dt; if (P.colaT <= 0) { P.colaT = 0.15; P.colaSitios.forEach(s => { s.x -= 0.03; if (s.x < -15.3) s.x += 17 * 0.62; }); P.cola.colocar(i => (Math.sin(t * 2 + i) > 0.85 ? { brazos: 0.6 } : null)); } }
    if (P.bares) { P.baresT = (P.baresT || 0) - dt; if (P.baresT <= 0) { P.baresT = 0.12; P.bares.colocar(i => { const v = Math.sin(t * 5 + i * 1.7); return v > 0.3 ? { salto: (v - 0.3) * 0.4, brazos: 1 } : null; }); } }
    if (P.salida) { P.salidaT += dt; P.salidaCad = (P.salidaCad || 0) - dt; if (P.salidaCad <= 0) { P.salidaCad = 0.08; P.salidaSitios.forEach(s => { if (P.salidaT < s.retraso) return; if (s.y < 0) { s.y = 0.88; s.z = -4.2 + (Math.random() - 0.5) * 2.4; } s.x += s.vx * 0.08 * 2.4; s.z += s.vz * 0.08; if (Math.abs(s.x) > 140) s.y = -20; }); P.salida.colocar(() => null); } }
    const B = S.busEquipo; if (B) { const o = B.obj.position; B.t += dt;
      if (B.fase === 'llega') { o.x = Math.max(-19.5, o.x - dt * 7); if (o.x <= -19.5) { B.fase = 'bajan'; B.t = 0; if (S.multitud) S.multitud.saltaHasta = performance.now() / 1000 + 12; GM.ui && GM.ui.toast && GM.ui.toast('Llega el autobús del equipo'); } }
      else if (B.fase === 'bajan') { B.jugadores.forEach((p, k) => { if (B.t > k * 1.2 && !p.bajado) { p.bajado = true; p.oculto = false; p.obj.visible = true; p.obj.position.set(-19.5 + (k - 2.5) * 0.9, 0, -3.1); M.irA(p, -19.5 + (k - 2.5) * 0.4, -7.2, () => { p.oculto = true; p.obj.visible = false; }); } }); if (B.t > 14) { B.fase = 'se_va'; } }
      else if (B.fase === 'se_va') { o.x -= dt * 7; if (o.x < -160) { S.mundo.remove(B.obj); B.fase = 'fuera'; } } }
  }
  function actualizar(S, M, dt) {
    if (GM.ciudadBarrios) GM.ciudadBarrios.actualizar(S, dt);
    if (S.partidoCasa) { S.tFase = (S.tFase || 0) - dt; if (S.tFase <= 0) { S.tFase = 1; fasePartido(S, M, S.st); busEquipo(S, M, S.st); } }
    moverPartido(S, M, dt);
    if (S.palomas && S.yo) { const am = [[S.yo.obj.position.x, S.yo.obj.position.z]]; S.gente.forEach(n => { if (n.rapido && n.camino && n.camino.length && !n.oculto) am.push([n.obj.position.x, n.obj.position.z]); }); S.palomas.actualizar(dt, am); }
    if (S.rua) { const R = S.rua, t = performance.now() / 1000; R.x += dt * 2.2; if (R.x > 76) R.x = -76; R.bus.position.x = R.x; R.conf.position.x = R.x; R.gente.forEach(p => p.mixer.update(dt));
      const a = R.conf.geometry.attributes.position; for (let i = 0; i < a.count; i++) { let y = a.getY(i) - dt * (0.7 + (i % 5) * 0.18); if (y < 0.05) y += 10; a.setY(i, y); a.setX(i, a.getX(i) + Math.sin(t * 1.7 + i) * dt * 0.5); } a.needsUpdate = true;
      R.tCol -= dt; if (R.tCol <= 0) { R.tCol = 0.12; R.publico.colocar(i => { const f = R.fans[i], cerca = Math.abs(f.x - R.x) < 14, v = Math.sin(t * (cerca ? 7 : 3) + i * 2.3); return cerca ? { salto: Math.max(0, v) * 0.35, brazos: 1 } : v > 0.5 ? { salto: (v - 0.5) * 0.3, brazos: 1 } : null; }); } }
    if (S.multitud) { S.tMult = (S.tMult || 0) - dt; if (S.tMult <= 0) { S.tMult = 0.12; const t = performance.now() / 1000; const loco = S.multitud.saltaHasta && t < S.multitud.saltaHasta; S.multitud.colocar(i => { const v = Math.sin(t * (loco ? 8 : 4) + i * 2.3); return v > (loco ? 0 : 0.6) ? { salto: (v - (loco ? 0 : 0.6)) * 0.6, brazos: 1 } : null; }); } }
    if (!S.coches) return;
    moverPalomas(S, dt);
    S.perros && S.perros.forEach(p => { const o = p.dueno.obj, d = p.d, f = o.rotation.y, tx = o.position.x - Math.sin(f) * 0.9 + Math.cos(f) * 0.5, tz = o.position.z - Math.cos(f) * 0.9 - Math.sin(f) * 0.5, dx = tx - d.position.x, dz = tz - d.position.z, l = Math.hypot(dx, dz);
      d.position.x += dx * Math.min(1, dt * 4); d.position.z += dz * Math.min(1, dt * 4); d.visible = o.visible && !p.dueno.oculto; if (l > 0.05) d.rotation.y = Math.atan2(dx, dz); p.fase += dt * (l > 0.1 ? 14 : 3); d.userData.patas.forEach((pa, i) => { pa.rotation.x = l > 0.1 ? Math.sin(p.fase + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * 0.5 : 0; }); d.userData.cola.rotation.y = Math.sin(p.fase * 2) * 0.5; });
    if (S.chavales) { const C = S.chavales, ch = C.ch; C.t += dt; ch.forEach(p => p.mixer.update(dt));
      const de = ch[C.de].obj.position, a = C.tiro ? S.aroParque : ch[C.a].obj.position, dur = C.tiro ? 1.0 : 0.8, u = Math.min(1, C.t / dur);
      C.balon.position.set(de.x + (a.x - de.x) * u, (C.tiro ? 1.2 + (2.85 - 1.2) * u + Math.sin(u * Math.PI) * 1.6 : 1.0 + Math.abs(Math.sin(u * Math.PI * 2)) * 0.2 - Math.sin(u * Math.PI) * 0.0), de.z + (a.z - de.z) * u);
      ch[C.de].obj.lookAt(a.x, 0, a.z);
      if (u >= 1) { C.t = 0; if (C.tiro) { C.tiro = false; C.de = 2; C.a = (Math.random() * 2) | 0; } else { C.de = C.a; C.tiro = Math.random() < 0.35; C.a = C.tiro ? -1 : [0, 1, 2].filter(k => k !== C.de)[(Math.random() * 2) | 0]; if (C.tiro) M.anim(ch[C.de], 'interact-right'); else ch.forEach(p => M.anim(p, 'idle')); } }
      if (C.tiro && C.a === -1) C.a = 0; }
    if (S.musico) { S.musico.mixer.update(dt);
      { const p = S.musico, f = p.obj.rotation.y, fw = new THREE.Vector3(Math.sin(f), 0, Math.cos(f)), iz = new THREE.Vector3(Math.cos(f), 0, -Math.sin(f)), ab = new THREE.Vector3(0, -1, 0), t = performance.now() / 1000, rasgueo = Math.sin(t * 13) * 0.35;
        GM.sede.brazo(p, 'L', fw.clone().multiplyScalar(0.45).add(iz.clone().multiplyScalar(0.55)).add(ab.clone().multiplyScalar(0.6)), fw.clone().multiplyScalar(0.7).add(iz.clone().multiplyScalar(0.7)).add(ab.clone().multiplyScalar(-0.1)), 1);
        GM.sede.brazo(p, 'R', fw.clone().multiplyScalar(0.35).add(ab).add(iz.clone().multiplyScalar(-0.25)), fw.clone().multiplyScalar(0.55).add(iz.clone().multiplyScalar(0.75)).add(ab.clone().multiplyScalar(0.25 + rasgueo)), 1); } S.tMus = (S.tMus || 0) - dt; if (S.tMus <= 0) { S.tMus = 6 + Math.random() * 4; M.bocadillo(['♪ ♫ ♪', '♫ ' + S.st.equipos[S.st.clubId].siglas + ', ' + S.st.equipos[S.st.clubId].siglas + '... ♫', '♪ La la la ♪'][(Math.random() * 3) | 0], S.musico.obj); } }
    S.tSem = (S.tSem + dt) % 18; const verdeX = S.tSem < 8, verdeZ = S.tSem >= 9 && S.tSem < 17;
    S.semaforos.forEach(s => { const v = s.eje === 'x' ? verdeX : verdeZ; s.verde.material.emissiveIntensity = v ? 2.5 : 0; s.roja.material.emissiveIntensity = v ? 0 : 2.5; });
    S.coches.forEach(c => {
      const verde = c.eje === 'x' ? verdeX : verdeZ, delante = c.dir * c.pos;
      let objetivo = c.bus ? 5.5 : 7;
      // Ceder el paso: pasos de peatones a 6,5-9,5 m del cruce en cada eje
      const frente = delante + c.len / 2;
      for (const ini of [-9.5, 6.5]) { const dist = ini - frente; if (dist > -0.5 && dist < 4) { const ocupado = (S.gente.concat(S.yo ? [S.yo] : [])).some(p => { const a = c.eje === 'x' ? p.obj.position.x : p.obj.position.z, b = c.eje === 'x' ? p.obj.position.z : p.obj.position.x; return Math.abs(b) < 3.2 && c.dir * a > ini - 0.3 && c.dir * a < ini + 3.3; }); if (ocupado) objetivo = Math.min(objetivo, Math.max(0, dist * 1.5)); } }
      // Cualquier peatón en su carril (también fuera de los pasos): frena y espera a que pase
      for (const p of S.gente.concat(S.yo ? [S.yo] : [])) {
        const o = p.obj.position, lat = c.eje === 'x' ? o.z - c.c : o.x - c.c, lon = c.dir * ((c.eje === 'x' ? o.x : o.z) - c.pos) - c.len / 2;
        if (Math.abs(lat) < 1.15 && lon > -0.3 && lon < 6) objetivo = Math.min(objetivo, Math.max(0, (lon - 1.4) * 1.5));
      }
      // Autobús: parada de 6 s en la marquesina
      if (c.bus) { const d = c.parada - c.pos; if (c.tParada > 0) { c.tParada -= dt; objetivo = 0; } else if (d > 0 && d < 0.6 && c.vel < 1.5) { c.tParada = 6; } else if (d > 0 && d < 12) objetivo = Math.min(objetivo, Math.max(0.4, d * 0.6)); }
      if (!verde && delante > -16 && delante < -10.6) objetivo = Math.min(objetivo, Math.max(0, (-10.8 - delante) * 1.6));
      S.coches.forEach(o => { if (o === c || o.eje !== c.eje || o.dir !== c.dir) return; let gap = c.dir * (o.pos - c.pos); if (gap < 0) gap += c.largo; const hueco = gap - (c.len + o.len) / 2; if (hueco < 4) objetivo = Math.min(objetivo, Math.max(0, (hueco - 1.2) * 2)); });
      c.vel += Math.max(-9 * dt, Math.min(3 * dt, objetivo - c.vel)); c.pos += c.dir * c.vel * dt;
      const mn = c.min !== undefined ? c.min : -c.largo / 2, mx = c.max !== undefined ? c.max : c.largo / 2; if (c.pos > mx) c.pos -= c.largo; if (c.pos < mn) c.pos += c.largo;
      if (c.eje === 'x') { c.obj.position.set(c.pos, -0.12, c.c); c.obj.rotation.y = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2; } else { c.obj.position.set(c.c, -0.12, c.pos); c.obj.rotation.y = c.dir > 0 ? 0 : Math.PI; }
    });
    S.tOcl = (S.tOcl || 0) - dt;
    if (S.oclusores && S.yo && S.tOcl <= 0) {
      S.tOcl = 0.1; const ojo = S.camera.position, obj = S.yo.obj.position.clone().setY(1.0), dir = obj.clone().sub(ojo), dist = dir.length();
      _ray.set(ojo, dir.normalize()); _ray.far = dist; const set = new Set(S.oclusores), tapan = new Set(_ray.intersectObjects(S.oclusores, true).map(h => { let o = h.object; while (o && !set.has(o)) o = o.parent; return o; }));
      S.oclusores.forEach(g => { const meta = tapan.has(g) ? 0.2 : 1; g.traverse(m => { if (!m.isMesh) return; const mt = m.material; if (!tapan.has(g) && mt.opacity === 1) return; mt.transparent = true; mt.opacity += (meta - mt.opacity) * 0.6; if (Math.abs(mt.opacity - 1) < 0.02) { mt.opacity = 1; mt.transparent = false; } mt.depthWrite = mt.opacity > 0.95; mt.needsUpdate = true; }); });
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
  GM.calle = { partidoFase: true, construir, poblar, siguiente, actualizar, LIM };
})();
