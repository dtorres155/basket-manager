/* ESTADIO 3D (GM.mods.estadio) v2 — pabellón con interior evolutivo
   Expone: aforo, nivelLuz, mejorasDisponibles, mejorar, efectos, mantenimiento, mount, unmount, selfTest.
   Escribe state.instalaciones[clubId].pabellon = { aforo (base), mejoras: [ids], obras: [{ id, fin, inicio }] }.
   Las mejoras se ven en la vista: gradas y segundo anillo, asientos con los colores del club, parquet con escudo, iluminación en 4 niveles
   (lámparas, LED, haces de luz, espectáculo con pantallas), videomarcador, palcos VIP y cubierta. Los banderines cuelgan según títulos y camisetas retiradas. */
(function () {
  const U = GM.util;
  const MEJ = [
    { id: 'grada1', nombre: 'Ampliar grada (fase 1)', coste: 2.5e6, dias: 60, ef: { aforoPct: 0.08 }, desc: '+8 % de aforo.' },
    { id: 'grada2', nombre: 'Ampliar grada (fase 2)', coste: 4e6, dias: 75, req: 'grada1', ef: { aforoPct: 0.08 }, desc: '+8 % de aforo.' },
    { id: 'grada3', nombre: 'Ampliar grada (fase 3)', coste: 6e6, dias: 90, req: 'grada2', ef: { aforoPct: 0.08 }, desc: '+8 % de aforo.' },
    { id: 'asientos', nombre: 'Asientos con los colores del club', coste: 1.2e6, dias: 30, ef: { ambiente: 0.02 }, desc: 'La grada se ve y se siente tuya.' },
    { id: 'parquet', nombre: 'Parquet nuevo con escudo', coste: 1.5e6, dias: 25, ef: { ambiente: 0.02 }, desc: 'Pista renovada con el escudo en el centro.' },
    { id: 'luz1', nombre: 'Iluminación LED', coste: 1.8e6, dias: 35, ef: { ambiente: 0.03, asistencia: 0.01 }, desc: 'Luz uniforme y mejor imagen.' },
    { id: 'luz2', nombre: 'Presentación con luces', coste: 2.8e6, dias: 45, req: 'luz1', ef: { ambiente: 0.04, asistencia: 0.02 }, desc: 'Haces de luz y presentación de jugadores.' },
    { id: 'luz3', nombre: 'Espectáculo de luces y pantallas', coste: 4.5e6, dias: 60, req: 'luz2', ef: { ambiente: 0.06, asistencia: 0.03 }, desc: 'Pantallas, bandas LED y show completo.' },
    { id: 'marcador', nombre: 'Videomarcador', coste: 1.5e6, dias: 30, ef: { asistencia: 0.03 }, desc: 'Más espectáculo: algo más de público.' },
    { id: 'vip', nombre: 'Palcos VIP', coste: 3e6, dias: 60, ef: { precio: 0.12 }, desc: 'Las entradas se pagan un 12 % más caras de media.' },
    { id: 'cubierta', nombre: 'Cubierta y acústica', coste: 3.5e6, dias: 70, ef: { asistencia: 0.04, ambiente: 0.02 }, desc: 'El ambiente suena más fuerte.' },
    { id: 'tienda', nombre: 'Tienda oficial', coste: 1e6, dias: 30, ef: { merch: 0.25 }, desc: '+25 % de ingresos de merchandising.' },
    { id: 'accesos', nombre: 'Accesos y aparcamiento', coste: 2e6, dias: 45, ef: { asistencia: 0.03 }, desc: 'Entrar y salir es más fácil.' }
  ];
  let V = null;
  const escala = (st, id) => U.clamp(st.equipos[id].presupuesto / 60e6, 0.3, 8);
  const obrasM = (st, id) => GM.mods.ciudad ? GM.mods.ciudad.modificadores(st, id).obras : 1;
  const pab = (st, id) => st.instalaciones[id].pabellon;
  const coste = (st, id, m) => Math.round(m.coste * escala(st, id) * Math.max(0.5, obrasM(st, id)) / 1000) * 1000;
  const tiene = (p, x) => p.mejoras.indexOf(x) >= 0;

  function sumar(p, k) { let s = 0; p.mejoras.forEach(i => { const m = MEJ.find(x => x.id === i); if (m && m.ef[k]) s += m.ef[k]; }); return s; }
  function aforo(st, clubId) {
    const p = st.instalaciones[clubId] && st.instalaciones[clubId].pabellon;
    if (!p) return st.equipos[clubId].pabellon.aforo;
    const pct = sumar(p, 'aforoPct');
    return pct ? Math.round(p.aforo * (1 + pct) / 10) * 10 : p.aforo;
  }
  function nivelLuz(st, clubId) { const p = pab(st, clubId); return tiene(p, 'luz3') ? 3 : tiene(p, 'luz2') ? 2 : tiene(p, 'luz1') ? 1 : 0; }
  function efectos(st, clubId) {
    const p = st.instalaciones && st.instalaciones[clubId] && st.instalaciones[clubId].pabellon;
    if (!p) return { precio: 1, merch: 1, asistencia: 1, ambiente: 1 };
    return { precio: 1 + sumar(p, 'precio'), merch: 1 + sumar(p, 'merch'), asistencia: 1 + sumar(p, 'asistencia'), ambiente: 1 + sumar(p, 'ambiente') };
  }
  function mantenimiento(st, id) { const p = st.instalaciones && st.instalaciones[id] && st.instalaciones[id].pabellon; return p ? Math.round(p.mejoras.length * 9000 * escala(st, id)) : 0; }
  const progreso = (st, o) => U.clamp(U.diffDays(o.inicio || U.addDays(o.fin, -60), st.fecha) / Math.max(1, U.diffDays(o.inicio || U.addDays(o.fin, -60), o.fin)), 0, 1);
  function mejorasDisponibles(st, clubId) {
    const p = pab(st, clubId);
    return MEJ.map(m => {
      const hecha = tiene(p, m.id), obra = p.obras.find(o => o.id === m.id);
      let estado = 'disponible', motivo = null;
      if (hecha) estado = 'hecha'; else if (obra) { estado = 'en obras'; motivo = Math.round(progreso(st, obra) * 100) + ' %, termina el ' + U.fechaLarga(obra.fin); }
      else if (m.req && !tiene(p, m.req)) { estado = 'bloqueada'; motivo = 'Requiere la fase anterior'; }
      return Object.assign({}, m, { coste: coste(st, clubId, m), estado, motivo });
    });
  }
  function mejorar(st, clubId, id) {
    const m = mejorasDisponibles(st, clubId).find(x => x.id === id);
    if (!m) return { ok: false, motivo: 'Mejora desconocida.' };
    if (m.estado !== 'disponible') return { ok: false, motivo: m.motivo || 'Ya está hecha.' };
    if (pab(st, clubId).obras.length >= 2) return { ok: false, motivo: 'Solo puedes tener 2 obras a la vez.' };
    const F = GM.mods.finanzas;
    if (F && st.finanzas[clubId].caja < m.coste) return { ok: false, motivo: 'No hay caja para ' + U.eur(m.coste) + '.' };
    if (F) F.registrar(st, clubId, 'Obra en el pabellón: ' + m.nombre, -m.coste);
    pab(st, clubId).obras.push({ id, inicio: st.fecha, fin: U.addDays(st.fecha, m.dias) });
    if (clubId === st.clubId) GM.noticia(st, 'Empiezan las obras: ' + m.nombre + ' (' + m.dias + ' días).');
    return { ok: true };
  }
  GM.bus.on('dia:avanzado', function () {
    const st = GM.state; if (!st || !st.instalaciones) return;
    Object.keys(st.instalaciones).forEach(id => {
      const p = st.instalaciones[id].pabellon; if (!p || !p.obras.length) return;
      p.obras.filter(o => o.fin <= st.fecha).forEach(o => {
        p.mejoras.push(o.id);
        const m = MEJ.find(x => x.id === o.id);
        if (id === st.clubId) GM.noticia(st, 'Obra terminada en el pabellón: ' + m.nombre + '.');
        GM.bus.emit('instalacion:mejorada', { clubId: id, tipo: o.id, nivel: p.mejoras.length });
      });
      p.obras = p.obras.filter(o => o.fin > st.fecha);
    });
    if (V && V.st === st && V.refrescar) { try { V.refrescar(); } catch (e) { } }
  });
  function nuevaPartida(st) {
    Object.keys(st.equipos).forEach(id => {
      st.instalaciones[id] = st.instalaciones[id] || {};
      st.instalaciones[id].pabellon = { aforo: st.equipos[id].pabellon.aforo, mejoras: [], obras: [] };
    });
  }

  // ---------- Vista 3D ----------
  const col = hex => GM.kit.color(hex);
  function parquet(S, logo) {
    const CP = GM.campus, t = CP.tex('parq' + S.c1 + S.c2 + (logo ? S.sig : ''), 512, 256, (x, W, H) => {
      for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#c98d4f' : '#bf8346'; x.fillRect(0, i * 16, W, 16); }
      x.strokeStyle = '#fff'; x.lineWidth = 3;
      if (logo) { x.fillStyle = CP.hex(S.c1); x.globalAlpha = 0.55; x.fillRect(8, H / 2 - 44, 100, 88); x.fillRect(W - 108, H / 2 - 44, 100, 88); x.globalAlpha = 1; }
      x.strokeRect(6, 6, W - 12, H - 12); x.beginPath(); x.moveTo(W / 2, 6); x.lineTo(W / 2, H - 6); x.stroke(); x.beginPath(); x.arc(W / 2, H / 2, 34, 0, 6.3); x.stroke();
      x.strokeRect(6, H / 2 - 44, 100, 88); x.strokeRect(W - 106, H / 2 - 44, 100, 88);
      if (logo) { x.fillStyle = CP.hex(S.c1); x.beginPath(); x.arc(W / 2, H / 2, 28, 0, 6.3); x.fill(); x.fillStyle = '#fff'; x.font = 'bold 22px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(S.sig, W / 2, H / 2 + 1); }
    });
    return t;
  }
  function escena(st, id) {
    const K = GM.kit, v = V.vista, eq = st.equipos[id], p = pab(st, id), CP = GM.campus, T = THREE;
    const S = { c1: col(eq.colores[0] === '#000000' ? '#333333' : eq.colores[0]), c2: col(eq.colores[1] || '#ffffff'), sig: eq.siglas };
    const af = aforo(st, id), luz = nivelLuz(st, id), inte = V.modo === 'interior', partido = V.luces === 'partido';
    const h = U.hash(id), FORMAS = { 'fc-barcelona': 'gable', 'joventut-badalona': 'barril', 'real-madrid': 'redondo' }, forma = FORMAS[id] || ['caja', 'barril', 'gable', 'redondo'][h % 4], barril = forma === 'barril';
    v.limpiar(V.mundo); const W = V.mundo, L = 9, ZW = 5.2;
    const filas = U.clamp(Math.round(Math.min(af, 9000) / 1500) + 2, 3, 8), sup = af > 9000 ? U.clamp(Math.round((af - 9000) / 1500), 1, 5) : 0;
    W.add(K.caja(70, 0.1, 70, 0x9aa5ad, 0, -0.1, 0));
    // pista
    const pt = parquet(S, tiene(p, 'parquet'));
    const pm = new T.Mesh(new T.BoxGeometry(2 * L, 0.08, 2 * ZW), pt ? new T.MeshLambertMaterial({ map: pt }) : K.mat(0xc98d4f)); pm.position.set(0, 0.04, 0); W.add(pm);
    if (!pt) { W.add(K.caja(2 * L - 0.2, 0.01, 0.06, 0xffffff, 0, 0.09, 0)); W.add(K.caja(0.06, 0.01, 2 * ZW - 0.2, 0xffffff, 0, 0.09, 0)); [-1, 1].forEach(s => W.add(K.caja(2.2, 0.01, 3.2, S.c1, s * (L - 1.1), 0.09, 0))); }
    [-1, 1].forEach(s => { W.add(K.cilindro(0.04, 1.1, 0x333333, s * (L - 0.3), 0, 0)); W.add(K.caja(0.05, 0.4, 0.5, 0xffffff, s * (L - 0.45), 1.1, 0)); });
    // graderío
    const sentado = tiene(p, 'asientos'), segs = 6;
    const anillo = (nF, base, off0, alt0, vip) => {
      for (let r = 0; r < nF; r++) {
        const off = off0 + r * 0.55, alt = alt0 + r * 0.3;
        [[-1, 'x'], [1, 'x'], [-1, 'z'], [1, 'z']].forEach(q => {
          const largo = q[1] === 'x' ? 2 * L + 2 * off : 2 * ZW + 0.4;
          for (let s = 0; s < (sentado ? segs : 1); s++) {
            const lg = largo / (sentado ? segs : 1), c = sentado ? ((s + r) % 2 ? S.c1 : S.c2) : (base + (r % 2) * 0x050505);
            const pos = -largo / 2 + lg * (s + 0.5);
            W.add(q[1] === 'x' ? K.caja(lg, 0.3, 0.55, c, pos, alt - 0.3, q[0] * (ZW + off)) : K.caja(0.55, 0.3, lg, c, q[0] * (L + off), alt - 0.3, pos));
          }
        });
      }
    };
    anillo(filas, 0x7d8896, 0.6, 0.3);
    const topInf = 0.3 + filas * 0.3;
    if (sup) anillo(sup, 0x6a7482, 0.6 + filas * 0.55 + 0.9, topInf + 0.6);
    if (tiene(p, 'vip')) [-1, 1].forEach(s => W.add(K.caja(2 * L, 0.5, 0.4, 0x8fd3ee, 0, topInf, s * (ZW + 0.6 + filas * 0.55), 0.55)));
    // público
    const lleno = U.clamp((af * 0.8) / 14000, 0.15, 1), n = Math.round(150 * lleno), cols = [S.c1, S.c2, 0xf2f2f2, 0x2f3a46];
    for (let i = 0; i < n; i++) {
      const q = U.hash(id + 'p' + i) >>> 0, r = q % filas, lado = (q >>> 3) % 2 ? 1 : -1, pos = ((q >>> 6) % 100) / 100 * 2 * L - L;
      W.add(K.caja(0.18, 0.28, 0.18, cols[(q >>> 9) % 4], pos, 0.3 + r * 0.3 - 0.05, lado * (ZW + 0.6 + r * 0.55 + 0.05)));
    }
    // banderines: títulos y camisetas retiradas
    const titulos = st.historial.filter(x => x.campeon === id).length, ret = st.legado && st.legado.camisetas ? st.legado.camisetas.length : 0;
    for (let i = 0; i < Math.min(8, titulos + ret); i++) W.add(K.caja(0.5, 0.8, 0.04, i < titulos ? S.c1 : 0xf2f2f2, -L + 2 + i * 1.1, topInf + (sup ? 2.2 : 1.2), -(ZW + 0.6 + filas * 0.55 + (sup ? 3.4 : 0.8))));
    // iluminación
    const alto = topInf + (sup ? 4.6 : 3.4);
    for (let i = -2; i <= 2; i++) { W.add(K.caja(0.5, 0.12, 0.3, 0xf3f0d8, i * 3.2, alto, -2.4)); W.add(K.caja(0.5, 0.12, 0.3, 0xf3f0d8, i * 3.2, alto, 2.4)); }
    const em = c => new T.MeshBasicMaterial({ color: c });
    if (luz >= 1) { for (let i = -3; i <= 3; i++) { const b = new T.Mesh(new T.BoxGeometry(0.12, 0.08, 2 * ZW), em(0xdff6ff)); b.position.set(i * 2.4, alto + 0.3, 0); W.add(b); } }
    const haces = [];
    if (luz >= 2) {
      W.add(K.caja(2 * L - 2, 0.12, 0.12, 0x2c3138, 0, alto + 0.6, 0)); W.add(K.caja(0.12, 0.12, 2 * ZW - 1, 0x2c3138, 0, alto + 0.6, 0));
      for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; const cn = new T.Mesh(new T.ConeGeometry(1.2, alto + 0.4, 12, 1, true), new T.MeshBasicMaterial({ color: i % 2 ? S.c1 : 0xdff6ff, transparent: true, opacity: 0.16, side: T.DoubleSide, depthWrite: false })); cn.position.set(Math.cos(a) * 5, (alto + 0.4) / 2 + 0.3, Math.sin(a) * 3.2); cn.userData = { a, rot: true }; W.add(cn); haces.push(cn); }
    }
    let cinta = null;
    if (luz >= 3) {
      cinta = []; [-1, 1].forEach(s => { const m = new T.Mesh(new T.BoxGeometry(2 * L - 0.4, 0.18, 0.05), em(S.c1)); m.position.set(0, 0.5, s * (ZW + 0.52)); W.add(m); cinta.push(m); const m2 = new T.Mesh(new T.BoxGeometry(0.05, 0.18, 2 * ZW - 0.2), em(S.c2)); m2.position.set(s * (L + 0.52), 0.5, 0); W.add(m2); cinta.push(m2); });
    }
    if (tiene(p, 'marcador') || luz >= 3) { W.add(K.caja(3, 1.1, 3, 0x1b1f24, 0, alto - 1.4, 0)); [[0, 1.52], [0, -1.52]].forEach(q => W.add(K.caja(2.6, 0.7, 0.04, 0x35c2ff, 0, alto - 1.2, q[1]))); [[1.52, 0], [-1.52, 0]].forEach(q => W.add(K.caja(0.04, 0.7, 2.6, 0x35c2ff, q[0], alto - 1.2, 0))); }
    // exterior
    if (!inte) {
      const rx = L + filas * 0.55 + (sup ? sup * 0.55 + 2.2 : 1.4), rz = ZW + filas * 0.55 + (sup ? sup * 0.55 + 2.2 : 1.4);
      const muros = new T.MeshLambertMaterial({ color: 0xb9c4c9 });
      if (forma === 'redondo') {
        const cil = new T.Mesh(new T.CylinderGeometry(1, 1, alto + 0.4, 30, 1, true), new T.MeshLambertMaterial({ color: 0xb9c4c9, side: T.DoubleSide })); cil.scale.set(rx * 1.06, 1, rz * 1.06); cil.position.y = (alto + 0.4) / 2; W.add(cil);
        const tapa = new T.Mesh(new T.CylinderGeometry(1, 1, 0.5, 30), K.mat(0x6c7a86)); tapa.scale.set(rx * 1.08, 1, rz * 1.08); tapa.position.y = alto + 0.6; W.add(tapa);
        for (let i = 0; i < 20; i++) { const an = i / 20 * 6.283, cb = K.caja(0.7, alto + 0.4, 0.2, i % 2 ? S.c2 : S.c1, Math.cos(an) * rx * 1.07, 0, Math.sin(an) * rz * 1.07); cb.rotation.y = -an + Math.PI / 2; W.add(cb); }
      } else {
        [[0, -rz, 2 * rx, 0.3], [0, rz, 2 * rx, 0.3], [-rx, 0, 0.3, 2 * rz], [rx, 0, 0.3, 2 * rz]].forEach(m => { const bx = new T.Mesh(new T.BoxGeometry(m[2], alto + 0.4, m[3]), muros); bx.position.set(m[0], (alto + 0.4) / 2, m[1]); W.add(bx); });
        if (forma === 'barril') { const ro = new T.Mesh(new T.CylinderGeometry(rz, rz, 2 * rx, 18, 1, false, 0, Math.PI), K.mat(0x7f9a8f)); ro.rotation.z = Math.PI / 2; ro.position.set(0, alto + 0.2, 0); W.add(ro); }
        else if (forma === 'gable') {
          const sh = new T.Shape(); sh.moveTo(-rz - 0.4, 0); sh.lineTo(rz + 0.4, 0); sh.lineTo(0, 2.6); sh.lineTo(-rz - 0.4, 0);
          const pr = new T.Mesh(new T.ExtrudeGeometry(sh, { depth: 2 * rx + 0.8, bevelEnabled: false }), K.mat(0x6c7a86)); pr.rotation.y = Math.PI / 2; pr.position.set(-rx - 0.4, alto + 0.4, 0); W.add(pr);
          W.add(K.caja(9, 0.3, 2.2, S.c1, 0, 2.6, rz + 1.3)); [-3.8, 3.8].forEach(x => W.add(K.caja(0.25, 2.6, 0.25, 0xdfe3e8, x, 0, rz + 2.2)));
        } else W.add(new T.Mesh(new T.BoxGeometry(2 * rx + 0.8, 0.5, 2 * rz + 0.8), K.mat(0x6c7a86))).position.set(0, alto + 0.6, 0);
      }
      if (forma !== 'redondo') for (let i = 0; i < 12; i++) W.add(K.caja(1.1, alto + 0.4, 0.05, i % 2 ? S.c2 : S.c1, -rx + 1.2 + i * (2 * rx - 2.4) / 11, 0, rz + 0.18));
      const g2 = new T.Group(); CP.rotulo(g2, eq.pabellon.nombre.slice(0, 22), 6, 0.9, S.c1, 0xffffff, 0, alto - 0.5, rz + 0.25); W.add(g2);
      if (tiene(p, 'tienda')) { W.add(K.caja(2.4, 1.1, 1.6, 0xf2e6d0, rx + 2.5, 0, rz - 1)); W.add(K.caja(2.6, 0.12, 0.8, S.c1, rx + 2.5, 1.0, rz - 0.2)); }
      if (tiene(p, 'accesos')) for (let i = 0; i < 8; i++) W.add(K.caja(0.7, 0.3, 1.2, [0xd94f4f, 0xf2c14e, 0x4a90d9, 0xeeeeee][i % 4], -rx - 2.5, 0, -6 + i * 1.7));
      if (tiene(p, 'cubierta')) W.add(K.caja(2 * rx + 1.4, 0.2, 2 * rz + 1.4, 0x394049, 0, alto + 1.4, 0, 0.8));
    } else if (tiene(p, 'cubierta')) {
      const tr = new T.Mesh(new T.BoxGeometry(2 * L + 6, 0.12, 0.2), K.mat(0x394049)); [-1, 1].forEach(s => { const m = tr.clone(); m.position.set(0, alto + 1.2, s * (ZW + 3)); W.add(m); });
    }
    // obras en curso
    p.obras.forEach((o, i) => {
      const pr = progreso(st, o), x = -L - 3 + i * 3.4, z = ZW + 4.5;
      W.add(K.caja(1.6, 0.9, 1.6, 0xf2b705, x, 0, z)); W.add(K.cilindro(0.07, 3.2, 0xf2b705, x + 1.4, 0, z, 5)); W.add(K.caja(2.2, 0.08, 0.1, 0xf2b705, x + 0.5, 3.2, z));
      W.add(K.caja(1.8, 0.14, 0.14, 0x2b2f36, x, 1.4, z + 1)); W.add(K.caja(1.8 * Math.max(0.05, pr), 0.17, 0.17, 0x4cc38a, x - 0.9 + 0.9 * Math.max(0.05, pr), 1.4, z + 1));
    });
    CP.ambiente(v, partido ? 'noche' : 'dia');
    if (partido) { v.amb.intensity = 0.38 + luz * 0.06; v.sun.intensity = 0.22; v.renderer.setClearColor(0x0e1626); }
    v.anim = (haces.length || cinta) ? (t => { haces.forEach((c, i) => { c.position.x = Math.cos(c.userData.a + t * 0.6) * 5; c.position.z = Math.sin(c.userData.a + t * 0.6) * 3.2; c.rotation.z = Math.sin(t * 0.8 + i) * 0.25; }); if (cinta) cinta.forEach((m, i) => m.material.color.setHex(Math.sin(t * 2 + i) > 0 ? S.c1 : S.c2)); }) : null;
    if (CP.config.calidad === 'alta') K.sombrear(W);
    if (partido) { /* ya oscurecido */ }
    V.vista.dibujar();
  }
  function panel(st, id) {
    const h = GM.h, P = V.panel; P.innerHTML = '';
    const eq = st.equipos[id], f = efectos(st, id), msg = h('div', { class: 'aviso', style: { display: 'none' } });
    P.append(h('div', { class: 'fila' }, h('b', null, eq.pabellon.nombre), h('span', { class: 'muted' }, 'Caja ' + U.eur(st.finanzas ? st.finanzas[id].caja : 0))));
    P.append(h('div', { class: 'chips' }, h('span', { class: 'chip' }, 'Aforo ' + aforo(st, id).toLocaleString('es-ES')), h('span', { class: 'chip' }, 'Entradas ×' + f.precio.toFixed(2)), h('span', { class: 'chip' }, 'Merchandising ×' + f.merch.toFixed(2)), h('span', { class: 'chip' }, 'Asistencia ×' + f.asistencia.toFixed(2)), h('span', { class: 'chip' }, 'Ambiente ×' + f.ambiente.toFixed(2)), h('span', { class: 'chip' }, 'Luz nivel ' + nivelLuz(st, id) + '/3')));
    if (V.vista) P.append(h('div', { class: 'seg compacto' },
      [['interior', 'Interior'], ['exterior', 'Exterior']].map(o => h('button', { class: 'tab' + (V.modo === o[0] ? ' on' : ''), onclick: () => { V.modo = o[0]; V.vista.radio = o[0] === 'interior' ? 22 : 40; V.vista.place(); V.refrescar(); } }, o[1])),
      [['dia', '💡 Luz de trabajo'], ['partido', '🎆 Noche de partido']].map(o => h('button', { class: 'tab' + (V.luces === o[0] ? ' on' : ''), onclick: () => { V.luces = o[0]; V.refrescar(); } }, o[1]))));
    P.append(h('div', { class: 'lista' }, mejorasDisponibles(st, id).map(m => h('div', { class: 'item' },
      h('div', { class: 'ct' }, h('b', null, m.nombre), h('div', { class: 'muted' }, m.desc + (m.motivo ? ', ' + m.motivo : ''))),
      m.estado === 'disponible' ? h('button', { class: 'btn peq', onclick: () => { const r = mejorar(st, id, m.id); if (!r.ok) { msg.style.display = 'block'; msg.textContent = r.motivo; } else V.refrescar(); } }, U.eur(m.coste) + ', ' + m.dias + ' d') : h('span', { class: 'chip' }, m.estado)))));
    P.append(msg);
  }
  function mount(el, st) {
    const m0 = V && V.modo, l0 = V && V.luces;
    unmount();
    const h = GM.h, id = st.clubId;
    const raiz = h('div', { class: 'c3d' }), vistaEl = h('div', { class: 'vista3d' }), panelEl = h('div', { class: 'panel3d' });
    raiz.append(vistaEl, panelEl); el.appendChild(raiz);
    V = { raiz, panel: panelEl, vista: null, mundo: null, st, modo: m0 || 'interior', luces: l0 || 'dia' };
    if (GM.kit && GM.kit.disponible()) {
      try { V.vista = GM.kit.crear(vistaEl, { radio: V.modo === 'interior' ? 22 : 40, theta: 0.6, phi: 0.95, min: 8, max: 60, fondo: 0xb9d9ee, sombras: GM.campus.config.calidad === 'alta' }); V.mundo = new THREE.Group(); V.vista.scene.add(V.mundo); } catch (e) { V.vista = null; }
    }
    if (!V.vista) vistaEl.append(h('div', { class: 'vacio' }, 'La vista 3D no está disponible en este dispositivo o sin conexión. Las mejoras se gestionan desde la lista.'));
    V.refrescar = () => { if (V.vista) escena(st, id); panel(st, id); };
    V.refrescar();
    return true;
  }
  function unmount() {
    if (!V) return;
    if (V.vista) V.vista.dispose();
    if (V.raiz && V.raiz.parentNode) V.raiz.parentNode.removeChild(V.raiz);
    V = null;
  }
  function selfTest() {
    const st = { clubId: 'a', temporada: '2026-27', fecha: '2026-10-01', noticias: [], historial: [], equipos: { a: { id: 'a', presupuesto: 60e6, pabellon: { aforo: 8000 }, colores: ['#a50044', '#004d98'] } }, instalaciones: {}, finanzas: { a: { caja: 5e7, movimientos: [], patrocinios: [], temp: { ingresos: 0, gastos: 0 }, historial: [] } } };
    nuevaPartida(st);
    const a0 = aforo(st, 'a'), r1 = mejorar(st, 'a', 'grada1'), r2 = mejorar(st, 'a', 'grada2'), r3 = mejorar(st, 'a', 'luz2'), r4 = mejorar(st, 'a', 'luz1');
    st.fecha = '2026-12-05'; GM.state = st; GM.bus.emit('dia:avanzado', {}); GM.state = null;
    return a0 === 8000 && r1.ok && !r2.ok && !r3.ok && r4.ok && aforo(st, 'a') > a0 && nivelLuz(st, 'a') === 1 && efectos(st, 'a').ambiente > 1;
  }
  GM.register('estadio', { aforo, nivelLuz, mejorasDisponibles, mejorar, efectos, mantenimiento, mount, unmount, nuevaPartida, selfTest });
})();
