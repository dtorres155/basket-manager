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
    ['casapadres', -14, 31, 9, 8], ['casaamigos', 36, -20, 8, 8],
    ['polideportivo'].concat(pFuera(Math.PI / 2 - 0.75, 18), [12, 10, true]), ['pabellon'].concat(pFuera(Math.PI / 2 + 0.75, 18), [12, 12, true]),
    ['hotel'].concat(pFuera(-0.05, 17), [9, 9, true])
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
    if (tipo === 'ciprés') { cil(W, 0.15, 1, '#5b4632', x, y, z, 5); const c = new THREE.Mesh(new THREE.ConeGeometry(0.9 + r() * 0.3, 6 + r() * 3, 8), mat('#2f4a2c')); c.position.set(x, y + 4.2, z); c.castShadow = true; W.add(c); return; }
    cil(W, 0.22, 1.6, '#6e5a44', x, y, z, 6); const c = new THREE.Mesh(new THREE.SphereGeometry(1.4 + r() * 0.6, 9, 7), mat(tipo === 'olivo' ? '#7d8f62' : '#4f7d3a')); c.scale.y = 0.75; c.position.set(x, y + 2.3, z); c.castShadow = true; W.add(c);
  }
  // Muchos árboles del campo en dos mallas instanciadas (tronco y copa): olivos en hileras y cipreses
  function bosque(W, lista, tipo) {
    if (!lista.length) return; const n = lista.length, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    const tronco = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.25, 1.6, 5), mat('#6e5a44'), n), copa = new THREE.InstancedMesh(tipo === 'ciprés' ? new THREE.ConeGeometry(1, 7, 7) : new THREE.SphereGeometry(1.5, 7, 5), mat(tipo === 'ciprés' ? '#2f4a2c' : '#7d8f62'), n);
    lista.forEach(([x, y, z, e], i) => { s.set(1, 1, 1); p.set(x, y + 0.8, z); m4.compose(p, q, s); tronco.setMatrixAt(i, m4); s.set(e, tipo === 'ciprés' ? e : e * 0.75, e); p.set(x, y + (tipo === 'ciprés' ? 4.2 : 2.2) * e, z); m4.compose(p, q, s); copa.setMatrixAt(i, m4); });
    tronco.userData = { instancias: true }; copa.userData = { instancias: true }; copa.castShadow = true; W.add(tronco, copa);
  }
  // Casa con personalidad: alturas, colores, balcones, macetas, chimeneas, esquinas de piedra y, en las calles principales, tiendas
  function casa(W, M, E, x, z, ry, w, d, pisos, r, club, comercio, y0) {
    const g = new THREE.Group(); g.position.set(x, y0 || 0, z); g.rotation.y = ry; W.add(g);
    const muroC = E.muros[(r() * E.muros.length) | 0], h = bloque(g, M, E, w, d, pisos, muroC, null, comercio ? [club.colores[0], '#7a2f22', '#2f6f9e', '#3c6e47', '#c0392b'][(r() * 5) | 0] : null, r);
    if (E.piedraFrac && r() < E.piedraFrac) [-1, 1].forEach(s => caja(g, 0.5, h, 0.5, '#a39380', s * (w / 2 - 0.2), 0, d / 2 - 0.2));
    for (let p = 1; p < pisos; p++) if (r() < 0.6) for (let i = 0; i < 3; i++) caja(g, 0.25, 0.2, 0.2, ['#c0392b', '#e84393', '#f39c12'][(r() * 3) | 0], -w / 4 + i * w / 4, p * 3.1 + 0.55, d / 2 + 0.45);
    if (r() < 0.7) caja(g, 0.5, 1.2, 0.5, muroC, w / 2 - 1, h + 0.6, -d / 4);
    if (r() * 100 < (club.cariñoPueblo || 40) * 0.6) { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), mat(r() < 0.5 ? club.colores[0] : club.colores[1] || '#fff', { side: THREE.DoubleSide })); f.position.set(-w / 4, Math.min(h - 0.8, 4.2), d / 2 + 0.35); g.add(f); }
    return g;
  }
  function muralla(W, G, O, E, nivel, club) {
    const piedra = mat(E.clave === 'toscano' ? '#b4724a' : E.clave === 'andaluz' ? '#ece6da' : '#a99377'), N = 84, alto = 5.5 + Math.min(2, nivel * 0.4);
    const puerta = am => Math.abs(am - Math.PI / 2) < 0.07 || Math.abs(am - 3 * Math.PI / 2) < 0.08;
    for (let i = 0; i < N; i++) {
      const a = i / N * Math.PI * 2, b = (i + 1) / N * Math.PI * 2, am = (a + b) / 2, pa = muro(a), pb = muro(b); if (puerta(am)) continue;
      const x = (pa[0] + pb[0]) / 2, z = (pa[1] + pb[1]) / 2, l = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) + 0.2, ang = Math.atan2(pb[1] - pa[1], pb[0] - pa[0]);
      caja(W, l, alto, 1.4, piedra, x, 0, z, -ang); [-0.3, 0.3].forEach(k => { const al = caja(W, 0.7, 0.7, 1.4, piedra, x, alto, z, -ang); al.translateX(k * l); });
      O.marca({ x, z, w: l, d: 2.4, ry: -ang }, 4); for (let t = 0; t <= 1.001; t += 0.125) { const bx = pa[0] + (pb[0] - pa[0]) * t, bz = pa[1] + (pb[1] - pa[1]) * t; G.bloquea(bx - 0.9, bz - 0.9, bx + 0.9, bz + 0.9); }
      if (i % 9 === 4) {
        cil(W, 2.3, alto + 2.6, piedra, x, 0, z, 12); if (E.torre !== 'almenada') { const c = new THREE.Mesh(new THREE.ConeGeometry(2.7, 2.6, 12), mat(E.teja)); c.position.set(x, alto + 3.9, z); W.add(c); }
        if (nivel >= 3) { const st = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 3), mat(club.colores[0], { side: THREE.DoubleSide })); const l2 = Math.hypot(x, z); st.position.set(x * (l2 + 2.35) / l2, alto - 0.5, z * (l2 + 2.35) / l2); st.lookAt(x * 2, alto - 0.5, z * 2); W.add(st); }   // estandartes del club
        O.marca({ x, z, w: 5.5, d: 5.5 }, 4); G.bloquea(x - 2.3, z - 2.3, x + 2.3, z + 2.3);
      }
    }
    [PS, PN].forEach(([px, pz]) => { [-3.6, 3.6].forEach(dx => { cil(W, 2.1, alto + 3.2, piedra, px + dx, 0, pz, 12); O.marca({ x: px + dx, z: pz, w: 4.6, d: 4.6 }, 4); G.bloquea(px + dx - 2.1, pz - 2.1, px + dx + 2.1, pz + 2.1); }); caja(W, 5.2, 1.6, 1.6, piedra, px, alto - 0.3, pz); });
  }
  // El entorno: ladera, campos, río con puente, carretera que baja, olivares, cipreses, masías, ermita y montañas
  function entorno(W, M, E, r, carr) {
    const T = 420, N = 140, g = new THREE.PlaneGeometry(T, T, N, N).rotateX(-Math.PI / 2), pos = g.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
    const verde = new THREE.Color('#7f9a52'), seco = new THREE.Color('#c2ae6a'), oscuro = new THREE.Color('#5e7a3e'), tierra = new THREE.Color(E.tierra || '#a88f62'), agua = new THREE.Color('#6f9a6a');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = altura(x, z), d = dMes(x, z); pos.setY(i, d < 1 ? -0.04 : y);
      const campo = ruido(x * 0.035 + 3, z * 0.035) , franja = Math.floor((x * 0.7 + z * 0.4) / 9) % 3;
      if (d < 1) c.copy(tierra).lerp(verde, 0.35); else if (y < -22) c.copy(agua); else c.copy(campo > 0.62 ? seco : campo > 0.42 ? verde : oscuro).lerp(franja === 0 ? seco : verde, 0.18);
      if (y > 18) c.lerp(new THREE.Color('#8c8a86'), U.clamp((y - 18) / 30, 0, 0.8));   // roca en las cumbres
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
    const suelo = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })); suelo.receiveShadow = true; suelo.userData = { terreno: true }; W.add(suelo);
    // Río en el fondo del valle (al sur) y puente de piedra donde cruza la carretera
    const rioZ = x => MES.cz + MES.rz * 1.62 + Math.sin(x * 0.02) * 10, rio = [];
    for (let x = -210; x <= 210; x += 12) rio.push([x, rioZ(x)]);
    cinta(W, rio, 9, mat('#4f8fb5', { roughness: 0.3 }), () => -24.4);
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
    // Masías dispersas por las laderas y una ermita en el cerro de enfrente
    for (let k = 0; k < 9; k++) { const a = r() * 6.28, d = 1.35 + r() * 0.9, x = MES.cx + Math.cos(a) * MES.rx * d, z = MES.cz + Math.sin(a) * MES.rz * d, y = altura(x, z); if (y < -21) continue; const gm = new THREE.Group(); gm.position.set(x, y - 0.3, z); gm.rotation.y = r() * 6; W.add(gm); bloque(gm, M, E, 8, 6, 2, E.muros[(r() * E.muros.length) | 0], null, null, r); caja(gm, 5, 2.5, 4, E.muros[0], 6, 0, 1); }
    { const a = -0.9, d = 2.15, x = MES.cx + Math.cos(a) * MES.rx * d, z = MES.cz + Math.sin(a) * MES.rz * d, y = altura(x, z), ge = new THREE.Group(); ge.position.set(x, y - 0.2, z); ge.rotation.y = 2.4; W.add(ge);
      caja(ge, 6, 6, 9, '#ece4d4', 0, 0, 0); tejado(ge, 6, 9, 2.5, E.teja, 6); caja(ge, 2, 9, 2, '#ece4d4', 0, 0, -4); const cr = caja(ge, 0.2, 1.4, 0.2, '#555', 0, 9, -4); void cr; for (let i = 0; i < 4; i++) arbol(ge, -4 + i * 2.6, 6.5, 'ciprés', r); }
  }
  function construir(S, M, st) {
    const W = S.mundo, club = st.equipos[st.clubId], Pm = GM.mods.pueblo, est = Pm.estado(st), nivel = est.nivel, pj = st.carrera.pueblo, eds = Pm.edificios(st), ed = t => eds.find(b => b.tipo === t);
    const clave = GM.pueblo3d ? GM.pueblo3d.estiloDe(pj.nombre, pj.nac) : 'castellano', E = Object.assign({ clave }, GM.pueblo3d ? GM.pueblo3d.ESTILOS[clave] : { muros: ['#d6b47c'], teja: '#b4643d', postigos: ['#5a3b22'], torre: 'campanario' });
    const G = M.rejilla({ limites: LIM, CELDA: 0.5 }), O = ocupacion(); S.G = G; S.ocupacion = O; S.puebloAnim = []; S.oclusores = []; S.conflictos = []; S.lotes = {};
    const r = rnd(U.hash(pj.nombre + 'mundo')), club2 = Object.assign({}, club, { cariñoPueblo: pj.cariño }), hechos = eds.filter(b => b.nivel).length;
    S.scene.background = new THREE.Color(0xa9c6dc); S.scene.fog = new THREE.Fog(0xb8cfdf, 120, 360); S.camera.far = 650; S.camera.updateProjectionMatrix();
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
    const mBordillo = mat(E.clave === 'andaluz' ? '#cfc6b4' : '#8f8170');
    const uvEsc = (g, e) => { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / e, uv.getY(i) / e); return g; };
    const carr = ed('carretera').nivel;
    entorno(W, M, E, r, carr);
    { const s = new THREE.Shape(); for (let i = 0; i <= 96; i++) { const [px, pz] = muro(i / 96 * Math.PI * 2); if (i) s.lineTo(px, -pz); else s.moveTo(px, -pz); } const g = uvEsc(new THREE.ShapeGeometry(s), 7).rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, mTierra); m.position.y = -0.01; m.receiveShadow = true; W.add(m); }
    CALLES.forEach(c => { cinta(W, c.p, c.w, c.n === 'Carretera' && carr ? mat('#4b5058') : c.fuera ? mat('#b49d72') : mCalle);
      if (!c.fuera) bordillos(W, c.p, c.w, mBordillo, enPlaza); for (let i = 0; i < c.p.length - 1; i++) { const [ax, az] = c.p[i], [bx, bz] = c.p[i + 1], l = Math.hypot(bx - ax, bz - az); O.marca({ x: (ax + bx) / 2, z: (az + bz) / 2, w: l + c.w, d: c.w + 1, ry: -Math.atan2(bz - az, bx - ax) }, 1); } });
    { const s = new THREE.Shape(); PLAZA.forEach(([px, pz], i) => i ? s.lineTo(px, -pz) : s.moveTo(px, -pz)); const g = uvEsc(new THREE.ShapeGeometry(s), 4).rotateX(-Math.PI / 2); const pl = new THREE.Mesh(g, ed('plaza').nivel ? mLosas : mCalle); pl.position.y = 0.014; pl.receiveShadow = true; W.add(pl);
      for (let z = -11; z <= 11; z++) for (let x = -14; x <= 13; x++) if (enPlaza(x + 0.5, z + 0.5)) O.punto(x + 0.5, z + 0.5, 1); }
    if (carr >= 2) { const bx = PS[0] + 7, bz = PS[1] + 18; caja(W, 3, 0.15, 1.4, '#2f6f9e', bx, 2.6, bz); [-1.3, 1.3].forEach(dx => cil(W, 0.06, 2.6, '#666', bx + dx, 0, bz - 0.5, 5)); caja(W, 2.6, 0.45, 0.6, '#7a5230', bx, 0, bz + 0.4); caja(W, 2.6, 3, 11, '#e67e22', PS[0] - 5.5, 0, PS[1] + 20); O.marca({ x: bx, z: bz, w: 4, d: 3 }, 2); }
    muralla(W, G, O, E, nivel, club);
    // Iglesia (preside la plaza desde el norte) y ayuntamiento con soportales (este)
    const IG = { x: -6.5, z: -16, w: 10, d: 13, ry: 0 };
    { const g = new THREE.Group(); g.position.set(IG.x, 0, IG.z); W.add(g); const m = E.clave === 'andaluz' ? '#f4f1ea' : '#bfa985'; caja(g, 10, 9.5, 13, m, 0, 0, 0); tejado(g, 10, 13, 3.8, E.teja, 9.5);
      caja(g, 3.4, 18, 3.4, m, 3.4, 0, 4.8); const pin = new THREE.Mesh(new THREE.ConeGeometry(2.5, 3.8, 4), mat(E.teja)); pin.rotation.y = Math.PI / 4; pin.position.set(3.4, 19.9, 4.8); g.add(pin);
      for (let i = 0; i < 2; i++) { const cam = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.12, 6, 12, Math.PI), mat('#2a2a2a')); cam.position.set(3.4, 15 + i * 0.01, 6.52); g.add(cam); }
      caja(g, 2, 3.4, 0.12, '#4a3020', -1, 0, 6.55); const rosa = new THREE.Mesh(new THREE.CircleGeometry(1, 18), mat('#2f5f8f')); rosa.position.set(-1, 6.4, 6.57); g.add(rosa);
      O.marca(IG, 2); G.bloquea(IG.x - 5, IG.z - 6.5, IG.x + 5.2, IG.z + 6.6); }
    const AY = { x: 17, z: 6, w: 10, d: 8, ry: -Math.PI / 2 };
    { const g = new THREE.Group(); g.position.set(AY.x, 0, AY.z); g.rotation.y = AY.ry; W.add(g); bloque(g, M, E, 10, 8, 2, E.muros[1 % E.muros.length], 'Ayuntamiento', '#7a2f22', r);
      for (let i = 0; i < 6; i++) cil(g, 0.3, 3, '#e8dcc4', -4.2 + i * 1.68, 0, 5, 10); caja(g, 10.6, 0.4, 2.2, '#d8cbb0', 0, 3, 5);
      cil(g, 0.05, 4, '#ddd', 4.2, 6.2, 4.2, 5); caja(g, 1.4, 0.9, 0.04, club.colores[0], 4.9, 9.1, 4.2); O.marca({ x: AY.x - 1, z: AY.z, w: 10, d: 11, ry: AY.ry }, 2); G.bloquea(AY.x - 4, AY.z - 5, AY.x + 4, AY.z + 5); }
    // Plaza: fuente, bancos, estatua y, con la reforma, farolas; puestos de mercado desde «villa»
    const nPl = ed('plaza').nivel, FX = 1, FZ = 0;
    cil(W, nPl ? 2.2 : 1.4, 0.6, '#d9d2c3', FX, 0, FZ, 20); const agua = new THREE.Mesh(new THREE.CircleGeometry(nPl ? 1.9 : 1.2, 20).rotateX(-Math.PI / 2), mat('#5aa9d6')); agua.position.set(FX, 0.62, FZ); W.add(agua); cil(W, 0.25, 1.8, '#d9d2c3', FX, 0, FZ, 10); G.bloquea(FX - 2.3, FZ - 2.3, FX + 2.3, FZ + 2.3);
    [[-7, -4, 0.3], [6, -6.5, -0.2], [-9, 4, 1.4], [8, 5, -1.2]].concat(nPl ? [[-3, 6.5, 0], [4, -2.8, 0.1]] : []).forEach(([x, z, a]) => { caja(W, 1.7, 0.45, 0.55, '#7a5230', x, 0, z, a); G.bloquea(x - 0.8, z - 0.4, x + 0.8, z + 0.4); });
    if (nPl) [[-10, -3], [9, -6], [-6, 7], [9, 3]].forEach(([x, z]) => { cil(W, 0.6, 0.6, '#b9a98c', x, 0, z, 10); arbol(W, x, z, 'frutal', r); G.bloquea(x - 0.6, z - 0.6, x + 0.6, z + 0.6); });   // árboles en alcorques
    if (nPl >= 2) PLAZA.forEach(([x, z]) => { const lx = x * 0.9, lz = z * 0.9; cil(W, 0.12, 3.4, '#3d3d3d', lx, 0, lz, 6); const l = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffd27a', emissiveIntensity: 0.8 })); l.position.set(lx, 3.5, lz); W.add(l); });
    if (nivel >= 3) [[5, 6.5, '#c0392b'], [8.5, 3.5, '#2f6f9e'], [-4.5, 6.8, '#f39c12']].forEach(([x, z, c]) => { caja(W, 2, 0.9, 1.2, '#8a6d3b', x, 0, z); const tl = caja(W, 2.3, 0.08, 1.5, c, x, 1.9, z); tl.rotation.x = 0.15; [-0.9, 0.9].forEach(dx => cil(W, 0.04, 1.9, '#555', x + dx, 0, z + 0.6, 4)); G.bloquea(x - 1.1, z - 0.7, x + 1.1, z + 0.7); });
    const nMu = ed('mural').nivel;
    if (nMu) { const t = M.textura('mural-pueblo-' + st.jugadores.yo.nombre, 256, (x, n) => { x.fillStyle = club.colores[0]; x.fillRect(0, 0, n, n); x.fillStyle = club.colores[1] || '#fff'; x.font = 'bold 40px sans-serif'; x.textAlign = 'center'; x.fillText(st.jugadores.yo.nombre.split(' ').pop().toUpperCase(), n / 2, n / 2); x.font = 'bold 80px sans-serif'; x.fillText(String(st.jugadores.yo.dorsal || 7), n / 2, n / 2 + 80); });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), t ? new THREE.MeshStandardMaterial({ map: t }) : mat(club.colores[0])); m.position.set(IG.x - 2.9, 4.6, IG.z + 6.57); W.add(m);
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
      else if (b.nivel) construido(g, M, E, tipo, b.nivel, club, rr);
      else {
        [[0, -d / 2 + 0.2, w, 0.4], [-w / 2 + 0.2, 0, 0.4, d], [w / 2 - 0.2, 0, 0.4, d]].forEach(q => caja(g, q[2], 0.7, q[3], '#a99377', q[0], 0, q[1]));
        for (let i = 0; i < 3; i++) arbol(g, -w / 3 + i * w / 3, -d / 6 + (i % 2) * 0.8, 'olivo', rr);
        const s = rotulo(M, 'Solar: ' + b.nombre, '#5d6d7e'); s.position.set(0, 1.4, d / 2 - 0.6); s.scale.setScalar(0.8); g.add(s); cil(g, 0.05, 1.4, '#555', 0, 0, d / 2 - 0.6, 5);
      }
      if (b.nivel || b.obra) G.bloquea(x - Math.min(w, d) / 2 + 0.3, z - Math.min(w, d) / 2 + 0.3, x + Math.min(w, d) / 2 - 0.3, z + Math.min(w, d) / 2 - 0.3);
      const zx = x + fx * (d / 2 + 0.9), zz = z + fz * (d / 2 + 0.9);
      // El bar y las casas de los tuyos, una vez construidos, tienen interior (interiores.js) y se vuelve a su puerta
      const INT = { bar: 'bar_pueblo', casapadres: 'casa_padres', casaamigos: 'casa_amigos' }[tipo], dentro = INT && b.nivel > 0 && GM.interiores;
      zonas.push([Object.assign({ id: 'pueblo_' + tipo, nombre: b.nombre, accion: '', destino: {}, acciones: s2 => accionesLote(s2, tipo) }, dentro ? { irA: 'interior:' + INT, boton: tipo === 'bar' ? 'Entrar en el bar' : 'Entrar en casa' } : {}), zx, zz]);
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
    aLoLargo(nAl ? 9 : 16, (x, z, tx, tz, c) => { const s = (kF++ % 2 ? 1 : -1), lx = x - tz * (c.w / 2 + 0.4) * s, lz = z + tx * (c.w / 2 + 0.4) * s; if (O.punto(lx, lz) > 1 || enPlaza(lx, lz)) return; cil(W, 0.08, 3.2, nAl ? '#2c3e50' : '#6b5a48', lx, 0, lz, 6); const l = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: nAl ? '#ffd27a' : '#000', emissiveIntensity: 0.7 })); l.position.set(lx, 3.3, lz); W.add(l); O.punto(lx, lz, 5); });
    // Huertos y árboles en lo que queda libre (nunca en la plaza ni pegados a una calle)
    for (let k = 0; k < 160; k++) { const x = (r() * 2 - 1) * MES.rx * 0.95, z = MES.cz + (r() * 2 - 1) * MES.rz * 0.95; if (dMes(x, z) > 0.92 || enPlaza(x, z) || !O.libre({ x, z, w: 4, d: 4 }) || calleCercana(x, z).d < 4) continue; arbol(W, x, z, r() < 0.35 ? 'ciprés' : r() < 0.6 ? 'olivo' : 'frutal', r); O.marca({ x, z, w: 3, d: 3 }, 5); G.bloquea(x - 0.5, z - 0.5, x + 0.5, z + 0.5); }
    S.paseo = []; aLoLargo(6, (x, z) => S.paseo.push([x, z])); PLAZA.forEach(([x, z]) => S.paseo.push([x * 0.6, z * 0.6]));
    S.spawnPueblo = { x: PS[0], z: PS[1] - 4, ry: Math.PI };
    S.calleNombre = pj.nombre; S.nCasas = nCasas; S.nCasasFuera = nFuera;
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
      ob.forEach((p, i) => { const sx = -L.fz, sz = L.fx, x = L.x + L.fx * (L.d / 2 + 1.4) + sx * (i - 1) * 2.2, z = L.z + L.fz * (L.d / 2 + 1.4) + sz * (i - 1) * 2.2; p.obj.position.set(x, 0, z); p.obj.lookAt(L.x, 0, L.z); Object.assign(p, { obrero: true, fijo: true, rol: 'Obrero de la ' + b.nombre.toLowerCase(), r: rnd(U.hash(b.tipo + i)), espera: 3 + i }); p.obj.userData = { npc: S.gente.length }; M.anim(p, 'interact-right'); S.mundo.add(p.obj); S.gente.push(p); });
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
  GM.puebloMundo = { construir, poblar, siguiente, actualizar, accionesLote, LOTES };
})();
