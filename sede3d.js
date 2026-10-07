/* SEDE DEL CLUB EN 3D (GM.sede) — prototipo de juego «en el mundo» (al estilo de Big Ambitions)
   Vista desde arriba de las instalaciones del club (plano en sede_plano.js). Tu personaje camina (toca el suelo o usa
   WASD/flechas), los jugadores de tu plantilla y el personal se mueven solos por las salas (entrenan, se sientan, van al
   fisio si están lesionados) y cada sala abre la pantalla del juego que le corresponde (despacho, vestuario, pista...).
   Modelos: Kenney Mini Characters y Furniture Kit (CC0) en dist/modelos. Caminos: A* sobre una cuadrícula de 0,5 m.
   Expone: abrir(st), cerrar(), volver(), activa(). Estado: solo state.sede.charlas (charlas con jugadores, 1 por semana). */
(function () {
  const U = GM.util;
  let S = null; // escena activa
  const cache = {};
  const cargar = ruta => cache[ruta] || (cache[ruta] = new THREE.GLTFLoader().loadAsync(ruta));
  const PERSONAJES = ['male-a', 'male-b', 'male-c', 'male-d', 'male-e', 'male-f', 'female-a', 'female-b', 'female-c', 'female-d', 'female-e', 'female-f'];

  // ---------- Texturas de suelo (canvas) ----------
  const TX = {};
  function textura(clave, n, dibujar, rep) {
    if (TX[clave]) return TX[clave];
    let c; try { c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d'); if (!x) return null; dibujar(x, n); } catch (e) { return null; }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (rep) t.repeat.set(rep[0], rep[1]);
    return (TX[clave] = t);
  }
  function rnd(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const SUELOS = {
    parquet: (x, n) => { const r = rnd(1); x.fillStyle = '#8a5f38'; x.fillRect(0, 0, n, n); for (let f = 0; f < 16; f++) for (let c = -1; c < 4; c++) { const k = 0.85 + r() * 0.25; x.fillStyle = 'rgb(' + (205 * k | 0) + ',' + (150 * k | 0) + ',' + (95 * k | 0) + ')'; x.fillRect(c * n / 4 + (f % 2) * n / 8, f * n / 16, n / 4 - 1, n / 16 - 1); } },
    caucho: (x, n) => { const r = rnd(2); x.fillStyle = '#3a3f45'; x.fillRect(0, 0, n, n); for (let i = 0; i < 3000; i++) { x.fillStyle = r() < 0.5 ? '#2f3338' : '#4a5057'; x.fillRect(r() * n, r() * n, 2, 2); } x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, 0, n, 2); x.fillRect(0, 0, 2, n); },
    baldosa: (x, n) => { x.fillStyle = '#c9d3d6'; x.fillRect(0, 0, n, n); const r = rnd(3); for (let f = 0; f < 8; f++) for (let c = 0; c < 8; c++) { x.fillStyle = 'hsl(195,12%,' + (88 + r() * 6) + '%)'; x.fillRect(c * n / 8 + 1, f * n / 8 + 1, n / 8 - 2, n / 8 - 2); } },
    moqueta: (x, n) => { x.fillStyle = '#2b3442'; x.fillRect(0, 0, n, n); const r = rnd(4); for (let i = 0; i < 5000; i++) { x.fillStyle = r() < 0.5 ? '#273040' : '#323c4c'; x.fillRect(r() * n, r() * n, 1, 2); } },
    madera: (x, n) => { const r = rnd(5); for (let f = 0; f < 12; f++) { const k = 0.85 + r() * 0.25; x.fillStyle = 'rgb(' + (181 * k | 0) + ',' + (131 * k | 0) + ',' + (84 * k | 0) + ')'; x.fillRect(0, f * n / 12, n, n / 12 - 1); for (let j = 0; j < 3; j++) { x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(r() * n, f * n / 12, 1, n / 12); } } },
    madera_oscura: (x, n) => { const r = rnd(6); for (let f = 0; f < 12; f++) { const k = 0.8 + r() * 0.3; x.fillStyle = 'rgb(' + (110 * k | 0) + ',' + (74 * k | 0) + ',' + (46 * k | 0) + ')'; x.fillRect(0, f * n / 12, n, n / 12 - 1); } },
    marmol: (x, n) => { x.fillStyle = '#ece8e1'; x.fillRect(0, 0, n, n); const r = rnd(7); x.strokeStyle = 'rgba(120,110,100,.25)'; for (let i = 0; i < 12; i++) { x.beginPath(); let px = r() * n, py = r() * n; x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (r() - 0.5) * 60; py += r() * 40; x.lineTo(px, py); } x.stroke(); } x.fillStyle = 'rgba(0,0,0,.08)'; x.fillRect(0, 0, n, 2); x.fillRect(0, 0, 2, n); },
    hormigon: (x, n) => { x.fillStyle = '#b9b6b0'; x.fillRect(0, 0, n, n); const r = rnd(8); for (let i = 0; i < 2500; i++) { x.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.06)'; x.fillRect(r() * n, r() * n, 3, 3); } }
  };
  function sueloMat(tipo) { const t = textura('suelo-' + tipo, 256, SUELOS[tipo] || SUELOS.hormigon); return new THREE.MeshStandardMaterial({ map: t, color: t ? 0xffffff : 0x999999, roughness: tipo === 'marmol' ? 0.35 : tipo === 'parquet' ? 0.5 : 0.85 }); }
  function plano(w, d, m, x, z, y, escUV) {
    const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / (escUV || 2), uv.getY(i) * d / (escUV || 2));
    const me = new THREE.Mesh(g, m); me.position.set(x, y || 0, z); me.receiveShadow = true; return me;
  }
  function pistaTex(club) {
    return textura('pista-' + club.siglas, 1024, (x, n) => {
      SUELOS.parquet(x, n); x.strokeStyle = '#ffffff'; x.lineWidth = 6; const W = n, H = n * 0.6, oy = (n - H) / 2;
      x.strokeRect(20, oy + 10, W - 40, H - 20); x.beginPath(); x.moveTo(W / 2, oy + 10); x.lineTo(W / 2, oy + H - 10); x.stroke();
      x.beginPath(); x.arc(W / 2, n / 2, 70, 0, 6.29); x.stroke(); x.fillStyle = club.colores[0]; x.globalAlpha = 0.85; x.beginPath(); x.arc(W / 2, n / 2, 66, 0, 6.29); x.fill(); x.globalAlpha = 1;
      x.fillStyle = '#fff'; x.font = 'bold 54px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(club.siglas, W / 2, n / 2);
      for (const s of [0, 1]) { const bx = s ? W - 20 : 20, dir = s ? -1 : 1; x.fillStyle = club.colores[0]; x.globalAlpha = 0.55; x.fillRect(s ? bx - 190 : bx, n / 2 - 75, 190, 150); x.globalAlpha = 1; x.strokeRect(s ? bx - 190 : bx, n / 2 - 75, 190, 150); x.beginPath(); x.arc(bx, n / 2, 290, dir > 0 ? -1.25 : Math.PI - 1.25 + 0.0, dir > 0 ? 1.25 : Math.PI + 1.25); x.stroke(); }
    });
  }

  // ---------- Carga de modelos ----------
  const AJUSTE = {}, MATS = {}; // desplazamiento para centrar cada mueble (su origen está en una esquina)
  async function mueble(nombre) {
    const g = await cargar('modelos/muebles/' + nombre + '.glb');
    if (!AJUSTE[nombre]) { const b = new THREE.Box3().setFromObject(g.scene), c = b.getCenter(new THREE.Vector3()); AJUSTE[nombre] = [c.x, b.min.y, c.z, b.getSize(new THREE.Vector3())]; }
    const a = AJUSTE[nombre], o = g.scene.clone(true), w = new THREE.Group();
    o.traverse(n => { if (n.isMesh && !Array.isArray(n.material)) { const m = n.material, k = m.name + m.color.getHexString() + (m.map ? m.map.uuid : ''); n.material = MATS[k] || (MATS[k] = m); } }); o.position.set(-a[0], -a[1], -a[2]); w.add(o);
    w.scale.setScalar(GM.sedePlano.ESCALA_MUEBLES); w.tam = a[3]; return w;
  }
  async function personaje(variante) {
    const g = await cargar('modelos/personajes/character-' + variante + '.glb');
    const o = THREE.clonarEsqueleto(g.scene); o.scale.setScalar(GM.sedePlano.ESCALA_PERSONAJES);
    o.traverse(n => { if (n.isMesh) { n.castShadow = true; n.frustumCulled = false; } });
    const mixer = new THREE.AnimationMixer(o), acc = {}; g.animations.forEach(a => { acc[a.name] = mixer.clipAction(a); });
    return { obj: o, mixer, acc };
  }

  // ---------- Cuadrícula y caminos (A*) ----------
  function rejilla(P) {
    const [x0, z0, x1, z1] = P.limites, c = P.CELDA, W = Math.round((x1 - x0) / c), H = Math.round((z1 - z0) / c), b = new Uint8Array(W * H);
    const idx = (i, j) => j * W + i, celda = (x, z) => [Math.floor((x - x0) / c), Math.floor((z - z0) / c)];
    const bloquea = (xa, za, xb, zb) => { const [ia, ja] = celda(Math.min(xa, xb), Math.min(za, zb)), [ib, jb] = celda(Math.max(xa, xb) - 0.001, Math.max(za, zb) - 0.001); for (let j = Math.max(0, ja); j <= Math.min(H - 1, jb); j++) for (let i = Math.max(0, ia); i <= Math.min(W - 1, ib); i++) b[idx(i, j)] = 1; };
    return { W, H, b, c, x0, z0, idx, celda, bloquea, libre: (i, j) => i >= 0 && j >= 0 && i < W && j < H && !b[idx(i, j)], centro: (i, j) => [x0 + (i + 0.5) * c, z0 + (j + 0.5) * c] };
  }
  function aEstrella(G, desde, hasta) {
    let [si, sj] = G.celda(desde[0], desde[1]), [ti, tj] = G.celda(hasta[0], hasta[1]);
    const cerca = (i, j) => { if (G.libre(i, j)) return [i, j]; for (let r = 1; r < 8; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) if (G.libre(i + di, j + dj)) return [i + di, j + dj]; return null; };
    const s = cerca(si, sj), t = cerca(ti, tj); if (!s || !t) return null; [si, sj] = s; [ti, tj] = t;
    const N = G.W * G.H, gS = new Float32Array(N).fill(Infinity), de = new Int32Array(N).fill(-1), cerrado = new Uint8Array(N), abierto = [];
    const h = (i, j) => Math.hypot(i - ti, j - tj), ini = G.idx(si, sj), fin = G.idx(ti, tj);
    gS[ini] = 0; abierto.push([h(si, sj), ini]);
    const DIR = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    while (abierto.length) {
      let m = 0; for (let k = 1; k < abierto.length; k++) if (abierto[k][0] < abierto[m][0]) m = k;
      const [, cur] = abierto[m]; abierto[m] = abierto[abierto.length - 1]; abierto.pop();
      if (cur === fin) break; if (cerrado[cur]) continue; cerrado[cur] = 1;
      const ci = cur % G.W, cj = (cur / G.W) | 0;
      for (const [di, dj, cost] of DIR) {
        const ni = ci + di, nj = cj + dj; if (!G.libre(ni, nj)) continue; if (di && dj && (!G.libre(ci + di, cj) || !G.libre(ci, cj + dj))) continue;
        const n = G.idx(ni, nj), g = gS[cur] + cost; if (g < gS[n]) { gS[n] = g; de[n] = cur; abierto.push([g + h(ni, nj), n]); }
      }
    }
    if (de[fin] < 0 && fin !== ini) return null;
    const camino = []; for (let k = fin; k >= 0; k = k === ini ? -1 : de[k]) camino.push(G.centro(k % G.W, (k / G.W) | 0));
    camino.reverse();
    // Suavizado: salta puntos intermedios si hay línea de visión
    const ve = (a, b) => { const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(d / 0.2); for (let k = 1; k < n; k++) { const [i, j] = G.celda(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n); if (!G.libre(i, j)) return false; } return true; };
    const out = [camino[0]]; let k = 0; while (k < camino.length - 1) { let l = camino.length - 1; while (l > k + 1 && !ve(camino[k], camino[l])) l--; out.push(camino[l]); k = l; }
    return out;
  }

  // ---------- Personajes que caminan ----------
  function anim(p, nombre) {
    if (p.actual === nombre) return; const a = p.acc[nombre] || p.acc.idle; if (!a) return;
    a.reset().fadeIn(0.2).play(); if (p.accion) p.accion.fadeOut(0.2); p.accion = a; p.actual = nombre;
  }
  function irA(p, x, z, alLlegar) {
    const c = aEstrella(S.G, [p.obj.position.x, p.obj.position.z], [x, z]); if (!c) return false;
    c.push([x, z]); p.camino = c.slice(1); p.alLlegar = alLlegar || null; anim(p, p.rapido ? 'sprint' : 'walk'); return true;
  }
  function moverPaso(p, dt) {
    if (!p.camino || !p.camino.length) return;
    const [tx, tz] = p.camino[0], o = p.obj.position, dx = tx - o.x, dz = tz - o.z, d = Math.hypot(dx, dz), v = (p.rapido ? 4.2 : 2.1) * dt;
    if (d < v) { o.x = tx; o.z = tz; p.camino.shift(); if (!p.camino.length) { anim(p, 'idle'); const f = p.alLlegar; p.alLlegar = null; if (f) f(); } return; }
    o.x += dx / d * v; o.z += dz / d * v; girar(p, Math.atan2(dx, dz), dt);
  }
  function girar(p, ang, dt) { let d = ang - p.obj.rotation.y; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; p.obj.rotation.y += d * Math.min(1, dt * 10); }

  // Rutina de cada jugador: elegir sala y sitio, ir, hacer la actividad un rato y repetir
  function siguienteActividad(n) {
    const P = GM.sedePlano, st = S.st, j = n.jugador && st.jugadores[n.jugador];
    let sala; if (j && j.estado && j.estado.lesion) sala = 'fisio';
    else { const r = n.r(); sala = r < 0.38 ? 'pista' : r < 0.58 ? 'gimnasio' : r < 0.72 ? 'vestuario' : r < 0.88 ? 'cafeteria' : r < 0.94 ? 'prensa' : 'pasillo'; }
    const lista = P.puntos[sala], libres = lista.filter(q => !S.ocupados.has(q)); const q = libres.length ? libres[(n.r() * libres.length) | 0] : lista[0];
    if (n.punto) S.ocupados.delete(n.punto); n.punto = q; S.ocupados.add(q);
    const ok = irA(n, q[0], q[1], () => { n.obj.rotation.y = q[3] * Math.PI / 180; anim(n, q[2]); n.espera = 6 + n.r() * 12; });
    if (!ok) n.espera = 2;
  }

  // ---------- Construcción de la escena ----------
  async function construir(st) {
    const P = GM.sedePlano, club = st.equipos[st.clubId], G = rejilla(P), W = new THREE.Group(); S.G = G; S.mundo = W; S.scene.add(W);
    // Suelos: exterior, pasillo y salas
    W.add(plano(70, 50, new THREE.MeshStandardMaterial({ color: 0x6f8a5a, roughness: 1 }), 0, 0, -0.02, 4));
    const [px0, pz0, px1, pz1] = P.pasillo.rect; W.add(plano(px1 - px0, pz1 - pz0, sueloMat('hormigon'), (px0 + px1) / 2, (pz0 + pz1) / 2, 0));
    P.salas.forEach(s => { const [x0, z0, x1, z1] = s.rect; W.add(plano(x1 - x0, z1 - z0, sueloMat(s.suelo), (x0 + x1) / 2, (z0 + z1) / 2, 0.001)); });
    // Pista con las líneas y el escudo del club
    const tP = pistaTex(club); if (tP) { const m = new THREE.Mesh(new THREE.PlaneGeometry(20, 12).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tP, roughness: 0.45 })); tP.repeat.set(1, 0.6); tP.offset.set(0, 0.2); m.position.set(-9, 0.01, -6); m.receiveShadow = true; W.add(m); }
    for (const s of [-1, 1]) { const x = -9 + s * 9.6, g = new THREE.Group(); const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.05), new THREE.MeshStandardMaterial({ color: 0x333a40 })); poste.position.y = 1.52; g.add(poste); const tab = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.05, 1.8), new THREE.MeshStandardMaterial({ color: 0xf4f4f4 })); tab.position.set(-s * 0.35, 3.0, 0); g.add(tab); const aro = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.02, 6, 20), new THREE.MeshStandardMaterial({ color: 0xe8590c })); aro.rotation.x = Math.PI / 2; aro.position.set(-s * 0.62, 2.85, 0); g.add(aro); g.position.set(x, 0, -6); g.traverse(n => { if (n.isMesh) n.castShadow = true; }); W.add(g); G.bloquea(x - 0.3, -6.3, x + 0.3, -5.7); }
    // Muros bajos (vista en corte, como en Big Ambitions): segmentos de 0,5 m sin duplicar, con huecos en las puertas
    const muro = new THREE.MeshStandardMaterial({ color: 0xf1ede6, roughness: 0.9 }), remate = new THREE.MeshStandardMaterial({ color: 0x2b3038 }), segs = new Map();
    const borde = (xa, za, xb, zb) => { const n = Math.round(Math.hypot(xb - xa, zb - za) / 0.5); for (let k = 0; k < n; k++) { const x = xa + (xb - xa) * (k + 0.5) / n, z = za + (zb - za) * (k + 0.5) / n; segs.set(x.toFixed(2) + ',' + z.toFixed(2), [x, z, xa === xb]); } };
    const rectBordes = ([x0, z0, x1, z1]) => { borde(x0, z0, x1, z0); borde(x0, z1, x1, z1); borde(x0, z0, x0, z1); borde(x1, z0, x1, z1); };
    P.salas.forEach(s => rectBordes(s.rect)); rectBordes(P.pasillo.rect);
    const hueco = (lado, rect, centro, ancho) => { const [x0, z0, x1, z1] = rect; segs.forEach((v, k) => { const [x, z] = v; const enLado = lado === 'n' ? Math.abs(z - z0) < 0.01 : lado === 's' ? Math.abs(z - z1) < 0.01 : lado === 'w' ? Math.abs(x - x0) < 0.01 : Math.abs(x - x1) < 0.01; const pos = lado === 'n' || lado === 's' ? x : z; if (enLado && Math.abs(pos - centro) < ancho / 2) segs.delete(k); }); };
    P.salas.forEach(s => hueco(s.puerta[0], s.rect, s.puerta[1], s.puerta[2]));
    hueco('s', [2, 5, 10, 14], P.entrada.x, P.entrada.ancho); hueco('w', P.pasillo.rect, 3.5, 3); hueco('e', P.pasillo.rect, 3.5, 3);
    segs.forEach(([x, z, vertical]) => { const w = vertical ? 0.2 : 0.52, d = vertical ? 0.52 : 0.2; const m = new THREE.Mesh(new THREE.BoxGeometry(w, P.ALTO_MURO, d), muro); m.position.set(x, P.ALTO_MURO / 2, z); m.castShadow = m.receiveShadow = true; W.add(m); const r = new THREE.Mesh(new THREE.BoxGeometry(w + 0.01, 0.04, d + 0.01), remate); r.position.set(x, P.ALTO_MURO + 0.02, z); W.add(r); G.bloquea(x - w / 2 - 0.05, z - d / 2 - 0.05, x + w / 2 + 0.05, z + d / 2 + 0.05); });
    // Panel de la sala de prensa con el escudo repetido (photocall)
    const tF = textura('photocall-' + club.siglas, 512, (x, n) => { x.fillStyle = '#f7f7f7'; x.fillRect(0, 0, n, n); x.font = 'bold 44px sans-serif'; x.textAlign = 'center'; for (let f = 0; f < 6; f++) for (let c = 0; c < 4; c++) { x.fillStyle = (f + c) % 2 ? club.colores[0] : (club.colores[1] === '#ffffff' ? '#333' : club.colores[1]); x.fillText(club.siglas, 64 + c * 128, 60 + f * 85); } });
    const panel = new THREE.Mesh(new THREE.BoxGeometry(6, 2.4, 0.1), new THREE.MeshStandardMaterial({ map: tF, color: tF ? 0xffffff : club.colores[0] })); panel.position.set(-14, 1.2, 13.85); W.add(panel);
    // Vitrina de trofeos en recepción: una copa por título del palmarés (si no hay, una vacía)
    const titulos = Math.min(12, (st.historial || []).filter(h => h.clubId === st.clubId && h.campeon).length + 1), oro = new THREE.MeshStandardMaterial({ color: 0xd4a72c, metalness: 0.9, roughness: 0.3 });
    for (let i = 0; i < titulos; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.05, 0.28, 10), oro); c.position.set(9.2, 0.95 + (i % 2) * 0.55, 8.8 + (i >> 1) * 0.28); W.add(c); }
    // Máquinas del gimnasio (procedurales)
    const metal = new THREE.MeshStandardMaterial({ color: 0x40464e, metalness: 0.6, roughness: 0.4 }), negro = new THREE.MeshStandardMaterial({ color: 0x1d2024 }), clubM = new THREE.MeshStandardMaterial({ color: club.colores[0] });
    P.gimnasio.forEach(([tipo, x, z, ry]) => {
      const g = new THREE.Group(); const B = (w, h, d, m, px, py, pz) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(px, py, pz); me.castShadow = true; g.add(me); };
      if (tipo === 'cinta') { B(0.8, 0.18, 1.9, negro, 0, 0.12, 0); B(0.06, 1.1, 0.06, metal, -0.38, 0.6, -0.8); B(0.06, 1.1, 0.06, metal, 0.38, 0.6, -0.8); B(0.8, 0.3, 0.12, clubM, 0, 1.2, -0.8); G.bloquea(x - 0.5, z - 1.1, x + 0.5, z + 1.1); }
      else if (tipo === 'bici') { B(0.3, 0.5, 1.1, metal, 0, 0.3, 0); B(0.35, 0.08, 0.3, negro, 0, 0.75, 0.25); B(0.5, 0.06, 0.1, negro, 0, 1.0, -0.45); B(0.06, 0.4, 0.06, metal, 0, 0.8, -0.45); G.bloquea(x - 0.3, z - 0.6, x + 0.3, z + 0.6); }
      else if (tipo === 'pesas') { B(0.5, 1.4, 2.4, metal, 0, 0.7, 0); for (let i = 0; i < 6; i++) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.35, 10), negro); d.rotation.x = Math.PI / 2; d.position.set(0.3, 0.4 + (i % 2) * 0.5, -0.9 + (i >> 1) * 0.9); g.add(d); } G.bloquea(x - 1.3, z - 0.5, x + 1.3, z + 0.5); }
      else if (tipo === 'colchoneta') B(1.6, 0.06, 2.2, clubM, 0, 0.03, 0);
      g.position.set(x, 0, z); g.rotation.y = ry * Math.PI / 180; W.add(g);
    });
    // Muebles de Kenney
    const ms = await Promise.all(P.muebles.map(m => mueble(m[0]).catch(() => null)));
    P.muebles.forEach((m, i) => {
      const o = ms[i]; if (!o) return; o.position.set(m[1], 0, m[2]); o.rotation.y = m[3] * Math.PI / 180; o.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } }); W.add(o);
      const t = o.tam, e = P.ESCALA_MUEBLES, giro = Math.abs(Math.sin(o.rotation.y)) > 0.5, w = (giro ? t.z : t.x) * e, d = (giro ? t.x : t.z) * e;
      if (!/^rug|^books|^computer|^laptop|^kitchenCoffee/.test(m[0])) G.bloquea(m[1] - w / 2 + 0.1, m[2] - d / 2 + 0.1, m[1] + w / 2 - 0.1, m[2] + d / 2 - 0.1);
    });
    GM.kit.fusionar(W);
    // Puntos de interacción de las salas: anillo luminoso y rótulo
    S.zonas = P.salas.map(s => {
      const g = new THREE.Group(), anillo = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.6, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: club.colores[0] === '#ffffff' ? 0xe8590c : club.colores[0], transparent: true, opacity: 0.85 }));
      anillo.position.y = 0.02; g.add(anillo); g.position.set(s.interaccion[0], 0, s.interaccion[1]); g.userData = { sala: s.id, anim: t => { anillo.scale.setScalar(1 + Math.sin(t * 3) * 0.08); } }; W.add(g);
      const et = etiqueta(s.nombre); et.position.set(s.interaccion[0], 2.3, s.interaccion[1]); W.add(et);
      return { sala: s, obj: g };
    });
    return W;
  }
  function etiqueta(txt) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 96; const x = c.getContext('2d');
    if (x) { x.fillStyle = 'rgba(20,24,30,.78)'; x.beginPath(); if (x.roundRect) x.roundRect(4, 8, 504, 80, 30); else x.rect(4, 8, 504, 80); x.fill(); x.fillStyle = '#fff'; x.font = '600 42px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 256, 50); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(2.6, 0.49, 1); s.renderOrder = 10; s.userData = { etiqueta: true }; return s;
  }

  // ---------- Interfaz superpuesta ----------
  function hud(st) {
    const h = GM.h, club = st.equipos[st.clubId];
    S.raiz.querySelectorAll('.sede-hud').forEach(n => n.remove());
    const fecha = h('span', null, U.fechaLarga(st.fecha));
    const top = h('div', { class: 'sede-hud sede-top' },
      h('button', { class: 'btn btn-sec peq', onclick: cerrar }, 'Salir'),
      h('div', { class: 'ct' }, h('b', null, club.nombre), fecha),
      h('button', { class: 'btn peq', onclick: () => { if (GM.ui.jugarUnDia) { GM.ui.jugarUnDia(); setTimeout(() => { fecha.textContent = U.fechaLarga(st.fecha); repoblar(); }, 60); } } }, 'Avanzar un día'));
    S.aviso = h('div', { class: 'sede-hud sede-aviso', style: { display: 'none' } });
    S.ficha = h('div', { class: 'sede-hud sede-ficha', style: { display: 'none' } });
    const ayuda = h('div', { class: 'sede-hud sede-ayuda' }, 'Toca el suelo para caminar o usa WASD. Rueda o pellizco para acercar, Q y E para girar. Toca a un jugador para hablar con él.');
    S.raiz.append(top, S.aviso, S.ficha, ayuda);
  }
  function mostrarAviso(zona) {
    const h = GM.h, st = S.st;
    if (!zona) { S.aviso.style.display = 'none'; S.zonaActual = null; return; }
    if (S.zonaActual === zona) return; S.zonaActual = zona; S.aviso.innerHTML = '';
    S.aviso.append(h('div', { class: 'ct' }, h('b', null, zona.sala.nombre), h('span', null, zona.sala.accion)), h('button', { class: 'btn', onclick: () => entrar(zona.sala) }, 'Entrar (E)'));
    S.aviso.style.display = 'flex';
  }
  function entrar(sala) {
    const st = S.st, d = sala.destino.todos || sala.destino[st.modo] || 'inicio';
    if (d === 'lesionados' || d === 'noticias') return panelPropio(d);
    if (!GM.ui.screens[d]) return GM.ui.toast && GM.ui.toast('Esta sala aún no tiene contenido en este modo');
    // Se oculta la sede (sigue cargada) y se abre la pantalla clásica con un botón para volver
    S.raiz.style.display = 'none'; S.pausa = true; GM.ui.navegar(d);
    if (!S.volverBtn) { S.volverBtn = GM.h('button', { class: 'btn sede-volver', onclick: volver }, 'Volver a la sede'); document.body.append(S.volverBtn); }
    S.volverBtn.style.display = 'block';
  }
  function volver() { if (!S) return; S.raiz.style.display = ''; S.pausa = false; if (S.volverBtn) S.volverBtn.style.display = 'none'; repoblar(); S.reloj.update(); }
  function panelPropio(tipo) {
    const h = GM.h, st = S.st, eq = st.equipos[st.clubId], cont = h('div');
    if (tipo === 'lesionados') {
      const les = eq.plantilla.map(i => st.jugadores[i]).filter(p => p && p.estado && p.estado.lesion);
      cont.append(h('h3', null, 'Enfermería'), les.length ? h('div', { class: 'lista' }, les.map(p => h('div', { class: 'item' }, h('div', { class: 'ct' }, h('b', null, p.nombre), h('span', { class: 'muted' }, p.estado.lesion.tipo + ', ' + p.estado.lesion.dias + ' días de baja'))))) : h('p', null, 'No hay ningún lesionado. El fisio se aburre.'));
    } else {
      cont.append(h('h3', null, 'Sala de prensa'), h('div', { class: 'lista' }, (st.noticias || []).slice(0, 12).map(n => h('div', { class: 'item' }, h('div', { class: 'ct' }, h('span', { class: 'muted' }, U.fecha(n.fecha)), h('span', null, n.texto))))));
    }
    GM.ui.modal(cont, [{ t: 'Cerrar', cls: 'btn-sec' }]);
  }
  function fichaJugador(n) {
    const h = GM.h, st = S.st, F = S.ficha; F.innerHTML = '';
    if (!n) { F.style.display = 'none'; return; }
    const p = n.jugador && st.jugadores[n.jugador];
    st.sede = st.sede || { charlas: {} };
    const hoy = st.fecha, ult = p && st.sede.charlas[p.id], puede = p && (!ult || U.diffDays(ult, hoy) >= 7);
    F.append(h('div', { class: 'ct' }, h('b', null, p ? p.nombre : n.rol), h('span', { class: 'muted' }, p ? [p.pos, p.edad + ' años', 'nivel ' + p.ovr, 'ánimo ' + Math.round(p.estado.moral), p.estado.lesion ? 'lesionado' : 'forma ' + Math.round(p.estado.forma)].join(', ') : 'Personal del club')),
      p ? h('button', { class: 'btn peq', disabled: !puede, onclick: () => { st.sede.charlas[p.id] = hoy; p.estado.moral = Math.min(100, p.estado.moral + 3); anim(n, 'emote-yes'); n.espera = 3; GM.ui.toast(p.nombre.split(' ')[0] + ' agradece la charla (+3 de ánimo)'); fichaJugador(n); } }, puede ? 'Charlar' : 'Ya hablasteis esta semana') : null,
      h('button', { class: 'btn btn-sec peq', onclick: () => fichaJugador(null) }, 'Cerrar'));
    F.style.display = 'flex';
  }

  // ---------- Gente ----------
  async function poblar(st) {
    const P = GM.sedePlano, eq = st.equipos[st.clubId], r = rnd(U.hash(st.clubId + st.fecha));
    S.gente.forEach(n => { S.mundo.remove(n.obj); n.mixer.stopAllAction(); }); S.gente = []; S.ocupados = new Set();
    const ids = eq.plantilla.filter(i => i !== 'yo').slice(0, 12);
    const nuevos = await Promise.all(ids.map(id => personaje(PERSONAJES[U.hash(id) % 8])));
    nuevos.forEach((n, k) => {
      Object.assign(n, { jugador: ids[k], r: rnd(U.hash(ids[k] + st.fecha)), espera: 0 });
      const z = P.puntos.pasillo[k % P.puntos.pasillo.length]; n.obj.position.set(z[0] + (r() - 0.5) * 2, 0, z[1] + (r() - 0.5) * 0.8); n.obj.userData = { npc: k }; S.mundo.add(n.obj); anim(n, 'idle'); S.gente.push(n);
    });
    const per = await Promise.all(P.personal.map((q, k) => personaje(PERSONAJES[8 + (k % 4)])));
    per.forEach((n, k) => { const q = P.personal[k]; n.rol = q[0]; n.fijo = true; n.obj.position.set(q[2], 0, q[3]); n.obj.rotation.y = q[5] * Math.PI / 180; n.obj.userData = { npc: S.gente.length }; anim(n, q[4]); S.mundo.add(n.obj); S.gente.push(n); });
  }
  function repoblar() { if (S && S.st) poblar(S.st).catch(e => console.warn(e)); }

  // ---------- Bucle, cámara y controles ----------
  function abrir(st) {
    if (S) cerrar();
    const h = GM.h, raiz = h('div', { class: 'sede' }), lienzo = h('div', { class: 'sede-3d' });
    raiz.append(lienzo); document.body.append(raiz);
    const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    lienzo.append(renderer.domElement); renderer.domElement.style.touchAction = 'none';
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x9fb8c8);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 200);
    scene.add(new THREE.HemisphereLight(0xdfe8f2, 0x6b5a48, 1.1));
    const sol = new THREE.DirectionalLight(0xfff1dc, 2.6); sol.position.set(-14, 26, 12); sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048);
    Object.assign(sol.shadow.camera, { left: -26, right: 26, top: 20, bottom: -20, near: 1, far: 70 }); sol.shadow.bias = -0.0005; sol.shadow.normalBias = 0.02; scene.add(sol);
    S = { st, raiz, renderer, scene, camera, gente: [], ocupados: new Set(), reloj: new THREE.Timer(), yaw: 0, yawObj: 0, zoom: 22, foco: new THREE.Vector3(6, 0, 10), teclas: {}, vivo: true };
    hud(st);
    const tam = () => { const w = lienzo.clientWidth || window.innerWidth, hh = lienzo.clientHeight || window.innerHeight; renderer.setSize(w, hh); camera.aspect = w / hh; camera.updateProjectionMatrix(); };
    tam(); S.onResize = tam; window.addEventListener('resize', tam);
    const cargando = h('div', { class: 'sede-hud sede-cargando' }, 'Abriendo la sede del club…'); raiz.append(cargando);
    construir(st).then(async () => {
      const yo = await personaje(st.modo === 'carrera' ? 'male-a' : 'male-e'); yo.obj.position.set(GM.sedePlano.entrada.x, 0, 12.5); yo.obj.rotation.y = Math.PI; S.yo = yo; anim(yo, 'idle'); S.mundo.add(yo.obj);
      const marca = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.45, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd54a })); marca.position.y = 0.02; yo.obj.add(marca); marca.scale.setScalar(1 / GM.sedePlano.ESCALA_PERSONAJES);
      await poblar(st); cargando.remove();
    }).catch(e => { cargando.textContent = 'No se ha podido cargar la sede: ' + e.message; console.error(e); });
    controles(renderer.domElement);
    (function bucle() {
      if (!S || !S.vivo) return; S.raf = requestAnimationFrame(bucle); if (S.pausa) return;
      S.reloj.update(); const dt = Math.min(0.05, S.reloj.getDelta()), t = S.reloj.getElapsed();
      if (S.yo) { teclado(dt); moverPaso(S.yo, dt); S.yo.mixer.update(dt); S.foco.lerp(S.yo.obj.position, Math.min(1, dt * 4)); zonaCercana(); }
      S.gente.forEach(n => { if (!n.fijo) { if (n.camino && n.camino.length) moverPaso(n, dt); else if ((n.espera -= dt) <= 0) siguienteActividad(n); } n.mixer.update(dt); });
      if (S.zonas) S.zonas.forEach(z => z.obj.userData.anim(t));
      S.yaw += (S.yawObj - S.yaw) * Math.min(1, dt * 6);
      const inc = 0.95, d = S.zoom; camera.position.set(S.foco.x + Math.sin(S.yaw) * Math.cos(inc) * d, Math.sin(inc) * d, S.foco.z + Math.cos(S.yaw) * Math.cos(inc) * d); camera.lookAt(S.foco.x, 0.6, S.foco.z);
      renderer.render(scene, camera);
    })();
  }
  function zonaCercana() {
    const p = S.yo.obj.position; let mejor = null; S.zonas && S.zonas.forEach(z => { if (Math.hypot(z.obj.position.x - p.x, z.obj.position.z - p.z) < 1.3) mejor = z; }); mostrarAviso(mejor);
  }
  function teclado(dt) {
    const k = S.teclas, ax = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0), az = (k.s || k.arrowdown ? 1 : 0) - (k.w || k.arrowup ? 1 : 0);
    if (!ax && !az) { if (S.yo.teclado) { S.yo.teclado = false; anim(S.yo, 'idle'); } return; }
    S.yo.camino = null; S.yo.teclado = true; anim(S.yo, k.shift ? 'sprint' : 'walk');
    const c = Math.cos(S.yaw), s = Math.sin(S.yaw), dx = ax * c + az * s, dz = -ax * s + az * c, l = Math.hypot(dx, dz), v = (k.shift ? 4.2 : 2.1) * dt, o = S.yo.obj.position;
    const nx = o.x + dx / l * v, nz = o.z + dz / l * v, G = S.G, ok = (x, z) => { const [i, j] = G.celda(x, z); return G.libre(i, j); };
    if (ok(nx, nz)) { o.x = nx; o.z = nz; } else if (ok(nx, o.z)) o.x = nx; else if (ok(o.x, nz)) o.z = nz;
    girar(S.yo, Math.atan2(dx, dz), dt);
  }
  function controles(cv) {
    const ray = new THREE.Raycaster(), suelo = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), ptrs = new Map(); let pinza = 0;
    const toque = (cx, cy) => {
      if (!S.yo) return; const r = cv.getBoundingClientRect(); ray.setFromCamera(new THREE.Vector2((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), S.camera);
      const npcs = S.gente.map(n => n.obj), hit = ray.intersectObjects(npcs, true)[0];
      if (hit) { let o = hit.object; while (o && !(o.userData && o.userData.npc !== undefined)) o = o.parent; if (o) { const n = S.gente[o.userData.npc]; fichaJugador(n); const yo = S.yo.obj.position; if (!n.fijo && n.camino) { n.camino = null; anim(n, 'idle'); n.espera = 6; } n.obj.lookAt(yo.x, 0, yo.z); return; } }
      const p = new THREE.Vector3(); if (!ray.ray.intersectPlane(suelo, p)) return;
      { let mejor = null, dm = 0.9; S.gente.forEach(n => { const d = Math.hypot(n.obj.position.x - p.x, n.obj.position.z - p.z); if (d < dm) { dm = d; mejor = n; } }); if (mejor) { fichaJugador(mejor); if (!mejor.fijo && mejor.camino) { mejor.camino = null; anim(mejor, 'idle'); mejor.espera = 6; } mejor.obj.lookAt(S.yo.obj.position.x, 0, S.yo.obj.position.z); return; } }
      const z = S.zonas && S.zonas.find(z => Math.hypot(z.obj.position.x - p.x, z.obj.position.z - p.z) < 0.9);
      irA(S.yo, p.x, p.z, z ? () => entrar(z.sala) : null);
      const m = S.marcaDestino || (S.marcaDestino = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.25, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }))); m.position.set(p.x, 0.03, p.z); S.scene.add(m);
    };
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture && cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: Date.now() }); if (ptrs.size === 2) { const a = [...ptrs.values()]; pinza = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); } });
    cv.addEventListener('pointermove', e => { const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x; p.x = e.clientX; p.y = e.clientY; if (ptrs.size === 1 && Math.abs(p.x - p.x0) > 8) S.yawObj -= dx * 0.006; else if (ptrs.size === 2) { const a = [...ptrs.values()], d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); if (pinza) S.zoom = Math.max(8, Math.min(42, S.zoom * pinza / d)); pinza = d; } });
    cv.addEventListener('pointerup', e => { const p = ptrs.get(e.pointerId); ptrs.delete(e.pointerId); pinza = 0; if (p && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 8 && Date.now() - p.t < 450) toque(e.clientX, e.clientY); });
    cv.addEventListener('wheel', e => { e.preventDefault(); S.zoom = Math.max(8, Math.min(42, S.zoom * (1 + e.deltaY * 0.001))); }, { passive: false });
    S.onKey = e => { if (!S || S.pausa) return; const k = e.key.toLowerCase(); if (e.type === 'keydown') { if (k === 'q') S.yawObj += Math.PI / 2; if (k === 'e' && S.zonaActual) entrar(S.zonaActual.sala); else if (k === 'e') S.yawObj -= Math.PI / 2; if (k === 'escape') cerrar(); } S.teclas[k] = e.type === 'keydown'; S.teclas.shift = e.shiftKey; };
    window.addEventListener('keydown', S.onKey); window.addEventListener('keyup', S.onKey);
  }
  function cerrar() {
    if (!S) return; S.vivo = false; cancelAnimationFrame(S.raf);
    window.removeEventListener('resize', S.onResize); window.removeEventListener('keydown', S.onKey); window.removeEventListener('keyup', S.onKey);
    S.scene.traverse(n => { if (n.geometry) n.geometry.dispose(); }); S.renderer.dispose(); S.raiz.remove(); if (S.volverBtn) S.volverBtn.remove(); S = null;
    if (GM.ui.refrescar) GM.ui.refrescar();
  }
  GM.sede = { abrir, cerrar, volver, activa: () => !!S, _estado: () => S, aEstrella, rejilla };
})();
