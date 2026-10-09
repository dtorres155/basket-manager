/* TU CASA EN 3D CON MODO CONSTRUCCIÓN (GM.casa) — al estilo de Big Ambitions
   Se entra desde el portal de tu edificio en la calle. Piso diáfano en corte (muros bajos) cuyo tamaño depende del nivel de
   vida (GM.mods.hogar.nivel). Modo construcción: catálogo por categorías (modelos Kenney CC0), el mueble sigue al puntero
   ajustado a una cuadrícula de 0,5 m, verde si cabe y rojo si no; R gira; tocar un mueble colocado permite girarlo, moverlo
   o venderlo (se devuelve la mitad). Pagos con tus ahorros (GM.mods.hogar.dinero, en miles de euros).
   El confort (suma de lo que hay) mejora el descanso. Usa el motor de sede3d.js (motor()).
   Reformas: color de las paredes, tipo de suelo y luz del techo (cálida, neutra o fría); tabiques para dividir el piso (piezas
   «_tabique», hechas por código con el color de las paredes); las lámparas encienden una luz de verdad (PointLight).
   Estado: state.sede.casa = { muebles: [{ m, x, z, r }], pared, suelo, luz } (se crea al entrar por primera vez). */
(function () {
  const U = GM.util;
  // [modelo, nombre, precio k€, confort, categoría, se pisa (alfombras)]
  const CATALOGO = [
    ['bedSingle', 'Cama individual', 0.35, 4, 'Dormitorio'], ['sideTable', 'Mesilla', 0.08, 1, 'Dormitorio'], ['coatRackStanding', 'Perchero', 0.05, 0, 'Dormitorio'],
    ['loungeSofa', 'Sofá', 0.7, 5, 'Salón'], ['loungeSofaCorner', 'Sofá rinconera', 1.1, 7, 'Salón'], ['loungeChair', 'Butaca', 0.3, 2, 'Salón'], ['loungeDesignSofa', 'Sofá de diseño', 1.8, 8, 'Salón'],
    ['tableCoffee', 'Mesa de centro', 0.15, 1, 'Salón'], ['televisionModern', 'Televisor', 0.6, 3, 'Salón'], ['cabinetTelevision', 'Mueble de la tele', 0.2, 1, 'Salón'], ['speaker', 'Altavoz', 0.25, 2, 'Salón'],
    ['bookcaseOpen', 'Estantería', 0.15, 1, 'Salón'], ['bookcaseClosedDoors', 'Armario', 0.25, 1, 'Salón'],
    ['kitchenFridge', 'Nevera', 0.5, 2, 'Cocina'], ['kitchenCabinet', 'Mueble de cocina', 0.3, 1, 'Cocina'], ['kitchenBar', 'Barra', 0.25, 1, 'Cocina'], ['kitchenCoffeeMachine', 'Cafetera', 0.12, 2, 'Cocina'],
    ['table', 'Mesa de comedor', 0.25, 1, 'Cocina'], ['tableRound', 'Mesa redonda', 0.2, 1, 'Cocina'], ['chair', 'Silla', 0.05, 0, 'Cocina'], ['chairCushion', 'Silla acolchada', 0.09, 1, 'Cocina'], ['stoolBar', 'Taburete', 0.06, 0, 'Cocina'],
    ['bathroomSink', 'Lavabo', 0.2, 1, 'Baño'], ['toilet', 'Inodoro', 0.2, 1, 'Baño'], ['shower', 'Ducha', 0.45, 3, 'Baño'], ['washer', 'Lavadora', 0.35, 1, 'Baño'],
    ['desk', 'Escritorio', 0.2, 1, 'Despacho'], ['chairDesk', 'Silla de oficina', 0.12, 1, 'Despacho'], ['laptop', 'Portátil', 0.6, 2, 'Despacho', true], ['computerScreen', 'Monitor', 0.25, 1, 'Despacho', true],
    ['pottedPlant', 'Planta grande', 0.06, 1, 'Decoración'], ['plantSmall1', 'Planta pequeña', 0.02, 1, 'Decoración'], ['lampRoundFloor', 'Lámpara de pie', 0.09, 1, 'Decoración'], ['lampSquareFloor', 'Lámpara cuadrada', 0.1, 1, 'Decoración'],
    ['rugRectangle', 'Alfombra', 0.1, 1, 'Decoración', true], ['rugRound', 'Alfombra redonda', 0.08, 1, 'Decoración', true], ['radio', 'Radio', 0.04, 1, 'Decoración'], ['trashcan', 'Papelera', 0.01, 0, 'Decoración'],
    // Más piezas
    ['bedDouble', 'Cama de matrimonio', 0.7, 6, 'Dormitorio'], ['bedBunk', 'Litera', 0.45, 3, 'Dormitorio'], ['cabinetBedDrawer', 'Cómoda', 0.18, 1, 'Dormitorio'], ['sideTableDrawers', 'Mesilla con cajones', 0.1, 1, 'Dormitorio'], ['lampSquareTable', 'Lámpara de mesilla', 0.04, 1, 'Dormitorio'], ['bear', 'Peluche', 0.02, 1, 'Dormitorio'],
    ['loungeSofaLong', 'Sofá largo', 1.3, 7, 'Salón'], ['loungeChairRelax', 'Sillón reclinable', 0.5, 4, 'Salón'], ['loungeDesignChair', 'Butaca de diseño', 0.6, 3, 'Salón'], ['tableCoffeeGlass', 'Mesa de centro de cristal', 0.25, 2, 'Salón'],
    ['televisionVintage', 'Tele antigua', 0.08, 1, 'Salón'], ['bookcaseClosedWide', 'Aparador', 0.35, 1, 'Salón'], ['speakerSmall', 'Altavoz pequeño', 0.08, 1, 'Salón'], ['pillowBlue', 'Cojín', 0.01, 1, 'Salón', true],
    ['kitchenStove', 'Cocina de gas', 0.4, 2, 'Cocina'], ['kitchenSink', 'Fregadero', 0.3, 1, 'Cocina'], ['kitchenMicrowave', 'Microondas', 0.1, 1, 'Cocina'], ['kitchenFridgeLarge', 'Nevera grande', 0.9, 3, 'Cocina'], ['toaster', 'Tostadora', 0.03, 1, 'Cocina'], ['kitchenBlender', 'Batidora', 0.04, 1, 'Cocina'], ['tableCross', 'Mesa de madera', 0.3, 1, 'Cocina'],
    ['bathtub', 'Bañera', 0.8, 5, 'Baño'], ['bathroomCabinetDrawer', 'Mueble de baño', 0.2, 1, 'Baño'], ['bathroomMirror', 'Espejo', 0.06, 1, 'Baño'], ['dryer', 'Secadora', 0.35, 1, 'Baño'], ['rugDoormat', 'Felpudo', 0.01, 0, 'Baño', true],
    ['deskCorner', 'Escritorio en L', 0.35, 2, 'Despacho'], ['lampRoundTable', 'Flexo', 0.03, 1, 'Despacho'],
    ['plantSmall3', 'Cactus', 0.02, 1, 'Decoración'], ['plantSmall2', 'Planta de interior', 0.02, 1, 'Decoración'], ['bench', 'Banco', 0.06, 1, 'Decoración'], ['rugSquare', 'Alfombra cuadrada', 0.09, 1, 'Decoración', true],
    // Obra: tabiques con el color de las paredes (hechos por código)
    ['_tabique', 'Tabique de 1 m', 0.15, 0, 'Obra'], ['_tabique2', 'Tabique de 2 m', 0.28, 0, 'Obra'], ['_mampara', 'Mampara de cristal', 0.2, 1, 'Obra']
  ];
  // Reformas: [nombre, color o dibujo, precio k€]
  const PAREDES = [['Blanco roto', '#f1ede6', 0.2], ['Arena', '#e6d3b3', 0.25], ['Verde salvia', '#b9c9b0', 0.25], ['Azul cielo', '#bcd3e3', 0.25], ['Terracota', '#d39b7e', 0.25], ['Gris antracita', '#5c636b', 0.3], ['Colores del club', null, 0.4]];
  const SUELOS = [['Tarima clara', 0, 0.3], ['Tarima oscura', 1, 0.6], ['Baldosa hidráulica', 2, 0.7], ['Mármol', 3, 1.5], ['Moqueta', 4, 0.4], ['Parquet de pista', 5, 1.2]];
  const LUCES = [['Cálida', 0xffd2a0, 0.05], ['Neutra', 0xfff4e6, 0.05], ['Fría', 0xd6e6ff, 0.05]];
  function dibSuelo(k) {
    return (x, n) => {
      if (k === 0 || k === 1 || k === 5) { const base = k === 0 ? [196, 150, 104] : k === 1 ? [112, 74, 46] : [214, 168, 110]; const filas = k === 5 ? 16 : 12; for (let f = 0; f < filas; f++) { const q = 0.85 + ((f * 37) % 10) / 40, off = (f % 2) * n / 3; x.fillStyle = 'rgb(' + (base[0] * q | 0) + ',' + (base[1] * q | 0) + ',' + (base[2] * q | 0) + ')'; x.fillRect(0, f * n / filas, n, n / filas - 1); x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(off, f * n / filas, 1.5, n / filas); x.fillRect((off + n / 2) % n, f * n / filas, 1.5, n / filas); } if (k === 5) { x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 3; x.beginPath(); x.arc(n / 2, n / 2, n * 0.3, 0, 6.3); x.stroke(); } return; }
      if (k === 2) { const t = n / 4; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const cx = i * t + t / 2, cy = j * t + t / 2; x.fillStyle = '#e9e1d2'; x.fillRect(i * t, j * t, t, t); x.fillStyle = '#7a4a3a'; x.beginPath(); x.moveTo(cx, j * t + 4); x.lineTo(i * t + t - 4, cy); x.lineTo(cx, j * t + t - 4); x.lineTo(i * t + 4, cy); x.fill(); x.fillStyle = '#2f5f6f'; x.beginPath(); x.arc(cx, cy, t * 0.16, 0, 6.3); x.fill(); x.strokeStyle = 'rgba(0,0,0,.25)'; x.strokeRect(i * t, j * t, t, t); } return; }
      if (k === 3) { x.fillStyle = '#ece9e4'; x.fillRect(0, 0, n, n); for (let i = 0; i < 18; i++) { x.strokeStyle = 'rgba(120,120,130,' + (0.15 + (i % 3) * 0.08) + ')'; x.lineWidth = 1 + (i % 2); x.beginPath(); x.moveTo((i * 53) % n, 0); x.bezierCurveTo((i * 97) % n, n / 3, (i * 31) % n, n * 0.66, (i * 71) % n, n); x.stroke(); } x.strokeStyle = 'rgba(0,0,0,.12)'; x.strokeRect(0, 0, n / 2, n / 2); x.strokeRect(n / 2, n / 2, n / 2, n / 2); return; }
      x.fillStyle = '#5d6b78'; x.fillRect(0, 0, n, n); for (let i = 0; i < 2500; i++) { x.fillStyle = 'rgba(' + (i % 2 ? '255,255,255,.05' : '0,0,0,.07') + ')'; x.fillRect((i * 37) % n, (i * 91) % n, 2, 2); }
    };
  }
  const CAT = {}; CATALOGO.forEach(c => { CAT[c[0]] = { m: c[0], nombre: c[1], precio: c[2], confort: c[3], cat: c[4], pisable: !!c[5] }; });
  const TAM = [[8, 6], [10, 7], [12, 8], [14, 10], [16, 11], [18, 12]];
  const nivel = st => (GM.mods.hogar && GM.mods.hogar.nivel ? GM.mods.hogar.nivel(st) : 1);
  const dinero = st => (GM.mods.hogar ? GM.mods.hogar.dinero(st) : 0);
  function gastar(st, k) { if (st.modo === 'carrera') st.carrera.dinero -= k; else { GM.mods.hogar.dinero(st); st.hogar.ahorros -= k; } }
  // ---------- Viviendas: cada una con sus muebles y reformas (st.sede.casas[id]) ----------
  let CASA_ID = null;   // la vivienda que se está viendo
  const viviendas = st => (GM.mods.hogar && GM.mods.hogar.viviendas ? GM.mods.hogar.viviendas(st) : []);
  const idActual = st => { const v = viviendas(st), a = v.find(x => x.actual) || v[0]; return a ? a.id : 'casa'; };
  function datos(st, id) {
    st.sede = st.sede || { charlas: {} }; const SD = st.sede; SD.casas = SD.casas || {};
    id = id || CASA_ID || idActual(st);
    if (!SD.casas[id]) {
      const viejo = SD.casa; SD.casas[id] = { pared: viejo ? viejo.pared || 0 : 0, suelo: viejo ? viejo.suelo || 0 : 0, luz: viejo ? viejo.luz || 0 : 0, muebles: null };
      if (viejo) delete SD.casa;   // la casa única de antes: sus reformas pasan a tu vivienda actual (los muebles se recolocan según las habitaciones)
    }
    const d = SD.casas[id]; if (d.pared === undefined) Object.assign(d, { pared: 0, suelo: 0, luz: 0 });
    // Muebles de partida: los básicos de cada habitación, sin sitio todavía (se colocan al entrar: construirCon)
    if (!d.muebles) { const v = viviendas(st).find(x => x.id === id) || viviendas(st).find(x => x.actual), H = GM.mods.hogar; const habs = v && H ? H.habitaciones(v.tipo, v.variante) : [{ id: 'estudio' }]; d.muebles = [].concat(...habs.map(r => (BASICOS[r.id] || []).map(m => ({ m, x: null, z: null, r: 0, hab: r.id })))); }
    return d;
  }
  function confort(st, id) { return (datos(st, id).muebles || []).reduce((s, x) => s + ((CAT[x.m] || {}).confort || 0), 0); }
  // Plano de la vivienda a partir de su variante (hogar.js): planta baja delante, planta de arriba detrás (con escalera) y
  // terraza, jardín o piscina fuera, delante de la entrada. Devuelve habitaciones con su rectángulo y la puerta principal.
  function plano(viv) {
    const H = GM.mods.hogar, habs = H.habitaciones(viv.tipo, viv.variante);
    const A = habs.filter(r => !r.ext && !r.planta), B = habs.filter(r => !r.ext && r.planta), X = habs.filter(r => r.ext);
    const ancho = l => l.reduce((s, r) => s + r.w, 0), W = Math.max(ancho(A), ancho(B), 4), dA = Math.max(...A.map(r => r.d), 3.6), dB = B.length ? Math.max(...B.map(r => r.d)) : 0;
    const fila = (l, za, zb, arriba) => { let x = -W / 2; return l.map((r, k) => { const x1 = k === l.length - 1 ? W / 2 : x + r.w, o = Object.assign({}, r, { x0: x, x1, z0: za, z1: zb, arriba }); x = x1; return o; }); };
    const front = (dA + dB) / 2, rA = fila(A, front - dA, front, false), rB = B.length ? fila(B, front - dA - dB, front - dA, true) : [];
    const anchoX = ancho(X), dX = X.length ? Math.max(...X.map(r => r.d)) : 0;
    let xx = -Math.max(W, anchoX) / 2; const rX = X.map((r, k) => { const x1 = k === X.length - 1 ? Math.max(W, anchoX) / 2 : xx + r.w, o = Object.assign({}, r, { x0: xx, x1, z0: front + 0.4, z1: front + 0.4 + dX }); xx = x1; return o; });
    const puertaX = rA.length ? (rA[0].x0 + rA[0].x1) / 2 : 0;
    return { habs: rA.concat(rB), ext: rX, W, front, fondo: front - dA - dB, dX, puertaX, interiores: rA.length + rB.length };
  }
  // Muebles de partida según las habitaciones (lo que cabe se queda; lo demás, no)
  const BASICOS = { estudio: ['bedSingle', 'loungeSofa', 'kitchenFridge'], salon: ['loungeSofa', 'tableCoffee', 'televisionModern'], dormitorio: ['bedDouble', 'sideTable'], cocina: ['kitchenFridge', 'kitchenCabinet', 'table'], despacho: ['desk', 'chairDesk'], gimnasio: ['bench'], cine: ['loungeSofaLong', 'televisionModern'], terraza: ['loungeChair', 'plantSmall2'], jardin: ['bench', 'pottedPlant'], piscina: ['loungeChairRelax'] };

  // ---------- Escena ----------
  let C = null; // estado del modo construcción
  async function construir(S, M, st, id) {
    const W = S.mundo, vs = viviendas(st), viv = vs.find(v => v.id === id) || vs.find(v => v.actual) || vs[0];
    if (!viv) { const c0 = { id: 'casa', tipo: 'estudio', variante: GM.mods.hogar.VARIANTES.estudio[0], barrioNombre: '' }; return construirCon(S, M, st, c0); }
    return construirCon(S, M, st, viv);
  }
  async function construirCon(S, M, st, viv) {
    const W = S.mundo; CASA_ID = viv.id; S.casaId = viv.id; S.casaNombre = viv.variante.nombre + (viv.barrioNombre ? ', ' + viv.barrioNombre : '');
    const PL = plano(viv), todas = PL.habs.concat(PL.ext), x0 = Math.min(...todas.map(r => r.x0)), x1 = Math.max(...todas.map(r => r.x1)), z0 = PL.fondo, z1 = PL.ext.length ? PL.front + 0.4 + PL.dX : PL.front;
    S.scene.background = new THREE.Color(0x1d232a); S.scene.fog = null;
    S.G = M.rejilla({ limites: [x0 - 2, z0 - 2, x1 + 2, z1 + 4], CELDA: 0.5 }); S.casaRect = [x0, z0, x1, z1]; S.casaPlano = PL;
    const D = datos(st, viv.id), est = viv.variante.est || {};
    const mSuelo = new THREE.MeshStandardMaterial({ color: 0xb98e63, roughness: 0.6 }); S.casaMats = { suelo: mSuelo, w: PL.W, d: PL.front - PL.fondo }; ponerSuelo(S, M, D.suelo);
    const suelo = new THREE.Mesh(new THREE.PlaneGeometry(PL.W, PL.front - PL.fondo).rotateX(-Math.PI / 2), mSuelo); suelo.position.set(0, 0, (PL.front + PL.fondo) / 2); suelo.receiveShadow = true; W.add(suelo);
    const mMuro = new THREE.MeshStandardMaterial({ color: D.pared ? colorPared(st, D.pared) : (est.pared || colorPared(st, 0)), roughness: 0.9 }), mRemate = new THREE.MeshStandardMaterial({ color: 0x2b3038 }), alto = 1.15;
    Object.assign(S.casaMats, { muro: mMuro, remate: mRemate, alto });
    // Muros en corte: contorno, línea entre plantas y separaciones entre habitaciones, con puertas de 1 m
    const muros = []; S.casaMuros = muros; S.casaPuertas = [];
    const muro = (xa, za, xb, zb, huecos, m, h) => {
      const horiz = za === zb, L = horiz ? xb - xa : zb - za, ini = horiz ? xa : za; let tramos = [[0, L]];
      (huecos || []).forEach(c => { const a = c - ini - 0.5, b = c - ini + 0.5; tramos = tramos.flatMap(([p, q]) => b <= p || a >= q ? [[p, q]] : [[p, Math.max(p, a)], [Math.min(q, b), q]]).filter(([p, q]) => q - p > 0.05); S.casaPuertas.push(horiz ? [c, za] : [xa, c]); });
      tramos.forEach(([p, q]) => { const l = q - p, cx = horiz ? xa + p + l / 2 : xa, cz = horiz ? za : za + p + l / 2, hh = h || alto;
        const me = new THREE.Mesh(new THREE.BoxGeometry(horiz ? l : 0.2, hh, horiz ? 0.2 : l), m || mMuro); me.position.set(cx, hh / 2, cz); me.castShadow = me.receiveShadow = true; W.add(me);
        if (!m) { const r = new THREE.Mesh(new THREE.BoxGeometry(horiz ? l : 0.21, 0.04, horiz ? 0.21 : l), mRemate); r.position.set(cx, hh + 0.02, cz); W.add(r); }
        muros.push(horiz ? [xa + p, za - 0.15, xa + q, za + 0.15] : [xa - 0.15, za + p, xa + 0.15, za + q]); });
    };
    const xs = PL.habs.length ? PL.habs : [{ x0: -PL.W / 2, x1: PL.W / 2, z0: PL.fondo, z1: PL.front }];
    const fA = xs.filter(r => !r.arriba), fB = xs.filter(r => r.arriba), zAB = fA.length ? fA[0].z0 : PL.fondo;
    muro(-PL.W / 2, PL.front, PL.W / 2, PL.front, [PL.puertaX]);                                  // fachada con la puerta
    muro(-PL.W / 2, PL.fondo, PL.W / 2, PL.fondo, []);                                           // fondo
    muro(-PL.W / 2, PL.fondo, -PL.W / 2, PL.front, []); muro(PL.W / 2, PL.fondo, PL.W / 2, PL.front, []);
    if (fB.length) muro(-PL.W / 2, zAB, PL.W / 2, zAB, fA.map(r => (r.x0 + r.x1) / 2));       // entre plantas: una puerta por habitación
    [fA, fB].forEach(f => f.slice(0, -1).forEach(r => muro(r.x1, r.z0, r.x1, r.z1, [(r.z0 + r.z1) / 2])));
    // Suelo propio en la cocina (baldosa) y el gimnasio (goma)
    xs.forEach(r => { if (r.id !== 'cocina' && r.id !== 'gimnasio') return; const tx = r.id === 'cocina' ? M.textura('suelo-casa-2', 256, dibSuelo(2)) : null, mt = new THREE.MeshStandardMaterial(tx ? { map: tx.clone() } : { color: 0x3b4148, roughness: 0.95 }); if (tx) { mt.map.needsUpdate = true; mt.map.repeat.set((r.x1 - r.x0) / 2, (r.z1 - r.z0) / 2); } const p = new THREE.Mesh(new THREE.PlaneGeometry(r.x1 - r.x0 - 0.1, r.z1 - r.z0 - 0.1).rotateX(-Math.PI / 2), mt); p.position.set((r.x0 + r.x1) / 2, 0.004, (r.z0 + r.z1) / 2); p.receiveShadow = true; W.add(p); });
    // Ventanas en la pared del fondo
    for (let x = -PL.W / 2 + 1.5; x < PL.W / 2 - 1; x += 3) { const v = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 0.22), new THREE.MeshStandardMaterial({ color: 0x9fc4dc, roughness: 0.1, metalness: 0.3 })); v.position.set(x, 0.75, PL.fondo); W.add(v); }
    // Escalera a la planta de arriba (las habitaciones de detrás) y nombre de cada habitación
    if (fB.length) { const ex = fA[0].x1 - 0.9, ez = zAB + 0.9; for (let k = 0; k < 5; k++) { const p = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.12 + k * 0.12, 0.28), mRemate); p.position.set(ex, (0.12 + k * 0.12) / 2, ez + 0.6 - k * 0.28); W.add(p); } muros.push([ex - 0.5, ez - 0.6, ex + 0.5, ez + 0.75]); }
    xs.concat(PL.ext).forEach(r => { if (!r.nombre) return; const e = M.etiqueta(r.nombre + (r.arriba ? ' (arriba)' : '')); e.scale.multiplyScalar(0.62); e.position.set((r.x0 + r.x1) / 2, 2.0, (r.z0 + r.z1) / 2); e.userData = { etiqueta: true, rotulo: true }; W.add(e); });
    // Exterior: terraza, jardín o piscina, con valla baja y salida hacia la calle
    PL.ext.forEach(r => {
      const w = r.x1 - r.x0, d = r.z1 - r.z0, cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
      const col = r.id === 'jardin' ? 0x6f9a4a : r.id === 'terraza' ? 0xcbb79a : 0xdfe6ea, p = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: col, roughness: 0.9 })); p.position.set(cx, -0.005, cz); p.receiveShadow = true; W.add(p);
      if (r.id === 'piscina') { const pw = Math.max(2, w - 3), pd = Math.max(1.6, d - 2.2), ag = new THREE.Mesh(new THREE.PlaneGeometry(pw, pd).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x3ea6d6, roughness: 0.08, metalness: 0.2 })); ag.position.set(cx, 0.03, cz); W.add(ag); const bo = new THREE.Mesh(new THREE.BoxGeometry(pw + 0.3, 0.06, pd + 0.3), new THREE.MeshStandardMaterial({ color: 0xf4f1ea })); bo.position.set(cx, 0.0, cz); W.add(bo); muros.push([cx - pw / 2, cz - pd / 2, cx + pw / 2, cz + pd / 2]); }
      if (r.id === 'jardin') for (let k = 0; k < 3; k++) { const ar = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 1), new THREE.MeshStandardMaterial({ color: 0x4f8f45 })); const ax = r.x1 - 0.8, az = r.z0 + 0.9 + k * (d - 1.8) / 2; ar.position.set(ax, 1.3, az); W.add(ar); const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.9), new THREE.MeshStandardMaterial({ color: 0x6b5136 })); tr.position.set(ax, 0.45, az); W.add(tr); muros.push([ax - 0.4, az - 0.4, ax + 0.4, az + 0.4]); }
    });
    if (PL.ext.length) { const mV = new THREE.MeshStandardMaterial({ color: 0xf2efe8 }), ex0 = Math.min(...PL.ext.map(r => r.x0)), ex1 = Math.max(...PL.ext.map(r => r.x1)), ez1 = PL.front + 0.4 + PL.dX;
      muro(ex0, PL.front, ex0, ez1, [], mV, 0.6); muro(ex1, PL.front, ex1, ez1, [], mV, 0.6); muro(ex0, ez1, ex1, ez1, [PL.puertaX], mV, 0.6);
      PL.ext.slice(0, -1).forEach(r => muro(r.x1, r.z0, r.x1, r.z1, [(r.z0 + r.z1) / 2], mV, 0.4)); }
    else { const rellano = new THREE.Mesh(new THREE.PlaneGeometry(4, 3).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x9a948a })); rellano.position.set(PL.puertaX, -0.01, PL.front + 1.5); W.add(rellano); }
    // Luces del techo (una por planta, del color de la reforma)
    const luz = new THREE.PointLight(LUCES[D.luz || 0][1], 6 + PL.W * (PL.front - PL.fondo) * 0.05, Math.max(PL.W, 8) * 1.3, 1.6); luz.position.set(0, 2.6, fB.length ? (zAB + PL.front) / 2 : (PL.fondo + PL.front) / 2); luz.userData = { luzCasa: true }; W.add(luz); S.casaMats.luz = luz;
    if (fB.length) { const l2 = luz.clone(); l2.position.set(0, 2.6, (PL.fondo + zAB) / 2); W.add(l2); S.casaMats.luz2 = l2; }
    // Muebles: los guardados de esta vivienda o, la primera vez, los básicos de cada habitación
    S.mueblesCasa = [];
    const sinSitio = D.muebles.filter(x => x.x === null || x.x === undefined);
    if (sinSitio.length) { await Promise.all(sinSitio.map(x => medir(M, x.m))); const k0 = {};
      sinSitio.forEach(x => { const r = todas.find(q => q.id === x.hab) || todas[0], k = k0[r.id] = (k0[r.id] || 0) + 1, t = TAMS[x.m] || [1, 1], esq = [[r.x0 + t[0] / 2 + 0.25, r.z0 + t[1] / 2 + 0.25], [r.x1 - t[0] / 2 - 0.25, r.z0 + t[1] / 2 + 0.25], [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2]][(k - 1) % 3], px = esq[0], pz = esq[1]; x.x = 9999; if (cabe(S, st, x.m, px, pz, 0, x)) { x.x = px; x.z = pz; } });
      D.muebles = D.muebles.filter(x => x.x !== 9999); }
    await Promise.all(D.muebles.map(x => colocarObj(S, M, x)));
    rehacerRejilla(S, st);
    const pz = PL.ext.length ? PL.front + 0.4 + PL.dX + 1.1 : PL.front + 2.2, club = st.equipos[st.clubId], salon = xs.find(r => r.id === 'salon' || r.id === 'estudio') || xs[0];
    S.zonas = [M.zona(W, { id: 'puerta_casa', nombre: 'Salir a la calle', accion: 'Bajar a la calle', destino: {}, irA: 'calle', boton: 'Salir a la calle' }, PL.puertaX, pz, club),
      M.zona(W, { id: 'casa', nombre: viv.actual === false ? 'Tu otra casa' : 'Tu casa', accion: 'Confort ' + confort(st, viv.id) + '. Descansa o redecora.', destino: { todos: 'ciudad' } }, Math.min(salon.x1 - 0.8, (salon.x0 + salon.x1) / 2 + 1.2), salon.z1 - 1.2, club)];
    if (viv.actual === false && GM.mods.hogar.vivirEn) S.zonas.push(M.zona(W, { id: 'mudarse', nombre: 'Vivir aquí', accion: '', destino: {}, acciones: s2 => [{ id: 'mudarse', t: 'Mudarte a esta casa', d: 'Pasas a vivir aquí; la otra sigue siendo tuya.', disponible: true, fn: () => GM.mods.hogar.vivirEn(s2, viv.id).ok ? { ok: true, texto: 'Ahora vives aquí' } : { ok: false, motivo: 'No se ha podido' } }] }, salon.x0 + 1.0, (salon.z0 + salon.z1) / 2, club));
    S.spawnCasa = { x: PL.puertaX, z: pz - (PL.ext.length ? 1.6 : 1.0), ry: Math.PI };   // ya dentro, lejos del círculo de salida
    // Vida del jugador (vida.js): vitrina de logros contra la pared del fondo del salón y tu mascota esperándote
    if (GM.mods.vida) {
      const vx = (salon.x0 + salon.x1) / 2 - 1.2, vz = salon.z0 + 0.32;
      if (st.modo === 'carrera' && GM.mods.vida.vitrina(S, st, W, vx, vz, 0)) { S.casaMuros.push([vx - 0.85, vz - 0.3, vx + 0.85, vz + 0.3]); rehacerRejilla(S, st);
        S.zonas.push(M.zona(W, { id: 'vitrina', nombre: 'Vitrina de logros', accion: '', destino: {}, acciones: s2 => { const L = GM.mods.vida.logros(s2), hechos = L.filter(x => x.fecha); return (hechos.length ? hechos : [{ t: 'Aún vacía', d: 'Consigue logros para llenarla.' }]).map((x, i) => ({ id: 'l' + i, t: x.t, d: x.fecha ? U.fecha(x.fecha) : x.d, disponible: false, motivo: x.fecha ? 'Conseguido el ' + U.fecha(x.fecha) : x.d, fn: () => ({ ok: false }) })); } }, vx, vz + 1.2, club)); }
      GM.mods.vida.ponerMascota(S, st, (salon.x0 + salon.x1) / 2 + 0.6, (salon.z0 + salon.z1) / 2);
    }
    return W;
  }
  // Modelo de cada pieza: los de Kenney o, si empieza por «_», un tabique hecho por código
  function modelo(S, M, m) {
    if (m[0] !== '_') return M.mueble(m);
    const g = new THREE.Group(), K = S.casaMats || {}, alto = K.alto || 1.15, l = m === '_tabique2' ? 2 : 1, vidrio = m === '_mampara';
    const p = new THREE.Mesh(new THREE.BoxGeometry(l, vidrio ? 1.9 : alto, 0.16), vidrio ? new THREE.MeshStandardMaterial({ color: 0xbfe0f0, transparent: true, opacity: 0.35, roughness: 0.05 }) : K.muro || new THREE.MeshStandardMaterial({ color: 0xf1ede6 })); p.position.y = (vidrio ? 1.9 : alto) / 2; g.add(p);
    const r = new THREE.Mesh(new THREE.BoxGeometry(l + 0.01, vidrio ? 0.05 : 0.04, 0.17), K.remate || new THREE.MeshStandardMaterial({ color: 0x2b3038 })); r.position.y = vidrio ? 1.92 : alto + 0.02; g.add(r);
    g.tam = { x: l / GM.sedePlano.ESCALA_MUEBLES, z: 0.16 / GM.sedePlano.ESCALA_MUEBLES };
    return Promise.resolve(g);
  }
  const LAMPARAS = /^lamp/;
  async function colocarObj(S, M, x) {
    const o = await modelo(S, M, x.m);
    if (LAMPARAS.test(x.m) && S.mueblesCasa.filter(q => q.luzCasa).length < 6) { const pl = new THREE.PointLight(0xffc98a, x.m === 'lampSquareTable' || x.m === 'lampRoundTable' ? 2.2 : 4, 4.5, 1.8); pl.position.y = (x.m === 'lampSquareTable' || x.m === 'lampRoundTable' ? 0.6 : 1.5) / GM.sedePlano.ESCALA_MUEBLES; o.add(pl); o.luzCasa = pl; } if (!TAMS[x.m]) { const e = GM.sedePlano.ESCALA_MUEBLES; TAMS[x.m] = [Math.max(0.3, o.tam.x * e), Math.max(0.3, o.tam.z * e)]; } o.position.set(x.x, 0, x.z); o.rotation.y = x.r * Math.PI / 180; o.traverse(q => { if (q.isMesh) { q.castShadow = true; q.receiveShadow = true; } }); o.userData = { muebleCasa: x }; S.mundo.add(o); S.mueblesCasa.push(o); return o;
  }
  function huella(m, x, z, r) { const o = CAT[m]; const t = TAMS[m] || [1, 1], giro = Math.abs(Math.sin(r * Math.PI / 180)) > 0.5, w = giro ? t[1] : t[0], d = giro ? t[0] : t[1]; return [x - w / 2, z - d / 2, x + w / 2, z + d / 2]; }
  const TAMS = {}; // tamaño real en metros de cada modelo (se mide al cargarlo)
  function rehacerRejilla(S, st) {
    const G = S.G; G.b.fill(0); (S.casaMuros || []).forEach(m => G.bloquea(m[0], m[1], m[2], m[3]));
    (datos(st).muebles || []).forEach(x => { if ((CAT[x.m] && CAT[x.m].pisable) || x.x === null || x.x === undefined) return; const h = huella(x.m, x.x, x.z, x.r); G.bloquea(h[0] + 0.05, h[1] + 0.05, h[2] - 0.05, h[3] - 0.05); });
  }
  // Cabe si queda dentro de una habitación (o del exterior), no tapa una puerta ni la piscina y no pisa otro mueble
  // (los muebles que aún no tienen sitio no estorban)
  function cabe(S, st, m, x, z, r, ignorar) {
    const PL = S.casaPlano, h = huella(m, x, z, r); if (!PL) return false;
    const dentro = PL.habs.concat(PL.ext).some(q => h[0] >= q.x0 + 0.12 && h[2] <= q.x1 - 0.12 && h[1] >= q.z0 + 0.12 && h[3] <= q.z1 - 0.12); if (!dentro) return false;
    if (CAT[m] && CAT[m].pisable) return true;
    if ((S.casaPuertas || []).some(([px, pz]) => px > h[0] - 0.7 && px < h[2] + 0.7 && pz > h[1] - 0.7 && pz < h[3] + 0.7)) return false;   // las puertas, libres
    if ((S.casaMuros || []).some(k => !(h[2] <= k[0] || h[0] >= k[2] || h[3] <= k[1] || h[1] >= k[3]))) return false;
    return (datos(st).muebles || []).every(o => { if (o === ignorar || (CAT[o.m] && CAT[o.m].pisable) || o.x === null || o.x === undefined || o.x === 9999) return true; const k = huella(o.m, o.x, o.z, o.r); return h[2] <= k[0] + 0.01 || h[0] >= k[2] - 0.01 || h[3] <= k[1] + 0.01 || h[1] >= k[3] - 0.01; });
  }
  async function medir(M, m) { if (TAMS[m]) return; if (m[0] === '_') { TAMS[m] = [m === '_tabique2' ? 2 : 1, 0.16]; return; } const o = await M.mueble(m); const e = GM.sedePlano.ESCALA_MUEBLES; TAMS[m] = [Math.max(0.3, o.tam.x * e), Math.max(0.3, o.tam.z * e)]; }

  // ---------- Modo construcción ----------
  async function activar(S, M, on) {
    const st = S.st; if (on === undefined) on = !S.construccion; S.construccion = on;
    (S.zonas || []).forEach(z => { z.obj.visible = !on; if (z.et) z.et.visible = !on; });
    S.raiz.querySelectorAll('.casa-catalogo').forEach(e => e.remove()); if (C && C.fantasma) S.mundo.remove(C.fantasma); if (C && C.rejilla) S.mundo.remove(C.rejilla);
    if (!on) { S.inc = null; deseleccionar(S); C = null; if (S.btnConstruir) S.btnConstruir.textContent = 'Modo construcción'; return; }
    await Promise.all(CATALOGO.map(c => medir(M, c[0])));
    const [x0, z0, x1, z1] = S.casaRect; S.inc = 1.22; S.foco.set((x0 + x1) / 2, 0, (z0 + z1) / 2 + (z1 - z0) * 0.32); S.zoom = Math.max(x1 - x0, (z1 - z0) * 1.4) * 1.3; if (S.panel) S.panel.style.display = 'none'; // la habitación queda por encima del catálogo
    const rej = new THREE.GridHelper(Math.max(x1 - x0, z1 - z0) + 2, (Math.max(x1 - x0, z1 - z0) + 2) * 2, 0xffffff, 0xffffff); rej.material.transparent = true; rej.material.opacity = 0.18; rej.position.set((x0 + x1) / 2, 0.02, (z0 + z1) / 2); S.mundo.add(rej);
    C = { cat: C && C.cat || 'Salón', elegido: null, r: 0, fantasma: null, rejilla: rej, sel: null, moviendo: null };
    if (S.btnConstruir) S.btnConstruir.textContent = 'Salir del modo construcción';
    pintarCatalogo(S, M);
  }
  function pintarCatalogo(S, M) {
    const h = GM.h, st = S.st; S.raiz.querySelectorAll('.casa-catalogo').forEach(e => e.remove());
    const cats = [...new Set(CATALOGO.map(c => c[4]))].concat(['Reformas']);
    const barra = h('div', { class: 'sede-hud casa-catalogo' },
      h('div', { class: 'cc-cab' }, h('b', null, 'Construcción'), h('span', null, 'Ahorros ' + (Math.round(dinero(st) * 10) / 10).toLocaleString('es-ES') + ' mil €, confort ' + confort(st)), h('span', { class: 'cc-ayuda' }, C.sel ? 'Mueble seleccionado' : C.elegido ? 'Toca el suelo para colocar, R para girar' : 'Elige un mueble o toca uno colocado')),
      C.sel ? h('div', { class: 'cc-sel' }, h('b', null, CAT[C.sel.userData.muebleCasa.m] ? CAT[C.sel.userData.muebleCasa.m].nombre : 'Mueble'),
        h('button', { class: 'btn peq', onclick: () => girarSel(S, M) }, 'Girar'), h('button', { class: 'btn peq', onclick: () => moverSel(S, M) }, 'Mover'),
        h('button', { class: 'btn btn-sec peq', onclick: () => venderSel(S, M) }, 'Vender (+' + Math.round((CAT[C.sel.userData.muebleCasa.m] || { precio: 0 }).precio * 500) + ' €)'), h('button', { class: 'btn btn-sec peq', onclick: () => { deseleccionar(S); pintarCatalogo(S, M); } }, 'Hecho'))
        : [h('div', { class: 'cc-cats' }, cats.map(c => h('button', { class: 'cc-cat' + (c === C.cat ? ' on' : ''), onclick: () => { C.cat = c; pintarCatalogo(S, M); } }, c))),
          C.cat === 'Reformas' ? reformas(S, M) : h('div', { class: 'cc-items' }, CATALOGO.filter(c => c[4] === C.cat).map(c => h('button', { class: 'cc-item' + (C.elegido === c[0] ? ' on' : ''), disabled: dinero(st) < c[2], onclick: () => elegir(S, M, c[0]) }, h('b', null, c[1]), h('span', null, Math.round(c[2] * 1000).toLocaleString('es-ES') + ' €'), h('i', null, '+' + c[3] + ' confort'))))]);
    S.raiz.append(barra);
  }
  async function elegir(S, M, m) {
    deseleccionar(S); C.elegido = m; C.r = 0; if (C.fantasma) S.mundo.remove(C.fantasma);
    const o = await modelo(S, M, m); const mf = new THREE.MeshStandardMaterial({ color: 0x4cd07d, transparent: true, opacity: 0.55, depthWrite: false }); o.traverse(q => { if (q.isMesh) q.material = mf; }); o.userData = { fantasma: true, mat: mf }; o.visible = false; S.mundo.add(o); C.fantasma = o;
    pintarCatalogo(S, M);
  }
  const ajustar = v => Math.round(v * 2) / 2;
  function hover(S, p) {
    if (!C || !C.fantasma || !C.elegido) return;
    const x = ajustar(p.x), z = ajustar(p.z), ok = cabe(S, S.st, C.elegido, x, z, C.r, C.moviendo);
    C.fantasma.visible = true; C.fantasma.position.set(x, 0.01, z); C.fantasma.rotation.y = C.r * Math.PI / 180; C.fantasma.userData.mat.color.setHex(ok ? 0x4cd07d : 0xe0533d); C.ok = ok; C.pos = [x, z];
  }
  async function toque(S, M, p, ray) {
    if (!C) return; const st = S.st;
    if (C.elegido) {
      hover(S, p); if (!C.ok) { GM.ui.toast('Ahí no cabe'); return; }
      const c = CAT[C.elegido];
      if (C.moviendo) { const x = C.moviendo; x.x = C.pos[0]; x.z = C.pos[1]; x.r = C.r; const o = S.mueblesCasa.find(q => q.userData.muebleCasa === x); if (o) { o.position.set(x.x, 0, x.z); o.rotation.y = x.r * Math.PI / 180; o.visible = true; } C.moviendo = null; C.elegido = null; S.mundo.remove(C.fantasma); C.fantasma = null; }
      else { if (dinero(st) < c.precio) { GM.ui.toast('No te llega el dinero'); return; } gastar(st, c.precio); const x = { m: C.elegido, x: C.pos[0], z: C.pos[1], r: C.r }; datos(st).muebles.push(x); await colocarObj(S, M, x); GM.ui.toast(c.nombre + ' colocado (' + Math.round(c.precio * 1000).toLocaleString('es-ES') + ' €)'); }
      rehacerRejilla(S, st); pintarCatalogo(S, M); return;
    }
    // Seleccionar un mueble colocado
    const hit = ray.intersectObjects(S.mueblesCasa, true)[0]; if (!hit) return deseleccionar(S), pintarCatalogo(S, M);
    let o = hit.object; while (o && !(o.userData && o.userData.muebleCasa)) o = o.parent; if (!o) return;
    deseleccionar(S); C.sel = o; o.traverse(q => { if (q.isMesh) { q.userData.matOrig = q.material; q.material = q.material.clone(); q.material.emissive = new THREE.Color(0x4cd07d); q.material.emissiveIntensity = 0.35; } }); pintarCatalogo(S, M);
  }
  function deseleccionar(S) { if (C && C.sel) { C.sel.traverse(q => { if (q.isMesh && q.userData.matOrig) { q.material.dispose(); q.material = q.userData.matOrig; q.userData.matOrig = null; } }); C.sel = null; } }
  function girarSel(S, M) { const o = C.sel, x = o.userData.muebleCasa, r = (x.r + 90) % 360; if (!cabe(S, S.st, x.m, x.x, x.z, r, x)) return GM.ui.toast('Girado no cabe'); x.r = r; o.rotation.y = r * Math.PI / 180; rehacerRejilla(S, S.st); }
  async function moverSel(S, M) { const o = C.sel, x = o.userData.muebleCasa; deseleccionar(S); o.visible = false; await elegir(S, M, x.m); C.moviendo = x; C.r = x.r; }
  function venderSel(S, M) { const o = C.sel, x = o.userData.muebleCasa, c = CAT[x.m] || { precio: 0, nombre: 'Mueble' }; deseleccionar(S); const L = datos(S.st).muebles; L.splice(L.indexOf(x), 1); S.mundo.remove(o); S.mueblesCasa.splice(S.mueblesCasa.indexOf(o), 1); gastar(S.st, -c.precio / 2); rehacerRejilla(S, S.st); GM.ui.toast(c.nombre + ' vendido'); pintarCatalogo(S, M); }
  // Reformas: paredes, suelo y luz (se aplican al momento, cuestan dinero)
  function colorPared(st, k) { const p = PAREDES[k || 0]; return p[1] || st.equipos[st.clubId].colores[0]; }
  function ponerSuelo(S, M, k) { const K = S.casaMats, t = M.textura('suelo-casa-' + k, 256, dibSuelo(k)); if (t) { const t2 = t.clone(); t2.needsUpdate = true; t2.repeat.set(K.w / (k === 2 ? 2 : k === 3 ? 2.5 : 3), K.d / (k === 2 ? 2 : k === 3 ? 2.5 : 3)); K.suelo.map = t2; K.suelo.color.set(0xffffff); } K.suelo.roughness = k === 3 ? 0.25 : k === 4 ? 1 : 0.6; K.suelo.needsUpdate = true; }
  function reformas(S, M) {
    const h = GM.h, st = S.st, D = datos(st), K = S.casaMats;
    const pagar = (precio, fn, txt) => { if (dinero(st) < precio) return GM.ui.toast('No te llega el dinero'); gastar(st, precio); fn(); GM.ui.toast(txt + ' (' + Math.round(precio * 1000).toLocaleString('es-ES') + ' €)'); pintarCatalogo(S, M); };
    const fila = (titulo, lista, actual, muestra, fn) => h('div', { class: 'cc-reforma' }, h('b', null, titulo), h('div', { class: 'cc-items' }, lista.map((x, i) => h('button', { class: 'cc-item' + (actual === i ? ' on' : ''), disabled: actual === i || dinero(st) < x[2], onclick: () => fn(i, x) }, muestra(x, i), h('b', null, x[0]), h('span', null, actual === i ? 'Ahora' : Math.round(x[2] * 1000).toLocaleString('es-ES') + ' €')))));
    const punto = c => h('i', { class: 'cc-muestra', style: { background: c } });
    return h('div', { class: 'cc-reformas' },
      fila('Paredes', PAREDES, D.pared || 0, (x, i) => punto(colorPared(st, i)), (i, x) => pagar(x[2], () => { D.pared = i; K.muro.color.set(colorPared(st, i)); }, 'Paredes: ' + x[0].toLowerCase())),
      fila('Suelo', SUELOS, D.suelo || 0, x => punto(['#c4966a', '#704a2e', '#7a4a3a', '#e5e2dc', '#5d6b78', '#d6a86e'][x[1]]), (i, x) => pagar(x[2], () => { D.suelo = i; ponerSuelo(S, M, i); }, 'Suelo: ' + x[0].toLowerCase())),
      fila('Luz del techo', LUCES, D.luz || 0, x => punto('#' + x[1].toString(16)), (i, x) => pagar(x[2], () => { D.luz = i; K.luz.color.setHex(x[1]); if (K.luz2) K.luz2.color.setHex(x[1]); }, 'Luz ' + x[0].toLowerCase())));
  }
  function rotar(S) { if (C && C.elegido) { C.r = (C.r + 90) % 360; if (C.pos) hover(S, { x: C.pos[0], z: C.pos[1] }); } }
  GM.casa = { construir, plano, idActual, activar, hover, toque, rotar, confort, datos, CATALOGO, PAREDES, SUELOS, LUCES, activo: () => !!C };
})();
