/* URBANISMO (GM.urbano) — piezas de la calle con criterio urbanístico, compartidas por calle3d.js y ciudad_barrios.js
   - cebra(): paso de peatones elevado (losa de asfalto con rampas), franjas, línea de detención y baldosa táctil en las aceras.
   - posiciones(): dónde van las farolas: una a cada lado de cada paso de peatones y el resto repartidas con separación regular;
     las dos aceras de una avenida llevan la farola a la misma altura (frente a frente). farola(): el modelo.
   - bordillo(): bordillo de granito y franja de servicio con otro pavimento (adoquín, ladrillo o baldosa) al borde de una acera.
   - bocaMetro(): boca de metro con marquesina de cristal, escalera que baja, barandillas, tótem con la «M» y cartel.
   - paradaBici() y bici(): estación de bicis compartidas (anclajes, tótem con pantalla) y el modelo de bicicleta con ruedas de radios,
     cuadro de tubos, sillín, manillar, cesta, bielas y pedales (userData.ruedas y userData.bielas para animarlos).
   Los decorados pegados al suelo llevan polygonOffset para que no parpadeen con la superficie que cubren. */
(function () {
  const MATS = {};
  const mat = (hex, o) => { const k = hex + JSON.stringify(o || {}); return MATS[k] || (MATS[k] = new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness: 0.85 }, o || {}))); };
  const deco = m => { m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -2; return m; };
  const real = (m, id, o) => (GM.texturas ? GM.texturas.aplicar(m, id, o) : m);
  const REAL = {};
  // Materiales con textura real (se crean una vez; si las texturas no están cargadas quedan con el color de respaldo)
  function realMat(clave, id, o, respaldo, decal) {
    const k = clave + (GM.texturas && GM.texturas.listo && GM.texturas.listo() ? '!' : '');
    if (REAL[k]) return REAL[k];
    const m = real(new THREE.MeshStandardMaterial({ color: respaldo, roughness: 0.92 }), id, o); if (decal) deco(m);
    return (REAL[k] = m);
  }
  const M_LOSA = () => realMat('losa', 'Asphalt010', { escala: 5, tinte: 0xc9c9c9 }, '#4a4e52');
  const M_ADOQ = () => realMat('adoq', 'PavingStones070', { escala: 1.4, tinte: 0xa9a7a2 }, '#8d8a84', true);
  const M_LADR = () => realMat('ladr', 'Bricks085', { escala: 1.3, tinte: 0xd9a58f }, '#a8624a', true);
  const M_BALD = () => realMat('bald', 'Concrete034', { escala: 1.0, tinte: 0xe0dcd0, relieve: 0.3 }, '#cdc9bd', true);
  const M_MARM = () => realMat('marm', 'Plaster003', { escala: 2.5, tinte: 0xf4ecdc, relieve: 0.3 }, '#e3dccd', true);
  const M_TARIMA = () => realMat('tarima', 'WoodFloor051', { escala: 1.5, tinte: 0xd2a67c }, '#a87d55', true);
  const M_GRAVA = () => realMat('grava', 'Ground054', { escala: 1.3, tinte: 0xe6d8bb }, '#cdbd9d', true);
  const M_TIERRA = () => realMat('tierra', 'Ground054', { escala: 1.0, tinte: 0x8a6a4c }, '#5a4632', true);
  const M_CESPED = () => realMat('cesped', 'Grass004', { escala: 3, tinte: 0xb8d0a0 }, '#6f9a4a', true);
  const M_CONC = () => realMat('conc', 'Concrete034', { escala: 2.2, tinte: 0x9a9a98, relieve: 0.5 }, '#8f8f8c', true);
  const GRANITO = '#a6a6a1';
  const SUELOS = { adoq: M_ADOQ, ladr: M_LADR, bald: M_BALD, conc: M_CONC, marm: M_MARM, tarima: M_TARIMA, grava: M_GRAVA, tierra: M_TIERRA, cesped: M_CESPED };
  // Rectángulo [x0,z0,x1,z1] y círculo o anillo de otro pavimento pegados al suelo (y en metros sobre él)
  function parche(g, x0, z0, x1, z1, clave, y) { const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2), SUELOS[clave]()); m.position.set((x0 + x1) / 2, y || 0.004, (z0 + z1) / 2); m.receiveShadow = true; g.add(m); return m; }
  function anillo(g, x, z, r0, r1, clave, y) { const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 40).rotateX(-Math.PI / 2), SUELOS[clave]()); m.position.set(x, y || 0.004, z); m.receiveShadow = true; g.add(m); return m; }
  function disco(g, x, z, r, clave, y) { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 32).rotateX(-Math.PI / 2), SUELOS[clave]()); m.position.set(x, y || 0.004, z); m.receiveShadow = true; g.add(m); return m; }

  function caja(g, w, h, d, m, x, y, z, ry, sombra) { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof m === 'string' ? mat(m) : m); me.position.set(x, y + h / 2, z); if (ry) me.rotation.y = ry; me.castShadow = sombra !== false; me.receiveShadow = true; g.add(me); return me; }
  function cil(g, r, h, m, x, y, z, seg, r2) { const me = new THREE.Mesh(new THREE.CylinderGeometry(r, r2 === undefined ? r : r2, h, seg || 10), typeof m === 'string' ? mat(m) : m); me.position.set(x, y + h / 2, z); me.castShadow = true; g.add(me); return me; }
  // Tubo entre dos puntos (para el cuadro de la bici y las barandillas)
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
  function tubo(g, p, q, r, m, seg) {
    _a.set(p[0], p[1], p[2]); _b.set(q[0], q[1], q[2]); const d = _b.clone().sub(_a), l = d.length();
    const me = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, seg || 6), typeof m === 'string' ? mat(m) : m);
    me.position.copy(_a).addScaledVector(d, 0.5); me.quaternion.setFromUnitVectors(_up, d.normalize()); me.castShadow = true; g.add(me); return me;
  }
  const libre = (G, x0, z0, x1, z1) => { const [i0, j0] = G.celda(x0, z0), [i1, j1] = G.celda(x1 - 0.001, z1 - 0.001); for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (!G.libre(i, j)) return false; return true; };

  // ---------- Pasos de peatones ----------
  // Losa elevada de asfalto (con rampa de subida en los lados por donde llegan los coches), franjas blancas, líneas de detención y
  // baldosa táctil en la acera. eje 'z': se cruza andando en z (franjas largas en x); eje 'x': al revés.
  function cebra(W, G, x0, z0, x1, z1, eje) {
    const blanco = deco(mat('#f2f2ee', { roughness: 0.8 })), losa = M_LOSA(), H = 0.12, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const me = new THREE.Mesh(new THREE.BoxGeometry(w, H, d), losa); me.position.set(cx, -H / 2, cz); me.receiveShadow = true; W.add(me);
    // Rampas: prismas triangulares de 0,7 m en los dos lados por donde llega el tráfico (cada una sube hacia la losa)
    const R = 0.7, triA = new THREE.Shape(), triB = new THREE.Shape();
    triA.moveTo(0, 0); triA.lineTo(R, 0); triA.lineTo(R, H); triA.lineTo(0, 0); triB.moveTo(0, 0); triB.lineTo(R, 0); triB.lineTo(0, H); triB.lineTo(0, 0);
    const rampa = lado => {
      const r = new THREE.Mesh(new THREE.ExtrudeGeometry(lado < 0 ? triA : triB, { depth: eje === 'z' ? d : w, bevelEnabled: false }), losa); r.receiveShadow = true;
      if (eje === 'z') r.position.set(lado < 0 ? x0 - R : x1, -H, z0); else { r.rotation.y = -Math.PI / 2; r.position.set(x1, -H, lado < 0 ? z0 - R : z1); }
      W.add(r);
    };
    rampa(-1); rampa(1);
    // Franjas: 0,5 m con huecos de 0,5 m (la larga va en el sentido del tráfico)
    const n = Math.max(2, Math.round((eje === 'z' ? d : w) / 1.0));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      if (eje === 'z') caja(W, w - 0.3, 0.012, 0.5, blanco, cx, 0, z0 + t * d, 0, false); else caja(W, 0.5, 0.012, d - 0.3, blanco, x0 + t * w, 0, cz, 0, false);
    }
    // Líneas de detención a 1,3 m del paso, solo en la mitad de calzada de cada sentido (se conduce por la derecha)
    const L = 0.35;
    if (eje === 'z') { caja(W, L, 0.012, d / 2 - 0.2, blanco, x0 - R - 0.9, -H + 0.002, cz + d / 4, 0, false); caja(W, L, 0.012, d / 2 - 0.2, blanco, x1 + R + 0.9, -H + 0.002, cz - d / 4, 0, false); }
    else { caja(W, w / 2 - 0.2, 0.012, L, blanco, cx - w / 4, -H + 0.002, z0 - R - 0.9, 0, false); caja(W, w / 2 - 0.2, 0.012, L, blanco, cx + w / 4, -H + 0.002, z1 + R + 0.9, 0, false); }
    // Baldosa táctil amarilla (con tacos) en las dos aceras al final del paso
    const tac = deco(mat('#c9a72a', { roughness: 0.7 })), pad = (px, pz, pw, pd) => { caja(W, pw, 0.012, pd, tac, px, 0, pz, 0, false); };
    if (eje === 'z') { pad(cx, z0 - 0.5, w - 0.4, 0.8); pad(cx, z1 + 0.5, w - 0.4, 0.8); } else { pad(x0 - 0.5, cz, 0.8, d - 0.4); pad(x1 + 0.5, cz, 0.8, d - 0.4); }
    // La losa se puede pisar (la calzada alrededor, no)
    for (let i = 0; i * 0.5 < w; i++) for (let j = 0; j * 0.5 < d; j++) { const [ci, cj] = G.celda(x0 + i * 0.5 + 0.25, z0 + j * 0.5 + 0.25); if (ci >= 0 && cj >= 0 && ci < G.W && cj < G.H) G.b[G.idx(ci, cj)] = 0; }
  }

  // ---------- Farolas ----------
  // Lámparas y charcos de luz de noche (los crea una sola vez por escena)
  function luz(S, M) {
    if (!S.farolas) S.farolas = new THREE.MeshStandardMaterial({ color: 0xfff6d6, emissive: 0xffd99a, emissiveIntensity: 0.4 });
    if (!S.charcosNoche) {
      const t = M.textura('charco-farola', 128, (x, n) => { const g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); g.addColorStop(0, 'rgba(255,214,150,0.75)'); g.addColorStop(1, 'rgba(255,214,150,0)'); x.fillStyle = g; x.fillRect(0, 0, n, n); });
      S.charcosNoche = new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    }
  }
  // Posiciones a lo largo de una acera entre desde y hasta (metros): una farola a cada lado de cada paso de peatones (a 1,3 m de su
  // borde) y, entre ellas, las que caben con separación regular (sep). Los intervalos de «sin» (cruce de calles) se saltan.
  function posiciones(desde, hasta, cruces, sep, semi, sin) {
    semi = semi === undefined ? 1.5 : semi;
    const anc = []; cruces.forEach(c => { anc.push(c - semi - 1.3, c + semi + 1.3); }); anc.sort((a, b) => a - b);
    const pts = anc.filter(a => a > desde + 0.5 && a < hasta - 0.5), lim = [desde].concat(pts, [hasta]), fuera = [];
    for (let i = 0; i < lim.length - 1; i++) {
      const a = lim[i], b = lim[i + 1], gap = b - a; if (gap < 7) continue;
      const k = Math.max(1, Math.round(gap / sep)); for (let j = 1; j < k; j++) fuera.push(a + gap * j / k);
    }
    return pts.concat(fuera).filter(p => !(sin || []).some(([a, b]) => p > a && p < b)).sort((a, b) => a - b);
  }
  // ry: hacia dónde sale el brazo (0 = +z, π = -z, π/2 = +x, -π/2 = -x), siempre hacia la calzada
  function farola(g, G, S, x, z, ry) {
    const sx = Math.sin(ry), sz = Math.cos(ry), oscuro = '#2a2f35';
    cil(g, 0.13, 0.35, '#23282d', x, 0, z, 8, 0.17); cil(g, 0.055, 4.4, oscuro, x, 0.3, z, 8, 0.075); cil(g, 0.09, 0.14, oscuro, x, 4.3, z, 8);
    caja(g, 1.1, 0.08, 0.12, oscuro, x + sx * 0.5, 4.5, z + sz * 0.5, ry);
    caja(g, 0.55, 0.14, 0.3, oscuro, x + sx * 1.0, 4.42, z + sz * 1.0, ry);
    caja(g, 0.45, 0.03, 0.22, S.farolas, x + sx * 1.0, 4.39, z + sz * 1.0, ry, false);
    const ch = new THREE.Mesh(new THREE.PlaneGeometry(7, 7).rotateX(-Math.PI / 2), S.charcosNoche); ch.position.set(x + sx * 1.0, 0.02, z + sz * 1.0); ch.renderOrder = 2; g.add(ch);
    G.bloquea(x - 0.2, z - 0.2, x + 0.2, z + 0.2);
  }

  // ---------- Jardinería ----------
  // Arbustos bajos (racimos de esferas facetadas que se mecen con el viento) y parterres de flores con borde de piedra
  let VERDES = null;
  const verdes = () => VERDES || (VERDES = ['#3f6e33', '#4f7f3a', '#5d8c41', '#476f34'].map(c => { const m = mat(c); if (GM.kit && GM.kit.viento) GM.kit.viento(m, 'copa'); return m; }));
  function arbusto(g, x, z, n, rA) {
    const V = verdes(); for (let i = 0; i < n; i++) { const r = 0.4 + rA() * 0.3, e = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), V[(rA() * 4) | 0]); e.position.set(x + (rA() - 0.5) * 0.9, r * 0.75 + 0.02, z + (rA() - 0.5) * 0.9); e.scale.y = 0.8; e.castShadow = true; g.add(e); }
  }
  function parterre(g, G, x, z, rA, y0) {
    const V = verdes(), F = ['#e8433a', '#f6c344', '#f4f1e8', '#b45fd1', '#ff8fb1', '#f08a24'].map(c => mat(c)), y = y0 || 0;
    disco(g, x, z, 1.25, 'tierra', y + 0.03); const bd = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.07, 5, 24).rotateX(Math.PI / 2), mat(GRANITO)); bd.position.set(x, y + 0.06, z); g.add(bd);
    for (let i = 0; i < 22; i++) { const a = rA() * 6.283, rr = Math.sqrt(rA()) * 1.05, f = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 5), F[(i + (x | 0)) % 6]); f.position.set(x + Math.cos(a) * rr, y + 0.16 + rA() * 0.06, z + Math.sin(a) * rr); g.add(f); const h = new THREE.Mesh(new THREE.SphereGeometry(0.12, 5, 4), V[i % 4]); h.position.set(f.position.x, y + 0.08, f.position.z); h.scale.y = 0.7; g.add(h); }
    if (G) G.bloquea(x - 1.2, z - 1.2, x + 1.2, z + 1.2);
  }

  // ---------- Bordillo y franja de servicio ----------
  // Rectángulo de acera [x0,z0,x1,z1] y los lados que dan a la calzada ('x0','x1','z0','z1'). variante 0 adoquín, 1 ladrillo, 2 baldosa.
  function bordillo(g, x0, z0, x1, z1, lados, variante) {
    const franja = [M_ADOQ(), M_LADR(), M_BALD()][(variante || 0) % 3], A = 1.0;
    lados.forEach(l => {
      let bx, bz, bw, bd, fx, fz, fw, fd;
      if (l === 'z0') { bx = (x0 + x1) / 2; bz = z0 + 0.12; bw = x1 - x0; bd = 0.24; fx = bx; fz = z0 + 0.24 + A / 2; fw = bw; fd = A; }
      else if (l === 'z1') { bx = (x0 + x1) / 2; bz = z1 - 0.12; bw = x1 - x0; bd = 0.24; fx = bx; fz = z1 - 0.24 - A / 2; fw = bw; fd = A; }
      else if (l === 'x0') { bx = x0 + 0.12; bz = (z0 + z1) / 2; bw = 0.24; bd = z1 - z0; fx = x0 + 0.24 + A / 2; fz = bz; fw = A; fd = bd; }
      else { bx = x1 - 0.12; bz = (z0 + z1) / 2; bw = 0.24; bd = z1 - z0; fx = x1 - 0.24 - A / 2; fz = bz; fw = A; fd = bd; }
      const c = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.04, bd), mat(GRANITO, { roughness: 0.7 })); c.position.set(bx, 0.02, bz); c.receiveShadow = true; g.add(c);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(fw, fd).rotateX(-Math.PI / 2), franja); p.position.set(fx, 0.003, fz); p.receiveShadow = true; g.add(p);
    });
  }

  // ---------- Boca de metro ----------
  // x, z: centro de la boca; la escalera baja hacia -z y se entra por el lado +z. T/M: texturas de la escena.
  function bocaMetro(g, G, M, T, x, z, nombre, clave) {
    const metal = mat('#c5ccd2', { roughness: 0.35, metalness: 0.7 }), osc = mat('#2a2f35'), rojo = mat('#c0392b'), vidrio = mat('#9fc4dc', { transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0.2, side: THREE.DoubleSide });
    const ancho = 2.4, largo = 2.6, zc = z - 0.1;
    // Zócalo de granito y hueco de la escalera con los peldaños pintados (baja hacia el fondo)
    caja(g, ancho + 1.0, 0.05, largo + 0.8, mat(GRANITO), x, 0, zc, 0, false);
    const tex = M.textura('escalera-metro', 128, (c, n) => {
      const N = 11; c.fillStyle = '#101214'; c.fillRect(0, 0, n, n);
      for (let i = 0; i < N; i++) { const y0 = i * n / N, k = 1 - i / (N - 1), g1 = Math.round(150 * k + 18); c.fillStyle = 'rgb(' + g1 + ',' + g1 + ',' + Math.round(g1 * 1.04) + ')'; c.fillRect(0, n - (i + 1) * n / N, n, n / N - 1); c.fillStyle = 'rgba(232,200,70,' + (0.9 * k + 0.1).toFixed(2) + ')'; c.fillRect(0, n - (i + 1) * n / N, n, 2); }
      c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, 0, 7, n); c.fillRect(n - 7, 0, 7, n);
    });
    const esc = new THREE.Mesh(new THREE.PlaneGeometry(ancho, largo).rotateX(-Math.PI / 2), deco(new THREE.MeshBasicMaterial({ map: tex }))); esc.position.set(x, 0.06, zc); g.add(esc);
    // Barandillas laterales (acero) y central (amarilla)
    for (const s of [-1, 1]) { const px = x + s * (ancho / 2 + 0.05); caja(g, 0.12, 0.9, largo, mat('#8c9298'), px, 0, zc); tubo(g, [px, 1.0, zc - largo / 2], [px, 1.0, zc + largo / 2], 0.03, metal, 8); for (const q of [-1, 0, 1]) cil(g, 0.025, 0.95, metal, px, 0.05, zc + q * (largo / 2 - 0.05), 6); }
    tubo(g, [x, 0.95, zc - largo / 2 + 0.1], [x, 0.95, zc + largo / 2], 0.025, mat('#e1b81c', { roughness: 0.5 }), 6); cil(g, 0.025, 0.9, '#e1b81c', x, 0.05, zc + largo / 2 - 0.02, 6);
    // Marquesina: cuatro columnas, cubierta de cristal con marco y cartel colgado
    const ym = 3.0;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cil(g, 0.06, ym, osc, x + sx * (ancho / 2 + 0.55), 0.05, zc + sz * (largo / 2 + 0.3), 8);
    const techo = new THREE.Mesh(new THREE.BoxGeometry(ancho + 1.4, 0.06, largo + 0.8), vidrio); techo.position.set(x, ym + 0.05, zc); g.add(techo);
    for (const sz of [-1, 1]) caja(g, ancho + 1.5, 0.12, 0.09, osc, x, ym + 0.02, zc + sz * (largo / 2 + 0.4));
    for (const sx of [-1, 1]) caja(g, 0.09, 0.12, largo + 0.9, osc, x + sx * (ancho / 2 + 0.7), ym + 0.02, zc);
    caja(g, 0.06, 0.1, largo + 0.8, osc, x, ym + 0.02, zc);
    // Pared de fondo de cristal y cartel con el nombre (se lee desde la calle)
    caja(g, ancho + 1.2, 2.3, 0.06, vidrio, x, 0.05, zc - largo / 2 - 0.3, 0, false);
    const L = T.letrero('M  ' + nombre.toUpperCase(), '#c0392b', '#fff', 'metro-' + clave), cart = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.52), new THREE.MeshStandardMaterial({ map: L, roughness: 0.6 }));
    { const uv = cart.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 0.75 + uv.getY(i) * 0.25); }
    cart.position.set(x, 2.6, zc + largo / 2 + 0.31); g.add(cart); const cart2 = cart.clone(); cart2.position.z = zc - largo / 2 - 0.34; cart2.rotation.y = Math.PI; g.add(cart2);
    // Tótem con la «M» roja (a un lado, a la vista desde lejos)
    const tx = x + ancho / 2 + 1.25, tz = zc + largo / 2 - 0.2;
    cil(g, 0.05, 3.6, osc, tx, 0, tz, 8); const disco = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 20), rojo); disco.rotation.x = Math.PI / 2; disco.position.set(tx, 3.9, tz); g.add(disco);
    const mT = M.textura('letra-m-metro', 128, (c, n) => { c.fillStyle = '#c0392b'; c.fillRect(0, 0, n, n); c.fillStyle = '#fff'; c.font = 'bold 96px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('M', n / 2, n / 2 + 4); });
    for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.38, 20), new THREE.MeshBasicMaterial({ map: mT })); m.position.set(tx, 3.9, tz + s * 0.045); if (s < 0) m.rotation.y = Math.PI; g.add(m); }
    // Plano de la red y papelera junto a la entrada
    caja(g, 0.9, 0.7, 0.05, mat('#e8eef2'), x - ancho / 2 - 1.0, 1.1, zc + largo / 2 - 0.1, 0, false); caja(g, 0.05, 1.7, 0.05, osc, x - ancho / 2 - 1.0, 0, zc + largo / 2 - 0.1);
    G.bloquea(x - ancho / 2 - 0.2, zc - largo / 2 - 0.4, x + ancho / 2 + 0.2, zc + largo / 2 + 0.2); G.bloquea(tx - 0.15, tz - 0.15, tx + 0.15, tz + 0.15);
    return { acceso: [x, zc + largo / 2 + 0.9] };
  }

  // ---------- Bicicleta ----------
  // Mira hacia +z, ruedas de 0,34 m de radio. userData.ruedas: las dos ruedas (giran en x); userData.bielas: bielas con pedales.
  let GEO = null;
  function bici(color) {
    if (!GEO) GEO = { neum: new THREE.TorusGeometry(0.335, 0.028, 6, 22), llanta: new THREE.TorusGeometry(0.30, 0.007, 4, 22), radio: new THREE.BoxGeometry(0.004, 0.6, 0.004), buje: new THREE.CylinderGeometry(0.03, 0.03, 0.09, 8), sillin: new THREE.BoxGeometry(0.16, 0.05, 0.27), grip: new THREE.CylinderGeometry(0.018, 0.018, 0.1, 6) };
    const g = new THREE.Group(), cu = mat(color || '#d62d2d', { roughness: 0.4, metalness: 0.3 }), neg = mat('#1d2024', { roughness: 0.8 }), metal = mat('#b9c0c6', { roughness: 0.35, metalness: 0.8 });
    const rueda = z => {
      const w = new THREE.Group(); w.position.set(0, 0.34, z);
      const n = new THREE.Mesh(GEO.neum, neg); n.rotation.y = Math.PI / 2; w.add(n); const l = new THREE.Mesh(GEO.llanta, metal); l.rotation.y = Math.PI / 2; w.add(l);
      for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(GEO.radio, metal); r.rotation.x = i * Math.PI / 3; w.add(r); }
      const b = new THREE.Mesh(GEO.buje, metal); b.rotation.z = Math.PI / 2; w.add(b); g.add(w); return w;
    };
    const rt = rueda(-0.52), dl = rueda(0.52);
    // Cuadro: sillín, tubo del sillín, diagonal, tubo superior, vainas y horquilla
    const BB = [0, 0.3, -0.1], ST = [0, 0.8, -0.3], HT = [0, 0.93, 0.4], HB = [0, 0.82, 0.43];
    tubo(g, BB, ST, 0.017, cu); tubo(g, BB, HB, 0.021, cu); tubo(g, ST, HT, 0.016, cu);
    for (const s of [-1, 1]) { tubo(g, BB, [s * 0.055, 0.34, -0.52], 0.012, cu); tubo(g, ST, [s * 0.055, 0.34, -0.52], 0.011, cu); tubo(g, [0, 0.9, 0.42], [s * 0.05, 0.34, 0.52], 0.013, metal); }
    tubo(g, ST, [0, 0.9, -0.31], 0.014, metal); const sil = new THREE.Mesh(GEO.sillin, neg); sil.position.set(0, 0.93, -0.3); sil.castShadow = true; g.add(sil);
    tubo(g, [0, 0.95, 0.42], [0, 1.03, 0.30], 0.014, metal); tubo(g, [-0.28, 1.03, 0.30], [0.28, 1.03, 0.30], 0.014, metal);
    for (const s of [-1, 1]) { const gr = new THREE.Mesh(GEO.grip, neg); gr.rotation.z = Math.PI / 2; gr.position.set(s * 0.3, 1.03, 0.30); g.add(gr); }
    // Cesta delantera (rejilla de varillas finas)
    const cesta = mat('#3a3f45', { roughness: 0.6 }); caja(g, 0.34, 0.015, 0.26, cesta, 0, 1.0, 0.6, 0, false);
    for (const [px, pz] of [[-0.17, 0.47], [0.17, 0.47], [-0.17, 0.73], [0.17, 0.73]]) tubo(g, [px, 1.0, pz], [px, 1.2, pz], 0.006, cesta, 4);
    tubo(g, [-0.17, 1.2, 0.47], [0.17, 1.2, 0.47], 0.006, cesta, 4); tubo(g, [-0.17, 1.2, 0.73], [0.17, 1.2, 0.73], 0.006, cesta, 4); tubo(g, [-0.17, 1.2, 0.47], [-0.17, 1.2, 0.73], 0.006, cesta, 4); tubo(g, [0.17, 1.2, 0.47], [0.17, 1.2, 0.73], 0.006, cesta, 4);
    // Bielas con pedales
    const bi = new THREE.Group(); bi.position.set(0, 0.3, -0.1);
    for (const s of [-1, 1]) { const brazo = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.17, 0.02), metal); brazo.position.set(s * 0.09, s * 0.085, 0); bi.add(brazo); const pd = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.1), neg); pd.position.set(s * 0.14, s * 0.17, 0); pd.userData.pedal = true; bi.add(pd); }
    g.add(bi);
    // Guardabarros traseros y luz
    caja(g, 0.07, 0.012, 0.5, cu, 0, 0.7, -0.52, 0, false);
    g.userData.ruedas = [rt, dl]; g.userData.bielas = bi; g.traverse(m => { if (m.isMesh) m.castShadow = true; });
    return g;
  }

  // ---------- Estación de bicis compartidas ----------
  // Local: el raíl va a lo largo de x en z = 0; las bicis apuntan al raíl desde -z. ry gira todo el conjunto (múltiplos de π/2).
  const NPUESTOS = 8, SEP = 0.7;
  function huellaEstacion(ry) {
    const L = NPUESTOS * SEP, pts = [[-L / 2 - 1.2, -1.85], [L / 2 + 0.1, 0.35]], c = Math.cos(ry), s = Math.sin(ry);
    const w = pts.map(([lx, lz]) => [lx * c + lz * s, -lx * s + lz * c]);
    return [Math.min(w[0][0], w[1][0]), Math.min(w[0][1], w[1][1]), Math.max(w[0][0], w[1][0]), Math.max(w[0][1], w[1][1])];
  }
  // Busca un sitio libre a 9-17 m de (x0, z0) dentro de la región (acera o plaza) y coloca la estación. Devuelve { x, z, ry, acceso }.
  function paradaBici(g, G, M, T, x0, z0, region, ejes, id) {
    let sitio = null; const rys = ejes === 'z' ? [Math.PI / 2, -Math.PI / 2] : ejes === 'x' ? [0, Math.PI] : [0, Math.PI, Math.PI / 2, -Math.PI / 2], cand = [];
    for (let dx = -24; dx <= 24; dx += 1) for (let dz = -24; dz <= 24; dz += 0.5) { const d = Math.hypot(dx, dz); if (d >= 9 && d <= 24) cand.push([d, dx, dz]); }
    cand.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    buscar: for (const [, dx, dz] of cand) for (const ry of rys) {
      const cx = x0 + dx, cz = z0 + dz, h = huellaEstacion(ry), r = [cx + h[0], cz + h[1], cx + h[2], cz + h[3]];
      if (r[0] < region[0] || r[1] < region[1] || r[2] > region[2] || r[3] > region[3]) continue;
      if (!libre(G, r[0] - 0.3, r[1] - 0.3, r[2] + 0.3, r[3] + 0.3)) continue;
      sitio = { x: cx, z: cz, ry, r }; break buscar;
    }
    if (!sitio) return null;
    const { x, z, ry, r } = sitio, grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = ry; g.add(grp);
    const L = NPUESTOS * SEP, osc = '#1d2a35', verde = new THREE.MeshStandardMaterial({ color: 0x40d070, emissive: 0x40d070, emissiveIntensity: 0.6 });
    caja(grp, L + 0.2, 0.05, 0.34, mat('#3a4048', { roughness: 0.6 }), 0, 0, 0.12, 0, false);
    const k = (GM.util.hash ? GM.util.hash('bicis' + id) : 1) >>> 0;
    for (let i = 0; i < NPUESTOS; i++) {
      const px = -L / 2 + SEP / 2 + i * SEP;
      caja(grp, 0.12, 0.85, 0.12, osc, px, 0.05, 0.08); caja(grp, 0.07, 0.04, 0.02, verde, px, 0.78, -0.0, 0, false);
      if ((k >>> i) % 5 !== 0) { const b = bici(i % 4 === 3 ? '#e9e5da' : '#d62d2d'); b.position.set(px, 0, -0.9); grp.add(b); }
    }
    // Tótem con pantalla (nombre, bicis libres) y techito
    const tx = -L / 2 - 0.7;
    caja(grp, 0.5, 2.1, 0.26, mat('#e8eef2', { roughness: 0.5 }), tx, 0, 0.0); caja(grp, 0.56, 0.08, 0.32, mat(osc), tx, 2.1, 0.0);
    const pant = M.textura('totem-bicis', 128, (c, n) => { c.fillStyle = '#0f2c3a'; c.fillRect(0, 0, n, n); c.fillStyle = '#40d070'; c.font = 'bold 30px sans-serif'; c.textAlign = 'center'; c.fillText('BICIS', n / 2, 34); c.fillStyle = '#fff'; c.font = 'bold 54px sans-serif'; c.fillText('6', n / 2, 92); c.font = '14px sans-serif'; c.fillText('LIBRES', n / 2, 112); });
    for (const s of [-1, 1]) { const pt = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), new THREE.MeshBasicMaterial({ map: pant })); pt.position.set(tx, 1.55, s * 0.135); if (s < 0) pt.rotation.y = Math.PI; grp.add(pt); }
    const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 16), mat('#40d070')); lg.rotation.x = Math.PI / 2; lg.position.set(tx, 0.55, 0.14); grp.add(lg);
    G.bloquea(r[0], r[1], r[2], r[3]);
    // Punto de acceso: junto al tótem, por el lado libre
    const c = Math.cos(ry), s = Math.sin(ry), loc = [[tx, -0.9], [tx - 0.9, 0], [0, 0.9], [0, -2.5]];
    let acceso = null; for (const [lx, lz] of loc) { const wx = x + lx * c + lz * s, wz = z - lx * s + lz * c, [i, j] = G.celda(wx, wz); if (G.libre(i, j)) { acceso = [wx, wz]; break; } }
    if (!acceso) acceso = [x + loc[2][0] * c + loc[2][1] * s, z - loc[2][0] * s + loc[2][1] * c];
    return { x, z, ry, acceso, rect: r };
  }

  GM.urbano = { arbusto, parterre, parche, anillo, disco, suelo: c => SUELOS[c](), cebra, luz, posiciones, farola, bordillo, bocaMetro, bici, paradaBici, libre, deco, tubo };
})();
