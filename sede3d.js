/* SEDE DEL CLUB EN 3D (GM.sede) — prototipo de juego «en el mundo» (al estilo de Big Ambitions)
   Vista desde arriba de las instalaciones del club (plano en sede_plano.js). Tu personaje camina (toca el suelo o usa
   WASD/flechas), los jugadores de tu plantilla y el personal se mueven solos por las salas (entrenan, se sientan, van al
   fisio si están lesionados) y cada sala abre la pantalla del juego que le corresponde (despacho, vestuario, pista...).
   Modelos: Kenney Mini Characters y Furniture Kit (CC0) en dist/modelos. Caminos: A* sobre una cuadrícula de 0,5 m.
   Expone: abrir(st), cerrar(), volver(), activa(). Estado: solo state.sede.charlas (charlas con jugadores, 1 por semana). */
(function () {
  const U = GM.util;
  let S = null; // escena activa
  let EXP_PREV = null;
  const NOP_MATRIZ = function () { };
  let actualizarGrupo = () => { };   // sede_grupo.js: se enlazan justo antes de GM.sede
  let hud = () => { }, controles = () => { }, teclado = () => { };   // sede_hud.js: se enlazan justo antes de GM.sede
  let abrirSala = () => { }, pintarPanel = () => { }, pintarFicha = () => { }, refrescarSala = () => { }, reaccion = () => { };   // sede_paneles.js: se enlazan justo antes de GM.sede
  let actualizarTiro = () => { }, empezarTiro = () => { }, acabarTiro = () => { };   // sede_tiro.js: se enlazan justo antes de GM.sede
  let personaje = async () => { };   // sede_personaje.js: se enlaza justo antes de GM.sede
  let construir = async () => { };   // sede_construir.js: se enlaza justo antes de GM.sede
  let decorar = () => { };   // sede_decorar.js: se enlaza justo antes de GM.sede
  let mapa = () => { };   // sede_mapa.js: se enlaza más abajo, cuando existen irA, entrar, aEstrella y anim   // exposición con la que se salió de la escena anterior
  const { entorno, aplicarAmbiente, tonoCiudad, mezcla, cambiarCielo } = GM.sedeLuz({ S: () => S, exterior: () => ['calle', 'pueblo', 'deportiva'].indexOf(S.escena) >= 0 });   // sede_luz.js
  const cache = {};
  const cargar = ruta => cache[ruta] || (cache[ruta] = (() => { const l = new THREE.GLTFLoader(), k = GM.texturas && GM.texturas.ktx2 && GM.texturas.ktx2(); if (k) l.setKTX2Loader(k); return l.loadAsync(ruta); })());
  // Personas de Quaternius (CC0): cada una sin animaciones y un archivo de animaciones compartido (mismo esqueleto)
  const PERSONAS = { jugador: ['h-casual_hoodie', 'h-casual_2', 'h-beach'], Recepcionista: 'm-formal', Fisioterapeuta: 'm-casual', Camarero: 'h-casual_2', 'Preparador físico': 'h-beach', 'Jefe de prensa': 'm-suit', Utillero: 'h-worker', 'Analista de vídeo': 'h-casual_2', 'Médico del club': 'm-formal', director: 'h-suit', entrenador: 'h-casual_hoodie' };
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
  function sueloMat(tipo) { const t = textura('suelo-' + tipo, 256, SUELOS[tipo] || SUELOS.hormigon), m = new THREE.MeshStandardMaterial({ map: t, color: t ? 0xffffff : 0x999999, roughness: tipo === 'marmol' ? 0.35 : tipo === 'parquet' ? 0.5 : 0.85 });
    const TR = GM.texturas; if (!TR) return m;
    if (tipo === 'madera') return TR.aplicar(m, 'WoodFloor051', { escala: 2.2, rugosidad: 0.6, rugMin: 0.35 });
    if (tipo === 'madera_oscura') return TR.aplicar(m, 'WoodFloor051', { escala: 2.2, tinte: 0x8a6650, rugosidad: 0.55, rugMin: 0.3 });
    if (tipo === 'marmol') return TR.aplicar(m, 'Marble006', { escala: 3, tinte: 0xd8d8d8, rugosidad: 0.25, rugMin: 0.12 });
    if (tipo === 'parquet') return TR.aplicar(m, 'WoodFloor051', { color: false, escala: 2.2, relieve: 0.7, rugosidad: 0.45, rugMin: 0.3 });
    if (tipo === 'hormigon' || tipo === 'baldosa') return TR.aplicar(m, 'Concrete034', { color: false, escala: 2.5, relieve: 0.5 });
    return m; }
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
  // Muebles realistas (Poly Haven, CC0, vendor/modelos/reales): en calidad alta sustituyen al de Kenney del mismo nombre.
  // [modelo, giro en grados para que mire a +z como los de Kenney]. Ocupan la huella del de Kenney (no cambia la rejilla):
  // se usan a su tamaño real y, si son más grandes, se reducen hasta caber. Si no se pueden cargar, se queda el de Kenney.
  const REALES = { loungeSofa: ['sofa_02', 0], loungeSofaLong: ['sofa_03', 0], loungeDesignSofa: ['Sofa_01', 0], loungeSofaCorner: ['sofa_03', 0], loungeChair: ['modern_arm_chair_01', 0], loungeChairRelax: ['mid_century_lounge_chair', 180], loungeDesignChair: ['ArmChair_01', 0],
    chair: ['dining_chair_02', 0], chairCushion: ['WoodenChair_01', 0], chairModernCushion: ['plastic_monobloc_chair_01', 0], stoolBar: ['bar_chair_round_01', 0], table: ['dining_table', 0], tableRound: ['round_wooden_table_01', 0], tableCoffee: ['modern_coffee_table_01', 0], tableCoffeeGlass: ['modern_coffee_table_02', 0], tableCross: ['wooden_table_02', 0],
    sideTable: ['side_table_01', 0], sideTableDrawers: ['vintage_wooden_drawer_01', 0], desk: ['metal_office_desk', 0], bookcaseOpen: ['wooden_display_shelves_01', 0], bookcaseClosedWide: ['painted_wooden_cabinet', 0], cabinetTelevision: ['modern_wooden_cabinet', 0],
    televisionModern: ['television_02', 0], televisionVintage: ['Television_01', 0], lampRoundTable: ['desk_lamp_arm_01', 0], lampSquareTable: ['desk_lamp_arm_01', 0], pottedPlant: ['potted_plant_02', 0], plantSmall1: ['potted_plant_01', 0], plantSmall2: ['potted_plant_04', 0], plantSmall3: ['potted_plant_01', 0], books: ['book_encyclopedia_set_01', 0],
    trashcan: ['metal_trash_can', 0], cardboardBoxClosed: ['cardboard_box_01', 0], radio: ['boombox', 0], speakerSmall: ['boombox', 0], laptop: ['classic_laptop', 0], kitchenStove: ['electric_stove', 0], kitchenMicrowave: ['vintage_microwave', 0] };
  const conReales = () => (!GM.campus || GM.campus.config.calidad === 'alta') && !(typeof window !== 'undefined' && window.__sinReales);
  async function muebleReal(nombre, a) {
    const R = REALES[nombre]; if (!R || !conReales()) return null;
    try {
      const g = await cargar('modelos/reales/' + R[0] + '/' + R[0] + '_1k.gltf'), o = g.scene.clone(true), giro = new THREE.Group(); giro.add(o); giro.rotation.y = R[1] * Math.PI / 180;
      o.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
      const w = new THREE.Group(); w.add(giro); w.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(giro), c = b.getCenter(new THREE.Vector3()), t = b.getSize(new THREE.Vector3());
      giro.position.set(-c.x, -b.min.y, -c.z);
      const E = GM.sedePlano.ESCALA_MUEBLES, kw = a[3].x * E, kd = a[3].z * E, s = Math.min(1, kw * 1.1 / Math.max(0.01, t.x), kd * 1.1 / Math.max(0.01, t.z)); w.scale.setScalar(s);
      w.tam = a[3]; w.userData.real = R[0]; return w;
    } catch (e) { REALES[nombre] = null; return null; }
  }
  async function mueble(nombre) {
    const g = await cargar('modelos/muebles/' + nombre + '.glb');
    if (!AJUSTE[nombre]) { const b = new THREE.Box3().setFromObject(g.scene), c = b.getCenter(new THREE.Vector3()); AJUSTE[nombre] = [c.x, b.min.y, c.z, b.getSize(new THREE.Vector3())]; }
    { const r = await muebleReal(nombre, AJUSTE[nombre]); if (r) return r; }
    const a = AJUSTE[nombre], o = g.scene.clone(true), w = new THREE.Group();
    o.traverse(n => { if (n.isMesh && !Array.isArray(n.material)) { const m = n.material, k = m.name + m.color.getHexString() + (m.map ? m.map.uuid : ''); n.material = MATS[k] || (MATS[k] = m); } }); o.position.set(-a[0], -a[1], -a[2]); w.add(o);
    w.scale.setScalar(GM.sedePlano.ESCALA_MUEBLES); w.tam = a[3]; return w;
  }
  // o: { modelo, altura (cm), piel, pelo, ropa: [color principal, color secundario] }
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

  // Ir en bici: sentado en el sillín (muslos hacia delante), brazos al manillar y, al avanzar, las piernas pedalean y las ruedas giran.
  // Los pies cuelgan de Root, así que se recolocan a mano en cada cuadro (como en sentar()).
  const _q3 = new THREE.Quaternion(), _lat = new THREE.Vector3(), _fw = new THREE.Vector3();
  function ponerBici(p) {
    const B = p.huesos, ant = p.asiento, vu = p.biciObj ? p.biciObj.userData : {}; p.asiento = vu.asiento || 0.98; sentar(p); p.asiento = ant;
    if (p.biciObj) { p.biciObj.position.set(0, -p.obj.position.y / p.obj.scale.x, (vu.zRef === undefined ? 0.16 : vu.zRef) / p.obj.scale.x); p.obj.updateMatrixWorld(true); }
    // Brazos hacia el puño más cercano del manillar (con el codo un poco caído)
    const puños = p.biciObj && vu.puños ? vu.puños.map(q => p.biciObj.localToWorld(new THREE.Vector3(q[0], q[1], q[2]))) : [];
    for (const l of ['L', 'R']) {
      const hombro = B['UpperArm' + l].getWorldPosition(new THREE.Vector3()); let dir;
      if (puños.length) { const q = puños.reduce((m, c) => (c.distanceTo(hombro) < m.distanceTo(hombro) ? c : m)); dir = q.clone().sub(hombro).normalize(); }
      else { p.obj.updateMatrixWorld(true); _fw.set(0, 0, 1).applyQuaternion(p.obj.getWorldQuaternion(_q3)); dir = _fw.clone().multiplyScalar(0.7).add(new THREE.Vector3(0, -0.7, 0)).normalize(); }
      brazo(p, l, dir.clone().add(new THREE.Vector3(0, -0.3, 0)).normalize(), dir.clone().add(new THREE.Vector3(0, 0.12, 0)).normalize(), 1);
    }
    p.biciBase = {}; for (const l of ['L', 'R']) { p.biciBase['U' + l] = B['UpperLeg' + l].quaternion.clone(); B['LowerLeg' + l].getWorldQuaternion(_q3); p.biciBase['W' + l] = _q3.clone(); }
    p.fase = p.fase || 0; p.ultPos = null;
  }
  function pedalear(p, dt) {
    const B = p.huesos; if (!p.biciBase || !B.UpperLegL) return;
    const o = p.obj.position, v = p.ultPos ? Math.hypot(o.x - p.ultPos[0], o.z - p.ultPos[1]) : 0; p.ultPos = [o.x, o.z];
    p.fase += v * 1.6; const g = p.biciObj;
    if (g) { const u = g.userData; u.ruedas.forEach(r => { r.rotation.x += v / 0.3; }); if (u.bielas) { u.bielas.rotation.x = p.fase; u.bielas.children.forEach(c => { if (c.userData.pedal) c.rotation.x = -p.fase; }); } else return; }
    p.obj.updateMatrixWorld(true); _lat.set(1, 0, 0).applyQuaternion(p.obj.getWorldQuaternion(_q3));
    for (const l of ['L', 'R']) {
      const ul = B['UpperLeg' + l], ll = B['LowerLeg' + l], f = B['Foot' + l], ang = 0.25 + Math.sin(p.fase + (l === 'R' ? Math.PI : 0)) * 0.42; // bajada del muslo
      ul.parent.updateMatrixWorld(true); ul.parent.getWorldQuaternion(_q); _q2.copy(_q).multiply(p.biciBase['U' + l]); _q3.setFromAxisAngle(_lat, ang).multiply(_q2);
      ul.quaternion.copy(_q.invert().multiply(_q3)); ul.updateMatrixWorld(true);
      ll.parent.getWorldQuaternion(_q); ll.quaternion.copy(_q.invert().multiply(p.biciBase['W' + l])); ll.updateMatrixWorld(true);
      const fin = ll.localToWorld(_w.copy(p.pieLocal[l])); f.parent.updateMatrixWorld(true); f.position.copy(f.parent.worldToLocal(fin));
    }
  }

  // ---------- Cuadrícula y caminos (A*) ----------
  function rejilla(P) {
    const [x0, z0, x1, z1] = P.limites, c = P.CELDA, W = Math.round((x1 - x0) / c), H = Math.round((z1 - z0) / c), b = new Uint8Array(W * H);
    const idx = (i, j) => j * W + i, celda = (x, z) => [Math.floor((x - x0) / c), Math.floor((z - z0) / c)];
    const bloquea = (xa, za, xb, zb) => { const [ia, ja] = celda(Math.min(xa, xb), Math.min(za, zb)), [ib, jb] = celda(Math.max(xa, xb) - 0.001, Math.max(za, zb) - 0.001); for (let j = Math.max(0, ja); j <= Math.min(H - 1, jb); j++) for (let i = Math.max(0, ia); i <= Math.min(W - 1, ib); i++) b[idx(i, j)] = 1; };
    return { W, H, b, c, x0, z0, idx, celda, bloquea, libre: (i, j) => i >= 0 && j >= 0 && i < W && j < H && !b[idx(i, j)], centro: (i, j) => [x0 + (i + 0.5) * c, z0 + (j + 0.5) * c] };
  }
  function aEstrella(G, desde, hasta, tope) {   // tope: máximo de nodos que se expanden (las personas del mundo no buscan caminos de media ciudad; el jugador sí)
    let [si, sj] = G.celda(desde[0], desde[1]), [ti, tj] = G.celda(hasta[0], hasta[1]);
    const cerca = (i, j, ri, rj) => { if (G.libre(i, j)) return [i, j]; let mejor = null, md = Infinity;
      for (let r = 1; r <= 60; r++) { if (mejor && r > Math.sqrt(md) + 1) break;
        for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { if (Math.max(Math.abs(di), Math.abs(dj)) !== r || !G.libre(i + di, j + dj)) continue; const d = di * di + dj * dj + (ri === undefined ? 0 : Math.hypot(i + di - ri, j + dj - rj) * 0.02); if (d < md) { md = d; mejor = [i + di, j + dj]; } } }
      return mejor; };
    const s = cerca(si, sj), t = cerca(ti, tj, si, sj); if (!s || !t) return null; [si, sj] = s; [ti, tj] = t;
    const N = G.W * G.H;   // las tablas se reutilizan entre búsquedas con un número de generación (antes se reservaban y rellenaban 8 MB en cada camino: era lo más caro de la CPU)
    const A = G._ast || (G._ast = { gS: new Float32Array(N), de: new Int32Array(N), gen: new Uint32Array(N), cer: new Uint32Array(N), cur: 0 }), gen = ++A.cur;
    const gS = { get length() { return N; } }, de = new Proxy({}, { get: (_, k) => A.gen[k] === gen ? A.de[k] : -1 });
    const h = (i, j) => Math.hypot(i - ti, j - tj), ini = G.idx(si, sj), fin = G.idx(ti, tj);
    // Lista abierta como montículo binario (antes se recorría entera en cada paso: con la ciudad grande era muy lento)
    const hf = [], hn = [];
    const meter = (f, n) => { let i = hf.length; hf.push(f); hn.push(n); while (i > 0) { const p = (i - 1) >> 1; if (hf[p] <= f) break; hf[i] = hf[p]; hn[i] = hn[p]; i = p; } hf[i] = f; hn[i] = n; };
    const sacar = () => { const n0 = hn[0], f = hf.pop(), n = hn.pop(); if (hf.length) { let i = 0; const L = hf.length; for (;;) { let c = 2 * i + 1; if (c >= L) break; if (c + 1 < L && hf[c + 1] < hf[c]) c++; if (hf[c] >= f) break; hf[i] = hf[c]; hn[i] = hn[c]; i = c; } hf[i] = f; hn[i] = n; } return n0; };
    const abierto = { push: ([f, n]) => meter(f, n), get length() { return hf.length; } };
    A.gen[ini] = gen; A.gS[ini] = 0; A.de[ini] = -1; abierto.push([h(si, sj), ini]); let mejorN = ini, mejorH = h(si, sj);
    const DIR = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    let expandidos = 0; const MAXEXP = tope || Infinity;
    while (abierto.length) {
      if (++expandidos > MAXEXP) break;
      const cur = sacar();
      if (cur === fin) break; if (A.cer[cur] === gen) continue; A.cer[cur] = gen;
      const ci = cur % G.W, cj = (cur / G.W) | 0; { const hh = h(ci, cj); if (hh < mejorH) { mejorH = hh; mejorN = cur; } }
      for (const [di, dj, cost] of DIR) {
        const ni = ci + di, nj = cj + dj; if (!G.libre(ni, nj)) continue; if (di && dj && (!G.libre(ci + di, cj) || !G.libre(ci, cj + dj))) continue;
        const n = G.idx(ni, nj), g = A.gS[cur] + cost; if (A.gen[n] !== gen || g < A.gS[n]) { A.gen[n] = gen; A.gS[n] = g; A.de[n] = cur; abierto.push([g + h(ni, nj), n]); }
      }
    }
    const llega = de[fin] >= 0 || fin === ini, meta = llega ? fin : mejorN; if (!llega && meta === ini) return null;
    const camino = []; for (let k = meta; k >= 0; k = k === ini ? -1 : de[k]) camino.push(G.centro(k % G.W, (k / G.W) | 0));
    camino.reverse();
    // Suavizado: salta puntos intermedios si hay línea de visión
    const ve = (a, b) => { const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(d / 0.2), px = d ? -(b[1] - a[1]) / d * 0.22 : 0, pz = d ? (b[0] - a[0]) / d * 0.22 : 0;
      for (let k = 1; k < n; k++) { const x = a[0] + (b[0] - a[0]) * k / n, z = a[1] + (b[1] - a[1]) * k / n; for (const s of [0, 1, -1]) { const [i, j] = G.celda(x + px * s, z + pz * s); if (!G.libre(i, j)) return false; } } return true; };
    aEstrella.ve = ve;
    const out = [camino[0]]; let k = 0; while (k < camino.length - 1) { let l = camino.length - 1; while (l > k + 1 && !ve(camino[k], camino[l])) l--; out.push(camino[l]); k = l; }
    out.llega = llega; out.truncado = expandidos > MAXEXP; return out;
  }

  // ---------- Personajes que caminan ----------
  function anim(p, nombre) {
    if (p.bici && p.huesos && (nombre === 'walk' || nombre === 'sprint' || nombre === 'idle')) nombre = 'bici';
    if (p.actual === nombre) return;
    if (nombre === 'sit') {
      // Postura sentada fija: primer fotograma de estar de pie, se doblan las piernas una vez y el mezclador se detiene
      p.mixer.stopAllAction(); const a = p.acc.idle; a.reset().play(); p.mixer.update(0); a.stop();
      p.obj.position.y = 0; sentar(p); p.sentado = true; p.accion = null; p.actual = nombre; return;
    }
    if (nombre === 'bici') { p.mixer.stopAllAction(); const a0 = p.acc.idle; a0.reset().play(); p.mixer.update(0); a0.stop(); p.obj.position.y = 0; ponerBici(p); p.sentado = true; p.accion = null; p.actual = nombre; return; }
    if (p.sentado) { p.sentado = false; p.obj.position.y = 0; }
    const a = p.acc[nombre] || p.acc.idle; if (!a) return;
    a.reset().fadeIn(0.2).play(); if (p.accion) p.accion.fadeOut(0.2); p.accion = a; p.actual = nombre;
  }
  function irA(p, x, z, alLlegar) {
    const c = aEstrella(S.G, [p.obj.position.x, p.obj.position.z], [x, z], p === S.yo ? 0 : 9000); if (!c || (c.truncado && p !== S.yo)) return false;
    const [ci, cj] = S.G.celda(x, z), ult = c[c.length - 1]; if (c.llega && S.G.libre(ci, cj) && (!aEstrella.ve || aEstrella.ve(ult, [x, z]))) c.push([x, z]);
    p.camino = c.slice(1); p.alLlegar = alLlegar || null; anim(p, p.rapido ? 'sprint' : 'walk'); return true;
  }
  function moverPaso(p, dt) {
    if (!p.camino || !p.camino.length) return;
    const [tx, tz] = p.camino[0], o = p.obj.position, dx = tx - o.x, dz = tz - o.z, d = Math.hypot(dx, dz), v = (p.rapido ? 4.2 : p.cabizbajo ? 1.45 : 2.1) * (p.bici ? (p.velBici || 2.5) : 1) * dt;
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
    if (S.yo && S.yo.bici && GM.ciudadBarrios) GM.ciudadBarrios.bici(false);
    S.mascota = null;
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
  function etiqueta(txt) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 96; const x = c.getContext('2d');
    if (x) { x.fillStyle = 'rgba(20,24,30,.78)'; x.beginPath(); if (x.roundRect) x.roundRect(4, 8, 504, 80, 30); else x.rect(4, 8, 504, 80); x.fill(); x.fillStyle = '#fff'; x.font = '600 42px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 256, 50); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(2.6, 0.49, 1); s.renderOrder = 10; s.userData = { etiqueta: true }; return s;
  }

  // ---------- Mapa interactivo ----------
  // Se dibuja a partir de la rejilla de caminos de la escena (S.G): sirve igual en la sede, la calle y el pueblo.
  const FILTROS = [['Natural', ''], ['Cálido', 'sepia(0.25) saturate(1.25) contrast(1.05)'], ['Frío', 'hue-rotate(-12deg) saturate(0.9) brightness(1.03)'], ['Intenso', 'contrast(1.18) saturate(1.35)'], ['Blanco y negro', 'grayscale(1) contrast(1.15)'], ['Película', 'sepia(0.4) contrast(1.1) brightness(0.95) saturate(0.85)']];
  function modoFoto() {
    if (!S || S.raiz.querySelector('.sede-foto')) return; const h = GM.h, cv = S.renderer.domElement; let f = 0; S.raiz.classList.add('en-foto');
    const ocultos = []; S.scene.traverse(o => { if (o.visible && ((o.isSprite && !(o.userData && (o.userData.halo || o.userData.foto)) && !(o.parent && o.parent.userData && (o.parent.userData.cielo || o.parent.userData.nubes))) || (o.userData && (o.userData.etiqueta || o.userData.zona)) || o === S.marcaDestino)) { o.visible = false; ocultos.push(o); } }); S.enFoto = true; (S.zonas || []).forEach(z => { if (z.obj.visible) { z.obj.visible = false; ocultos.push(z.obj); } }); if (S.yo) S.yo.obj.children.forEach(c => { if (c.geometry && c.geometry.type === 'RingGeometry' && c.visible) { c.visible = false; ocultos.push(c); } });
    const vin = h('div', { class: 'sede-foto-vineta', style: { display: 'none' } });
    const poner = () => { cv.style.filter = FILTROS[f][1]; nombre.textContent = FILTROS[f][0]; };
    const nombre = h('b', null, 'Natural');
    const guardar = () => {
      const k = S.fotoRes || 1, r = S.renderer, w = cv.clientWidth, hh = cv.clientHeight, pr0 = r.getPixelRatio();   // resolución mayor: se redibuja una vez con más píxeles y se vuelve al tamaño normal
      if (k > 1) { const pr = Math.min(pr0 * k, 16384 / Math.max(w, hh)); r.setPixelRatio(pr); if (S.composer) { S.composer.setPixelRatio(pr); S.composer.setSize(w, hh); } r.setSize(w, hh, false); S.camera.aspect = w / hh; S.camera.updateProjectionMatrix(); }
      if (S.composer) S.composer.render(); else S.renderer.render(S.scene, S.camera); const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; const x = c.getContext('2d'); if (!x) return; x.filter = FILTROS[f][1] || 'none'; x.drawImage(cv, 0, 0);
      if (vin.style.display !== 'none') { const g = x.createRadialGradient(c.width / 2, c.height / 2, c.height * 0.35, c.width / 2, c.height / 2, c.height * 0.85); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)'); x.filter = 'none'; x.fillStyle = g; x.fillRect(0, 0, c.width, c.height); }
      if (S.fotoMarco) { const m = Math.round(c.height * 0.035); x.filter = 'none'; x.fillStyle = '#f6f3ec'; x.fillRect(0, 0, c.width, m); x.fillRect(0, 0, m, c.height); x.fillRect(c.width - m, 0, m, c.height); x.fillRect(0, c.height - m * 2.2, c.width, m * 2.2); }
      if (S.fotoSello) { const club = S.st.equipos[S.st.clubId], t = club.nombre + ', ' + U.fechaLarga(S.st.fecha) + '. Basket Manager 26/27', fs = Math.round(c.height * 0.022); x.filter = 'none'; x.font = '600 ' + fs + 'px sans-serif'; x.textBaseline = 'bottom'; x.textAlign = S.fotoMarco ? 'left' : 'right'; const tx = S.fotoMarco ? Math.round(c.height * 0.035) : c.width - fs, ty = S.fotoMarco ? c.height - Math.round(c.height * 0.035 * 0.7) : c.height - fs * 0.8; if (!S.fotoMarco) { x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillText(t, tx + 2, ty + 2); } x.fillStyle = S.fotoMarco ? '#2a2f35' : '#ffffff'; x.fillText(t, tx, ty); }
      if (k > 1) { r.setPixelRatio(pr0); if (S.composer) { S.composer.setPixelRatio(pr0); S.composer.setSize(w, hh); } r.setSize(w, hh, false); S.camera.aspect = w / hh; S.camera.updateProjectionMatrix(); }
      const a = document.createElement('a'); a.download = 'basket-manager-' + S.st.fecha + '.png'; a.href = c.toDataURL('image/png'); document.body.append(a); a.click(); a.remove(); GM.ui.toast('Foto guardada'); };
    const salir = () => { window.removeEventListener('keydown', teclasFoto); window.removeEventListener('keyup', teclasFoto); S.camLibre = null; S.fotoTeclas = null; S.expFoto = 1; S.enfoqueManual = null; if (panel) panel.remove(); if (pad) pad.remove(); S.fotoRes = 1; S.fotoMarco = S.fotoSello = false; camera.far = 200; if (S.bokeh) S.bokeh.enabled = false; if (S.rayos) S.rayos.enabled = false; if (S.solSprite) S.solSprite.visible = false; cv.style.filter = ''; S.raiz.classList.remove('en-foto'); barra.remove(); vin.remove(); ocultos.forEach(o => { o.visible = true; }); S.enFoto = false; };
    const barra = h('div', { class: 'sede-foto' }, h('button', { class: 'btn btn-sec peq', onclick: () => { f = (f + FILTROS.length - 1) % FILTROS.length; poner(); } }, '‹'), nombre, h('button', { class: 'btn btn-sec peq', onclick: () => { f = (f + 1) % FILTROS.length; poner(); } }, '›'),
      h('button', { class: 'btn btn-sec peq', onclick: () => { vin.style.display = vin.style.display === 'none' ? '' : 'none'; } }, 'Viñeta'),
      S.bokeh ? h('button', { class: 'btn btn-sec peq', title: 'Profundidad de campo: enfoca al personaje y desenfoca el resto', onclick: e => { S.bokeh.enabled = !S.bokeh.enabled; e.currentTarget.style.opacity = S.bokeh.enabled ? 1 : 0.7; } }, 'Desenfoque') : null,
      S.rayos ? h('button', { class: 'btn btn-sec peq', title: 'Rayos de luz cuando el sol está delante de la cámara', onclick: e => { S.rayos.enabled = !S.rayos.enabled; if (!S.rayos.enabled && S.solSprite) S.solSprite.visible = false; e.currentTarget.style.opacity = S.rayos.enabled ? 1 : 0.7; } }, 'Rayos de luz') : null, h('button', { class: 'btn peq', onclick: guardar }, 'Guardar foto'), h('button', { class: 'btn btn-sec peq', onclick: salir }, 'Salir'));
    // ---------- Ajustes de foto: hora, clima, exposición, enfoque, apertura, cámara libre y ocultar la interfaz ----------
    const camera = S.camera, fila = (t, ...hijos) => h('div', { class: 'ff-fila' }, h('span', null, t), ...hijos);
    const rango = (min, max, paso, val, fn) => { const i = h('input', { type: 'range', min, max, step: paso }); i.value = val; i.oninput = () => fn(+i.value); return i; };
    const bt = (t, fn, k) => { const b = h('button', { class: 'btn btn-sec peq' + (k ? ' ff-res' : ''), onclick: fn }, t); if (k) { b.dataset.k = k; b.style.opacity = k === 1 ? 1 : 0.6; } return b; };
    const teclasFoto = e => { const k = e.key.toLowerCase(); if (e.type === 'keydown' && (k === 'h' || k === 'escape') && ocultoUI) { mostrar(); return; } if (e.type === 'keydown' && k === 'h') { ocultar(); return; } if (!S.fotoTeclas) S.fotoTeclas = {}; S.fotoTeclas[k] = e.type === 'keydown'; if (e.key === 'Shift') S.fotoTeclas.shift = e.type === 'keydown'; };
    const dirEnfoque = h('b', null, 'Auto'), horaTxt = h('b', null, ''), expTxt = h('b', null, '0 EV');
    const poneHora = v => { S.hora = v; S.tLuz = 0; const hh = Math.floor(v), mm = Math.floor((v - hh) * 60 / 5) * 5; horaTxt.textContent = hh + ':' + String(mm).padStart(2, '0'); if (S.chipHora) S.chipHora.textContent = horaTxt.textContent; };
    const pad = h('div', { class: 'ff-pad', style: { display: 'none' } }, ...[['▲', 'w'], ['◀', 'a'], ['▶', 'd'], ['▼', 's'], ['subir', 'e'], ['bajar', 'q']].map(([t, k]) => { const b = h('button', { class: 'btn btn-sec peq' }, t); const on = e => { e.preventDefault(); (S.fotoTeclas = S.fotoTeclas || {})[k] = true; }, off = () => { if (S.fotoTeclas) S.fotoTeclas[k] = false; }; b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off); return b; }));
    const libre = bt('Cámara libre: no', () => { if (S.camLibre) { S.camLibre = null; libre.textContent = 'Cámara libre: no'; pad.style.display = 'none'; } else { const d = new THREE.Vector3(); camera.getWorldDirection(d); S.camLibre = { pos: camera.position.clone(), yaw: Math.atan2(-d.x, -d.z), pitch: Math.asin(Math.max(-1, Math.min(1, d.y))) }; libre.textContent = 'Cámara libre: sí'; if ('ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0) pad.style.display = ''; GM.ui.toast('WASD o flechas (o mando), Q y E suben y bajan, Mayús rápido, arrastra para girar'); } });
    const panel = h('div', { class: 'sede-foto-panel', style: { display: 'none' } },
      fila('Clima', ...[['sol', 'Despejado'], ['nubes', 'Nublado'], ['lluvia', 'Lluvia'], ['nieve', 'Nieve']].map(([t, n]) => bt(n, () => { GM.sede._clima(t); S.tLuz = 0; }))),
      fila('Hora', rango(5, 23.5, 0.1, S.hora || 12, poneHora), horaTxt),
      fila('Exposición', rango(-1.5, 1.5, 0.05, 0, v => { S.expFoto = Math.pow(2, v); expTxt.textContent = (v > 0 ? '+' : '') + v.toFixed(2) + ' EV'; }), expTxt),
      S.bokeh ? fila('Enfoque', rango(3, 90, 1, 20, v => { S.enfoqueManual = v; dirEnfoque.textContent = v + ' m'; }), dirEnfoque, bt('Auto', () => { S.enfoqueManual = null; dirEnfoque.textContent = 'Auto'; })) : null,
      S.bokeh ? fila('Apertura', rango(0, 1, 0.02, 0.35, v => { S.bokeh.uniforms.aperture.value = 0.00005 + v * 0.0006; S.bokeh.uniforms.maxblur.value = 0.004 + v * 0.02; })) : null,
      fila('Cámara', libre, bt('Ocultar interfaz (H)', () => ocultar())),
      fila('Guardar', ...[1, 2, 4].map(k => bt(k + 'x', e => { S.fotoRes = k; panel.querySelectorAll('.ff-res').forEach(q => { q.style.opacity = q.dataset.k == k ? 1 : 0.6; }); }, k)), bt('Marco', e => { S.fotoMarco = !S.fotoMarco; e.currentTarget.style.opacity = S.fotoMarco ? 1 : 0.6; }), bt('Sello', e => { S.fotoSello = !S.fotoSello; e.currentTarget.style.opacity = S.fotoSello ? 1 : 0.6; })));
    let ocultoUI = false; const fantasma = h('button', { class: 'sede-foto-fantasma', title: 'Mostrar la interfaz (H)', onclick: () => mostrar() }, '·');
    const ocultar = () => { ocultoUI = true; barra.style.display = 'none'; panel.style.display = 'none'; S.raiz.append(fantasma); }, mostrar = () => { ocultoUI = false; barra.style.display = ''; fantasma.remove(); };
    barra.insertBefore(h('button', { class: 'btn btn-sec peq', onclick: () => { panel.style.display = panel.style.display === 'none' ? '' : 'none'; } }, 'Ajustes'), barra.lastChild);
    window.addEventListener('keydown', teclasFoto); window.addEventListener('keyup', teclasFoto);
    S.raiz.append(vin, panel, pad, barra); GM.ui.toast('Modo foto: arrastra para girar, rueda o pellizco para acercar; «Ajustes» para hora, clima, exposición y más');
  }
  // ---------- Paneles de sala (menús dentro del mundo) ----------
  const destino = sala => { const d = sala.destino.todos || sala.destino[S.st.modo]; return d && GM.ui.screens[d] ? d : null; };
  function mostrarAviso(zona) {
    if (S.construccion) { if (S.panel) S.panel.style.display = 'none'; S.zonaActual = null; return; }
    if (!zona) { if (S.zonaActual) { S.zonaActual = null; if (!S.panelFijo) S.panel.style.display = 'none'; } return; }
    if (S.zonaActual === zona) return; S.zonaActual = zona; S.panelFijo = false; abrirSala(zona.sala);
    { const st = S.st, k = S.escena + (S.escenaArg ? ':' + S.escenaArg : ''); st.sede = st.sede || { charlas: {} }; const V = st.sede.visitadas = st.sede.visitadas || {}; (V[k] = V[k] || {})[zona.sala.id] = 1; }
  }
  function ejecutar(id, sala) {
    const r = GM.mods.sedeAcciones.hacer(S.st, id); GM.ui.toast(r.ok ? r.texto : r.motivo);
    if (r.ok) reaccion(r.texto, sala); abrirSala(sala);
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
  const barra = (t, v) => GM.h('div', { class: 'sp-barra-mini' }, GM.h('span', null, t), GM.h('i', null, GM.h('u', { style: { width: Math.round(v) + '%' } })));
  function avanzar(fn) {
    if (!S || S.cambiando) return; S.cambiando = true;
    const velo = GM.h('div', { class: 'sede-velo sede-dia-nuevo' }); S.raiz.append(velo);
    setTimeout(() => {
      fn();
      setTimeout(() => {
        if (!S) return; const d = estadoDia(S.st);
        velo.append(GM.h('b', null, U.fechaLarga(S.st.fecha)), GM.h('span', null, d.texto));
        S.hora = 8; hud(S.st); if (S.escena === 'pueblo') { S.cambiando = false; cambiarEscena('pueblo'); } else repoblar(); if (S.zonaActual) abrirSala(S.zonaActual.sala, 'partido');
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
  const _a = new THREE.Vector3(), _b = new THREE.Vector3();
  function manos(n, out) { const f = n.obj.rotation.y, h = (n.altura || 190) / 100; return out.set(n.obj.position.x + Math.sin(f) * 0.32, h * 0.55, n.obj.position.z + Math.cos(f) * 0.32); }
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
  // ---------- Clima: el tiempo de cada día (según la fecha, el mes y el país), nubes, lluvia y suelo mojado ----------
  const TEMP = { ES: [11, 27], IT: [8, 26], GR: [12, 29], TR: [7, 27], DE: [2, 20], LT: [-3, 19], RS: [1, 24], FR: [5, 21], US: [2, 25] };
  function climaDe(st) {
    { const CC = GM.climaCiudad && GM.climaCiudad[st.clubId]; if (CC) {   // clima medio real de la ciudad (2015-2024): máxima, mínima, días de lluvia y de nieve de cada mes
        const mes = +st.fecha.slice(5, 7), az = f => (U.hash(f + 'clima' + st.clubId) >>> 0) / 4294967296, tipoDe = (f, m) => { const r = CC[m - 1], h = az(f); return h < r[3] / 100 ? 'nieve' : h < (r[3] + r[2]) / 100 ? 'lluvia' : h < (r[3] + r[2]) / 100 + 0.27 ? 'nubes' : 'sol'; };
        const r = CC[mes - 1], tipo = tipoDe(st.fecha, mes), ay = U.addDays(st.fecha, -1), tAyer = tipoDe(ay, +ay.slice(5, 7)), temp = Math.round(r[0] * 0.72 + r[1] * 0.28 - (tipo === 'lluvia' ? 2 : tipo === 'nubes' ? 1 : 0) + (az(st.fecha + 't') * 5 - 2.5));
        return { tipo, temp, ayer: tAyer === 'lluvia' || tAyer === 'nieve', nieve: tipo === 'nieve' ? 1 : tAyer === 'nieve' && temp <= 4 ? 0.5 : 0, texto: (tipo === 'nieve' ? 'Nieve' : tipo === 'lluvia' ? 'Lluvia' : tipo === 'nubes' ? 'Nublado' : 'Soleado') + ', ' + temp + ' °C' }; } }
    const p = (st.equipos[st.clubId] || {}).pais, mes = +st.fecha.slice(5, 7), inv = [11, 12, 1, 2, 3].indexOf(mes) >= 0, ver = [6, 7, 8].indexOf(mes) >= 0;
    const pl = p === 'US' ? 0.14 : ['DE', 'LT', 'RS', 'FR'].indexOf(p) >= 0 ? (inv ? 0.3 : 0.18) : (inv ? 0.18 : ver ? 0.04 : 0.11);
    const az = f => (U.hash(f + 'clima' + st.clubId) >>> 0) / 4294967296, h = az(st.fecha), ayer = az(U.addDays(st.fecha, -1)) < pl;
    let tipo = h < pl ? 'lluvia' : h < pl + 0.26 ? 'nubes' : 'sol'; const b = TEMP[p] || [8, 24], f = (1 - Math.cos((mes - 1) / 12 * Math.PI * 2)) / 2;
    const SO = GM.mods.sol, dLat = SO ? (SO.latitudPais(st) - SO.latitud(st)) * 0.5 : 0;   // dentro de un país, cada ciudad más al norte es más fría
    const temp = Math.round(b[0] + (b[1] - b[0]) * f + dLat - (tipo === 'lluvia' ? 3 : tipo === 'nubes' ? 1 : 0) + (az(st.fecha + 't') * 4 - 2));
    if (tipo === 'lluvia' && temp <= 1) tipo = 'nieve';
    return { tipo, temp, ayer, nieve: tipo === 'nieve' ? 1 : ayer && temp <= 2 ? 0.5 : 0, texto: (tipo === 'nieve' ? 'Nieve' : tipo === 'lluvia' ? 'Lluvia' : tipo === 'nubes' ? 'Nublado' : 'Soleado') + ', ' + temp + ' °C' };
  }
  const exterior = () => ['calle', 'pueblo', 'deportiva'].indexOf(S.escena) >= 0;
  let texNube = null;
  function montarClima() {
    if (S.mundo) { const viejos = []; S.mundo.children.forEach(o => { if (o.userData && (o.userData.nubes || o.userData.cielo || o.userData.climaObj)) viejos.push(o); }); viejos.forEach(o => S.mundo.remove(o)); }   // al cambiar el clima se quitan lluvia, nieve, nubes y cielo anteriores
    S.lluviaObj = null; S.nubesObj = null; S.nieveObj = null; S.fogBase = null; if (!exterior() || !S.mundo) return; const C = S.clima;
    if (!texNube && typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext && c.getContext('2d'); if (x) { for (let i = 0; i < 7; i++) { const cx = 30 + i * 11, cy = 64 + Math.sin(i * 1.7) * 12, r = 22 + (i % 3) * 8, g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }
      x.globalCompositeOperation = 'source-atop'; { const sh = x.createLinearGradient(0, 30, 0, 100); sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(95,108,130,0.6)'); x.fillStyle = sh; x.fillRect(0, 0, 128, 128); }   // luz arriba y base gris
      texNube = new THREE.CanvasTexture(c); } }
    const nN = C.tipo === 'lluvia' || C.tipo === 'nieve' ? 22 : C.tipo === 'nubes' ? 16 : 5, gN = new THREE.Group(); gN.userData = { nubes: true };
    if (texNube) for (let i = 0; i < nN; i++) { const m = new THREE.SpriteMaterial({ map: texNube, color: C.tipo === 'sol' ? 0xffffff : C.tipo === 'nubes' ? 0xd5dbe2 : C.tipo === 'nieve' ? 0xc4cad2 : 0x9ea7b0, transparent: true, opacity: 0.85, depthWrite: false, fog: false }), s = new THREE.Sprite(m); const a = i * 2.39, d = 60 + (i * 37) % 140; s.position.set(Math.cos(a) * d, 55 + (i % 5) * 8, Math.sin(a) * d); s.scale.set(70 + (i % 4) * 20, 30 + (i % 3) * 8, 1); gN.add(s);
      for (const [dx, dy, dz, k, op] of [[0.32, 0.1, -3, 0.7, 0.8], [-0.38, -0.05, 3, 0.8, 0.7]]) { const s2 = new THREE.Sprite(m.clone()); s2.material.opacity = op * 0.85; s2.position.set(s.position.x + dx * s.scale.x, s.position.y + dy * s.scale.y, s.position.z + dz); s2.scale.set(s.scale.x * k, s.scale.y * k, 1); gN.add(s2); } }
    S.mundo.add(gN); S.nubesObj = gN;
    montarCieloNoche(C);
    if (C.tipo === 'nieve') { const N = 2600, pos = new Float32Array(N * 3); for (let i = 0; i < N; i++) pos.set([(Math.random() - 0.5) * 70, Math.random() * 28, (Math.random() - 0.5) * 70], i * 3); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const pn = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2.6, sizeAttenuation: false, transparent: true, opacity: 0.85, depthWrite: false })); pn.frustumCulled = false; pn.userData.climaObj = true; S.mundo.add(pn); S.nieveObj = pn; }
    if (C.tipo === 'lluvia') { const N = 3500, pos = new Float32Array(N * 6); for (let i = 0; i < N; i++) { const x = (Math.random() - 0.5) * 70, y = Math.random() * 28, z = (Math.random() - 0.5) * 70; pos.set([x, y, z, x + 0.05, y - 0.55, z], i * 6); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xaebfcf, transparent: true, opacity: 0.45, depthWrite: false })); l.frustumCulled = false; l.userData = { lluvia: true, climaObj: true }; S.mundo.add(l); S.lluviaObj = l; }
  }
  // Estrellas y luna con fases (según la fecha): un grupo pegado a la cámara que aparece al caer la noche con cielo despejado
  function montarCieloNoche() {
    S.cieloNoche = null; if (!exterior() || !S.mundo || typeof document === 'undefined') return;
    const g = new THREE.Group(); g.userData = { cielo: true };
    const N = 750, pos = new Float32Array(N * 3), r = rnd(U.hash('estrellas' + S.st.clubId));
    for (let i = 0; i < N; i++) { const a = r() * 6.2832, e = 0.12 + r() * 1.35, d = 170; pos.set([Math.cos(a) * Math.cos(e) * d, Math.sin(e) * d, Math.sin(a) * Math.cos(e) * d], i * 3); }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const est = new THREE.Points(gg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.7, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false })); est.frustumCulled = false; est.renderOrder = -2; g.add(est);
    const dias = (Date.UTC(+S.st.fecha.slice(0, 4), +S.st.fecha.slice(5, 7) - 1, +S.st.fecha.slice(8, 10)) - Date.UTC(2000, 0, 6)) / 864e5, fase = ((dias % 29.530588) + 29.530588) % 29.530588 / 29.530588, k = (1 - Math.cos(fase * 6.2832)) / 2;
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    if (x) { const halo = x.createRadialGradient(64, 64, 30, 64, 64, 64); halo.addColorStop(0, 'rgba(210,225,255,0.35)'); halo.addColorStop(1, 'rgba(210,225,255,0)'); x.fillStyle = halo; x.fillRect(0, 0, 128, 128);
      for (let yy = -40; yy <= 40; yy++) { const w = Math.sqrt(1600 - yy * yy), xr = fase < 0.5 ? 64 + w : 64 + w * (2 * k - 1) * -1 + 0, xl = fase < 0.5 ? 64 + w * (1 - 2 * k) : 64 - w; const a0 = fase < 0.5 ? 64 + w * (1 - 2 * k) : 64 - w, a1 = fase < 0.5 ? 64 + w : 64 - w * (1 - 2 * k); x.fillStyle = '#f1ecd9'; x.fillRect(Math.min(a0, a1), 64 + yy, Math.abs(a1 - a0), 1); } }
    const luna = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: false })); luna.scale.setScalar(16); luna.renderOrder = -1; g.add(luna);
    S.mundo.add(g); S.cieloNoche = { g, est, luna };
  }
  function moverClima(dt) {
    if (S.cieloNoche) { const cn = S.cieloNoche, C = S.clima || { tipo: 'sol' }, vis = Math.max(0, Math.min(1, (S.noche - 0.35) / 0.4)) * (C.tipo === 'sol' ? 1 : C.tipo === 'nubes' ? 0.35 : 0); cn.g.position.copy(S.camera.position); cn.est.material.opacity = vis * 0.9; cn.luna.material.opacity = vis;
      const l = S.luces.sol, dx = l.position.x - l.target.position.x, dz = l.position.z - l.target.position.z, hh = Math.hypot(dx, dz) || 1, el = 0.6; cn.luna.position.set(-dx / hh * Math.cos(el) * 165, Math.sin(el) * 165, -dz / hh * Math.cos(el) * 165); cn.g.visible = vis > 0.01; }
    if (S.nieveObj) { const a = S.nieveObj.geometry.attributes.position, v = a.array, b = dt * 1.7, t = performance.now() / 1000; for (let i = 0; i < v.length; i += 3) { v[i + 1] -= b * (0.8 + (i % 7) * 0.08); v[i] += Math.sin(t * 0.9 + i) * dt * 0.35; if (v[i + 1] < 0) v[i + 1] += 28; } a.needsUpdate = true; S.nieveObj.position.set(S.foco.x, 0, S.foco.z); }
    if (S.nubesObj) { S.nubesObj.position.x += dt * 1.6; S.nubesObj.position.z = S.foco.z * 0.6; if (S.nubesObj.position.x - S.foco.x > 120) S.nubesObj.position.x -= 240; }
    if (S.lluviaObj) { const a = S.lluviaObj.geometry.attributes.position, v = a.array, b = dt * 17; for (let i = 0; i < v.length; i += 6) { v[i + 1] -= b; v[i + 4] -= b; v[i] += b * 0.06; v[i + 3] += b * 0.06; if (v[i + 4] < 0) { v[i + 1] += 28; v[i + 4] += 28; } } a.needsUpdate = true; S.lluviaObj.position.set(S.foco.x, 0, S.foco.z); }
  }
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

  // ---------- Gente ----------
  async function poblar(st) {
    const P = GM.sedePlano, eq = st.equipos[st.clubId], r = rnd(U.hash(st.clubId + st.fecha));
    S.gente.forEach(n => { acabarTiro(n); S.mundo.remove(n.obj); n.mixer.stopAllAction(); }); S.gente = []; S.ocupados = new Set();
    S.dia = estadoDia(st); S.clima = climaDe(st); montarClima(); if (GM.sonido) GM.sonido.escena(S.escena, S.escenaArg); aplicarAmbiente(); if (S.grupo) disolver(); S.tGrupo = 6;
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
    const renderer = new THREE.WebGLRenderer({ antialias: alta }); const nv = (GM.campus && GM.campus.config.nivel) || 'alto'; renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, nv === 'ultra' ? 2.5 : alta ? 2 : nv === 'bajo' ? 1 : 1.25));
    renderer.shadowMap.enabled = alta; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; if (EXP_PREV) { renderer.toneMappingExposure = EXP_PREV.v * (EXP_PREV.ext === (['sede', 'casa', 'interior'].indexOf(escena || 'sede') < 0) ? 1 : EXP_PREV.ext ? 0.8 : 1.2); }   // el ojo viene adaptado de la escena anterior
    lienzo.append(renderer.domElement); renderer.domElement.style.touchAction = 'none';
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x9fb8c8);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 200);
    const cielo = new THREE.HemisphereLight(0xdfe8f2, 0x6b5a48, 1.1); scene.add(cielo);
    const lamparas = alta && ['calle', 'pueblo'].indexOf(escena || 'sede') >= 0 ? [0, 1].map(() => { const l = new THREE.PointLight(0xffc27a, 0, 20, 2); l.position.set(0, 4.3, 0); scene.add(l); return l; }) : null;   // intensidad 0 de día: así el shader no se recompila al anochecer
    const sol = new THREE.DirectionalLight(0xfff1dc, 2.6); sol.position.set(-14, 26, 12); sol.castShadow = true; { const ms = nv === 'ultra' ? 3072 : ['sede', 'casa', 'interior'].indexOf(escena || 'sede') >= 0 ? 1536 : 2048; sol.shadow.mapSize.set(ms, ms); }   // medido con tools/gpu_tiempo.js: la sombra es lo más caro
    Object.assign(sol.shadow.camera, { left: -26, right: 26, top: 20, bottom: -20, near: 1, far: 70 }); sol.shadow.bias = -0.0005; sol.shadow.normalBias = 0.02; sol.shadow.radius = 4; sol.shadow.blurSamples = 12; scene.add(sol, sol.target);
    // Cascada lejana (solo Ultra): segunda luz solar con un mapa de 260 m que reparte con la cercana, así las sombras llegan a las calles de alrededor
    let sol2 = null; if (alta && nv === 'ultra') { sol2 = new THREE.DirectionalLight(0xfff1dc, 1); sol2.castShadow = true; sol2.shadow.mapSize.set(1536, 1536); Object.assign(sol2.shadow.camera, { left: -130, right: 130, top: 110, bottom: -110, near: 1, far: 260 }); sol2.shadow.bias = -0.001; sol2.shadow.normalBias = 0.06; sol2.shadow.radius = 3; scene.add(sol2, sol2.target); }
    S = { hora: 8, luces: { cielo, sol, sol2 }, lamparas, st, raiz, renderer, scene, camera, escena: escena || 'sede', escenaArg: argEsc, gente: [], ocupados: new Set(), flotantes: [], reloj: new THREE.Timer(), yaw: 0, yawObj: 0, zoom: 22, foco: new THREE.Vector3(6, 0, 10), teclas: {}, vivo: true };
    hud(st);
    if (alta && THREE.EffectComposer && renderer.capabilities && renderer.capabilities.isWebGL2) { try {
      const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 }), comp = new THREE.EffectComposer(renderer, rt);
      comp.addPass(new THREE.RenderPass(scene, camera));
      const ao = new THREE.GTAOPass(scene, camera, 4, 4); ao.blendIntensity = nv === 'ultra' ? 0.9 : 0.75; ao.updateGtaoMaterial({ radius: nv === 'ultra' ? 0.9 : 0.6, distanceExponent: 1.2, thickness: 1, scale: 1 }); ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 }); { const set0 = ao.setSize.bind(ao), mitad = nv === 'ultra' ? 0.75 : 0.5; ao.setSize = (w, h) => set0(Math.max(2, Math.round(w * mitad)), Math.max(2, Math.round(h * mitad))); }   // el AO se calcula a menos resolución (es lo más caro del posprocesado)
      // En exteriores el AO repite toda la escena para sacar normales (≈8 ms en una iGPU): solo en Ultra; en interiores, que son pequeños, siempre
      ao.enabled = ['calle', 'pueblo', 'deportiva'].indexOf(escena || 'sede') < 0 || nv === 'ultra';
      comp.addPass(ao);
      const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), 0.28, 0.5, 1.6); comp.addPass(bloom);
      // Solo en modo foto: profundidad de campo (se enfoca al personaje) y rayos de luz (desenfoque radial desde el sol, tras el tono)
      let bokeh = null; if (THREE.BokehPass) { bokeh = new THREE.BokehPass(scene, camera, { focus: 20, aperture: 0.00015, maxblur: 0.008 }); bokeh.enabled = false; comp.addPass(bokeh); }
      comp.addPass(new THREE.OutputPass());
      let rayos = null; if (THREE.ShaderPass) { rayos = new THREE.ShaderPass({ uniforms: { tDiffuse: { value: null }, sol: { value: new THREE.Vector2(0.5, 0.5) }, fuerza: { value: 0.55 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: 'uniform sampler2D tDiffuse; uniform vec2 sol; uniform float fuerza; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 d = (sol - vUv) / 28.0; vec2 uv = vUv; float peso = 1.0; vec3 acc = vec3(0.0); for (int i = 0; i < 28; i++) { uv += d; vec3 t = texture2D(tDiffuse, uv).rgb; float l = max(0.0, dot(t, vec3(0.3, 0.59, 0.11)) - 0.78); acc += t * l * peso; peso *= 0.955; } gl_FragColor = vec4(c.rgb + acc * fuerza * 0.35, c.a); }' }); rayos.enabled = false; comp.addPass(rayos); }
      // Gradación final (ya en sRGB): tono cálido suave, un poco de contraste en las medias y ruido de dithering contra las bandas del cielo
      if (THREE.ShaderPass) { const gr = new THREE.ShaderPass({ uniforms: { tDiffuse: { value: null }, calido: { value: 0.5 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: 'uniform sampler2D tDiffuse; uniform float calido; varying vec2 vUv; float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); } void main(){ vec4 c = texture2D(tDiffuse, vUv); vec3 x = c.rgb; x = mix(x, x * x * (3.0 - 2.0 * x), 0.18); x *= vec3(1.0 + 0.035 * calido, 1.0 + 0.008 * calido, 1.0 - 0.045 * calido); x += (h(vUv * 1531.0) - 0.5) / 255.0; gl_FragColor = vec4(x, c.a); }' }); comp.addPass(gr); S.grado = gr; }
      S.composer = comp; S.ao = ao; S.bloom = bloom; S.bokeh = bokeh; S.rayos = rayos; } catch (e) { S.composer = null; console.warn('Sin posprocesado:', e.message); } }
    const tam = () => { const w = lienzo.clientWidth || window.innerWidth, hh = lienzo.clientHeight || window.innerHeight; renderer.setSize(w, hh); camera.aspect = w / hh; camera.updateProjectionMatrix(); if (S.composer) { S.composer.setPixelRatio(Math.min(renderer.getPixelRatio(), 1.5)); S.composer.setSize(w, hh); } };
    tam(); S.onResize = tam; window.addEventListener('resize', tam);
    if (nivelRend()) aplicarRend(nivelRend(), false);
    try { const er = +window.localStorage.getItem('gm1:escalaRes'); if (er && er < 1 && er >= 0.6) setTimeout(() => { if (S) aplicarRes(er); }, 100); } catch (e) { }   // lo que se aprendió en escenas anteriores de este dispositivo
    const CONSEJOS = ['Toca el reloj para pasar una hora y ver cómo cambia la ciudad.', 'Doble toque (o doble clic) para correr.', 'En el mapa, «Ir ya» te lleva al momento a los sitios que ya conoces.', 'Las palomas salen volando si pasas corriendo.', 'El día de partido en casa, a las 19:00 llega el autobús del equipo.', 'El botón Foto quita la interfaz para hacer capturas.', 'Cuando llueve hay menos gente por la calle y el suelo refleja.'];
    const barraC = h('div', { class: 'carga-barra' }, h('span')), consejo = h('p', { class: 'carga-consejo' }, CONSEJOS[(Date.now() / 1000 | 0) % CONSEJOS.length]);
    const cargando = h('div', { class: 'sede-hud sede-cargando' }, h('div', { class: 'carga-caja' }, h('b', null, S.escena === 'pueblo' ? 'Llegando al pueblo…' : S.escena === 'calle' ? 'Saliendo a la calle…' : S.escena === 'deportiva' ? 'Llegando a la ciudad deportiva…' : S.escena === 'casa' ? 'Entrando en casa…' : 'Abriendo la sede del club…'), barraC, consejo)); raiz.append(cargando);
    { const LM = THREE.DefaultLoadingManager, previo = LM.onProgress; LM.onProgress = (u, n, total) => { const sp = barraC.firstChild; if (sp && total) sp.style.width = Math.round(n / total * 100) + '%'; if (previo) previo(u, n, total); }; }
    const fm = n => { if (S && window.__medirFases) (S.fasesAbrir = S.fasesAbrir || []).push([n, +performance.now().toFixed(0)]); }; fm('abrir');
    // Mientras los trabajadores del navegador decodifican las texturas KTX2 (y el hilo principal espera), se adelanta la carga y el análisis de los modelos de personas y, en la sede, de los muebles
    try { const nombres = new Set(['animaciones']); Object.values(PERSONAS).forEach(v => (Array.isArray(v) ? v : [v]).forEach(x => x && nombres.add(x))); ((GM.calle && GM.calle.util && GM.calle.util.MODELOS) || []).forEach(x => nombres.add(x)); nombres.forEach(n => cargar('modelos/personas/' + n + '.glb').catch(() => { }));
      if (S.escena === 'sede' && GM.sedePlano && GM.sedePlano.muebles) new Set(GM.sedePlano.muebles.map(m => m[0])).forEach(n => { mueble(n).catch(() => { }); }); } catch (e) { }
    (GM.texturas ? GM.texturas.precargar(S.renderer) : Promise.resolve()).then(() => { fm('texturas'); return construir(st); }).then(async () => { fm('construir (total)');
      // Mientras se cargan las personas no se dibuja (la pantalla de carga las tapa) y los shaders de la ciudad se compilan en paralelo: así el primer fotograma no se bloquea compilándolos uno a uno
      S.sinDibujar = true;
      const compilar = async () => { try { const ocultos = []; S.scene.traverse(o => { if (!o.visible && (o.isMesh || o.isSprite || o.isPoints || o.isLine)) { o.visible = true; ocultos.push(o); } }); await (renderer.compileAsync ? renderer.compileAsync(S.scene, S.camera) : Promise.resolve(renderer.compile(S.scene, S.camera))); ocultos.forEach(o => { o.visible = false; }); } catch (e) { } };
      const compCiudad = compilar();
      const yo = await personaje(aspecto(st)); { const sp = S.escena === 'pueblo' && S.spawnPueblo ? S.spawnPueblo : S.escena === 'calle' && S.spawnCalle ? S.spawnCalle : S.escena === 'casa' && S.spawnCasa ? S.spawnCasa : S.escena === 'interior' && S.spawnInterior ? S.spawnInterior : S.escena === 'deportiva' && S.spawnDeportiva ? S.spawnDeportiva : { x: GM.sedePlano.entrada.x, z: 12.5, ry: Math.PI }; yo.obj.position.set(sp.x, 0, sp.z); yo.obj.rotation.y = sp.ry; S.foco.set(sp.x, 0, sp.z); } S.yo = yo; anim(yo, 'idle'); S.mundo.add(yo.obj);
      const marca = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.45, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd54a })); marca.position.y = 0.02; yo.obj.add(marca); marca.scale.setScalar(1 / yo.obj.scale.x);
      if (S.escena !== 'sede') hud(st);   // la cabecera usa datos de la escena (nombre del pueblo)
      fm('personaje'); await poblar(st); fm('poblar'); await compCiudad; await compilar(); S.sinDibujar = false; fm('compilar shaders'); cargando.remove();
    }).catch(e => { cargando.textContent = 'No se ha podido cargar la sede: ' + e.message; console.error(e); });
    controles(renderer.domElement);
    (function bucle() {
      if (!S || !S.vivo) return; S.raf = requestAnimationFrame(bucle); if (S.pausa) return;
      S.reloj.update(); const dt = Math.min(0.05, S.reloj.getDelta()), t = S.reloj.getElapsed();
      rendimiento();
      if (S.yo) { teclado(dt); moverPaso(S.yo, dt); if (!S.yo.sentado) S.yo.mixer.update(dt); else if (S.yo.bici && S.yo.actual === 'bici') pedalear(S.yo, dt); if (!S.construccion) S.foco.lerp(S.yo.obj.position, Math.min(1, dt * 4)); zonaCercana(); }
      if (S.redes) moverRedes(dt); charlas(dt);
      S.cuadro = (S.cuadro || 0) + 1;
      if (!S.enFoto) S.hora = Math.min(23, (S.hora || 9) + dt / 40); S.tLuz = (S.tLuz || 0) - dt; if (S.tLuz <= 0) { S.tLuz = 0.5; aplicarAmbiente();
        if (S.lamparas && S.farolasPos && S.noche > 0.02) { const ord = S.farolasPos.map(q => [Math.hypot(q[0] - S.foco.x, q[1] - S.foco.z), q]).sort((a, b) => a[0] - b[0]); S.lamparas.forEach((l, i) => { const q = ord[i] && ord[i][1]; if (q) l.position.set(q[0], 4.3, q[1]); }); } }
      // fundido entre cielos HDRI: baja la luz de reflejos, cambia de cielo y vuelve a subirla
      if (S.hdriPend) { S.envMult = Math.max(0.3, (S.envMult == null ? 1 : S.envMult) - dt * 3); if (S.envMult <= 0.3) cambiarCielo(); } else if (S.envMult != null && S.envMult < 1) S.envMult = Math.min(1, S.envMult + dt * 1.5);
      if (S.scene.environment && S.envObj != null && S.envMult != null) S.scene.environmentIntensity = S.envObj * S.envMult;
      if (S.expObj) { const ex = S.renderer.toneMappingExposure, obj = S.expObj * (S.enFoto && S.expFoto ? S.expFoto : 1); EXP_PREV = { v: ex, ext: exterior() }; S.renderer.toneMappingExposure = Math.abs(ex - obj) < 0.002 ? obj : ex + (obj - ex) * Math.min(1, dt * 1.5); }
      if (S.gente.length && S.escena === 'sede') actualizarGrupo(dt);
      if (S.escena === 'calle' && GM.calle) GM.calle.actualizar(S, motor(), dt);
      if (S.escena === 'interior' && GM.interiores && GM.interiores.actualizar) GM.interiores.actualizar(S, motor(), dt);
      if (S.mascota && GM.mods.vida) GM.mods.vida.moverMascota(S, dt);
      if (S.lluviaObj || S.nubesObj) moverClima(dt);
      if (S.escena === 'deportiva' && GM.deportivaMundo && GM.deportivaMundo.actualizar) GM.deportivaMundo.actualizar(S, motor(), dt);
      if (S.escena === 'pueblo' && GM.puebloMundo) GM.puebloMundo.actualizar(S, motor(), dt);
      { const sol = S.luces.sol, SO = GM.mods.sol, d = SO && S.st ? SO.direccion(SO.latitud(S.st), S.st.fecha, SO.horaSolar(S.st, S.hora || 9), 0.3) : { x: -0.45, y: 0.84, z: 0.39 }; // la sombra cubre lo que se ve (crece con el zoom) y el foco se redondea al texel para que no tiemble al caminar
      const mitad = Math.max(22, Math.min(58, S.zoom * 1.1 + 6)), q = 2 * mitad / sol.shadow.mapSize.x * 4, fx = Math.round(S.foco.x / q) * q, fz = Math.round(S.foco.z / q) * q;
      if (Math.abs(mitad - (S.sombraMitad || 0)) > 1.5) { S.sombraMitad = mitad; const c = sol.shadow.camera; c.left = -mitad; c.right = mitad; c.top = mitad * 0.8; c.bottom = -mitad * 0.8; c.updateProjectionMatrix(); }
      sol.position.set(fx + d.x * 31, d.y * 31, fz + d.z * 31); sol.target.position.set(fx, 0, fz); sol.target.updateMatrixWorld();
        const l2 = S.luces.sol2; if (l2) { const q2 = 260 / 2048 * 8, gx = Math.round(S.foco.x / q2) * q2, gz = Math.round(S.foco.z / q2) * q2; l2.position.set(gx + d.x * 120, d.y * 120, gz + d.z * 120); l2.target.position.set(gx, 0, gz); l2.target.updateMatrixWorld(); } }
      S.gente.forEach(n => {
        if (!n.fijo) { if (n.grupo) { if (n.camino && n.camino.length) moverPaso(n, dt); } else if (n.camino && n.camino.length) moverPaso(n, dt); else if ((n.espera -= dt) <= 0) siguienteActividad(n); }
        const dP = Math.hypot(n.obj.position.x - S.foco.x, n.obj.position.z - S.foco.z); if (S.nivelRend >= 2) n.obj.visible = dP < (S.nivelRend >= 3 ? 20 : 28);   // ahorro de CPU: los muy lejanos no se dibujan
        if (!n.sentado && n.obj.visible) { n.dtAcum = (n.dtAcum || 0) + dt; const cada = dP <= (S.nivelRend >= 2 ? 8 : 12) ? 1 : S.nivelRend >= 2 ? 3 : 2; if (cada === 1 || S.cuadro % cada === n.obj.id % cada) { n.mixer.update(n.dtAcum); n.dtAcum = 0; } } if (n.tiro) actualizarTiro(n, dt); if (n.grupoBrazos) brazos(n, n.grupoBrazos, _b.set(Math.sin(n.obj.rotation.y), 0, Math.cos(n.obj.rotation.y)));
        if (n.cabizbajo && !n.sentado) cabeza(n, 0.8);
      });
      saludos(dt);
      { const lim = S.zoom * 1.5 + 8; S.gente.forEach(n => { const dq = Math.hypot(n.obj.position.x - S.foco.x, n.obj.position.z - S.foco.z), v = !n.oculto && dq < lim; n.obj.visible = v;
        { const cerca = v && dq < 26; if (cerca !== n._sombra) { n._sombra = cerca; n.obj.traverse(o => { if (o.isMesh) o.castShadow = cerca; }); } }   // solo proyectan sombra quienes están cerca: el dibujo de la sombra repetía a todos con sus 62 huesos
        // el esqueleto de quien no se ve (62 huesos por persona) no recalcula sus matrices: ahorra más de la mitad de updateMatrixWorld
        if (v) { if (n.obj.hasOwnProperty('updateMatrixWorld')) { delete n.obj.updateMatrixWorld; n.obj.matrixWorldNeedsUpdate = true; } } else if (!n.obj.hasOwnProperty('updateMatrixWorld')) n.obj.updateMatrixWorld = NOP_MATRIZ; }); } // fuera de la vista no se dibuja ni se anima
      if (S.zonas) S.zonas.forEach(z => z.obj.userData.anim(t));
      if (S.flotantes.length) moverFlotantes(dt);
      S.yaw += (S.yawObj - S.yaw) * Math.min(1, dt * 6);
      if (S.enFoto && S.camLibre) {   // cámara libre: WASD o flechas, Q y E para bajar y subir, Mayús para ir rápido; arrastrar para girar; rueda o pellizco para avanzar
        const L = S.camLibre, T = S.fotoTeclas || {}, v = (T.shift ? 24 : 7) * dt, fx = -Math.sin(L.yaw), fz = -Math.cos(L.yaw), rx = Math.cos(L.yaw), rz = -Math.sin(L.yaw);
        let av = (T.w || T.arrowup ? 1 : 0) - (T.s || T.arrowdown ? 1 : 0), la = (T.d || T.arrowright ? 1 : 0) - (T.a || T.arrowleft ? 1 : 0), su = (T.e ? 1 : 0) - (T.q ? 1 : 0);
        { const gp = navigator.getGamepads && [...navigator.getGamepads()].find(q => q && q.connected); if (gp) { const z = a => Math.abs(a) < 0.15 ? 0 : a; av += -z(gp.axes[1] || 0); la += z(gp.axes[0] || 0); L.yaw -= z(gp.axes[2] || 0) * dt * 1.8; L.pitch = Math.max(-1.4, Math.min(1.4, L.pitch - z(gp.axes[3] || 0) * dt * 1.4)); su += ((gp.buttons[7] && gp.buttons[7].value) || 0) - ((gp.buttons[6] && gp.buttons[6].value) || 0); } }
        L.pos.x += (fx * av + rx * la) * v; L.pos.z += (fz * av + rz * la) * v; L.pos.y = Math.max(0.4, Math.min(120, L.pos.y + su * v));
        camera.position.copy(L.pos); camera.rotation.order = 'YXZ'; camera.rotation.set(L.pitch, L.yaw, 0); camera.far = 600;
      } else {
      const inc = S.inc || 0.95, d = S.zoom; camera.position.set(S.foco.x + Math.sin(S.yaw) * Math.cos(inc) * d, Math.sin(inc) * d, S.foco.z + Math.cos(S.yaw) * Math.cos(inc) * d); camera.lookAt(S.foco.x, 0.6, S.foco.z); camera.far = 200; }
      // el mapa de sombras se refresca un fotograma de cada dos (la sombra es lo más caro del dibujo); en Ultra, cada uno
      if (renderer.shadowMap.enabled) { S.nSombra = ((S.nSombra || 0) + 1) % 4; const l1 = S.luces.sol.shadow, l2 = S.luces.sol2 && S.luces.sol2.shadow; l1.autoUpdate = false; l1.needsUpdate = nv === 'ultra' || S.nSombra % 2 === 0; if (l2) { l2.autoUpdate = false; l2.needsUpdate = S.nSombra === 0; } }   // sombra cercana a medio ritmo (cada fotograma en Ultra) y la lejana a un cuarto
      if (S.enFoto && S.composer) {   // modo foto: enfoque al personaje y rayos desde el sol
        if (S.bokeh && S.bokeh.enabled) S.bokeh.uniforms.focus.value = S.enfoqueManual != null ? S.enfoqueManual : camera.position.distanceTo(S.yo ? S.yo.obj.position : S.foco);
        if (S.rayos && S.rayos.enabled) { const l = S.luces.sol, dir = new THREE.Vector3().subVectors(l.position, l.target.position).normalize(), p = camera.position.clone().addScaledVector(dir, 800).project(camera), delante = dir.dot(new THREE.Vector3().subVectors(l.target.position, camera.position).normalize()) > 0; S.rayos.uniforms.sol.value.set(p.x * 0.5 + 0.5, p.y * 0.5 + 0.5); S.rayos.uniforms.fuerza.value = delante ? 0.55 * (1 - S.noche) : 0;
          // el cielo no tiene disco solar: se pone un resplandor suave (sprite aditivo) en la dirección del sol, solo con los rayos activados
          if (!S.solSprite) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,250,235,1)'); g.addColorStop(0.12, 'rgba(255,240,205,0.9)'); g.addColorStop(0.4, 'rgba(255,215,160,0.25)'); g.addColorStop(1, 'rgba(255,200,140,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); const m = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true, fog: false, toneMapped: false, transparent: true }); S.solSprite = new THREE.Sprite(m); S.solSprite.scale.setScalar(34); S.solSprite.renderOrder = 99; S.solSprite.userData.foto = true; S.scene.add(S.solSprite); }
          S.solSprite.visible = delante && S.noche < 0.6; S.solSprite.position.copy(camera.position).addScaledVector(dir, 175); }
      }
      if (!S.sinDibujar) { if (S.composer) S.composer.render(); else renderer.render(scene, camera); }
    })();
  }
  function zonaCercana() {
    const p = S.yo.obj.position; let mejor = null; S.zonas && S.zonas.forEach(z => { if (Math.hypot(z.obj.position.x - p.x, z.obj.position.z - p.z) < 1.3) mejor = z; }); mostrarAviso(mejor);
  }
  // Calidad adaptable: tras 3 s de escena se mide la fluidez real cada 2 s. Si no llega a 30 fps se baja un escalón
  // (1: resolución 1x y sin sombras en tiempo real; 2: resolución 0,8x; 3: 0,65x) y se recuerda en el dispositivo (gm1:rendimiento),
  // así la siguiente escena ya empieza ahí. Pensado para móviles Android modestos, donde no se ha podido medir.
  const NIVELES_REND = [null, 1, 0.8, 0.65];
  function nivelRend() { try { return Math.min(3, +window.localStorage.getItem('gm1:rendimiento') || 0); } catch (e) { return 0; } }
  function aplicarRend(n, avisar) {
    const r = S.renderer; if (!r || !n) return; S.nivelRend = n; if (S.composer) { S.composer.dispose && S.composer.dispose(); S.composer = null; }
    r.setPixelRatio(NIVELES_REND[n]);
    if (r.shadowMap.enabled) { r.shadowMap.enabled = false; if (S.luces && S.luces.sol) S.luces.sol.castShadow = false; if (S.luces && S.luces.sol2) S.luces.sol2.castShadow = false; S.scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.needsUpdate = true; }); }); }
    try { window.localStorage.setItem('gm1:rendimiento', String(n)); } catch (e) { }
    if (avisar && GM.ui && GM.ui.toast) GM.ui.toast('Calidad ajustada para que vaya más fluido');
  }
  function rendimiento() {
    if (typeof window !== 'undefined' && window.__sinAdaptar) return;   // capturas: no bajar la calidad
    const ahora = performance.now(), R = S.rend || (S.rend = { ini: ahora, ult: ahora, n: 0, acum: 0 });
    if (S.sinDibujar) { R.ini = ahora; R.ult = ahora; return; }   // mientras se carga no se mide
    const d = ahora - R.ult; R.ult = ahora; if (ahora - R.ini < 3000 || d > 500) return;   // arranque o pestaña en segundo plano
    R.n++; R.acum += d; if (R.acum < 2000) return;
    const fps = R.n * 1000 / R.acum; S.fps = Math.round(fps); R.n = 0; R.acum = 0;
    // Calidad dinámica en tres escalones: 1) resolución (de 1 a 0,6 en pasos de 0,12, y vuelve a subir si el juego va sobrado), 2) lo que ya había (sin sombras, menos gente...), 3) nada más
    const E = S.escalaRes || 1;
    if (fps < 40 && E > 0.61) { S.sube = 0; aplicarRes(Math.max(0.6, E - 0.12)); }
    else if (fps < 30 && (S.nivelRend || 0) < 3) aplicarRend((S.nivelRend || 0) + 1, true);
    else if (fps > 57 && E < 1) { S.sube = (S.sube || 0) + 1; if (S.sube >= 4) { S.sube = 0; aplicarRes(Math.min(1, E + 0.08)); } } else S.sube = 0;
  }
  // Escala de resolución: multiplica la densidad de píxeles con la que se dibuja (y se recuerda para la siguiente escena del dispositivo)
  function aplicarRes(e) {
    const r = S.renderer, cv = r && r.domElement; if (!cv) return; if (!S.prBase) S.prBase = r.getPixelRatio() / (S.escalaRes || 1); S.escalaRes = Math.round(e * 100) / 100; const pr = S.prBase * S.escalaRes, w = cv.clientWidth, h = cv.clientHeight;
    r.setPixelRatio(pr); if (S.composer) { S.composer.setPixelRatio(pr); S.composer.setSize(w, h); } r.setSize(w, h, false); if (S.camera) { S.camera.aspect = w / h; S.camera.updateProjectionMatrix(); }
    try { window.localStorage.setItem('gm1:escalaRes', String(S.escalaRes)); } catch (er) { }
    if (GM.ui && GM.ui.toast && e < 0.99 && !S.avisoRes) { S.avisoRes = true; GM.ui.toast('Resolución ajustada para que vaya más fluido'); }
  }
  function cerrar() {
    if (!S) return; S.vivo = false; cancelAnimationFrame(S.raf); if (GM.sonido) GM.sonido.escena(null);
    window.removeEventListener('resize', S.onResize); window.removeEventListener('keydown', S.onKey); window.removeEventListener('keyup', S.onKey);
    S.scene.traverse(n => { if (n.geometry) n.geometry.dispose(); }); S.renderer.dispose(); S.raiz.remove(); if (S.volverBtn) S.volverBtn.remove(); S = null;
    if (GM.ui.refrescar) GM.ui.refrescar();
  }
  // Árboles reales (solo en la versión de escritorio, recursos/pesados): devuelve los modelos que se puedan cargar
  async function arbolesReales(ids) { if (GM.campus && GM.campus.config.calidad !== 'alta') return []; return (await Promise.all(ids.map(id => cargar('modelos/reales/arboles/' + id + '.glb').then(g => g.scene).catch(() => null)))).filter(Boolean); }
  mapa = GM.sedeMapa({ S: () => S, irA, entrar, aEstrella, anim });
  decorar = GM.sedeDecorar({ U, textura, rnd });
  construir = GM.sedeConstruir({ S: () => S, entorno, textura, sueloMat, plano, pistaTex, mueble, rejilla, irA, zona, motor, decorar, destino, barra, exterior });
  personaje = GM.sedePersonaje({ cargar, ANIM, textura, complementos });
  ({ actualizarTiro, empezarTiro, acabarTiro } = GM.sedeTiro({ S: () => S, U, rnd, brazos, balonMat, _a, _b, manos }));
  ({ abrirSala, pintarPanel, pintarFicha, refrescarSala, reaccion } = GM.sedePaneles({ S: () => S, U, anim, cambiarEscena, destino, ejecutar, flotar, barra, avanzar, entrarClasica, repoblar }));
  ({ hud, controles, teclado } = GM.sedeHud({ S: () => S, U, mapa, anim, irA, girar, motor, modoFoto, avanzar, entrar, fichaJugador, estadoDia, abrir, cerrar }));
  ({ actualizarGrupo } = GM.sedeGrupo({ S: () => S, ARO, anim, CENTRO, crearGrupo, peto, disolver, entrenadorDice, manosDe, mirar, lanzar, irDirecto }));
  GM.sede = { arbolesReales, modeloReal: (id, ruta) => cargar(ruta || 'modelos/reales/' + id + '/' + id + '_1k.gltf').then(g => g.scene), _clima: tipo => { if (!S) return null; S.clima = Object.assign(climaDe(S.st), { tipo, ayer: false, texto: tipo === 'nieve' ? 'Nieve' : tipo === 'lluvia' ? 'Lluvia' : tipo === 'nubes' ? 'Nublado' : 'Soleado', nieve: tipo === 'nieve' ? 1 : 0 }); montarClima(); aplicarAmbiente(); return S.clima; }, pistaTex: c => pistaTex(c), motor: () => motor(), aspecto, figura, modeloMueble: n => mueble(n), brazo: (p, l, a, b, w) => brazo(p, l, a, b, w), personaje: o => personaje(o), animar: (p, n) => anim(p, n), brazos: (p, w, d) => brazos(p, w, d), abrir, cerrar, volver, activa: () => !!S, _estado: () => S, _anim: (p, n) => anim(p, n), _tiro: n => empezarTiro(n), _grupo: () => { S.tGrupo = 0; }, _escena: d => cambiarEscena(d), _motor: () => motor(), _personaje: o => personaje(o), aEstrella, rejilla };
})();
