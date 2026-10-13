/* VIDA DE LA CIUDAD REAL (GM.calleRealVida) — gente, tráfico y detalles de calle_real.js
   Vecinos (con la misma rutina por horas que la calle de siempre: calle3d.siguiente), niños, perros, chavales con la pelota en el parque,
   coches que circulan por las calles reales (ceden el paso a quien cruza) y la cabecera con el nombre de la calle donde estás.
   Expone: poblar(S, M, st), actualizar(S, M, dt). */
(function () {
  const U = GM.util;
  const rnd = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const ANCHO = [16, 12, 10, 8.5, 7, 5.5, 4];
  const COLORES = ['#c8102e', '#f4f4f4', '#1d2024', '#2f6f9e', '#8a8f94', '#e8b923', '#3a5a3a', '#7a2f22'];
  const K = () => GM.calle.util;

  // Halos de los faros (sprites aditivos compartidos): solo se ven de noche; el coche mira hacia +z
  function faros(obj) {
    const S = GM.sede._estado(); if (!S || typeof document === 'undefined') return;
    if (!S.farosMat) S.farosMat = new THREE.SpriteMaterial({ map: GM.sede.motor().textura('halo-faro', 64, (x, n) => { const g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); g.addColorStop(0, 'rgba(255,250,225,1)'); g.addColorStop(0.3, 'rgba(255,238,190,0.5)'); g.addColorStop(1, 'rgba(255,230,170,0)'); x.fillStyle = g; x.fillRect(0, 0, n, n); }), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false });
    for (const sx of [-0.62, 0.62]) { const sp = new THREE.Sprite(S.farosMat); sp.userData.halo = true; sp.scale.setScalar(1.5); sp.position.set(sx, 0.7, 2.3); obj.add(sp); }
    if (!S.conoMat) S.conoMat = new THREE.MeshBasicMaterial({ map: GM.sede.motor().textura('cono-faro', 128, (x, n) => { const g = x.createLinearGradient(0, n, 0, 0); g.addColorStop(0, 'rgba(255,240,200,0.8)'); g.addColorStop(1, 'rgba(255,240,200,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(n * 0.4, n); x.lineTo(n * 0.6, n); x.lineTo(n * 0.95, 0); x.lineTo(n * 0.05, 0); x.closePath(); x.fill(); }), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false });
    if (GM.campus && GM.campus.config.calidad === 'alta') { const cn = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 9).rotateX(-Math.PI / 2), S.conoMat); cn.position.set(0, 0.06, 7); cn.renderOrder = 3; obj.add(cn); }   // cono de luz sobre el asfalto
  }
  async function poblar(S, M, st) {
    const fp = n => { if (typeof window !== 'undefined' && window.__medirFases) (S.fasesPoblar = S.fasesPoblar || []).push([n, +performance.now().toFixed(0)]); }; fp('inicio de poblar (calle real)');
    const { MODELOS, PIEL, PELO, coche, perro } = K();
    const club = st.equipos[st.clubId], ciu = (st.ciudad && st.ciudad[st.clubId]) || { aficion: 50 }, afi = ciu.aficion || 50, partido = S.dia && S.dia.tipo === 'partido' && S.dia.casa;
    const n = Math.round(((partido ? 50 : 42) + (!GM.campus || !GM.campus.config || GM.campus.config.calidad !== 'normal' ? 14 : 0)) * (GM.campus && GM.campus.factorGente ? GM.campus.factorGente() : 1)), r = rnd(U.hash(st.fecha + 'vecinos')), c1 = club.colores[0], c2 = club.colores[1] || '#222', alta = !GM.campus || !GM.campus.config || GM.campus.config.calidad !== 'normal';
    const cat = c => (GM.catalogo ? GM.catalogo.generar(r, { pais: club.pais || club.paisCod || '', mes: +String(st.fecha).slice(5, 7), temp: S.clima && S.clima.temp, club, hincha: c, rol: !c && GM.vecinos ? GM.vecinos.rolPara(r) : '' }) : null);
    const crear = () => { const hincha = r() * 100 < afi * (partido ? 1.4 : 0.6), cg = cat(hincha); if (cg) return M.personaje(cg).then(p => { p.hincha = hincha; return p; }); return M.personaje({ modelo: MODELOS[(r() * MODELOS.length) | 0], altura: 158 + r() * 30, piel: PIEL[(r() * 5) | 0], pelo: PELO[(r() * 6) | 0], ropa: hincha ? [c1, c2] : null }).then(p => { p.hincha = hincha; return p; }); };
    const PRIMEROS = 18, lista = await Promise.all(Array.from({ length: Math.min(n, PRIMEROS) }, crear));   // los primeros vecinos salen ya; el resto se va creando por lotes mientras se juega (la carga baja de 2 s a menos de 1)
    const sitio = () => { let q = S.paseo[(r() * S.paseo.length) | 0]; for (let i = 0; i < 3; i++) { const o = S.paseo[(r() * S.paseo.length) | 0]; if (r() < 0.65 && Math.hypot(o[0], o[1]) < Math.hypot(q[0], q[1])) q = o; } return q; };
    const colocar = (p, k) => {
      const q = sitio(); p.obj.position.set(q[0] + (r() - 0.5), 0, q[1] + (r() - 0.5) * 0.6);
      Object.assign(p, { peaton: true, rol: p.hincha ? 'Aficionado del ' + club.siglas : 'Vecino de ' + club.ciudad, r: rnd(U.hash(st.fecha + 'p' + k)), espera: r() * 3 });
      if (GM.vecinos) GM.vecinos.asignar(S, st, p, k);
      p.obj.userData = { npc: S.gente.length }; M.anim(p, 'idle'); S.mundo.add(p.obj); S.gente.push(p);
      // algunos van con bolsas de la compra; tres corren
      if (k % 4 === 1 && !p.hincha) { const sc = p.obj.scale.x || 1, bolsa = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.32, 0.12), new THREE.MeshStandardMaterial({ color: ['#c0392b', '#f4efe3', '#2f6f9e', '#2e7d32'][k % 4 === 1 ? (k >> 2) % 4 : 0], roughness: 0.8 })); bolsa.scale.setScalar(1 / sc); bolsa.position.set(0.32 / sc, 0.8 / sc, 0.04 / sc); p.obj.add(bolsa); p.rol = 'Vecino con la compra'; }
      if (k % 13 === 5 && !p.hincha) { p.corredor = true; p.rapido = true; p.rol = 'Corredor'; }
    };
    lista.forEach(colocar);
    S.cargaDiferida = (async () => { for (let i = PRIMEROS; i < n; i += 6) { await new Promise(rs => setTimeout(rs, 70)); if (!S.vivo) return; const lote = await Promise.all(Array.from({ length: Math.min(6, n - i) }, crear)); if (!S.vivo) return; lote.forEach((p, j) => colocar(p, i + j)); } })();
    fp('vecinos (primeros)'); S.destinos = null;
    { const ninos = await Promise.all(Array.from({ length: 6 }, (_, k) => M.personaje({ modelo: ['h-casual_hoodie', 'h-casual_2', 'm-casual'][k % 3], altura: 118 + r() * 26, piel: PIEL[(r() * 5) | 0], pelo: PELO[(r() * 6) | 0], ropa: k % 2 ? [c1, c2] : null })));
      ninos.forEach((p, k) => { const q = S.paseo[(r() * S.paseo.length) | 0]; p.obj.position.set(q[0], 0, q[1]); Object.assign(p, { peaton: true, nino: true, rol: 'Chaval que va al colegio', r: rnd(U.hash(st.fecha + 'n' + k)), espera: r() * 3 }); p.obj.userData = { npc: S.gente.length }; M.anim(p, 'idle'); S.mundo.add(p.obj); S.gente.push(p); }); }
    fp('niños'); S.palomas = GM.kit.palomas ? GM.kit.palomas(S.mundo, S.paseoBase.filter((_, i) => i % 37 === 5).slice(0, 8), 9) : null;
    S.multitud = null; S.fasePartido = null; S.partidoCasa = !!partido; S.rua = null;
    const libre = (x, z) => { const [i, j] = S.G.celda(x, z); return S.G.libre(i, j); };
    // Día de partido en casa: aficionados de pie alrededor de la puerta del pabellón
    if (partido && GM.kit.publico && S.ptoPab) {
      const r2 = rnd(U.hash(st.fecha + 'multitud')), fans = [];
      for (let i = 0, t = 0; i < 150 && t < 1500; t++) { const a = r2() * Math.PI * 2, d = 2 + r2() * 11, x = S.ptoPab[0] + Math.cos(a) * d, z = S.ptoPab[1] + Math.sin(a) * d; if (!libre(x, z)) continue; i++; fans.push({ x, y: 0.88, z, ry: Math.atan2(S.ptoPab[0] - x, S.ptoPab[1] - z) + (r2() - 0.5) * 1.4, ropa: r2() < 0.7 ? c1 : c2, piel: PIEL[(r2() * 5) | 0], pelo: PELO[(r2() * 6) | 0], pantalon: '#2f3640' }); }
      const P = GM.kit.publico(fans, 1, true); S.mundo.add(P.grupo); S.multitud = P;
    }
    // Rúa de campeones: la calle principal más cercana al pabellón cortada al tráfico, con multitud, autobús descapotable, confeti y fuegos
    if (GM.mods.rua && GM.mods.rua.activa(st) && GM.kit.publico && S.vias && S.vias.length) {
      const L = (S.vias || []).map(v => { let l = 0; const ac = [0]; for (let i = 0; i + 1 < v.p.length; i++) { l += Math.hypot(v.p[i + 1][0] - v.p[i][0], v.p[i + 1][1] - v.p[i][1]); ac.push(l); } return { v, L: l, acum: ac, d: Math.min(...v.p.map(q => Math.hypot(q[0] - S.ptoPab[0], q[1] - S.ptoPab[1]))) }; }).filter(v => v.L > 90).sort((a, b) => a.d - b.d)[0];
      if (L) {
        const r3 = rnd(U.hash(st.fecha + 'rua')), fans = [], hasta = Math.min(L.L, 260);
        for (let i = 0; i < 700; i++) { const s = r3() * hasta, [x, z, ux, uz] = punto(L, s), lado = i % 2 ? 1 : -1, off = ANCHO[L.v.k] / 2 + 1.5 + r3() * 2.4, px = x - uz * off * lado, pz = z + ux * off * lado; if (!libre(px, pz)) continue; fans.push({ x: px, y: 0.88, z: pz, ry: Math.atan2(x - px, z - pz) + (r3() - 0.5) * 0.7, ropa: r3() < 0.75 ? c1 : c2, piel: PIEL[(r3() * 5) | 0], pelo: PELO[(r3() * 6) | 0], pantalon: '#2f3640' }); }
        const P = GM.kit.publico(fans, 1, true); S.mundo.add(P.grupo);
        const bus = K().autobusRua(club, st.rua.nombre); S.mundo.add(bus);
        const jug = club.plantilla.map(i => st.jugadores[i]).filter(Boolean).sort((a, b) => b.ovr - a.ovr).slice(0, 6);
        const gente = await Promise.all(jug.map((j, k) => M.personaje({ modelo: ['h-casual_hoodie', 'h-casual_2', 'h-beach'][k % 3], altura: j.altura || 198, piel: PIEL[(U.hash(j.id) >>> 2) % 5], pelo: PELO[(U.hash(j.id) >>> 5) % 6], ropa: [c1, c2] })));
        gente.forEach((p, k) => { p.obj.position.set(-3.6 + k * 1.35, 2.62, k % 2 ? 0.55 : -0.55); p.obj.rotation.y = k % 2 ? 0 : Math.PI; M.anim(p, k % 3 === 0 ? 'interact-right' : 'emote-yes'); bus.add(p.obj); });
        const nn = 700, pos = new Float32Array(nn * 3), col = new Float32Array(nn * 3), cc = new THREE.Color(), cols = [c1, c2, '#ffd23f', '#ffffff'];
        for (let i = 0; i < nn; i++) { pos[i * 3] = (r3() - 0.5) * 30; pos[i * 3 + 1] = r3() * 10; pos[i * 3 + 2] = (r3() - 0.5) * 30; cc.set(cols[i % 4]); col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b; }
        const gC = new THREE.BufferGeometry(); gC.setAttribute('position', new THREE.BufferAttribute(pos, 3)); gC.setAttribute('color', new THREE.BufferAttribute(col, 3));
        const conf = new THREE.Points(gC, new THREE.PointsMaterial({ size: 0.2, vertexColors: true })); conf.userData = { rua: true }; conf.frustumCulled = false; S.mundo.add(conf);
        const p0 = punto(L, 0); S.rua = { vi: L, s: 0, hasta, bus, gente, conf, publico: P, fans, tCol: 0 };
        if (GM.arquitectura) GM.arquitectura.fuegos(S, S.mundo, [c1, c2, '#ffd23f', '#ffffff', '#ff6a1a'], r3, true, p0[0], p0[1]);
        if (GM.ui && GM.ui.toast) GM.ui.toast('¡Rúa de campeones! El autobús con el trofeo recorre ' + (L.v.nom || 'la avenida'));
      }
    }
    fp('multitud y rúa'); // Músico callejero
    S.musico = null; S.perros = []; S.chavales = null;
    if (S.musicoPos) { const mu = await M.personaje({ modelo: 'h-punk', altura: 176, piel: PIEL[1], pelo: PELO[0] }); mu.fijo = true; mu.rol = 'Músico callejero'; mu.obj.position.set(S.musicoPos[0], 0, S.musicoPos[1]); mu.obj.userData = { npc: S.gente.length }; M.anim(mu, 'idle'); S.mundo.add(mu.obj); S.gente.push(mu); }
    // Vecinos con perro
    S.gente.filter(p => p.peaton && !p.hincha && !p.nino && !p.sigue && !p.miembros && !p.rolEsp || p.rolEsp === 'jubilado').slice(0, alta ? 8 : 4).forEach((p, k) => { const d = perro(['#c8a06a', '#3a2a1a', '#f2efe8', '#8a8a8a', '#b5651d'][k % 5]); S.mundo.add(d); S.perros.push({ d, dueno: p, fase: k }); p.rol = 'Vecino paseando al perro'; });
    // Chavales en la canasta del parque
    if (S.parqueReal && S.aroParque) {
      const ch = await Promise.all([0, 1, 2].map(k => M.personaje({ modelo: ['h-casual_hoodie', 'm-casual', 'h-beach'][k], altura: 138 + k * 6, piel: PIEL[k + 1], pelo: PELO[k], ropa: k === 1 ? null : [c1, c2] })));
      const a = S.aroParque, pos = [[a.x - 3, a.z + 2.5], [a.x + 0.4, a.z + 3.4], [a.x - 1.2, a.z + 1.2]], balon = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), new THREE.MeshStandardMaterial({ color: 0xd9692b })); balon.castShadow = true; S.mundo.add(balon);
      ch.forEach((p, k) => { p.fijo = true; p.rol = 'Chaval del barrio'; p.obj.position.set(pos[k][0], 0, pos[k][1]); p.obj.userData = { npc: S.gente.length }; M.anim(p, 'idle'); S.mundo.add(p.obj); S.gente.push(p); });
      S.chavales = { ch, balon, t: 0, de: 0, a: 1, tiro: false };
    }
    fp('músico, perros y chavales'); // Coches por las calles reales
    S.coches = []; const vias = (S.vias || []).map(v => { let L = 0; const acum = [0]; for (let i = 0; i + 1 < v.p.length; i++) { L += Math.hypot(v.p[i + 1][0] - v.p[i][0], v.p[i + 1][1] - v.p[i][1]); acum.push(L); } let Lin = 0; for (let i = 0; i + 1 < v.p.length; i++) { const mx = (v.p[i][0] + v.p[i + 1][0]) / 2, mz = (v.p[i][1] + v.p[i + 1][1]) / 2; if (Math.hypot(mx, mz) < 240) Lin += Math.hypot(v.p[i + 1][0] - v.p[i][0], v.p[i + 1][1] - v.p[i][1]); } return { v, L, acum, Lin }; }).filter(v => v.Lin > 45).sort((a, b) => b.Lin - a.Lin);
    const nC = S.rua ? 0 : alta ? 16 : 9; for (let i = 0; i < nC && vias.length; i++) {
      const vi = vias[i % Math.min(vias.length, 14)], uno = !!vi.v.uno, dir = uno ? 1 : (i % 2 ? 1 : -1), obj = coche(COLORES[i % COLORES.length]); faros(obj); S.mundo.add(obj);
      S.coches.push({ obj, vi, dir, pos: r() * vi.L, vel: 0, len: 4.2, lane: ANCHO[vi.v.k] / 4 });
    }
    if (GM.nav && GM.nav.grafo && S.vias && S.vias.length) { const t0 = performance.now(); try { S.grafo = GM.nav.grafo(S.callesTodas && S.callesTodas.length > S.vias.length ? S.callesTodas : S.vias); S.grafoMs = performance.now() - t0; } catch (e) { S.grafo = null; } }
    // conductores: los primeros coches llevan a alguien al volante (sentado, con las manos en el volante)
    if (GM.animCodigo && !S.rua) { const cs = S.coches.filter(c => c.len === 4.2 && !c.bus).slice(0, alta ? 8 : 3); await Promise.all(cs.map(async (c, i) => { const cg = GM.catalogo ? GM.catalogo.generar(r, { pais: club.pais || '', mes: +String(st.fecha).slice(5, 7), temp: S.clima && S.clima.temp, edad: 'adulto' }) : { modelo: MODELOS[i % MODELOS.length] }; delete cg.gorra; delete cg.gorro; delete cg.mochila; delete cg.bolso; delete cg.abrigo; delete cg.falda; const p = await M.personaje(Object.assign(cg, { altura: 168 })); M.anim(p, 'sit'); GM.animCodigo.pose(p, 'conducir', 0); p.obj.position.set(0.4, 0.1, 0.12); p.obj.scale.multiplyScalar(0.8); p.obj.userData.conductor = true; c.obj.add(p.obj); c.conductor = p; })); }
    // motos que adelantan y furgoneta de reparto que se para a descargar
    if (!S.rua && GM.urbano && GM.urbano.moto && vias.length) {
      const cols = ['#2f8f7a', '#c0392b', '#e8e2d4', '#2f6f9e', '#f1c40f'];
      for (let i = 0; i < (alta ? 6 : 3); i++) { const vi = vias[i % Math.min(vias.length, 8)], obj = GM.urbano.moto(cols[i % cols.length]); const pil = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.5, 4, 8), new THREE.MeshStandardMaterial({ color: ['#1d2024', '#3b3b3b', '#5a1020'][i % 3] })); pil.position.set(0, 1.0, -0.1); obj.add(pil); S.mundo.add(obj); S.coches.push({ obj, vi, dir: vi.v.uno || i % 2 ? 1 : -1, pos: r() * vi.L, vel: 0, len: 2.2, lane: ANCHO[vi.v.k] / 4 - 0.7, vmax: 10 }); }
      if (GM.kit.coche && vias.length) { const vi = vias[0], obj = GM.kit.coche('#e8e8e8', 'furgoneta'); obj.userData.reparto = true; S.mundo.add(obj); S.coches.push({ obj, vi, dir: 1, pos: r() * vi.L, vel: 0, len: 5.4, lane: ANCHO[vi.v.k] / 4, vmax: 5, reparto: true, tParada: 0, tSig: 14 }); }
    }
    fp('coches y motos'); // taxis con su luz de techo
    if (!S.rua && vias.length) for (let i = 0; i < (alta ? 3 : 1); i++) { const vi = vias[(i * 2 + 1) % Math.min(vias.length, 10)], obj = coche('#f2c500'); const luz = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.24), new THREE.MeshStandardMaterial({ color: 0xfff3b0, emissive: 0xffe680, emissiveIntensity: 1.2 })); luz.position.set(0, 1.5, 0); obj.add(luz); S.mundo.add(obj); S.coches.push({ obj, vi, dir: vi.v.uno || i % 2 ? 1 : -1, pos: r() * vi.L, vel: 0, len: 4.4, lane: ANCHO[vi.v.k] / 4, vmax: 8, taxi: true }); }
    // coche de policía de patrulla y gatos en las aceras
    if (!S.rua && vias.length && alta) { const vi = vias[1 % vias.length], obj = coche('#f2f4f6'), l1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.2), new THREE.MeshStandardMaterial({ color: 0xff3030, emissive: 0xff2020, emissiveIntensity: 0.1 })), l2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.2), new THREE.MeshStandardMaterial({ color: 0x3060ff, emissive: 0x2050ff, emissiveIntensity: 0.1 })); l1.position.set(-0.3, 1.55, 0); l2.position.set(0.3, 1.55, 0); const franja = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.2, 2.2), new THREE.MeshStandardMaterial({ color: 0x1f3a6a })); franja.position.set(0, 0.62, 0); obj.add(l1, l2, franja); S.mundo.add(obj); S.coches.push({ obj, vi, dir: 1, pos: r() * vi.L, vel: 0, len: 4.4, lane: ANCHO[vi.v.k] / 4, vmax: 6.5, amb: true, lucesA: [l1, l2], patrulla: true }); }
    if (GM.kit.gato) for (let i = 0; i < (alta ? 6 : 3); i++) { const q = S.paseoBase[(r() * Math.min(S.paseoBase.length, 120)) | 0]; if (!q) continue; const g = GM.kit.gato(['#3b3b3b', '#c98d4f', '#f2efe8', '#7a6a5a', '#1d1d1d'][i % 5]); g.scale.setScalar(1.5); g.position.set(q[0] + 0.5, 0, q[1] + 0.5); g.rotation.y = r() * 6.28; g.userData = { gato: true }; S.mundo.add(g); }
    // autobús urbano: recorre la calle más larga y se para en las marquesinas; sube a los vecinos que esperan cerca y los baja en la siguiente
    if (!S.rua && vias.length && K().autobus) { const paradasDe = vi => (S.paradas || []).map(p => { let mejor = { d: 1e9, s: 0 }; for (let i = 0; i + 1 < vi.v.p.length; i++) { const a = vi.v.p[i], b = vi.v.p[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l)), d = Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz); if (d < mejor.d) mejor = { d, s: vi.acum[i] + t * Math.sqrt(l) }; } return mejor; }).filter(q => q.d < 24).map(q => q.s).sort((a, b) => a - b);
      let vi = vias[0], paradas = paradasDe(vi); vias.slice(0, 12).forEach(v0 => { const ps = paradasDe(v0); if (ps.length > paradas.length) { vi = v0; paradas = ps; } });
      { const rutas = vias.filter(v0 => v0.v.ruta && v0.L > 120).map(v0 => ({ v0, ps: paradasDe(v0) })).sort((x, y) => y.ps.length - x.ps.length || y.v0.L - x.v0.L); if (rutas.length) { vi = rutas[0].v0; paradas = rutas[0].ps; S.rutaBus = vi.v.ruta; } }   // el autobús sigue una ruta real si la ciudad tiene datos
      if (paradas.length < 2 && S.crearMarquesina) { for (let s = 10; s < vi.L - 10 && paradas.length < 3; s += 12) { const [x, z, ux, uz] = punto(vi, s), off = ANCHO[vi.v.k] / 2 + 1.5, bx = x - uz * off, bz = z + ux * off; if (Math.hypot(bx, bz) > 250 || paradas.some(p => Math.abs(p - s) < 70)) continue; const [ci, cj] = S.G.celda(bx, bz); if (!S.G.libre(ci, cj)) continue; S.crearMarquesina(bx, bz, Math.atan2(uz, -ux)); paradas.push(s); } paradas.sort((p, q) => p - q); }
      if (vi) { const obj = K().autobus(club); S.mundo.add(obj); S.coches.push({ obj, vi, dir: 1, pos: r() * vi.L, vel: 0, len: 10.5, lane: ANCHO[vi.v.k] / 4, vmax: 6, bus: true, paradas, tParada: 0, ultima: -1, pasajeros: [] }); } }
    // ciclistas por el borde de la calzada
    if (!S.rua && GM.urbano && GM.urbano.bici && vias.length) for (let i = 0; i < (alta ? 5 : 2); i++) { const vi = vias[(i + 2) % Math.min(vias.length, 10)], obj = GM.urbano.bici(['#d62d2d', '#2f6f9e', '#e9e5da', '#2e7d32'][i % 4]); const pil = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.5, 4, 8), new THREE.MeshStandardMaterial({ color: ['#1d2024', '#5a1020', '#2f4a6a'][i % 3] })); pil.position.set(0, 1.05, -0.05); obj.add(pil); S.mundo.add(obj); S.coches.push({ obj, vi, dir: vi.v.uno || i % 2 ? 1 : -1, pos: r() * vi.L, vel: 0, len: 1.8, lane: ANCHO[vi.v.k] / 2 - 0.9, vmax: 4.2, bici: true }); }
    S.viasCoche = vias; if (GM.movilidad) { try { GM.movilidad.poblar(S, M, st); } catch (e) { console.error('movilidad', e); } }
    fp('taxis, policía, gatos, autobús y ciclistas'); // clientes sentados en las terrazas
    if (S.sitios && S.sitios.length) { const cl = await Promise.all(S.sitios.map((q, k) => M.personaje({ modelo: MODELOS[(k * 5 + 2) % MODELOS.length], altura: 160 + k * 4, piel: PIEL[k % 5], pelo: PELO[(k * 2) % 6] })));
      cl.forEach((p, k) => { const q = S.sitios[k]; if (k % 3 === 2) { p.obj.visible = false; p.oculto = true; return; } p.fijo = true; p.rol = 'Cliente de la terraza'; p.obj.position.set(q.x, 0, q.z); p.obj.rotation.y = q.ry; p.asiento = 0.45; p.obj.userData = { npc: S.gente.length }; S.mundo.add(p.obj); M.anim(p, 'sit'); S.gente.push(p); }); }
    fp('terrazas'); S.tAmb = 40 + r() * 60;
    S.perfilCoches = true;
    // Multitud lejana en la GPU (multitud_gpu.js): cientos de peatones por las aceras con una sola llamada de dibujo; los cercanos son las personas de verdad
    if (!S.rua && GM.multGPU && vias.length && !(GM.campus && GM.campus.config.nivel === 'bajo')) S.multGPU = GM.multGPU.crear(S, vias, Math.round((alta ? 260 : 100) * (GM.campus && GM.campus.factorGente ? GM.campus.factorGente() : 1)), { bancos: S.bancosPos, puntos: S.paseoBase });
    fp('antes de calle viva'); if (GM.calleVida) { GM.calleVida.construir(S, M, st, { W: S.mundo, G: S.G, r, club }); await GM.calleVida.poblar(S, M, st); } fp('calle viva');
  }
  function punto(vi, s) {   // posición y tangente a la distancia s de la calle
    s = Math.max(0, Math.min(vi.L, s)); let i = 0; while (i + 2 < vi.acum.length && vi.acum[i + 1] < s) i++;
    const a = vi.v.p[i], b = vi.v.p[i + 1], l = (vi.acum[i + 1] - vi.acum[i]) || 1, t = (s - vi.acum[i]) / l, dx = (b[0] - a[0]) / l, dz = (b[1] - a[1]) / l;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, dx, dz];
  }
  // El autobús para: baja a quien llevaba (en esta parada) y sube a quien espera cerca
  function parada(S, M, c, sp) {
    const [bx, bz] = punto(c.vi, sp), t = (S.hora || 9);
    c.pasajeros.forEach(n => { n.oculto = false; n.dentro = false; n.obj.visible = true; n.obj.position.set(bx + 2.4, 0, bz + 1.5); n.espera = 1; }); c.pasajeros = [];
    S.gente.filter(n => n.peaton && !n.oculto && !n.fijo && !n.dentro && !n.enCasa && Math.hypot(n.obj.position.x - bx, n.obj.position.z - bz) < 16).slice(0, 2).forEach(n => { M.irA(n, bx + 1.2, bz + 1.4, () => { n.oculto = true; n.dentro = true; n.hasta = t + 0.5; c.pasajeros.push(n); }); });
  }
  // Ambulancia de vez en cuando: pasa deprisa con las luces en marcha
  function ambulancia(S, M) {
    if (!GM.kit.coche || !S.coches.length) return; const vias = [...new Set(S.coches.filter(c => !c.bici && !c.bus).map(c => c.vi))]; if (!vias.length) return;
    const vi = vias[(Math.random() * vias.length) | 0], obj = GM.kit.coche('#ffffff', 'furgoneta'), l1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.16, 0.2), new THREE.MeshStandardMaterial({ color: 0xff3030, emissive: 0xff2020, emissiveIntensity: 0.1 })), l2 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.16, 0.2), new THREE.MeshStandardMaterial({ color: 0x3060ff, emissive: 0x2050ff, emissiveIntensity: 0.1 }));
    l1.position.set(-0.4, 2.35, 1.2); l2.position.set(0.4, 2.35, 1.2); const cruz = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.35, 0.02), new THREE.MeshStandardMaterial({ color: 0xc0392b })); cruz.position.set(0, 1.1, 0); obj.add(l1, l2, cruz); S.mundo.add(obj);
    S.coches.push({ obj, vi, dir: 1, pos: 0, vel: 6, len: 5.6, lane: ANCHO[vi.v.k] / 4, vmax: 12, amb: true, lucesA: [l1, l2], reparto: true, unaVez: true });
  }
  // Fases del día de partido en casa: la cola en las taquillas y los grupos cantando junto a la peña (previa), el autobús del equipo y la salida del público
  async function fasePartido(S, M, st) {
    const h = S.hora || 9, f = h < 16 ? 'antes' : h < 20.5 ? 'previa' : h < 22.25 ? 'juego' : 'salida'; if (S.fasePartido === f || S.cambiandoFase || !GM.kit.publico || !S.ptoPab) return; S.cambiandoFase = true; S.fasePartido = f;
    const club = st.equipos[st.clubId], c1 = club.colores[0], c2 = club.colores[1] || '#222', r = rnd(U.hash(st.fecha + f)), { PIEL, PELO } = K(), P = S.partidoObj || (S.partidoObj = {}), quitar = k => { if (P[k]) { S.mundo.remove(P[k].grupo); P[k] = null; } };
    const libre = (x, z) => { const [i, j] = S.G.celda(x, z); return S.G.libre(i, j); }, fan = (x, z, ry) => ({ x, y: 0.88, z, ry, ropa: r() < 0.7 ? c1 : c2, piel: PIEL[(r() * 5) | 0], pelo: PELO[(r() * 6) | 0], pantalon: '#2f3640' });
    if (S.multitud) S.multitud.grupo.visible = f === 'previa' || f === 'juego';
    if (f === 'previa') {
      const cola = [], [px, pz] = S.ptoPab, fr = S.G; void fr; for (let t = 0; t < 400 && cola.length < 34; t++) { const a = r() * 6.28, d = 1.2 + r() * 3.2, x = px + Math.cos(a) * d, z = pz + Math.sin(a) * d; if (libre(x, z)) cola.push(fan(x, z, Math.atan2(px - x, pz - z))); }
      P.cola = GM.kit.publico(cola, 1, true); S.mundo.add(P.cola.grupo); P.colaT = 0;
      if (S.ptoPena) { const bar = [], [qx, qz] = S.ptoPena; for (let t = 0; t < 400 && bar.length < 24; t++) { const a = r() * 6.28, d = 0.8 + r() * 2.6, x = qx + Math.cos(a) * d, z = qz + Math.sin(a) * d; if (libre(x, z)) bar.push(fan(x, z, r() * 6.28)); } P.bares = GM.kit.publico(bar, 1, true); S.mundo.add(P.bares.grupo); }
    } else { quitar('cola'); quitar('bares'); }
    if (f === 'salida') { const sal = [], [px, pz] = S.ptoPab; for (let t = 0; t < 600 && sal.length < 120; t++) { const a = r() * 6.28, d = 1.5 + r() * 5, x = px + Math.cos(a) * d, z = pz + Math.sin(a) * d; if (libre(x, z)) sal.push(fan(x, z, r() * 6.28)); } P.salida = GM.kit.publico(sal, 1, true); S.mundo.add(P.salida.grupo); P.salidaT = 0; } else quitar('salida');
    S.cambiandoFase = false;
  }
  // A las 19:00 llega el autobús del equipo, se baja la plantilla y entra en el pabellón
  async function busEquipo(S, M, st) {
    const h = S.hora || 9; if (S.busEquipo || h < 19 || h >= 20.5 || !S.ptoPab || !K().autobusEquipo) return;
    const club = st.equipos[st.clubId], c1 = club.colores[0], c2 = club.colores[1] || '#222', { PIEL, PELO } = K(), [px, pz] = S.ptoPab;
    let mejor = null; (S.vias || []).forEach(v => { let L = 0; const ac = [0]; for (let i = 0; i + 1 < v.p.length; i++) { L += Math.hypot(v.p[i + 1][0] - v.p[i][0], v.p[i + 1][1] - v.p[i][1]); ac.push(L); } if (L < 70) return; const vi = { v, L, acum: ac }; for (let s = 0; s <= L; s += 4) { const q = punto(vi, s), d = Math.hypot(q[0] - px, q[1] - pz); if (!mejor || d < mejor.d) mejor = { vi, s, d }; } });
    if (!mejor || mejor.d > 40) return; const obj = K().autobusEquipo(club); S.mundo.add(obj); S.busEquipo = { obj, vi: mejor.vi, s: Math.max(0, mejor.s - 70), parar: mejor.s, fase: 'llega', t: 0, jugadores: [] };
    const jug = club.plantilla.map(i => st.jugadores[i]).filter(p => p && p.id !== 'yo').sort((a, b) => b.ovr - a.ovr).slice(0, 6);
    S.busEquipo.jugadores = await Promise.all(jug.map((j, k) => M.personaje({ modelo: ['h-casual_hoodie', 'h-casual_2', 'h-beach'][k % 3], altura: j.altura || 198, piel: PIEL[(U.hash(j.id) >>> 2) % 5], pelo: PELO[(U.hash(j.id) >>> 5) % 6], ropa: [c1, c2], escudo: { siglas: club.siglas, c1, c2, num: 2 + (U.hash(j.id) % 30) } }).then(p => { p.oculto = true; p.obj.visible = false; p.fijo = true; p.rol = 'Jugador del ' + club.siglas; p.obj.userData = { npc: S.gente.length }; S.mundo.add(p.obj); S.gente.push(p); return p; })));
    if (GM.ui && GM.ui.toast) GM.ui.toast('Llega el autobús del equipo al pabellón');
  }
  function moverPartido(S, M, dt) {
    const P = S.partidoObj, t = performance.now() / 1000;
    if (P) {
      if (P.cola) { P.colaT -= dt; if (P.colaT <= 0) { P.colaT = 0.15; P.cola.colocar(i => (Math.sin(t * 2 + i) > 0.85 ? { brazos: 0.6 } : null)); } }
      if (P.bares) { P.baresT = (P.baresT || 0) - dt; if (P.baresT <= 0) { P.baresT = 0.12; P.bares.colocar(i => { const v = Math.sin(t * 5 + i * 1.7); return v > 0.3 ? { salto: (v - 0.3) * 0.4, brazos: 1 } : null; }); } }
      if (P.salida) { P.salidaT += dt; P.salidaCad = (P.salidaCad || 0) - dt; if (P.salidaCad <= 0) { P.salidaCad = 0.1; P.salida.colocar(i => ({ salto: Math.max(0, Math.sin(t * 3 + i)) * 0.1, brazos: i % 5 === 0 ? 0.8 : 0 })); } }
    }
    const B = S.busEquipo; if (!B || !B.obj) return; B.t += dt;
    if (B.fase === 'llega') { B.s += dt * 7; const [x, z, ux, uz] = punto(B.vi, Math.min(B.s, B.parar)), off = ANCHO[B.vi.v.k] / 4; B.obj.position.set(x - uz * off, 0, z + ux * off); B.obj.rotation.y = Math.atan2(ux, uz); if (B.s >= B.parar) { B.fase = 'bajan'; B.t = 0; B.pos = [B.obj.position.x, B.obj.position.z]; if (S.multitud) S.multitud.saltaHasta = t + 12; } }
    else if (B.fase === 'bajan') { B.jugadores.forEach((p, k) => { if (B.t > k * 1.2 && !p.bajado) { p.bajado = true; p.oculto = false; p.obj.visible = true; p.obj.position.set(B.pos[0] + 2.2, 0, B.pos[1] + 1.6); M.irA(p, S.ptoPab[0] + (k - 2.5) * 0.7, S.ptoPab[1], () => { p.oculto = true; p.obj.visible = false; }); } }); if (B.t > 9) { B.fase = 'se_va'; B.s = B.parar; } }
    else if (B.fase === 'se_va') { B.s += dt * 7; const [x, z, ux, uz] = punto(B.vi, Math.min(B.s, B.vi.L)), off = ANCHO[B.vi.v.k] / 4; B.obj.position.set(x - uz * off, 0, z + ux * off); B.obj.rotation.y = Math.atan2(ux, uz); if (B.s >= B.vi.L - 1) { S.mundo.remove(B.obj); B.obj = null; B.fase = 'fuera'; } }
  }
  // Horario de los comercios (punto 37): abierto o con la persiana bajada según la hora, el día de la semana y el país
  function abierto(tipo, h, dow, pais) {
    if (tipo === 'bar' || tipo === 'pub') return dow !== 1 && (h >= 8 && h < 24.5 || h < 1.5); if (tipo === 'cafe') return h >= 7.5 && h < 22; if (tipo === 'restaurant') return (h >= 12.5 && h < 16.5) || (h >= 19.5 && h < 24);
    if (dow === 0 && pais !== 'US') return false; const siesta = pais === 'ES' || pais === 'IT' || pais === 'GR';
    if (pais === 'US') return h >= 9 && h < 21.5; if (pais === 'DE') return h >= 8 && h < 20; if (pais === 'FR') return (h >= 9 && h < 12.5) || (h >= 14 && h < 19.5); return siesta ? (h >= 9 && h < 14) || (h >= 17 && h < 20.5) : h >= 9 && h < 21; }
  // Giro en el cruce: al llegar al final de la calle el coche sigue por otra que pasa a menos de 5 m de ese punto (eligiendo al azar)
  function giro(S, c) {
    const fin = c.pos > c.vi.L ? c.vi.L : 0, [ex, ez] = punto(c.vi, fin), cand = [];
    (S.viasCoche || []).forEach(v => { if (v === c.vi) return; let mejor = { d: 1e9, s: 0 }; for (let i = 0; i + 1 < v.v.p.length; i++) { const a = v.v.p[i], b = v.v.p[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1e-9, u = Math.max(0, Math.min(1, ((ex - a[0]) * dx + (ez - a[1]) * dz) / l2)), d = Math.hypot(ex - a[0] - u * dx, ez - a[1] - u * dz); if (d < mejor.d) mejor = { d, s: v.acum[i] + u * Math.sqrt(l2) }; } if (mejor.d < 5) cand.push({ v, s: mejor.s }); });
    if (!cand.length) return false; const q = cand[(Math.random() * cand.length) | 0], dir = q.s < 3 ? 1 : q.s > q.v.L - 3 ? -1 : (Math.random() < 0.5 ? 1 : -1);
    c.vi = q.v; c.pos = q.s; c.dir = q.v.v.uno ? 1 : dir; c.lane = ANCHO[q.v.v.k] / 4; return true;
  }
  function actualizar(S, M, dt) {
    if (S.tiendas && S.tiendas.length && S.st) { S.tTienda = (S.tTienda || 0) - dt; if (S.tTienda <= 0) { S.tTienda = 1; const h = S.hora || 12, dow = new Date(String(S.st.fecha).slice(0, 10) + 'T12:00:00').getDay(), pais = (S.st.equipos[S.st.clubId] || {}).pais; S.tiendas.forEach(t => { const ab = abierto(t.tipo, h, dow, pais); t.pr.visible = !ab; t.v.visible = ab || true; }); const luz = 0.1 + 0.9 * Math.min(1, Math.max(0, S.noche || 0)); (S.matsTienda || []).forEach(m => { m.emissiveIntensity = luz; }); } }
    if (S.multGPU) S.multGPU.actualizar(performance.now() / 1000, S.foco, S.hora);
    if (S.chunks) S.chunks.paso([[S.foco.x, S.foco.z], [S.camera.position.x, S.camera.position.z]], 4);   // ciudad por trozos: construye y descarta celdas de edificios según la distancia
    const t = performance.now() / 1000;
    if (S.partidoCasa) { S.tFase = (S.tFase || 0) - dt; if (S.tFase <= 0) { S.tFase = 1; fasePartido(S, M, S.st); busEquipo(S, M, S.st); } }
    moverPartido(S, M, dt);
    S.tAmb = (S.tAmb || 80) - dt; if (S.tAmb <= 0) { S.tAmb = 90 + Math.random() * 120; if (Math.random() < 0.6) ambulancia(S, M); }
    if (GM.calleVida) { GM.calleVida.actualizar(S, M, dt); (S.puebloAnim || []).forEach(f => f(t)); }
    if (GM.arquitectura && GM.arquitectura.aguaMover) GM.arquitectura.aguaMover(t);
    if (S.yo && S.rec) { S.rec.p.value.set(S.yo.obj.position.x, 1.1, S.yo.obj.position.z); S.rec.c.value.copy(S.camera.position); }
    // Nombre de la calle donde estás
    S.tCalle = (S.tCalle || 0) - dt;
    if (S.tCalle <= 0 && S.yo && S.calles) {
      S.tCalle = 0.6; const x = S.yo.obj.position.x, z = S.yo.obj.position.z; let m = null, md = 1e9;
      for (const c of S.calles) { const bb = c.bb || (c.bb = [Math.min(...c.p.map(q => q[0])), Math.min(...c.p.map(q => q[1])), Math.max(...c.p.map(q => q[0])), Math.max(...c.p.map(q => q[1]))]); if (x < bb[0] - 14 || x > bb[2] + 14 || z < bb[1] - 14 || z > bb[3] + 14) continue;
        for (let i = 0; i + 1 < c.p.length; i++) { const a = c.p[i], b = c.p[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l = dx * dx + dz * dz || 1e-9, u = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l)), d = Math.hypot(x - a[0] - u * dx, z - a[1] - u * dz) - ANCHO[c.k] / 2; if (d < md) { md = d; m = c.nom; } } }
      if (m && md < 12 && m !== S.calleNombre) { S.calleNombre = m; const el = document.querySelector('.sede-top .ct b'); if (el) el.textContent = m; }
    }
    if (S.palomas && S.yo) { const am = [[S.yo.obj.position.x, S.yo.obj.position.z]]; S.gente.forEach(n => { if (n.rapido && n.camino && n.camino.length && !n.oculto) am.push([n.obj.position.x, n.obj.position.z]); }); S.palomas.actualizar(dt, am, t); }
    S.perros && S.perros.forEach(p => {
      const o = p.dueno.obj, d = p.d, f = o.rotation.y, tx = o.position.x - Math.sin(f) * 0.9 + Math.cos(f) * 0.5, tz = o.position.z - Math.cos(f) * 0.9 - Math.sin(f) * 0.5, dx = tx - d.position.x, dz = tz - d.position.z, l = Math.hypot(dx, dz);
      d.position.x += dx * Math.min(1, dt * 4); d.position.z += dz * Math.min(1, dt * 4); d.visible = o.visible && !p.dueno.oculto; if (l > 0.05) d.rotation.y = Math.atan2(dx, dz); p.fase += dt * (l > 0.1 ? 14 : 3);
      d.userData.patas.forEach((pt, i) => { pt.rotation.x = Math.sin(p.fase + (i % 2 ? Math.PI : 0)) * (l > 0.1 ? 0.6 : 0.05); });
    });
    if (S.chavales) {
      const C = S.chavales, ch = C.ch; C.t += dt; ch.forEach(p => p.mixer.update(dt));
      const de = ch[C.de].obj.position, a = C.tiro ? S.aroParque : ch[C.a].obj.position, dur = C.tiro ? 1.0 : 0.8, u = Math.min(1, C.t / dur);
      C.balon.position.set(de.x + (a.x - de.x) * u, C.tiro ? 1.2 + (2.85 - 1.2) * u + Math.sin(u * Math.PI) * 1.6 : 1.0 + Math.abs(Math.sin(u * Math.PI * 2)) * 0.2, de.z + (a.z - de.z) * u);
      ch[C.de].obj.lookAt(a.x, 0, a.z);
      if (u >= 1) { C.t = 0; if (C.tiro) { C.tiro = false; C.de = 2; C.a = (Math.random() * 2) | 0; } else { C.de = C.a; C.tiro = Math.random() < 0.35; C.a = C.tiro ? 0 : [0, 1, 2].filter(k => k !== C.de)[(Math.random() * 2) | 0]; } }
    }
    if (S.rua) {
      const R = S.rua; R.s += dt * 2.2; if (R.s > R.hasta) R.s = 0; const [bx, bz, ux, uz] = punto(R.vi, R.s);
      R.bus.position.set(bx, 0, bz); R.bus.rotation.y = Math.atan2(ux, uz) - Math.PI / 2; R.conf.position.set(bx, 0, bz); R.gente.forEach(p => p.mixer.update(dt));
      const a = R.conf.geometry.attributes.position; for (let i = 0; i < a.count; i++) { let y = a.getY(i) - dt * (0.7 + (i % 5) * 0.18); if (y < 0.05) y += 10; a.setY(i, y); a.setX(i, a.getX(i) + Math.sin(t * 1.7 + i) * dt * 0.5); } a.needsUpdate = true;
      R.tCol -= dt; if (R.tCol <= 0) { R.tCol = 0.12; R.publico.colocar(i => { const f = R.fans[i], cerca = Math.hypot(f.x - bx, f.z - bz) < 16, v = Math.sin(t * (cerca ? 7 : 3) + i * 2.3); return cerca ? { salto: Math.max(0, v) * 0.35, brazos: 1 } : v > 0.9 ? { brazos: 0.6 } : null; }); }
    }
    if (S.multitud) { S.tMult = (S.tMult || 0) - dt; if (S.tMult <= 0) { S.tMult = 0.12; S.multitud.colocar(i => { const v = Math.sin(t * 3 + i * 1.7); return v > 0.72 ? { salto: (v - 0.72) * 0.6, brazos: 1 } : null; }); } }
    if (!S.coches) return;
    if (GM.movilidad) GM.movilidad.actualizar(S, M, dt);
    const gente = S.gente.concat(S.yo && !S.yo.oculto ? [S.yo] : []).concat(S.conduciendo && S.cond ? [{ obj: { position: { x: S.cond.x, z: S.cond.z } } }] : []);
    const MV = GM.movilidad, hh = S.hora || 12, dd = S.st ? new Date(String(S.st.fecha).slice(0, 10) + 'T12:00:00').getDay() : 3, dens = MV ? MV.densidad(hh, dd) : 1, fvel = MV ? MV.factorVel(hh, dd) : 1;
    if (S.coches.some(c => c.borrar)) S.coches = S.coches.filter(c => !c.borrar);
    S.coches.forEach(c => {
      if (c.k !== undefined) { const act = c.k <= dens; if (c.obj.visible !== act) c.obj.visible = act; if (!act) { c.vel = 0; return; } }
      const [x, z, ux, uz] = punto(c.vi, c.pos), tx = ux * c.dir, tz = uz * c.dir, ox = -tz * c.lane, oz = tx * c.lane;
      let objetivo = (c.vmax || 7) * (c.bici ? 1 : fvel);
      if (c.paraAleatorio && !c.bus) { if (c.tParada > 0) { c.tParada -= dt; objetivo = 0; } else { c.tSig = (c.tSig === undefined ? 30 : c.tSig) - dt; if (c.tSig <= 0) { c.tParada = 6 + Math.random() * 6; c.tSig = 35 + Math.random() * 60; } } }
      if (c.reparto) { if (c.tParada > 0) { c.tParada -= dt; objetivo = 0; } else { c.tSig -= dt; if (c.tSig <= 0) { c.tParada = 6; c.tSig = 22; } } }
      for (const p of gente) { const o = p.obj.position, ax = o.x - (x + ox), az = o.z - (z + oz), lon = ax * tx + az * tz - c.len / 2, lat = Math.abs(-ax * tz + az * tx); if (lat < 1.3 && lon > -0.3 && lon < 6.5 && !p.oculto) objetivo = Math.min(objetivo, Math.max(0, (lon - 1.4) * 1.5)); }
      if (S.semaforos && S.semaforos.length && !c.reparto) for (const sm of S.semaforos) { if (sm.fase === S.semFase) continue; if (tx * sm.ax + tz * sm.az < 0.8) continue; const ax = sm.x - (x + ox), az = sm.z - (z + oz), lon = ax * tx + az * tz - c.len / 2, lat = Math.abs(-ax * tz + az * tx); if (lat < 7 && lon > -0.3 && lon < 9) objetivo = Math.min(objetivo, Math.max(0, (lon - 0.8) * 1.2)); }
      for (const o of S.coches) { if (o === c || o.vi !== c.vi || o.dir !== c.dir || o.obj.visible === false) continue; const gap = c.dir * (o.pos - c.pos) - c.len; if (gap > 0 && gap < 6) objetivo = Math.min(objetivo, Math.max(0, gap - 1.5)); }
      if (c.bus && c.paradas) {
        if (c.tParada > 0) { c.tParada -= dt; objetivo = 0; } else for (const sp of c.paradas) { const dd = c.dir * (sp - c.pos); if (dd > 0 && dd < 14) objetivo = Math.min(objetivo, Math.max(0.5, dd * 0.5)); if (dd > -0.4 && dd < 1 && c.vel < 1.5 && c.ultima !== sp) { c.tParada = 6; c.ultima = sp; parada(S, M, c, sp); } }
      }
      c.vel += Math.max(-9 * dt, Math.min(3 * dt, objetivo - c.vel)); c.pos += c.dir * c.vel * dt;
      if (c.bici && c.obj.userData.ruedas) c.obj.userData.ruedas.forEach(w => { w.rotation.x += c.vel * dt / 0.34; });
      if (c.amb) { c.obj.userData.sirena = (c.obj.userData.sirena || 0) + dt; const f = Math.sin(c.obj.userData.sirena * 14) > 0; if (c.lucesA) { c.lucesA[0].material.emissiveIntensity = f ? 3 : 0.1; c.lucesA[1].material.emissiveIntensity = f ? 0.1 : 3; } }
      if (c.unaVez && c.pos > c.vi.L - 2) { S.mundo.remove(c.obj); c.borrar = true; }
      if ((c.pos > c.vi.L || c.pos < 0) && !c.bici && !c.unaVez && !c.reparto && !c.bus && giro(S, c)) { /* gira a otra calle */ } else if (c.pos > c.vi.L) c.pos = 0; else if (c.pos < 0) c.pos = c.vi.L;
      const [x2, z2, ux2, uz2] = punto(c.vi, c.pos), tx2 = ux2 * c.dir, tz2 = uz2 * c.dir;
      c.obj.position.set(x2 - tz2 * c.lane, -0.0, z2 + tx2 * c.lane); c.obj.rotation.y = Math.atan2(tx2, tz2);
    });
  }
  GM.register('calleRealVida', { poblar, actualizar });
})();
