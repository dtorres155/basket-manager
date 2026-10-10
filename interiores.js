/* INTERIORES (GM.interiores) — se entra por la puerta desde la calle (escena 'interior:<tipo>' del motor de sede3d.js)
   - pabellon: la pista con sus líneas y el escudo, gradas a los lados (llenas de gente instanciada el día de partido en casa;
     unos pocos aficionados otros días), banquillos, marcador colgado y la zona de taquillas.
   - tienda: la tienda oficial con camisetas del club en las paredes, maniquíes, mostrador y clientes.
   - pena: el bar de la peña: barra con taburetes (muebles de Kenney), botellero, tele con el escudo, bufandas, mesas y peñistas.
   - ayuntamiento: el vestíbulo con columnas, alfombra, banderas, mostrador de atención y escalera.
   Cada interior tiene la zona de siempre (mismo id que en la calle: sus acciones de sede_acciones.js), la zona con las actividades del
   mapa de Ciudad (ciudad3d.acciones/hacer) y la salida a la calle (vuelves a su puerta). Muros en corte, como en la casa.
   Expone: construir(S, M, st, tipo), poblar(S, M, st, tipo), siguiente(S, M, n), TIPOS. */
(function () {
  const U = GM.util;
  const MATS = {}; const mat = (c, o) => { const k = c + JSON.stringify(o || {}); return MATS[k] || (MATS[k] = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.8 }, o || {}))); };
  function caja(W, w, h, d, m, x, y, z, ry) { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof m === 'string' ? mat(m) : m); me.position.set(x, y + h / 2, z); if (ry) me.rotation.y = ry; me.castShadow = me.receiveShadow = true; W.add(me); return me; }
  function cil(W, r, h, m, x, y, z, seg) { const me = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg || 12), typeof m === 'string' ? mat(m) : m); me.position.set(x, y + h / 2, z); me.castShadow = true; W.add(me); return me; }
  const TIPOS = { pabellon: { w: 40, d: 30 }, tienda: { w: 16, d: 11 }, pena: { w: 16, d: 11 }, ayuntamiento: { w: 20, d: 14 }, bar_pueblo: { w: 14, d: 10, pueblo: 'bar' }, casa_padres: { w: 13, d: 10, pueblo: 'casapadres' }, casa_amigos: { w: 12, d: 10, pueblo: 'casaamigos' }, casa_pueblo: { w: 14, d: 10, pueblo: 'micasa' }, restaurante: { w: 16, d: 11 }, gimnasio_barrio: { w: 18, d: 12 }, barberia: { w: 10, d: 8 } };
  if (GM.interioresPueblo) Object.assign(TIPOS, GM.interioresPueblo.TIPOS);   // escuela, biblioteca, cine, hotel… (interiores_pueblo.js)
  const pueblo = st => (st.carrera && st.carrera.pueblo) || { nombre: 'tu pueblo' };
  const NOMBRE = { pabellon: c => c.pabellon.nombre, tienda: c => 'Tienda oficial del ' + c.siglas, pena: () => 'Bar La Peña', ayuntamiento: c => 'Ayuntamiento de ' + c.ciudad, bar_pueblo: (c, st) => 'Bar de la peña de ' + pueblo(st).nombre, casa_padres: () => 'Casa de tus padres', casa_pueblo: (c, st) => 'Tu casa en ' + pueblo(st).nombre, restaurante: c => 'Restaurante El Tapón', gimnasio_barrio: () => 'Gimnasio del barrio', barberia: () => 'Barbería Paco', casa_amigos: () => 'Casa de tus amigos' };
  Object.assign(NOMBRE, { escuela: (c, st) => 'Escuela de baloncesto de ' + pueblo(st).nombre, biblioteca: (c, st) => 'Biblioteca de ' + pueblo(st).nombre, tienda_pueblo: (c, st) => 'Tienda de deportes de ' + pueblo(st).nombre, ambulatorio: (c, st) => 'Centro de salud de ' + pueblo(st).nombre, polideportivo: (c, st) => 'Polideportivo de ' + pueblo(st).nombre, hotel: (c, st) => 'Hotel de ' + pueblo(st).nombre, cine: (c, st) => 'Cine de ' + pueblo(st).nombre, centrodia: (c, st) => 'Centro de día de ' + pueblo(st).nombre, panaderia: (c, st) => 'Panadería de ' + pueblo(st).nombre, taller: (c, st) => 'Taller de ' + pueblo(st).nombre, restaurante_pueblo: (c, st) => 'Restaurante de ' + pueblo(st).nombre, industrial: (c, st) => 'Polígono industrial de ' + pueblo(st).nombre, pabellon_pueblo: (c, st) => 'Pabellón ' + st.jugadores.yo.nombre.split(' ').pop() });
  const LUGAR = { pabellon: 'pabellon', pena: 'pena', ayuntamiento: 'ayuntamiento', tienda: 'comercio' };
  function construir(S, M, st, tipo) {
    tipo = TIPOS[tipo] ? tipo : 'pena'; const W = S.mundo, club = st.equipos[st.clubId], c1 = club.colores[0] === '#000000' ? '#222222' : club.colores[0], c2 = club.colores[1] || '#ffffff';
    const { w, d } = TIPOS[tipo], x0 = -w / 2, x1 = w / 2, z0 = -d / 2, z1 = d / 2;
    const IPm = GM.interioresPueblo, an = IPm ? IPm.anexos(tipo, st, w, d) : [], hu = IPm ? IPm.huecos(an) : { n: [], o: [], e: [] };   // estancias anexas y sus huecos de puerta
    S.anexoNpcs = [];
    S.interiorTipo = tipo; S.interiorNombre = NOMBRE[tipo](club, st);
    S.scene.background = new THREE.Color(0x1d232a); S.scene.fog = null;
    const G = M.rejilla({ limites: [Math.min(x0, ...an.map(a => a.r.x0)) - 2, Math.min(z0, ...an.map(a => a.r.z0)) - 2, Math.max(x1, ...an.map(a => a.r.x1)) + 2, z1 + 5], CELDA: 0.5 }); S.G = G;
    // Suelo y muros en corte con la puerta al sur
    const suelo = { pabellon: '#3a3f46', tienda: '#d9d4cb', pena: '#7a5638', ayuntamiento: '#d8cdb8', bar_pueblo: '#8a6a4a', casa_padres: '#b98e63', casa_amigos: '#9a8f7a', casa_pueblo: '#a5794f', restaurante: '#8a5f3c', gimnasio_barrio: '#2f3439', barberia: '#e8e2d4' }[tipo] || (IPm && IPm.SUELO[tipo]) || '#b98e63';
    const mSuelo = new THREE.MeshStandardMaterial({ color: suelo, roughness: tipo === 'ayuntamiento' ? 0.35 : 0.8 }), TR = GM.texturas;
    if (TR) { if (['pena', 'bar_pueblo', 'casa_padres', 'casa_amigos', 'casa_pueblo'].indexOf(tipo) >= 0) TR.aplicar(mSuelo, 'WoodFloor051', { escala: 2.2, tinte: new THREE.Color(suelo).lerp(new THREE.Color(0xffffff), 0.45).getHex() }); else if (tipo === 'ayuntamiento') TR.aplicar(mSuelo, 'Tiles074', { escala: 1.6, rugosidad: 0.3 }); else TR.aplicar(mSuelo, 'Concrete034', { color: false, escala: 3, relieve: 0.6 }); }
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), mSuelo); fl.receiveShadow = true; W.add(fl);
    const alto = tipo === 'pabellon' ? 3.2 : 1.8, muroC = { pabellon: '#5d6873', tienda: '#f2efe8', pena: '#c9a27a', ayuntamiento: '#efe6d2', bar_pueblo: '#e8dcc4', casa_padres: '#efe3cf', casa_amigos: '#c9d3dc', casa_pueblo: '#e6d8bf', restaurante: '#efe3cf', gimnasio_barrio: '#c9d0d6', barberia: '#f4f1ea' }[tipo] || (IPm && IPm.MURO[tipo]) || '#efe6d2';
    if (TR) TR.aplicar(mat(muroC), 'Plaster003', { color: false, escala: 1.6, relieve: 0.8 });
    const muro = (xa, za, xb, zb) => { const L = Math.hypot(xb - xa, zb - za), m = caja(W, xa === xb ? 0.25 : L, alto, xa === xb ? L : 0.25, muroC, (xa + xb) / 2, 0, (za + zb) / 2); void m; G.bloquea(Math.min(xa, xb) - 0.2, Math.min(za, zb) - 0.2, Math.max(xa, xb) + 0.2, Math.max(za, zb) + 0.2); };
    const tramos = (a, b, gaps) => { let seg = [[a, b]]; gaps.forEach(([g0, g1]) => { seg = [].concat(...seg.map(([p, q]) => (g1 <= p || g0 >= q ? [[p, q]] : [[p, Math.min(g0, q)], [Math.max(g1, p), q]].filter(s => s[1] - s[0] > 0.05)))); }); return seg; };
    tramos(x0, x1, hu.n).forEach(([p, q]) => muro(p, z0, q, z0)); tramos(z0, z1, hu.o).forEach(([p, q]) => muro(x0, p, x0, q)); tramos(z0, z1, hu.e).forEach(([p, q]) => muro(x1, p, x1, q)); muro(x0, z1, -1.2, z1); muro(1.2, z1, x1, z1);
    const enPueblo = !!TIPOS[tipo].pueblo, salida = enPueblo ? { id: 'salir_interior', nombre: 'Salir al pueblo', accion: 'Volver al pueblo', destino: {}, irA: 'pueblo', boton: 'Salir al pueblo' } : { id: 'salir_interior', nombre: 'Salir a la calle', accion: 'Volver a la calle', destino: {}, irA: 'calle', boton: 'Salir a la calle' };
    const zonas = [[salida, 0, z1 + 1.4]];
    // Actividades del mapa de Ciudad (las mismas que en el menú)
    const C3 = GM.mods.ciudad3d, lid = C3 && C3.lugares ? (C3.lugares(st).find(l => l.tipo === LUGAR[tipo]) || {}).id : null;
    const salaLugar = { id: 'lugar_' + tipo, nombre: tipo === 'tienda' ? 'Comercios del barrio' : 'Actividades', accion: '', destino: {}, acciones: s2 => { const L = lid ? C3.acciones(s2, lid) : []; return L.length ? L.map(a => ({ id: a.id, t: a.t, d: a.coste ? (a.jugador ? a.coste + ' mil €' : U.eur(a.coste)) : 'Gratis', disponible: a.disponible, motivo: a.motivo || 'No disponible', fn: () => { const r = C3.hacer(s2, lid, a.id); return r.ok ? { ok: true, texto: a.t } : r; } })) : [{ id: 'nada', t: 'Nada que hacer ahora', d: '', disponible: false, motivo: 'Sin actividades', fn: () => ({ ok: false }) }]; } };
    const sala = enPueblo ? { id: 'pueblo_' + TIPOS[tipo].pueblo, nombre: S.interiorNombre, accion: '', destino: { todos: 'ciudad' }, acciones: s2 => GM.puebloMundo.accionesLote(s2, TIPOS[tipo].pueblo).concat(tipo === 'casa_pueblo' && GM.mods.vida ? GM.mods.vida.accionesCasaPueblo(s2) : []), ficha: s2 => { const f = GM.puebloMundo.fichaLote(s2, TIPOS[tipo].pueblo); if (f && tipo === 'casa_pueblo' && GM.mods.vida) f.acciones = f.acciones.concat(GM.mods.vida.accionesCasaPueblo(s2).map(a => Object.assign({ ico: 'casa' }, a))); return f; } } : { id: tipo, nombre: S.interiorNombre, accion: '', destino: tipo === 'pabellon' ? { todos: 'club' } : tipo === 'ayuntamiento' ? { todos: 'ciudad' } : {} };
    const LOCAL = { restaurante: localRestaurante, gimnasio_barrio: localGimnasio, barberia: localBarberia }[tipo];
    if (LOCAL) { sala.acciones = s2 => LOCAL(s2); sala.destino = {}; }
    const luz = (x, z, i) => { const l = new THREE.PointLight(tipo === 'pena' ? 0xffd29a : 0xfff4e6, i, Math.max(w, d), 1.5); l.position.set(x, 4, z); W.add(l); };
    S.puntosInt = [];
    if (tipo === 'pabellon') {
      const tP0 = GM.sede.pistaTex && GM.sede.pistaTex(club), tP = tP0 ? tP0.clone() : null; if (tP) tP.needsUpdate = true; const pista = new THREE.Mesh(new THREE.PlaneGeometry(28, 15).rotateX(-Math.PI / 2), tP ? new THREE.MeshStandardMaterial({ map: tP, roughness: 0.45 }) : mat('#c98d4f')); if (tP) { tP.repeat.set(1, 1); tP.offset.set(0, 0); } pista.position.set(0, 0.01, -1.5); pista.receiveShadow = true; W.add(pista);
      for (const s of [-1, 1]) { const x = s * 13.4; cil(W, 0.12, 3.05, '#333a40', x + s * 0.8, 0, -1.5); caja(W, 0.06, 1.05, 1.8, '#f4f4f4', x, 2.7, -1.5); const aro = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.025, 8, 18), mat('#e8590c')); aro.rotation.x = Math.PI / 2; aro.position.set(x - s * 0.35, 3.05, -1.5); W.add(aro); G.bloquea(x + s * 0.6, -2, x + s * 1.1, -1); }
      // gradas a los dos lados largos y en el fondo
      S.gradas = [];
      for (let k = 0; k < 5; k++) { caja(W, 30, 0.45 * (k + 1), 0.9, k % 2 ? c1 : '#3a4450', 0, 0, -9.9 - k * 0.9); if (7.2 + k * 0.9 <= 12) for (const s of [-1, 1]) caja(W, 12, 0.45 * (k + 1), 0.9, k % 2 ? c1 : '#3a4450', s * 9, 0, 7.2 + k * 0.9); }
      G.bloquea(-15, -15, 15, -9.4); G.bloquea(-15, 6.8, -3, 15); G.bloquea(3, 6.8, 15, 15);
      for (let k = 0; k < 5; k++) for (let i = 0; i < 46; i++) { S.gradas.push({ x: -14.3 + i * 0.62, y: 0.45 * (k + 1), z: -9.9 - k * 0.9, ry: 0 }); if (Math.abs(-14.3 + i * 0.62) > 3.2 && 7.2 + k * 0.9 <= 12) S.gradas.push({ x: -14.3 + i * 0.62, y: 0.45 * (k + 1), z: 7.2 + k * 0.9, ry: Math.PI }); }
      // banquillos y marcador colgado
      for (const s of [-1, 1]) { caja(W, 5, 0.45, 0.6, c1, s * 5, 0, 6.2); G.bloquea(s * 5 - 2.5, 5.9, s * 5 + 2.5, 6.5); }
      const marc = new THREE.Group(); caja(marc, 4, 2, 4, '#1d2024', 0, 0, 0); marc.position.set(0, 7, -1.5); W.add(marc);
      const tex = M.textura('escudo-int-' + club.siglas, 256, (x, n) => { x.fillStyle = c1; x.fillRect(0, 0, n, n); x.fillStyle = c2; x.font = 'bold 90px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(club.siglas, n / 2, n / 2); });
      for (let k = 0; k < 4; k++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.8), tex ? new THREE.MeshBasicMaterial({ map: tex }) : mat(c1)); p.position.set(Math.sin(k * Math.PI / 2) * 2.02, 8, -1.5 + Math.cos(k * Math.PI / 2) * 2.02); p.rotation.y = k * Math.PI / 2; marc.add(p); }
      luz(-8, -2, 10); luz(8, -2, 10);
      zonas.push([sala, -6, 4.2], [salaLugar, 6, 4.2]);
      S.puntosInt = [[-10, 3], [-4, 3.5], [4, 3.5], [10, 3], [-12, -6], [12, -6], [0, -6], [-6, 11], [6, 11]];
    } else if (tipo === 'tienda') {
      const tex = M.textura('camiseta-' + club.siglas, 128, (x, n) => { x.clearRect(0, 0, n, n); x.fillStyle = c1; x.beginPath(); x.moveTo(n * 0.3, n * 0.08); x.lineTo(n * 0.7, n * 0.08); x.lineTo(n * 0.95, n * 0.3); x.lineTo(n * 0.8, n * 0.42); x.lineTo(n * 0.75, n * 0.95); x.lineTo(n * 0.25, n * 0.95); x.lineTo(n * 0.2, n * 0.42); x.lineTo(n * 0.05, n * 0.3); x.closePath(); x.fill(); x.fillStyle = c2; x.font = 'bold 44px sans-serif'; x.textAlign = 'center'; x.fillText(String(7 + (n % 3)), n / 2, n * 0.65); });
      const mCam = tex ? new THREE.MeshStandardMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }) : mat(c1);
      for (let i = 0; i < 9; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), mCam); p.position.set(x0 + 1.2 + i * 1.6, 1.4, z0 + 0.16); W.add(p); }
      for (let i = 0; i < 5; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), mCam); p.position.set(x0 + 0.16, 1.4, z0 + 1.5 + i * 1.7); p.rotation.y = Math.PI / 2; W.add(p); }
      for (const [x, z] of [[-3, -1], [1, -1], [-3, 2], [1, 2]]) { caja(W, 2.6, 0.9, 1.2, '#6b4a2b', x, 0, z); for (let k = 0; k < 3; k++) caja(W, 0.7, 0.12, 0.5, k % 2 ? c2 : c1, x - 0.8 + k * 0.8, 0.9, z); G.bloquea(x - 1.3, z - 0.6, x + 1.3, z + 0.6); }
      for (const x of [x1 - 2.5, x1 - 4.2]) { cil(W, 0.25, 0.1, '#333', x, 0, z0 + 1.5); caja(W, 0.5, 0.8, 0.3, c1, x, 1.1, z0 + 1.5); cil(W, 0.04, 1.1, '#333', x, 0, z0 + 1.5); const cab = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mat('#d9d4cb')); cab.position.set(x, 2.1, z0 + 1.5); W.add(cab); G.bloquea(x - 0.35, z0 + 1.15, x + 0.35, z0 + 1.85); }
      caja(W, 4, 1.1, 0.8, '#2a2f35', x1 - 3.4, 0, z1 - 2.6); caja(W, 0.5, 0.35, 0.4, '#1d2024', x1 - 2.4, 1.1, z1 - 2.6); G.bloquea(x1 - 5.4, z1 - 3, x1 - 1.4, z1 - 2.2);
      luz(-3, 0, 6); luz(4, 0, 6);
      zonas.push([sala, x1 - 3.4, z1 - 1.4], [salaLugar, -5, 3.6]);
      S.puntosInt = [[-5, 0.4], [-1, 0.4], [3, 0.4], [-5, 3.6], [-1, 3.6], [3, 3.6], [-6.5, -3]];
    } else if (tipo === 'pena') {
      caja(W, 9, 1.1, 0.9, '#5a3b26', -1.5, 0, z0 + 2.6); caja(W, 9.2, 0.08, 1.1, '#3a2a1a', -1.5, 1.1, z0 + 2.6); G.bloquea(-6, z0 + 2.1, 3, z0 + 3.1);
      caja(W, 9, 2.2, 0.4, '#3a2a1a', -1.5, 0, z0 + 0.35); for (let i = 0; i < 18; i++) cil(W, 0.06, 0.32, ['#2e7d32', '#8e2424', '#d9a441', '#3d5a80'][i % 4], -5.6 + i * 0.48, 1.2 + (i % 2) * 0.55, z0 + 0.45, 8);
      const tex = M.textura('escudo-tv-' + club.siglas, 256, (x, n) => { x.fillStyle = '#0b0f14'; x.fillRect(0, 0, n, n); x.fillStyle = c1; x.beginPath(); x.arc(n / 2, n / 2, n * 0.34, 0, 6.3); x.fill(); x.fillStyle = c2; x.font = 'bold 60px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(club.siglas, n / 2, n / 2); });
      const tv = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4), tex ? new THREE.MeshBasicMaterial({ map: tex }) : mat('#111')); tv.position.set(x1 - 0.2, 1.6, -1); tv.rotation.y = -Math.PI / 2; W.add(tv);
      for (let i = 0; i < 6; i++) { const b = caja(W, 1.4, 0.25, 0.04, i % 2 ? c2 : c1, x0 + 1.6 + i * 2.2, 1.45, z0 + 0.12); b.rotation.z = (i % 2 ? 0.08 : -0.08); }
      S.taburetes = []; for (let i = 0; i < 6; i++) S.taburetes.push([-5.4 + i * 1.5, z0 + 3.6]);
      S.mesasInt = [[-4.5, 2.4], [0, 2.6], [4.5, 2.2]];
      S.mueblesPend = S.taburetes.map(([x, z]) => ['stoolBar', x, z, 0]).concat([].concat(...S.mesasInt.map(([x, z]) => [['tableRound', x, z, 0], ['chair', x - 0.9, z, 90], ['chair', x + 0.9, z, -90]])));
      S.mesasInt.forEach(([x, z]) => G.bloquea(x - 1.3, z - 0.6, x + 1.3, z + 0.6)); S.taburetes.forEach(([x, z]) => G.bloquea(x - 0.25, z - 0.25, x + 0.25, z + 0.25));
      luz(-3, 0, 5); luz(4, 1, 5);
      zonas.push([sala, 5.5, z0 + 3.6], [salaLugar, -6.5, 4]);
      S.puntosInt = [[-6, 0.5], [2.4, 0.4], [6, 3.6], [-2, 4.2], [5.5, -1.4]];
    } else if (enPueblo) {
      if (IPm && IPm.TIPOS[tipo]) {   // edificios nuevos del pueblo (interiores_pueblo.js)
        const acc = IPm.principal(tipo, { W, G, S, M, st, club, c1, c2, x0, x1, z0, z1, w, d, alto }); luz(0, 0, 6); zonas.push([sala, acc[0], acc[1]]);
      } else if (tipo === 'bar_pueblo') {   // bar de pueblo: barra de madera, barriles, jamones colgados, mesas de cartas y tele con el partido
        caja(W, 7, 1.1, 0.9, '#6b4a2b', -2, 0, z0 + 2.2); caja(W, 7.2, 0.1, 1.1, '#4a3220', -2, 1.1, z0 + 2.2); G.bloquea(-5.5, z0 + 1.7, 1.5, z0 + 2.7);
        for (let i = 0; i < 4; i++) { cil(W, 0.45, 1.0, '#7a5230', x1 - 1.2, 0, z0 + 1.2 + i * 1.1, 14); G.bloquea(x1 - 1.7, z0 + 0.7 + i * 1.1, x1 - 0.7, z0 + 1.7 + i * 1.1); }
        for (let i = 0; i < 4; i++) { const j = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.7, 8), mat('#8e3b2a')); j.position.set(-4.5 + i * 0.9, 2.0, z0 + 0.6); j.rotation.x = Math.PI; W.add(j); }
        const tex = M.textura('tv-pueblo-' + club.siglas, 128, (x, n) => { x.fillStyle = '#2e6b3a'; x.fillRect(0, 0, n, n); x.strokeStyle = '#fff'; x.lineWidth = 2; x.strokeRect(8, 8, n - 16, n - 16); x.beginPath(); x.arc(n / 2, n / 2, 16, 0, 6.3); x.stroke(); x.fillStyle = c1; x.fillRect(0, 0, n, 16); });
        const tv = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.1), tex ? new THREE.MeshBasicMaterial({ map: tex }) : mat('#111')); tv.position.set(x0 + 0.2, 1.7, -1); tv.rotation.y = Math.PI / 2; W.add(tv);
        S.mesasInt = [[-3, 1.6], [2, 1.8]]; S.taburetes = [[-4.5, z0 + 3.2], [-3, z0 + 3.2], [-1.5, z0 + 3.2], [0, z0 + 3.2]];
        S.mueblesPend = S.taburetes.map(([x, z]) => ['stoolBar', x, z, 0]).concat([].concat(...S.mesasInt.map(([x, z]) => [['tableCross', x, z, 0], ['chair', x - 1, z, 90], ['chair', x + 1, z, -90]])));
        S.mesasInt.forEach(([x, z]) => G.bloquea(x - 1.3, z - 0.7, x + 1.3, z + 0.7)); luz(-2, 0, 5);
        zonas.push([sala, 4, z0 + 3.4]); S.puntosInt = [[-5, 0], [4, 0], [0, 3.2], [-5, 3]];
      } else if (tipo === 'casa_padres') {   // casa de tus padres: mesa de cocina con hule, sofá, tele, fotos tuyas y plantas
        const fot = M.textura('fotos-padres', 128, (x, n) => { x.fillStyle = '#efe3cf'; x.fillRect(0, 0, n, n); for (let i = 0; i < 6; i++) { x.fillStyle = ['#c9a27a', c1, '#7a8791', '#b4643d', c1, '#4f7f3a'][i]; x.fillRect(8 + (i % 3) * 40, 14 + Math.floor(i / 3) * 52, 32, 40); x.strokeStyle = '#6b4a2b'; x.lineWidth = 3; x.strokeRect(8 + (i % 3) * 40, 14 + Math.floor(i / 3) * 52, 32, 40); } });
        const pared = new THREE.Mesh(new THREE.PlaneGeometry(3, 2), fot ? new THREE.MeshBasicMaterial({ map: fot }) : mat('#efe3cf')); pared.position.set(-3, 1.5, z0 + 0.15); W.add(pared);
        caja(W, 2.2, 0.06, 1.3, mat('#d7e7f2'), -3, 0.75, 1.2); S.mueblesPend = [['table', -3, 1.2, 0], ['chair', -4.1, 1.2, 90], ['chair', -1.9, 1.2, -90], ['loungeSofa', 3, -1.8, 0], ['tableCoffee', 3, -0.3, 0], ['televisionVintage', 3, 1.8, 180], ['kitchenFridge', x0 + 0.8, z0 + 0.8, 90], ['kitchenStove', x0 + 0.8, z0 + 2.1, 90], ['pottedPlant', x1 - 0.8, z1 - 1.6, 0], ['bookcaseOpen', x1 - 0.6, z0 + 1.2, -90]];
        G.bloquea(-4.4, 0.5, -1.6, 1.9); G.bloquea(1.8, -2.4, 4.2, -1.2); G.bloquea(x0, z0, x0 + 1.4, z0 + 2.8); luz(0, 0, 5);
        zonas.push([sala, -0.4, -1.6]); S.puntosInt = [[-3, -1.6], [0, 1], [2, 0.6], [-1, -2.6]];
      } else if (tipo === 'casa_pueblo') {   // tu casa del pueblo: chimenea de piedra, vigas, sofá, mesa grande, cama y tus trofeos de juvenil
        caja(W, 2.2, 1.6, 0.6, '#8b8378', 2.6, 0, z0 + 0.3); caja(W, 1.2, 0.8, 0.1, '#2a1d14', 2.6, 0.15, z0 + 0.62); caja(W, 1.0, 0.25, 0.2, '#ff8c3a', 2.6, 0.15, z0 + 0.55);
        for (let i = 0; i < 4; i++) caja(W, w, 0.16, 0.18, '#5a3b26', 0, alto + 0.05, z0 + 1.5 + i * 2.2);
        const fot = M.textura('fotos-micasa', 128, (x, n) => { x.fillStyle = '#e6d8bf'; x.fillRect(0, 0, n, n); for (let i = 0; i < 4; i++) { x.fillStyle = [c1, '#7a8791', '#4f7f3a', '#b4643d'][i]; x.fillRect(10 + (i % 2) * 60, 12 + Math.floor(i / 2) * 58, 48, 46); } });
        const pared = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.6), fot ? new THREE.MeshBasicMaterial({ map: fot }) : mat('#e6d8bf')); pared.position.set(-3.6, 1.4, z0 + 0.15); W.add(pared);
        S.mueblesPend = [['loungeSofa', 2.6, -1.6, 0], ['tableCoffee', 2.6, -0.2, 0], ['table', -3.6, 0.8, 0], ['chair', -4.6, 0.8, 90], ['chair', -2.6, 0.8, -90], ['bedDouble', x0 + 1.4, z1 - 2.2, 90], ['bookcaseOpen', x1 - 0.6, 1.6, -90], ['pottedPlant', x1 - 0.8, z1 - 1.4, 0], ['rugRectangle', 2.6, -0.6, 0]];
        G.bloquea(1.4, z0, 3.8, z0 + 0.8); G.bloquea(1.4, -2.3, 3.8, -1.0); G.bloquea(-4.9, 0.2, -2.3, 1.4); G.bloquea(x0, z1 - 3.4, x0 + 2.8, z1 - 1.0); luz(0, 0, 5); luz(2.6, z0 + 1, 2);
        zonas.push([sala, -0.6, -1.4]); S.puntosInt = [[0, 1], [-2, -2]];
      } else {   // casa de tus amigos: sofá frente a una tele grande con la consola, cajas de pizza, pósteres y un futbolín
        const pos = M.textura('poster-amigos-' + club.siglas, 128, (x, n) => { x.fillStyle = c1; x.fillRect(0, 0, n, n); x.fillStyle = '#fff'; x.font = 'bold 40px sans-serif'; x.textAlign = 'center'; x.fillText(club.siglas, n / 2, n * 0.6); });
        for (let i = 0; i < 3; i++) { const pp = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.5), pos ? new THREE.MeshBasicMaterial({ map: pos }) : mat(c1)); pp.position.set(-4 + i * 1.6, 1.6, z0 + 0.15); W.add(pp); }
        caja(W, 2.6, 0.12, 1.4, '#3b4148', 3.4, 0.7, -1.2); for (let i = 0; i < 3; i++) caja(W, 0.45, 0.06, 0.45, '#e8b923', 2.6 + i * 0.5, 0.82, -1.2);
        S.mueblesPend = [['loungeSofaLong', -0.5, 1.6, 180], ['televisionModern', -0.5, z0 + 0.8, 0], ['cabinetTelevision', -0.5, z0 + 0.6, 0], ['tableCoffee', -0.5, 0.2, 0], ['speaker', 1.6, z0 + 0.7, 0], ['loungeChair', -3.4, 0.6, 90], ['pottedPlant', x1 - 0.7, z1 - 1.5, 0]];
        G.bloquea(-2.2, 1.0, 1.2, 2.2); G.bloquea(2.0, -1.9, 4.8, -0.5); G.bloquea(-1.8, z0, 0.8, z0 + 1.2); luz(0, 0, 4.5);
        zonas.push([sala, 3.2, 2.6]); S.puntosInt = [[3.4, 0.6], [-3.6, -2.5], [2.8, 2.6]];
      }
    } else if (tipo === 'restaurante') {   // comedor con mesas vestidas, barra, cocina vista y vinoteca
      caja(W, 6, 1.1, 0.9, '#5a3b26', x1 - 4, 0, z0 + 2.2); caja(W, 6.2, 0.08, 1.1, '#2a2018', x1 - 4, 1.1, z0 + 2.2); G.bloquea(x1 - 7.2, z0 + 1.6, x1 - 0.8, z0 + 2.8);
      caja(W, 3.2, 2.2, 0.5, '#3a2a1a', x0 + 2.2, 0, z0 + 0.4); for (let i = 0; i < 24; i++) cil(W, 0.04, 0.3, ['#5a1020', '#2e5d3a', '#c9a227'][i % 3], x0 + 0.9 + (i % 8) * 0.35, 0.3 + Math.floor(i / 8) * 0.6, z0 + 0.55, 6);
      S.mesasInt = [[-4.8, -0.6], [-1.6, -0.6], [1.6, -0.6], [-4.8, 2.6], [-1.6, 2.6], [1.6, 2.6]];
      S.mueblesPend = [].concat(...S.mesasInt.map(([x, z]) => [['tableRound', x, z, 0], ['chair', x - 0.85, z, 90], ['chair', x + 0.85, z, -90]])).concat([['pottedPlant', x1 - 0.7, z1 - 1.4, 0], ['pottedPlant', x0 + 0.7, z1 - 1.4, 0], ['stoolBar', x1 - 5.5, z0 + 3.3, 0], ['stoolBar', x1 - 4, z0 + 3.3, 0], ['stoolBar', x1 - 2.5, z0 + 3.3, 0]]);
      S.mesasInt.forEach(([x, z]) => { caja(W, 1.2, 0.02, 1.2, '#f4f1ea', x, 0.76, z); G.bloquea(x - 1.3, z - 0.7, x + 1.3, z + 0.7); }); luz(-2, 0, 5); luz(4, -2, 3);
      zonas.push([sala, x1 - 4, z0 + 3.6]); S.puntosInt = [[x1 - 4, 0], [0, 4.2], [-3, 4.2]];
    } else if (tipo === 'gimnasio_barrio') {   // máquinas, pesas, espejo, sacos y colchonetas
      const metal = mat('#40464e', { metalness: 0.6, roughness: 0.4 }), negro = mat('#1d2024'), rojo = mat('#c0392b');
      caja(W, w - 2, 1.6, 0.04, mat('#c8dbe6', { metalness: 0.9, roughness: 0.08 }), 0, 0.3, z0 + 0.16);
      for (let i = 0; i < 4; i++) { const x = x0 + 2.5 + i * 2.2; caja(W, 0.8, 0.18, 1.9, negro, x, 0, z0 + 2.2); caja(W, 0.06, 1.1, 0.06, metal, x - 0.38, 0, z0 + 1.4); caja(W, 0.06, 1.1, 0.06, metal, x + 0.38, 0, z0 + 1.4); caja(W, 0.8, 0.3, 0.12, rojo, x, 1.05, z0 + 1.4); G.bloquea(x - 0.5, z0 + 1.2, x + 0.5, z0 + 3.2); }
      for (let i = 0; i < 3; i++) { const x = x1 - 2 - i * 2.3; caja(W, 0.4, 0.12, 1.3, rojo, x, 0.4, z0 + 2.4); caja(W, 0.06, 1.15, 0.06, metal, x - 0.42, 0, z0 + 1.8); caja(W, 0.06, 1.15, 0.06, metal, x + 0.42, 0, z0 + 1.8); G.bloquea(x - 0.6, z0 + 1.6, x + 0.6, z0 + 3.2); }
      for (let i = 0; i < 2; i++) { const x = x0 + 1.4 + i * 1.6; cil(W, 0.02, 2.6, '#2a2f35', x, 0, z1 - 2.5); const saco = cil(W, 0.25, 1.1, '#3a2a1a', x, 1.2, z1 - 2.5, 12); void saco; G.bloquea(x - 0.35, z1 - 2.85, x + 0.35, z1 - 2.15); }
      for (let i = 0; i < 3; i++) caja(W, 1.8, 0.04, 0.8, mat('#2f6f9e'), 2 + i * 2, 0, z1 - 2.6, 0, false);
      luz(-3, 0, 5); luz(4, 0, 5);
      zonas.push([sala, 0, 0.4]); S.puntosInt = [[x0 + 2.5, z0 + 2.2], [x0 + 4.7, z0 + 2.2], [x1 - 2, z0 + 2.6], [2, z1 - 2.6], [4, z1 - 2.6], [x0 + 1.4, z1 - 1.8]];
    } else if (tipo === 'barberia') {   // sillones de barbero frente al espejo, lavacabezas y sala de espera
      const espejo = mat('#c8dbe6', { metalness: 0.9, roughness: 0.06 });
      for (let i = 0; i < 3; i++) { const x = x0 + 2 + i * 2.6; caja(W, 1.6, 1.1, 0.04, espejo, x, 1.0, z0 + 0.16); caja(W, 1.7, 0.08, 0.4, '#f4f1ea', x, 0.95, z0 + 0.4); G.bloquea(x - 0.9, z0 + 0.1, x + 0.9, z0 + 0.6);
        const g = new THREE.Group(); g.position.set(x, 0, z0 + 1.5); W.add(g); const B = (bw, bh, bd, m, px, py, pz) => { const me = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mat(m)); me.position.set(px, py, pz); me.castShadow = true; g.add(me); };
        B(0.12, 0.45, 0.12, '#c8ccd0', 0, 0.22, 0); B(0.6, 0.12, 0.6, '#1d1d1d', 0, 0.5, 0); B(0.6, 0.6, 0.1, '#1d1d1d', 0, 0.85, -0.28); B(0.08, 0.25, 0.5, '#1d1d1d', -0.32, 0.65, 0); B(0.08, 0.25, 0.5, '#1d1d1d', 0.32, 0.65, 0); G.bloquea(x - 0.4, z0 + 1.1, x + 0.4, z0 + 1.9); }
      cil(W, 0.12, 2.0, '#ffffff', x1 - 0.5, 0, z1 - 0.6, 10); for (let i = 0; i < 6; i++) { const b = cil(W, 0.125, 0.12, i % 2 ? '#c0392b' : '#1d4f91', x1 - 0.5, 0.4 + i * 0.25, z1 - 0.6, 10); void b; }
      S.mueblesPend = [['loungeSofa', x0 + 1.6, z1 - 1.2, 180], ['tableCoffee', x0 + 1.6, z1 - 2.6, 0], ['pottedPlant', x1 - 0.7, z0 + 2.6, 0]];
      luz(0, -1, 4); zonas.push([sala, 1.2, z1 - 2.2]); S.puntosInt = [[x0 + 2, z0 + 2.4], [x0 + 4.6, z0 + 2.4]];
    } else {
      for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { cil(W, 0.35, alto + 2.4, '#f4f1ea', s * 4.5, 0, z0 + 2.5 + k * 3, 16); G.bloquea(s * 4.5 - 0.4, z0 + 2.1 + k * 3, s * 4.5 + 0.4, z0 + 2.9 + k * 3); }
      const alf = new THREE.Mesh(new THREE.PlaneGeometry(3, d - 1).rotateX(-Math.PI / 2), mat('#8e2424', { roughness: 1 })); alf.position.set(0, 0.01, 0.5); W.add(alf);
      caja(W, 7, 1.1, 0.9, '#6b4a2b', 0, 0, z0 + 2.2); G.bloquea(-3.5, z0 + 1.7, 3.5, z0 + 2.7);
      for (let k = 0; k < 6; k++) caja(W, 3, 0.3 + k * 0.3, 0.5, '#d8cdb8', x1 - 2.2, 0, z0 + 0.6 + k * 0.5); G.bloquea(x1 - 3.8, z0, x1 - 0.6, z0 + 3.4);
      [[c1, -1.5], ['#c8102e', 0], ['#f1bf00', 1.5]].forEach(([c, x]) => { cil(W, 0.04, 2.6, '#c9a227', x, 0, z0 + 0.6); caja(W, 0.9, 0.6, 0.02, c, x + 0.45, 1.9, z0 + 0.6); });
      const retrato = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), mat('#3a2e22')); retrato.position.set(-6, 1.6, z0 + 0.14); W.add(retrato);
      luz(0, -2, 6); luz(0, 3, 5);
      zonas.push([sala, -2.6, z0 + 3.4], [salaLugar, 2.6, z0 + 3.4]);
      S.puntosInt = [[-6, 2], [6, 2], [-6, -3], [6, -3], [0, 4]];
    }
    if (IPm) IPm.decorarPrincipal(tipo, { W, G, S, M, st, club, c1, c2, x0, x1, z0, z1, w, d, alto }, hu);
    if (IPm && an.length) IPm.construirAnexos({ W, G, S, M, st, club, c1, c2, alto, an });
    S.zonas = zonas.map(([sl, x, z]) => M.zona(W, sl, x, z, club));
    S.spawnInterior = { x: 0, z: z1 - 1.2, ry: Math.PI };
    GM.kit.fusionar(W);
    return W;
  }
  const MODELOS = ['h-casual_2', 'm-casual', 'h-beach', 'm-formal', 'h-casual_hoodie', 'm-punk', 'h-farmer', 'm-suit', 'h-suit', 'h-adventurer'];
  const PIEL = ['#f1c7a5', '#e0ac85', '#c68863', '#9a6142', '#6e4329'], PELO = ['#1d1510', '#3b2617', '#6a4425', '#a9793e', '#8a8a8a'];
  async function poblar(S, M, st, tipo) {
    tipo = S.interiorTipo || tipo; const club = st.equipos[st.clubId], c1 = club.colores[0], c2 = club.colores[1] || '#222', r = (() => { let a = U.hash(st.fecha + tipo) >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; })();
    const nueva = async (o, rol, fijo) => { const p = await M.personaje(Object.assign({ modelo: MODELOS[(r() * MODELOS.length) | 0], altura: 160 + r() * 28, piel: PIEL[(r() * 5) | 0], pelo: PELO[(r() * 5) | 0] }, o)); p.rol = rol; p.fijo = !!fijo; p.r = r; p.espera = r() * 4; p.obj.userData = { npc: S.gente.length }; M.anim(p, 'idle'); S.mundo.add(p.obj); S.gente.push(p); return p; };
    const crea = async sp => { const mov = sp.anim === 'walk', p = await nueva({ modelo: sp.modelo }, sp.rol, !mov); p.obj.position.set(sp.x, 0, sp.z); p.obj.rotation.y = sp.ry || 0; if (sp.sentado) { p.asiento = sp.asiento || 0.45; M.anim(p, 'sit'); } else if (!mov) M.anim(p, sp.anim || 'idle'); return p; };
    // muebles de Kenney del bar (taburetes, mesas, sillas)
    if (S.mueblesPend) { await Promise.all(S.mueblesPend.map(async ([m, x, z, ry]) => { try { const o = await M.mueble(m); o.position.set(x, 0, z); o.rotation.y = ry * Math.PI / 180; S.mundo.add(o); } catch (e) { } })); S.mueblesPend = null; }
    if (tipo === 'pabellon') {
      const partido = S.dia && S.dia.tipo === 'partido' && S.dia.casa, cols = [c1, c2, '#f2f2f2', '#2f3a46'], lleno = partido ? 0.85 : 0.08;
      const fans = (S.gradas || []).filter(() => r() < lleno).map(g => Object.assign({}, g, { ropa: cols[(r() * 4) | 0], piel: PIEL[(r() * 5) | 0], pelo: PELO[(r() * 5) | 0] }));
      if (fans.length && GM.kit.publico) { const P = GM.kit.publico(fans, 1); S.mundo.add(P.grupo); S.publicoInt = P; }
      for (let i = 0; i < (partido ? 3 : 5); i++) { const p = await nueva({ ropa: [c1, c2], modelo: ['h-casual_hoodie', 'h-casual_2', 'h-beach'][i % 3], altura: 192 + r() * 14 }, partido ? 'Jugador calentando' : 'Jugador del club'); const q = S.puntosInt[(r() * S.puntosInt.length) | 0]; p.obj.position.set(q[0], 0, q[1]); }
      const t = await nueva({ modelo: 'm-formal' }, 'Taquillera', true); t.obj.position.set(-2.4, 0, 13.8); t.obj.rotation.y = Math.PI / 2;
    } else if (tipo === 'tienda') {
      const d = await nueva({ modelo: 'm-casual', ropa: [c1, c2] }, 'Dependienta de la tienda', true); d.obj.position.set(TIPOS.tienda.w / 2 - 3.4, 0, TIPOS.tienda.d / 2 - 3.4); d.obj.rotation.y = 0;
      for (let i = 0; i < 3; i++) { const p = await nueva({ ropa: i % 2 ? [c1, c2] : null }, i % 2 ? 'Aficionado de compras' : 'Cliente'); const q = S.puntosInt[i]; p.obj.position.set(q[0], 0, q[1]); }
    } else if (tipo === 'pena') {
      const b = await nueva({ modelo: 'h-casual_2' }, 'Camarero de la peña', true); b.obj.position.set(-1.5, 0, -TIPOS.pena.d / 2 + 1.6); b.obj.rotation.y = 0;
      for (let i = 0; i < 4; i++) { const [x, z] = S.taburetes[i * 1 + (i > 1 ? 1 : 0)]; const p = await nueva({ ropa: [r() < 0.6 ? c1 : c2, c1] }, 'Peñista', true); p.obj.position.set(x, 0, z); p.obj.rotation.y = Math.PI; p.asiento = 0.62; M.anim(p, 'sit'); }
      for (let i = 0; i < 2; i++) { const [x, z] = S.mesasInt[i]; const p = await nueva({ ropa: [c1, c2] }, 'Peñista', true); p.obj.position.set(x - 0.9, 0, z); p.obj.rotation.y = Math.PI / 2; p.asiento = 0.45; M.anim(p, 'sit'); }
    } else if (tipo === 'bar_pueblo') {
      const b = await nueva({ modelo: 'h-farmer' }, 'Dueño del bar', true); b.obj.position.set(-2, 0, -TIPOS.bar_pueblo.d / 2 + 1.4); b.obj.rotation.y = 0;
      for (let i = 0; i < 2; i++) for (const s of [-1, 1]) { const [x, z] = S.mesasInt[i]; const p = await nueva({ pelo: '#bdbdbd' }, 'Vecino jugando a las cartas', true); p.obj.position.set(x + s, 0, z); p.obj.rotation.y = -s * Math.PI / 2; p.asiento = 0.45; M.anim(p, 'sit'); }
      for (let i = 0; i < 2; i++) { const [x, z] = S.taburetes[i]; const p = await nueva({ ropa: [c1, c2] }, 'Aficionado del pueblo', true); p.obj.position.set(x, 0, z); p.obj.rotation.y = Math.PI; p.asiento = 0.62; M.anim(p, 'sit'); }
    } else if (tipo === 'restaurante') {
      const cam = await nueva({ modelo: 'h-suit' }, 'Camarero', false); cam.obj.position.set(TIPOS.restaurante.w / 2 - 4, 0, -TIPOS.restaurante.d / 2 + 1.2);
      for (let i = 0; i < S.mesasInt.length; i++) { if (r() < 0.35) continue; const [x, z] = S.mesasInt[i]; for (const s of [-1, 1]) { if (r() < 0.3) continue; const p = await nueva({}, 'Cliente del restaurante', true); p.obj.position.set(x + s * 0.85, 0, z); p.obj.rotation.y = s < 0 ? Math.PI / 2 : -Math.PI / 2; p.asiento = 0.45; M.anim(p, 'sit'); } }
    } else if (tipo === 'gimnasio_barrio') {
      for (let i = 0; i < 6; i++) { const q = S.puntosInt[i], p = await nueva({ modelo: ['h-beach', 'm-casual', 'h-casual_hoodie'][i % 3] }, 'Socio del gimnasio', true); p.obj.position.set(q[0], 0, q[1]); M.anim(p, i < 2 ? 'walk' : i < 4 ? 'interact-right' : 'idle'); }
      const mon = await nueva({ modelo: 'h-beach' }, 'Monitor', true); mon.obj.position.set(0, 0, 1.6); M.anim(mon, 'emote-yes');
    } else if (tipo === 'barberia') {
      const bar = await nueva({ modelo: 'h-casual_2', pelo: '#3b2617' }, 'Paco, el barbero', true); bar.obj.position.set(-TIPOS.barberia.w / 2 + 2.5, 0, -TIPOS.barberia.d / 2 + 2.1); bar.obj.rotation.y = Math.PI; M.anim(bar, 'interact-right');
      const cli = await nueva({}, 'Cliente', true); cli.obj.position.set(-TIPOS.barberia.w / 2 + 2, 0, -TIPOS.barberia.d / 2 + 1.5); cli.obj.rotation.y = Math.PI; cli.asiento = 0.5; M.anim(cli, 'sit');
    } else if (tipo === 'casa_pueblo') {
      if (GM.mods.vida) GM.mods.vida.ponerMascota(S, st, 0.6, 0.4);
    } else if (tipo === 'casa_padres' || tipo === 'casa_amigos') {
      const so = st.carrera && st.carrera.social, cs = so && so.contactos ? so.contactos.filter(c => tipo === 'casa_padres' ? c.tipo === 'familia' : c.tipo === 'amigo') : [];
      const nom = (i, def) => (cs[i] && cs[i].nombre) || def, sitios = tipo === 'casa_padres' ? [[-4.1, 1.2, Math.PI / 2], [-1.9, 1.2, -Math.PI / 2]] : [[-1.4, 1.6, Math.PI], [0.4, 1.6, Math.PI], [-3.4, 0.6, Math.PI / 2]];
      for (let i = 0; i < sitios.length; i++) { const [x, z, ry] = sitios[i]; const p = await nueva(tipo === 'casa_padres' ? { modelo: i ? 'h-casual_2' : 'm-casual', pelo: '#8a8a8a' } : { ropa: i === 1 ? [c1, c2] : null }, tipo === 'casa_padres' ? nom(i, i ? 'Tu padre' : 'Tu madre') : nom(i, 'Amigo de siempre'), true); p.obj.position.set(x, 0, z); p.obj.rotation.y = ry; p.asiento = 0.45; M.anim(p, 'sit'); }
    } else if (GM.interioresPueblo && GM.interioresPueblo.TIPOS[tipo]) {
      for (const sp of GM.interioresPueblo.poblar(tipo)) await crea(sp);
    } else {
      const f = await nueva({ modelo: 'm-suit' }, 'Atención ciudadana', true); f.obj.position.set(0, 0, -TIPOS.ayuntamiento.d / 2 + 1.4); f.obj.rotation.y = 0;
      for (let i = 0; i < 3; i++) { const p = await nueva({}, 'Vecino haciendo trámites'); const q = S.puntosInt[i]; p.obj.position.set(q[0], 0, q[1]); }
    }
    for (const sp of (S.anexoNpcs || [])) await crea(sp);   // gente de las estancias anexas
  }
  // Acciones de los locales nuevos (sirven en todos los modos; en la carrera mueven ánimo, forma y relaciones)
  const car = st => st.modo === 'carrera' && st.carrera && st.carrera.fase !== 'retirado';
  const cobra = (st, euros) => { const H = GM.mods.hogar; if (!H) return true; if (H.dinero(st) < euros / 1000) return false; if (car(st)) st.carrera.dinero -= euros / 1000; else st.hogar.ahorros -= euros / 1000; return true; };
  const hoyHecho = (st, k) => { st.sede = st.sede || { charlas: {} }; const u = st.sede.locales = st.sede.locales || {}; if (u[k] === st.fecha) return true; u[k] = st.fecha; return false; };
  function localRestaurante(st) {
    const so = car(st) && st.carrera.social, par = so && so.contactos.find(k => k.tipo === 'pareja'), comp = so && so.contactos.find(k => k.tipo === 'companero');
    const A = [{ id: 'menu', t: 'Comer el menú del día', d: '14 €. Primero, segundo y postre.', disponible: true, fn: () => { if (!cobra(st, 14)) return { ok: false, motivo: 'No te llega.' }; if (car(st)) st.carrera.moral = Math.min(100, st.carrera.moral + 2); return { ok: true, texto: 'Lentejas, merluza y flan. Ánimo +2.' }; } }];
    if (par) A.push({ id: 'cena', t: 'Cenar con ' + par.nombre, d: '60 €. Relación +6.', disponible: true, fn: () => { if (hoyHecho(st, 'cena')) return { ok: false, motivo: 'Ya habéis cenado hoy.' }; if (!cobra(st, 60)) return { ok: false, motivo: 'No te llega.' }; par.rel = Math.min(100, par.rel + 6); st.carrera.moral = Math.min(100, st.carrera.moral + 3); return { ok: true, texto: 'Cena larga y risas. Relación +6.' }; } });
    if (comp) A.push({ id: 'comp', t: 'Invitar a comer a ' + comp.nombre, d: '30 €. Relación +6.', disponible: true, fn: () => { if (hoyHecho(st, 'comp')) return { ok: false, motivo: 'Ya habéis comido hoy.' }; if (!cobra(st, 30)) return { ok: false, motivo: 'No te llega.' }; comp.rel = Math.min(100, comp.rel + 6); return { ok: true, texto: 'Comida de compañeros. Relación +6.' }; } });
    return A;
  }
  function localGimnasio(st) {
    const y = st.jugadores.yo;
    return [{ id: 'pesas', t: 'Entrenar por tu cuenta', d: car(st) ? 'Forma +2, fatiga +6.' : 'Una hora de pesas.', disponible: true, fn: () => { if (hoyHecho(st, 'gym')) return { ok: false, motivo: 'Ya has entrenado hoy.' }; if (car(st) && y) { y.estado.forma = Math.min(100, y.estado.forma + 2); y.estado.fatiga = Math.min(100, y.estado.fatiga + 6); } return { ok: true, texto: 'Sales del gimnasio reventado, pero contento.' }; } },
      { id: 'spinning', t: 'Clase de spinning', d: '8 €. ' + (car(st) ? 'Forma +1, ánimo +1.' : 'Música alta y mucho sudor.'), disponible: true, fn: () => { if (hoyHecho(st, 'spin')) return { ok: false, motivo: 'Ya has ido a clase hoy.' }; if (!cobra(st, 8)) return { ok: false, motivo: 'No te llega.' }; if (car(st) && y) { y.estado.forma = Math.min(100, y.estado.forma + 1); st.carrera.moral = Math.min(100, st.carrera.moral + 1); } return { ok: true, texto: 'Cuarenta y cinco minutos de pedaleo.' }; } }];
  }
  function localBarberia(st) {
    const P = GM.mods.personaje, OP = P && P.OPCIONES ? P.OPCIONES.pelo : ['Rapado', 'Corto', 'Rizado', 'Largo', 'Moño', 'Calvo'], pj = st.personaje || {};
    return OP.map((nom, i) => ({ id: 'pelo' + i, t: (pj.pelo === i ? '✓ ' : '') + 'Corte: ' + nom.toLowerCase(), d: '15 €. Se ve en tu personaje al salir.', disponible: pj.pelo !== i, motivo: 'Es tu peinado actual.', fn: () => { if (!cobra(st, 15)) return { ok: false, motivo: 'No te llega.' }; st.personaje.pelo = i; if (car(st)) st.carrera.moral = Math.min(100, st.carrera.moral + 1); return { ok: true, texto: 'Nuevo peinado: ' + nom.toLowerCase() + '. Paco te deja niquelado.' }; } }))
      .concat([{ id: 'barba', t: pj.barba ? 'Afeitarte la barba' : 'Arreglar la barba', d: '8 €.', disponible: true, fn: () => { if (!cobra(st, 8)) return { ok: false, motivo: 'No te llega.' }; st.personaje.barba = pj.barba ? 0 : 1; return { ok: true, texto: pj.barba ? 'Afeitado apurado.' : 'Barba perfilada.' }; } }]);
  }
  function siguiente(S, M, n) {
    if (n.fijo) { n.espera = 30; return; }
    const q = S.puntosInt[(n.r() * S.puntosInt.length) | 0]; if (!q) { n.espera = 10; return; }
    const ok = M.irA(n, q[0] + (n.r() - 0.5), q[1] + (n.r() - 0.5), () => { M.anim(n, 'idle'); n.espera = 3 + n.r() * 6; });
    if (!ok) n.espera = 2;
  }
  // El público del pabellón se levanta un poco al azar (como si siguiera un entrenamiento)
  function actualizar(S, M, dt) { if (!S.publicoInt) return; S.tPub = (S.tPub || 0) - dt; if (S.tPub > 0) return; S.tPub = 0.15; const t = performance.now() / 1000; S.publicoInt.colocar(i => (Math.sin(t * 3 + i * 1.7) > 0.97 ? { salto: 0.15, brazos: 0.6 } : null)); }
  GM.interiores = { construir, poblar, siguiente, actualizar, TIPOS };
})();
