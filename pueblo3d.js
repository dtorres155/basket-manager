/* PUEBLO 3D (GM.pueblo3d) — escena del pueblo natal (modo carrera)
   Pueblo de colina amurallado al estilo de los pueblos medievales españoles (y Monteriggioni como inspiración): relieve,
   campos, olivos y cipreses, río con puente, camino que sube a la puerta, muralla con torres, plaza mayor con iglesia y
   ayuntamiento con soportales, calles empedradas y casas con textura, teja árabe, postigos, balcones y macetas.
   Crece con el nivel del pueblo (1 aldea, 2 pueblo, 3 villa, 4 ciudad pequeña, 5 ciudad del baloncesto) y el estilo
   depende de la región: piedra catalana, ocre castellano, blanco andaluz o toscano.
   Expone: construir(vista, mundo, st, ctx), estiloDe(nombre, nac), alt(x, z), ESTILOS. No escribe en el estado.
   Las infraestructuras del jugador (ctx.edificios) se colocan en sitios fijos y llevan userData.tipo (se pueden tocar).
   Todo el azar es local y con semilla (no usa GM.rng: dibujar no debe cambiar la partida). */
(function () {
  const U = GM.util;
  // ---------- Estilos por región ----------
  const ESTILOS = {
    catalan: { nombre: 'piedra catalana', muros: ['#b8a487', '#a99577', '#c3b192'], revoco: ['#dccdb1', '#cfbd9c'], piedraFrac: 0.7, teja: '#a9583a', postigos: ['#5a3c26', '#4b5e3b', '#6d4b2e'], pendiente: 0.42, torre: 'piramide', zocalo: null, tierra: '#a89778' },
    castellano: { nombre: 'ocre castellano', muros: ['#d6b47c', '#c9a46a', '#e0c08b'], revoco: ['#e6cfa2', '#d9bd88'], piedraFrac: 0.25, teja: '#b4643d', postigos: ['#5a3b22', '#7a2f22', '#3d4f5e'], pendiente: 0.36, torre: 'campanario', zocalo: '#a88a5c', tierra: '#b59a6c' },
    andaluz: { nombre: 'blanco andaluz', muros: ['#f4f1ea', '#efebe2', '#f8f6f1'], revoco: ['#f4f1ea', '#fbfaf6'], piedraFrac: 0, teja: '#b86a43', postigos: ['#2f6f9e', '#3c7a3a', '#7a2f22'], pendiente: 0.26, torre: 'blanca', zocalo: '#d4a640', tierra: '#c2a477' },
    toscano: { nombre: 'toscano', muros: ['#cf9f66', '#c28f58', '#d8ad78'], revoco: ['#dcb27e', '#c99a64'], piedraFrac: 0.35, teja: '#a4502c', postigos: ['#3f5f3a', '#5a4630'], pendiente: 0.3, torre: 'almenada', zocalo: null, tierra: '#b08d62' }
  };
  const POR_NOMBRE = { 'Vilanova de Sau': 'catalan', 'Sant Martí del Vall': 'catalan', 'Torrelles del Monte': 'castellano', 'Castellar Alto': 'castellano', 'Fuente Clara': 'castellano', 'Alcudia de la Sierra': 'andaluz', 'Pozoblanco Nuevo': 'andaluz' };
  const POR_PAIS = { IT: 'toscano', FR: 'catalan', GR: 'andaluz', TR: 'castellano' };
  function estiloDe(nombre, nac) { return POR_NOMBRE[nombre] || POR_PAIS[nac] || (nac === 'ES' ? 'castellano' : 'castellano'); }

  // ---------- Azar con semilla y ruido ----------
  function rnd(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function h2(x, z) { return (U.hash(x + ':' + z) >>> 0) / 4294967296; }
  function ruido(x, z) {
    const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi, s = t => t * t * (3 - 2 * t);
    const a = h2(xi, zi), b = h2(xi + 1, zi), c = h2(xi, zi + 1), d = h2(xi + 1, zi + 1), u = s(fx), v = s(fz);
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
  }
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  // ---------- Relieve ----------
  const H = 7, RH = 21;
  const zRio = x => 34 + Math.sin(x * 0.045) * 7 + Math.sin(x * 0.12 + 1) * 2.5;
  function alt(x, z) {
    const r = Math.hypot(x, z), colina = H / (1 + Math.pow(r / RH, 4));
    const ond = (ruido(x * 0.06 + 10, z * 0.06) - 0.5) * 2.4 + (ruido(x * 0.15, z * 0.15 + 7) - 0.5) * 0.7;
    const dr = z - zRio(x), valle = -3.2 * Math.exp(-(dr * dr) / 30);
    return colina + ond * smooth(RH * 0.55, RH * 1.3, r) + valle;
  }

  // ---------- Texturas por canvas (si no hay canvas, colores lisos) ----------
  const TX = {};
  function canvasOk() { try { const c = document.createElement('canvas').getContext('2d'); return !!(c && c.fillRect); } catch (e) { return false; } }
  function textura(clave, dibujar, n) {
    if (TX[clave] !== undefined) return TX[clave];
    if (!canvasOk()) return (TX[clave] = null);
    const c = document.createElement('canvas'); c.width = c.height = n || 256; const x = c.getContext('2d'); dibujar(x, c.width, rnd(U.hash(clave)));
    const t = new THREE.CanvasTexture(c); t.name = clave; t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
    return (TX[clave] = t);
  }
  const tono = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v * k))); return 'rgb(' + f(n >> 16) + ',' + f((n >> 8) & 255) + ',' + f(n & 255) + ')'; };
  const dib = {
    revoco: (base) => (x, n, r) => { x.fillStyle = base; x.fillRect(0, 0, n, n); for (let i = 0; i < 2600; i++) { x.fillStyle = tono(base, 0.86 + r() * 0.22); x.globalAlpha = 0.18 + r() * 0.25; const s = 1 + r() * 3; x.fillRect(r() * n, r() * n, s, s); } x.globalAlpha = 0.1; for (let i = 0; i < 14; i++) { x.fillStyle = tono(base, 0.8); x.fillRect(r() * n, r() * n * 0.6, 2 + r() * 3, 20 + r() * 60); } x.globalAlpha = 1; },
    piedra: (base) => (x, n, r) => { x.fillStyle = tono(base, 0.62); x.fillRect(0, 0, n, n); let y = 0; while (y < n) { const hh = 14 + r() * 12; let px = -r() * 20; while (px < n) { const w = 22 + r() * 30; x.fillStyle = tono(base, 0.82 + r() * 0.32); x.beginPath(); if (x.roundRect) x.roundRect(px + 1.5, y + 1.5, w - 3, hh - 3, 4); else x.rect(px + 1.5, y + 1.5, w - 3, hh - 3); x.fill(); px += w; } y += hh; } },
    ladrillo: (base) => (x, n, r) => { x.fillStyle = '#d9c9ad'; x.fillRect(0, 0, n, n); const hh = n / 16; for (let f = 0; f < 16; f++) for (let c = -1; c < 8; c++) { x.fillStyle = tono(base, 0.85 + r() * 0.25); x.fillRect(c * (n / 8) + (f % 2) * (n / 16) + 1, f * hh + 1, n / 8 - 2, hh - 2); } },
    teja: (base) => (x, n, r) => { x.fillStyle = tono(base, 0.55); x.fillRect(0, 0, n, n); const filas = 8, cols = 10, fh = n / filas, cw = n / cols; for (let f = 0; f < filas; f++) for (let c = 0; c < cols; c++) { const k = 0.8 + r() * 0.35, px = c * cw + (f % 2) * cw / 2, g = x.createLinearGradient(px, 0, px + cw, 0); g.addColorStop(0, tono(base, k * 0.7)); g.addColorStop(0.5, tono(base, k * 1.12)); g.addColorStop(1, tono(base, k * 0.7)); x.fillStyle = g; x.fillRect(px + 1, f * fh, cw - 2, fh - 2); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(px + 1, f * fh + fh - 4, cw - 2, 3); } },
    empedrado: (base) => (x, n, r) => { x.fillStyle = tono(base, 0.55); x.fillRect(0, 0, n, n); for (let i = 0; i < 520; i++) { const s = 7 + r() * 8; x.fillStyle = tono(base, 0.78 + r() * 0.4); x.beginPath(); x.ellipse(r() * n, r() * n, s * 0.6, s * 0.5, r() * 3, 0, 6.29); x.fill(); } },
    hierba: () => (x, n, r) => { x.fillStyle = '#d9d9d9'; x.fillRect(0, 0, n, n); for (let i = 0; i < 4000; i++) { const k = 150 + r() * 105 | 0; x.fillStyle = 'rgb(' + k + ',' + k + ',' + k + ')'; x.fillRect(r() * n, r() * n, 1 + r() * 2, 1 + r() * 3); } }
  };
  const MATS = {};
  function mat(clave, color, dibujo, rep) {
    if (MATS[clave]) return MATS[clave];
    const t = dibujo ? textura(clave, dibujo) : null, m = new THREE.MeshLambertMaterial({ color: t ? 0xffffff : color });
    if (t) m.map = t; return (MATS[clave] = m);
  }
  const liso = color => GM.kit.mat(typeof color === 'string' ? GM.kit.color(color) : color);

  // UV en metros según la cara (textura con la misma densidad en todas las piezas, y así se fusionan bien)
  function uvMetros(geo, escala) {
    const p = geo.attributes.position, nrm = geo.attributes.normal, uv = new Float32Array(p.count * 2), e = escala || 2;
    for (let i = 0; i < p.count; i++) {
      const ax = Math.abs(nrm.getX(i)), ay = Math.abs(nrm.getY(i)), az = Math.abs(nrm.getZ(i)), x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      if (ay >= ax && ay >= az) { uv[i * 2] = x / e; uv[i * 2 + 1] = z / e; } else if (ax >= az) { uv[i * 2] = z / e; uv[i * 2 + 1] = y / e; } else { uv[i * 2] = x / e; uv[i * 2 + 1] = y / e; }
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return geo;
  }
  function caja(g, w, h, d, m, x, y, z, ry, esc) { const geo = uvMetros(new THREE.BoxGeometry(w, h, d), esc); const me = new THREE.Mesh(geo, m); me.position.set(x, y + h / 2, z); if (ry) me.rotation.y = ry; g.add(me); return me; }
  // Tejado a dos aguas: cumbrera a lo largo del eje x local
  function tejado(g, w, d, alto, m, y, vuelo) {
    const v = vuelo || 0.18, W = w / 2 + v, D = d / 2 + v, sh = new THREE.Shape();
    sh.moveTo(-D, 0); sh.lineTo(0, alto); sh.lineTo(D, 0); sh.lineTo(D, -0.08); sh.lineTo(0, alto - 0.08); sh.lineTo(-D, -0.08);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: W * 2, bevelEnabled: false }); geo.translate(0, 0, -W); geo.rotateY(Math.PI / 2);
    const me = new THREE.Mesh(uvMetros(geo, 1.6), m); me.position.y = y; g.add(me);
    const hast = new THREE.Shape(); hast.moveTo(-d / 2, 0); hast.lineTo(0, alto - 0.05); hast.lineTo(d / 2, 0);
    return me;
  }
  // Tejado a cuatro aguas o chapitel
  function piramide(g, lado, alto, m, x, y, z) { const c = new THREE.Mesh(uvMetros(new THREE.ConeGeometry(lado * 0.72, alto, 4, 1), 1.4), m); c.rotation.y = Math.PI / 4; c.position.set(x, y + alto / 2, z); g.add(c); return c; }
  // Hastiales (triángulos de muro bajo el tejado a dos aguas)
  function hastial(g, d, alto, m, y, xLado) { const sh = new THREE.Shape(); sh.moveTo(-d / 2, 0); sh.lineTo(0, alto); sh.lineTo(d / 2, 0); const geo = new THREE.ShapeGeometry(sh); geo.rotateY(xLado > 0 ? Math.PI / 2 : -Math.PI / 2); const me = new THREE.Mesh(uvMetros(geo, 2), m); me.position.set(xLado, y, 0); g.add(me); }

  // ---------- Piezas ----------
  function materiales(E, S) {
    const k = E.clave;
    return {
      piedra: mat('p-' + k, E.muros[0], dib.piedra(E.muros[0])),
      piedras: E.muros.map((c, i) => mat('p' + i + '-' + k, c, dib.piedra(c))),
      revocos: E.revoco.map((c, i) => mat('r' + i + '-' + k, c, dib.revoco(c))),
      ladrillo: mat('l-' + k, '#b5653f', dib.ladrillo('#b5653f')),
      teja: mat('t-' + k, E.teja, dib.teja(E.teja)),
      empedrado: mat('e-' + k, '#a49680', dib.empedrado('#a49680')),
      oscuro: liso('#2a2420'), cristal: liso('#3d4a55'), madera: liso('#5a3b26'), hierro: liso('#26262a'),
      zocalo: E.zocalo ? liso(E.zocalo) : null, flores: [liso('#d8344a'), liso('#e86ca0'), liso('#f2f2f2')], hojas: liso('#3f7a3a'),
      maceta: liso(E.clave === 'andaluz' ? '#2f6f9e' : '#a55a35'), club1: liso(S.c1), club2: liso(S.c2), agua: liso('#5aa7cf')
    };
  }
  function casa(E, M, w, d, pisos, r, opc) {
    const g = new THREE.Group(), alto = pisos * 1.3 + 0.2, base = -1.6;
    const piedra = r() < E.piedraFrac, muro = piedra ? M.piedras[(r() * M.piedras.length) | 0] : (E.clave === 'toscano' && r() < 0.3 ? M.ladrillo : M.revocos[(r() * M.revocos.length) | 0]);
    caja(g, w, alto - base, d, muro, 0, base, 0);
    if (M.zocalo && !piedra) caja(g, w + 0.02, 0.45 - base, d + 0.02, M.zocalo, 0, base, 0);
    const pend = (E.pendiente + (r() - 0.5) * 0.08) * d;
    tejado(g, w, d, pend, M.teja, alto);
    if (r() < 0.6) caja(g, 0.35, 0.6, 0.35, muro, (r() - 0.5) * w * 0.6, alto + pend * 0.4, (r() - 0.5) * d * 0.3);
    const post = liso(E.postigos[(r() * E.postigos.length) | 0]), nv = Math.max(1, Math.floor(w / 1.15));
    for (let p = 0; p < pisos; p++) for (let i = 0; i < nv; i++) {
      const x = -w / 2 + (i + 0.5) * (w / nv), y = 0.35 + p * 1.3, fz = d / 2;
      if (p === 0 && i === (nv > 2 ? 1 : 0)) { caja(g, 0.72, 1.1, 0.06, M.madera, x, 0, fz + 0.01); continue; }
      caja(g, 0.46, 0.66, 0.05, M.cristal, x, y + 0.12, fz + 0.01);
      caja(g, 0.18, 0.68, 0.05, post, x - 0.33, y + 0.11, fz + 0.03); caja(g, 0.18, 0.68, 0.05, post, x + 0.33, y + 0.11, fz + 0.03);
      if (p >= 1 && r() < (opc.balcon || 0.35)) {
        caja(g, 0.9, 0.06, 0.32, muro, x, y + 0.04, fz + 0.16); caja(g, 0.9, 0.42, 0.03, M.hierro, x, y + 0.1, fz + 0.31);
        if (r() < 0.7) for (let k = 0; k < 3; k++) { caja(g, 0.12, 0.12, 0.12, M.maceta, x - 0.3 + k * 0.3, y + 0.1, fz + 0.2); caja(g, 0.14, 0.1, 0.14, M.flores[(r() * 3) | 0], x - 0.3 + k * 0.3, y + 0.22, fz + 0.2); }
        if (r() < opc.bandera) caja(g, 0.5, 0.55, 0.02, r() < 0.5 ? M.club1 : M.club2, x, y - 0.42, fz + 0.33);
      }
      caja(g, 0.46, 0.66, 0.05, M.cristal, x, y + 0.12, -fz - 0.01);
    }
    if (E.clave === 'andaluz' && r() < 0.5) for (let k = 0; k < 3; k++) { caja(g, 0.16, 0.16, 0.16, M.maceta, -w / 2 + 0.4 + k * 0.5, 1.55, d / 2 + 0.1); caja(g, 0.18, 0.12, 0.18, M.flores[k % 3], -w / 2 + 0.4 + k * 0.5, 1.71, d / 2 + 0.1); }
    return g;
  }
  function iglesia(E, M, nivel) {
    const g = new THREE.Group(), largo = 5 + nivel * 0.8, ancho = 3.4 + nivel * 0.2, alto = 3.2 + nivel * 0.3, muro = E.clave === 'andaluz' ? M.revocos[0] : M.piedra;
    caja(g, ancho, alto + 1.6, largo, muro, 0, -1.6, 0);
    tejado(g, largo, ancho, ancho * 0.42, M.teja, alto); g.children[g.children.length - 1].rotation.y = Math.PI / 2;
    const abs = new THREE.Mesh(uvMetros(new THREE.CylinderGeometry(ancho * 0.42, ancho * 0.42, alto * 0.85 + 1.6, 14, 1, false, 0, Math.PI), 2), muro); abs.rotation.y = Math.PI / 2; abs.position.set(0, (alto * 0.85 + 1.6) / 2 - 1.6, -largo / 2); g.add(abs);
    const ca = new THREE.Mesh(new THREE.ConeGeometry(ancho * 0.46, 0.9, 14, 1, false, 0, Math.PI), M.teja); ca.rotation.y = Math.PI / 2; ca.position.set(0, alto * 0.85 + 0.45, -largo / 2); g.add(ca);
    caja(g, 1.0, 1.7, 0.08, M.madera, 0, 0, largo / 2 + 0.01); caja(g, 0.7, 0.7, 0.06, M.oscuro, 0, alto - 1.3, largo / 2 + 0.01);
    if (nivel === 1) { caja(g, ancho * 0.6, 1.6, 0.4, muro, 0, alto + ancho * 0.35, largo / 2 - 0.2); caja(g, 0.4, 0.55, 0.42, M.oscuro, 0, alto + ancho * 0.35 + 0.6, largo / 2 - 0.2); return g; }
    const tl = 1.7 + nivel * 0.15, th = 6 + nivel * 1.6, tx = ancho / 2 + tl / 2 - 0.2, tz = largo / 2 - tl / 2, tm = E.torre === 'almenada' ? M.ladrillo : muro;
    caja(g, tl, th + 1.6, tl, tm, tx, -1.6, tz);
    for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) caja(g, dz ? 0.5 : 0.06, 0.9, dz ? 0.06 : 0.5, M.oscuro, tx + dx * (tl / 2 + 0.01), th - 1.3, tz + dz * (tl / 2 + 0.01));
    if (E.torre === 'almenada') { for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) { const a = i * Math.PI / 2, ox = Math.cos(a), oz = Math.sin(a), t = (k - 1) * tl * 0.32; caja(g, oz ? 0.3 : 0.2, 0.4, ox ? 0.3 : 0.2, tm, tx + ox * tl * 0.45 - oz * t, th, tz + oz * tl * 0.45 + ox * t); } }
    else if (E.torre === 'blanca') { caja(g, tl * 0.7, 1.2, tl * 0.7, muro, tx, th, tz); piramide(g, tl * 0.75, 1.3, liso('#3f7fb5'), tx, th + 1.2, tz); }
    else piramide(g, tl * 1.05, E.torre === 'piramide' ? 1.6 : 2.4, E.torre === 'piramide' ? M.piedra : M.teja, tx, th, tz);
    return g;
  }
  function ayuntamiento(E, M, S) {
    const g = new THREE.Group(), w = 6, d = 3.2, muro = E.clave === 'catalan' ? M.piedra : M.revocos[1] || M.revocos[0];
    caja(g, w, 3.6 + 1.6, d, muro, 0, -1.6, -0.6); tejado(g, w, d, d * 0.3, M.teja, 3.6); g.children[g.children.length - 1].position.z = -0.6;
    for (let i = 0; i <= 5; i++) caja(g, 0.32, 1.6, 0.32, muro, -w / 2 + 0.2 + i * (w - 0.4) / 5, 0, d / 2 - 0.4);
    caja(g, w, 0.4, 1.2, muro, 0, 1.6, d / 2 - 0.9); caja(g, w - 0.4, 1.5, 0.05, M.oscuro, 0, 0, -0.6 + d / 2 - 1.15);
    for (let i = 0; i < 4; i++) { const x = -2.2 + i * 1.47; caja(g, 0.5, 0.75, 0.05, M.cristal, x, 2.45, d / 2 - 0.29); caja(g, 0.9, 0.05, 0.3, muro, x, 2.25, d / 2 - 0.15); caja(g, 0.9, 0.35, 0.03, M.hierro, x, 2.28, d / 2); }
    caja(g, 0.7, 0.7, 0.05, liso('#f1ede2'), 0, 3.0, d / 2 - 0.28);
    [S.c1, '#c8102e', '#f1bf00'].forEach((c, i) => { caja(g, 0.03, 1.2, 0.03, M.hierro, -0.6 + i * 0.6, 3.5, d / 2 - 0.2); caja(g, 0.45, 0.3, 0.02, liso(c), -0.37 + i * 0.6, 4.3, d / 2 - 0.2); });
    return g;
  }
  function fuente(M) {
    const g = new THREE.Group(), pi = M.piedra;
    const b = new THREE.Mesh(uvMetros(new THREE.CylinderGeometry(1.3, 1.4, 0.55, 16), 1.5), pi); b.position.y = 0.27; g.add(b);
    const a = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.05, 16), M.agua); a.position.y = 0.5; g.add(a);
    const c = new THREE.Mesh(uvMetros(new THREE.CylinderGeometry(0.16, 0.22, 1.3, 8), 1), pi); c.position.y = 0.9; g.add(c);
    const t = new THREE.Mesh(uvMetros(new THREE.CylinderGeometry(0.5, 0.25, 0.2, 12), 1), pi); t.position.y = 1.55; g.add(t);
    return g;
  }
  function arbolPlaza(g, x, y, z, s) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * s, 0.14 * s, 1.4 * s, 6), liso('#6b5136')); t.position.set(x, y + 0.7 * s, z); g.add(t); const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95 * s, 1), liso('#5a8c3e')); c.position.set(x, y + 1.9 * s, z); c.scale.y = 0.85; g.add(c); }

  // ---------- Vegetación instanciada (olivos y cipreses) ----------
  function instancias(geo, m, pos) {
    if (!pos.length) return null;
    const im = new THREE.InstancedMesh(geo, m, pos.length), o = new THREE.Object3D();
    pos.forEach((p, i) => { o.position.set(p[0], p[1], p[2]); o.rotation.y = p[3] || 0; o.scale.setScalar(p[4] || 1); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
    im.instanceMatrix.needsUpdate = true; return im;
  }
  // Geometría con color por vértice (el olivo y el ciprés se dibujan con un solo material y en instancias)
  function colorear(geo, hex) { const g2 = geo.index ? geo.toNonIndexed() : geo, k = new THREE.Color(hex), n = g2.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = k.r; a[i * 3 + 1] = k.g; a[i * 3 + 2] = k.b; } g2.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g2; }
  function geoOlivo() {
    const t = new THREE.CylinderGeometry(0.09, 0.14, 0.7, 5); t.translate(0, 0.35, 0);
    const c = new THREE.IcosahedronGeometry(0.62, 0); c.scale(1.15, 0.7, 1.05); c.translate(0, 0.95, 0);
    return THREE.mergeGeometries([colorear(t, '#6e5a44'), colorear(c, '#7d9a6a')]);
  }
  function geoCipres() {
    const t = new THREE.CylinderGeometry(0.06, 0.08, 0.4, 5); t.translate(0, 0.2, 0);
    const c = new THREE.ConeGeometry(0.42, 3.2, 7); c.translate(0, 1.95, 0);
    return THREE.mergeGeometries([colorear(t, '#5d4632'), colorear(c, '#2f5a32')]);
  }

  // ---------- Cintas (calles, camino, río) que siguen el terreno ----------
  function cinta(puntos, ancho, m, sobre, esc) {
    const pos = [], uv = [], idx = []; let acc = 0;
    puntos.forEach((p, i) => {
      const q = puntos[Math.min(i + 1, puntos.length - 1)], o = puntos[Math.max(i - 1, 0)], tx = q[0] - o[0], tz = q[1] - o[1], l = Math.hypot(tx, tz) || 1, nx = -tz / l, nz = tx / l;
      if (i) acc += Math.hypot(p[0] - puntos[i - 1][0], p[1] - puntos[i - 1][1]);
      for (const s of [-1, 1]) { const x = p[0] + nx * s * ancho / 2, z = p[1] + nz * s * ancho / 2; pos.push(x, (p[2] !== undefined ? p[2] : alt(x, z)) + sobre, z); uv.push((s + 1) / 2 * ancho / (esc || 2), acc / (esc || 2)); }
      if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    return new THREE.Mesh(geo, m);
  }
  function curva(ctrl, n) { const c = new THREE.CatmullRomCurve3(ctrl.map(p => new THREE.Vector3(p[0], 0, p[1]))); return c.getPoints(n).map(v => [v.x, v.z]); }

  // ---------- Escena ----------
  const RADIO_MURO = [0, 0, 12.5, 15, 16.5, 17.5];
  const NCASAS = [0, 14, 32, 58, 84, 104];
  function construir(v, W, st, ctx) {
    const K = GM.kit, nivel = ctx.nivel, E = Object.assign({ clave: ctx.estilo }, ESTILOS[ctx.estilo]), M = materiales(E, ctx.S), r = rnd(U.hash(ctx.nombre + 'p3d'));
    const RW = RADIO_MURO[nivel], ocupado = [], libre = (x, z, rr) => ocupado.every(o => Math.hypot(o[0] - x, o[1] - z) > o[2] + rr), ocupa = (x, z, rr) => ocupado.push([x, z, rr]);
    const yC = alt(0, 0);
    // Cielo y luz de tarde dorada
    const cielo = textura('cielo', (x, n) => { const g = x.createLinearGradient(0, 0, 0, n); g.addColorStop(0, '#6fa6d6'); g.addColorStop(0.55, '#b9d4e8'); g.addColorStop(1, '#efe2c8'); x.fillStyle = g; x.fillRect(0, 0, n, n); }, 128);
    if (cielo) { cielo.wrapS = cielo.wrapT = THREE.ClampToEdgeWrapping; v.scene.background = cielo; }
    v.renderer.setClearColor(0xd7e3ea); v.scene.fog = new THREE.Fog(0xdde3e3, 90, 260);
    v.amb.color.setHex(0xcfd8e6); v.amb.intensity = 0.62; v.sun.color.setHex(0xffe9c8); v.sun.intensity = 0.95; v.sun.position.set(-22, 26, 18);
    // Terreno con colores de campo español (verdes, ocres y tierra) y relieve
    const N = 120, T = 240, geo = new THREE.PlaneGeometry(T, T, N, N); geo.rotateX(-Math.PI / 2);
    const P = geo.attributes.position, colr = new Float32Array(P.count * 3), cc = new THREE.Color();
    const tonos = ['#7f9a52', '#9aa65a', '#b9a565', '#c9b27a', '#8c8a4e', '#a7924f'].map(c => new THREE.Color(c)), tierra = new THREE.Color(E.tierra), roca = new THREE.Color('#8e8576');
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), z = P.getZ(i), y = alt(x, z); P.setY(i, y);
      const parche = ruido(x * 0.045 + 3, z * 0.045 - 2), k = (parche * 5.99) | 0, rr = Math.hypot(x, z), rio = Math.abs(z - zRio(x));
      cc.copy(tonos[k]).lerp(new THREE.Color('#6f9a4a'), smooth(9, 2, rio) * 0.8);
      if (RW && rr < RW + 1) cc.lerp(tierra, 0.75);
      const pend = Math.abs(alt(x + 1, z) - alt(x - 1, z)) + Math.abs(alt(x, z + 1) - alt(x, z - 1)); cc.lerp(roca, smooth(0.9, 1.8, pend) * 0.6);
      cc.multiplyScalar(0.92 + ruido(x * 0.4, z * 0.4) * 0.16);
      colr[i * 3] = cc.r; colr[i * 3 + 1] = cc.g; colr[i * 3 + 2] = cc.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colr, 3)); geo.computeVertexNormals();
    const tHierba = textura('hierba', dib.hierba()); if (tHierba) tHierba.repeat.set(T / 6, T / 6);
    const mT = new THREE.MeshLambertMaterial({ vertexColors: true, map: tHierba || null }); const suelo = new THREE.Mesh(geo, mT); suelo.receiveShadow = true; W.add(suelo);
    // Sierras lejanas que cierran el horizonte (azuladas por la distancia)
    { const sg = new THREE.CylinderGeometry(200, 210, 1, 96, 6, true), sp = sg.attributes.position;
      for (let i = 0; i < sp.count; i++) { const x = sp.getX(i), z = sp.getZ(i), y = sp.getY(i), a = Math.atan2(z, x), cima = 14 + ruido(a * 3 + 9, 1) * 26 + ruido(a * 9, 4) * 8; sp.setY(i, y > 0 ? cima : -4); }
      sg.computeVertexNormals(); const sierra = new THREE.Mesh(sg, new THREE.MeshLambertMaterial({ color: 0x8fa3a6, side: THREE.BackSide })); W.add(sierra);
      const llano = new THREE.Mesh(new THREE.CircleGeometry(205, 64), liso('#a39a6c')); llano.rotation.x = -Math.PI / 2; llano.position.y = -3.6; W.add(llano); }
    // Río con puente
    const rio = []; for (let x = -T / 2; x <= T / 2; x += 2) rio.push([x, zRio(x), alt(x, zRio(x)) + 0.35]);
    W.add(cinta(rio, 4.2, M.agua, 0, 4));
    // Puerta de la muralla mirando al sur-este (hacia la cámara) y camino que baja hasta el puente
    const aP = 0.95, gx = Math.cos(aP) * (RW || 9), gz = Math.sin(aP) * (RW || 9);
    const xP = 18, zP = zRio(xP), camino = curva([[gx * 0.55, gz * 0.55], [gx, gz], [gx + 5, gz + 4], [gx + 2, gz + 11], [xP - 2, zP - 7], [xP, zP], [xP + 2, zP + 9], [xP + 10, T / 2]], 140);
    W.add(cinta(camino, 2.2, liso(E.tierra), 0.08, 2));
    caja(W, 2.8, 0.4, 6, M.piedra, xP, zRio(xP) - 3.5 + alt(xP, zP) + 0.5 - 0.4 - zRio(xP) + 3.5, zP, 0);
    camino.forEach(([x, z], i) => { if (i % 4 === 2 && i > 8) { ocupa(x, z, 0.9); } });
    // Plaza mayor empedrada
    const RP = nivel >= 3 ? 5.2 : 4.2, plaza = new THREE.Mesh(uvMetros(new THREE.CylinderGeometry(RP, RP, 0.6, 28), 2.5), M.empedrado); plaza.position.y = yC - 0.18; W.add(plaza); ocupa(0, 0, RP);
    const fu = fuente(M); fu.position.set(0, yC + 0.12, 0); W.add(fu);
    for (let i = 0; i < (nivel >= 2 ? 4 : 2); i++) { const a = 0.4 + i * 1.57; arbolPlaza(W, Math.cos(a) * (RP - 1.2), yC, Math.sin(a) * (RP - 1.2), 0.9); }
    // Iglesia al norte de la plaza, ayuntamiento al sur-oeste
    const ig = iglesia(E, M, nivel); ig.position.set(-1, yC, -RP - 4.2 - nivel * 0.35); ig.rotation.y = 0; W.add(ig); ocupa(-1, -RP - 4.5, 5.2);
    if (nivel >= 2) { const ay = ayuntamiento(E, M, ctx.S); ay.position.set(-RP - 2.2, yC, 0.6); ay.rotation.y = Math.PI / 2; W.add(ay); ocupa(-RP - 2.4, 0.6, 3.4); }
    // Torre del homenaje (castillo) en el lado oeste
    if (nivel >= 3) { const tx = -RW + 4.2, tz = -4.5, ty = alt(tx, tz), tm = E.clave === 'toscano' ? M.ladrillo : M.piedra; caja(W, 3.2, 10 + 2, 3.2, tm, tx, ty - 2, tz); for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) { const a = i * Math.PI / 2, ox = Math.round(Math.cos(a)), oz = Math.round(Math.sin(a)), t = (k - 1.5) * 0.8; caja(W, 0.4, 0.55, 0.4, tm, tx + ox * 1.45 - oz * t, ty + 10, tz + oz * 1.45 + ox * t); } ocupa(tx, tz, 2.6); }
    // Calles: radiales desde la plaza (una hacia la puerta) y una ronda interior
    const calles = [], ang = [aP, aP + 1.55, aP + 2.75, aP + 3.95, aP + 5.05];
    const rFin = RW ? RW - 0.8 : 8 + nivel * 2;
    ang.forEach((a, i) => { const ctrl = []; for (let k = 0; k <= 4; k++) { const rr = RP + (rFin - RP) * k / 4, aa = a + Math.sin(k * 1.3 + i) * 0.12; ctrl.push([Math.cos(aa) * rr, Math.sin(aa) * rr]); } calles.push(curva(ctrl, 30)); });
    if (RW) { const ronda = []; for (let k = 0; k <= 64; k++) { const a = k / 64 * Math.PI * 2; ronda.push([Math.cos(a) * (RW - 3.6), Math.sin(a) * (RW - 3.6)]); } calles.push(ronda); }
    calles.forEach(c => W.add(cinta(c, 1.9, M.empedrado, 0.06, 2.5)));
    // Infraestructuras del jugador en sitios fijos (seleccionables)
    const sitios = {
      canasta: [RP * 0.62, RP * 0.15, -Math.PI / 2, yC + 0.12], bar: [RP + 2.2, -1.8, -Math.PI / 2], mural: [Math.cos(aP + 0.32) * (RW + 1.4), Math.sin(aP + 0.32) * (RW + 1.4), -aP - 0.32 + Math.PI / 2],
      escuela: [gx + 12, gz + 1, -0.6], ambulatorio: [gx + 12, gz + 11, -1.4], tienda: [gx - 2.6, gz + 5.2, -2.6], hotel: [xP - 12, zP - 11, 0.4], polideportivo: [xP + 15, zP + 10, 0], pabellon: [xP - 17, zP + 11, 0]
    };
    V_edificios.length = 0;
    (ctx.edificios || []).forEach(b => {
      const s = sitios[b.tipo]; if (!s) return; const [x, z, ry, y0] = s;
      const g = b.nivel ? (infra(b.tipo, b.nivel, E, M, ctx.S, ctx.jugador, r) || ctx.edificio(b.tipo, b.nivel, ctx.S)) : solar(M);
      g.position.set(x, y0 !== undefined ? y0 : alt(x, z) + 0.02, z); g.rotation.y = ry;
      g.userData = { tipo: b.tipo }; W.add(g); ocupa(x, z, b.tipo === 'canasta' ? 2.6 : b.tipo === 'mural' ? 4.5 : b.tipo === 'pabellon' || b.tipo === 'polideportivo' ? 6 : 3.6); V_edificios.push(g);
    });
    // Muralla con torres (desde villa; en «pueblo» quedan restos)
    if (RW) {
      const nSeg = 40, completa = nivel >= 3, torres = nivel >= 5 ? 14 : nivel >= 4 ? 12 : 9, mm = E.clave === 'toscano' ? M.ladrillo : M.piedra, alturaM = 2.6 + (nivel - 2) * 0.35;
      const rM = a => RW * (1 + 0.05 * Math.sin(3 * a + 1) + 0.025 * Math.sin(7 * a));
      for (let i = 0; i < nSeg; i++) {
        const a0 = i / nSeg * Math.PI * 2, a1 = (i + 1) / nSeg * Math.PI * 2, am = (a0 + a1) / 2;
        if (Math.abs(((am - aP + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.09) continue; // hueco de la puerta
        if (!completa && (i % 5 > 1)) continue;
        const x0 = Math.cos(a0) * rM(a0), z0 = Math.sin(a0) * rM(a0), x1 = Math.cos(a1) * rM(a1), z1 = Math.sin(a1) * rM(a1);
        const L = Math.hypot(x1 - x0, z1 - z0) + 0.15, y0 = Math.min(alt(x0, z0), alt(x1, z1)), y1 = Math.max(alt(x0, z0), alt(x1, z1)), hM = completa ? alturaM : 1.2 + (i % 3) * 0.5;
        caja(W, L, hM + (y1 - y0) + 2, 0.7, mm, (x0 + x1) / 2, y0 - 2, (z0 + z1) / 2, -Math.atan2(z1 - z0, x1 - x0));
        if (completa) for (let k = 0; k < 3; k++) { const t = (k + 0.5) / 3, xm = x0 + (x1 - x0) * t, zm = z0 + (z1 - z0) * t; caja(W, 0.42, 0.42, 0.72, mm, xm, y1 + hM, zm, -Math.atan2(z1 - z0, x1 - x0)); }
      }
      if (completa) for (let i = 0; i < torres; i++) {
        const a = aP + (i + 0.5) / torres * Math.PI * 2, x = Math.cos(a) * rM(a), z = Math.sin(a) * rM(a), y = alt(x, z), th = alturaM + 2.2;
        caja(W, 2, th + 2, 2, mm, x, y - 2, z, -a); for (let k = 0; k < 4; k++) { const ox = Math.cos(-a + k * Math.PI / 2) * 0.8, oz = Math.sin(-a + k * Math.PI / 2) * 0.8; caja(W, 0.45, 0.5, 0.45, mm, x + ox, y + th, z - oz, -a); }
      }
      // Puerta: dos torres y arco
      if (completa || nivel === 2) {
        const px = Math.cos(aP) * rM(aP), pz = Math.sin(aP) * rM(aP), py = alt(px, pz), tx = -Math.sin(aP), tz = Math.cos(aP);
        for (const s of [-1, 1]) caja(W, 1.6, alturaM + 3.6, 1.8, mm, px + tx * s * 1.75, py - 1.5, pz + tz * s * 1.75, -aP);
        caja(W, 2.0, 1.2, 1.4, mm, px, py + 2.3, pz, -aP); caja(W, 1.9, 2.3, 0.05, M.oscuro, px + Math.cos(aP) * 0.72, py, pz + Math.sin(aP) * 0.72, -aP + Math.PI / 2);
      }
    }
    // Casas dentro de la muralla (a lo largo de las calles, de cara a ellas) y alrededor de la plaza
    let n = 0; const total = NCASAS[nivel], bandera = ctx.cariño / 140;
    const ponerCasa = (x, z, ry, w, d, pisos, opc) => {
      if (n >= total + (opc && opc.extra ? 99 : 0) || !libre(x, z, Math.max(w, d) * 0.55)) return false;
      if (RW && Math.hypot(x, z) > RW - 1.1 && !(opc && opc.fuera)) return false;
      const c = casa(E, M, w, d, pisos, r, { bandera, balcon: opc && opc.balcon }); c.position.set(x, alt(x, z), z); c.rotation.y = ry; W.add(c); ocupa(x, z, Math.max(w, d) * 0.5); n++; return true;
    };
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2 + 0.2, rr = RP + 1.9, x = Math.cos(a) * rr, z = Math.sin(a) * rr; ponerCasa(x, z, -a - Math.PI / 2, 2.2 + r() * 0.6, 2.6, nivel >= 3 ? 3 : 2, { balcon: 0.7 }); }
    for (let pase = 0; pase < 3 && n < total; pase++) calles.forEach((c, ci) => {
      for (let k = 2; k < c.length - 1; k += 2) {
        const p = c[k], q = c[k + 1], tx = q[0] - p[0], tz = q[1] - p[1], l = Math.hypot(tx, tz) || 1, nx = -tz / l, nz = tx / l;
        for (const s of [-1, 1]) {
          const w = 1.9 + r() * 0.9, d = 2.3 + r() * 0.8, off = 0.95 + d / 2 + pase * (d + 0.3), x = p[0] + nx * s * off, z = p[1] + nz * s * off;
          const dc = Math.hypot(x, z), pisos = dc < RP + 5 ? 2 + (r() < 0.5 && nivel >= 3 ? 1 : 0) : 1 + (r() < 0.6 ? 1 : 0);
          ponerCasa(x, z, Math.atan2(-nx * s, -nz * s), w, d, pisos);
        }
      }
    });
    // Arrabal fuera de la muralla a lo largo del camino (ciudad pequeña) y barrio nuevo junto al río (ciudad del baloncesto)
    if (nivel >= 4) {
      const lim = nivel >= 5 ? 110 : 70;
      for (let k = 14; k < lim; k += 3) { const p = camino[k], q = camino[k + 1], tx = q[0] - p[0], tz = q[1] - p[1], l = Math.hypot(tx, tz) || 1, nx = -tz / l, nz = tx / l; for (const s of [-1, 1]) { const d = 2.4, x = p[0] + nx * s * (1.5 + d / 2), z = p[1] + nz * s * (1.5 + d / 2); ponerCasa(x, z, Math.atan2(-nx * s, -nz * s), 2 + r() * 0.8, d, 1 + (r() < 0.5 ? 1 : 0), { fuera: true, extra: true }); } }
    }
    if (nivel >= 5) {
      const bx = -8, bz = zRio(-8) - 9;
      for (let i = 0; i < 9; i++) { const x = bx + (i % 3) * 5.2 + (r() - 0.5), z = bz + Math.floor(i / 3) * -5 + (r() - 0.5); if (!libre(x, z, 2.4)) continue; const g = new THREE.Group(), pisos = 3 + (i % 2); caja(g, 3.6, pisos * 1.2 + 1.5, 3.2, M.revocos[i % M.revocos.length], 0, -1.5, 0); for (let p = 0; p < pisos; p++) caja(g, 3.2, 0.4, 0.05, M.cristal, 0, 0.5 + p * 1.2, 1.62); caja(g, 3.8, 0.15, 3.4, liso('#c9b9a0'), 0, pisos * 1.2, 0); for (let p = 1; p < pisos; p++) caja(g, 3.4, 0.08, 0.4, M.revocos[0], 0, p * 1.2 + 0.1, 1.8); g.position.set(x, alt(x, z), z); g.rotation.y = 0.15; W.add(g); ocupa(x, z, 2.6); }
    }
    // Olivares en bancales y cipreses junto al camino y la iglesia
    const olivos = [], cipreses = [];
    for (let i = 0; i < 900 && olivos.length < 420; i++) {
      const a = r() * Math.PI * 2, rr = (RW || 10) + 6 + r() * 50, x = Math.cos(a) * rr * 1.2, z = Math.sin(a) * rr;
      if (Math.abs(x) > T / 2 - 3 || Math.abs(z) > T / 2 - 3 || Math.abs(z - zRio(x)) < 5 || !libre(x, z, 1.2)) continue;
      if (ruido(x * 0.045 + 3, z * 0.045 - 2) > 0.62) continue;
      const fila = Math.round(rr / 2.4) * 2.4, aa = Math.round(a * fila / 2.6) * 2.6 / fila, xx = Math.cos(aa) * fila * 1.2, zz = Math.sin(aa) * fila;
      olivos.push([xx, alt(xx, zz), zz, r() * 6, 0.8 + r() * 0.5]);
    }
    camino.forEach(([x, z], i) => { if (i % 6 === 0 && i > 12 && i < 128) for (const s of [-1, 1]) { const q = camino[Math.min(i + 1, camino.length - 1)], l = Math.hypot(q[0] - x, q[1] - z) || 1, nx = -(q[1] - z) / l, nz = (q[0] - x) / l, xx = x + nx * s * 2.1, zz = z + nz * s * 2.1; if (libre(xx, zz, 0.6)) cipreses.push([xx, alt(xx, zz), zz, 0, 0.8 + r() * 0.4]); } });
    for (let i = 0; i < 6; i++) { const x = -5 + i * 1.1, z = -RP - 9.8 - nivel * 0.35; if (!RW || Math.hypot(x, z) < RW - 1.5) cipreses.push([x, alt(x, z), z, 0, 0.7]); }
    const mVeg = new THREE.MeshLambertMaterial({ vertexColors: true });
    const io = instancias(geoOlivo(), mVeg, olivos), ic = instancias(geoCipres(), mVeg, cipreses);
    if (io) W.add(io); if (ic) W.add(ic);
    // Gente en la plaza y las calles (con camisetas del club si el pueblo te quiere)
    const gente = 6 + nivel * 7;
    for (let i = 0; i < gente; i++) {
      const c = calles[i % calles.length], p = i < 8 ? [Math.cos(i * 0.8) * (RP - 1.6), Math.sin(i * 0.8) * (RP - 1.6)] : c[(r() * c.length) | 0], x = p[0] + (r() - 0.5) * 0.8, z = p[1] + (r() - 0.5) * 0.8;
      const hincha = r() * 100 < ctx.cariño, q = new THREE.Group(); q.add(K.caja(0.2, 0.42, 0.14, hincha ? (r() < 0.5 ? ctx.S.c1 : ctx.S.c2) : [0x7a8791, 0x3c5a7a, 0x8a6a4a, 0xb04a3a][i % 4], 0, 0.3, 0)); q.add(K.caja(0.18, 0.3, 0.12, 0x3b4048, 0, 0, 0)); q.add(K.cilindro(0.09, 0.14, 0xe0b89a, 0, 0.72, 0, 6));
      q.position.set(x, alt(x, z) + 0.06, z); q.rotation.y = r() * 6; W.add(q);
    }
    // Cartel de entrada con el nombre del pueblo junto al puente
    const cx = xP + 3.5, cz = zP + 6; caja(W, 0.12, 1.4, 0.12, M.madera, cx - 0.9, alt(cx, cz), cz); caja(W, 0.12, 1.4, 0.12, M.madera, cx + 0.9, alt(cx, cz), cz);
    const cartel = GM.campus && GM.campus.rotulo ? GM.campus.rotulo(W, ctx.nombre.toUpperCase().slice(0, 18), 2.6, 0.6, 0xf4efe3, 0x2a2a2a, cx, alt(cx, cz) + 1.35, cz) : null; if (cartel) cartel.rotation.y = -0.4;
    v.target.set(0, yC - 0.5, 6); return { casas: n, olivos: olivos.length, estilo: E.nombre };
  }
  // ---------- Infraestructuras del jugador con el estilo del pueblo ----------
  function muralTex(J, S) {
    return textura('mural' + J.apellido + J.dorsal + S.h1 + S.h2, (x, n) => {
      x.fillStyle = S.h1; x.fillRect(0, 0, n, n); x.fillStyle = S.h2; x.beginPath(); x.moveTo(0, n); x.lineTo(n * 0.55, 0); x.lineTo(n, 0); x.lineTo(n * 0.45, n); x.fill();
      x.fillStyle = '#ffffff'; x.font = 'bold ' + (n * 0.42) + 'px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = n * 0.03; x.strokeStyle = '#1a1a1a'; x.strokeText(String(J.dorsal), n / 2, n * 0.42); x.fillText(String(J.dorsal), n / 2, n * 0.42);
      x.font = 'bold ' + (n * 0.12) + 'px sans-serif'; x.strokeText(J.apellido.toUpperCase(), n / 2, n * 0.8); x.fillText(J.apellido.toUpperCase(), n / 2, n * 0.8);
      x.fillStyle = '#e8590c'; x.beginPath(); x.arc(n * 0.82, n * 0.18, n * 0.09, 0, 6.29); x.fill(); x.strokeStyle = '#1a1a1a'; x.lineWidth = 2; x.beginPath(); x.arc(n * 0.82, n * 0.18, n * 0.09, 0, 6.29); x.moveTo(n * 0.73, n * 0.18); x.lineTo(n * 0.91, n * 0.18); x.moveTo(n * 0.82, n * 0.09); x.lineTo(n * 0.82, n * 0.27); x.stroke();
    }, 256);
  }
  function rotuloTex(txt, fondo, letra) { return textura('rot' + txt + fondo, (x, n) => { x.fillStyle = fondo; x.fillRect(0, 0, n, n / 4); x.fillStyle = letra; x.font = 'bold ' + (n * 0.11) + 'px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, n / 2, n / 8); }, 256); }
  function plano(g, w, h, t, colorAlt, x, y, z, ry) {
    const geo = new THREE.PlaneGeometry(w, h), m = new THREE.Mesh(geo, t ? new THREE.MeshLambertMaterial({ map: t }) : liso(colorAlt));
    if (t && t.image && t.image.height && /^rot/.test(t.name || '')) geo.attributes.uv.array.forEach((v, i, a) => { if (i % 2) a[i] = 0.75 + v * 0.25; });
    m.position.set(x, y, z); if (ry) m.rotation.y = ry; g.add(m); return m;
  }
  function infra(tipo, nv, E, M, S, J, r) {
    const g = new THREE.Group(), muro = M.revocos[0], tj = M.teja, gris = liso('#9a9a96'), naranja = liso('#c9733f'), blanco = liso('#f2efe8');
    switch (tipo) {
      case 'canasta': {
        caja(g, 5.6, 0.12, 3.6, nv > 1 ? naranja : gris, 0, -0.05, 0); caja(g, 5.2, 0.02, 0.06, blanco, 0, 0.08, 0); caja(g, 0.06, 0.02, 3.2, blanco, 0, 0.08, 0);
        for (const s of [-1, 1]) { caja(g, 0.1, 2.6, 0.1, M.hierro, s * 2.6, 0, 0); caja(g, 0.05, 0.75, 1.1, blanco, s * 2.45, 2.0, 0); caja(g, 0.3, 0.03, 0.3, naranja, s * 2.25, 2.0, 0); }
        if (nv > 1) for (let i = 0; i < 6; i++) { caja(g, 0.05, 1.2, 0.05, M.hierro, -2.8 + i * 1.12, 0, -1.85); caja(g, 0.05, 1.2, 0.05, M.hierro, -2.8 + i * 1.12, 0, 1.85); }
        if (nv > 2) { for (const [x, z] of [[-2.8, -1.8], [2.8, -1.8], [-2.8, 1.8], [2.8, 1.8]]) caja(g, 0.18, 3.4, 0.18, M.hierro, x, 0, z); caja(g, 6, 0.1, 4, liso('#6b737b'), 0, 3.4, 0); caja(g, 6.04, 0.25, 0.06, liso(S.c1), 0, 3.3, 2.0); caja(g, 6.04, 0.25, 0.06, liso(S.c1), 0, 3.3, -2.0); }
        break; }
      case 'bar': {
        g.add(casa(E, M, 3, 2.6, 2, r, { bandera: 1, balcon: 1 }));
        caja(g, 3.0, 0.08, 1.0, liso(S.c1), 0, 1.25, 1.75); plano(g, 2.2, 0.55, rotuloTex(nv > 1 ? 'SEDE DE LA PEÑA' : 'BAR LA PEÑA', S.h1, '#ffffff'), S.c1, 0, 1.6, 1.32);
        for (let i = 0; i < 3; i++) { const x = -1 + i, t = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.6, 10), M.madera); t.position.set(x, 0.3, 2.6); g.add(t); const sb = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.3, 8), i % 2 ? liso(S.c2) : liso(S.c1)); sb.position.set(x, 1.6, 2.6); g.add(sb); caja(g, 0.04, 1.4, 0.04, M.hierro, x, 0.3, 2.6); }
        break; }
      case 'escuela': {
        caja(g, 6, 2.8 + 1.6, 3, muro, 0, -1.6, 0); tejado(g, 6, 3, 1, tj, 2.8);
        for (let p = 0; p < 2; p++) for (let i = 0; i < 5; i++) caja(g, 0.7, 0.8, 0.05, M.cristal, -2.4 + i * 1.2, 0.5 + p * 1.3, 1.52);
        plano(g, 2.8, 0.7, rotuloTex('ESCUELA DE BÁSQUET', '#f4efe3', '#2a2a2a'), '#f4efe3', 0, 2.5, 1.53);
        const pista = infra('canasta', 1, E, M, S, J, r); pista.position.set(0, 0, 4.2); g.add(pista);
        if (nv > 1) { const p2 = infra('canasta', 2, E, M, S, J, r); p2.position.set(6.2, 0, 4.2); g.add(p2); }
        if (nv > 2) { caja(g, 3, 4.2 + 1.6, 3, muro, -4.6, -1.6, 0); tejado(g, 3, 3, 0.9, tj, 4.2).position.x = -4.6; }
        break; }
      case 'mural': {
        caja(g, 4.2, 3.2 + 1.5, 0.5, M.piedra, 0, -1.5, 0); plano(g, 3.6, 2.6, muralTex(J, S), S.c1, 0, 1.75, 0.26);
        if (nv > 1) caja(g, 1.2, 0.4, 0.06, liso('#b08d3c'), 0, 0.2, 0.27);
        if (nv > 2) { caja(g, 1.1, 1.1, 1.1, M.piedra, 0, 0, 2.4); const br = liso('#8a6a3a'); caja(g, 0.5, 0.9, 0.3, br, 0, 1.1, 2.4); caja(g, 0.35, 0.8, 0.25, br, 0, 2.0, 2.4); const cab = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), br); cab.position.set(0, 3.0, 2.4); g.add(cab); caja(g, 0.12, 0.7, 0.12, br, 0.32, 2.5, 2.4); const bal = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), br); bal.position.set(0.36, 3.35, 2.4); g.add(bal); }
        break; }
      case 'ambulatorio': {
        const pisos = nv > 1 ? 3 : 2; caja(g, 5, pisos * 1.3 + 1.6, 3, blanco, 0, -1.6, 0); caja(g, 5.2, 0.15, 3.2, liso('#c9c4b8'), 0, pisos * 1.3, 0);
        for (let p = 0; p < pisos; p++) caja(g, 4.4, 0.6, 0.05, M.cristal, 0, 0.45 + p * 1.3, 1.52);
        caja(g, 0.7, 0.2, 0.06, liso('#d62d2d'), 1.8, pisos * 1.3 - 0.6, 1.53); caja(g, 0.2, 0.7, 0.06, liso('#d62d2d'), 1.8, pisos * 1.3 - 0.85, 1.53);
        if (nv > 1) { caja(g, 3, 2 * 1.3 + 1.6, 3, blanco, 4, -1.6, -0.5); plano(g, 2.8, 0.7, rotuloTex('HOSPITAL ' + J.apellido.toUpperCase(), '#ffffff', '#1d5a8a'), '#ffffff', 4, 2.2, 1.02); }
        break; }
      case 'polideportivo': {
        caja(g, 8, 2.4 + 1.6, 5, muro, 0, -1.6, 0); const bv = new THREE.Mesh(new THREE.CylinderGeometry(2.55, 2.55, 8.1, 18, 1, false, 0, Math.PI), liso(S.c1)); bv.rotation.z = Math.PI / 2; bv.position.y = 2.4; g.add(bv);
        plano(g, 4, 1, rotuloTex('POLIDEPORTIVO', '#f4efe3', '#2a2a2a'), '#f4efe3', 0, 1.7, 2.52);
        if (nv > 1) { caja(g, 6, 0.3, 3, liso('#d9d4c8'), 0, -0.2, 5.2); caja(g, 5.4, 0.12, 2.4, M.agua, 0, 0.0, 5.2); }
        if (nv > 2) { const c1 = infra('canasta', 2, E, M, S, J, r); c1.position.set(-7, 0, 3); g.add(c1); caja(g, 8, 0.05, 5, liso('#4f8a3e'), 0, -0.02, -7); }
        break; }
      case 'tienda': {
        g.add(casa(E, M, 2.8, 2.6, 2, r, { bandera: 1 })); caja(g, 2.2, 0.9, 0.05, M.cristal, 0, 0.1, 1.33);
        plano(g, 2.6, 0.65, rotuloTex(nv > 1 ? 'TIENDA ' + J.apellido.toUpperCase() : 'DEPORTES', S.h1, '#ffffff'), S.c1, 0, 1.25, 1.34);
        break; }
      case 'hotel': {
        const pisos = 3 + nv; caja(g, 6, pisos * 1.25 + 1.6, 3.4, M.revocos[1] || muro, 0, -1.6, 0); tejado(g, 6, 3.4, 1.1, tj, pisos * 1.25);
        for (let p = 1; p < pisos; p++) for (let i = 0; i < 4; i++) { const x = -2.2 + i * 1.47; caja(g, 0.55, 0.75, 0.05, M.cristal, x, 0.3 + p * 1.25, 1.72); caja(g, 0.9, 0.06, 0.32, muro, x, 0.25 + p * 1.25, 1.86); caja(g, 0.9, 0.38, 0.03, M.hierro, x, 0.3 + p * 1.25, 2.02); }
        caja(g, 2, 1.2, 0.05, M.cristal, 0, 0, 1.72); plano(g, 2.6, 0.65, rotuloTex(nv > 1 ? 'GRAN HOTEL' : 'HOTEL RURAL', '#2a2a2a', '#f2d27a'), '#2a2a2a', 0, 1.5, 1.73);
        break; }
      case 'pabellon': {
        const R = nv > 1 ? 6.5 : 5, alto = nv > 1 ? 4.2 : 3.4, cuerpo = new THREE.Mesh(uvMetros(new THREE.CylinderGeometry(R, R, alto + 1.6, 28), 2), muro); cuerpo.scale.z = 0.72; cuerpo.position.y = (alto + 1.6) / 2 - 1.6; g.add(cuerpo);
        const banda = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.04, R + 0.04, 0.6, 28), liso(S.c1)); banda.scale.z = 0.72; banda.position.y = alto - 0.6; g.add(banda);
        const cup = new THREE.Mesh(new THREE.SphereGeometry(R, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2), liso('#c9cdd1')); cup.scale.set(1, 0.32, 0.72); cup.position.y = alto; g.add(cup);
        plano(g, 5, 1.25, rotuloTex('PABELLÓN ' + J.apellido.toUpperCase(), S.h1, '#ffffff'), S.c1, 0, 1.6, R * 0.72 + 0.05);
        break; }
      default: return null;
    }
    return g;
  }
  function solar(M) { const g = new THREE.Group(); caja(g, 2.4, 0.06, 2.2, liso('#b9ab8c'), 0, 0, 0); for (let i = 0; i < 4; i++) caja(g, 0.06, 0.7, 0.06, M.madera, (i % 2 ? 1 : -1) * 1.1, 0, (i < 2 ? 1 : -1) * 1.0); caja(g, 0.9, 0.5, 0.04, liso('#f2e8d0'), 0, 0.6, 1.02); return g; }
  const V_edificios = [];
  GM.pueblo3d = { construir, estiloDe, alt, ESTILOS, edificios: V_edificios };
})();
