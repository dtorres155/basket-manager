/* CAMPUS (GM.campus) v2
   Layout por club (todos parten del mismo campus básico), estilo arquitectónico según el país, texturas generadas por canvas,
   edificios con más detalle por nivel, obras por fases, edificio emblemático por club, vida (banderas, grúa, coches, personas)
   y luz de día / tarde / noche. Calidad 'alta' (texturas, sombras, animación) o 'normal'. Solo formas de Three.js, sin recursos externos. */
(function () {
  const U = GM.util;
  const K = () => GM.kit;
  // Calidad por defecto: «normal» en pantallas táctiles (móvil), «alta» en ordenador. La elección del usuario se guarda.
  const tactil = (() => { try { return window.matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } })();
  const C = { calidad: tactil ? 'normal' : 'alta', hora: 'dia' };
  try { const q = window.localStorage.getItem('gm1:calidad'); if (q === 'normal' || q === 'alta') C.calidad = q; } catch (e) { }
  const alta = () => C.calidad === 'alta';
  const hex = n => '#' + ('000000' + n.toString(16)).slice(-6);

  // ---------- Texturas por canvas ----------
  const TC = {}; let _ok;
  const okCanvas = () => { if (_ok === undefined) { try { const x = document.createElement('canvas').getContext('2d'); _ok = !!(x && x.fillRect && x.createLinearGradient !== undefined); } catch (e) { _ok = false; } } return _ok; };
  function tex(key, w, h, draw, rep) {
    if (!alta() || !okCanvas()) return null;
    const kk = key + C.calidad; if (TC[kk]) return TC[kk];
    try {
      const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h);
      const t = new THREE.CanvasTexture(c); if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
      if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
      return (TC[kk] = t);
    } catch (e) { return null; }
  }
  function dibujaFachada(x, w, h, kind, muro, vent, noche) {
    x.fillStyle = noche ? '#000' : hex(muro); x.fillRect(0, 0, w, h);
    const cuadro = (px, py, pw, ph) => { x.fillStyle = vent; x.fillRect(px, py, pw, ph); if (!noche) { x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(px, py + ph - 3, pw, 3); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(px + pw / 2 - 1, py, 2, ph); } };
    if (kind === 'oficina') for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) cuadro(8 + c * 30, 10 + r * 30, 20, 18);
    else if (kind === 'casa') for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) cuadro(14 + c * 38, 18 + r * 52, 22, 32);
    else if (kind === 'nave') { for (let c = 0; c < 6; c++) cuadro(6 + c * 20, 34, 15, 30); if (!noche) { x.fillStyle = 'rgba(0,0,0,.08)'; for (let r = 0; r < 8; r++) x.fillRect(0, r * 16, w, 2); } }
    else if (!noche) { x.fillStyle = 'rgba(0,0,0,.07)'; for (let r = 0; r < 8; r++) x.fillRect(0, r * 16, w, 2); }
  }
  const MATS = [];
  function fachada(kind, muro) {
    const key = kind + muro, m = new THREE.MeshLambertMaterial({ color: muro });
    const t = tex('f' + key, 128, 128, (x, w, h) => dibujaFachada(x, w, h, kind, muro, '#6f9cc0', false));
    if (t) { m.map = t; m.color.setHex(0xffffff); }
    MATS.push({ m, kind, muro, hay: !!t }); aplicaNoche(MATS[MATS.length - 1]);
    return m;
  }
  function aplicaNoche(e) {
    if (!e.hay) return;
    if (C.hora === 'noche') {
      const t = tex('n' + e.kind, 128, 128, (x, w, h) => dibujaFachada(x, w, h, e.kind, 0, '#ffe08a', true));
      e.m.emissive.setHex(t ? 0xffffff : 0); if (t) e.m.emissiveMap = t;
    } else { e.m.emissive.setHex(0); e.m.emissiveMap = null; }
    e.m.needsUpdate = true;
  }
  const MV = new THREE.MeshLambertMaterial({ color: 0x9fd3f0 });
  function setHora(modo) {
    C.hora = modo; MV.color.setHex(modo === 'noche' ? 0xffe08a : 0x9fd3f0);
    MV.emissive.setHex(modo === 'noche' ? 0x8a6a10 : 0);
    MATS.forEach(aplicaNoche);
  }
  const AMB = {
    dia: { bg: 0xa9d6f2, amb: [0xffffff, 0.78], sun: [0xffffff, 0.65], pos: [18, 30, 14] },
    tarde: { bg: 0xf2b48a, amb: [0xffd9b8, 0.62], sun: [0xff9f5a, 0.9], pos: [-28, 11, 12] },
    noche: { bg: 0x14213a, amb: [0x7a90c0, 0.5], sun: [0x9fb4e8, 0.28], pos: [10, 26, 8] }
  };
  function ambiente(v, modo) {
    const a = AMB[modo] || AMB.dia; setHora(modo);
    v.renderer.setClearColor(a.bg); v.amb.color.setHex(a.amb[0]); v.amb.intensity = a.amb[1];
    v.sun.color.setHex(a.sun[0]); v.sun.intensity = a.sun[1]; v.sun.position.set(a.pos[0], a.pos[1], a.pos[2]);
    v.scene.fog = new THREE.Fog(a.bg, 75, 170); v.dibujar();
  }

  // ---------- Estilo arquitectónico ----------
  const ESTILOS = {
    ES: { muro: [0xf3ead8, 0xe0c9a0], techo: 0xb0502f, teja: true, nombre: 'mediterráneo' },
    US: { muro: [0xc3c8cf, 0xa5563f], techo: 0x4a5560, teja: false, nombre: 'ladrillo y cristal' },
    GR: { muro: [0xf8f9fb, 0xe3ecf5], techo: 0x2f6db5, teja: false, nombre: 'blanco y azul' },
    TR: { muro: [0xe3d9c6, 0xcdbfa6], techo: 0x9b3d2b, teja: true, nombre: 'piedra y teja' },
    IT: { muro: [0xe8c98a, 0xd9b06a], techo: 0xa84a30, teja: true, nombre: 'ocre italiano' },
    FR: { muro: [0xe9e2d3, 0xc5c9cf], techo: 0x6f7b87, teja: false, nombre: 'crema y zinc' },
    DEF: { muro: [0xe6e8ec, 0xc8ced6], techo: 0x59636e, teja: false, nombre: 'moderno' }
  };
  const estilo = eq => ESTILOS[eq.pais] || ESTILOS.DEF;

  // ---------- Layouts ----------
  const NOMBRE = { pista: 'Pabellón de entrenamiento', gimnasio: 'Gimnasio y preparación física', medico: 'Centro médico', residencia: 'Residencia de jugadores', cantera: 'Academia de cantera', oficinas: 'Oficinas del club', tienda: 'Tienda oficial', fans: 'Zona de aficionados', parking: 'Aparcamiento y accesos', emblema: 'Edificio emblemático', museo: 'Museo del club', hotel: 'Hotel de concentración', prensa: 'Sala de prensa y medios' };
  const EMB = { masia: 'La Masia', ausias: 'Pavelló Ausiàs March', museo: 'Museo y sala de trofeos', casa: 'Casa del club' };
  const ORDEN = ['tienda', 'museo', 'fans', 'cantera', 'residencia', 'emblema', 'hotel', 'pista', 'gimnasio', 'medico', 'prensa', 'oficinas', 'parking'];
  const EMBLEMA = { 'fc-barcelona': 'masia', 'joventut-badalona': 'ausias', 'real-madrid': 'museo' };
  const NOMB_CLUB = { 'fc-barcelona': { tienda: 'Barça Store' }, 'joventut-badalona': { tienda: 'Botiga de la Penya', fans: 'Espai Penya', museo: 'Museu de la Penya' }, 'real-madrid': { museo: 'Museo de la sección' } };
  const DECOR = {
    'fc-barcelona': [{ t: 'pitch', x: -5, z: -31, w: 13, d: 7.5 }, { t: 'pitch', x: 9, z: -31, w: 7, d: 7.5 }],
    'real-madrid': [{ t: 'pitch', x: -5, z: -31, w: 13, d: 7.5 }, { t: 'pitch', x: 9, z: -31, w: 7, d: 7.5 }],
    'joventut-badalona': [{ t: 'palau', x: 0, z: -36, w: 20, d: 8 }, { t: 'casas' }]
  };
  // Campus orgánico: los edificios se reparten en arco alrededor de una plaza, mirando hacia ella, con la entrada al sur.
  function layout(eq) {
    const h = U.hash(eq.id), flip = h % 2 ? -1 : 1, cz = -1.5;
    const variante = EMBLEMA[eq.id] || 'casa';
    const n = ORDEN.length, a0 = Math.PI / 2 + 0.6, a1 = Math.PI / 2 + 2 * Math.PI - 0.6;
    const slots = ORDEN.map((id, i) => {
      const ang = a0 + (a1 - a0) * (i / (n - 1)) + (((h >>> i) % 7) - 3) * 0.015, r = 17.4 + (i % 2 ? 0.8 : -0.8) + (((h >>> (i + 4)) % 5) - 2) * 0.25;
      const x = Math.cos(ang) * r * 1.25 * flip, z = Math.sin(ang) * r * 0.95 + cz;
      const rot = Math.atan2(-x, -(z - cz)) + 0.1 * Math.sin(i * 2 + (h % 7));
      const nombre = id === 'emblema' ? EMB[variante] : ((NOMB_CLUB[eq.id] || {})[id] || null);
      return { id, tipo: id, x, z, rot, nombre: nombre || NOMBRE[id], variante: id === 'emblema' ? variante : undefined };
    });
    return {
      nombre: eq.ciudadDeportiva ? eq.ciudadDeportiva.nombre : 'Centro de entrenamiento', ancho: 28, fondo: 21.5, cz, z0: cz - 21.5, z1: cz + 21.5, slots,
      inicial: { pista: 1, gimnasio: 1, medico: 1, emblema: eq.id === 'joventut-badalona' ? 1 : 0 },
      decor: DECOR[eq.id] || (h % 3 === 0 ? [{ t: 'casas' }] : [])
    };
  }

  // ---------- Helpers de dibujo ----------
  function mesh(g, geo, mat, x, y, z) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; }
  function F(g, w, h, d, kind, muro, x, y, z) {   // caja con fachada
    const m = mesh(g, new THREE.BoxGeometry(w, h, d), fachada(kind, muro), x, y + h / 2, z);
    if (!m.material.map) { const k = K(), cols = Math.max(2, Math.round(w / 0.7)), filas = Math.max(1, Math.round(h / 0.65)); for (let r = 0; r < filas; r++) for (let c = 0; c < cols; c++) mesh(g, new THREE.BoxGeometry(w / cols * 0.55, 0.22, 0.03), MV, x - w / 2 + w / cols * (c + 0.5), y + 0.3 + r * 0.55, z + d / 2 + 0.01); }
    return m;
  }
  function vbox(g, w, h, d, x, y, z) { return mesh(g, new THREE.BoxGeometry(w, h, d), MV, x, y + h / 2, z); }
  function B(g, w, h, d, color, x, y, z, op) { const m = K().caja(w, h, d, color, x, y, z, op); g.add(m); return m; }
  function rotulo(g, txt, w, h, bg, fg, x, y, z) {
    const t = tex('r' + txt + bg + fg, 256, 64, (c, W, H) => { c.fillStyle = hex(bg); c.fillRect(0, 0, W, H); c.fillStyle = hex(fg); c.font = 'bold 38px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, W / 2, H / 2 + 2); });
    const m = mesh(g, new THREE.PlaneGeometry(w, h), t ? new THREE.MeshBasicMaterial({ map: t }) : K().mat(bg), x, y, z);
    return m;
  }
  function bandera(g, x, z, alto, c) {
    const k = K(); g.add(k.cilindro(0.025, alto, 0xdfe3e8, x, 0, z, 5));
    const f = new THREE.Group(); f.position.set(x, alto - 0.12, z);
    f.add(k.caja(0.38, 0.22, 0.015, c, 0.2, -0.11, 0)); f.userData.anim = t => { f.rotation.y = Math.sin(t * 3 + x * 2) * 0.35; }; g.add(f); return f;
  }
  function tejado(g, w, d, alto, color, x, y, z) { const r = K().cono(Math.max(w, d) * 0.75, alto, color, x, y, z, 4); r.rotation.y = Math.PI / 4; r.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d)); g.add(r); return r; }
  function barril(g, r, largo, color, x, y, z, eje) { const m = mesh(g, new THREE.CylinderGeometry(r, r, largo, 16, 1, false, 0, Math.PI), K().mat(color), x, y, z); if (eje === 'x') m.rotation.z = Math.PI / 2; else { m.rotation.x = Math.PI / 2; m.rotation.y = Math.PI / 2; } return m; }
  function coche(g, x, z, col) { const k = K(); g.add(k.caja(0.34, 0.12, 0.64, col, x, 0.04, z)); g.add(k.caja(0.28, 0.1, 0.3, 0x24303c, x, 0.16, z - 0.03)); }
  function foco(g, x, y, z) { const k = K(); g.add(k.cilindro(0.04, y, 0x6b7480, x, 0, z, 5)); mesh(g, new THREE.BoxGeometry(0.34, 0.1, 0.2), new THREE.MeshBasicMaterial({ color: 0xfff6c8 }), x, y + 0.05, z); }

  // ---------- Edificios ----------
  const M = {
    pista(g, n, S) {
      const e = S.e, h = 1.4 + 0.1 * n;
      F(g, 3.9, h, 3.2, 'nave', e.muro[0], -0.4, 0.05, 0);
      if (n >= 3) barril(g, 1.65, 4.0, 0x7d8a96, -0.4, h + 0.05, 0, 'x'); else B(g, 4.1, 0.16, 3.4, S.c1, -0.4, h + 0.05, 0);
      B(g, 1.7, 0.1, 0.9, S.c2, -0.4, 1.0, 1.9); [-1.1, 0.3].forEach(x => B(g, 0.08, 1.0, 0.08, 0xdfe3e8, x, 0.05, 2.25));
      B(g, 0.8, 0.8, 0.03, 0x39424d, -0.4, 0.05, 1.61); rotulo(g, S.sig, 1.0, 0.25, S.c1, 0xffffff, -0.4, h * 0.82, 1.62);
      if (n >= 2) { B(g, 1.2, 0.95, 1.3, 0xc9ced6, 1.95, 0.05, 0.3); B(g, 1.3, 0.1, 1.4, S.c2, 1.95, 1.0, 0.3); }
      if (n >= 3) { B(g, 1.5, 0.03, 1.2, 0xc98d4f, 1.95, 0.05, -1.3); B(g, 1.5, 0.035, 0.03, 0xffffff, 1.95, 0.08, -1.3); B(g, 0.03, 0.035, 1.2, 0xffffff, 1.95, 0.08, -1.3); }
      if (n >= 4) for (let i = 0; i < 3; i++) { const p = B(g, 0.9, 0.04, 0.6, 0x1f2f4a, -1.5 + i * 0.95, h + 0.5, 0); p.rotation.z = 0.15; }
      if (n >= 5) [[-2.3, 1.6], [1.5, 1.6], [-2.3, -1.6], [1.5, -1.6]].forEach(q => foco(g, q[0], h + 0.9, q[1]));
    },
    gimnasio(g, n, S) {
      const e = S.e, pl = Math.min(3, 1 + Math.ceil(n / 2));
      for (let f = 0; f < pl; f++) F(g, 3.4, 0.9, 2.8, 'oficina', f % 2 ? e.muro[1] : e.muro[0], -0.3, 0.05 + f * 0.95, 0);
      const top = 0.05 + pl * 0.95; B(g, 3.6, 0.1, 3.0, 0x4b5866, -0.3, top, 0); B(g, 1.8, 0.26, 0.06, S.c1, -0.3, top - 0.4, 1.45);
      if (n >= 3) { B(g, 3.4, 0.2, 0.04, 0xdfe3e8, -0.3, top + 0.1, 1.45); B(g, 3.4, 0.2, 0.04, 0xdfe3e8, -0.3, top + 0.1, -1.45); B(g, 0.6, 0.35, 0.5, 0x6b7480, 0.7, top + 0.1, -0.4); }
      if (n >= 4) { B(g, 1.2, 0.03, 3.0, 0xb54a3a, 2.1, 0.05, 0); for (let i = 0; i < 3; i++) B(g, 1.2, 0.035, 0.03, 0xffffff, 2.1, 0.08, -0.9 + i * 0.9); }
      if (n >= 5) { B(g, 0.8, 0.5, 0.8, 0xeef1f4, 2.1, 0.05, 1.6); B(g, 0.84, 0.06, 0.84, S.c2, 2.1, 0.55, 1.6); }
    },
    medico(g, n, S) {
      const h = 1.0 + 0.3 * Math.min(n, 3);
      F(g, 3.4, h, 2.6, 'oficina', 0xf4f6f8, -0.2, 0.05, 0); B(g, 3.5, 0.08, 2.7, 0xd8dde3, -0.2, h + 0.05, 0);
      B(g, 0.5, 0.14, 0.04, 0xd62d2d, -1.4, h + 0.2, 1.32); B(g, 0.14, 0.5, 0.04, 0xd62d2d, -1.4, h + 0.02, 1.32);
      B(g, 1.4, 0.08, 0.8, 0x7fc2ec, -0.2, 0.9, 1.7, 0.7); [-0.8, 0.4].forEach(x => B(g, 0.05, 0.85, 0.05, 0xdfe3e8, x, 0.05, 2.0));
      if (n >= 3) { B(g, 0.7, 0.4, 0.38, 0xffffff, 1.9, 0.05, 1.6); B(g, 0.72, 0.07, 0.4, 0xd62d2d, 1.9, 0.2, 1.6); B(g, 0.3, 0.2, 0.34, 0xffffff, 2.15, 0.45, 1.6); }
      if (n >= 4) B(g, 1.0, 0.7, 1.0, 0xe9edf1, 1.9, 0.05, -1.0);
      if (n >= 5) { mesh(g, new THREE.CylinderGeometry(0.85, 0.85, 0.05, 16), K().mat(0x3a4450), -0.2, h + 0.14, 0); B(g, 0.1, 0.02, 0.7, 0xffffff, -0.45, h + 0.17, 0); B(g, 0.1, 0.02, 0.7, 0xffffff, 0.05, h + 0.17, 0); B(g, 0.5, 0.02, 0.1, 0xffffff, -0.2, h + 0.17, 0); }
    },
    residencia(g, n, S) {
      const e = S.e, pl = 1 + n;
      for (let f = 0; f < pl; f++) { F(g, 3.0, 0.55, 2.4, 'casa', f % 2 ? e.muro[1] : e.muro[0], -0.3, 0.05 + f * 0.58, 0); B(g, 3.1, 0.05, 0.3, f % 2 ? S.c1 : S.c2, -0.3, 0.05 + f * 0.58 + 0.01, 1.3); }
      const top = 0.05 + pl * 0.58;
      if (e.teja) tejado(g, 3.2, 2.6, 0.7, e.techo, -0.3, top, 0); else B(g, 3.2, 0.1, 2.6, e.techo, -0.3, top, 0);
      B(g, 0.7, top + 0.15, 0.7, 0xbfc7d1, 1.7, 0.05, -1.0); B(g, 0.5, 0.04, 0.5, 0x59636e, 1.7, top + 0.2, -1.0);
      if (n >= 3) { B(g, 1.1, 0.03, 1.0, 0x8cc075, 1.9, 0.05, 1.2); g.add(K().arbol(1.9, 1.2, 0.8)); }
      if (n >= 4) B(g, 0.6, 0.35, 0.5, 0x6b7480, -0.3, top + (e.teja ? 0.35 : 0.1), 0);
    },
    cantera(g, n, S) {
      const e = S.e;
      F(g, 3.2, 0.95, 2.2, 'casa', e.muro[0], -0.6, 0.05, 0);
      if (e.teja) tejado(g, 3.4, 2.4, 0.8, e.techo, -0.6, 1.0, 0); else B(g, 3.4, 0.14, 2.4, e.techo, -0.6, 1.0, 0);
      B(g, 0.25, 0.6, 0.25, 0x9b8a72, 0.5, 1.0, -0.4); B(g, 0.8, 0.55, 0.03, 0x6b4a2b, -0.6, 0.05, 1.11);
      if (n >= 2) { F(g, 1.4, 0.8, 1.9, 'oficina', 0xeef1f4, 1.9, 0.05, 0.2); B(g, 1.4, 0.06, 1.9, S.c1, 1.9, 0.85, 0.2); }
      if (n >= 3) { B(g, 1.4, 0.03, 1.1, 0xc98d4f, 1.9, 0.05, -1.5); B(g, 0.03, 0.55, 0.03, 0x333333, 1.9, 0.05, -1.95); B(g, 0.4, 0.04, 0.03, 0x333333, 1.9, 0.58, -1.95); }
      if (n >= 4) { F(g, 1.2, 0.9, 1.2, 'oficina', 0xe4e8ed, -2.1, 0.05, -1.4); B(g, 1.26, 0.06, 1.26, S.c2, -2.1, 0.95, -1.4); }
      if (n >= 5) { B(g, 0.4, 1.7, 0.4, e.muro[1], 0.2, 0.05, 1.3); tejado(g, 0.5, 0.5, 0.35, e.techo, 0.2, 1.75, 1.3); bandera(g, -0.6, 1.4, 1.5, S.c1); }
      rotulo(g, S.sig, 0.9, 0.22, S.c1, 0xffffff, -0.6, 0.85, 1.12);
    },
    tienda(g, n, S) {
      const e = S.e, w = 2.4 + (n >= 2 ? 0.4 : 0), alto = 0.9 + (n >= 3 ? 0.45 : 0);
      F(g, w, alto, 1.8, 'liso', e.muro[0], 0, 0.05, 0);
      for (let i = 0; i < 6; i++) B(g, (w + 0.2) / 6, 0.08, 0.7, i % 2 ? S.c2 : S.c1, -w / 2 - 0.1 + (w + 0.2) / 6 * (i + 0.5), 0.78, 1.15);
      B(g, w * 0.7, 0.4, 0.03, 0xb3dcf2, 0, 0.2, 0.91); B(g, 0.5, 0.55, 0.03, 0x39424d, w * 0.3, 0.05, 0.92);
      rotulo(g, S.sig, w * 0.5, 0.26, S.c1, 0xffffff, 0, alto - 0.05, 0.92);
      if (n >= 3) { bandera(g, -w / 2 - 0.1, 1.0, 1.7, S.c1); bandera(g, w / 2 + 0.1, 1.0, 1.7, S.c2); }
      B(g, 0.6, 0.35, 0.3, S.c2, -w / 2 - 0.7, 0.05, 1.2);
    },
    parking(g, n, S) {
      const cols = [0xd94f4f, 0xf2c14e, 0x4a90d9, 0xeeeeee, 0x2f3a46, 0x7cc38a];
      const t = tex('asfalto', 64, 64, (x, w, h) => { x.fillStyle = '#59616b'; x.fillRect(0, 0, w, h); for (let i = 0; i < 260; i++) { x.fillStyle = 'rgba(' + (i % 2 ? '255,255,255' : '0,0,0') + ',.08)'; x.fillRect((i * 37) % w, (i * 91) % h, 2, 2); } });
      mesh(g, new THREE.BoxGeometry(4.6, 0.04, 3.8), t ? new THREE.MeshLambertMaterial({ map: t }) : K().mat(0x59616b), 0, 0.02, 0);
      for (let i = 0; i < 6; i++) { B(g, 0.04, 0.045, 0.9, 0xffffff, -1.9 + i * 0.75, 0.04, -1.1); B(g, 0.04, 0.045, 0.9, 0xffffff, -1.9 + i * 0.75, 0.04, 0.7); }
      for (let i = 0; i < Math.min(12, 2 + n * 2); i++) coche(g, -1.55 + (i % 5) * 0.75, i < 5 ? -1.1 : 0.7, cols[i % 6]);
      B(g, 0.5, 0.6, 0.5, 0xdfe3e8, -2.0, 0.04, 1.55); B(g, 0.9, 0.05, 0.05, S.c1, -1.45, 0.5, 1.55);
      if (n >= 3) { B(g, 4.0, 0.06, 1.0, 0x1f2f4a, 0, 0.95, -1.1); [-1.9, 1.9].forEach(x => B(g, 0.05, 0.9, 0.05, 0x6b7480, x, 0.04, -1.1)); }
    },
    fans(g, n, S) {
      const t = tex('plaza', 64, 64, (x, w, h) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.fillStyle = (i + j) % 2 ? '#d9c9a8' : '#cdbb97'; x.fillRect(i * 8, j * 8, 8, 8); } });
      mesh(g, new THREE.BoxGeometry(4.6, 0.04, 3.8), t ? new THREE.MeshLambertMaterial({ map: t }) : K().mat(0xd9c9a8), 0, 0.02, 0);
      for (let i = 0; i < n + 2; i++) bandera(g, -1.8 + i * (3.6 / (n + 1)), 1.5, 1.3 + (i % 2) * 0.2, i % 2 ? S.c2 : S.c1);
      for (let i = 0; i < 3; i++) B(g, 0.7, 0.14, 0.26, 0x6b4a2b, -1.2 + i * 1.2, 0.04, 0.6);
      if (n >= 2) { B(g, 1.8, 0.3, 1.0, 0x3a4450, 0, 0.04, -1.3); B(g, 1.8, 0.9, 0.06, S.c1, 0, 0.34, -1.82); B(g, 0.5, 0.4, 0.06, S.c2, 0, 0.5, -1.78); }
      if (n >= 3) { B(g, 3.2, 0.9, 0.14, S.c2, 0, 0.04, -0.2); B(g, 3.2, 0.25, 0.16, S.c1, 0, 0.35, -0.2); }
    },
    oficinas(g, n, S) {
      const h = 1.2 + 0.5 * n;
      B(g, 3.2, 0.4, 2.8, 0xdfe3e8, 0, 0.0, 0);
      F(g, 2.4, h, 2.1, 'oficina', 0x4a6a86, 0, 0.4, 0); B(g, 2.5, 0.06, 2.2, 0x2c3e50, 0, 0.4 + h, 0); B(g, 0.9, 0.45, 0.03, 0x1c2733, 0, 0.4, 1.4);
      rotulo(g, S.sig, 1.5, 0.34, S.c1, 0xffffff, 0, 0.4 + h + 0.25, 1.06);
      if (n >= 3) { B(g, 0.05, 0.9, 0.05, 0xdfe3e8, 0.8, 0.4 + h, -0.6); B(g, 0.6, 0.15, 0.6, 0x6b7480, -0.6, 0.4 + h + 0.06, -0.5); }
    },
    emblema(g, n, S) {
      const e = S.e, v = S.variante;
      if (v === 'ausias') {
        const brick = n === 1 ? 0x9b7b62 : 0xb5543c;
        F(g, 3.8, 1.1, 2.8, 'liso', brick, 0, 0.05, 0); barril(g, 1.4, 4.0, n === 1 ? 0x7d8890 : 0x6f8793, 0, 1.15, 0, 'x');
        for (let i = 0; i < 7; i++) B(g, 0.34, 1.1, 0.04, i % 2 ? S.c2 : S.c1, -1.6 + i * 0.53, 0.05, 1.41);
        B(g, 0.8, 0.7, 0.04, 0x39424d, 0, 0.05, 1.43);
        if (n === 1) { B(g, 0.9, 0.5, 0.05, 0x5d4a3c, 1.1, 0.4, 1.44); B(g, 0.5, 0.35, 0.05, 0x6d6258, -1.3, 0.2, 1.44); }
        if (n >= 2) B(g, 3.9, 0.06, 0.1, 0xdfe3e8, 0, 1.15, 1.4);
        if (n >= 3) { F(g, 1.3, 0.9, 2.4, 'oficina', 0xcfe8f6, 2.55, 0.05, 0); B(g, 1.4, 0.06, 2.5, S.c1, 2.55, 0.95, 0); }
      } else if (v === 'masia') {
        F(g, 3.4, 1.0, 2.2, 'casa', 0xd9c2a0, -0.3, 0.05, 0); tejado(g, 3.6, 2.4, 0.85, 0xa4432e, -0.3, 1.05, 0);
        B(g, 0.5, 1.5, 0.5, 0xc7b08c, -1.7, 0.05, -0.6); tejado(g, 0.6, 0.6, 0.45, 0xa4432e, -1.7, 1.55, -0.6);
        for (let i = 0; i < 4; i++) { B(g, 0.35, 0.55, 0.04, 0x7a5a3a, -1.2 + i * 0.6, 0.05, 1.12); B(g, 0.35, 0.1, 0.04, 0xe9dcc4, -1.2 + i * 0.6, 0.6, 1.12); }
        if (n >= 2) { F(g, 1.4, 0.8, 1.9, 'oficina', 0xeef1f4, 2.0, 0.05, 0.2); B(g, 1.4, 0.06, 1.9, S.c1, 2.0, 0.85, 0.2); }
        if (n >= 3) { B(g, 1.5, 0.03, 1.1, 0xc98d4f, 2.0, 0.05, -1.5); bandera(g, -0.3, 1.2, 1.9, S.c1); bandera(g, 0.5, 1.2, 1.9, S.c2); }
      } else if (v === 'museo') {
        F(g, 3.6, 0.9, 2.6, 'oficina', 0xf4f6f8, 0, 0.05, 0); barril(g, 1.3, 3.8, 0xdfe6ec, 0, 0.95, 0, 'x'); B(g, 3.8, 0.12, 2.8, S.c1, 0, 0.0, 0);
        B(g, 0.9, 0.3, 0.9, 0xdfe3e8, 0, 0.0, 1.9); mesh(g, new THREE.CylinderGeometry(0.2, 0.12, 0.45, 8), K().mat(0xe8b923), 0, 0.55, 1.9); mesh(g, new THREE.SphereGeometry(0.2, 8, 6), K().mat(0xe8b923), 0, 0.93, 1.9);
        if (n >= 2) { F(g, 1.3, 0.8, 2.0, 'oficina', 0xcfe8f6, 2.6, 0.05, 0); B(g, 1.4, 0.06, 2.1, S.c2, 2.6, 0.85, 0); }
        if (n >= 3) { bandera(g, -1.7, 1.4, 1.9, S.c1); bandera(g, 1.7, 1.4, 1.9, S.c2); }
      } else {
        F(g, 3.0, 1.0, 2.4, 'casa', e.muro[0], -0.3, 0.05, 0); if (e.teja) tejado(g, 3.2, 2.6, 0.7, e.techo, -0.3, 1.05, 0); else B(g, 3.2, 0.12, 2.6, e.techo, -0.3, 1.05, 0);
        B(g, 0.6, 1.9, 0.6, e.muro[1], 1.6, 0.05, -0.6); B(g, 0.7, 0.08, 0.7, S.c1, 1.6, 1.95, -0.6); bandera(g, 1.6, -0.6, 2.7, S.c2);
        rotulo(g, S.sig, 1.0, 0.24, S.c1, 0xffffff, -0.3, 0.8, 1.22);
        if (n >= 2) { B(g, 1.2, 0.7, 1.4, e.muro[1], -2.0, 0.05, 0.4); }
        if (n >= 3) { B(g, 1.0, 0.03, 1.0, 0x8cc075, 0.2, 0.05, 1.7); g.add(K().arbol(0.2, 1.7, 0.7)); }
      }
    }
  };
  // Museo, hotel de concentración y sala de prensa (se añadieron después: ver ciudad_deportiva.js)
  Object.assign(M, {
    museo(g, n, S) {
      const e = S.e, w = 3.2 + (n >= 2 ? 0.4 : 0);
      F(g, w, 1.1, 2.4, 'liso', 0xeee8dc, -0.2, 0.05, 0);
      B(g, w + 0.3, 0.14, 2.7, 0xd6cdbb, -0.2, 1.15, 0);                       // cornisa
      B(g, w + 0.5, 0.12, 1.0, 0xd6cdbb, -0.2, 0.0, 1.6);                      // escalinata
      B(g, w + 0.2, 0.12, 0.7, 0xe3dccd, -0.2, 0.12, 1.55);
      for (let i = 0; i < 5; i++) g.add(K().cilindro(0.09, 1.0, 0xf5f1e8, -0.2 - w / 2 + 0.35 + i * (w - 0.7) / 4, 0.24, 1.38, 10));   // columnas
      B(g, 0.7, 0.75, 0.04, 0x39424d, -0.2, 0.24, 1.22);
      rotulo(g, 'MUSEO', 1.1, 0.24, S.c1, 0xffffff, -0.2, 1.0, 1.23);
      // trofeo en la entrada
      B(g, 0.5, 0.35, 0.5, 0xdfe3e8, 1.7, 0.05, 1.7); mesh(g, new THREE.CylinderGeometry(0.16, 0.1, 0.35, 10), K().mat(0xe8b923), 1.7, 0.58, 1.7); mesh(g, new THREE.SphereGeometry(0.15, 10, 8), K().mat(0xe8b923), 1.7, 0.88, 1.7);
      if (n >= 2) { mesh(g, new THREE.SphereGeometry(0.9, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), K().mat(0xcfe0ea), -0.2, 1.29, -0.1); }   // cúpula de cristal
      if (n >= 3) { F(g, 1.2, 0.8, 1.8, 'oficina', 0xcfe8f6, 2.3, 0.05, -0.5); B(g, 1.3, 0.06, 1.9, S.c2, 2.3, 0.85, -0.5); bandera(g, -2.2, 1.6, 1.8, S.c1); }
    },
    hotel(g, n, S) {
      const e = S.e, pl = 2 + n;
      for (let f = 0; f < pl; f++) { F(g, 2.6, 0.55, 2.0, 'oficina', f % 2 ? e.muro[1] : 0xf1ece2, -0.6, 0.05 + f * 0.58, 0); for (let i = 0; i < 4; i++) B(g, 0.42, 0.04, 0.2, 0xd9dee4, -1.5 + i * 0.6, 0.05 + f * 0.58 + 0.02, 1.1); }   // balcones
      const top = 0.05 + pl * 0.58;
      B(g, 2.8, 0.12, 2.2, 0x4b5866, -0.6, top, 0); rotulo(g, 'HOTEL', 1.2, 0.26, S.c1, 0xffffff, -0.6, top + 0.3, 0.9);
      B(g, 1.6, 0.06, 0.9, S.c1, -0.6, 0.62, 1.45); [-1.3, 0.1].forEach(x => B(g, 0.05, 0.58, 0.05, 0xdfe3e8, x, 0.05, 1.85));   // marquesina
      B(g, 0.8, 0.5, 0.03, 0x39424d, -0.6, 0.05, 1.01);
      B(g, 1.2, 0.03, 1.6, 0x59b4e6, 1.85, 0.06, 0.2); B(g, 1.4, 0.05, 1.8, 0xe9e4d8, 1.85, 0.03, 0.2);   // piscina
      if (n >= 2) for (let i = 0; i < 3; i++) B(g, 0.22, 0.06, 0.5, 0xffffff, 1.4 + i * 0.45, 0.05, 1.4);   // tumbonas
      if (n >= 3) { F(g, 1.2, 0.6, 1.0, 'liso', 0xdfe8ee, 1.85, 0.05, -1.4); B(g, 1.3, 0.05, 1.1, S.c2, 1.85, 0.65, -1.4); }   // spa
    },
    prensa(g, n, S) {
      const e = S.e;
      F(g, 2.8, 1.0, 2.0, 'oficina', 0x2f3e4e, -0.4, 0.05, 0);
      B(g, 2.9, 0.08, 2.1, S.c1, -0.4, 1.05, 0);
      B(g, 2.0, 0.6, 0.04, 0x1c2733, -0.4, 0.2, 1.02);                       // cristalera
      rotulo(g, 'PRENSA', 1.2, 0.24, S.c1, 0xffffff, -0.4, 0.92, 1.03);
      // antena parabólica y mástil
      const dish = mesh(g, new THREE.SphereGeometry(0.35, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.6), K().mat(0xeef1f4), 0.6, 1.4, -0.4); dish.rotation.x = -1.0;
      g.add(K().cilindro(0.04, 0.3, 0x9aa3ad, 0.6, 1.1, -0.4, 6));
      // furgoneta de televisión
      B(g, 0.5, 0.45, 1.0, 0xf4f6f8, 1.9, 0.05, 0.9); B(g, 0.52, 0.1, 0.4, S.c1, 1.9, 0.25, 0.9); g.add(K().cilindro(0.03, 0.6, 0x9aa3ad, 1.9, 0.5, 0.7, 5));
      if (n >= 2) { F(g, 1.3, 0.8, 1.4, 'oficina', 0xcfd8e2, 1.9, 0.05, -1.0); B(g, 1.4, 0.06, 1.5, 0x4b5866, 1.9, 0.85, -1.0); }
      if (n >= 3) { g.add(K().cilindro(0.05, 2.6, 0xc9ced6, -1.6, 1.1, -0.7, 6)); B(g, 0.9, 0.5, 0.05, S.c2, -0.4, 1.2, 0.6); }   // antena del canal y pantalla
    }
  });
  function suelo(g, color, sem) { g.add(K().mancha(3.25, color || 0xcfd6c7, 0, 0, 0, sem || 3, 1, 0.88, 0.02, 0.06)); }
  function modelo(tipo, nivel, S) {
    const g = new THREE.Group(); suelo(g, null, (U.hash(tipo) % 97) + 1);
    (M[tipo] || M.oficinas)(g, Math.max(1, nivel), S);
    return g;
  }
  function obra(tipo, dest, prog, viejo, S) {
    const g = new THREE.Group(), k = K(), p = Math.max(0.08, Math.min(1, prog));
    suelo(g, 0xb8a98a, (U.hash(tipo) % 97) + 1);
    if (viejo > 0) g.add(modelo(tipo, viejo, S)); else { const m = modelo(tipo, dest, S); m.scale.y = Math.max(0.12, p * 0.92); g.add(m); }
    const H = 1.2 + 0.25 * dest;
    [[-2.3, -1.9], [2.3, -1.9], [-2.3, 1.9], [2.3, 1.9]].forEach(q => g.add(k.cilindro(0.04, H, 0xd9a21b, q[0], 0.05, q[1], 5)));
    for (let i = 1; i <= Math.ceil(p * 4); i++) { const y = 0.05 + (H / 4) * i; g.add(k.caja(4.6, 0.04, 0.06, 0x8a6a3a, 0, y, -1.9)); g.add(k.caja(4.6, 0.04, 0.06, 0x8a6a3a, 0, y, 1.9)); g.add(k.caja(0.06, 0.04, 3.8, 0x8a6a3a, -2.3, y, 0)); g.add(k.caja(0.06, 0.04, 3.8, 0x8a6a3a, 2.3, y, 0)); }
    g.add(k.cilindro(0.07, 2.9, 0xf2b705, 2.9, 0, -2.4, 5));
    const jib = new THREE.Group(); jib.position.set(2.9, 2.9, -2.4); jib.add(k.caja(2.6, 0.08, 0.1, 0xf2b705, -1.1, 0, 0)); jib.add(k.caja(0.5, 0.3, 0.3, 0x555b63, 0.45, -0.1, 0)); jib.add(k.caja(0.02, 0.9, 0.02, 0x222222, -2.0, -0.9, 0));
    jib.userData.anim = t => { jib.rotation.y = Math.sin(t * 0.5 + dest) * 0.8; }; g.add(jib);
    g.add(k.caja(0.9, 0.3, 0.7, 0x8a6a3a, -2.9, 0, 2.3)); g.add(k.cono(0.3, 0.45, 0xd9a066, -3.0, 0, 1.4, 6));
    g.add(k.caja(2.4, 0.14, 0.14, 0x2b2f36, 0, 3.3, 0)); g.add(k.caja(2.4 * p, 0.17, 0.17, 0x4cc38a, -1.2 + 1.2 * p, 3.3, 0));
    return g;
  }
  function solar(S, nombre, bloqueado) {
    const g = new THREE.Group(), k = K();
    suelo(g, bloqueado ? 0xa9b3a3 : 0xb9cdae, (U.hash(nombre || 'solar') % 97) + 1);
    [[-2.4, -2.0], [2.4, -2.0], [-2.4, 2.0], [2.4, 2.0]].forEach(q => g.add(k.cilindro(0.04, 0.35, 0xffffff, q[0], 0.04, q[1], 4)));
    g.add(k.cilindro(0.04, 1.0, 0xdfe3e8, 0, 0.04, 1.4, 5)); g.add(k.caja(1.2, 0.5, 0.05, bloqueado ? 0x7a828c : S.c1, 0, 0.7, 1.4));
    return g;
  }

  // ---------- Entorno y vida ----------
  function tbox(world, w, h, d, color, t, x, y, z) { const m = mesh(world, new THREE.BoxGeometry(w, h, d), t ? new THREE.MeshLambertMaterial({ map: t }) : K().mat(color), x, y + h / 2, z); return m; }
  function camino(world, x1, z1, x2, z2, w, color, y) {
    const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz), m = mesh(world, new THREE.BoxGeometry(w, 0.04, len), K().mat(color), (x1 + x2) / 2, (y || 0) + 0.02, (z1 + z2) / 2);
    m.rotation.y = Math.atan2(dx, dz); return m;
  }
  function disco(world, r, color, x, y, z, sx, sz, alto) { const m = mesh(world, new THREE.CylinderGeometry(r, r, alto || 0.05, 36), K().mat(color), x, y, z); m.scale.set(sx || 1, 1, sz || 1); return m; }
  function mascota(world, x, z, animal, color) {
    const k = K(), g = new THREE.Group(), cu = parseInt(String(color || '#c8553d').replace('#', ''), 16);
    g.add(k.cilindro(0.34, 0.8, cu, 0, 0, 0, 10)); const cab = mesh(g, new THREE.SphereGeometry(0.34, 12, 10), k.mat(cu), 0, 1.15, 0);
    [[-0.22, 1.42], [0.22, 1.42]].forEach(q => { if (animal === 'oso' || animal === 'gato' || animal === 'lobo') g.add(k.cono(0.12, animal === 'oso' ? 0.1 : 0.28, cu, q[0], q[1], 0, 4)); else if (animal === 'toro') g.add(k.cono(0.08, 0.3, 0xf2e6d0, q[0] * 1.5, q[1] - 0.05, 0, 4)); else g.add(k.cono(0.1, 0.26, 0xf2c14e, q[0] * 0.7, q[1], 0, 4)); });
    [[-0.12, 1.18], [0.12, 1.18]].forEach(q => mesh(g, new THREE.SphereGeometry(0.05, 6, 5), k.mat(0x111111), q[0], q[1], 0.3));
    g.add(k.caja(0.55, 0.12, 0.04, 0xffffff, 0, 0.45, 0.34)); g.position.set(x, 0.05, z); g.rotation.y = 0.3;
    g.userData.anim = t => { g.rotation.y = 0.3 + Math.sin(t * 1.4) * 0.35; g.position.y = 0.05 + Math.abs(Math.sin(t * 3)) * 0.06; };
    world.add(g); return g;
  }
  function entorno(world, L, id, S) {
    const k = K(), A = L.ancho, B = L.fondo, cz = L.cz, z1 = L.z1, c1 = S.c1, c2 = S.c2, h0 = U.hash(id + 'ent');
    const hierba = tex('hierba', 64, 64, (x, w, h) => { x.fillStyle = '#7fb069'; x.fillRect(0, 0, w, h); for (let i = 0; i < 220; i++) { x.fillStyle = i % 2 ? 'rgba(255,255,255,.07)' : 'rgba(0,40,0,.09)'; x.fillRect((i * 29) % w, (i * 53) % h, 2, 2); } }, [14, 14]);
    void hierba; const sem = (h0 % 97) + 1;
    // Relieve: llano en el recinto y lomas suaves alrededor; el color varía con el ruido (prados, trigo, monte)
    const alt = (x, z) => { const e = Math.hypot(x / (A + 7), (z - cz) / (B + 7)); if (e < 1) return -0.04; const t = Math.min(1, (e - 1) * 1.6); return -0.04 + t * t * (1.2 + k.ruido(x * 0.06 + sem, z * 0.06) * 4.5); };
    const verde = [0.5, 0.69, 0.41], trigo = [0.66, 0.68, 0.43], monte = [0.38, 0.55, 0.32];
    world.add(k.relieve(170, 150, 85, alt, (x, z, y) => { const n = k.ruido(x * 0.08 + 7, z * 0.08), b = n > 0.68 ? trigo : n < 0.32 ? monte : verde, f = 0.92 + k.ruido(x * 0.5, z * 0.5) * 0.16; return [b[0] * f, b[1] * f, b[2] * f]; }, 0, cz));
    world.add(k.mancha(1, 0x8cc075, 0, -0.03, cz, sem, A + 1, B + 1, 0.03, 0.03));
    // plaza central con fuente
    world.add(k.mancha(4.3, 0xdcd3bd, 0, 0, cz, sem + 1, 1, 0.92, 0.03, 0.07)); disco(world, 1.1, 0x7fb8d8, 0, 0.05, cz, 1, 1, 0.25);
    // parterres de flores alrededor de la plaza
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + 0.5, x = Math.cos(a) * 5.6, z = Math.sin(a) * 5.0 + cz; world.add(k.mancha(0.7, 0x5f9a4c, x, 0, z, sem + i, 1.3, 0.8, 0.06, 0.2)); for (let j = 0; j < 5; j++) { const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), k.mat([0xe05a6d, 0xf2c14e, 0xffffff, 0xb36bd1][(i + j) % 4])); f.position.set(x + Math.cos(j * 1.3) * 0.45, 0.12, z + Math.sin(j * 1.3) * 0.3); world.add(f); } } world.add(k.cilindro(0.1, 0.9, 0xdfe3e8, 0, 0.05, cz, 6));
    // camino de ronda y radiales
    const NR = 40, ra = 8.6, rb = 7.4;
    void NR; const ronda = []; for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283, w = 1 + Math.sin(a * 3 + sem) * 0.04; ronda.push([Math.cos(a) * ra * w, Math.sin(a) * rb * w + cz]); }
    world.add(k.cinta(ronda, 1.1, 0xd7cdb4, 0.025, true));
    L.slots.forEach((sl, i) => { const a = Math.atan2(sl.z - cz, sl.x), ini = [Math.cos(a) * 4.0, Math.sin(a) * 3.6 + cz], fin = [sl.x - Math.sin(sl.rot) * 2.2, sl.z - Math.cos(sl.rot) * 2.2]; world.add(k.cinta(k.curvaEntre(ini, fin, 0.18, i + sem), 1.2, 0xd7cdb4, 0.03)); });
    // carretera de entrada con curvas
    const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push([3.2 * Math.sin(t * 3.4), z1 + 12 - t * (z1 + 12 - (cz + 5))]); }
    world.add(k.cinta(pts, 2.6, 0x59616b, 0.035));
    // seto-valla elíptica con puerta al sur
    const NP = 64;
    for (let i = 0; i < NP; i++) { const a = i / NP * 6.283; if (Math.abs(a - 1.5708) < 0.2) continue; const x = Math.cos(a) * (A + 0.4), z = Math.sin(a) * (B + 0.4) + cz; world.add(k.caja(0.32, 0.5, 0.32, c1, x, 0, z)); if (i % 2 === 0) world.add(k.arbol(Math.cos(a) * (A - 0.8), Math.sin(a) * (B - 0.8) + cz, 0.7)); }
    const gz = cz + B + 0.4;
    world.add(k.caja(0.4, 2.0, 0.4, c1, -1.8, 0, gz)); world.add(k.caja(0.4, 2.0, 0.4, c1, 1.8, 0, gz)); world.add(k.caja(4.0, 0.5, 0.5, c2, 0, 2.0, gz));
    rotulo(world, S.sig, 2.2, 0.4, c1, 0xffffff, 0, 2.25, gz + 0.27);
    bandera(world, -2.4, gz - 0.6, 2.6, c1); bandera(world, 2.4, gz - 0.6, 2.6, c2);
    // estanque en el hueco mayor entre edificios
    let mejor = null, md = -1;
    for (let q = 0; q < 16; q++) { const a = q / 16 * 6.283 + 0.2, x = Math.cos(a) * A * 0.62, z = Math.sin(a) * B * 0.6 + cz, d = Math.min.apply(null, L.slots.map(sl => Math.hypot(sl.x - x, sl.z - z)).concat([Math.hypot(x, z - cz) * 0.5 + 3, 9 - Math.abs(z - gz)])); if (d > md) { md = d; mejor = [x, z]; } }
    if (mejor && md > 5.2) { world.add(k.mancha(3.0, 0xd9c99a, mejor[0], -0.02, mejor[1], sem + 9, 1.25, 0.9, 0.03, 0.18)); world.add(k.mancha(2.6, 0x6fb0d4, mejor[0], 0, mejor[1], sem + 9, 1.25, 0.9, 0.03, 0.18)); for (let j = 0; j < 9; j++) { const a = j * 0.7 + sem; world.add(k.cono(0.05, 0.6, 0x6d8f3a, mejor[0] + Math.cos(a) * 2.9, 0, mejor[1] + Math.sin(a) * 2.1, 4)); } for (let j = 0; j < 6; j++) { const a = j / 6 * 6.283; world.add(k.arbol(mejor[0] + Math.cos(a) * 3.6, mejor[1] + Math.sin(a) * 2.8, 0.8)); } }
    // arboledas y árboles sueltos fuera de los edificios
    for (let g = 0; g < 14; g++) { const a = g / 14 * 6.283 + 0.3, x = Math.cos(a) * A * (0.5 + ((h0 >>> g) % 4) * 0.1), z = Math.sin(a) * B * (0.5 + ((h0 >>> (g + 2)) % 4) * 0.1) + cz; if (L.slots.some(sl => Math.hypot(sl.x - x, sl.z - z) < 5.2) || Math.abs(z - gz) < 5 || Math.hypot(x, z - cz) < 9.6) continue; for (let j = 0; j < 4; j++) world.add(k.arbol(x + ((h0 >>> (j + g)) % 5 - 2) * 0.55, z + ((h0 >>> (j + g + 3)) % 5 - 2) * 0.55, 0.9 + (j % 3) * 0.12)); }
    // farolas siguiendo el camino de ronda
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283 + 0.26; if (Math.abs(a - 1.5708) < 0.3) continue; foco(world, Math.cos(a) * (ra + 0.9), Math.sin(a) * (rb + 0.9) + cz, 1.1); }
    (L.decor || []).forEach(d => {
      if (d.t === 'pitch') {
        const t = tex('campo', 64, 64, (x, w, h) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#4a9e4f' : '#448f48'; x.fillRect(i * 8, 0, 8, h); } });
        tbox(world, d.w, 0.04, d.d, 0x4a9e4f, t, d.x, -0.01, d.z); tbox(world, d.w - 0.5, 0.045, 0.06, 0xffffff, null, d.x, 0.0, d.z - d.d / 2 + 0.3); tbox(world, d.w - 0.5, 0.045, 0.06, 0xffffff, null, d.x, 0.0, d.z + d.d / 2 - 0.3);
        tbox(world, 0.06, 0.045, d.d - 0.4, 0xffffff, null, d.x, 0.0, d.z); tbox(world, 0.06, 0.045, d.d - 0.6, 0xffffff, null, d.x - d.w / 2 + 0.3, 0.0, d.z); tbox(world, 0.06, 0.045, d.d - 0.6, 0xffffff, null, d.x + d.w / 2 - 0.3, 0.0, d.z);
      } else if (d.t === 'palau') {
        world.add(k.caja(d.w, 2.4, d.d, 0xb9c4c9, d.x, 0, d.z)); barril(world, d.d / 2, d.w, 0x7f9a8f, d.x, 2.4, d.z, 'x');
        for (let i = 0; i < 10; i++) world.add(k.caja(0.9, 2.4, 0.05, i % 2 ? c2 : c1, d.x - d.w / 2 + 1 + i * (d.w - 2) / 9, 0, d.z + d.d / 2 + 0.02));
      } else if (d.t === 'casas') {
        for (let i = 0; i < 26; i++) { const q = U.hash(id + 'c' + i), a = i / 26 * 6.283, x = Math.cos(a) * (A + 6 + (q % 5)), z = Math.sin(a) * (B + 6 + (q % 5)) + cz, ht = 1 + (q % 6) * 0.35;
          if (Math.abs(a - 1.5708) < 0.25) continue; const yC = alt(x, z) - 0.1; const hb = k.caja(1.6, ht, 1.6, [0xe8d8b8, 0xd9c2a0, 0xc9b79c, 0xe6cfa8][q % 4], x, yC, z); hb.rotation.y = -a; world.add(hb); const tj = k.caja(1.7, 0.1, 1.7, 0xb5543c, x, yC + ht, z); tj.rotation.y = -a; world.add(tj); }
      }
    });
    for (let i = 0; i < 90; i++) { const q = U.hash(id + 'a' + i) >>> 0, a = i / 90 * 6.283 + (q % 7) * 0.02, rr = 1.12 + (q % 13) * 0.07, x = Math.cos(a) * A * rr * 1.1, z = Math.sin(a) * B * rr * 1.1 + cz; if (Math.abs(x) < 6 && z > gz - 6) continue; const ar = q % 3 ? k.arbol(x, z, 1.1 + (q % 5) * 0.12) : k.arbolRedondo(x, z, 1.3 + (q % 4) * 0.15, [0x4f8f45, 0x6b9a3e, 0x3f7a3a][q % 3]); ar.position.y = alt(x, z); world.add(ar); }
    if (S.mascota) mascota(world, 2.2, gz - 2.4, S.mascota.animal, S.mascota.color);
  }
  function vida(world, L, S) {
    if (!alta()) return;
    const k = K(), z1 = L.z1;
    [0xd94f4f, 0x4a90d9].forEach((col, i) => {
      const c = new THREE.Group(); c.add(k.caja(0.38, 0.14, 0.72, col, 0, 0.04, 0)); c.add(k.caja(0.3, 0.12, 0.34, 0x24303c, 0, 0.17, -0.03)); world.add(c);
      c.userData.anim = t => { const u = ((t * 0.1 + i * 0.5) % 1), zz = z1 + 12 - u * (z1 + 12 - (L.cz + 5)); c.position.set(3.2 * Math.sin(u * 3.4) + (i ? 0.6 : -0.6), 0, zz); c.rotation.y = Math.PI; };
    });
    for (let i = 0; i < 7; i++) {
      const prim = new THREE.Group(); prim.add(k.caja(0.14, 0.22, 0.1, i % 2 ? S.c1 : S.c2, 0, 0.1, 0)); prim.add(k.cilindro(0.055, 0.1, 0xe8c19c, 0, 0.32, 0, 6));
      const p = GM.sede && GM.sede.figura ? GM.sede.figura({ semilla: 7919 * (i + 1), ropa: [i % 2 ? S.c1 : S.c2, 0x2f3a46] }, 0.4, prim) : prim; world.add(p);   // personas reales (modelos de la sede)
      const f = i * 1.7;
      p.userData.mover = t => { const a = t * 0.12 + f; p.position.set(Math.cos(a) * 8.6 * (1 + (i % 3) * 0.02), 0.02, Math.sin(a) * 7.4 * (1 + (i % 3) * 0.02) + L.cz); p.rotation.y = -a + Math.PI; };
    }
  }
  function animables(world) { const l = []; world.traverse(o => { if (o.userData && typeof o.userData.anim === 'function') l.push(o.userData.anim); }); return l; }
  function setCalidad(q) { C.calidad = q; try { window.localStorage.setItem('gm1:calidad', q); } catch (e) { } }
  GM.campus = { camino, disco, mascota, F, foco, coche, tex, rotulo, bandera, hex, alta, layout, modelo, obra, solar, entorno, vida, animables, ambiente, estilo, setCalidad, config: C, NOMBRE, EMB };
})();
