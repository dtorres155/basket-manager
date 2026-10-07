/* TU CASA EN 3D CON MODO CONSTRUCCIÓN (GM.casa) — al estilo de Big Ambitions
   Se entra desde el portal de tu edificio en la calle. Piso diáfano en corte (muros bajos) cuyo tamaño depende del nivel de
   vida (GM.mods.hogar.nivel). Modo construcción: catálogo por categorías (modelos Kenney CC0), el mueble sigue al puntero
   ajustado a una cuadrícula de 0,5 m, verde si cabe y rojo si no; R gira; tocar un mueble colocado permite girarlo, moverlo
   o venderlo (se devuelve la mitad). Pagos con tus ahorros (GM.mods.hogar.dinero, en miles de euros).
   El confort (suma de lo que hay) mejora el descanso. Usa el motor de sede3d.js (motor()).
   Estado: state.sede.casa = { muebles: [{ m, x, z, r }] } (se crea al entrar por primera vez). */
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
    ['rugRectangle', 'Alfombra', 0.1, 1, 'Decoración', true], ['rugRound', 'Alfombra redonda', 0.08, 1, 'Decoración', true], ['radio', 'Radio', 0.04, 1, 'Decoración'], ['trashcan', 'Papelera', 0.01, 0, 'Decoración']
  ];
  const CAT = {}; CATALOGO.forEach(c => { CAT[c[0]] = { m: c[0], nombre: c[1], precio: c[2], confort: c[3], cat: c[4], pisable: !!c[5] }; });
  const TAM = [[8, 6], [10, 7], [12, 8], [14, 10], [16, 11], [18, 12]];
  const nivel = st => (GM.mods.hogar && GM.mods.hogar.nivel ? GM.mods.hogar.nivel(st) : 1);
  const dinero = st => (GM.mods.hogar ? GM.mods.hogar.dinero(st) : 0);
  function gastar(st, k) { if (st.modo === 'carrera') st.carrera.dinero -= k; else { GM.mods.hogar.dinero(st); st.hogar.ahorros -= k; } }
  function datos(st) {
    st.sede = st.sede || { charlas: {} };
    if (!st.sede.casa) st.sede.casa = { muebles: [{ m: 'bedSingle', x: -2, z: -1.5, r: 0 }, { m: 'loungeSofa', x: 1.5, z: 1, r: 180 }, { m: 'tableCoffee', x: 1.5, z: -0.5, r: 0 }, { m: 'kitchenFridge', x: 2.5, z: -2.3, r: 0 }, { m: 'pottedPlant', x: -3.3, z: 2.3, r: 0 }] };
    return st.sede.casa;
  }
  function confort(st) { return datos(st).muebles.reduce((s, x) => s + ((CAT[x.m] || {}).confort || 0), 0); }
  const sala = st => { const [w, d] = TAM[Math.max(0, Math.min(5, nivel(st)))]; return [-w / 2, -d / 2, w / 2, d / 2]; };

  // ---------- Escena ----------
  let C = null; // estado del modo construcción
  async function construir(S, M, st) {
    const W = S.mundo, [x0, z0, x1, z1] = sala(st), w = x1 - x0, d = z1 - z0;
    S.scene.background = new THREE.Color(0x1d232a); S.scene.fog = null;
    const P = { limites: [x0 - 2, z0 - 2, x1 + 2, z1 + 4], CELDA: 0.5 }; S.G = M.rejilla(P); S.casaRect = [x0, z0, x1, z1];
    // Suelo de tarima y franja exterior (rellano)
    const tSuelo = M.textura('tarima-casa', 256, (x, n) => { for (let f = 0; f < 12; f++) { const k = 0.85 + ((f * 37) % 10) / 40; x.fillStyle = 'rgb(' + (196 * k | 0) + ',' + (150 * k | 0) + ',' + (104 * k | 0) + ')'; x.fillRect(0, f * n / 12, n, n / 12 - 1); } });
    if (tSuelo) tSuelo.repeat.set(w / 3, d / 3);
    const suelo = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tSuelo, color: tSuelo ? 0xffffff : 0xb98e63, roughness: 0.6 })); suelo.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); suelo.receiveShadow = true; W.add(suelo);
    const rellano = new THREE.Mesh(new THREE.PlaneGeometry(4, 3).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x9a948a })); rellano.position.set(0, -0.01, z1 + 1.5); W.add(rellano);
    // Muros en corte con puerta al sur (centro) y ventanas al norte
    const mMuro = new THREE.MeshStandardMaterial({ color: 0xf1ede6, roughness: 0.9 }), mRemate = new THREE.MeshStandardMaterial({ color: 0x2b3038 }), alto = 1.15;
    const muro = (xa, za, xb, zb) => { const l = Math.hypot(xb - xa, zb - za), m = new THREE.Mesh(new THREE.BoxGeometry(xa === xb ? 0.2 : l, alto, xa === xb ? l : 0.2), mMuro); m.position.set((xa + xb) / 2, alto / 2, (za + zb) / 2); m.castShadow = m.receiveShadow = true; W.add(m); const r = new THREE.Mesh(new THREE.BoxGeometry(xa === xb ? 0.21 : l, 0.04, xa === xb ? l : 0.21), mRemate); r.position.set(m.position.x, alto + 0.02, m.position.z); W.add(r); S.G.bloquea(Math.min(xa, xb) - 0.15, Math.min(za, zb) - 0.15, Math.max(xa, xb) + 0.15, Math.max(za, zb) + 0.15); };
    muro(x0, z0, x1, z0); muro(x0, z0, x0, z1); muro(x1, z0, x1, z1); muro(x0, z1, -0.7, z1); muro(0.7, z1, x1, z1);
    for (let i = 1; i < Math.floor(w / 3); i++) { const v = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 0.22), new THREE.MeshStandardMaterial({ color: 0x9fc4dc, roughness: 0.1, metalness: 0.3 })); v.position.set(x0 + i * 3, 0.75, z0); W.add(v); }
    // Muebles guardados
    S.mueblesCasa = [];
    await Promise.all(datos(st).muebles.map(x => colocarObj(S, M, x)));
    rehacerRejilla(S, st);
    S.zonas = [M.zona(W, { id: 'puerta_casa', nombre: 'Salir a la calle', accion: 'Bajar al portal', destino: {}, irA: 'calle', boton: 'Salir a la calle' }, 0, z1 + 1.2, st.equipos[st.clubId]),
      M.zona(W, { id: 'casa', nombre: 'Tu casa', accion: 'Confort ' + confort(st) + '. Descansa o redecora.', destino: { todos: 'ciudad' } }, (x0 + x1) / 2 + 1.2, z1 - 1.2, st.equipos[st.clubId])];
    S.spawnCasa = { x: 0, z: z1 + 0.8, ry: Math.PI };
    return W;
  }
  async function colocarObj(S, M, x) {
    const o = await M.mueble(x.m); if (!TAMS[x.m]) { const e = GM.sedePlano.ESCALA_MUEBLES; TAMS[x.m] = [Math.max(0.3, o.tam.x * e), Math.max(0.3, o.tam.z * e)]; } o.position.set(x.x, 0, x.z); o.rotation.y = x.r * Math.PI / 180; o.traverse(q => { if (q.isMesh) { q.castShadow = true; q.receiveShadow = true; } }); o.userData = { muebleCasa: x }; S.mundo.add(o); S.mueblesCasa.push(o); return o;
  }
  function huella(m, x, z, r) { const o = CAT[m]; const t = TAMS[m] || [1, 1], giro = Math.abs(Math.sin(r * Math.PI / 180)) > 0.5, w = giro ? t[1] : t[0], d = giro ? t[0] : t[1]; return [x - w / 2, z - d / 2, x + w / 2, z + d / 2]; }
  const TAMS = {}; // tamaño real en metros de cada modelo (se mide al cargarlo)
  function rehacerRejilla(S, st) {
    const G = S.G; G.b.fill(0); const [x0, z0, x1, z1] = S.casaRect, b = (a, c, e, f) => G.bloquea(a, c, e, f);
    b(x0 - 0.15, z0 - 0.15, x1 + 0.15, z0 + 0.15); b(x0 - 0.15, z0, x0 + 0.15, z1); b(x1 - 0.15, z0, x1 + 0.15, z1); b(x0, z1 - 0.15, -0.7, z1 + 0.15); b(0.7, z1 - 0.15, x1, z1 + 0.15);
    datos(st).muebles.forEach(x => { if (CAT[x.m] && CAT[x.m].pisable) return; const h = huella(x.m, x.x, x.z, x.r); b(h[0] + 0.05, h[1] + 0.05, h[2] - 0.05, h[3] - 0.05); });
  }
  function cabe(S, st, m, x, z, r, ignorar) {
    const [x0, z0, x1, z1] = S.casaRect, h = huella(m, x, z, r);
    if (h[0] < x0 + 0.1 || h[1] < z0 + 0.1 || h[2] > x1 - 0.1 || h[3] > z1 - 0.1) return false;
    if (CAT[m] && CAT[m].pisable) return true;
    if (Math.abs(x) < 1 && h[3] > z1 - 1.2) return false; // la entrada, libre
    return datos(st).muebles.every(o => { if (o === ignorar || (CAT[o.m] && CAT[o.m].pisable)) return true; const k = huella(o.m, o.x, o.z, o.r); return h[2] <= k[0] + 0.01 || h[0] >= k[2] - 0.01 || h[3] <= k[1] + 0.01 || h[1] >= k[3] - 0.01; });
  }
  async function medir(M, m) { if (TAMS[m]) return; const o = await M.mueble(m); const e = GM.sedePlano.ESCALA_MUEBLES; TAMS[m] = [Math.max(0.3, o.tam.x * e), Math.max(0.3, o.tam.z * e)]; }

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
    const cats = [...new Set(CATALOGO.map(c => c[4]))];
    const barra = h('div', { class: 'sede-hud casa-catalogo' },
      h('div', { class: 'cc-cab' }, h('b', null, 'Construcción'), h('span', null, 'Ahorros ' + (Math.round(dinero(st) * 10) / 10).toLocaleString('es-ES') + ' mil €, confort ' + confort(st)), h('span', { class: 'cc-ayuda' }, C.sel ? 'Mueble seleccionado' : C.elegido ? 'Toca el suelo para colocar, R para girar' : 'Elige un mueble o toca uno colocado')),
      C.sel ? h('div', { class: 'cc-sel' }, h('b', null, CAT[C.sel.userData.muebleCasa.m] ? CAT[C.sel.userData.muebleCasa.m].nombre : 'Mueble'),
        h('button', { class: 'btn peq', onclick: () => girarSel(S, M) }, 'Girar'), h('button', { class: 'btn peq', onclick: () => moverSel(S, M) }, 'Mover'),
        h('button', { class: 'btn btn-sec peq', onclick: () => venderSel(S, M) }, 'Vender (+' + Math.round((CAT[C.sel.userData.muebleCasa.m] || { precio: 0 }).precio * 500) + ' €)'), h('button', { class: 'btn btn-sec peq', onclick: () => { deseleccionar(S); pintarCatalogo(S, M); } }, 'Hecho'))
        : [h('div', { class: 'cc-cats' }, cats.map(c => h('button', { class: 'cc-cat' + (c === C.cat ? ' on' : ''), onclick: () => { C.cat = c; pintarCatalogo(S, M); } }, c))),
          h('div', { class: 'cc-items' }, CATALOGO.filter(c => c[4] === C.cat).map(c => h('button', { class: 'cc-item' + (C.elegido === c[0] ? ' on' : ''), disabled: dinero(st) < c[2], onclick: () => elegir(S, M, c[0]) }, h('b', null, c[1]), h('span', null, Math.round(c[2] * 1000).toLocaleString('es-ES') + ' €'), h('i', null, '+' + c[3] + ' confort'))))]);
    S.raiz.append(barra);
  }
  async function elegir(S, M, m) {
    deseleccionar(S); C.elegido = m; C.r = 0; if (C.fantasma) S.mundo.remove(C.fantasma);
    const o = await M.mueble(m); const mf = new THREE.MeshStandardMaterial({ color: 0x4cd07d, transparent: true, opacity: 0.55, depthWrite: false }); o.traverse(q => { if (q.isMesh) q.material = mf; }); o.userData = { fantasma: true, mat: mf }; o.visible = false; S.mundo.add(o); C.fantasma = o;
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
  function rotar(S) { if (C && C.elegido) { C.r = (C.r + 90) % 360; if (C.pos) hover(S, { x: C.pos[0], z: C.pos[1] }); } }
  GM.casa = { construir, activar, hover, toque, rotar, confort, datos, CATALOGO, activo: () => !!C };
})();
