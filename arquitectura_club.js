/* ARQUITECTURA DE CADA CLUB (GM.arquitectura) — pabellones reconocibles, monumento de la ciudad, agua con reflejos y fuegos
   - pabellon(ctx): el pabellón de la calle según el club. Reales (inspirados): Palau Blaugrana del Barça (caja de hormigón con franjas
     azulgrana y cubierta curva), WiZink Center del Real Madrid (óvalo rojo y blanco con cúpula), OAKA del Olympiacos y el
     Panathinaikos (caja larga bajo dos grandes arcos de acero), Madison Square Garden de los Knicks (tambor con cornisa luminosa y
     marquesina) y Palau Olímpic de Badalona (óvalo acristalado con cubierta de cúpula). El resto elige entre cuatro tipos
     según su nombre: óvalo con cúpula, caja con fachada de costillas, bóveda de cañón o tambor con anillo.
   - monumento(W, G, club, st): un rasgo reconocible al fondo de la ciudad según el país (campanile, columnata griega con frontón,
     mezquita con cúpula y minaretes, torre de telecomunicaciones o rascacielos).
   - agua(opciones): material de agua con reflejo del cielo y ondas que se mueven (normal map pintado y animado).
   - fuegos(S, W, colores, rnd, siempre): ráfagas de fuegos artificiales (de noche, o siempre en la rúa de campeones).
   Expone: pabellon, monumento, agua, fuegos, TIPOS. */
