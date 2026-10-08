/* TU PUEBLO PARA PASEAR (GM.puebloMundo) — modo carrera, con el motor del mundo de sede3d.js (como la calle y la casa)
   Pueblo amurallado de colina en el estilo de su región (pueblo3d.ESTILOS): muralla con torres y puerta al sur, plaza mayor con
   iglesia, ayuntamiento, fuente y bancos, y un anillo de 13 parcelas alrededor de la plaza, una por edificio que puedes levantar
   (pueblo.js). Cada parcela muestra su estado: solar libre, obra por fases (vallas, cimientos, estructura, andamios, acabado; grúa
   en las grandes y obreros trabajando) o el edificio, más grande cuanto más nivel. Las casas de la muralla aumentan con el nivel
   del pueblo y, desde «ciudad pequeña», el pueblo crece fuera de la muralla. Los vecinos pasean y comentan lo que haces.
   Expone: construir(S, M, st), poblar(S, M, st), siguiente(S, M, n), actualizar(S, M, dt). No escribe en el estado. */
(function () {
  const U = GM.util;
  const RM = 34, RL = 21, LIM = [-46, -46, 46, 56];   // radio de la muralla y del anillo de parcelas; límites de la rejilla
  // Parcelas del anillo (16 huecos): norte iglesia, este ayuntamiento, sur la calle de la puerta
  const LOTES = [null, 'canasta', 'bar', 'escuela', null, 'ambulatorio', 'polideportivo', 'tienda', null, 'hotel', 'pabellon', 'parque', 'biblioteca', 'centrodia', 'casapadres', 'casaamigos'];
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
  function bloque(G, M, E, w, d, pisos, muro, txt, acento, r) {
    const h = pisos * 3.1;
    caja(G, w, h, d, muro, 0, 0, 0);
    if (E.zocalo) caja(G, w + 0.05, 0.7, d + 0.05, E.zocalo, 0, 0, 0);
    const post = E.postigos[(r() * E.postigos.length) | 0];
    for (let p = 0; p < pisos; p++) for (let i = 0; i < Math.max(1, Math.floor(w / 2.4)); i++) {
      const x = -w / 2 + (i + 0.5) * w / Math.max(1, Math.floor(w / 2.4)); if (p === 0 && Math.abs(x) < 1) continue;
      caja(G, 0.9, 1.2, 0.08, '#2a3440', x, p * 3.1 + 1.1, d / 2 + 0.02); caja(G, 0.35, 1.2, 0.06, post, x - 0.65, p * 3.1 + 1.1, d / 2 + 0.04); caja(G, 0.35, 1.2, 0.06, post, x + 0.65, p * 3.1 + 1.1, d / 2 + 0.04);
      if (p > 0 && E.clave !== 'castellano' && r() < 0.5) caja(G, 1.3, 0.12, 0.5, '#3b3b3b', x, p * 3.1 + 0.9, d / 2 + 0.25);
    }
    caja(G, 1.4, 2.3, 0.1, '#5a3c26', 0, 0, d / 2 + 0.03);
    if (acento) { const tl = new THREE.Mesh(new THREE.BoxGeometry(Math.min(w - 0.6, 4.5), 0.15, 1.1), mat(acento)); tl.position.set(0, 2.7, d / 2 + 0.5); tl.rotation.x = 0.25; G.add(tl); }
    tejado(G, w, d, 1.6 + w * 0.06, E.teja, h);
    if (txt) { const s = rotulo(M, txt, acento || '#3a4a5a'); s.position.set(0, Math.min(h - 0.7, 3.6), d / 2 + 0.08); G.add(s); }
    return h;
  }
  // Lo que se ve en cada parcela según tipo y nivel (edificio acabado)
  function construido(G, M, E, tipo, nv, club, r) {
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
      caja(G, 7, 0.05, 7, '#6ea35a', 0, 0, 0);
      for (let i = 0; i < 4 + nv * 2; i++) { const a = r() * 6.28, d = 1.5 + r() * 2; cil(G, 0.15, 1.2, '#6b4a2b', Math.cos(a) * d, 0, Math.sin(a) * d, 6); const copa = new THREE.Mesh(new THREE.SphereGeometry(0.9 + r() * 0.4, 8, 6), mat('#3f7d3a')); copa.position.set(Math.cos(a) * d, 1.9, Math.sin(a) * d); copa.castShadow = true; G.add(copa); }
      caja(G, 1.6, 0.45, 0.5, '#7a5230', -1.5, 0, 2.6); caja(G, 1.6, 0.45, 0.5, '#7a5230', 1.5, 0, 2.6);
      [-0.6, 0.6].forEach(x => cil(G, 0.05, 2, '#c0392b', x, 0, -2.4, 6)); caja(G, 1.4, 0.08, 0.08, '#c0392b', 0, 2, -2.4);
      if (nv >= 2) { const lago = new THREE.Mesh(new THREE.CircleGeometry(1.4, 20).rotateX(-Math.PI / 2), mat('#4f9fd1')); lago.position.set(1.6, 0.06, -0.6); G.add(lago); }
      return;
    }
    const DEF = {   // [ancho, fondo, plantas base, color de acento]
      bar: [6, 6, 1, c1], tienda: [6, 6, 1, c1], escuela: [7, 6, 1, '#2f6f9e'], ambulatorio: [7, 6, 1, '#c0392b'], polideportivo: [7, 7, 1, c1], hotel: [7, 6, 2, '#7a2f22'],
      pabellon: [7, 7, 2, c1], biblioteca: [6, 6, 1, '#3c6e47'], centrodia: [7, 6, 1, '#8a6d3b'], casapadres: [6, 5, 1, null], casaamigos: [6, 5, 1, null]
    }[tipo] || [6, 6, 1, null];
    if (tipo === 'polideportivo' || tipo === 'pabellon') {   // nave con cubierta curva
      const h = 4 + nv * 1.2; caja(G, DEF[0], h, DEF[1], muro, 0, 0, 0);
      const cub = new THREE.Mesh(new THREE.CylinderGeometry(DEF[1] / 2, DEF[1] / 2, DEF[0] + 0.4, 16, 1, false, 0, Math.PI), mat('#6f8793')); cub.rotation.z = Math.PI / 2; cub.position.y = h; G.add(cub);
      [-2.4, -0.8, 0.8, 2.4].forEach(x => caja(G, 0.5, h, 0.06, c1, x, 0, DEF[1] / 2 + 0.03));
      caja(G, 2, 2.4, 0.1, '#2a3440', 0, 0, DEF[1] / 2 + 0.05); const s = rotulo(M, nombre, c1); s.position.set(0, h - 0.8, DEF[1] / 2 + 0.1); G.add(s);
      return;
    }
    const pisos = DEF[2] + (nv - 1);
    bloque(G, M, E, DEF[0], DEF[1], pisos, muro, tipo === 'casapadres' || tipo === 'casaamigos' ? null : nombre, DEF[3], r);
    if (tipo === 'ambulatorio') { caja(G, 0.9, 0.25, 0.06, '#d62d2d', 2.4, pisos * 3.1 - 1, DEF[1] / 2 + 0.06); caja(G, 0.25, 0.9, 0.06, '#d62d2d', 2.4, pisos * 3.1 - 1.33, DEF[1] / 2 + 0.06); }
    if (tipo === 'casapadres' || tipo === 'casaamigos') {   // valla y jardín
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
  // Muralla con torres y puerta al sur (hueco en +z)
  function muralla(W, G, E, nivel) {
    const piedra = mat(E.clave === 'toscano' ? '#b4724a' : E.clave === 'andaluz' ? '#ece6da' : '#a99377'), N = 56, alto = 5 + Math.min(2, nivel * 0.4);
    for (let i = 0; i < N; i++) {
      const a = i / N * Math.PI * 2, b = (i + 1) / N * Math.PI * 2, am = (a + b) / 2; if (Math.abs(am - Math.PI / 2) < 0.085) continue;   // la puerta
      const x = Math.cos(am) * RM, z = Math.sin(am) * RM, l = 2 * RM * Math.sin(Math.PI / N) + 0.15;
      const m = caja(W, l, alto, 1.4, piedra, x, 0, z, -am + Math.PI / 2); for (let k = 0; k < 2; k++) { const al = caja(W, 0.7, 0.7, 1.4, piedra, x, alto, z, -am + Math.PI / 2); al.translateX(k ? 0.6 : -0.6); }
      G.bloquea(x - 1, z - 1, x + 1, z + 1); void m;
      if (i % 7 === 3) { cil(W, 2.2, alto + 2.5, piedra, Math.cos(am) * (RM + 0.3), 0, Math.sin(am) * (RM + 0.3), 12); if (E.torre !== 'almenada') { const c = new THREE.Mesh(new THREE.ConeGeometry(2.6, 2.4, 12), mat(E.teja)); c.position.set(Math.cos(am) * (RM + 0.3), alto + 3.7, Math.sin(am) * (RM + 0.3)); W.add(c); } G.bloquea(Math.cos(am) * RM - 2.2, Math.sin(am) * RM - 2.2, Math.cos(am) * RM + 2.2, Math.sin(am) * RM + 2.2); }
    }
    // Puerta: dos torres y el arco
    [-3.4, 3.4].forEach(x => { cil(W, 2, alto + 3, piedra, x, 0, RM, 12); G.bloquea(x - 2, RM - 2, x + 2, RM + 2); });
    caja(W, 5, 1.6, 1.6, piedra, 0, alto - 0.3, RM);
  }
  function construir(S, M, st) {
    const W = S.mundo, club = st.equipos[st.clubId], Pm = GM.mods.pueblo, est = Pm.estado(st), nivel = est.nivel, pj = st.carrera.pueblo;
    const E = Object.assign({ clave: GM.pueblo3d ? GM.pueblo3d.estiloDe(pj.nombre, pj.nac) : 'castellano' }, GM.pueblo3d ? GM.pueblo3d.ESTILOS[GM.pueblo3d.estiloDe(pj.nombre, pj.nac)] : { muros: ['#d6b47c'], teja: '#b4643d', postigos: ['#5a3b22'], torre: 'campanario' });
    const G = M.rejilla({ limites: LIM, CELDA: 0.5 }); S.G = G; S.puebloAnim = []; S.oclusores = [];
    const r = rnd(U.hash(pj.nombre + 'mundo'));
    S.scene.background = new THREE.Color(0xa9c6dc); S.scene.fog = new THREE.Fog(0xa9c6dc, 60, 140);
    // Suelos: campo, interior empedrado, plaza y calles
    const emp = M.textura('empedrado-pueblo', 256, (x, n) => { x.fillStyle = '#b9a98c'; x.fillRect(0, 0, n, n); const rr = rnd(7); for (let i = 0; i < 260; i++) { x.fillStyle = 'rgba(' + (80 + rr() * 60 | 0) + ',' + (70 + rr() * 50 | 0) + ',' + (55 + rr() * 40 | 0) + ',.35)'; x.beginPath(); x.ellipse(rr() * n, rr() * n, 6 + rr() * 8, 4 + rr() * 6, rr() * 3, 0, 6.3); x.fill(); } });
    if (emp) { emp.wrapS = emp.wrapT = THREE.RepeatWrapping; emp.repeat.set(16, 16); }
    const campo = new THREE.Mesh(new THREE.PlaneGeometry(200, 200).rotateX(-Math.PI / 2), mat(E.tierra || '#7f9a5a')); campo.position.y = -0.02; campo.receiveShadow = true; W.add(campo);
    const dentro = new THREE.Mesh(new THREE.CircleGeometry(RM, 64).rotateX(-Math.PI / 2), emp ? new THREE.MeshStandardMaterial({ map: emp, roughness: 1 }) : mat('#b9a98c')); dentro.receiveShadow = true; W.add(dentro);
    const plaza = new THREE.Mesh(new THREE.PlaneGeometry(22, 18).rotateX(-Math.PI / 2), mat(Pm.edificios(st).find(b => b.tipo === 'plaza').nivel ? '#d8cdb5' : '#c7b896')); plaza.position.y = 0.01; plaza.receiveShadow = true; W.add(plaza);
    // Camino o carretera de entrada (nivel de «carretera»)
    const carr = Pm.edificios(st).find(b => b.tipo === 'carretera').nivel;
    const via = new THREE.Mesh(new THREE.PlaneGeometry(5, 24).rotateX(-Math.PI / 2), mat(carr ? '#4b5058' : '#a5875e')); via.position.set(0, 0.015, RM + 12); W.add(via);
    if (carr >= 2) { caja(W, 3, 0.15, 1.4, '#2f6f9e', 4.5, 2.6, RM + 8); [3.2, 5.8].forEach(x => cil(W, 0.06, 2.6, '#666', x, 0, RM + 7.5, 5)); caja(W, 2.6, 0.45, 0.6, '#7a5230', 4.5, 0, RM + 8.4); caja(W, 11, 3, 2.6, '#e67e22', -6, 0, RM + 14); }
    muralla(W, G, E, nivel);
    // Iglesia (norte) y ayuntamiento (este)
    { const g = new THREE.Group(); g.position.set(0, 0, -RL); W.add(g); const muro = E.clave === 'andaluz' ? '#f4f1ea' : '#bfa985'; caja(g, 9, 9, 12, muro, 0, 0, 0); tejado(g, 9, 12, 3.5, E.teja, 9); g.children[g.children.length - 1].rotation.y = 0;
      caja(g, 3.2, 17, 3.2, muro, 3.6, 0, 4.6); const pin = new THREE.Mesh(new THREE.ConeGeometry(2.4, 3.6, 4), mat(E.teja)); pin.rotation.y = Math.PI / 4; pin.position.set(3.6, 18.8, 4.6); g.add(pin);
      caja(g, 1.8, 3.2, 0.1, '#4a3020', 0, 0, 6.05); const rosa = new THREE.Mesh(new THREE.CircleGeometry(0.9, 16), mat('#2f5f8f')); rosa.position.set(0, 6, 6.06); g.add(rosa);
      G.bloquea(-4.6, -RL - 6, 5.4, -RL + 6.4); }
    { const g = new THREE.Group(); g.position.set(RL, 0, 0); g.rotation.y = -Math.PI / 2; W.add(g); bloque(g, M, E, 9, 7, 2, E.muros[1 % E.muros.length], 'Ayuntamiento', '#7a2f22', r);
      for (let i = 0; i < 5; i++) cil(g, 0.3, 3, '#e8dcc4', -3.6 + i * 1.8, 0, 4.4, 10); caja(g, 9.6, 0.4, 2, '#d8cbb0', 0, 3, 4.4);
      cil(g, 0.05, 4, '#ddd', 3.8, 6.2, 3.6, 5); caja(g, 1.4, 0.9, 0.04, club.colores[0], 4.5, 9.1, 3.6); G.bloquea(RL - 3.6, -4.6, RL + 4.6, 4.6); }
    // Plaza: fuente, bancos y (con la reforma) arcos iluminados
    const nPl = Pm.edificios(st).find(b => b.tipo === 'plaza').nivel;
    cil(W, nPl ? 2.2 : 1.4, 0.6, '#d9d2c3', 0, 0, 0, 20); const agua = new THREE.Mesh(new THREE.CircleGeometry(nPl ? 1.9 : 1.2, 20).rotateX(-Math.PI / 2), mat('#5aa9d6')); agua.position.y = 0.62; W.add(agua); cil(W, 0.25, 1.8, '#d9d2c3', 0, 0, 0, 10); G.bloquea(-2.3, -2.3, 2.3, 2.3);
    for (let i = 0; i < (nPl ? 8 : 4); i++) { const a = i / (nPl ? 8 : 4) * 6.28 + 0.4, x = Math.cos(a) * 6.5, z = Math.sin(a) * 5; caja(W, 1.6, 0.45, 0.5, '#7a5230', x, 0, z, -a); G.bloquea(x - 0.8, z - 0.4, x + 0.8, z + 0.4); }
    if (nPl >= 2) for (let i = 0; i < 6; i++) { const x = -10 + i * 4; [-8.6, 8.6].forEach(z => { cil(W, 0.12, 3.4, '#3d3d3d', x, 0, z, 6); const l = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffd27a', emissiveIntensity: 0.8 })); l.position.set(x, 3.5, z); W.add(l); }); }
    // Alumbrado en la calle de la puerta
    const nAl = Pm.edificios(st).find(b => b.tipo === 'alumbrado').nivel;
    for (let z = 12; z < RM - 2; z += nAl ? 5 : 10) [-3.4, 3.4].forEach(x => { cil(W, 0.08, 3.2, nAl ? '#2c3e50' : '#6b5a48', x, 0, z, 6); const l = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: nAl ? '#ffd27a' : '#000', emissiveIntensity: 0.7 })); l.position.set(x, 3.3, z); W.add(l); });
    // Mural y estatua (en la plaza)
    const nMu = Pm.edificios(st).find(b => b.tipo === 'mural').nivel;
    if (nMu) { const t = M.textura('mural-pueblo-' + st.jugadores.yo.nombre, 256, (x, n) => { x.fillStyle = club.colores[0]; x.fillRect(0, 0, n, n); x.fillStyle = club.colores[1] || '#fff'; x.font = 'bold 40px sans-serif'; x.textAlign = 'center'; x.fillText(st.jugadores.yo.nombre.split(' ').pop().toUpperCase(), n / 2, n / 2); x.font = 'bold 80px sans-serif'; x.fillText(String((st.jugadores.yo.dorsal) || 7), n / 2, n / 2 + 80); });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), t ? new THREE.MeshStandardMaterial({ map: t }) : mat(club.colores[0])); m.position.set(-4.5, 4.5, -RL + 6.1); W.add(m);
      if (nMu >= 3) { cil(W, 0.7, 1.2, '#cfc6b4', -7, 0, 5.5, 12); const oro = mat('#c9a227', { metalness: 0.8, roughness: 0.35 }); cil(W, 0.35, 1.6, oro, -7, 1.2, 5.5, 10); const cab = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), oro); cab.position.set(-7, 3.1, 5.5); W.add(cab); G.bloquea(-7.8, 4.7, -6.2, 6.3); } }
    // Parcelas del anillo: solar, obra o edificio
    const eds = Pm.edificios(st), zonas = [];
    LOTES.forEach((tipo, k) => {
      if (!tipo) return;
      const a = -Math.PI / 2 + k * Math.PI * 2 / 16, x = Math.cos(a) * RL, z = Math.sin(a) * RL, g = new THREE.Group(), b = eds.find(e => e.tipo === tipo), rr = rnd(U.hash(pj.nombre + tipo));
      g.position.set(x, 0, z); g.rotation.y = Math.atan2(-x, -z); W.add(g);
      if (b.obra) obra(g, M, E, tipo, b.obra.dest, b.obra.progreso, club, rr, S.puebloAnim);
      else if (b.nivel) construido(g, M, E, tipo, b.nivel, club, rr);
      else { caja(g, 7, 0.03, 7, '#9c8b6a', 0, 0, 0); const s = rotulo(M, 'Solar: ' + b.nombre, '#5d6d7e'); s.position.set(0, 1.4, 3.2); s.scale.setScalar(0.8); g.add(s); cil(g, 0.05, 1.4, '#555', 0, 0, 3.2, 5); }
      if (b.nivel || b.obra) G.bloquea(x - 3, z - 3, x + 3, z + 3);
      const zx = Math.cos(a) * (RL - 5.2), zz = Math.sin(a) * (RL - 5.2);
      zonas.push([{ id: 'pueblo_' + tipo, nombre: b.nombre, accion: '', destino: {}, acciones: s2 => accionesLote(s2, tipo) }, zx, zz]);
      S.lotes = S.lotes || {}; S.lotes[tipo] = { x, z, zx, zz, a };
    });
    // Zonas: plaza, alumbrado, carretera, mural y la puerta para irte
    zonas.push([{ id: 'pueblo_plaza', nombre: 'Plaza mayor', accion: '', destino: {}, acciones: s2 => accionesPlaza(s2) }, 0, 4.2]);
    zonas.push([{ id: 'pueblo_mural', nombre: (eds.find(e => e.tipo === 'mural').nombre), accion: '', destino: {}, acciones: s2 => accionesLote(s2, 'mural') }, -5.5, -RL + 8.4]);
    zonas.push([{ id: 'pueblo_alumbrado', nombre: 'Alumbrado y calles', accion: '', destino: {}, acciones: s2 => accionesLote(s2, 'alumbrado') }, 2.2, 24]);
    zonas.push([{ id: 'pueblo_carretera', nombre: 'Carretera y autobús', accion: '', destino: {}, acciones: s2 => accionesLote(s2, 'carretera') }, 1.8, RM + 5]);
    zonas.push([{ id: 'pueblo_salir', nombre: 'Salir del pueblo', accion: 'Volver al juego', destino: {}, acciones: () => [{ id: 'salir', t: 'Volver', d: 'Sales del pueblo.', disponible: true, fn: () => { setTimeout(() => GM.sede.cerrar(), 50); return { ok: true, texto: 'Hasta pronto' }; } }] }, -2, RM + 9]);
    S.zonas = zonas.map(([sala, x, z]) => M.zona(W, sala, x, z, club));
    // Casas: anillo junto a la muralla, más cuanto más nivel; fuera de la muralla desde «ciudad pequeña»
    const nCasas = 12 + nivel * 7;
    for (let i = 0; i < nCasas; i++) {
      const a = -Math.PI / 2 + (i + 0.5) / nCasas * Math.PI * 2; if (Math.abs(a - Math.PI / 2) < 0.22 || Math.abs(a - 3 * Math.PI / 2) < 0.05) continue;
      const rr = 29, x = Math.cos(a) * rr, z = Math.sin(a) * rr, g = new THREE.Group(), q = rnd(U.hash(pj.nombre + 'casa' + i)); g.position.set(x, 0, z); g.rotation.y = Math.atan2(-x, -z); W.add(g);
      const w = Math.min(5.5, 2 * Math.PI * rr / nCasas - 0.3); if (w < 3) continue;
      bloque(g, M, E, w, 5, 1 + ((q() * Math.min(3, nivel)) | 0), E.muros[(q() * E.muros.length) | 0], null, null, q);
      if (q() * 100 < pj.cariño) { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), mat(q() < 0.5 ? club.colores[0] : club.colores[1] || '#fff', { side: THREE.DoubleSide })); f.position.set(0, 3.8, 2.6); g.add(f); }   // banderas del club
      G.bloquea(x - 2.6, z - 2.6, x + 2.6, z + 2.6);
    }
    if (nivel >= 4) for (let i = 0; i < (nivel - 3) * 6; i++) { const s = i % 2 ? 1 : -1, z = RM + 6 + Math.floor(i / 2) * 6.5, g = new THREE.Group(), q = rnd(U.hash(pj.nombre + 'arrabal' + i)); g.position.set(s * 9, 0, z); g.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; W.add(g); bloque(g, M, E, 5.5, 5, 1 + (q() * 2 | 0), E.muros[(q() * E.muros.length) | 0], null, null, q); G.bloquea(s * 9 - 2.8, z - 2.8, s * 9 + 2.8, z + 2.8); }
    // Paseo de los vecinos: la plaza, el anillo y la calle de la puerta
    S.paseo = []; for (let i = 0; i < 24; i++) { const a = i / 24 * 6.28; S.paseo.push([Math.cos(a) * (RL - 5.5), Math.sin(a) * (RL - 5.5)]); } [[0, 6], [5, -5], [-6, -4], [0, 14], [0, 22], [0, 30]].forEach(p => S.paseo.push(p));
    S.spawnPueblo = { x: 0, z: RM - 3, ry: Math.PI };
    S.calleNombre = pj.nombre;
    GM.kit.fusionar(W);
    return W;
  }
  // Acciones de cada parcela: construir o mejorar (obra con su duración), ver el avance y usar el edificio
  function accionesLote(st, tipo) {
    const Pm = GM.mods.pueblo, b = Pm.edificios(st).find(e => e.tipo === tipo), out = [];
    if (b.obra) out.push({ id: 'avance', t: 'Obra en marcha: ' + Math.round(b.obra.progreso * 100) + ' %', d: b.obra.proximo + '. Inauguración el ' + U.fechaLarga(b.obra.fin) + '.', disponible: false, motivo: b.obra.proximo + '. Inauguración el ' + U.fechaLarga(b.obra.fin) + '.', fn: () => ({ ok: false }) });
    else if (b.proximo) out.push({ id: 'obra', t: (b.nivel ? 'Mejorar: ' : 'Construir: ') + b.proximo, d: b.coste + ' mil €, ' + b.dias + ' días de obra.', disponible: !b.motivo, motivo: b.motivo, fn: () => { const r = Pm.invertir(st, tipo); return r.ok ? { ok: true, texto: (b.nivel ? 'Empiezan las obras de mejora' : 'Empiezan las obras') + ': ' + b.dias + ' días' } : r; } });
    if (b.uso) out.push({ id: 'usar', t: b.uso, d: b.actual, disponible: true, fn: () => { const r = Pm.usar(st, tipo); return r.ok ? { ok: true, texto: r.texto + (r.efectos && r.efectos.length ? ': ' + r.efectos.join(', ') : '') } : r; } });
    if (!out.length) out.push({ id: 'info', t: b.actual || b.nombre, d: b.motivo || '', disponible: false, motivo: b.motivo || 'Nivel máximo', fn: () => ({ ok: false }) });
    return out;
  }
  function accionesPlaza(st) {
    const Pm = GM.mods.pueblo, conv = r => r.ok ? { ok: true, texto: (r.efectos || []).join(', ') || 'Hecho' } : r;
    return [{ id: 'visita', t: 'Visitar a la familia y a los vecinos', d: '0,8 mil €. Ánimo y cariño del pueblo.', disponible: true, fn: () => conv(Pm.visitar(st)) },
      { id: 'clinic', t: 'Clínic con los niños', d: '2 mil €. Cariño del pueblo.', disponible: true, fn: () => conv(Pm.clinic(st)) },
      { id: 'fiesta', t: 'Fiesta en tu honor', d: '15 mil €. Mucho cariño y algo de reputación.', disponible: true, fn: () => conv(Pm.fiesta(st)) }].concat(accionesLote(st, 'plaza'));
  }
  // Vecinos y obreros
  const MODELOS = ['h-casual_2', 'm-casual', 'h-farmer', 'm-formal', 'h-beach', 'm-adventurer', 'h-adventurer', 'm-punk'];
  const PIEL = ['#f1c7a5', '#e0ac85', '#c68863', '#9a6142'], PELO = ['#1d1510', '#3b2617', '#6a4425', '#a9793e', '#8a8a8a', '#bdbdbd'];
  async function poblar(S, M, st) {
    const Pm = GM.mods.pueblo, nivel = Pm.estado(st).nivel, club = st.equipos[st.clubId], pj = st.carrera.pueblo, r = rnd(U.hash(st.fecha + 'pueblo'));
    const n = 6 + nivel * 3;
    const vec = await Promise.all(Array.from({ length: n }, () => { const fan = r() * 100 < pj.cariño * 0.7; return M.personaje({ modelo: MODELOS[(r() * MODELOS.length) | 0], altura: 155 + r() * 30, piel: PIEL[(r() * PIEL.length) | 0], pelo: PELO[(r() * PELO.length) | 0], ropa: fan ? [club.colores[0], club.colores[1] || '#222'] : null }); }));
    vec.forEach((p, k) => { const q = S.paseo[(r() * S.paseo.length) | 0]; p.obj.position.set(q[0], 0, q[1]); Object.assign(p, { vecino: true, rol: 'Vecino de ' + pj.nombre, r: rnd(U.hash(st.fecha + 'v' + k)), espera: r() * 4 }); p.obj.userData = { npc: S.gente.length }; M.anim(p, 'idle'); S.mundo.add(p.obj); S.gente.push(p); });
    // Obreros en cada obra (dos o tres según el tamaño)
    const obras = Pm.edificios(st).filter(b => b.obra && S.lotes[b.tipo]);
    for (const b of obras) {
      const L = S.lotes[b.tipo], cuantos = b.coste > 100 ? 3 : 2;
      const ob = await Promise.all(Array.from({ length: cuantos }, (_, i) => M.personaje({ modelo: i % 2 ? 'm-worker' : 'h-worker', altura: 165 + r() * 20, piel: PIEL[(r() * PIEL.length) | 0], pelo: PELO[(r() * PELO.length) | 0] })));
      ob.forEach((p, i) => { const ang = L.a + Math.PI + (i - 1) * 0.35, x = L.x + Math.cos(L.a) * -4.2 + Math.cos(ang + Math.PI / 2) * (i - 1) * 2.2, z = L.z + Math.sin(L.a) * -4.2 + Math.sin(ang + Math.PI / 2) * (i - 1) * 2.2; p.obj.position.set(x, 0, z); p.obj.lookAt(L.x, 0, L.z); Object.assign(p, { obrero: true, fijo: true, rol: 'Obrero de la ' + b.nombre.toLowerCase(), r: rnd(U.hash(b.tipo + i)), espera: 3 + i }); p.obj.userData = { npc: S.gente.length }; M.anim(p, 'interact-right'); S.mundo.add(p.obj); S.gente.push(p); });
    }
  }
  function siguiente(S, M, n) {
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
  function actualizar(S, M, dt) { const t = performance.now() / 1000; (S.puebloAnim || []).forEach(f => f(t)); }
  GM.puebloMundo = { construir, poblar, siguiente, actualizar, LOTES };
})();
