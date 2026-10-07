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
  // Personas de Quaternius (CC0): cada una sin animaciones y un archivo de animaciones compartido (mismo esqueleto)
  const PERSONAS = { jugador: ['h-casual_hoodie', 'h-casual_2', 'h-beach'], Recepcionista: 'm-formal', Fisioterapeuta: 'm-casual', Camarero: 'h-casual_2', 'Preparador físico': 'h-beach', 'Jefe de prensa': 'm-suit', director: 'h-suit', entrenador: 'h-casual_hoodie' };
  const ANIM = { idle: 'Idle_Neutral', walk: 'Walk', sprint: 'Run', 'interact-right': 'Interact', 'interact-left': 'Interact', crouch: 'Interact', 'emote-yes': 'Wave', 'emote-no': 'Idle', sit: 'Idle_Neutral' };
  const PIEL = ['#f1c7a5', '#e0ac85', '#c68863', '#9a6142', '#6e4329', '#4b2e1e'], PELO = ['#1d1510', '#3b2617', '#6a4425', '#a9793e', '#d8b46a', '#8a8a8a'];

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
  // o: { modelo, altura (cm), piel, pelo, ropa: [color principal, color secundario] }
  async function personaje(o) {
    const [g, an] = await Promise.all([cargar('modelos/personas/' + o.modelo + '.glb'), cargar('modelos/personas/animaciones.glb')]);
    const obj = THREE.clonarEsqueleto(g.scene); if (!g.altoBase) g.altoBase = new THREE.Box3().setFromObject(g.scene).getSize(new THREE.Vector3()).y;
    obj.scale.setScalar((o.altura || 178) / 100 / g.altoBase);
    const tinta = (m, hex) => { const c = m.clone(); c.color.set(hex); return c; };
    obj.traverse(n => {
      if (!n.isMesh) return; n.castShadow = true; n.frustumCulled = false;
      const nm = n.material.name || '';
      if (o.piel && /^Skin/.test(nm)) n.material = tinta(n.material, o.piel);
      else if (o.pelo && /Hair|Eyebrows|Moustache/.test(nm)) n.material = tinta(n.material, o.pelo);
      else if (o.ropa && /^(Purple|Red_Dark|LightBrown)$/.test(nm)) n.material = tinta(n.material, o.ropa[0]);
      else if (o.ropa && /^(LightBlue)$/.test(nm)) n.material = tinta(n.material, o.ropa[1]);
    });
    const mixer = new THREE.AnimationMixer(obj), acc = {};
    Object.keys(ANIM).forEach(k => { const c = an.animations.find(a => a.name === ANIM[k]); if (c) acc[k] = mixer.clipAction(c); });
    const B = {}; obj.traverse(n => { if (n.isBone) B[n.name] = n; });
    return { obj, mixer, acc, huesos: B, altura: o.altura || 178 };
  }
  // Postura sentada (las animaciones no la traen): muslos al frente, pantorrillas hacia el suelo y pies al final de la pierna.
  // En este esqueleto los pies cuelgan de Root (no de la pierna), por eso se recolocan a mano.
  const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), ABAJO = new THREE.Vector3(0, -1, 0);
  function sentar(p) {
    const B = p.huesos; if (!B.UpperLegL || !B.FootL) return;
    p.obj.updateMatrixWorld(true);
    if (!p.pieLocal) p.pieLocal = {};
    const qPie = {}; for (const s of ['L', 'R']) qPie[s] = B['Foot' + s].getWorldQuaternion(new THREE.Quaternion()); // orientación de los pies de pie
    for (const s of ['L', 'R']) { p.pieLocal[s] = B['LowerLeg' + s].worldToLocal(B['Foot' + s].getWorldPosition(new THREE.Vector3())); }
    // Muslos hacia delante (hacia donde mira la persona) con una leve caída: se orienta cada hueso por su dirección real,
    // porque los ejes locales de la pierna derecha están en espejo respecto a la izquierda
    const delante = new THREE.Vector3(0, -0.12, 1).normalize().applyQuaternion(p.obj.getWorldQuaternion(new THREE.Quaternion()));
    for (const s of ['L', 'R']) {
      const ul = B['UpperLeg' + s], ini = ul.getWorldPosition(_v), dir = B['LowerLeg' + s].getWorldPosition(_w).sub(ini).normalize();
      _q.setFromUnitVectors(dir, delante); ul.getWorldQuaternion(_q2); _q2.premultiply(_q);
      ul.parent.getWorldQuaternion(_q).invert(); ul.quaternion.copy(_q.multiply(_q2)); ul.updateMatrixWorld(true);
    }
    p.obj.updateMatrixWorld(true);
    for (const s of ['L', 'R']) {
      const ll = B['LowerLeg' + s], f = B['Foot' + s], ini = ll.getWorldPosition(_v);
      const dir = ll.localToWorld(_w.copy(p.pieLocal[s])).sub(ini).normalize();
      _q.setFromUnitVectors(dir, ABAJO); ll.getWorldQuaternion(_q2); _q2.premultiply(_q);
      ll.parent.getWorldQuaternion(_q).invert(); ll.quaternion.copy(_q.multiply(_q2)); ll.updateMatrixWorld(true);
      const fin = ll.localToWorld(_w.copy(p.pieLocal[s])); f.parent.updateMatrixWorld(true); f.position.copy(f.parent.worldToLocal(fin)); f.parent.getWorldQuaternion(_q).invert(); f.quaternion.copy(_q.multiply(qPie[s]));
    }
    // Cadera a la altura del asiento (0,48 m) y pies en el suelo como mínimo
    p.obj.updateMatrixWorld(true); const cad = (B.Hips || B.UpperLegL).getWorldPosition(_v).y, pie = Math.min(B.FootL.getWorldPosition(_w).y, B.FootR.getWorldPosition(_w).y);
    p.obj.position.y = Math.max((p.asiento || 0.48) - cad, -pie);
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
    if (p.actual === nombre) return;
    if (nombre === 'sit') {
      // Postura sentada fija: primer fotograma de estar de pie, se doblan las piernas una vez y el mezclador se detiene
      p.mixer.stopAllAction(); const a = p.acc.idle; a.reset().play(); p.mixer.update(0); a.stop();
      p.obj.position.y = 0; sentar(p); p.sentado = true; p.accion = null; p.actual = nombre; return;
    }
    if (p.sentado) { p.sentado = false; p.obj.position.y = 0; }
    const a = p.acc[nombre] || p.acc.idle; if (!a) return;
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
    const ok = irA(n, q[0], q[1], () => { n.obj.rotation.y = q[3] * Math.PI / 180; n.asiento = q[4] || 0.48; n.actual = null; anim(n, q[2]); n.espera = 6 + n.r() * 12; });
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
      else if (tipo === 'banco') { B(0.4, 0.12, 1.3, clubM, 0, 0.42, 0.1); B(0.08, 0.38, 0.08, metal, 0, 0.19, 0.6); B(0.08, 0.38, 0.08, metal, 0, 0.19, -0.4); B(0.06, 1.15, 0.06, metal, -0.42, 0.57, -0.55); B(0.06, 1.15, 0.06, metal, 0.42, 0.57, -0.55); const barra = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.7, 8), metal); barra.rotation.z = Math.PI / 2; barra.position.set(0, 1.12, -0.55); g.add(barra); for (const sx of [-0.7, 0.7]) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 16), negro); d.rotation.z = Math.PI / 2; d.position.set(sx, 1.12, -0.55); g.add(d); } G.bloquea(x - 0.5, z - 0.7, x + 0.5, z + 0.8); }
      g.position.set(x, 0, z); g.rotation.y = ry * Math.PI / 180; W.add(g);
    });
    // Muebles de Kenney
    const ms = await Promise.all(P.muebles.map(m => mueble(m[0]).catch(() => null)));
    P.muebles.forEach((m, i) => {
      const o = ms[i]; if (!o) return; o.position.set(m[1], 0, m[2]); o.rotation.y = m[3] * Math.PI / 180; o.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } }); W.add(o);
      const t = o.tam, e = P.ESCALA_MUEBLES, giro = Math.abs(Math.sin(o.rotation.y)) > 0.5, w = (giro ? t.z : t.x) * e, d = (giro ? t.x : t.z) * e;
      if (!/^rug|^books|^computer|^laptop|^kitchenCoffee/.test(m[0])) G.bloquea(m[1] - w / 2 + 0.1, m[2] - d / 2 + 0.1, m[1] + w / 2 - 0.1, m[2] + d / 2 - 0.1);
    });
    decorar(W, club, G, segs, st);
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
  // ---------- Decoración: lo que da vida a cada sala ----------
  function decorar(W, club, G, segs, st) {
    const c1 = club.colores[0], c2 = club.colores[1] || '#ffffff', oscuro = c1 === '#000000' ? '#222222' : c1;
    const M = {}; const mat = (hex, o) => { const k = hex + JSON.stringify(o || {}); return M[k] || (M[k] = new THREE.MeshStandardMaterial(Object.assign({ color: hex, roughness: 0.7 }, o || {}))); };
    const caja = (w, h, d, m, x, y, z, ry) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof m === 'string' ? mat(m) : m); me.position.set(x, y + h / 2, z); if (ry) me.rotation.y = ry; me.castShadow = true; me.receiveShadow = true; W.add(me); return me; };
    const cil = (r, h, m, x, y, z, seg) => { const me = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg || 12), typeof m === 'string' ? mat(m) : m); me.position.set(x, y + h / 2, z); me.castShadow = true; W.add(me); return me; };
    const esfera = (r, m, x, y, z) => { const me = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), typeof m === 'string' ? mat(m) : m); me.position.set(x, y, z); me.castShadow = true; W.add(me); return me; };
    // Cuadros y carteles en las paredes (la cara mira hacia ry)
    const cuadro = (w, h, tex, x, y, z, ry, marco) => { const g = new THREE.Group(); if (marco) { const mq = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, h + 0.12, 0.04), mat(marco)); g.add(mq); } const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), tex ? new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }) : mat('#cccccc')); p.position.z = 0.025; g.add(p); g.position.set(x, y, z); g.rotation.y = ry; W.add(g); return g; };
    const lienzo = (clave, w, h, dib) => textura(clave, 512, (x, n) => { x.save(); x.scale(n / w, n / h); dib(x, w, h); x.restore(); });
    // Texturas propias del club
    const tCartel = lienzo('cartel-' + club.siglas, 300, 420, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, oscuro); g.addColorStop(1, '#111'); x.fillStyle = g; x.fillRect(0, 0, w, h); x.fillStyle = c2 === '#ffffff' ? '#fff' : c2; x.font = 'bold 34px sans-serif'; x.textAlign = 'center'; x.fillText('TEMPORADA', w / 2, 70); x.fillText('2026-27', w / 2, 110); x.font = 'bold 120px sans-serif'; x.fillText(club.siglas, w / 2, 280); x.font = '24px sans-serif'; x.fillText(club.nombre.toUpperCase().slice(0, 18), w / 2, 360); });
    const tAficion = lienzo('aficion-' + club.siglas, 300, 420, (x, w, h) => { x.fillStyle = '#f4f1e8'; x.fillRect(0, 0, w, h); x.fillStyle = oscuro; x.fillRect(0, 0, w, 120); x.fillStyle = '#fff'; x.font = 'bold 40px sans-serif'; x.textAlign = 'center'; x.fillText('SOMOS', w / 2, 75); x.fillStyle = oscuro; x.font = 'bold 54px sans-serif'; x.fillText(club.siglas, w / 2, 230); x.font = '22px sans-serif'; x.fillText('Abonos 2026-27', w / 2, 320); x.fillText('a la venta en recepción', w / 2, 352); });
    const tTablon = lienzo('tablon', 400, 280, (x, w, h) => { x.fillStyle = '#b98a55'; x.fillRect(0, 0, w, h); const r = rnd(9); for (let i = 0; i < 7; i++) { x.save(); x.translate(30 + (i % 4) * 92, 30 + Math.floor(i / 4) * 120); x.rotate((r() - 0.5) * 0.15); x.fillStyle = ['#fbf8f1', '#fff4a8', '#cfe8ff'][i % 3]; x.fillRect(0, 0, 78, 96); x.fillStyle = 'rgba(0,0,0,.35)'; for (let k = 0; k < 6; k++) x.fillRect(8, 16 + k * 12, 40 + r() * 22, 3); x.fillStyle = '#c8402f'; x.beginPath(); x.arc(39, 6, 5, 0, 6.3); x.fill(); x.restore(); } });
    const tMarcador = lienzo('marcador-' + club.siglas, 480, 160, (x, w, h) => { x.fillStyle = '#111'; x.fillRect(0, 0, w, h); x.fillStyle = '#ffb81c'; x.font = 'bold 72px monospace'; x.textAlign = 'center'; x.fillText('00', 110, 110); x.fillText('00', 370, 110); x.fillStyle = '#ff4a3a'; x.font = 'bold 44px monospace'; x.fillText('24', 240, 70); x.fillStyle = '#ddd'; x.font = 'bold 26px sans-serif'; x.fillText(club.siglas, 110, 40); x.fillText('INVIT.', 370, 40); x.fillText('10:00', 240, 130); });
    const tMenu = lienzo('menu', 360, 260, (x, w, h) => { x.fillStyle = '#20302a'; x.fillRect(0, 0, w, h); x.fillStyle = '#f4f1e8'; x.font = 'bold 30px sans-serif'; x.textAlign = 'center'; x.fillText('MENÚ DEL DÍA', w / 2, 46); x.font = '22px sans-serif'; ['Crema de calabaza', 'Pasta con pollo', 'Fruta o yogur', 'Café: 1,20 €'].forEach((t, i) => x.fillText(t, w / 2, 100 + i * 38)); });
    const tEscudo = lienzo('escudo-' + club.siglas, 400, 460, (x, w, h) => { x.clearRect(0, 0, w, h); x.beginPath(); x.moveTo(20, 20); x.lineTo(w - 20, 20); x.lineTo(w - 20, 250); x.quadraticCurveTo(w - 20, 400, w / 2, h - 20); x.quadraticCurveTo(20, 400, 20, 250); x.closePath(); x.fillStyle = oscuro; x.fill(); x.lineWidth = 14; x.strokeStyle = c2; x.stroke(); x.save(); x.clip(); x.fillStyle = c2; x.beginPath(); x.moveTo(w / 2, 20); x.lineTo(w - 20, 20); x.lineTo(w - 20, 250); x.lineTo(w / 2, h); x.fill(); x.restore(); x.fillStyle = '#fff'; x.strokeStyle = '#111'; x.lineWidth = 6; x.font = 'bold 110px sans-serif'; x.textAlign = 'center'; x.strokeText(club.siglas, w / 2, 230); x.fillText(club.siglas, w / 2, 230); });
    const tCamiseta = lienzo('camiseta-' + club.siglas, 300, 340, (x, w, h) => { x.fillStyle = '#f2efe8'; x.fillRect(0, 0, w, h); x.fillStyle = oscuro; x.beginPath(); x.moveTo(70, 40); x.lineTo(110, 30); x.quadraticCurveTo(150, 60, 190, 30); x.lineTo(230, 40); x.lineTo(230, 300); x.lineTo(70, 300); x.closePath(); x.fill(); x.fillStyle = c2; x.fillRect(70, 40, 18, 260); x.fillRect(212, 40, 18, 260); x.fillStyle = '#fff'; x.font = 'bold 90px sans-serif'; x.textAlign = 'center'; x.fillText(String(4 + U.hash(club.id) % 20), 150, 200); });
    // Sombras de contacto al pie de los muros (degradado en el suelo): dan profundidad a las salas
    const tSombra = textura('sombra-muro', 64, (x, n) => { const g = x.createLinearGradient(0, 0, 0, n); g.addColorStop(0, 'rgba(0,0,0,0.42)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, n, n); });
    const mSombra = new THREE.MeshBasicMaterial({ map: tSombra, transparent: true, depthWrite: false });
    segs.forEach(([x, z, vertical]) => { for (const sgn of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.55).rotateX(-Math.PI / 2), mSombra); if (vertical) { p.rotation.y = sgn > 0 ? -Math.PI / 2 : Math.PI / 2; p.position.set(x + sgn * 0.37, 0.012, z); } else { p.rotation.y = sgn > 0 ? Math.PI : 0; p.position.set(x, 0.012, z + sgn * 0.37); } p.renderOrder = 1; W.add(p); } });
    // Charcos de luz (luz cálida de lámparas y focos, en aditivo)
    const tLuz = textura('charco-luz', 128, (x, n) => { const g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); g.addColorStop(0, 'rgba(255,236,200,0.34)'); g.addColorStop(1, 'rgba(255,236,200,0)'); x.fillStyle = g; x.fillRect(0, 0, n, n); });
    const mLuz = new THREE.MeshBasicMaterial({ map: tLuz, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    [[-14, -9, 7], [-4, -3, 7], [6.5, -8, 6], [15.5, -2, 5], [15.5, -10, 5], [-14, 10, 6], [-3, 9.5, 6], [6, 9.5, 5], [15, 10.5, 5], [-12, 3.5, 4], [0, 3.5, 4], [12, 3.5, 4]].forEach(([x, z, r]) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(r, r).rotateX(-Math.PI / 2), mLuz); p.position.set(x, 0.015, z); p.renderOrder = 2; W.add(p); });
    // Pasillo: carteles y tablón
    [[-17, 2.12, 0, tCartel], [-12.5, 2.12, 0, tAficion], [-4, 2.12, 0, tCartel], [1, 2.12, 0, tAficion], [9, 2.12, 0, tCartel], [18.2, 2.12, 0, tAficion]].forEach(([x, z, ry, t]) => cuadro(0.75, 1.0, t, x, 0.62, z + 0.0, ry, '#2a2a2a'));
    cuadro(1.6, 1.1, tTablon, -6.6, 0.62, 4.88, Math.PI, '#6b4b2e'); cuadro(0.75, 1.0, tCartel, 10.4, 0.62, 4.88, Math.PI, '#2a2a2a'); cuadro(0.75, 1.0, tAficion, 16.6, 0.62, 4.88, Math.PI, '#2a2a2a');
    // Pista: marcador, carros de balones, conos y botellas
    cuadro(3.2, 1.05, tMarcador, -9, 0.62, -13.88, 0, '#333');
    const naranja = mat('#d9692b', { roughness: 0.8 });
    for (const xr of [-19.2, 1.2]) { caja(0.5, 0.06, 1.1, '#333a40', xr, 0.35, -2.2); caja(0.05, 0.5, 1.1, '#333a40', xr - 0.22, 0, -2.2); caja(0.05, 0.5, 1.1, '#333a40', xr + 0.22, 0, -2.2); for (let i = 0; i < 6; i++) esfera(0.12, naranja, xr + ((i % 2) - 0.5) * 0.24, 0.55, -2.6 + Math.floor(i / 2) * 0.38); }
    [[-12, -9], [-11, -9.6], [-10, -9], [-9, -9.6], [-8, -9]].forEach(([x, z]) => { const c = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 10), mat('#ff7a1a')); c.position.set(x, 0.14, z); W.add(c); });
    for (let i = 0; i < 6; i++) { cil(0.04, 0.22, mat(i % 2 ? oscuro : '#e8eef2'), -15.9 + i * 0.7, 0, 0.75); cil(0.04, 0.22, mat(i % 2 ? oscuro : '#e8eef2'), -5.9 + i * 0.7, 0, 0.75); }
    // Gimnasio: espejo, franja del club, mancuernas y kettlebells
    caja(6.5, 1.0, 0.04, mat('#c8dbe6', { metalness: 0.9, roughness: 0.08 }), 6.5, 0.1, -13.86); caja(8.6, 0.12, 0.03, oscuro, 6.5, 1.0, -13.85);
    caja(1.4, 0.06, 0.4, '#333a40', 3.2, 0.5, -9.5, Math.PI / 2); for (let i = 0; i < 5; i++) { const y = 0.6, z = -10.1 + i * 0.3; cil(0.06, 0.08, mat('#1d2024'), 3.1, y, z); cil(0.06, 0.08, mat('#1d2024'), 3.35, y, z); caja(0.25, 0.03, 0.03, '#888', 3.22, y + 0.03, z); }
    for (let i = 0; i < 4; i++) { esfera(0.11, mat('#1d2024'), 8.6 + i * 0.32, 0.11, -0.8); }
    // Vestuario: escudo pintado en el suelo y toallas en los bancos
    if (tEscudo) { const e = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.8).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tEscudo, transparent: true, roughness: 0.6 })); e.position.set(15.5, 0.013, -2); W.add(e); }
    [[13.2, -3], [15.9, -3], [17.2, -1], [13.8, -1]].forEach(([x, z], i) => caja(0.35, 0.05, 0.25, i % 2 ? oscuro : '#f2f2f2', x, 0.47, z));
    // Enfermería: bañeras de hielo y armario de vendas
    for (const x of [18.6, 17.2]) { cil(0.55, 0.7, mat('#c9d3d6', { metalness: 0.5, roughness: 0.3 }), x, 0, -10.6, 20); cil(0.5, 0.02, mat('#7fc6e8', { roughness: 0.1 }), x, 0.66, -10.6, 20); }
    // Sala de prensa: micrófonos, cámaras en trípode y focos
    for (const x of [-14.8, -14, -13.2]) { cil(0.012, 0.25, '#222', x, 0.66, 12.2); esfera(0.035, mat('#222'), x, 0.93, 12.15); }
    for (const x of [-17.5, -10.5]) { const g = new THREE.Group(); for (let k = 0; k < 3; k++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.3), mat('#222')); const a = k * 2.1; l.position.set(Math.cos(a) * 0.2, 0.62, Math.sin(a) * 0.2); l.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3); g.add(l); } const cam = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.5), mat('#1a1a1a')); cam.position.y = 1.35; g.add(cam); g.position.set(x, 0, 5.8); g.lookAt(-14, 0, 12.4); W.add(g); }
    for (const x of [-18.6, -9.4]) { cil(0.02, 1.9, '#333', x, 0, 13.2); const f = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, 0.25, 12), mat('#222')); f.position.set(x, 1.95, 13.1); f.rotation.x = 0.6; W.add(f); }
    // Cafetería: pizarra del menú y tazas
    cuadro(1.8, 1.3, tMenu, -6.6, 0.65, 5.12, 0, '#6b4b2e');
    [[-6, 8.6], [-2.6, 8.6], [-5.9, 8.7], [0, 11.5]].forEach(([x, z]) => cil(0.05, 0.08, mat('#f4f1e8'), x + 0.15, 0.62, z));
    // Despacho: camiseta enmarcada, bandera y portátil
    cuadro(1.0, 1.15, tCamiseta, 16, 0.65, 13.88, Math.PI, '#3a2a1a');
    cil(0.025, 2.2, '#bfa36a', 19.4, 0, 12.6); { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshStandardMaterial({ color: c1, side: THREE.DoubleSide })); b.position.set(19.4, 1.9, 12.15); b.rotation.y = Math.PI / 2; W.add(b); }
    // Recepción: gran escudo del club y camisetas enmarcadas
    if (tEscudo) { const e = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.75), new THREE.MeshStandardMaterial({ map: tEscudo, transparent: true })); e.position.set(2.13, 1.0, 11.6); e.rotation.y = Math.PI / 2; W.add(e); }
    cuadro(0.8, 0.95, tCamiseta, 2.13, 0.62, 9.6, Math.PI / 2, '#3a2a1a');
    // Exterior: acera, marquesina de la entrada, mástiles con banderas y árboles
    const acera = new THREE.Mesh(new THREE.PlaneGeometry(46, 34).rotateX(-Math.PI / 2), mat('#a7a39b', { roughness: 0.95 })); acera.position.set(0, -0.005, 0); acera.receiveShadow = true; W.add(acera);
    caja(3.0, 0.08, 1.1, oscuro, 6, 2.6, 14.9); cil(0.05, 2.4, '#555', 4.6, 0, 16.2); cil(0.05, 2.4, '#555', 7.4, 0, 16.2);
    [[2.5, 0], [4, 1], [8, 0], [9.5, 1]].forEach(([x, k]) => { cil(0.04, 4.2, '#d7d7d7', x, 0, 16.6); const b = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7), new THREE.MeshStandardMaterial({ color: k ? c2 : c1, side: THREE.DoubleSide })); b.position.set(x + 0.58, 3.8, 16.6); W.add(b); });
    const tronco = mat('#6b5136'), copa = mat('#4f7f3a', { roughness: 0.9 });
    [[-22, -12], [-22, -2], [-22, 8], [22, -12], [22, 0], [22, 10], [-14, 17.5], [-4, 17.5], [14, 17.5], [-12, -16.5], [0, -16.5], [12, -16.5]].forEach(([x, z], i) => { cil(0.12, 1.4, tronco, x, 0, z, 6); const c = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1 + (i % 3) * 0.2, 1), copa); c.position.set(x, 2.1, z); c.castShadow = true; W.add(c); });
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
      h('button', { class: 'btn peq', onclick: () => avanzar(() => GM.ui.jugarUnDia()) }, 'Avanzar un día'));
    S.panel = h('div', { class: 'sede-hud sede-sala', style: { display: 'none' } });
    S.ficha = h('div', { class: 'sede-hud sede-ficha', style: { display: 'none' } });
    const ayuda = h('div', { class: 'sede-hud sede-ayuda' }, 'Toca el suelo para caminar o usa WASD (Mayúsculas para correr). Rueda para acercar, Q para girar. Pisa el círculo de una sala para ver qué puedes hacer y toca a un jugador para hablar con él.');
    S.raiz.append(top, S.panel, S.ficha, ayuda);
  }
  // ---------- Paneles de sala (menús dentro del mundo) ----------
  const destino = sala => { const d = sala.destino.todos || sala.destino[S.st.modo]; return d && GM.ui.screens[d] ? d : null; };
  function mostrarAviso(zona) {
    if (!zona) { if (S.zonaActual) { S.zonaActual = null; if (!S.panelFijo) S.panel.style.display = 'none'; } return; }
    if (S.zonaActual === zona) return; S.zonaActual = zona; S.panelFijo = false; abrirSala(zona.sala);
  }
  function abrirSala(sala, panelId) {
    const h = GM.h, st = S.st, A = GM.mods.sedeAcciones, P = S.panel; P.innerHTML = ''; P.className = 'sede-hud sede-sala tema-' + (panelId || sala.id); P.style.display = 'flex';
    P.append(h('div', { class: 'sp-cab' }, panelId ? h('button', { class: 'sp-volver', onclick: () => abrirSala(sala) }, '‹') : null, h('b', null, panelId ? (A.acciones(st, sala.id).find(x => x.id === panelId) || {}).t || sala.nombre : sala.nombre), h('button', { class: 'sp-x', 'aria-label': 'Cerrar', onclick: () => { P.style.display = 'none'; } }, '×')));
    const cuerpo = h('div', { class: 'sp-cuerpo' }); P.append(cuerpo);
    if (panelId) pintarPanel(panelId, cuerpo, sala);
    else {
      if (!A) cuerpo.append(h('p', null, sala.accion));
      else A.acciones(st, sala.id).forEach(x => cuerpo.append(h('button', { class: 'sp-accion' + (x.panel ? ' abre' : ''), disabled: !x.disponible, onclick: () => x.panel ? abrirSala(sala, x.id) : ejecutar(x.id, sala) }, h('b', null, x.t), h('span', null, x.disponible ? x.d : x.motivo))));
    }
    const d = destino(sala); if (d) P.append(h('button', { class: 'sp-link', onclick: () => entrarClasica(d) }, 'Abrir la pantalla completa'));
  }
  function refrescarSala() { if (S.zonaActual && S.panel.style.display !== 'none' && !/tema-(rueda|ordenador|pizarra|lesionados|plantilla|partido)/.test(S.panel.className)) abrirSala(S.zonaActual.sala); }
  function ejecutar(id, sala) {
    const r = GM.mods.sedeAcciones.hacer(S.st, id); GM.ui.toast(r.ok ? r.texto : r.motivo);
    if (r.ok) reaccion(r.texto, sala); abrirSala(sala);
  }
  // Reacción de los jugadores: saludan y les sale el efecto flotando sobre la cabeza
  function reaccion(texto, sala) {
    const m = /([a-zá-úñ]+) ([+−-]\d+)/i.exec(texto || ''), etq = m ? m[2] + ' ' + m[1] : '✓';
    S.gente.filter(n => !n.fijo).forEach((n, i) => { setTimeout(() => { if (!S) return; flotar(etq, n.obj, /[−-]/.test(etq) ? '#ffb4a8' : '#b8f5c8'); if (!n.camino || !n.camino.length) { anim(n, 'emote-yes'); n.espera = 3; } }, i * 60); });
  }
  function flotar(txt, obj, color) {
    const el = GM.h('div', { class: 'sede-flota', style: { color } }, txt); S.raiz.append(el);
    S.flotantes.push({ el, obj, t: 0 });
  }
  function moverFlotantes(dt) {
    const r = S.renderer.domElement.getBoundingClientRect(), v = new THREE.Vector3();
    S.flotantes = S.flotantes.filter(f => {
      f.t += dt; if (f.t > 1.8) { f.el.remove(); return false; }
      v.copy(f.obj.position); v.y += 2.2 + f.t * 0.6; v.project(S.camera);
      f.el.style.left = (v.x + 1) / 2 * r.width + 'px'; f.el.style.top = (1 - v.y) / 2 * r.height + 'px'; f.el.style.opacity = String(Math.min(1, 2.2 - f.t * 1.2)); return true;
    });
  }
  function pintarPanel(id, c, sala) {
    const h = GM.h, st = S.st, A = GM.mods.sedeAcciones, eq = st.equipos[st.clubId];
    if (id === 'plantilla') {
      const ps = eq.plantilla.map(i => st.jugadores[i]).filter(p => p && p.id !== 'yo').sort((a, b) => b.ovr - a.ovr);
      c.append(h('div', { class: 'sp-cartas' }, ps.map(p => h('div', { class: 'sp-carta' + (p.estado.lesion ? ' lesion' : '') }, h('b', null, p.nombre.split(' ').slice(-1)[0]), h('span', null, p.pos + ', ' + p.ovr), barra('Ánimo', p.estado.moral), barra('Forma', p.estado.forma), p.estado.lesion ? h('em', null, 'Lesionado, ' + p.estado.lesion.dias + ' d') : null))));
    } else if (id === 'pizarra') {
      const t = A.pizarra(st), opc = (campo, lista) => h('div', { class: 'sp-tiza' }, lista.map(([v, txt]) => h('button', { class: t[campo] === v ? 'on' : '', onclick: () => { const r = A.fijarTactica(st, campo, v); if (!r.ok) GM.ui.toast(r.motivo); abrirSala(sala, 'pizarra'); } }, txt)));
      c.append(h('p', { class: 'sp-tit' }, 'Ritmo'), opc('ritmo', [[2, 'Pausado'], [3, 'Normal'], [4, 'Rápido'], [5, 'A tope']]),
        h('p', { class: 'sp-tit' }, 'Defensa'), opc('defensa', [['hombre', 'Individual'], ['zona', 'Zona'], ['mixta', 'Mixta']]),
        h('p', { class: 'sp-tit' }, 'Ataque'), opc('foco', [['equilibrado', 'Equilibrado'], ['exterior', 'Tiro exterior'], ['interior', 'Juego interior']]),
        h('p', { class: 'sp-tit' }, 'Quinteto'), h('div', { class: 'sp-quinteto' }, t.quinteto.map(p => h('span', null, p.pos + ' ' + p.nombre.split(' ').slice(-1)[0]))));
    } else if (id === 'lesionados') {
      const ls = A.lesionados(st);
      if (!ls.length) c.append(h('p', null, 'Nadie en la camilla. El fisio aprovecha para ordenar el botiquín.'));
      ls.forEach(p => c.append(h('div', { class: 'sp-fila' }, h('div', null, h('b', null, p.nombre), h('span', null, p.estado.lesion.tipo + ', ' + p.estado.lesion.dias + ' días' + (p.estado.lesion.tratado ? ', en tratamiento intensivo' : ''))),
        p.estado.lesion.tratado ? null : h('button', { class: 'btn peq', onclick: () => { const r = A.tratar(st, p.id); GM.ui.toast(r.ok ? r.texto : r.motivo); abrirSala(sala, 'lesionados'); } }, 'Tratamiento intensivo, ' + U.eur(A.COSTE_TRAT)))));
    } else if (id === 'rueda') {
      const rp = A.ruedaPrensa(st);
      c.append(h('div', { class: 'sp-pregunta' }, h('span', null, 'Periodista'), rp.pregunta));
      rp.respuestas.forEach((t, i) => c.append(h('button', { class: 'sp-respuesta', onclick: () => { const r = A.responder(st, i); GM.ui.toast(r.ok ? r.texto : r.motivo); if (r.ok) reaccion(r.texto, sala); abrirSala(sala); } }, '«' + t + '»')));
    } else if (id === 'ordenador') {
      const o = A.ordenador(st);
      c.append(h('div', { class: 'sp-ventana' }, h('div', { class: 'sp-barra' }, 'Gestión deportiva, ' + eq.siglas),
        h('p', null, 'Caja ' + U.eur(o.caja) + ', masa salarial ' + U.eur(o.masa) + ' de ' + U.eur(o.tope)),
        h('p', { class: 'sp-tit' }, 'Agentes libres'), o.libres.map(x => h('div', { class: 'sp-fila' }, h('div', null, h('b', null, x.p.nombre + ' (' + x.p.ovr + ')'), h('span', null, x.p.pos + ', ' + x.p.edad + ' años, pide ' + U.eur(x.pide) + ' al año')), h('button', { class: 'btn peq', onclick: () => { const r = A.ofrecer(st, x.p.id); GM.ui.toast(r.ok ? '¡' + x.p.nombre + ' firma por 2 temporadas!' : r.motivo); if (r.ok) repoblar(); abrirSala(sala, 'ordenador'); } }, 'Ofrecer'))),
        h('p', { class: 'sp-tit' }, 'Contratos que acaban'), o.renov.length ? o.renov.map(x => h('div', { class: 'sp-fila' }, h('div', null, h('b', null, x.p.nombre + ' (' + x.p.ovr + ')'), h('span', null, 'Hasta ' + x.p.contrato.hasta + ', pide ' + U.eur(x.pide))), h('button', { class: 'btn peq', onclick: () => { const r = A.renovar(st, x.p.id); GM.ui.toast(r.ok ? x.p.nombre + ' renueva' : r.motivo); abrirSala(sala, 'ordenador'); } }, 'Renovar'))) : h('p', null, 'Ninguno este año.')));
    } else if (id === 'partido') {
      const C = GM.mods.competiciones, g = C.proximoPartido(st, st.clubId);
      if (!g) c.append(h('p', null, 'No quedan partidos esta temporada.'));
      else { const L = st.equipos[g.local], V = st.equipos[g.visitante]; c.append(h('div', { class: 'sp-ticket' }, h('span', null, U.fechaLarga(g.fecha) + (g.fecha === st.fecha ? ', hoy' : '')), h('b', null, L.siglas + '  vs  ' + V.siglas), h('span', null, L.nombre + ' contra ' + V.nombre), h('span', null, g.local === st.clubId ? 'En casa, ' + L.pabellon.nombre : 'Fuera, ' + L.pabellon.nombre))); }
      c.append(h('div', { class: 'sp-botones' }, h('button', { class: 'btn', onclick: () => { avanzar(() => GM.ui.jugarUnDia()); } }, g && g.fecha === st.fecha ? 'Jugar el partido' : 'Avanzar un día'), h('button', { class: 'btn btn-sec', onclick: () => avanzar(() => GM.ui.hastaPartido()) }, 'Hasta el partido')));
    }
  }
  const barra = (t, v) => GM.h('div', { class: 'sp-barra-mini' }, GM.h('span', null, t), GM.h('i', null, GM.h('u', { style: { width: Math.round(v) + '%' } })));
  function avanzar(fn) { fn(); setTimeout(() => { if (!S) return; hud(S.st); repoblar(); if (S.zonaActual) abrirSala(S.zonaActual.sala, 'partido'); }, 80); }
  function entrarClasica(d) {
    S.raiz.style.display = 'none'; S.pausa = true; GM.ui.navegar(d);
    if (!S.volverBtn) { S.volverBtn = GM.h('button', { class: 'btn sede-volver', onclick: volver }, 'Volver a la sede'); document.body.append(S.volverBtn); }
    S.volverBtn.style.display = 'block';
  }
  function entrar(sala) { S.panelFijo = true; abrirSala(sala); }
  function volver() { if (!S) return; S.raiz.style.display = ''; S.pausa = false; if (S.volverBtn) S.volverBtn.style.display = 'none'; repoblar(); S.reloj.update(); if (S.zonaActual) abrirSala(S.zonaActual.sala); }
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
    const club = st.equipos[st.clubId], c1 = club.colores[0], c2 = club.colores[1] || '#222222';
    const nuevos = await Promise.all(ids.map(id => { const j = st.jugadores[id], h = U.hash(id), oscura = /US|SN|NG|CM|ML|CD|SS|AO|FR|DO|BR|GB/.test(j.nac || '') && h % 3 !== 0; return personaje({ modelo: PERSONAS.jugador[h % 3], altura: j.altura || 198, piel: PIEL[oscura ? 3 + (h >>> 3) % 3 : (h >>> 3) % 3], pelo: PELO[(h >>> 6) % 5], ropa: [c1, c2] }); }));
    nuevos.forEach((n, k) => {
      Object.assign(n, { jugador: ids[k], r: rnd(U.hash(ids[k] + st.fecha)), espera: 0 });
      const z = P.puntos.pasillo[k % P.puntos.pasillo.length]; n.obj.position.set(z[0] + (r() - 0.5) * 2, 0, z[1] + (r() - 0.5) * 0.8); n.obj.userData = { npc: k }; S.mundo.add(n.obj); anim(n, 'idle'); S.gente.push(n);
    });
    const per = await Promise.all(P.personal.map((q, k) => { const h = U.hash(q[0] + st.clubId); return personaje({ modelo: PERSONAS[q[0]] || 'm-casual', altura: 165 + h % 20, piel: PIEL[h % 4], pelo: PELO[(h >>> 4) % 6], ropa: q[0] === 'Preparador físico' ? [c1, c2] : null }); }));
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
    S = { st, raiz, renderer, scene, camera, gente: [], ocupados: new Set(), flotantes: [], reloj: new THREE.Timer(), yaw: 0, yawObj: 0, zoom: 22, foco: new THREE.Vector3(6, 0, 10), teclas: {}, vivo: true };
    hud(st);
    const tam = () => { const w = lienzo.clientWidth || window.innerWidth, hh = lienzo.clientHeight || window.innerHeight; renderer.setSize(w, hh); camera.aspect = w / hh; camera.updateProjectionMatrix(); };
    tam(); S.onResize = tam; window.addEventListener('resize', tam);
    const cargando = h('div', { class: 'sede-hud sede-cargando' }, 'Abriendo la sede del club…'); raiz.append(cargando);
    construir(st).then(async () => {
      const pj = st.personaje || {}, OPC = GM.mods.personaje && GM.mods.personaje.OPC, club = st.equipos[st.clubId];
      const yo = await personaje({ modelo: st.modo === 'carrera' || st.modo === 'entrenador' ? 'h-casual_hoodie' : 'h-suit', altura: st.modo === 'carrera' && st.jugadores.yo ? st.jugadores.yo.altura : 180, piel: OPC && OPC.piel[pj.piel], pelo: OPC && OPC.peloColor[pj.peloColor], ropa: st.modo === 'carrera' || st.modo === 'entrenador' ? [club.colores[0], club.colores[1] || '#222'] : null }); yo.obj.position.set(GM.sedePlano.entrada.x, 0, 12.5); yo.obj.rotation.y = Math.PI; S.yo = yo; anim(yo, 'idle'); S.mundo.add(yo.obj);
      const marca = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.45, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd54a })); marca.position.y = 0.02; yo.obj.add(marca); marca.scale.setScalar(1 / yo.obj.scale.x);
      await poblar(st); cargando.remove();
    }).catch(e => { cargando.textContent = 'No se ha podido cargar la sede: ' + e.message; console.error(e); });
    controles(renderer.domElement);
    (function bucle() {
      if (!S || !S.vivo) return; S.raf = requestAnimationFrame(bucle); if (S.pausa) return;
      S.reloj.update(); const dt = Math.min(0.05, S.reloj.getDelta()), t = S.reloj.getElapsed();
      if (S.yo) { teclado(dt); moverPaso(S.yo, dt); if (!S.yo.sentado) S.yo.mixer.update(dt); S.foco.lerp(S.yo.obj.position, Math.min(1, dt * 4)); zonaCercana(); }
      S.gente.forEach(n => { if (!n.fijo) { if (n.camino && n.camino.length) moverPaso(n, dt); else if ((n.espera -= dt) <= 0) siguienteActividad(n); } if (!n.sentado) n.mixer.update(dt); });
      if (S.zonas) S.zonas.forEach(z => z.obj.userData.anim(t));
      if (S.flotantes.length) moverFlotantes(dt);
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
  GM.sede = { abrir, cerrar, volver, activa: () => !!S, _estado: () => S, _anim: (p, n) => anim(p, n), _personaje: o => personaje(o), aEstrella, rejilla };
})();
