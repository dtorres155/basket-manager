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

  async function poblar(S, M, st) {
    const { MODELOS, PIEL, PELO, coche, perro } = K();
    const club = st.equipos[st.clubId], ciu = (st.ciudad && st.ciudad[st.clubId]) || { aficion: 50 }, afi = ciu.aficion || 50, partido = S.dia && S.dia.tipo === 'partido' && S.dia.casa;
    const n = partido ? 40 : 32, r = rnd(U.hash(st.fecha + 'vecinos')), c1 = club.colores[0], c2 = club.colores[1] || '#222', alta = !GM.campus || !GM.campus.config || GM.campus.config.calidad !== 'normal';
    const lista = await Promise.all(Array.from({ length: n }, () => { const hincha = r() * 100 < afi * (partido ? 1.4 : 0.6); return M.personaje({ modelo: MODELOS[(r() * MODELOS.length) | 0], altura: 158 + r() * 30, piel: PIEL[(r() * 5) | 0], pelo: PELO[(r() * 6) | 0], ropa: hincha ? [c1, c2] : null }).then(p => { p.hincha = hincha; return p; }); }));
    lista.forEach((p, k) => {
      const q = S.paseo[(r() * S.paseo.length) | 0]; p.obj.position.set(q[0] + (r() - 0.5), 0, q[1] + (r() - 0.5) * 0.6);
      Object.assign(p, { peaton: true, rol: p.hincha ? 'Aficionado del ' + club.siglas : 'Vecino de ' + club.ciudad, r: rnd(U.hash(st.fecha + 'p' + k)), espera: r() * 3 });
      p.obj.userData = { npc: S.gente.length }; M.anim(p, 'idle'); S.mundo.add(p.obj); S.gente.push(p);
    });
    S.destinos = null;
    { const ninos = await Promise.all(Array.from({ length: 6 }, (_, k) => M.personaje({ modelo: ['h-casual_hoodie', 'h-casual_2', 'm-casual'][k % 3], altura: 118 + r() * 26, piel: PIEL[(r() * 5) | 0], pelo: PELO[(r() * 6) | 0], ropa: k % 2 ? [c1, c2] : null })));
      ninos.forEach((p, k) => { const q = S.paseo[(r() * S.paseo.length) | 0]; p.obj.position.set(q[0], 0, q[1]); Object.assign(p, { peaton: true, nino: true, rol: 'Chaval que va al colegio', r: rnd(U.hash(st.fecha + 'n' + k)), espera: r() * 3 }); p.obj.userData = { npc: S.gente.length }; M.anim(p, 'idle'); S.mundo.add(p.obj); S.gente.push(p); }); }
    S.palomas = GM.kit.palomas ? GM.kit.palomas(S.mundo, S.paseoBase.filter((_, i) => i % 37 === 5).slice(0, 8), 9) : null;
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
    // Músico callejero
    S.musico = null; S.perros = []; S.chavales = null;
    if (S.musicoPos) { const mu = await M.personaje({ modelo: 'h-punk', altura: 176, piel: PIEL[1], pelo: PELO[0] }); mu.fijo = true; mu.rol = 'Músico callejero'; mu.obj.position.set(S.musicoPos[0], 0, S.musicoPos[1]); mu.obj.userData = { npc: S.gente.length }; M.anim(mu, 'idle'); S.mundo.add(mu.obj); S.gente.push(mu); }
    // Vecinos con perro
    S.gente.filter(p => p.peaton && !p.hincha && !p.nino).slice(0, 3).forEach((p, k) => { const d = perro(['#c8a06a', '#3a2a1a', '#f2efe8'][k]); S.mundo.add(d); S.perros.push({ d, dueno: p, fase: k }); p.rol = 'Vecino paseando al perro'; });
    // Chavales en la canasta del parque
    if (S.parqueReal && S.aroParque) {
      const ch = await Promise.all([0, 1, 2].map(k => M.personaje({ modelo: ['h-casual_hoodie', 'm-casual', 'h-beach'][k], altura: 138 + k * 6, piel: PIEL[k + 1], pelo: PELO[k], ropa: k === 1 ? null : [c1, c2] })));
      const a = S.aroParque, pos = [[a.x - 3, a.z + 2.5], [a.x + 0.4, a.z + 3.4], [a.x - 1.2, a.z + 1.2]], balon = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), new THREE.MeshStandardMaterial({ color: 0xd9692b })); balon.castShadow = true; S.mundo.add(balon);
      ch.forEach((p, k) => { p.fijo = true; p.rol = 'Chaval del barrio'; p.obj.position.set(pos[k][0], 0, pos[k][1]); p.obj.userData = { npc: S.gente.length }; M.anim(p, 'idle'); S.mundo.add(p.obj); S.gente.push(p); });
      S.chavales = { ch, balon, t: 0, de: 0, a: 1, tiro: false };
    }
    // Coches por las calles reales
    S.coches = []; const vias = (S.vias || []).map(v => { let L = 0; const acum = [0]; for (let i = 0; i + 1 < v.p.length; i++) { L += Math.hypot(v.p[i + 1][0] - v.p[i][0], v.p[i + 1][1] - v.p[i][1]); acum.push(L); } return { v, L, acum }; }).filter(v => v.L > 45).sort((a, b) => b.L - a.L);
    const nC = S.rua ? 0 : alta ? 16 : 9; for (let i = 0; i < nC && vias.length; i++) {
      const vi = vias[i % Math.min(vias.length, 14)], uno = !!vi.v.uno, dir = uno ? 1 : (i % 2 ? 1 : -1), obj = coche(COLORES[i % COLORES.length]); S.mundo.add(obj);
      S.coches.push({ obj, vi, dir, pos: r() * vi.L, vel: 0, len: 4.2, lane: ANCHO[vi.v.k] / 4 });
    }
    S.perfilCoches = true;
  }
  function punto(vi, s) {   // posición y tangente a la distancia s de la calle
    s = Math.max(0, Math.min(vi.L, s)); let i = 0; while (i + 2 < vi.acum.length && vi.acum[i + 1] < s) i++;
    const a = vi.v.p[i], b = vi.v.p[i + 1], l = (vi.acum[i + 1] - vi.acum[i]) || 1, t = (s - vi.acum[i]) / l, dx = (b[0] - a[0]) / l, dz = (b[1] - a[1]) / l;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, dx, dz];
  }
  function actualizar(S, M, dt) {
    const t = performance.now() / 1000;
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
    const gente = S.gente.concat(S.yo ? [S.yo] : []);
    S.coches.forEach(c => {
      const [x, z, ux, uz] = punto(c.vi, c.pos), tx = ux * c.dir, tz = uz * c.dir, ox = -tz * c.lane, oz = tx * c.lane;
      let objetivo = 7;
      for (const p of gente) { const o = p.obj.position, ax = o.x - (x + ox), az = o.z - (z + oz), lon = ax * tx + az * tz - c.len / 2, lat = Math.abs(-ax * tz + az * tx); if (lat < 1.3 && lon > -0.3 && lon < 6.5 && !p.oculto) objetivo = Math.min(objetivo, Math.max(0, (lon - 1.4) * 1.5)); }
      for (const o of S.coches) { if (o === c || o.vi !== c.vi || o.dir !== c.dir) continue; const gap = c.dir * (o.pos - c.pos) - c.len; if (gap > 0 && gap < 6) objetivo = Math.min(objetivo, Math.max(0, gap - 1.5)); }
      c.vel += Math.max(-9 * dt, Math.min(3 * dt, objetivo - c.vel)); c.pos += c.dir * c.vel * dt;
      if (c.pos > c.vi.L) c.pos = 0; else if (c.pos < 0) c.pos = c.vi.L;
      const [x2, z2, ux2, uz2] = punto(c.vi, c.pos), tx2 = ux2 * c.dir, tz2 = uz2 * c.dir;
      c.obj.position.set(x2 - tz2 * c.lane, -0.0, z2 + tx2 * c.lane); c.obj.rotation.y = Math.atan2(tx2, tz2);
    });
  }
  GM.register('calleRealVida', { poblar, actualizar });
})();
