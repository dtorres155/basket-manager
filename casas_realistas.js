/* CASAS MÁS REALISTAS (GM.casasReal) — fachadas, tejados y detalles de las casas del pueblo (las usa pueblo_mundo.js)
   Menos «muñeco»: colores apagados y envejecidos, revoco con manchas de humedad, desconchones que dejan ver la piedra y churretones
   bajo las ventanas (calcomanías pintadas a medida de cada fachada), zócalo y esquinas de sillería, ventanas con jambas, dintel y
   alféizar de piedra, cristal con reflejos, cortinas dentro, contraventanas de lamas (abiertas, entornadas o cerradas) y rejas de
   hierro, puerta de madera con tablones, herrajes y arco de piedra, tejado de dos faldones con aleros, cabios, canalón, caballete,
   hastiales del color del muro, chimeneas de piedra con remate y antenas. Un azar propio con semilla (no toca GM.rng).
   Expone: bloque(G, M, E, w, d, pisos, muro, txt, acento, r, opts) -> altura, tejado(G, w, d, hTejado, color, y, r), envejecer(hex, r). */
(function () {
  const U = GM.util, T = THREE;
  const MATS = {}; const mat = (c, o) => { const k = c + JSON.stringify(o || {}); return MATS[k] || (MATS[k] = new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.9 }, o || {}))); };
  // Colores un poco apagados y con variación de luz: nada de colores de dibujo animado
  function envejecer(hex, r, sat, luz) { const c = new T.Color(hex), hsl = {}; c.getHSL(hsl); c.setHSL(hsl.h, Math.max(0, hsl.s * (sat === undefined ? 0.78 : sat)), Math.max(0, Math.min(1, hsl.l + (r() - 0.5) * (luz === undefined ? 0.08 : luz)))); return '#' + c.getHexString(); }
  const TEXT = {};
  const tex = (M, k, n, fn) => { if (TEXT[k] !== undefined) return TEXT[k]; return (TEXT[k] = M.textura(k, n, fn) || null); };
  const rn = seed => { let a = (U.hash(String(seed)) >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

  // ---------- Materiales con textura real ----------
  const REAL = {};
  function murMat(hex) { const k = 'mur' + hex; if (REAL[k]) return REAL[k]; const m = new T.MeshStandardMaterial({ color: hex, roughness: 0.96 }); if (GM.texturas) GM.texturas.aplicar(m, 'Plaster003', { color: false, escala: 2.4, relieve: 1.3 }); return (REAL[k] = m); }
  function piedraMat(hex) { const k = 'pie' + hex; if (REAL[k]) return REAL[k]; const m = new T.MeshStandardMaterial({ color: hex, roughness: 0.95 }); if (GM.texturas) GM.texturas.aplicar(m, 'Bricks085', { color: false, escala: 1.0, relieve: 1.5 }); return (REAL[k] = m); }
  function tejaMat(hex) { const k = 'tej' + hex; if (REAL[k]) return REAL[k]; const m = new T.MeshStandardMaterial({ color: hex, roughness: 0.9 }); if (GM.texturas) GM.texturas.aplicar(m, 'RoofingTiles013A', { color: false, escala: 0.8, relieve: 1.6 }); return (REAL[k] = m); }
  function maderaMat(hex) { const k = 'mad' + hex; if (REAL[k]) return REAL[k]; const m = new T.MeshStandardMaterial({ color: hex, roughness: 0.8 }); if (GM.texturas) GM.texturas.aplicar(m, 'WoodFloor051', { color: false, escala: 0.9, relieve: 1 }); return (REAL[k] = m); }

  // ---------- Calcomanías de desgaste ----------
  // Una por fachada (según su número de columnas y plantas): humedad en la base, desconchones con la piedra a la vista, churretones
  // bajo las ventanas, grietas y mugre bajo el alero. Se pintan con la altura real para que los churretones caigan donde van las ventanas.
  function decalFachada(M, w, h, cols, pisos, variante, lateral) {
    const k = 'decal-' + (lateral ? 'lado' : cols + 'c' + pisos + 'p') + '-' + Math.round(w) + 'x' + Math.round(h) + '-' + variante;
    const t = tex(M, k, 256, (x, n) => {
      const r = rn(k); x.clearRect(0, 0, n, n);
      const g = x.createLinearGradient(0, n, 0, n * (1 - 0.2)); g.addColorStop(0, 'rgba(55,45,35,0.42)'); g.addColorStop(1, 'rgba(55,45,35,0)'); x.fillStyle = g; x.fillRect(0, n * 0.8, n, n * 0.2);
      for (let i = 0; i < 26; i++) { x.fillStyle = 'rgba(50,40,30,' + (0.02 + r() * 0.035) + ')'; const bx = r() * n, by = n * (0.84 + r() * 0.16); x.beginPath(); x.ellipse(bx, by, 8 + r() * 18, 3 + r() * 6, 0, 0, 6.3); x.fill(); }
      const g2 = x.createLinearGradient(0, 0, 0, n * 0.1); g2.addColorStop(0, 'rgba(40,34,28,0.26)'); g2.addColorStop(1, 'rgba(40,34,28,0)'); x.fillStyle = g2; x.fillRect(0, 0, n, n * 0.1);
      // desconchones con la piedra a la vista (cerca del suelo y de las esquinas)
      const parches = 1 + ((r() * 2) | 0);
      for (let p = 0; p < parches; p++) {
        const cx = r() < 0.5 ? n * (0.04 + r() * 0.22) : n * (0.74 + r() * 0.22), cy = n * (0.55 + r() * 0.4), rad = 9 + r() * 14;
        x.save(); x.globalAlpha = 0.85; x.beginPath(); for (let a = 0; a <= 14; a++) { const an = a / 14 * 6.283, rr = rad * (0.62 + r() * 0.5); x[a ? 'lineTo' : 'moveTo'](cx + Math.cos(an) * rr * 1.3, cy + Math.sin(an) * rr); } x.closePath(); x.clip();
        x.fillStyle = '#b3a891'; x.fillRect(cx - rad * 2, cy - rad * 2, rad * 4, rad * 4);
        for (let b = 0; b < 40; b++) { x.fillStyle = ['#b9ad97', '#9f9582', '#c3b8a2', '#8d8372'][(r() * 4) | 0]; const bw = 9 + r() * 12, bh = 5 + r() * 4, bx = cx - rad * 1.6 + ((b % 7) * (bw + 1.6) + (((b / 7) | 0) % 2) * 5), by = cy - rad + ((b / 7) | 0) * (bh + 1.4); x.fillRect(bx, by, bw, bh); }
        x.restore(); x.strokeStyle = 'rgba(40,34,28,0.28)'; x.lineWidth = 1; x.beginPath(); for (let a = 0; a <= 14; a++) { const an = a / 14 * 6.283, rr = rad * (0.7 + r() * 0.25); x[a ? 'lineTo' : 'moveTo'](cx + Math.cos(an) * rr * 1.3, cy + Math.sin(an) * rr); } x.closePath(); x.stroke();
      }
      if (!lateral) for (let p = 0; p < pisos; p++) for (let i = 0; i < cols; i++) {
        const cx = (i + 0.5) / cols * n, y0 = n * (1 - (p * 3.1 + 1.0) / h);
        for (let s = -1; s <= 1; s += 2) { const gg = x.createLinearGradient(0, y0, 0, y0 + n * 1.5 / h); gg.addColorStop(0, 'rgba(35,30,25,' + (0.18 + r() * 0.16) + ')'); gg.addColorStop(1, 'rgba(35,30,25,0)'); x.fillStyle = gg; x.fillRect(cx + s * n * 0.2 / cols - 2 + (r() - 0.5) * 3, y0, 4 + r() * 3, n * (1.0 + r() * 1.3) / h); }
      }
      for (let c = 0; c < 2; c++) { x.strokeStyle = 'rgba(30,26,22,0.38)'; x.lineWidth = 1; x.beginPath(); let px = r() * n, py = r() * n * 0.6; x.moveTo(px, py); for (let s = 0; s < 6; s++) { px += (r() - 0.5) * 16; py += 8 + r() * 14; x.lineTo(px, py); } x.stroke(); }
    });
    return t;
  }
  function matDecal(t, k) { if (!t) return null; const kk = 'dm' + k; return MATS[kk] || (MATS[kk] = new T.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, color: 0xe8e4de })); }

  // ---------- Piezas ----------
  function caja(G, w, h, d, m, x, y, z, ry, sombra) { const me = new T.Mesh(new T.BoxGeometry(w, h, d), typeof m === 'string' ? mat(m) : m); me.position.set(x, y + h / 2, z); if (ry) me.rotation.y = ry; me.castShadow = sombra !== false; me.receiveShadow = true; G.add(me); return me; }
  function cil(G, r, h, m, x, y, z, seg) { const me = new T.Mesh(new T.CylinderGeometry(r, r, h, seg || 8), typeof m === 'string' ? mat(m) : m); me.position.set(x, y + h / 2, z); me.castShadow = true; G.add(me); return me; }

  // Tejado de dos faldones con alero, cabios, canalón, caballete y hastiales del color del muro. Cumbrera a lo largo de x.
  function tejado(G, w, d, h, color, y, r, muroMat) {
    const a = Math.atan2(h, d / 2), ov = 0.38, Lx = d / 2 + ov, L = Lx / Math.cos(a), gr = 0.15, tm = tejaMat(color), dark = tejaMat(envejecer(color, r, 0.9, 0.04));
    const g = new T.Group(); g.position.y = y; G.add(g);
    for (const s of [1, -1]) {
      const sl = new T.Mesh(new T.BoxGeometry(w + 0.55, gr, L), tm); sl.position.set(0, h - (Lx / 2) * Math.tan(a) - gr / 2 + 0.005 + (h - 0) * 0 + 0.0, s * Lx / 2); sl.position.y = h - Math.tan(a) * (Lx / 2) + 0.0; sl.rotation.x = s * a; sl.castShadow = true; sl.receiveShadow = true; g.add(sl);
      const faja = new T.Mesh(new T.BoxGeometry(w + 0.6, 0.06, 0.1), mat('#7a7064')); faja.position.set(0, h - Math.tan(a) * Lx - 0.02, s * (Lx - 0.02)); g.add(faja);          // canalón
      const nCab = Math.max(3, Math.floor((w + 0.4) / 0.62)); for (let k = 0; k < nCab; k++) { const cab = new T.Mesh(new T.BoxGeometry(0.09, 0.1, 0.5), maderaMat('#5b4330')); cab.position.set(-w / 2 - 0.1 + k * (w + 0.2) / (nCab - 1), h - Math.tan(a) * (Lx - 0.22) - 0.14, s * (Lx - 0.2)); cab.rotation.x = s * a; g.add(cab); }
    }
    const cab = new T.Mesh(new T.CylinderGeometry(0.13, 0.13, w + 0.62, 8), dark); cab.rotation.z = Math.PI / 2; cab.position.set(0, h + 0.04, 0); cab.castShadow = true; g.add(cab);   // caballete
    for (const s of [-1, 1]) { const sh = new T.Shape(); sh.moveTo(-d / 2, 0); sh.lineTo(d / 2, 0); sh.lineTo(0, h - 0.02); sh.lineTo(-d / 2, 0); const gg = new T.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false }); gg.rotateY(Math.PI / 2); const m = new T.Mesh(gg, muroMat || mat('#d8cdb8')); m.position.set(s * (w / 2 - 0.3) + (s > 0 ? 0.3 : 0) - 0.0, 0, 0); m.position.x = s > 0 ? w / 2 - 0.3 : -w / 2; m.castShadow = true; g.add(m); }
    return g;
  }

  // Chimenea de piedra con remate y dos tiros
  function chimenea(G, x, yBase, z, r) {
    const pm = piedraMat('#a89f8d'), h = 1.5 + r() * 0.5;
    if (r() < 0.4) { const lad = piedraMat('#9c6a55'), c = new T.Mesh(new T.CylinderGeometry(0.27, 0.34, h, 12), lad); c.position.set(x, yBase + h / 2, z); c.castShadow = true; G.add(c); const an = new T.Mesh(new T.TorusGeometry(0.3, 0.06, 6, 14), pm); an.rotation.x = Math.PI / 2; an.position.set(x, yBase + h - 0.1, z); G.add(an); const rem = new T.Mesh(new T.ConeGeometry(0.4, 0.4, 12), mat('#4a3b34')); rem.position.set(x, yBase + h + 0.2, z); G.add(rem); const mush = new T.Mesh(new T.CylinderGeometry(0.1, 0.12, 0.3, 8), mat('#b4643d')); mush.position.set(x, yBase + h + 0.5, z); G.add(mush); return; }
    caja(G, 0.62, h, 0.62, pm, x, yBase, z); caja(G, 0.8, 0.1, 0.8, pm, x, yBase + h, z); caja(G, 0.68, 0.14, 0.68, pm, x, yBase + h - 0.12, z);
    for (const s of [-0.14, 0.14]) { const t = new T.Mesh(new T.CylinderGeometry(0.1, 0.12, 0.38, 8), mat('#b4643d')); t.position.set(x + s, yBase + h + 0.29, z); t.castShadow = true; G.add(t); }
  }

  // ---------- Fachada ----------
  // Material compartido de las ventanas encendidas: su brillo lo sube pueblo_vida.js al caer la noche
  const LUZ = new T.MeshStandardMaterial({ color: 0x2b2118, emissive: 0xffc66a, emissiveIntensity: 0, roughness: 1 });
  const CORTINAS = ['#e8dcc4', '#d6c7a8', '#b8c4b6', '#c9a79a', '#a9b6c4', '#e0d6c6'];
  function bloque(G, M, E, w, d, pisos, muro, txt, acento, r, opts) {
    const o = opts || {}, hP = 3.1, h = pisos * hP, cols = Math.max(1, Math.floor(w / 2.4)), conPuerta = o.puerta !== false;
    const cMuro = envejecer(muro, r, 0.92, 0.06), mM = murMat(cMuro), mP = piedraMat(envejecer('#a39784', r, 0.9, 0.1)), mPc = piedraMat(envejecer('#b9ad98', r, 0.9, 0.08));
    const vidrio = MATS.vidrio || (MATS.vidrio = new T.MeshStandardMaterial({ color: 0x24323d, roughness: 0.06, metalness: 0.55, transparent: true, opacity: 0.78 }));
    const interior = mat('#0d1116', { roughness: 1 }), blanco = mat('#e6dfd0', { roughness: 0.7 }), hierro = mat('#1d2024', { roughness: 0.55, metalness: 0.6 });
    const post = E.postigos ? E.postigos[(r() * E.postigos.length) | 0] : '#5a4630', postC = envejecer(post, r, 0.85, 0.05);
    const tPost = tex(M, 'postigo-' + postC, 64, (x, n) => { x.fillStyle = postC; x.fillRect(0, 0, n, n); const rr = rn('p' + postC); for (let y = 3; y < n; y += 5) { x.fillStyle = 'rgba(0,0,0,.34)'; x.fillRect(5, y, n - 10, 1.6); x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(5, y + 1.8, n - 10, 1); } x.strokeStyle = 'rgba(0,0,0,.4)'; x.lineWidth = 3; x.strokeRect(1.5, 1.5, n - 3, n - 3); for (let i = 0; i < 90; i++) { x.fillStyle = rr() < 0.5 ? 'rgba(0,0,0,.07)' : 'rgba(255,255,255,.07)'; x.fillRect(rr() * n, rr() * n, 2, 4); } });
    const mPost = tPost ? new T.MeshStandardMaterial({ map: tPost, roughness: 0.85 }) : mat(postC);
    // volumen, zócalo de piedra y esquinas de sillería
    const base = new T.Mesh(new T.BoxGeometry(w, h, d), mM); base.position.y = h / 2; base.castShadow = true; base.receiveShadow = true; G.add(base);
    const zH = E.clave === 'andaluz' ? 0.85 : 0.8; caja(G, w + 0.1, zH, d + 0.1, E.clave === 'andaluz' ? mat('#cfc6b4') : mP, 0, 0, 0); caja(G, w + 0.14, 0.07, d + 0.14, mPc, 0, zH, 0);
    if (E.clave !== 'andaluz' && (E.piedraFrac === undefined || r() < Math.max(0.35, E.piedraFrac + 0.2))) for (const s of [-1, 1]) for (let k = 0; k * 0.5 < h - 0.5; k++) { const wq = k % 2 ? 0.34 : 0.56; caja(G, wq, 0.46, 0.36, mPc, s * (w / 2 - wq / 2 + 0.03), 0.9 + k * 0.5, d / 2 - 0.15, 0, false); }
    // calcomanías de desgaste (frente, lados y fondo)
    { const v = (r() * 3) | 0, tf = decalFachada(M, w, h, cols, pisos, v, false), tl = decalFachada(M, d, h, 1, pisos, v, true), mf = matDecal(tf, 'f' + cols + '_' + pisos + '_' + Math.round(w) + '_' + Math.round(h) + '_' + v), ml = matDecal(tl, 'l' + Math.round(d) + '_' + Math.round(h) + '_' + v);
      if (mf) { const pf = new T.Mesh(new T.PlaneGeometry(w, h), mf); pf.position.set(0, h / 2, d / 2 + 0.013); G.add(pf); const pb = new T.Mesh(new T.PlaneGeometry(w, h), mf); pb.position.set(0, h / 2, -d / 2 - 0.013); pb.rotation.y = Math.PI; G.add(pb); }
      if (ml) for (const s of [-1, 1]) { const ps = new T.Mesh(new T.PlaneGeometry(d, h), ml); ps.position.set(s * (w / 2 + 0.013), h / 2, 0); ps.rotation.y = s * Math.PI / 2; G.add(ps); } }
    // ventanas (algunas casas con arcos de medio punto; otras con un mirador semicircular en la primera planta)
    const arcoV = r() < 0.32, mi = (pisos >= 2 && cols >= 2 && r() < 0.34) ? ((r() * cols) | 0) : -1;
    for (let p = 0; p < pisos; p++) for (let i = 0; i < cols; i++) {
      const x = -w / 2 + (i + 0.5) * w / cols + (r() - 0.5) * 0.14; if (p === 0 && conPuerta && Math.abs(x) < 1.1) continue;
      if (p === 1 && i === mi) { mirador(G, x, hP + 0.95, d / 2, mM, mPc, vidrio, tejaMat(envejecer(E.teja || '#b4643d', r, 1, 0.1)), blanco); continue; }
      const wy = p * hP + (p === 0 ? 1.15 : 1.0), vw = 0.9, vh = p === 0 ? 1.25 : 1.4, zf = d / 2;
      const hueco = new T.Mesh(new T.BoxGeometry(vw, vh, 0.04), r() < 0.4 ? LUZ : interior); hueco.position.set(x, wy + vh / 2, zf + 0.002); G.add(hueco);                       // fondo oscuro del hueco
      if (r() < 0.72) { const cc = new T.Mesh(new T.PlaneGeometry(vw * 0.5, vh * 0.7), mat(CORTINAS[(r() * CORTINAS.length) | 0], { roughness: 1 })); cc.position.set(x + (r() < 0.5 ? -0.2 : 0.2), wy + vh * 0.62, zf + 0.03); G.add(cc); }            // cortina
      const cr = new T.Mesh(new T.PlaneGeometry(vw, vh), vidrio); cr.position.set(x, wy + vh / 2, zf + 0.045); G.add(cr);
      caja(G, 0.045, vh, 0.07, blanco, x, wy, zf + 0.05, 0, false); caja(G, vw, 0.045, 0.07, blanco, x, wy + vh * 0.56, zf + 0.05, 0, false);         // cruceta
      for (const s of [-1, 1]) caja(G, 0.07, vh + 0.02, 0.07, blanco, x + s * (vw / 2), wy, zf + 0.05, 0, false); caja(G, vw + 0.14, 0.07, 0.07, blanco, x, wy + vh, zf + 0.05, 0, false);
      for (const s of [-1, 1]) caja(G, 0.14, vh + 0.2, 0.12, mPc, x + s * (vw / 2 + 0.14), wy - 0.04, zf + 0.04, 0, false);                                    // jambas de piedra
      if (arcoV) { const hd = new T.Mesh(new T.CircleGeometry(vw / 2, 14, 0, Math.PI), interior); hd.position.set(x, wy + vh, zf + 0.004); G.add(hd); const gl = new T.Mesh(new T.CircleGeometry(vw / 2, 14, 0, Math.PI), vidrio); gl.position.set(x, wy + vh, zf + 0.046); G.add(gl); const ar = new T.Mesh(new T.TorusGeometry(vw / 2 + 0.1, 0.085, 6, 16, Math.PI), mPc); ar.position.set(x, wy + vh, zf + 0.07); ar.scale.z = 0.8; G.add(ar); const ar2 = new T.Mesh(new T.TorusGeometry(vw / 2, 0.025, 5, 14, Math.PI), blanco); ar2.position.set(x, wy + vh, zf + 0.055); G.add(ar2); caja(G, 0.045, vw / 2, 0.07, blanco, x, wy + vh, zf + 0.05, 0, false); }
      else caja(G, vw + 0.5, 0.17, 0.16, mPc, x, wy + vh + 0.05, zf + 0.05, 0, false);
      caja(G, vw + 0.46, 0.1, 0.3, mPc, x, wy - 0.1, zf + 0.12, 0, false);    // dintel y alféizar
      const modo = r(), plantaBaja = p === 0;
      if (plantaBaja && modo < 0.4) { for (let b = 0; b < 5; b++) cil(G, 0.014, vh + 0.1, hierro, x - vw / 2 + 0.1 + b * (vw - 0.2) / 4, wy - 0.02, zf + 0.15, 5); caja(G, vw, 0.025, 0.025, hierro, x, wy + vh * 0.35, zf + 0.15, 0, false); caja(G, vw, 0.025, 0.025, hierro, x, wy + vh * 0.78, zf + 0.15, 0, false); }       // reja
      else if (E.postigos && modo < 0.88) for (const s of [-1, 1]) {
        const abierta = r() < 0.55, th = abierta ? 1.0 + r() * 0.5 : 0.0, hx = x + s * (vw / 2 + 0.08), lf = new T.Mesh(new T.BoxGeometry(0.46, vh + 0.1, 0.045), mPost);
        const dx = s * Math.cos(th), dz = Math.sin(th); lf.position.set(hx + dx * 0.23, wy + vh / 2, zf + 0.06 + dz * 0.23); lf.rotation.y = -Math.atan2(dz, dx) + (s < 0 ? Math.PI : 0); lf.castShadow = true; G.add(lf);
      }
      if (r() < 0.3) { caja(G, vw + 0.1, 0.17, 0.26, maderaMat('#6b4a2b'), x, wy - 0.3, zf + 0.2); for (let k = 0; k < 5; k++) { const fl = new T.Mesh(new T.IcosahedronGeometry(0.07 + r() * 0.03, 0), mat(['#b83a30', '#d6678f', '#e8b53a', '#efeadb', '#7a4aa8'][(r() * 5) | 0])); fl.position.set(x - vw / 2 + 0.1 + k * (vw - 0.2) / 4, wy - 0.1 + r() * 0.06, zf + 0.2); G.add(fl); } }
    }
    // puerta con arco de piedra, hoja de tablones y herrajes
    if (conPuerta) {
      const tP = tex(M, 'puerta-tablones', 128, (x, n) => { const rr = rn('puerta'); x.fillStyle = '#4a3220'; x.fillRect(0, 0, n, n); for (let k = 0; k < 6; k++) { x.fillStyle = ['#553a26', '#47301f', '#5c4129'][k % 3]; x.fillRect(k * n / 6 + 1, 0, n / 6 - 2, n); for (let g = 0; g < 14; g++) { x.fillStyle = 'rgba(0,0,0,.13)'; x.fillRect(k * n / 6 + 3 + rr() * (n / 6 - 8), rr() * n, 1.4, 6 + rr() * 22); } } x.fillStyle = '#1a1c1e'; for (const yy of [n * 0.18, n * 0.78]) { x.fillRect(0, yy, n, 7); for (let k = 0; k < 6; k++) { x.beginPath(); x.arc(k * n / 6 + n / 12, yy + 3.5, 2.2, 0, 6.3); x.fill(); } } }), mD = tP ? new T.MeshStandardMaterial({ map: tP, roughness: 0.85 }) : mat('#4a3220');
      const df = d / 2, dw = 1.15, dh = 2.15;
      caja(G, dw, dh, 0.07, mD, 0, 0.1, df + 0.025, 0, false); const ar = new T.Mesh(new T.CircleGeometry(dw / 2, 14, 0, Math.PI), mD); ar.position.set(0, 0.1 + dh, df + 0.062); G.add(ar);
      for (const s of [-1, 1]) caja(G, 0.24, dh + 0.1, 0.14, mPc, s * (dw / 2 + 0.12), 0, df + 0.05, 0, false);
      const arco = new T.Mesh(new T.TorusGeometry(dw / 2 + 0.12, 0.12, 6, 16, Math.PI), mPc); arco.position.set(0, 0.1 + dh, df + 0.07); arco.scale.set(1, 1, 0.8); G.add(arco);
      caja(G, 2.0, 0.2, 0.7, mP, 0, 0, df + 0.34); caja(G, 1.7, 0.1, 0.3, mPc, 0, 0.2, df + 0.15);
      const kn = new T.Mesh(new T.TorusGeometry(0.07, 0.015, 6, 12), hierro); kn.position.set(0.28, 1.1, df + 0.08); G.add(kn);
      const fa = new T.Group(); fa.position.set(dw / 2 + 0.55, 2.3, df + 0.1); G.add(fa); caja(fa, 0.04, 0.3, 0.04, hierro, 0, -0.15, 0.04); caja(fa, 0.2, 0.26, 0.2, new T.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffd27a, emissiveIntensity: 0.7, transparent: true, opacity: 0.9 }), 0, 0, 0.12); caja(fa, 0.26, 0.04, 0.26, hierro, 0, 0.26, 0.12);
    }
    // detalles de pared: bajante, cableado, aire acondicionado, parabólica
    if (r() < 0.65) cil(G, 0.045, h - 0.1, '#6b6f73', w / 2 - 0.1, 0, d / 2 + 0.08, 6);
    if (r() < 0.55) { const ac = caja(G, 0.8, 0.5, 0.34, '#d9dcdf', -w / 2 + 0.9 + r() * (w - 1.8), hP * Math.min(pisos, 2) - 0.8, d / 2 + 0.22); void ac; }
    if (r() < 0.35 && pisos >= 2) { const pa = new T.Mesh(new T.SphereGeometry(0.26, 10, 6, 0, 6.283, 0, 1.2), mat('#dedede')); pa.rotation.x = -1.2; pa.position.set(-w / 2 + 0.8 + r() * (w - 1.6), h - 0.9, d / 2 + 0.2); G.add(pa); }
    if (acento) {
      const aw = Math.min(w - 0.6, 4.5), ca = envejecer(acento, r, 0.85, 0.04), tL = tex(M, 'toldo-' + ca, 128, (x, n) => { x.fillStyle = '#efe8da'; x.fillRect(0, 0, n, n); x.fillStyle = ca; for (let k = 0; k < 8; k += 2) x.fillRect(k * n / 8, 0, n / 8, n); for (let i = 0; i < 400; i++) { x.fillStyle = 'rgba(0,0,0,' + (Math.random() * 0.06) + ')'; x.fillRect(Math.random() * n, Math.random() * n, 2, 2); } });
      const mt = tL ? new T.MeshStandardMaterial({ map: tL, roughness: 1, side: T.DoubleSide }) : mat(ca), tl = new T.Mesh(new T.PlaneGeometry(aw, 1.15), mt); tl.position.set(0, 2.55, d / 2 + 0.55); tl.rotation.x = -Math.PI / 2 + 0.55; tl.castShadow = true; G.add(tl);
      const va = new T.Mesh(new T.PlaneGeometry(aw, 0.22), mt); va.position.set(0, 2.18, d / 2 + 1.04); G.add(va);
      for (const s of [-1, 1]) { const br = new T.Mesh(new T.BoxGeometry(0.03, 0.03, 1.1), hierro); br.position.set(s * (aw / 2 - 0.05), 2.4, d / 2 + 0.55); br.rotation.x = -0.55; G.add(br); }
    }
    // cornisa de moldura redondeada y ojo de buey en un hastial
    for (const sz of [1, -1]) { const co = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, w + 0.12, 10).rotateZ(Math.PI / 2), mPc); co.position.set(0, h - 0.08, sz * (d / 2 + 0.07)); G.add(co); caja(G, w + 0.1, 0.12, 0.2, mPc, 0, h - 0.3, sz * (d / 2 + 0.05), 0, false); }
    if (r() < 0.55) { const s = r() < 0.5 ? 1 : -1, hy = h + Math.max(1.5, d * 0.24 + 0.4 * (E.pendiente || 0)) * 0.32, ob = new T.Group(); ob.position.set(s * (w / 2 + 0.016), hy, 0); ob.rotation.y = s * Math.PI / 2; G.add(ob); const od = new T.Mesh(new T.CircleGeometry(0.3, 16), interior); ob.add(od); const og = new T.Mesh(new T.CircleGeometry(0.27, 16), vidrio); og.position.z = 0.01; ob.add(og); const ot = new T.Mesh(new T.TorusGeometry(0.31, 0.06, 6, 18), mPc); ot.position.z = 0.02; ob.add(ot); for (const a of [0, Math.PI / 2]) { const bar = new T.Mesh(new T.BoxGeometry(0.03, 0.56, 0.03), blanco); bar.position.z = 0.02; bar.rotation.z = a; ob.add(bar); } }
    if (conPuerta && !o.anexo && pisos >= 2 && w >= 5 && r() < 0.15) torreta(G, (r() < 0.5 ? 1 : -1) * (w / 2 - 0.35), d / 2 - 0.35, h, mM, mP, mPc, tejaMat(envejecer(E.teja || '#b4643d', r, 1, 0.1)), vidrio, interior);
    // tejado, chimeneas y antena
    const hT = Math.max(1.5, d * 0.24 + 0.4 * (E.pendiente || 0)), tej = E.teja || '#b4643d', cT = envejecer(new T.Color(tej).multiplyScalar(0.8).getStyle(), r, 1.0, 0.12);
    tejado(G, w, d, hT, cT, h, r, mM);
    if (r() < 0.78) chimenea(G, -w / 2 + 0.8 + r() * (w - 1.6), h + hT * 0.4, -d * 0.12 - 0.1, r);
    if (r() < 0.3) { const an = new T.Group(); an.position.set(w / 2 - 0.8, h + hT * 0.9, 0.2); G.add(an); caja(an, 0.03, 1.6, 0.03, '#555', 0, 0, 0); for (let k = 0; k < 3; k++) caja(an, 0.9 - k * 0.2, 0.025, 0.025, '#555', 0, 0.7 + k * 0.28, 0); }
    if (txt) { const s = rotulo2(M, txt, acento ? envejecer(acento, r, 0.7, 0.04) : '#3a4a5a'); s.position.set(0, Math.min(h - 0.7, 3.5), d / 2 + 0.1); G.add(s); caja(G, 2.4, 0.67, 0.05, maderaMat('#4b3524'), 0, Math.min(h - 0.7, 3.5) - 0.35, d / 2 + 0.075, 0, false); for (const sx of [-1, 1]) caja(G, 0.05, 0.05, 0.2, hierro, sx * 1.1, Math.min(h - 0.7, 3.5) + 0.38, d / 2 + 0.12, 0, false); }
    return h;
  }
  // Cartel de madera pintada: usa la franja superior del lienzo (4:1), con marco y letras crema
  // Mirador semicircular sobre una repisa cónica, con cristalera de paños, cornisa y tejadillo cónico
  function mirador(G, x, y0, zf, mM, mPc, vidrio, mTeja, blanco) {
    const R = 0.85, hh = 1.9, h0 = -Math.PI / 2, pi = Math.PI;
    const cuerpo = new T.Mesh(new T.CylinderGeometry(R, R, hh, 18, 1, false, h0, pi), mM); cuerpo.position.set(x, y0 + hh / 2, zf); cuerpo.castShadow = true; G.add(cuerpo);
    const cris = new T.Mesh(new T.CylinderGeometry(R + 0.02, R + 0.02, 1.2, 18, 1, true, h0, pi), vidrio); cris.position.set(x, y0 + 0.95, zf); G.add(cris);
    for (let k = 0; k <= 6; k++) { const a = -pi / 2 + 0.14 + k * (pi - 0.28) / 6; caja(G, 0.05, 1.3, 0.05, blanco, x + Math.sin(a) * (R + 0.03), y0 + 0.3, zf + Math.cos(a) * (R + 0.03), 0, false); }
    for (const yy of [0.32, 1.52]) { const ar = new T.Mesh(new T.CylinderGeometry(R + 0.08, R + 0.08, 0.1, 18, 1, false, h0, pi), mPc); ar.position.set(x, y0 + yy, zf); G.add(ar); }
    const cor = new T.Mesh(new T.CylinderGeometry(R + 0.12, R + 0.12, 0.18, 18, 1, false, h0, pi), mPc); cor.position.set(x, y0 + hh + 0.02, zf); G.add(cor);
    const repisa = new T.Mesh(new T.ConeGeometry(R + 0.05, 0.75, 18, 1, false, h0, pi), mPc); repisa.rotation.x = Math.PI; repisa.position.set(x, y0 - 0.37, zf); repisa.castShadow = true; G.add(repisa);
    const tej = new T.Mesh(new T.ConeGeometry(R + 0.28, 1.0, 18, 1, false, h0, pi), mTeja); tej.position.set(x, y0 + hh + 0.58, zf); tej.castShadow = true; G.add(tej);
    const bo = new T.Mesh(new T.SphereGeometry(0.08, 8, 6), mat('#b08a3a', { metalness: 0.7, roughness: 0.4 })); bo.position.set(x, y0 + hh + 1.12, zf); G.add(bo);
  }
  // Torreón cilíndrico en una esquina de la fachada: basamento, cuerpo con troneras, cornisa redonda y chapitel cónico con veleta
  function torreta(G, cx, cz, h, mM, mP, mPc, mTeja, vidrio, interior) {
    const R = 0.95, alto = h + 1.1, tg = new T.Group(); tg.position.set(cx, 0, cz); G.add(tg);
    const cu = new T.Mesh(new T.CylinderGeometry(R, R, alto, 20), mM); cu.position.y = alto / 2; cu.castShadow = true; tg.add(cu);
    const ba = new T.Mesh(new T.CylinderGeometry(R + 0.12, R + 0.16, 0.95, 20), mP); ba.position.y = 0.47; tg.add(ba); const bo = new T.Mesh(new T.TorusGeometry(R + 0.1, 0.07, 6, 20), mPc); bo.rotation.x = Math.PI / 2; bo.position.y = 0.97; tg.add(bo);
    for (const yy of [alto - 0.1, alto * 0.5]) { const co = new T.Mesh(new T.TorusGeometry(R + 0.04, 0.09, 6, 22), mPc); co.rotation.x = Math.PI / 2; co.position.y = yy; tg.add(co); }
    for (let p = 0; p < 2; p++) for (const a of [-0.5, 0.5]) { const ang = a + (cx > 0 ? 0.5 : -0.5), y = 1.9 + p * 3.1; const sl = new T.Mesh(new T.BoxGeometry(0.2, 0.8, 0.12), interior); sl.position.set(Math.sin(ang) * (R + 0.005), y + 0.4, Math.cos(ang) * (R + 0.005)); sl.rotation.y = ang; tg.add(sl); const hd = new T.Mesh(new T.CircleGeometry(0.1, 8, 0, Math.PI), interior); hd.position.set(Math.sin(ang) * (R + 0.006), y + 0.8, Math.cos(ang) * (R + 0.006)); hd.rotation.y = ang; tg.add(hd); }
    const te = new T.Mesh(new T.CylinderGeometry(0.0, R + 0.35, 2.1, 20), mTeja); te.position.y = alto + 1.05; te.castShadow = true; tg.add(te);
    const bl = new T.Mesh(new T.SphereGeometry(0.09, 8, 6), mat('#b08a3a', { metalness: 0.7, roughness: 0.4 })); bl.position.y = alto + 2.15; tg.add(bl); caja(tg, 0.02, 0.7, 0.02, '#23282d', 0, alto + 2.2, 0);
  }
  // Balcón con la frente curva: losa en media luna, barandilla de forja con barrotes y macetas a lo largo del arco
  function balconCurvo(g, bx, by, bw, dz, r) {
    const hierro = mat('#1d2024', { roughness: 0.55, metalness: 0.6 }), pie = piedraMat('#b9ad98'), A = Math.PI, h0 = -A / 2;
    const losa = new T.Mesh(new T.CylinderGeometry(1, 1, 0.14, 24, 1, false, h0, A), pie); losa.scale.set(bw / 2, 1, 0.85); losa.position.set(bx, by + 0.07, dz); losa.castShadow = true; g.add(losa);
    const bajo = new T.Mesh(new T.CylinderGeometry(0.95, 0.7, 0.2, 24, 1, false, h0, A), pie); bajo.scale.set(bw / 2, 1, 0.8); bajo.position.set(bx, by - 0.08, dz); g.add(bajo);
    const pas = new T.Mesh(new T.TorusGeometry(1, 0.025, 6, 24, A), hierro); pas.rotation.x = Math.PI / 2; pas.rotation.z = -A / 2; pas.scale.set(bw / 2 - 0.05, 0.8, 1); pas.position.set(bx, by + 1.0, dz); g.add(pas);
    const tor = pas.clone(); tor.position.y = by + 0.2; g.add(tor);
    const nb = Math.max(7, Math.round(bw * 4.5)); for (let k = 0; k <= nb; k++) { const a = h0 + k / nb * A, bxk = bx + Math.sin(a) * (bw / 2 - 0.07), bzk = dz + Math.cos(a) * 0.85 * 0.93; const bar = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.82, 5), hierro); bar.position.set(bxk, by + 0.6, bzk); g.add(bar); if (k % 2 === 0) { const bola = new T.Mesh(new T.SphereGeometry(0.03, 6, 5), hierro); bola.position.set(bxk, by + 0.62, bzk); g.add(bola); } }
    for (let k = 0; k < 3; k++) { const a = h0 + (k + 0.5) / 3 * A, mx = bx + Math.sin(a) * (bw / 2 - 0.25), mz = dz + Math.cos(a) * 0.7; const mac = new T.Mesh(new T.CylinderGeometry(0.13, 0.09, 0.2, 8), mat('#b4643d')); mac.position.set(mx, by + 0.24, mz); g.add(mac); for (let q = 0; q < 4; q++) { const fl = new T.Mesh(new T.IcosahedronGeometry(0.09, 0), mat(['#b83a30', '#d6678f', '#e8b53a', '#efeadb'][(r() * 4) | 0])); fl.position.set(mx + (r() - 0.5) * 0.16, by + 0.4 + r() * 0.08, mz + (r() - 0.5) * 0.16); g.add(fl); } }
  }
  function rotulo2(M, txt, fondo) {
    const t = M.textura('cartel-casa-' + txt + fondo, 512, (x, n) => {
      const H = n / 4; x.fillStyle = fondo; x.fillRect(0, 0, n, H); x.strokeStyle = 'rgba(240,226,190,.8)'; x.lineWidth = 4; x.strokeRect(8, 8, n - 16, H - 16);
      for (let i = 0; i < 260; i++) { x.fillStyle = 'rgba(0,0,0,' + (Math.random() * 0.1) + ')'; x.fillRect(Math.random() * n, Math.random() * H, 24, 1.2); }
      let fs = 60; x.font = 'bold ' + fs + 'px Georgia, serif'; while (x.measureText(txt).width > n - 50 && fs > 22) { fs -= 3; x.font = 'bold ' + fs + 'px Georgia, serif'; }
      x.fillStyle = '#f0e6c8'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, n / 2, H / 2 + 2);
    });
    const g = new T.PlaneGeometry(2.3, 0.575), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 0.75 + uv.getY(i) * 0.25);
    return new T.Mesh(g, t ? new T.MeshStandardMaterial({ map: t, roughness: 0.8 }) : mat(fondo));
  }
  GM.casasReal = { luzVentana: LUZ, bloque, tejado, chimenea, balconCurvo, mirador, torreta, envejecer, murMat, piedraMat, tejaMat, maderaMat };
})();
