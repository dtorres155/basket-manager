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
  let _mSombra = null;
  async function personaje(o) {
    const [g, an] = await Promise.all([cargar('modelos/personas/' + o.modelo + '.glb'), cargar('modelos/personas/animaciones.glb')]);
    const obj = THREE.clonarEsqueleto(g.scene); if (!g.altoBase) g.altoBase = new THREE.Box3().setFromObject(g.scene).getSize(new THREE.Vector3()).y;
    obj.scale.setScalar((o.altura || 178) / 100 / g.altoBase);
    // Rendimiento: todas las piezas (piel, pelo, ropa, ojos...) se funden en UNA malla con el color en los vértices.
    // Antes eran ~11 mallas por persona (y el doble con sombras). Se guardan los tramos de ropa para los petos.
    const color = n => { const nm = n.material.name || ''; if (o.piel && /^Skin/.test(nm)) return o.piel; if (o.pelo && /Hair|Eyebrows|Moustache/.test(nm)) return o.pelo; if (o.ropa && /^(Purple|Red_Dark|LightBrown)$/.test(nm)) return o.ropa[0]; if (o.ropa && /^(LightBlue)$/.test(nm)) return o.ropa[1]; return '#' + n.material.color.getHexString(); };
    const piezas = []; obj.traverse(n => { if (n.isSkinnedMesh) piezas.push(n); });
    const pies = new Set(); if (o.zapas && piezas[0]) piezas[0].skeleton.bones.forEach((b, i) => { if (/^(Foot|PT)/.test(b.name)) pies.add(i); });
    const ccZ = new THREE.Color(o.zapas || '#ffffff');
    let rangosRopa = [];
    try {
      const geos = [], cc = new THREE.Color(); let base = 0;
      piezas.forEach(n => {
        if (o.sinPelo && /^Hair/.test(n.material.name || '')) { n.visible = false; return; }
        let g0 = n.geometry.index ? n.geometry.toNonIndexed() : n.geometry.clone(); const cnt = g0.attributes.position.count, g1 = new THREE.BufferGeometry();
        g1.setAttribute('position', g0.attributes.position); g1.setAttribute('normal', g0.attributes.normal);
        const si = g0.attributes.skinIndex, sw = g0.attributes.skinWeight, si2 = new Uint16Array(cnt * 4), sw2 = new Float32Array(cnt * 4);
        for (let i = 0; i < cnt; i++) for (let k = 0; k < 4; k++) { si2[i * 4 + k] = si.getComponent(i, k); sw2[i * 4 + k] = sw.getComponent(i, k); }
        g1.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si2, 4)); g1.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw2, 4));
        cc.set(color(n)); const cols = new Float32Array(cnt * 3), zap = pies.size && !/^Skin/.test(n.material.name || '');
        for (let i = 0; i < cnt; i++) { let c = cc; if (zap) { let mx = 0, hb = -1; for (let k = 0; k < 4; k++) if (sw2[i * 4 + k] > mx) { mx = sw2[i * 4 + k]; hb = si2[i * 4 + k]; } if (pies.has(hb) && mx > 0.5) c = ccZ; } cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b; }
        g1.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
        if (/^(Purple|Red_Dark|LightBrown)$/.test(n.material.name || '')) rangosRopa.push([base, cnt]);
        base += cnt; geos.push(g1);
      });
      const fundida = THREE.mergeGeometries(geos); if (!fundida) throw new Error('no fusiona');
      const m0 = piezas[0], malla = new THREE.SkinnedMesh(fundida, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }));
      malla.bind(m0.skeleton, m0.bindMatrix); malla.castShadow = true; malla.frustumCulled = false; malla.name = 'persona';
      m0.parent.add(malla); piezas.forEach(n => n.parent && n.parent.remove(n));
    } catch (e) { // si algo falla, se queda como antes (piezas separadas)
      rangosRopa = null;
      const tinta = (m, hex) => { const c = m.clone(); c.color.set(hex); return c; };
      piezas.forEach(n => { n.castShadow = true; n.frustumCulled = false; n.material = tinta(n.material, color(n)); });
    }
    const mixer = new THREE.AnimationMixer(obj), acc = {};
    Object.keys(ANIM).forEach(k => { const c = an.animations.find(a => a.name === ANIM[k]); if (c) acc[k] = mixer.clipAction(c); });
    const B = {}; obj.traverse(n => { if (n.isBone) B[n.name] = n; });
    if (GM.campus && GM.campus.config.calidad !== 'alta') { // sombra pintada bajo los pies
      if (!_mSombra) { const t = textura('sombra-pies', 64, (x, n) => { const g2 = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); g2.addColorStop(0, 'rgba(0,0,0,0.45)'); g2.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g2; x.fillRect(0, 0, n, n); }); _mSombra = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }); }
      const sb = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9).rotateX(-Math.PI / 2), _mSombra); sb.position.y = 0.02 / obj.scale.x; sb.scale.setScalar(1 / obj.scale.x); sb.renderOrder = 1; obj.add(sb);
    }
    if (o.complexion !== undefined) { const k = [0.93, 1, 1.08][o.complexion] || 1; obj.scale.x *= k; obj.scale.z *= k; }
    if (o.cara && B.Head) { const e = [null, [1.07, 0.95, 1.04], [0.94, 1.07, 0.98], [1.09, 1.0, 1.03]][o.cara]; if (e) B.Head.scale.set(e[0], e[1], e[2]); }
    complementos(obj, B, o);
    return { obj, mixer, acc, huesos: B, altura: o.altura || 178, rangosRopa, ropa: o.ropa };
  }
  // Gafas, cinta, muñequeras, barba y tatuajes (geometría sencilla pegada a los huesos; medidas en metros)
  const _mats = {}; const matC = c => _mats[c] || (_mats[c] = new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 }));
  function complementos(obj, B, o) {
    const inv = 1 / obj.scale.y, pega = (hueso, malla, x, y, z) => { if (!hueso) return; malla.position.set(x * inv, y * inv, z * inv); malla.scale.setScalar(inv); hueso.add(malla); };
    if (o.gafas) { [-1, 1].forEach(sx => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.0045, 6, o.gafas === 1 ? 16 : 4), matC('#1d2630')); if (o.gafas === 2) m.rotation.z = Math.PI / 4; pega(B.Head, m, sx * 0.036, 0.108, 0.122); }); pega(B.Head, new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.005, 0.005), matC('#1d2630')), 0, 0.11, 0.124); }
    if (o.cinta) { const m = new THREE.Mesh(new THREE.TorusGeometry(0.098, 0.013, 6, 24), matC(o.cinta)); m.rotation.x = Math.PI / 2; pega(B.Head, m, 0, 0.17, 0.01); }
    if (o.munequeras) ['WristL', 'WristR'].forEach(w => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.06, 10), matC(o.munequeras)); m.rotation.z = Math.PI / 2; pega(B[w], m, 0, 0, 0); });
    if (o.barba) { const t = [0, [0.03, 0.035, 0.02], [0.1, 0.05, 0.05], [0.11, 0.09, 0.06]][o.barba], m = new THREE.Mesh(new THREE.BoxGeometry(t[0], t[1], t[2]), matC(o.pelo || '#2a1f18')); pega(B.Head, m, 0, 0.035 - t[1] / 3, 0.085); }
    if (o.tatuaje) (o.tatuaje === 2 ? ['LowerArmL', 'LowerArmR'] : o.tatuaje === 1 ? ['LowerArmR'] : []).forEach(a => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.041, 0.07, 10, 1, true), new THREE.MeshStandardMaterial({ color: '#25303b', transparent: true, opacity: 0.55 })); pega(B[a], m, 0, 0.12, 0); });
    if (o.tatuaje === 3) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.03, 12, 1, true), new THREE.MeshStandardMaterial({ color: '#25303b', transparent: true, opacity: 0.5 })); pega(B.Neck, m, 0, 0.03, 0); }
  }
  // Opciones del modelo de tu personaje a partir de su aspecto (st.personaje) y del modo de juego
  function aspecto(st) {
    const pj = st.personaje || {}, OPC = GM.mods.personaje && GM.mods.personaje.OPC, club = st.equipos[st.clubId], jugador = st.modo === 'carrera' || st.modo === 'entrenador';
    const mujer = pj.cuerpo === 1 && st.modo !== 'carrera', ropa = pj.ropa || 0;
    const modelo = jugador ? (mujer ? 'm-casual' : 'h-casual_hoodie') : mujer ? ['m-suit', 'm-formal', 'm-casual', 'm-casual'][ropa] : ['h-suit', 'h-adventurer', 'h-casual_2', 'h-casual_hoodie'][ropa];
    const c1 = club.colores[0], c2 = club.colores[1] || '#ffffff', acc = pj.accesorio || 0;
    return { modelo, altura: st.modo === 'carrera' && st.jugadores.yo ? st.jugadores.yo.altura : (GM.mods.personaje.ALTURAS || [168, 180, 192])[pj.altura === undefined ? 1 : pj.altura] - (mujer ? 8 : 0),
      piel: OPC && OPC.piel[pj.piel], pelo: OPC && OPC.peloColor[pj.peloColor], sinPelo: pj.pelo === 0 || pj.pelo === 5,
      ropa: jugador || ropa === 3 ? [c1, c2 === c1 ? '#222' : c2] : null, complexion: pj.complexion, gafas: pj.gafas || 0, barba: mujer ? 0 : pj.barba || 0,
      cinta: acc === 1 || acc === 3 ? c2 : null, munequeras: acc === 2 || acc === 3 ? c1 : null, tatuaje: pj.tatuaje || 0, cara: pj.cara || 0,
      zapas: (GM.mods.personaje.ZAPAS || [])[pj.zapas || 0] || c1 };
  }
  // Persona real para las escenas antiguas (campus, mapa de la ciudad, casa): devuelve un grupo al momento, con la figura de cajas
  // si se pasa, y la sustituye por el modelo cuando carga. alto: altura en unidades de esa escena. El movimiento se pone en
  // userData.mover(t) (el grupo ya trae userData.anim, que mueve y anima). Con modelo cargado, userData.real = true (pies en y = 0).
  const MODELOS_GENTE = ['h-casual_2', 'm-casual', 'h-beach', 'm-formal', 'h-casual_hoodie', 'm-punk', 'h-farmer', 'm-adventurer'];
  function figura(o, alto, primitiva, vista) {
    const g = new THREE.Group(); if (primitiva) g.add(primitiva);
    const h = (o.semilla || 0) >>> 0, altura = o.altura || 165 + h % 30;
    let mixer = null, t0 = null;
    g.userData.anim = t => { if (g.userData.mover) g.userData.mover(t); if (mixer) { const dt = t0 === null ? 0 : Math.min(0.1, t - t0); t0 = t; mixer.update(dt); } };
    if (!THREE.GLTFLoader || !THREE.clonarEsqueleto || typeof fetch !== 'function') return g;
    personaje(Object.assign({}, o, { modelo: o.modelo || MODELOS_GENTE[h % MODELOS_GENTE.length], altura, piel: o.piel || PIEL[(h >>> 4) % PIEL.length], pelo: o.pelo || PELO[(h >>> 7) % PELO.length], ropa: o.ropa })).then(p => {
      p.obj.scale.multiplyScalar(alto / (altura / 100));
      while (g.children.length) g.remove(g.children[0]);
      g.add(p.obj); g.userData.real = true; if (o.suelo !== undefined) g.position.y = o.suelo;
      const a = p.acc[o.anim || (g.userData.mover ? 'walk' : 'idle')] || p.acc.idle; if (a) { a.play(); a.time = (h % 97) / 40; }
      p.mixer.update(0); mixer = p.mixer; if (vista) vista.need = true;
    }).catch(() => { });
    return g;
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
    const N = G.W * G.H, gS = new Float32Array(N).fill(Infinity), de = new Int32Array(N).fill(-1), cerrado = new Uint8Array(N);
    const h = (i, j) => Math.hypot(i - ti, j - tj), ini = G.idx(si, sj), fin = G.idx(ti, tj);
    // Lista abierta como montículo binario (antes se recorría entera en cada paso: con la ciudad grande era muy lento)
    const hf = [], hn = [];
    const meter = (f, n) => { let i = hf.length; hf.push(f); hn.push(n); while (i > 0) { const p = (i - 1) >> 1; if (hf[p] <= f) break; hf[i] = hf[p]; hn[i] = hn[p]; i = p; } hf[i] = f; hn[i] = n; };
    const sacar = () => { const n0 = hn[0], f = hf.pop(), n = hn.pop(); if (hf.length) { let i = 0; const L = hf.length; for (;;) { let c = 2 * i + 1; if (c >= L) break; if (c + 1 < L && hf[c + 1] < hf[c]) c++; if (hf[c] >= f) break; hf[i] = hf[c]; hn[i] = hn[c]; i = c; } hf[i] = f; hn[i] = n; } return n0; };
    const abierto = { push: ([f, n]) => meter(f, n), get length() { return hf.length; } };
    gS[ini] = 0; abierto.push([h(si, sj), ini]);
    const DIR = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    while (abierto.length) {
      const cur = sacar();
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
    const [tx, tz] = p.camino[0], o = p.obj.position, dx = tx - o.x, dz = tz - o.z, d = Math.hypot(dx, dz), v = (p.rapido ? 4.2 : p.cabizbajo ? 1.45 : 2.1) * dt;
    if (d < v) { o.x = tx; o.z = tz; p.camino.shift(); if (!p.camino.length) { anim(p, 'idle'); const f = p.alLlegar; p.alLlegar = null; if (f) f(); } return; }
    o.x += dx / d * v; o.z += dz / d * v; girar(p, Math.atan2(dx, dz), dt);
  }
  function girar(p, ang, dt) { let d = ang - p.obj.rotation.y; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; p.obj.rotation.y += d * Math.min(1, dt * 10); }

  // Rutina de cada jugador: elegir sala y sitio, ir, hacer la actividad un rato y repetir
  function siguienteActividad(n) {
    if (S.escena === 'calle') return GM.calle.siguiente(S, motor(), n);
    if (S.escena === 'interior') return GM.interiores ? GM.interiores.siguiente(S, motor(), n) : (n.espera = 99);
    if (S.escena === 'deportiva') return GM.deportivaMundo ? GM.deportivaMundo.siguiente(S, motor(), n) : (n.espera = 99);
    if (S.escena === 'pueblo') return GM.puebloMundo.siguiente(S, motor(), n);
    if (S.escena === 'casa') { n.espera = 99; return; }
    const P = GM.sedePlano, st = S.st, j = n.jugador && st.jugadores[n.jugador];
    let sala; if (j && j.estado && j.estado.lesion) sala = 'fisio';
    else if (n.cabizbajo) { const r = n.r(); sala = r < 0.4 ? 'solo' : r < 0.7 ? 'vestuario' : 'gimnasio'; }
    else {
      const r = n.r(), d = S.dia ? S.dia.tipo : 'normal';
      if (d === 'partido') sala = r < 0.35 ? 'pista' : r < 0.6 ? 'vestuario' : r < 0.75 ? 'charla' : r < 0.9 ? 'cafeteria' : 'pasillo';
      else if (d === 'derrota') sala = r < 0.35 ? 'pista' : r < 0.6 ? 'vestuario' : r < 0.8 ? 'gimnasio' : 'pasillo';
      else if (d === 'victoria') sala = r < 0.35 ? 'pista' : r < 0.5 ? 'gimnasio' : r < 0.72 ? 'charla' : r < 0.82 ? 'vestuario' : r < 0.95 ? 'cafeteria' : 'prensa';
      else sala = r < 0.42 ? 'pista' : r < 0.58 ? 'gimnasio' : r < 0.68 ? 'charla' : r < 0.78 ? 'vestuario' : r < 0.9 ? 'cafeteria' : r < 0.95 ? 'prensa' : 'pasillo';
      if (sala === 'pista' && grupoQuiere(n)) return;
      if (sala === 'pista' && d === 'partido') sala = 'tiro';
    }
    const lista = sala === 'tiro' ? P.puntos.pista.filter(q => q[2] === 'tiro') : sala === 'solo' ? P.puntos.solo : P.puntos[sala], libres = lista.filter(q => !S.ocupados.has(q)); const q = libres.length ? libres[(n.r() * libres.length) | 0] : lista[0];
    if (n.punto) S.ocupados.delete(n.punto); acabarTiro(n); n.punto = q; S.ocupados.add(q);
    const ok = irA(n, q[0], q[1], () => { n.obj.rotation.y = q[3] * Math.PI / 180; n.asiento = q[4] || 0.48; n.actual = null; if (q[2] === 'tiro') { anim(n, 'idle'); empezarTiro(n); n.espera = 16 + n.r() * 14; } else { anim(n, q[2] === 'charla' ? 'idle' : q[2]); n.espera = q[2] === 'charla' ? 14 + n.r() * 10 : 6 + n.r() * 12; } });
    if (!ok) n.espera = 2;
  }

  // ---------- Construcción de la escena ----------
  async function construir(st) {
    if (S.escena === 'calle') { S.redes = []; S.mundo = new THREE.Group(); S.scene.add(S.mundo); return GM.calle.construir(S, motor(), st); }
    if (S.escena === 'casa') { S.redes = []; S.mundo = new THREE.Group(); S.scene.add(S.mundo); return GM.casa.construir(S, motor(), st, S.escenaArg); }
    if (S.escena === 'interior' && GM.interiores) { S.redes = []; S.mundo = new THREE.Group(); S.scene.add(S.mundo); return GM.interiores.construir(S, motor(), st, S.escenaArg); }
    if (S.escena === 'deportiva' && GM.deportivaMundo) { S.redes = []; S.mundo = new THREE.Group(); S.scene.add(S.mundo); return GM.deportivaMundo.construir(S, motor(), st); }
    if (S.escena === 'pueblo') { S.redes = []; S.mundo = new THREE.Group(); S.scene.add(S.mundo); S.puertas = {}; return GM.puebloMundo.construir(S, motor(), st); }
    const P = GM.sedePlano, club = st.equipos[st.clubId], G = rejilla(P), W = new THREE.Group(); S.G = G; S.redes = []; S.mundo = W; S.scene.add(W);
    // Suelos: exterior, pasillo y salas
    W.add(plano(70, 50, new THREE.MeshStandardMaterial({ color: 0x6f8a5a, roughness: 1 }), 0, 0, -0.02, 4));
    const [px0, pz0, px1, pz1] = P.pasillo.rect; W.add(plano(px1 - px0, pz1 - pz0, sueloMat('hormigon'), (px0 + px1) / 2, (pz0 + pz1) / 2, 0));
    P.salas.forEach(s => { const [x0, z0, x1, z1] = s.rect; W.add(plano(x1 - x0, z1 - z0, sueloMat(s.suelo), (x0 + x1) / 2, (z0 + z1) / 2, 0.001)); });
    // Pista con las líneas y el escudo del club
    const tP = pistaTex(club); if (tP) { const m = new THREE.Mesh(new THREE.PlaneGeometry(20, 12).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tP, roughness: 0.45 })); tP.repeat.set(1, 0.6); tP.offset.set(0, 0.2); m.position.set(-9, 0.01, -6); m.receiveShadow = true; W.add(m); }
    for (const s of [-1, 1]) { const x = -9 + s * 9.6, g = new THREE.Group(); const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.05), new THREE.MeshStandardMaterial({ color: 0x333a40 })); poste.position.y = 1.52; g.add(poste); const tab = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.05, 1.8), new THREE.MeshStandardMaterial({ color: 0xf4f4f4 })); tab.position.set(-s * 0.35, 3.0, 0); g.add(tab); const aro = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.02, 6, 20), new THREE.MeshStandardMaterial({ color: 0xe8590c })); aro.rotation.x = Math.PI / 2; aro.position.set(-s * 0.62, 2.85, 0); g.add(aro); g.position.set(x, 0, -6); g.traverse(n => { if (n.isMesh) n.castShadow = true; }); W.add(g); G.bloquea(x - 0.3, -6.3, x + 0.3, -5.7);
      const red = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.14, 0.42, 12, 3, true), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.85 })); red.position.set(x - s * 0.62, 2.62, -6); red.userData = { red: true }; W.add(red); S.redes.push({ obj: red, aro: new THREE.Vector3(x - s * 0.62, 2.85, -6), t: 9 }); }
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
    S.zonas = P.salas.map(sa => zona(W, sa, sa.interaccion[0], sa.interaccion[1], club));
    S.zonas.push(zona(W, { id: 'salida', nombre: 'Salida a la calle', accion: 'Pasear por ' + club.ciudad, destino: {}, irA: 'calle', boton: 'Salir a la calle' }, GM.sedePlano.entrada.x, 13.3, club));
    return W;
  }
  function zona(W, sala, x, z, club) {
    const g = new THREE.Group(), anillo = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.6, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: sala.irA ? 0xffd54a : club.colores[0] === '#ffffff' ? 0xe8590c : club.colores[0], transparent: true, opacity: 0.85 }));
    anillo.position.y = 0.02; g.add(anillo); g.position.set(x, 0, z); g.userData = { sala: sala.id, anim: t => { anillo.scale.setScalar(1 + Math.sin(t * 3) * 0.08); } }; W.add(g);
    const et = etiqueta(sala.nombre); et.position.set(x, 2.3, z); W.add(et);
    return { sala, obj: g, et };
  }
  // Lo que la calle (calle3d.js) usa del motor de la sede
  async function mueble3(n) { return mueble(n); }
  function motor() { return { mueble: mueble3, personaje, anim, irA, rejilla, textura, etiqueta, zona, bocadillo: (t, o) => bocadillo(t, o) }; }
  // Cambiar entre la sede y la calle con un fundido
  async function cambiarEscena(dest) {
    if (!S || S.cambiando) return; S.cambiando = true; const de = S.escena; S.rend = null;
    if (S.construccion && GM.casa) await GM.casa.activar(S, motor(), false);
    const velo = GM.h('div', { class: 'sede-velo' }); S.raiz.append(velo); await new Promise(r => setTimeout(r, 280));
    try {
      if (S.panel) S.panel.style.display = 'none'; S.zonaActual = null; S.panelFijo = false; if (S.grupo) disolver();
      S.gente.forEach(n => { acabarTiro(n); n.mixer.stopAllAction(); }); S.gente = []; S.ocupados = new Set();
      S.flotantes.forEach(f => f.el.remove()); S.flotantes = []; S.coches = null; S.entrenador = null;
      if (S.marcaDestino) S.scene.remove(S.marcaDestino);
      S.mundo.remove(S.yo.obj); S.scene.remove(S.mundo); S.mundo.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      const deArg = S.escenaArg, [esc, arg] = String(dest).split(':'); dest = esc;
      S.escena = esc; S.escenaArg = arg || null; S.scene.fog = null; if (dest === 'sede') { S.scene.background = new THREE.Color(0x9fb8c8); }
      await construir(S.st);
      // Al volver a la calle desde una casa o un interior, se aparece en su puerta (calle3d.js guarda S.puertas)
      const puerta = (dest === 'calle' || dest === 'pueblo') && S.puertas && (S.puertas[de + ':' + deArg] || S.puertas[de]);
      const sp = dest === 'pueblo' ? puerta || (de === 'pueblo' ? { x: S.yo.obj.position.x, z: S.yo.obj.position.z, ry: S.yo.obj.rotation.y } : S.spawnPueblo) : dest === 'calle' ? (puerta || S.spawnCalle) : dest === 'casa' ? S.spawnCasa : dest === 'interior' ? S.spawnInterior : dest === 'deportiva' ? S.spawnDeportiva : { x: GM.sedePlano.entrada.x, z: 12.4, ry: Math.PI };
      S.yo.camino = null; S.yo.obj.position.set(sp.x, 0, sp.z); S.yo.obj.rotation.y = sp.ry; S.mundo.add(S.yo.obj); S.foco.set(sp.x, 0, sp.z); anim(S.yo, 'idle');
      hud(S.st); await poblar(S.st);
    } catch (e) { console.error(e); GM.ui.toast && GM.ui.toast('No se ha podido cambiar de escena: ' + e.message); }
    velo.classList.add('fuera'); setTimeout(() => velo.remove(), 450); S.cambiando = false;
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
      h('div', { class: 'ct' }, h('b', null, S.escena === 'casa' ? (S.casaNombre || 'Tu casa') : S.escena === 'interior' ? (S.interiorNombre || 'Interior') : S.escena === 'deportiva' ? (S.calleNombre || 'Ciudad deportiva') : S.escena === 'calle' || S.escena === 'pueblo' ? (S.calleNombre || club.ciudad) : club.nombre), S.escena === 'pueblo' ? h('span', null, 'Tu pueblo, ' + U.fechaLarga(st.fecha)) : S.escena === 'calle' ? h('span', null, club.ciudad + ', ' + U.fechaLarga(st.fecha)) : fecha), (S.chipHora = h('span', { class: 'sede-hora' }, '9:00')), (S.chipDia = h('span', { class: 'sede-dia' }, (S.dia || estadoDia(st)).texto)),
      h('button', { class: 'btn btn-sec peq', onclick: () => mapa() }, 'Mapa'),
      st.modo === 'carrera' && GM.mods.movil && GM.ui.movil ? (() => { const n = GM.mods.movil.noLeidos(st); return h('button', { class: 'btn btn-sec peq', onclick: () => GM.ui.movil() }, 'Móvil' + (n ? ' (' + n + ')' : '')); })() : null,
      h('button', { class: 'btn peq', onclick: () => avanzar(() => GM.ui.jugarUnDia()) }, 'Avanzar un día'));
    S.panel = h('div', { class: 'sede-hud sede-sala', style: { display: 'none' } });
    S.ficha = h('div', { class: 'sede-hud sede-ficha', style: { display: 'none' } });
    // Ayuda según el dispositivo; en pantallas táctiles, además, botones para girar y acercar la cámara. Se oculta sola a los 8 s (o al tocarla).
    const tactil = (() => { try { return window.matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } })();
    const ayuda = h('div', { class: 'sede-hud sede-ayuda', onclick: () => ayuda.remove() }, tactil ? 'Toca el suelo para caminar, arrastra para girar la cámara y pellizca para acercar. Pisa el círculo de una sala para ver qué puedes hacer y toca a una persona para hablar con ella.' : 'Toca el suelo para caminar o usa WASD (Mayúsculas para correr). Rueda para acercar, Q y E para girar. Pisa el círculo de una sala para ver qué puedes hacer y toca a una persona para hablar con ella.');
    setTimeout(() => { if (ayuda.isConnected) ayuda.classList.add('fuera'); setTimeout(() => ayuda.remove(), 600); }, 8000);
    const ctrl = tactil ? h('div', { class: 'sede-hud sede-ctrl' },
      h('button', { 'aria-label': 'Girar a la izquierda', onclick: () => { S.yawObj += Math.PI / 4; } }, '⟲'), h('button', { 'aria-label': 'Girar a la derecha', onclick: () => { S.yawObj -= Math.PI / 4; } }, '⟳'),
      h('button', { 'aria-label': 'Acercar', onclick: () => { S.zoom = Math.max(8, S.zoom * 0.8); } }, '+'), h('button', { 'aria-label': 'Alejar', onclick: () => { S.zoom = Math.min(42, S.zoom * 1.25); } }, '−')) : null;
    S.raiz.append(top, S.panel, S.ficha, ayuda); if (ctrl) S.raiz.append(ctrl);
    if (S.escena === 'casa' && GM.casa) { S.btnConstruir = h('button', { class: 'btn casa-btn', onclick: () => GM.casa.activar(S, motor()) }, S.construccion ? 'Salir del modo construcción' : 'Modo construcción'); S.raiz.append(h('div', { class: 'sede-hud casa-btn-cont' }, S.btnConstruir)); }
  }
  // ---------- Mapa interactivo ----------
  // Se dibuja a partir de la rejilla de caminos de la escena (S.G): sirve igual en la sede, la calle y el pueblo.
  function mapa() {
    if (!S || !S.G) return; const prev = S.raiz.querySelector('.sede-mapa'); if (prev) { prev.remove(); return; }
    const h = GM.h, G = S.G, esc = Math.max(2, Math.floor(Math.min(560 / G.W, 560 / G.H) * 2) / 2), cv = h('canvas', { width: G.W * esc, height: G.H * esc });
    const x = cv.getContext && cv.getContext('2d'); if (!x) return;
    const club = S.st.equipos[S.st.clubId], aPx = (wx, wz) => [(wx - G.x0) / G.c * esc, (wz - G.z0) / G.c * esc];
    const pinta = () => {
      x.fillStyle = '#e9e4d6'; x.fillRect(0, 0, cv.width, cv.height); x.fillStyle = '#6d6a62';
      for (let j = 0; j < G.H; j++) for (let i = 0; i < G.W; i++) if (G.b[G.idx(i, j)]) x.fillRect(i * esc, j * esc, esc, esc);
      x.font = '600 ' + Math.max(11, esc * 4.5) + 'px sans-serif'; x.textAlign = 'center';
      (S.zonas || []).forEach(z => { const [px, py] = aPx(z.obj.position.x, z.obj.position.z); x.fillStyle = z.sala.irA ? '#e8a400' : club.colores[0] === '#ffffff' ? '#e8590c' : club.colores[0]; x.beginPath(); x.arc(px, py, Math.max(5, esc * 2), 0, 6.3); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 2; x.stroke(); const tx = z.sala.nombre.length > 22 ? z.sala.nombre.slice(0, 21) + '…' : z.sala.nombre, ty = py - Math.max(8, esc * 2.6); x.lineWidth = 3.5; x.strokeStyle = 'rgba(255,255,255,.92)'; x.strokeText(tx, px, ty); x.fillStyle = '#1c2b3a'; x.fillText(tx, px, ty); });
      const [yx, yz] = aPx(S.yo.obj.position.x, S.yo.obj.position.z); x.fillStyle = '#2f80ed'; x.beginPath(); x.arc(yx, yz, Math.max(6, esc * 2.3), 0, 6.3); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 3; x.stroke();
    };
    pinta();
    const lista = h('div', { class: 'mapa-lista' }, (S.zonas || []).map(z => h('button', { class: 'btn btn-sec peq', onclick: () => ir(z) }, z.sala.nombre)));
    const capa = h('div', { class: 'sede-hud sede-mapa' }, h('div', { class: 'mapa-cab' }, h('b', null, 'Mapa'), h('span', null, 'Toca un punto o un nombre para ir andando'), h('button', { class: 'sp-cerrar', onclick: () => capa.remove() }, '×')), h('div', { class: 'mapa-lienzo' }, cv), lista);
    function ir(z) { capa.remove(); irA(S.yo, z.obj.position.x, z.obj.position.z, () => entrar(z.sala)); }
    cv.addEventListener('click', e => {
      const r = cv.getBoundingClientRect(), wx = G.x0 + (e.clientX - r.left) / r.width * cv.width / esc * G.c, wz = G.z0 + (e.clientY - r.top) / r.height * cv.height / esc * G.c;
      const z = (S.zonas || []).map(z => ({ z, d: Math.hypot(z.obj.position.x - wx, z.obj.position.z - wz) })).sort((a, b) => a.d - b.d)[0];
      if (z && z.d < 4) return ir(z.z);
      capa.remove(); irA(S.yo, wx, wz, null);
    });
    S.raiz.append(capa);
  }
  // ---------- Paneles de sala (menús dentro del mundo) ----------
  const destino = sala => { const d = sala.destino.todos || sala.destino[S.st.modo]; return d && GM.ui.screens[d] ? d : null; };
  function mostrarAviso(zona) {
    if (S.construccion) { if (S.panel) S.panel.style.display = 'none'; S.zonaActual = null; return; }
    if (!zona) { if (S.zonaActual) { S.zonaActual = null; if (!S.panelFijo) S.panel.style.display = 'none'; } return; }
    if (S.zonaActual === zona) return; S.zonaActual = zona; S.panelFijo = false; abrirSala(zona.sala);
  }
  function abrirSala(sala, panelId) {
    if (!panelId) GM.bus.emit('sala:abierta', { id: sala.id, escena: S.escena });
    const h = GM.h, st = S.st, A = GM.mods.sedeAcciones, P = S.panel; P.innerHTML = ''; P.className = 'sede-hud sede-sala tema-' + (panelId || sala.id); P.style.display = 'flex';
    P.append(h('div', { class: 'sp-cab' }, panelId ? h('button', { class: 'sp-volver', onclick: () => abrirSala(sala) }, '‹') : null, h('b', null, panelId ? (A.acciones(st, sala.id).find(x => x.id === panelId) || {}).t || sala.nombre : sala.nombre), h('button', { class: 'sp-x', 'aria-label': 'Cerrar', onclick: () => { P.style.display = 'none'; } }, '×')));
    const cuerpo = h('div', { class: 'sp-cuerpo' }); P.append(cuerpo);
    if (panelId) pintarPanel(panelId, cuerpo, sala);
    else {
      if (sala.acciones) sala.acciones(st).forEach(x => cuerpo.append(h('button', { class: 'sp-accion', disabled: !x.disponible, onclick: () => { const r = x.fn(); GM.ui.toast(r.ok ? r.texto || 'Hecho' : r.motivo || 'No disponible'); if (r.ok) { reaccion(r.texto || '', sala); if (S && S.escena === 'pueblo' && x.id === 'obra') { S.zonaActual = null; cambiarEscena('pueblo'); return; } } if (S) abrirSala(sala); } }, h('b', null, x.t), h('span', null, x.disponible ? x.d : x.motivo || x.d))));
      else if (!A) cuerpo.append(h('p', null, sala.accion));
      else A.acciones(st, sala.id).forEach(x => cuerpo.append(h('button', { class: 'sp-accion' + (x.panel ? ' abre' : ''), disabled: !x.disponible, onclick: () => x.panel ? abrirSala(sala, x.id) : ejecutar(x.id, sala) }, h('b', null, x.t), h('span', null, x.disponible ? x.d : x.motivo))));
    }
    if (sala.irA && !panelId) cuerpo.prepend(h('button', { class: 'btn sp-ir', onclick: () => cambiarEscena(sala.irA) }, sala.boton || 'Ir'));
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
      f.t += dt; if (f.t > (f.dura || 1.8)) { f.el.remove(); return false; }
      v.copy(f.obj.position); v.y += (f.alto || 2.2) + (f.fijo ? 0 : f.t * 0.6); v.project(S.camera);
      f.el.style.left = (v.x + 1) / 2 * r.width + 'px'; f.el.style.top = (1 - v.y) / 2 * r.height + 'px'; f.el.style.opacity = String(f.fijo ? Math.min(1, (f.dura - f.t) * 3, f.t * 6) : Math.min(1, 2.2 - f.t * 1.2)); return true;
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
    } else if (id === 'noticias') {
      const club = st.equipos[st.clubId], ns = (st.noticias || []).slice(0, 10);
      c.append(h('div', { class: 'sp-periodico' }, h('div', { class: 'sp-cabecera-diario' }, 'El Diario de ' + club.ciudad), h('span', { class: 'sp-fecha' }, U.fechaLarga(st.fecha)), ns.length ? ns.map((n, i) => h('p', { class: i ? '' : 'portada' }, n.texto)) : h('p', null, 'Hoy no hay noticias del club.')));
    } else if (id === 'partido') {
      const C = GM.mods.competiciones, g = C.proximoPartido(st, st.clubId);
      if (!g) c.append(h('p', null, 'No quedan partidos esta temporada.'));
      else { const L = st.equipos[g.local], V = st.equipos[g.visitante]; c.append(h('div', { class: 'sp-ticket' }, h('span', null, U.fechaLarga(g.fecha) + (g.fecha === st.fecha ? ', hoy' : '')), h('b', null, L.siglas + '  vs  ' + V.siglas), h('span', null, L.nombre + ' contra ' + V.nombre), h('span', null, g.local === st.clubId ? 'En casa, ' + L.pabellon.nombre : 'Fuera, ' + L.pabellon.nombre))); }
      c.append(h('div', { class: 'sp-botones' }, h('button', { class: 'btn', onclick: () => { avanzar(() => GM.ui.jugarUnDia()); } }, g && g.fecha === st.fecha ? 'Jugar el partido' : 'Avanzar un día'), h('button', { class: 'btn btn-sec', onclick: () => avanzar(() => GM.ui.hastaPartido()) }, 'Hasta el partido')));
    }
  }
  const barra = (t, v) => GM.h('div', { class: 'sp-barra-mini' }, GM.h('span', null, t), GM.h('i', null, GM.h('u', { style: { width: Math.round(v) + '%' } })));
  function avanzar(fn) {
    if (!S || S.cambiando) return; S.cambiando = true;
    const velo = GM.h('div', { class: 'sede-velo sede-dia-nuevo' }); S.raiz.append(velo);
    setTimeout(() => {
      fn();
      setTimeout(() => {
        if (!S) return; const d = estadoDia(S.st);
        velo.append(GM.h('b', null, U.fechaLarga(S.st.fecha)), GM.h('span', null, d.texto));
        S.hora = 9; hud(S.st); if (S.escena === 'pueblo') { S.cambiando = false; cambiarEscena('pueblo'); } else repoblar(); if (S.zonaActual) abrirSala(S.zonaActual.sala, 'partido');
        setTimeout(() => { velo.classList.add('fuera'); setTimeout(() => velo.remove(), 450); if (S) S.cambiando = false; }, 1200);
      }, 80);
    }, 300);
  }
  function entrarClasica(d) {
    S.raiz.style.display = 'none'; S.pausa = true; GM.ui.navegar(d);
    if (!S.volverBtn) { S.volverBtn = GM.h('button', { class: 'btn sede-volver', onclick: volver }, 'Volver a la sede'); document.body.append(S.volverBtn); }
    S.volverBtn.style.display = 'block';
  }
  function entrar(sala) { S.panelFijo = true; abrirSala(sala); }
  function volver() { if (!S) return; S.raiz.style.display = ''; S.pausa = false; if (S.volverBtn) S.volverBtn.style.display = 'none'; repoblar(); S.reloj.update(); if (S.zonaActual) abrirSala(S.zonaActual.sala); }
  function fichaJugador(n) {
    const h = GM.h, st = S.st, F = S.ficha; F.innerHTML = '';
    F.classList.remove('ficha-gente'); if (!n) { F.style.display = 'none'; return; }
    const p = n.jugador && st.jugadores[n.jugador];
    if (!p && GM.mods.gente && (n.charla || S.escena === 'calle' || S.escena === 'pueblo')) return fichaGente(n);
    st.sede = st.sede || { charlas: {} };
    const hoy = st.fecha, ult = p && st.sede.charlas[p.id], puede = p && (!ult || U.diffDays(ult, hoy) >= 7);
    F.append(h('div', { class: 'ct' }, h('b', null, p ? p.nombre : n.rol), h('span', { class: 'muted' }, p ? [p.pos, p.edad + ' años', 'nivel ' + p.ovr, (p.estado.moral < 45 ? 'desanimado' : p.estado.moral > 78 ? 'muy animado' : 'ánimo') + ' ' + Math.round(p.estado.moral), p.estado.lesion ? 'lesionado' : 'forma ' + Math.round(p.estado.forma)].join(', ') : 'Personal del club')),
      p ? h('button', { class: 'btn peq', disabled: !puede, onclick: () => { st.sede.charlas[p.id] = hoy; p.estado.moral = Math.min(100, p.estado.moral + 3); anim(n, 'emote-yes'); n.espera = 3; GM.ui.toast(p.nombre.split(' ')[0] + ' agradece la charla (+3 de ánimo)'); fichaJugador(n); } }, puede ? 'Charlar' : 'Ya hablasteis esta semana') : null,
      h('button', { class: 'btn btn-sec peq', onclick: () => fichaJugador(null) }, 'Cerrar'));
    F.style.display = 'flex';
  }

  function fichaGente(n) {
    const h = GM.h, st = S.st, F = S.ficha, Gn = GM.mods.gente, f = n.charla ? Gn.ficha(st, n.charla) : null; F.innerHTML = ''; F.classList.add('ficha-gente');
    const acc = f ? f.acciones : Gn.casual(st, n);
    F.append(h('div', { class: 'ct' }, h('b', null, f ? f.nombre : n.rol), h('span', { class: 'muted' }, f ? f.rol + ', ' + f.relTexto.toLowerCase() + ' (' + Math.round(f.rel) + ')' : '')));
    if (f) { F.append(h('p', { class: 'ficha-dice' }, '«' + f.texto + '»')); if (!n.saludado) { n.saludado = true; bocadillo(f.texto, n.obj); } }
    acc.forEach(x => F.append(h('button', { class: 'btn peq' + (x.disponible ? '' : ' btn-sec'), disabled: !x.disponible, title: x.disponible ? x.d : x.motivo, onclick: () => {
      const r = x.fn(); if (!r || !r.ok) return; anim(n, 'emote-yes'); n.espera = 3;
      if (r.bocadillo) bocadillo(r.texto, n.obj); else GM.ui.toast(r.texto + (r.efectos && r.efectos.length ? ' (+' + r.efectos.join(', ') + ')' : ''));
      fichaGente(n); } }, x.disponible ? x.t : x.t + ' (' + x.motivo.toLowerCase() + ')')));
    F.append(h('button', { class: 'btn btn-sec peq', onclick: () => fichaJugador(null) }, 'Cerrar'));
    F.style.display = 'flex';
  }

  // ---------- Vida: tiro a canasta ----------
  // Las animaciones del pack no tienen tiro: los brazos se levantan por código (como sentarse) mezclando con la animación.
  const ARR = new THREE.Vector3(0, 1, 0);
  function brazos(p, w, delante) {
    const B = p.huesos; if (!B.UpperArmL || w <= 0) return;
    p.obj.updateMatrixWorld(true);
    const objetivos = { Upper: new THREE.Vector3().copy(ARR).multiplyScalar(0.86).addScaledVector(delante, 0.5).normalize(), Lower: ARR };
    for (const s of ['L', 'R']) for (const [hueso, hijo, obj] of [['UpperArm' + s, 'LowerArm' + s, objetivos.Upper], ['LowerArm' + s, 'Wrist' + s, objetivos.Lower]]) {
      const h = B[hueso], c = B[hijo]; if (!h || !c) continue;
      const dir = c.getWorldPosition(_w).sub(h.getWorldPosition(_v)).normalize();
      _q.setFromUnitVectors(dir, obj); _q2.identity().slerp(_q, w);
      h.getWorldQuaternion(_q); _q.premultiply(_q2); h.parent.getWorldQuaternion(_q2).invert(); h.quaternion.copy(_q2.multiply(_q)); h.updateMatrixWorld(true);
    }
  }
  // Un brazo hacia direcciones dadas (mundo): brazo y antebrazo. lado 'L' o 'R'. Lo usa el músico de la plaza.
  function brazo(p, lado, dU, dL, w) {
    const B = p.huesos; p.obj.updateMatrixWorld(true);
    for (const [hueso, hijo, obj] of [['UpperArm' + lado, 'LowerArm' + lado, dU], ['LowerArm' + lado, 'Wrist' + lado, dL]]) { const h = B[hueso], c = B[hijo]; if (!h || !c) continue; const dir = c.getWorldPosition(_w).sub(h.getWorldPosition(_v)).normalize(); _q.setFromUnitVectors(dir, obj.clone().normalize()); _q2.identity().slerp(_q, w); h.getWorldQuaternion(_q); _q.premultiply(_q2); h.parent.getWorldQuaternion(_q2).invert(); h.quaternion.copy(_q2.multiply(_q)); h.updateMatrixWorld(true); }
  }
  let _tBalon = null;
  function balonMat() {
    if (_tBalon) return _tBalon;
    const t = textura('balon', 128, (x, n) => { x.fillStyle = '#d9692b'; x.fillRect(0, 0, n, n); x.strokeStyle = '#2a1a10'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, n / 2); x.lineTo(n, n / 2); x.moveTo(n / 4, 0); x.lineTo(n / 4, n); x.moveTo(3 * n / 4, 0); x.lineTo(3 * n / 4, n); x.stroke(); });
    return (_tBalon = new THREE.MeshStandardMaterial({ map: t, color: t ? 0xffffff : 0xd9692b, roughness: 0.75 }));
  }
  function empezarTiro(n) {
    const pos = n.obj.position; let red = null, d = 1e9; S.redes.forEach(r => { const dd = Math.hypot(r.aro.x - pos.x, r.aro.z - pos.z); if (dd < d) { d = dd; red = r; } });
    if (!red) return;
    const balon = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 12), balonMat()); balon.castShadow = true; S.mundo.add(balon);
    n.obj.rotation.y = Math.atan2(red.aro.x - pos.x, red.aro.z - pos.z);
    const j = S.st.jugadores[n.jugador], tiro = j && j.att ? (d > 6.6 ? j.att.tiro3 : j.att.tiro2) : 60;
    n.tiro = { red, balon, fase: 'manos', t: 0, acierto: Math.min(0.85, 0.2 + (tiro - 40) / 80), vel: new THREE.Vector3(), r: rnd(U.hash(n.jugador + S.st.fecha + 'tiro')) };
  }
  function acabarTiro(n) { if (!n.tiro) return; S.mundo.remove(n.tiro.balon); n.tiro.balon.geometry.dispose(); n.tiro = null; n.obj.position.y = 0; }
  const _a = new THREE.Vector3(), _b = new THREE.Vector3();
  function manos(n, out) { const f = n.obj.rotation.y, h = (n.altura || 190) / 100; return out.set(n.obj.position.x + Math.sin(f) * 0.32, h * 0.55, n.obj.position.z + Math.cos(f) * 0.32); }
  function actualizarTiro(n, dt) {
    const T = n.tiro, b = T.balon, f = n.obj.rotation.y, delante = _b.set(Math.sin(f), 0, Math.cos(f)), h = (n.altura || 190) / 100;
    T.t += dt; let w = 0;
    if (T.fase === 'manos') { manos(n, b.position); b.position.y += Math.sin(T.t * 9) * 0.03; if (T.t > 0.8 + T.r() * 0.02) { T.fase = 'prepara'; T.t = 0; } }
    else if (T.fase === 'prepara') { // flexión y subida de brazos
      w = Math.min(1, T.t / 0.45); n.obj.position.y = -0.08 * Math.sin(Math.min(1, T.t / 0.45) * Math.PI);
      manos(n, _a); b.position.lerpVectors(_a, _a.clone().setY(h + 0.42).addScaledVector(delante, 0.12), w);
      if (T.t >= 0.45) { // suelta: parábola hacia el aro (o hacia el hierro si falla)
        T.fase = 'vuelo'; T.t = 0; T.ini = b.position.clone(); const mete = T.r() < T.acierto; T.mete = mete;
        T.fin = T.red.aro.clone(); if (!mete) T.fin.add(new THREE.Vector3((T.r() - 0.5) * 0.5, 0.05, (T.r() - 0.5) * 0.5));
        const d = Math.hypot(T.fin.x - T.ini.x, T.fin.z - T.ini.z); T.dur = 0.75 + d * 0.06; T.arco = 1.0 + d * 0.13;
      }
    }
    else if (T.fase === 'vuelo') {
      w = Math.max(0, 1 - T.t / 0.55); n.obj.position.y = 0.16 * Math.max(0, Math.sin(Math.min(1, T.t / 0.4) * Math.PI));
      const u = Math.min(1, T.t / T.dur); b.position.lerpVectors(T.ini, T.fin, u); b.position.y += T.arco * 4 * u * (1 - u); b.rotation.x -= dt * 12;
      if (u >= 1) {
        T.fase = 'suelto'; T.t = 0;
        if (T.mete) { T.vel.set(0, -1.2, 0); T.red.t = 0; } // por dentro del aro, la red se mueve
        else { const fuera = new THREE.Vector3(b.position.x - T.red.aro.x, 0, b.position.z - T.red.aro.z); if (fuera.lengthSq() < 0.001) fuera.set(T.r() - 0.5, 0, T.r() - 0.5); fuera.normalize(); T.vel.set(fuera.x * 2.4, 1.8 + T.r(), fuera.z * 2.4); }
      }
    }
    else if (T.fase === 'suelto') { // gravedad, botes y rebote hacia el tirador
      T.vel.y -= 9.8 * dt; b.position.addScaledVector(T.vel, dt); b.rotation.x -= dt * 8;
      if (b.position.y < 0.12) { b.position.y = 0.12; T.vel.y = Math.abs(T.vel.y) * 0.62; manos(n, _a); const hacia = _a.sub(b.position).setY(0); if (hacia.length() > 0.1) { hacia.normalize(); T.vel.x = T.vel.x * 0.4 + hacia.x * 2.2; T.vel.z = T.vel.z * 0.4 + hacia.z * 2.2; } }
      if (T.t > 1.6) { T.fase = 'vuelve'; T.t = 0; T.ini = b.position.clone(); }
    }
    else if (T.fase === 'vuelve') { const u = Math.min(1, T.t / 0.7); manos(n, _a); b.position.lerpVectors(T.ini, _a, u); b.position.y += 0.5 * Math.sin(u * Math.PI); if (u >= 1) { T.fase = 'manos'; T.t = 0; } }
    if (w > 0) brazos(n, w, delante);
  }
  function moverRedes(dt) { S.redes.forEach(r => { r.t += dt; const k = r.t < 0.6 ? Math.sin(r.t * 20) * (0.6 - r.t) * 0.5 : 0; r.obj.scale.set(1 - k * 0.3, 1 + k, 1 - k * 0.3); }); }

  // ---------- Vida: grupos que charlan ----------
  function frases(n) {
    const st = S.st, C = GM.mods.competiciones, g = C && C.proximoPartido(st, st.clubId), club = st.equipos[st.clubId];
    const riv = g ? st.equipos[g.local === st.clubId ? g.visitante : g.local] : null, out = ['¿Vamos luego al gimnasio?', 'Hoy el míster aprieta, ya verás', '¿Quién paga los cafés?', 'Esta semana cena de equipo', '¿Viste el partido de anoche?', 'Me duelen hasta las pestañas'];
    if (riv) out.push('El ' + U.fecha(g.fecha).split(' ')[0] + ' contra ' + riv.siglas + ', hay que ganar', riv.nombre.split(' ').slice(-1)[0] + ' tiene buenos tiradores', 'En ' + riv.pabellon.nombre.split(' ').slice(0, 3).join(' ') + ' siempre cuesta');
    const ult = (st.calendario || []).filter(x => x.resultado && (x.local === st.clubId || x.visitante === st.clubId)).pop();
    if (ult) { const gan = (ult.local === st.clubId) === (ult.resultado.local > ult.resultado.visitante); out.push(gan ? '¡Qué partidazo el otro día!' : 'Lo del último partido no puede repetirse', gan ? 'La afición estaba encendida' : 'Hay que defender mejor'); }
    const nom = club.plantilla.map(i => st.jugadores[i]).filter(p => p && p.id !== 'yo').map(p => p.nombre.split(' ').slice(-1)[0]);
    if (nom.length) { const k = U.hash(st.fecha) % nom.length; out.push('¿Has visto cómo tira ' + nom[k] + '?', nom[(k + 3) % nom.length] + ' llega tarde otra vez'); }
    const d = S.dia ? S.dia.tipo : 'normal';
    if (d === 'partido') return ['Hoy no fallo ni una', 'Concentración, que hoy hay partido', 'Me como las uñas', (riv ? riv.siglas + ' llega fuerte, ojo' : 'Hoy toca ganar'), 'Hay que salir a morder', 'Lleno hoy, seguro'];
    if (d === 'derrota') return ['No nos sale nada', 'Hay que levantarse ya', 'Mañana toca vídeo, uf', 'Tenemos que defender mejor', 'Silencio y a currar'];
    if (d === 'victoria') out.push('¡Qué noche la de ayer!', '¡La grada se vino arriba!', 'Así, así se juega', '¿Repetimos el sábado?');
    if (n && n.animado) out.push('¿Pique de triples? Pierde invita', 'Hoy estoy on fire', 'El míster me ha guiñado un ojo');
    return out;
  }
  function bocadillo(txt, obj) {
    const el = GM.h('div', { class: 'sede-bocadillo' }, txt); S.raiz.append(el);
    S.flotantes.push({ el, obj, t: 0, dura: 3.2, alto: 2.35, fijo: true });
  }
  function charlas(dt) {
    S.tCharla = (S.tCharla || 0) - dt; if (S.tCharla > 0) return; S.tCharla = 2.5 + Math.random() * 2.5;
    const quietos = S.gente.filter(n => !n.fijo && n.punto && n.punto[2] === 'charla' && !(n.camino && n.camino.length));
    const conCompania = quietos.filter(n => quietos.some(m => m !== n && m.obj.position.distanceTo(n.obj.position) < 2.2));
    const fanes = S.gente.filter(m => m.aficionado); if (fanes.length && Math.random() < 0.4) { const fa = fanes[(Math.random() * fanes.length) | 0], club = S.st.equipos[S.st.clubId], gritos = ['¡Vamos ' + club.siglas + '!', '¡Hoy ganamos!', '¡Una foto, porfa!', '¡Esta temporada sí!', '¡A por ellos!']; bocadillo(gritos[(Math.random() * gritos.length) | 0], fa.obj); return; }
    const solos = S.gente.filter(m => m.cabizbajo && !m.fijo && !(m.camino && m.camino.length)); if (solos.length && Math.random() < 0.2) { bocadillo(['No es mi semana…', 'Uf…', 'Necesito minutos', '…'][(Math.random() * 4) | 0], solos[(Math.random() * solos.length) | 0].obj); return; }
    if (!conCompania.length) return;
    const n = conCompania[(Math.random() * conCompania.length) | 0], f = frases(n);
    bocadillo(f[(Math.random() * f.length) | 0], n.obj); anim(n, Math.random() < 0.5 ? 'emote-yes' : 'idle'); n.actual = null;
    // Los de al lado le miran
    quietos.forEach(m => { if (m !== n && m.obj.position.distanceTo(n.obj.position) < 2.2) m.obj.rotation.y = Math.atan2(n.obj.position.x - m.obj.position.x, n.obj.position.z - m.obj.position.z); });
  }

  // ---------- Ambiente del día ----------
  function estadoDia(st) {
    const C = GM.mods.competiciones, g = C && C.proximoPartido(st, st.clubId), club = st.equipos[st.clubId];
    if (g && g.fecha === st.fecha) { const riv = st.equipos[g.local === st.clubId ? g.visitante : g.local]; return { tipo: 'partido', rival: riv, casa: g.local === st.clubId, texto: 'Día de partido contra ' + riv.nombre }; }
    const ult = (st.calendario || []).filter(x => x.resultado && (x.local === st.clubId || x.visitante === st.clubId)).pop();
    if (ult && U.diffDays(ult.fecha, st.fecha) <= 2) {
      const gan = (ult.local === st.clubId) === (ult.resultado.local > ult.resultado.visitante), riv = st.equipos[ult.local === st.clubId ? ult.visitante : ult.local];
      return { tipo: gan ? 'victoria' : 'derrota', rival: riv, texto: gan ? 'Buen ambiente tras ganar a ' + riv.siglas : 'Ambiente tocado tras perder con ' + riv.siglas };
    }
    return { tipo: 'normal', texto: 'Día de entrenamiento' };
  }
  // La luz depende de la hora (9:00 a 23:00; una hora de juego dura 40 s reales) y del ambiente del día
  const _cA = new THREE.Color(), _cB = new THREE.Color();
  function mezcla(a, b, t) { return _cA.setHex(a).lerp(_cB.setHex(b), Math.max(0, Math.min(1, t))).getHex(); }
  function aplicarAmbiente() {
    if (!S.luces || !S.dia) return;
    const h = S.hora || 9, tarde = Math.max(0, Math.min(1, (h - 17.5) / 2.5)), noche = Math.max(0, Math.min(1, (h - 19.5) / 1.5)), triste = S.dia.tipo === 'derrota' ? 0.72 : S.dia.tipo === 'victoria' ? 1.08 : 1;
    S.noche = noche;
    S.luces.sol.intensity = (2.6 * (1 - noche) + 0.7 * noche) * triste;
    S.luces.sol.color.setHex(noche > 0 ? mezcla(0xffa060, 0x8fa6d6, noche) : mezcla(S.dia.tipo === 'derrota' ? 0xd9e2f0 : 0xfff1dc, 0xffa060, tarde));
    S.luces.cielo.intensity = (1.1 * (1 - noche) + 0.75 * noche) * triste;
    S.luces.cielo.color.setHex(mezcla(0xdfe8f2, 0x5a6c9a, noche));
    if (S.escena === 'calle') { const f = noche > 0 ? mezcla(0xf0a46a, 0x101a2e, noche) : mezcla(0xa9c6dc, 0xf0a46a, tarde); S.scene.background = new THREE.Color(f); if (S.scene.fog) S.scene.fog.color.setHex(f); }
    else S.scene.background = new THREE.Color(noche > 0 ? mezcla(0xf0a46a, 0x101a2e, noche) : mezcla(0x9fb8c8, 0xf0a46a, tarde));
    if (S.farolas) { S.farolas.emissiveIntensity = 0.4 + noche * 3.5; }
    if (S.charcosNoche) S.charcosNoche.opacity = noche * 0.9;
    if (S.ventanas) S.ventanas.forEach(m => { m.emissiveIntensity = (m.emissiveMap ? 1.3 : 0.25) * Math.max(0, Math.min(1, (h - 19) / 1.5)); });
    if (S.chipHora) { const hh = Math.floor(h), mm = Math.floor((h - hh) * 60 / 15) * 15; S.chipHora.textContent = hh + ':' + String(mm).padStart(2, '0'); }
  }

  // ---------- Ánimo: cabeza baja y saludos ----------
  function cabeza(p, ang) {
    const H = p.huesos.Neck || p.huesos.Head; if (!H) return;
    p.obj.updateMatrixWorld(true); const f = p.obj.rotation.y, eje = _a.set(Math.cos(f), 0, -Math.sin(f));
    _q.setFromAxisAngle(eje, ang); H.getWorldQuaternion(_q2); _q2.premultiply(_q); H.parent.getWorldQuaternion(_q).invert(); H.quaternion.copy(_q.multiply(_q2));
  }
  function saludos(dt) {
    S.tSaludo = (S.tSaludo || 0) - dt; if (S.tSaludo > 0) return; S.tSaludo = 1.2;
    const andando = S.gente.filter(n => !n.fijo && n.animado && n.camino && n.camino.length && !n.grupo);
    andando.forEach(n => { const otro = S.gente.find(m => m !== n && !m.fijo && m.obj.position.distanceTo(n.obj.position) < 1.8); if (otro && Math.random() < 0.35) { const fr = ['¡Ey!', '¿Qué pasa, crack?', '¡Hoy la meto toda!', '¡Arriba ese ánimo!', 'Hoy invito yo']; bocadillo(fr[(Math.random() * fr.length) | 0], n.obj); } });
  }

  // ---------- Sesión de grupo: rueda de pases y 3 contra 3 ----------
  const CENTRO = new THREE.Vector3(-12.6, 0, -6), ARO = new THREE.Vector3(-17.98, 2.85, -6);
  function grupoQuiere(n) {
    const G = S.grupo; if (!G || G.fase !== 'reclutar' || n.cabizbajo || G.miembros.length >= G.max) return false;
    unir(n); return true;
  }
  function unir(n) {
    const G = S.grupo; if (n.punto) { S.ocupados.delete(n.punto); n.punto = null; } acabarTiro(n);
    n.grupo = G; G.miembros.push(n); const k = G.miembros.length - 1, dest = posInicial(G, k);
    n.listo = false; n.rapido = true; if (!irA(n, dest.x, dest.z, () => { n.listo = true; n.rapido = false; })) { n.obj.position.set(dest.x, 0, dest.z); n.listo = true; }
  }
  function posInicial(G, k) { if (G.tipo === 'rueda') { const a = k / G.max * Math.PI * 2; return new THREE.Vector3(CENTRO.x + Math.cos(a) * 2.6, 0, CENTRO.z + Math.sin(a) * 2.6); } return new THREE.Vector3(-13 - (k % 3) * 1.6, 0, -8 + (k < 3 ? 0 : 4) + (k % 3)); }
  function crearGrupo() {
    const d = S.dia ? S.dia.tipo : 'normal'; if (d === 'partido') return;
    const libres = S.gente.filter(n => !n.fijo && !n.grupo && !n.cabizbajo && !(S.st.jugadores[n.jugador] && S.st.jugadores[n.jugador].estado.lesion));
    if (libres.length < 4) return;
    const tipo = S.ultimoGrupo === 'partidillo' || libres.length < 6 ? 'rueda' : 'partidillo'; S.ultimoGrupo = tipo;
    const balon = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 12), balonMat()); balon.castShadow = true; balon.position.copy(CENTRO).setY(0.12); S.mundo.add(balon);
    S.grupo = { tipo, max: tipo === 'rueda' ? Math.min(5, libres.length) : 6, miembros: [], fase: 'reclutar', t: 0, dura: 48, balon, posesion: 0, poseedor: null, pases: 0, vuelo: null, tDec: 1.5, r: rnd(U.hash(S.st.fecha + tipo + S.gente.length)) };
    // Recluta a los que están en la pista o sin hacer nada; si faltan, al resto
    libres.sort((a, b) => ((b.punto && b.punto[2] === 'tiro') ? 1 : 0) - ((a.punto && a.punto[2] === 'tiro') ? 1 : 0)).slice(0, S.grupo.max).forEach(unir);
    entrenadorDice(tipo === 'rueda' ? '¡Rueda de pases! Balón rápido' : '¡Tres contra tres a media pista!');
  }
  function peto(n, on) {
    if (n.rangosRopa) { const m = n.obj.getObjectByName('persona'); if (!m) return; const col = m.geometry.attributes.color, c = new THREE.Color(on ? '#ff7a1a' : (n.ropa ? n.ropa[0] : '#888')); n.rangosRopa.forEach(([a, k]) => { for (let i = a; i < a + k; i++) col.setXYZ(i, c.r, c.g, c.b); }); col.needsUpdate = true; n.conPeto = on; return; }
    n.obj.traverse(m => { if (!m.isMesh) return; if (on && /^(Purple|Red_Dark|LightBrown)$/.test(m.material.name) && !m._matOriginal) { m._matOriginal = m.material; m.material = m.material.clone(); m.material.color.set('#ff7a1a'); } else if (!on && m._matOriginal) { m.material.dispose(); m.material = m._matOriginal; m._matOriginal = null; } });
  }
  function disolver() {
    const G = S.grupo; if (!G) return; G.miembros.forEach(n => peto(n, false));
    G.miembros.forEach(n => { n.grupo = null; n.grupoBrazos = 0; n.espera = 0.5 + Math.random() * 2; n.camino = null; anim(n, 'idle'); });
    S.mundo.remove(G.balon); G.balon.geometry.dispose(); S.grupo = null; S.tGrupo = 18 + Math.random() * 10;
    entrenadorDice('Bien. Agua y estiramientos');
  }
  function entrenadorDice(t) { if (S.entrenador) { bocadillo(t, S.entrenador.obj); S.entrenador.actual = null; anim(S.entrenador, 'interact-right'); S.entrenador.tGesto = 1.2; } }
  function manosDe(n, out) { const f = n.obj.rotation.y, h = (n.altura || 190) / 100; return out.set(n.obj.position.x + Math.sin(f) * 0.3, h * 0.55, n.obj.position.z + Math.cos(f) * 0.3); }
  function mirar(n, x, z, dt) { girar(n, Math.atan2(x - n.obj.position.x, z - n.obj.position.z), dt * 2); }
  function lanzar(G, desde, hasta, dur, arco, alFin) { G.vuelo = { ini: desde.clone(), fin: hasta.clone(), t: 0, dur, arco, alFin }; }
  function irDirecto(n, x, z, dt) {
    const o = n.obj.position, dx = x - o.x, dz = z - o.z, d = Math.hypot(dx, dz);
    if (d < 0.15) { if (n.actual !== 'idle' && n.actual !== 'interact-right') anim(n, 'idle'); return false; }
    const v = Math.min(d, (d > 1.2 ? 4 : 2.2) * dt); o.x += dx / d * v; o.z += dz / d * v; anim(n, d > 1.2 ? 'sprint' : 'walk'); girar(n, Math.atan2(dx, dz), dt); return true;
  }
  function actualizarGrupo(dt) {
    if (S.entrenador && S.entrenador.tGesto !== undefined && (S.entrenador.tGesto -= dt) <= 0) { S.entrenador.tGesto = undefined; anim(S.entrenador, 'idle'); }
    if (!S.grupo) { S.tGrupo = (S.tGrupo === undefined ? 6 : S.tGrupo) - dt; if (S.tGrupo <= 0) { S.tGrupo = 30; crearGrupo(); } return; }
    const G = S.grupo, b = G.balon; G.t += dt;
    if (G.fase === 'reclutar') { if (G.miembros.length && G.miembros.every(n => n.listo)) { G.fase = 'juego'; G.t = 0; G.poseedor = G.miembros[0]; if (G.tipo === 'partidillo') { G.miembros.slice(3).forEach(n => peto(n, true)); entrenadorDice('Los de naranja, con peto. ¡A jugar!'); } } else if (G.t > 25) disolver(); return; }
    if (G.t > G.dura) return disolver();
    // Balón en vuelo (pase o tiro)
    if (G.vuelo) { const V = G.vuelo; V.t += dt; const u = Math.min(1, V.t / V.dur); b.position.lerpVectors(V.ini, V.fin, u); b.position.y += V.arco * 4 * u * (1 - u); b.rotation.x -= dt * 10; if (u >= 1) { G.vuelo = null; V.alFin(); } }
    else if (G.poseedor) { const p = G.poseedor; manosDe(p, b.position); if (G.tipo === 'partidillo') { const f = p.obj.rotation.y; b.position.x += Math.cos(f) * 0.25; b.position.z -= Math.sin(f) * 0.25; b.position.y = 0.12 + Math.abs(Math.sin(G.t * 7)) * 0.75; } }
    if (G.tipo === 'rueda') {
      G.miembros.forEach(n => { if (n !== G.poseedor || !G.vuelo) mirar(n, CENTRO.x, CENTRO.z, dt); n.grupoBrazos = Math.max(0, (n.grupoBrazos || 0) - dt * 3); });
      if (!G.vuelo && G.poseedor && (G.tDec -= dt) <= 0) {
        const p = G.poseedor, otros = G.miembros.filter(m => m !== p), q = otros[(G.r() * otros.length) | 0]; G.tDec = 0.7 + G.r() * 0.5;
        p.obj.rotation.y = Math.atan2(q.obj.position.x - p.obj.position.x, q.obj.position.z - p.obj.position.z); p.grupoBrazos = 0.6;
        G.poseedor = null; lanzar(G, b.position, manosDe(q, new THREE.Vector3()), 0.45, 0.3, () => { G.poseedor = q; G.pases++; if (G.pases % 12 === 0) entrenadorDice(['¡Más rápido!', '¡Pase y corte!', 'Mirad antes de recibir'][G.pases / 12 % 3 | 0]); });
      }
      return;
    }
    // 3 contra 3: equipo 0 = miembros 0-2, equipo 1 = 3-5
    const ataque = G.miembros.filter((n, k) => (k < 3 ? 0 : 1) === G.posesion), defensa = G.miembros.filter((n, k) => (k < 3 ? 0 : 1) !== G.posesion);
    ataque.forEach((n, k) => {
      if (!n.dest || (n.tDest -= dt) <= 0) { const a = [-0.95, 0, 0.95][k] + (G.r() - 0.5) * 0.6, rr = 2.6 + G.r() * 4.2; n.dest = [ARO.x + Math.cos(a) * rr, ARO.z + Math.sin(a) * rr * 1.2]; n.dest[0] = Math.max(-17.4, Math.min(-10.2, n.dest[0])); n.dest[1] = Math.max(-11, Math.min(-1.2, n.dest[1])); n.tDest = 1.4 + G.r() * 1.8; }
      if (!irDirecto(n, n.dest[0], n.dest[1], dt)) mirar(n, ARO.x, ARO.z, dt);
      n.grupoBrazos = Math.max(0, (n.grupoBrazos || 0) - dt * 2.5);
    });
    defensa.forEach((n, k) => { const o = ataque[k] || ataque[0], hx = ARO.x - o.obj.position.x, hz = ARO.z - o.obj.position.z, l = Math.hypot(hx, hz) || 1; if (!irDirecto(n, o.obj.position.x + hx / l * 0.95, o.obj.position.z + hz / l * 0.95, dt)) mirar(n, o.obj.position.x, o.obj.position.z, dt); n.grupoBrazos = 0.25; });
    if (G.vuelo || !G.poseedor) return;
    if ((G.tDec -= dt) > 0) return; G.tDec = 1.3 + G.r() * 1.2;
    const p = G.poseedor;
    if (G.pases >= 2 && G.r() < 0.5) { // tiro
      const j = S.st.jugadores[p.jugador], d = Math.hypot(ARO.x - p.obj.position.x, ARO.z - p.obj.position.z), tiro = j && j.att ? (d > 6.6 ? j.att.tiro3 : j.att.tiro2) : 60, mete = G.r() < Math.min(0.75, 0.15 + (tiro - 40) / 85);
      p.obj.rotation.y = Math.atan2(ARO.x - p.obj.position.x, ARO.z - p.obj.position.z); p.grupoBrazos = 1; G.poseedor = null; G.pases = 0;
      const fin = ARO.clone(); if (!mete) fin.add(new THREE.Vector3((G.r() - 0.5) * 0.5, 0.05, (G.r() - 0.5) * 0.5));
      const ini = manosDe(p, new THREE.Vector3()).setY((p.altura || 195) / 100 + 0.4);
      lanzar(G, ini, fin, 0.8 + d * 0.05, 1 + d * 0.12, () => {
        const red = S.redes.find(r => r.aro.distanceTo(ARO) < 0.5); if (mete && red) red.t = 0;
        const sigue = mete ? 1 - G.posesion : (G.r() < 0.55 ? 1 - G.posesion : G.posesion); // rebote
        G.posesion = sigue; const nuevo = G.miembros.filter((n, k) => (k < 3 ? 0 : 1) === sigue)[0];
        if (mete && G.r() < 0.5) entrenadorDice(['¡Buena canasta!', '¡Eso es, buen tiro!', 'Así se juega'][(G.r() * 3) | 0]); else if (!mete && G.r() < 0.4) entrenadorDice(['¡Rebote, rebote!', '¡Cerrad el rebote!', '¡Atrás, defensa!'][(G.r() * 3) | 0]);
        lanzar(G, b.position.clone(), manosDe(nuevo, new THREE.Vector3()), 0.7, 0.6, () => { G.poseedor = nuevo; });
      });
    } else { // pase a un compañero
      const q = ataque.filter(m => m !== p)[(G.r() * 2) | 0] || ataque[0]; if (q === p) return;
      p.obj.rotation.y = Math.atan2(q.obj.position.x - p.obj.position.x, q.obj.position.z - p.obj.position.z); p.grupoBrazos = 0.5; G.poseedor = null;
      lanzar(G, b.position.clone().setY(1.1), manosDe(q, new THREE.Vector3()), 0.42, 0.25, () => { G.poseedor = q; G.pases++; });
    }
  }

  // ---------- Gente ----------
  async function poblar(st) {
    const P = GM.sedePlano, eq = st.equipos[st.clubId], r = rnd(U.hash(st.clubId + st.fecha));
    S.gente.forEach(n => { acabarTiro(n); S.mundo.remove(n.obj); n.mixer.stopAllAction(); }); S.gente = []; S.ocupados = new Set();
    S.dia = estadoDia(st); aplicarAmbiente(); if (S.grupo) disolver(); S.tGrupo = 6;
    if (S.escena === 'casa') { if (S.chipDia) S.chipDia.textContent = S.dia.texto; return; }
    if (S.escena === 'interior') { if (GM.interiores) await GM.interiores.poblar(S, motor(), st, S.escenaArg); if (S.chipDia) S.chipDia.textContent = S.dia.texto; return; }
    if (S.escena === 'deportiva') { if (GM.deportivaMundo) await GM.deportivaMundo.poblar(S, motor(), st); if (S.chipDia) S.chipDia.textContent = S.dia.texto; return; }
    if (S.escena === 'calle') { await GM.calle.poblar(S, motor(), st); await conNombre(st); if (S.chipDia) S.chipDia.textContent = S.dia.texto; return; }
    if (S.escena === 'pueblo') { await GM.puebloMundo.poblar(S, motor(), st); await conNombre(st); if (S.chipDia) S.chipDia.textContent = S.dia.texto; return; }
    let ids = eq.plantilla.filter(i => i !== 'yo').slice(0, 12);
    if (S.dia.tipo === 'derrota') ids = ids.filter(id => U.hash(id + st.fecha) % 100 > 30); // tras perder, algunos ni aparecen
    const club = st.equipos[st.clubId], c1 = club.colores[0], c2 = club.colores[1] || '#222222';
    const nuevos = await Promise.all(ids.map(id => { const j = st.jugadores[id], h = U.hash(id), oscura = /US|SN|NG|CM|ML|CD|SS|AO|FR|DO|BR|GB/.test(j.nac || '') && h % 3 !== 0; return personaje({ modelo: PERSONAS.jugador[h % 3], altura: j.altura || 198, piel: PIEL[oscura ? 3 + (h >>> 3) % 3 : (h >>> 3) % 3], pelo: PELO[(h >>> 6) % 5], ropa: [c1, c2] }); }));
    nuevos.forEach((n, k) => {
      const mor = st.jugadores[ids[k]].estado.moral; Object.assign(n, { jugador: ids[k], r: rnd(U.hash(ids[k] + st.fecha)), espera: 0, cabizbajo: mor < 45, animado: mor > 78 });
      const z = P.puntos.pasillo[k % P.puntos.pasillo.length]; n.obj.position.set(z[0] + (r() - 0.5) * 2, 0, z[1] + (r() - 0.5) * 0.8); n.obj.userData = { npc: k }; S.mundo.add(n.obj); anim(n, 'idle'); S.gente.push(n);
    });
    const per = await Promise.all(P.personal.map((q, k) => { const h = U.hash(q[0] + st.clubId); return personaje({ modelo: PERSONAS[q[0]] || 'm-casual', altura: 165 + h % 20, piel: PIEL[h % 4], pelo: PELO[(h >>> 4) % 6], ropa: q[0] === 'Preparador físico' ? [c1, c2] : null }); }));
    per.forEach((n, k) => { const q = P.personal[k]; n.rol = q[0]; n.fijo = true; n.obj.position.set(q[2], 0, q[3]); n.obj.rotation.y = q[5] * Math.PI / 180; n.obj.userData = { npc: S.gente.length }; anim(n, q[4]); S.mundo.add(n.obj); S.gente.push(n); });
    // Entrenador con su pizarra junto a la pista (en el modo entrenador, el entrenador eres tú)
    S.entrenador = null;
    if (st.modo !== 'entrenador') {
      const e = await personaje({ modelo: 'h-casual_hoodie', altura: 182, piel: PIEL[1], pelo: PELO[5], ropa: ['#1d2024', c1] });
      e.rol = 'Entrenador'; e.fijo = true; e.obj.position.set(-12.4, 0, -0.7); e.obj.rotation.y = Math.PI; e.obj.userData = { npc: S.gente.length };
      const piz = new THREE.Group(), marco = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.52, 0.02), new THREE.MeshStandardMaterial({ color: 0x1d2024 })), hoja = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.46), new THREE.MeshStandardMaterial({ color: 0xf4f6f8 }));
      hoja.position.z = 0.012; piz.add(marco, hoja); piz.position.set(0.18, 1.0, 0.25); piz.rotation.set(-0.5, 0, 0); piz.scale.setScalar(1 / e.obj.scale.x); piz.position.multiplyScalar(1 / e.obj.scale.x); e.obj.add(piz);
      anim(e, 'idle'); S.mundo.add(e.obj); S.gente.push(e); S.entrenador = e;
    }
    // Día de partido: aficionados con los colores del club en la entrada
    if (S.dia.tipo === 'partido' && S.dia.casa) {
      const fans = await Promise.all([0, 1, 2, 3, 4, 5, 6, 7].map(k => personaje({ modelo: ['h-casual_2', 'm-casual', 'h-beach', 'm-punk', 'h-casual_hoodie', 'm-casual', 'h-casual_2', 'h-farmer'][k], altura: 160 + (k * 7) % 28, piel: PIEL[k % 5], pelo: PELO[(k * 3) % 6], ropa: [k % 2 ? c1 : c2, c1] })));
      fans.forEach((f, k) => { f.rol = 'Aficionado'; f.fijo = true; f.aficionado = true; f.obj.position.set(1.8 + (k % 4) * 1.6 + (k >> 2) * 0.7, 0, 17.4 + (k >> 2) * 1.2); f.obj.rotation.y = Math.PI + (k % 3 - 1) * 0.3; f.obj.userData = { npc: S.gente.length }; anim(f, k % 3 ? 'emote-yes' : 'idle'); S.mundo.add(f.obj); S.gente.push(f); });
    }
    if (S.chipDia) S.chipDia.textContent = S.dia.texto;
  }
  // Gente con nombre (gente.js): leyenda, utillero, peña, periodista; en el pueblo, tu primer entrenador y el alcalde.
  // Se colocan en el punto de paseo más cercano a su zona (a más de 1,6 m para no tapar el círculo) con su nombre encima.
  async function conNombre(st) {
    const Gn = GM.mods.gente; if (!Gn || !S.paseo) return;
    for (const d of Gn.personas(st, S.escena)) {
      const z = S.zonas && S.zonas.find(z => z.sala.id === d.zona); if (!z) continue; const zp = z.obj.position;
      let q = null, dm = 1e9; S.paseo.forEach(p => { const dd = Math.hypot(p[0] - zp.x, p[1] - zp.z); if (dd > 1.6 && dd < dm && !S.gente.some(n => n.charla && Math.hypot(n.obj.position.x - p[0], n.obj.position.z - p[1]) < 1.5)) { dm = dd; q = p; } });
      if (!q) continue;
      const n = await personaje(d.aspecto); Object.assign(n, { fijo: true, rol: d.rol, charla: d.id });
      n.obj.position.set(q[0], 0, q[1]); n.obj.lookAt(zp.x, 0, zp.z); n.obj.rotation.y += Math.PI; n.obj.userData = { npc: S.gente.length };
      const et = etiqueta(d.nombre), k = 1 / n.obj.scale.x; et.scale.multiplyScalar(0.8 * k); et.position.y = 2.25 / n.obj.scale.y; n.obj.add(et);
      anim(n, 'idle'); S.mundo.add(n.obj); S.gente.push(n);
    }
  }
  function repoblar() { if (S && S.st) poblar(S.st).catch(e => console.warn(e)); }

  // ---------- Bucle, cámara y controles ----------
  function abrir(st, escena) {
    if (S) cerrar();
    const escArg = escena && String(escena).split(':'); escena = escArg && escArg[0]; const argEsc = escArg && escArg[1] || null;   // 'casa:<id>', 'interior:pabellon'
    const h = GM.h, raiz = h('div', { class: 'sede' }), lienzo = h('div', { class: 'sede-3d' });
    raiz.append(lienzo); document.body.append(raiz);
    const alta = !GM.campus || GM.campus.config.calidad === 'alta'; // en «normal» (móvil): sin sombras en tiempo real y menos resolución
    const renderer = new THREE.WebGLRenderer({ antialias: alta }); renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, alta ? 2 : 1.25));
    renderer.shadowMap.enabled = alta; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    lienzo.append(renderer.domElement); renderer.domElement.style.touchAction = 'none';
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x9fb8c8);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 200);
    const cielo = new THREE.HemisphereLight(0xdfe8f2, 0x6b5a48, 1.1); scene.add(cielo);
    const sol = new THREE.DirectionalLight(0xfff1dc, 2.6); sol.position.set(-14, 26, 12); sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048);
    Object.assign(sol.shadow.camera, { left: -26, right: 26, top: 20, bottom: -20, near: 1, far: 70 }); sol.shadow.bias = -0.0005; sol.shadow.normalBias = 0.02; scene.add(sol, sol.target);
    S = { hora: 9, luces: { cielo, sol }, st, raiz, renderer, scene, camera, escena: escena || 'sede', escenaArg: argEsc, gente: [], ocupados: new Set(), flotantes: [], reloj: new THREE.Timer(), yaw: 0, yawObj: 0, zoom: 22, foco: new THREE.Vector3(6, 0, 10), teclas: {}, vivo: true };
    hud(st);
    const tam = () => { const w = lienzo.clientWidth || window.innerWidth, hh = lienzo.clientHeight || window.innerHeight; renderer.setSize(w, hh); camera.aspect = w / hh; camera.updateProjectionMatrix(); };
    tam(); S.onResize = tam; window.addEventListener('resize', tam);
    if (nivelRend()) aplicarRend(nivelRend(), false);   // lo que se aprendió en escenas anteriores de este dispositivo
    const cargando = h('div', { class: 'sede-hud sede-cargando' }, S.escena === 'pueblo' ? 'Llegando al pueblo…' : 'Abriendo la sede del club…'); raiz.append(cargando);
    construir(st).then(async () => {
      const yo = await personaje(aspecto(st)); { const sp = S.escena === 'pueblo' && S.spawnPueblo ? S.spawnPueblo : S.escena === 'calle' && S.spawnCalle ? S.spawnCalle : S.escena === 'casa' && S.spawnCasa ? S.spawnCasa : S.escena === 'interior' && S.spawnInterior ? S.spawnInterior : S.escena === 'deportiva' && S.spawnDeportiva ? S.spawnDeportiva : { x: GM.sedePlano.entrada.x, z: 12.5, ry: Math.PI }; yo.obj.position.set(sp.x, 0, sp.z); yo.obj.rotation.y = sp.ry; S.foco.set(sp.x, 0, sp.z); } S.yo = yo; anim(yo, 'idle'); S.mundo.add(yo.obj);
      const marca = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.45, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd54a })); marca.position.y = 0.02; yo.obj.add(marca); marca.scale.setScalar(1 / yo.obj.scale.x);
      if (S.escena !== 'sede') hud(st);   // la cabecera usa datos de la escena (nombre del pueblo)
      await poblar(st); cargando.remove();
    }).catch(e => { cargando.textContent = 'No se ha podido cargar la sede: ' + e.message; console.error(e); });
    controles(renderer.domElement);
    (function bucle() {
      if (!S || !S.vivo) return; S.raf = requestAnimationFrame(bucle); if (S.pausa) return;
      S.reloj.update(); const dt = Math.min(0.05, S.reloj.getDelta()), t = S.reloj.getElapsed();
      rendimiento();
      if (S.yo) { teclado(dt); moverPaso(S.yo, dt); if (!S.yo.sentado) S.yo.mixer.update(dt); if (!S.construccion) S.foco.lerp(S.yo.obj.position, Math.min(1, dt * 4)); zonaCercana(); }
      if (S.redes) moverRedes(dt); charlas(dt);
      S.cuadro = (S.cuadro || 0) + 1;
      S.hora = Math.min(23, (S.hora || 9) + dt / 40); S.tLuz = (S.tLuz || 0) - dt; if (S.tLuz <= 0) { S.tLuz = 0.5; aplicarAmbiente(); }
      if (S.gente.length && S.escena === 'sede') actualizarGrupo(dt);
      if (S.escena === 'calle' && GM.calle) GM.calle.actualizar(S, motor(), dt);
      if (S.escena === 'interior' && GM.interiores && GM.interiores.actualizar) GM.interiores.actualizar(S, motor(), dt);
      if (S.escena === 'pueblo' && GM.puebloMundo) GM.puebloMundo.actualizar(S, motor(), dt);
      { const sol = S.luces.sol; sol.position.set(S.foco.x - 14, 26, S.foco.z + 12); sol.target.position.set(S.foco.x, 0, S.foco.z); sol.target.updateMatrixWorld(); }
      S.gente.forEach(n => {
        if (!n.fijo) { if (n.grupo) { if (n.camino && n.camino.length) moverPaso(n, dt); } else if (n.camino && n.camino.length) moverPaso(n, dt); else if ((n.espera -= dt) <= 0) siguienteActividad(n); }
        const dP = Math.hypot(n.obj.position.x - S.foco.x, n.obj.position.z - S.foco.z); if (S.nivelRend >= 2) n.obj.visible = dP < (S.nivelRend >= 3 ? 20 : 28);   // ahorro de CPU: los muy lejanos no se dibujan
        if (!n.sentado && n.obj.visible) { n.dtAcum = (n.dtAcum || 0) + dt; const cada = dP <= (S.nivelRend >= 2 ? 8 : 12) ? 1 : S.nivelRend >= 2 ? 3 : 2; if (cada === 1 || S.cuadro % cada === n.obj.id % cada) { n.mixer.update(n.dtAcum); n.dtAcum = 0; } } if (n.tiro) actualizarTiro(n, dt); if (n.grupoBrazos) brazos(n, n.grupoBrazos, _b.set(Math.sin(n.obj.rotation.y), 0, Math.cos(n.obj.rotation.y)));
        if (n.cabizbajo && !n.sentado) cabeza(n, 0.8);
      });
      saludos(dt);
      { const lim = S.zoom * 1.5 + 8; S.gente.forEach(n => { n.obj.visible = !n.oculto && Math.hypot(n.obj.position.x - S.foco.x, n.obj.position.z - S.foco.z) < lim; }); } // fuera de la vista no se dibuja ni se anima
      if (S.zonas) S.zonas.forEach(z => z.obj.userData.anim(t));
      if (S.flotantes.length) moverFlotantes(dt);
      S.yaw += (S.yawObj - S.yaw) * Math.min(1, dt * 6);
      const inc = S.inc || 0.95, d = S.zoom; camera.position.set(S.foco.x + Math.sin(S.yaw) * Math.cos(inc) * d, Math.sin(inc) * d, S.foco.z + Math.cos(S.yaw) * Math.cos(inc) * d); camera.lookAt(S.foco.x, 0.6, S.foco.z);
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
  // Calidad adaptable: tras 3 s de escena se mide la fluidez real cada 2 s. Si no llega a 30 fps se baja un escalón
  // (1: resolución 1x y sin sombras en tiempo real; 2: resolución 0,8x; 3: 0,65x) y se recuerda en el dispositivo (gm1:rendimiento),
  // así la siguiente escena ya empieza ahí. Pensado para móviles Android modestos, donde no se ha podido medir.
  const NIVELES_REND = [null, 1, 0.8, 0.65];
  function nivelRend() { try { return Math.min(3, +window.localStorage.getItem('gm1:rendimiento') || 0); } catch (e) { return 0; } }
  function aplicarRend(n, avisar) {
    const r = S.renderer; if (!r || !n) return; S.nivelRend = n;
    r.setPixelRatio(NIVELES_REND[n]);
    if (r.shadowMap.enabled) { r.shadowMap.enabled = false; if (S.luces && S.luces.sol) S.luces.sol.castShadow = false; S.scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.needsUpdate = true; }); }); }
    try { window.localStorage.setItem('gm1:rendimiento', String(n)); } catch (e) { }
    if (avisar && GM.ui && GM.ui.toast) GM.ui.toast('Calidad ajustada para que vaya más fluido');
  }
  function rendimiento() {
    const ahora = performance.now(), R = S.rend || (S.rend = { ini: ahora, ult: ahora, n: 0, acum: 0 });
    const d = ahora - R.ult; R.ult = ahora; if (ahora - R.ini < 3000 || d > 500) return;   // arranque o pestaña en segundo plano
    R.n++; R.acum += d; if (R.acum < 2000) return;
    const fps = R.n * 1000 / R.acum; S.fps = Math.round(fps); R.n = 0; R.acum = 0;
    if (fps < 30 && (S.nivelRend || 0) < 3) aplicarRend((S.nivelRend || 0) + 1, true);
  }
  function controles(cv) {
    const ray = new THREE.Raycaster(), suelo = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), ptrs = new Map(); let pinza = 0;
    const toque = (cx, cy) => {
      if (!S.yo) return; const r = cv.getBoundingClientRect(); ray.setFromCamera(new THREE.Vector2((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), S.camera);
      if (S.construccion && GM.casa) { const pc = new THREE.Vector3(); if (ray.ray.intersectPlane(suelo, pc)) GM.casa.toque(S, motor(), pc, ray); return; }
      const npcs = S.gente.map(n => n.obj), hit = ray.intersectObjects(npcs, true)[0];
      if (hit) { let o = hit.object; while (o && !(o.userData && o.userData.npc !== undefined)) o = o.parent; if (o) { const n = S.gente[o.userData.npc]; fichaJugador(n); const yo = S.yo.obj.position; if (!n.fijo && n.camino) { n.camino = null; anim(n, 'idle'); n.espera = 6; } n.obj.lookAt(yo.x, 0, yo.z); return; } }
      const p = new THREE.Vector3(); if (!ray.ray.intersectPlane(suelo, p)) return;
      { let mejor = null, dm = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ? 1.4 : 0.9; S.gente.forEach(n => { const d = Math.hypot(n.obj.position.x - p.x, n.obj.position.z - p.z); if (d < dm) { dm = d; mejor = n; } }); if (mejor) { fichaJugador(mejor); if (!mejor.fijo && mejor.camino) { mejor.camino = null; anim(mejor, 'idle'); mejor.espera = 6; } mejor.obj.lookAt(S.yo.obj.position.x, 0, S.yo.obj.position.z); return; } }
      const z = S.zonas && S.zonas.find(z => Math.hypot(z.obj.position.x - p.x, z.obj.position.z - p.z) < 0.9);
      irA(S.yo, p.x, p.z, z ? () => entrar(z.sala) : null);
      const m = S.marcaDestino || (S.marcaDestino = new THREE.Mesh(new THREE.RingGeometry(0.15, 0.25, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }))); m.position.set(p.x, 0.03, p.z); S.scene.add(m);
    };
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture && cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: Date.now() }); if (ptrs.size === 2) { const a = [...ptrs.values()]; pinza = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); } });
    cv.addEventListener('pointermove', e => { const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x; p.x = e.clientX; p.y = e.clientY; if (ptrs.size === 1 && Math.abs(p.x - p.x0) > 8) S.yawObj -= dx * 0.006; else if (ptrs.size === 2) { const a = [...ptrs.values()], d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); if (pinza) S.zoom = Math.max(8, Math.min(42, S.zoom * pinza / d)); pinza = d; } });
    cv.addEventListener('pointerup', e => { const p = ptrs.get(e.pointerId); ptrs.delete(e.pointerId); pinza = 0; if (p && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 8 && Date.now() - p.t < 450) toque(e.clientX, e.clientY); });
    cv.addEventListener('pointermove', e => { if (!S || !S.construccion || !GM.casa || ptrs.size) return; const r = cv.getBoundingClientRect(); ray.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), S.camera); const pc = new THREE.Vector3(); if (ray.ray.intersectPlane(suelo, pc)) GM.casa.hover(S, pc); });
    cv.addEventListener('wheel', e => { e.preventDefault(); S.zoom = Math.max(8, Math.min(42, S.zoom * (1 + e.deltaY * 0.001))); }, { passive: false });
    S.onKey = e => { if (!S || S.pausa) return; const k = e.key.toLowerCase(); if (e.type === 'keydown') { if (k === 'q') S.yawObj += Math.PI / 2; if (k === 'e' && S.zonaActual) entrar(S.zonaActual.sala); else if (k === 'e') S.yawObj -= Math.PI / 2; if (k === 'r' && S.construccion && GM.casa) GM.casa.rotar(S); if (k === 'escape') { if (S.construccion && GM.casa) GM.casa.activar(S, motor(), false); else cerrar(); } } S.teclas[k] = e.type === 'keydown'; S.teclas.shift = e.shiftKey; };
    window.addEventListener('keydown', S.onKey); window.addEventListener('keyup', S.onKey);
  }
  function cerrar() {
    if (!S) return; S.vivo = false; cancelAnimationFrame(S.raf);
    window.removeEventListener('resize', S.onResize); window.removeEventListener('keydown', S.onKey); window.removeEventListener('keyup', S.onKey);
    S.scene.traverse(n => { if (n.geometry) n.geometry.dispose(); }); S.renderer.dispose(); S.raiz.remove(); if (S.volverBtn) S.volverBtn.remove(); S = null;
    if (GM.ui.refrescar) GM.ui.refrescar();
  }
  GM.sede = { pistaTex: c => pistaTex(c), motor: () => motor(), aspecto, figura, modeloMueble: n => mueble(n), brazo: (p, l, a, b, w) => brazo(p, l, a, b, w), personaje: o => personaje(o), animar: (p, n) => anim(p, n), brazos: (p, w, d) => brazos(p, w, d), abrir, cerrar, volver, activa: () => !!S, _estado: () => S, _anim: (p, n) => anim(p, n), _tiro: n => empezarTiro(n), _grupo: () => { S.tGrupo = 0; }, _escena: d => cambiarEscena(d), _motor: () => motor(), _personaje: o => personaje(o), aEstrella, rejilla };
})();