(function () {
  const T = THREE, U = GM.util;
  const MATS = {}; const mat = (c, o) => { const k = c + JSON.stringify(o || {}); return MATS[k] || (MATS[k] = new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.85 }, o || {}))); };
  const rn = seed => { let a = (U.hash(String(seed)) >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

  // ---------- Agua ----------
  let AG = null, ONDAS = null;
  function agua(o) {
    o = o || {}; const M = new T.MeshStandardMaterial({ color: o.color || 0x3f86a6, roughness: o.rugosidad === undefined ? 0.05 : o.rugosidad, metalness: 0.15, transparent: true, opacity: o.opacidad || 0.88, envMapIntensity: 1.6 });
    if (!ONDAS && typeof document !== 'undefined' && document.createElement) { try { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); if (x) { const rr = rn('ondas'), img = x.createImageData(128, 128); for (let j = 0; j < 128; j++) for (let i = 0; i < 128; i++) { const a = i / 128 * 6.283, b = j / 128 * 6.283, h = Math.sin(a * 3 + Math.sin(b * 2) * 1.4) * 0.5 + Math.sin(b * 4 + a) * 0.35 + Math.sin((a + b) * 5) * 0.2, dx = Math.cos(a * 3 + Math.sin(b * 2) * 1.4) * 1.5 + Math.cos((a + b) * 5) * 1.0, dy = Math.cos(b * 4 + a) * 1.4 + Math.cos((a + b) * 5) * 1.0, k = (j * 128 + i) * 4; img.data[k] = 128 + dx * 22; img.data[k + 1] = 128 + dy * 22; img.data[k + 2] = 255; img.data[k + 3] = 255; void h; void rr; } x.putImageData(img, 0, 0); ONDAS = new T.CanvasTexture(c); ONDAS.wrapS = ONDAS.wrapT = T.RepeatWrapping; } } catch (e) { ONDAS = null; } }
    if (ONDAS) { const t = ONDAS.clone(); t.needsUpdate = true; t.repeat.set(o.repeticion || 3, o.repeticion || 3); M.normalMap = t; M.normalScale = new T.Vector2(0.55, 0.55); M.userData.ondas = t; }
    return M;
  }
  // Mueve las ondas de todos los materiales de agua con el tiempo del viento (se llama desde actualizar)
  function mover(t) { Object.keys(AG_LISTA).forEach(k => { const m = AG_LISTA[k]; if (m.userData.ondas) { m.userData.ondas.offset.set(t * 0.03, t * 0.021); } }); }
  const AG_LISTA = {}; let nAg = 0;
  function aguaViva(o) { const m = agua(o); AG_LISTA['a' + (nAg++)] = m; return m; }

  // ---------- Pabellones ----------
  const REAL = { 'fc-barcelona': 'blaugrana', 'real-madrid': 'wizink', olympiacos: 'oaka', panathinaikos: 'oaka', 'new-york-knicks': 'msg', 'joventut-badalona': 'olimpic' };
  const TIPOS = ['ovalo', 'caja', 'boveda', 'tambor'];
  function pabellon(H) {
    const { W, G, T: TX, club, st, c1, caja, cil, plano, letrero, mat: mt, suelo, ocluye } = H, cx = -19.5, cz = -15, estilo = REAL[club.id] || TIPOS[U.hash(club.id + 'pab') % TIPOS.length], c2 = club.colores[1] || '#ffffff';
    const hormigon = new T.MeshStandardMaterial({ color: 0xd2d5d8, roughness: 0.7 }), acero = mat('#b9c0c6', { metalness: 0.6, roughness: 0.3 }), vidrio = new T.MeshStandardMaterial({ color: 0x2d3b46, roughness: 0.12, metalness: 0.5 });
    if (GM.texturas) GM.texturas.aplicar(hormigon, 'Concrete034', { escala: 3, tinte: 0xdcdfe2, relieve: 0.6 });
    let rx = 10, rz = 7, alto = 9, frente = cz + rz;
    const marquesina = (w, y, zf) => { caja(W, w, 0.25, 3, '#2a2f35', cx, y, zf - 0.2); for (const dx of [-w / 2 + 0.5, w / 2 - 0.5]) cil(W, 0.12, y, '#2a2f35', cx + dx, 0, zf + 1.1); };
    const cartel = (ancho, y, zf) => letrero(W, TX.letrero(club.pabellon.nombre.toUpperCase(), '#14181d', '#ffffff', 'pab'), ancho, ancho * 0.23, cx, y, zf + 0.05, 0);
    const lonas = (zf) => { for (const dx of [-7.5, 7.5]) { const l = plano(W, 2.2, 5.5, new T.MeshStandardMaterial({ map: TX.escudo, transparent: true, side: T.DoubleSide }), cx + dx, 4.5, zf * 0.0 + cz + rz * 0.72 + 0.4, dx < 0 ? -0.6 : 0.6); l.renderOrder = 1; } };
    const ovalo = (cuerpoC, bandas, vid) => {
      const cuerpo = new T.Mesh(new T.CylinderGeometry(1, 1, alto, 48), cuerpoC); cuerpo.scale.set(rx, 1, rz); cuerpo.position.set(cx, alto / 2, cz); cuerpo.castShadow = cuerpo.receiveShadow = true; W.add(cuerpo); ocluye(cuerpo);
      bandas.forEach((c, i) => { const b = new T.Mesh(new T.CylinderGeometry(1.004, 1.004, 0.5, 48, 1, true), mt(c)); b.scale.set(rx, 1, rz); b.position.set(cx, alto - 1.2 - i * 0.55, cz); W.add(b); });
      if (vid) { const v = new T.Mesh(new T.CylinderGeometry(1.006, 1.006, 2.4, 48, 1, true), vidrio); v.scale.set(rx, 1, rz); v.position.set(cx, 1.6, cz); W.add(v); }
      const cup = new T.Mesh(new T.SphereGeometry(1, 48, 12, 0, Math.PI * 2, 0, Math.PI / 2), acero); cup.scale.set(rx, 2.6, rz); cup.position.set(cx, alto, cz); cup.castShadow = true; W.add(cup); ocluye(cup);
    };
    if (estilo === 'blaugrana') {   // Palau Blaugrana: caja baja de hormigón con franjas azulgrana y cubierta curva
      rx = 12; rz = 8; const bw = 24, bd = 16, bh = 8, g = new T.Mesh(new T.BoxGeometry(bw, bh, bd), hormigon); g.position.set(cx, bh / 2, cz); g.castShadow = g.receiveShadow = true; W.add(g); ocluye(g);
      const n = 16; for (let i = 0; i < n; i++) { const f = new T.Mesh(new T.BoxGeometry(bw / n, bh - 1, 0.12), mt(i % 2 ? '#004d98' : '#a50044')); f.position.set(cx - bw / 2 + (i + 0.5) * bw / n, 4.5, cz + bd / 2 + 0.06); W.add(f); }
      const arc = new T.Mesh(new T.CylinderGeometry(bd / 2 + 0.6, bd / 2 + 0.6, bw + 0.8, 24, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2), acero); arc.scale.set(1, 0.32, 1); arc.position.set(cx, bh, cz); arc.rotation.y = 0; arc.castShadow = true; W.add(arc);
      const arcoMuestra = new T.Mesh(new T.TorusGeometry(bd / 2, 0.14, 6, 24, Math.PI).rotateY(Math.PI / 2), acero); arcoMuestra.scale.set(1, 0.32, 1); arcoMuestra.position.set(cx - bw / 2, bh, cz); W.add(arcoMuestra); const a2 = arcoMuestra.clone(); a2.position.x = cx + bw / 2; W.add(a2);
      marquesina(12, 3.6, frente + 1); cartel(11, 6.3, frente + 1); frente = cz + bd / 2;
      G.bloquea(cx - bw / 2, cz - bd / 2, cx + bw / 2, cz + bd / 2 + 0.5);
    } else if (estilo === 'wizink') {   // WiZink Center: óvalo con costillas rojas y blancas y cúpula acristalada
      ovalo(hormigon, ['#c8102e', '#f4f4f4', '#c8102e'], true); for (let i = 0; i < 28; i++) { const a = i / 28 * 6.283, c = new T.Mesh(new T.BoxGeometry(0.4, alto - 3.4, 0.4), mt(i % 2 ? '#c8102e' : '#f4f4f4')); c.position.set(cx + Math.cos(a) * rx * 1.01, (alto - 3.4) / 2 + 2.4, cz + Math.sin(a) * rz * 1.01); c.rotation.y = -a; W.add(c); }
      marquesina(9, 3.6, frente); cartel(9, 5.4, frente); lonas(frente); G.bloquea(cx - rx, cz - rz, cx + rx, cz + rz + 0.5);
    } else if (estilo === 'oaka') {   // OAKA: cuerpo largo bajo dos grandes arcos de acero (Calatrava)
      const bw = 26, bd = 14, bh = 6, g = new T.Mesh(new T.BoxGeometry(bw, bh, bd), hormigon); g.position.set(cx, bh / 2, cz); g.castShadow = g.receiveShadow = true; W.add(g); ocluye(g);
      for (const dz of [-bd / 2 + 1, bd / 2 - 1]) { const a = new T.Mesh(new T.TorusGeometry(bw / 2 - 1, 0.35, 8, 36, Math.PI), acero); a.scale.set(1, 0.7, 1); a.position.set(cx, bh - 0.4, cz + dz); a.castShadow = true; W.add(a); for (let i = 1; i < 12; i++) { const t = i / 12, ang = Math.PI * t, px = cx + Math.cos(ang) * (bw / 2 - 1), py = bh - 0.4 + Math.sin(ang) * (bw / 2 - 1) * 0.7; const tir = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, py - bh + 0.4, 4), acero); tir.position.set(px, (py + bh - 0.4) / 2, cz + dz * 0.0 + (dz > 0 ? dz - 0 : dz) * 0); tir.position.z = cz + dz; W.add(tir); } }
      const cu = new T.Mesh(new T.CylinderGeometry(bd / 2 + 0.6, bd / 2 + 0.6, bw, 20, 1, true, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(Math.PI / 2), mt('#9fb0bd', { metalness: 0.5, roughness: 0.4, side: T.DoubleSide })); cu.scale.set(1, 1, 0.33); cu.position.set(cx, bh, cz); W.add(cu);
      caja(W, bw - 4, 2.4, 0.2, vidrio, cx, 0.4, cz + bd / 2 + 0.1); marquesina(10, 3.6, cz + bd / 2 + 1); cartel(10, 7.0, cz + bd / 2 + 1); frente = cz + bd / 2; G.bloquea(cx - bw / 2, cz - bd / 2, cx + bw / 2, cz + bd / 2 + 0.5);
    } else if (estilo === 'msg') {   // Madison Square Garden: tambor bajo con cornisa luminosa y marquesina
      rx = 10; rz = 10; alto = 7; ovalo(hormigon, [], true); const anillo = new T.Mesh(new T.TorusGeometry(1.0, 0.012, 8, 48).rotateX(Math.PI / 2), new T.MeshStandardMaterial({ color: 0xffffff, emissive: c1, emissiveIntensity: 1.6 })); anillo.scale.set(rx * 1.01, rz * 1.01, 1); anillo.position.set(cx, alto - 0.3, cz); anillo.scale.set(rx * 1.01, 1, rz * 1.01); W.add(anillo);
      for (let k = 0; k < 3; k++) { const b = new T.Mesh(new T.CylinderGeometry(1.01, 1.01, 0.5, 48, 1, true), mt(k === 1 ? c2 : c1)); b.scale.set(rx, 1, rz); b.position.set(cx, 3 + k * 0.7, cz); W.add(b); } const cp = new T.Mesh(new T.CylinderGeometry(rx * 0.92, rx * 0.95, 1.2, 48), acero); cp.position.set(cx, alto + 0.6, cz * 1.0); cp.scale.z = rz / rx; W.add(cp);
      for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283, p = cil(W, 0.25, alto, hormigon, cx + Math.cos(a) * rx * 1.05, 0, cz + Math.sin(a) * rz * 1.05, 10); void p; }
      marquesina(12, 3.6, cz + rz); cartel(12, 5.2, cz + rz); frente = cz + rz; G.bloquea(cx - rx, cz - rz, cx + rx, cz + rz + 0.5);
    } else if (estilo === 'olimpic') {   // Palau Olímpic de Badalona: óvalo acristalado con cúpula y anillo de color del club
      ovalo(vidrio, [c1, c2, c1], false); for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283, c = new T.Mesh(new T.BoxGeometry(0.22, alto - 1.5, 0.22), acero); c.position.set(cx + Math.cos(a) * rx * 1.005, (alto - 1.5) / 2, cz + Math.sin(a) * rz * 1.005); W.add(c); }
      marquesina(9, 3.6, frente); cartel(9, 5.4, frente); lonas(frente); G.bloquea(cx - rx, cz - rz, cx + rx, cz + rz + 0.5);
    } else if (estilo === 'caja') {   // caja con fachada de costillas verticales y franja de luz en el club
      const bw = 22, bd = 14, bh = 8.5, g = new T.Mesh(new T.BoxGeometry(bw, bh, bd), hormigon); g.position.set(cx, bh / 2, cz); g.castShadow = g.receiveShadow = true; W.add(g); ocluye(g);
      for (let i = 0; i < 26; i++) { const f = new T.Mesh(new T.BoxGeometry(0.28, bh - 1.4, 0.55), mt(i % 3 ? '#c9cdd0' : c1)); f.position.set(cx - bw / 2 + 0.6 + i * (bw - 1.2) / 25, 4.4, cz + bd / 2 + 0.28); W.add(f); }
      caja(W, bw + 0.4, 0.5, bd + 0.4, acero, cx, bh, cz); caja(W, bw - 4, 0.3, 0.1, new T.MeshStandardMaterial({ color: 0xffffff, emissive: c2, emissiveIntensity: 1.2 }), cx, 6.6, cz + bd / 2 + 0.6);
      marquesina(10, 3.6, cz + bd / 2 + 1); cartel(10, 7.3, cz + bd / 2 + 0.9); frente = cz + bd / 2; G.bloquea(cx - bw / 2, cz - bd / 2, cx + bw / 2, cz + bd / 2 + 0.5);
    } else if (estilo === 'boveda') {   // nave con cubierta de cañón y testero acristalado
      const bw = 22, bd = 15, bh = 5.5, g = new T.Mesh(new T.BoxGeometry(bw, bh, bd), hormigon); g.position.set(cx, bh / 2, cz); g.castShadow = true; W.add(g); ocluye(g);
      const b = new T.Mesh(new T.CylinderGeometry(bd / 2 + 0.4, bd / 2 + 0.4, bw + 0.6, 28, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(Math.PI / 2), acero); b.scale.set(1, 1, 0.55); b.position.set(cx, bh, cz); b.castShadow = true; W.add(b);
      for (let i = 0; i < 9; i++) { const arc = new T.Mesh(new T.TorusGeometry(bd / 2 + 0.4, 0.1, 6, 24, Math.PI).rotateY(Math.PI / 2), mt('#4a5560')); arc.scale.set(1, 0.55, 1); arc.position.set(cx - bw / 2 + 0.3 + i * (bw - 0.6) / 8, bh, cz); W.add(arc); }
      const tes = new T.Mesh(new T.CircleGeometry(bd / 2, 24, 0, Math.PI), vidrio); tes.scale.y = 0.55; tes.position.set(cx, bh, cz + bd / 2 + 0.06); W.add(tes);
      marquesina(10, 3.6, cz + bd / 2 + 1); cartel(9, 6.2, cz + bd / 2 + 1.0); frente = cz + bd / 2; G.bloquea(cx - bw / 2, cz - bd / 2, cx + bw / 2, cz + bd / 2 + 0.5);
    } else if (estilo === 'tambor') {   // tambor liso con anillo de ventanas y cubierta plana con borde
      rx = 9; rz = 9; alto = 8; ovalo(hormigon, [c1], true); const tapa = new T.Mesh(new T.CylinderGeometry(rx * 1.02, rx * 1.02, 0.5, 48), acero); tapa.position.set(cx, alto + 0.25, cz); W.add(tapa);
      marquesina(9, 3.6, cz + rz); cartel(9, 5.4, cz + rz); lonas(cz + rz); frente = cz + rz; G.bloquea(cx - rx, cz - rz, cx + rx, cz + rz + 0.5);
    } else { ovalo(new T.MeshStandardMaterial({ color: 0xd9dde0, roughness: 0.6 }), [c1, c2, c1], true); marquesina(9, 3.6, frente); cartel(9, 5.4, frente); lonas(frente); G.bloquea(cx - rx, cz - rz, cx + rx, cz + rz + 0.5); }
    G.bloquea(cx - 4.3, frente + 0.8, cx - 3.7, frente + 1.4); G.bloquea(cx + 3.7, frente + 0.8, cx + 4.3, frente + 1.4);
    suelo(W, 26, 7, mt('#c9c2b4'), cx, 0.005, frente + 2.5);
    return { puerta: [cx, -5.2], estilo };
  }

  // ---------- Monumento de la ciudad (al fondo, en el norte) ----------
  function monumento(W, G, club, st) {
    const g = new T.Group(), pais = club.pais, x = 30, z = -122, pie = new T.MeshStandardMaterial({ color: 0xd8cfbc, roughness: 0.85 }), lad = mat('#a8584a'); if (GM.texturas) GM.texturas.aplicar(pie, 'Plaster003', { color: false, escala: 3, relieve: 1 });
    g.position.set(x, 0, z); g.scale.setScalar(1.5); W.add(g);
    const suelo = new T.Mesh(new T.CircleGeometry(15, 32).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({ color: 0x7a9a58, roughness: 1 })); suelo.position.y = -0.1; g.add(suelo); const plaza = new T.Mesh(new T.CircleGeometry(9, 32).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({ color: 0xc9c2b4, roughness: 0.9 })); plaza.position.y = -0.08; g.add(plaza);
    const tub = (r0, r1, h, y, m, seg) => { const me = new T.Mesh(new T.CylinderGeometry(r1, r0, h, seg || 16), m || pie); me.position.y = y + h / 2; me.castShadow = true; g.add(me); return me; };
    if (pais === 'GR') {   // templo de columnas con frontón
      for (let i = 0; i < 4; i++) tub(0.2, 0.2, 0, 0, pie); const bs = new T.Mesh(new T.BoxGeometry(14, 0.8, 7), pie); bs.position.y = 0.4; g.add(bs); const bs2 = bs.clone(); bs2.scale.set(0.92, 1, 0.9); bs2.position.y = 1.0; g.add(bs2);
      for (let i = 0; i < 8; i++) for (const s of [-1, 1]) { const c = tub(0.55, 0.45, 7, 1.3, pie, 14); c.position.set(-6 + i * 1.7, c.position.y, s * 2.7); const cap = new T.Mesh(new T.BoxGeometry(1.3, 0.35, 1.3), pie); cap.position.set(c.position.x, 8.45, c.position.z); g.add(cap); }
      const arq = new T.Mesh(new T.BoxGeometry(14, 0.8, 6.6), pie); arq.position.y = 8.9; g.add(arq); const sh = new T.Shape(); sh.moveTo(-7, 0); sh.lineTo(7, 0); sh.lineTo(0, 2.4); sh.lineTo(-7, 0); const fr = new T.Mesh(new T.ExtrudeGeometry(sh, { depth: 6.6, bevelEnabled: false }), pie); fr.position.set(0, 9.3, -3.3); g.add(fr);
    } else if (pais === 'TR') {   // mezquita con cúpula central, semicúpulas y dos minaretes
      const cu = new T.Mesh(new T.SphereGeometry(5, 28, 14, 0, 6.283, 0, 1.57), mat('#8fa6b0', { metalness: 0.3, roughness: 0.5 })); cu.position.y = 8; g.add(cu); const cb = new T.Mesh(new T.BoxGeometry(11, 8, 11), pie); cb.position.y = 4; g.add(cb);
      for (const [dx, dz] of [[-5.5, 0], [5.5, 0], [0, 5.5], [0, -5.5]]) { const sc = new T.Mesh(new T.SphereGeometry(2.6, 18, 10, 0, 6.283, 0, 1.57), mat('#8fa6b0', { metalness: 0.3, roughness: 0.5 })); sc.position.set(dx, 5.8, dz); g.add(sc); }
      for (const s of [-1, 1]) { const m = tub(0.7, 0.45, 18, 0, pie, 12); m.position.x = s * 9; m.position.z = 5; const ba = new T.Mesh(new T.CylinderGeometry(0.85, 0.85, 0.4, 12), pie); ba.position.set(s * 9, 13, 5); g.add(ba); const pt = new T.Mesh(new T.ConeGeometry(0.62, 3.8, 12), mat('#8fa6b0', { metalness: 0.4 })); pt.position.set(s * 9, 20, 5); g.add(pt); }
      const lu = new T.Mesh(new T.TorusGeometry(0.4, 0.07, 6, 14, Math.PI * 1.5), mat('#c9a227', { metalness: 0.8 })); lu.position.y = 13.4; g.add(lu);
    } else if (pais === 'DE' || pais === 'LT' || pais === 'RS') {   // torre de telecomunicaciones con esfera y antena
      tub(1.8, 0.9, 30, 0, pie, 14); const es = new T.Mesh(new T.SphereGeometry(3.6, 24, 16), mat('#c9ced2', { metalness: 0.6, roughness: 0.3 })); es.position.y = 31; g.add(es); const ba = new T.Mesh(new T.CylinderGeometry(3.9, 3.9, 0.7, 24), mat('#4a5560')); ba.position.y = 31; g.add(ba); tub(0.5, 0.12, 14, 34, mat('#b02a30'), 8);
    } else if (pais === 'US') {   // grupo de rascacielos
      const r = rn(club.id + 'sky'); for (let i = 0; i < 5; i++) { const w = 4 + r() * 3, h = 22 + r() * 30, b = new T.Mesh(new T.BoxGeometry(w, h, w), new T.MeshStandardMaterial({ color: ['#6f8fa6', '#8aa0b0', '#4f6f87', '#b0b8bd'][i % 4], roughness: 0.2, metalness: 0.6 })); b.position.set(-12 + i * 6, h / 2, (r() - 0.5) * 6); b.castShadow = true; g.add(b); const ant = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 5, 4), mat('#444')); ant.position.set(b.position.x, h + 2.5, b.position.z); g.add(ant); }
    } else {   // campanile mediterráneo con linterna y chapitel
      const fu = new T.Mesh(new T.BoxGeometry(4, 28, 4), pie); fu.position.y = 14; fu.castShadow = true; g.add(fu); const ba = new T.Mesh(new T.BoxGeometry(5, 3, 5), lad); ba.position.y = 1.5; g.add(ba);
      for (const y of [8, 14]) { const co = new T.Mesh(new T.BoxGeometry(4.5, 0.4, 4.5), lad); co.position.y = y; g.add(co); } for (const dx of [-0.9, 0.9]) for (const f of [0, 1, 2, 3]) { const a = new T.Mesh(new T.CircleGeometry(0.6, 12, 0, Math.PI), mat('#0d1116')); a.position.set(dx * Math.cos(f * 1.57) - 0 + Math.sin(f * 1.57) * 2.02 * 0, 22.5, 0); a.rotation.y = f * 1.57; a.position.set(Math.sin(f * 1.57) * 2.02 + dx * Math.cos(f * 1.57), 22.2, Math.cos(f * 1.57) * 2.02 - dx * Math.sin(f * 1.57)); g.add(a); }
      const co = new T.Mesh(new T.BoxGeometry(4.6, 0.6, 4.6), lad); co.position.y = 28.3; g.add(co); const ch = new T.Mesh(new T.ConeGeometry(3.2, 7, 4), lad); ch.rotation.y = Math.PI / 4; ch.position.y = 32.1; g.add(ch); const bo = new T.Mesh(new T.SphereGeometry(0.3, 8, 6), mat('#c9a227', { metalness: 0.8 })); bo.position.y = 35.8; g.add(bo);
    }
    return g;
  }

  // ---------- Fuegos artificiales ----------
  function fuegos(S, W, colores, rnd, siempre, cx0, cz0) {
    const N = 6, R = 100, pts = [], mt2 = new T.PointsMaterial({ size: 0.55, vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true });
    for (let b = 0; b < N; b++) { const gg = new T.BufferGeometry(), p = new Float32Array(R * 3), c = new Float32Array(R * 3), cl = new T.Color(colores[b % colores.length]); for (let i = 0; i < R; i++) { c[i * 3] = cl.r; c[i * 3 + 1] = cl.g; c[i * 3 + 2] = cl.b; } gg.setAttribute('position', new T.BufferAttribute(p, 3)); gg.setAttribute('color', new T.BufferAttribute(c, 3)); const pt = new T.Points(gg, mt2.clone()); pt.frustumCulled = false; pt.userData = { fuego: { t0: b * 1.4, cx: (cx0 || 0) + (rnd() - 0.5) * 50, cz: (cz0 || 0) + (rnd() - 0.5) * 24, dirs: Array.from({ length: R }, () => { const a = rnd() * 6.283, e = Math.acos(2 * rnd() - 1); return [Math.sin(e) * Math.cos(a), Math.cos(e), Math.sin(e) * Math.sin(a)]; }) } }; W.add(pt); pts.push(pt); }
    S.puebloAnim = S.puebloAnim || [];
    S.puebloAnim.push(t => { const noche = S.noche || 0, activo = siempre ? !!S.rua : noche > 0.3; pts.forEach(pt => { const u = pt.userData.fuego, ciclo = 8.4, k = ((t + u.t0) % ciclo) / ciclo, a = pt.geometry.attributes.position; pt.visible = activo && k < 0.55; if (!pt.visible) return; const e = k / 0.55, r = Math.pow(e, 0.6) * 13, y0 = 20 + Math.min(1, e * 3) * 15 - e * e * 10; for (let i = 0; i < R; i++) { const d = u.dirs[i]; a.setXYZ(i, u.cx + d[0] * r, y0 + d[1] * r, u.cz + d[2] * r); } a.needsUpdate = true; pt.material.opacity = 1 - e * 0.9; }); });
  }
  GM.arquitectura = { pabellon, monumento, agua: aguaViva, aguaMover: mover, fuegos, TIPOS, REAL };
})();
