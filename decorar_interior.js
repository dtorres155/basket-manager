/* Decorar los locales y el pabellón (reutiliza el catálogo y el dinero del editor de la casa): en los interiores de tus locales (restaurante, gimnasio, barbería, bar de la peña, tienda y pabellón)
   aparece el botón «Decorar». Eliges un mueble del catálogo (el de la casa), lo ves en verde o rojo según quepa, lo colocas sobre la cuadrícula de 0,5 m y se guarda en state.sede.decor[<escena>].
   Tocar un mueble que has puesto lo vende (devuelve la mitad). Lo que colocas también admite las acciones de interaccion.js. No sustituye al editor completo de la casa (muros, suelos, pedidos): es la versión ligera para otros espacios.
   GM.decorar: puede(S), activar(S, M, on), toque(S, M, p), hover(S, p), cargar(S, M, st). Prueba: node tools/decorar_prueba.js, t_casa_editor.js. */
(function () {
  const T = THREE, DECORABLES = ['restaurante', 'gimnasio_barrio', 'barberia', 'pena', 'tienda', 'pabellon', 'bar_pueblo'];
  const clave = S => 'interior:' + (S.interiorTipo || S.escenaArg || '');
  const lista = (st, k) => { st.sede = st.sede || { charlas: {} }; st.sede.decor = st.sede.decor || {}; return st.sede.decor[k] = st.sede.decor[k] || []; };
  const I = () => GM.casa._i, ajustar = v => Math.round(v * 2) / 2, euros = k => Math.round(k * 1000).toLocaleString('es-ES') + ' €';
  let C = null;   // estado del modo decorar
  const puede = S => !!(S && S.escena === 'interior' && S.G && DECORABLES.indexOf(S.interiorTipo || S.escenaArg) >= 0);
  function huella(m, x, z, r) { const t = I().TAMS[m] || [1, 1], g = Math.abs(Math.sin(r * Math.PI / 180)) > 0.5, w = g ? t[1] : t[0], d = g ? t[0] : t[1]; return [x - w / 2, z - d / 2, x + w / 2, z + d / 2]; }
  function libre(S, m, x, z, r, ignorar) {
    const h = huella(m, x, z, r), G = S.G, [i0, j0] = G.celda(h[0] + 0.05, h[1] + 0.05), [i1, j1] = G.celda(h[2] - 0.05, h[3] - 0.05);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) if (!G.libre(i, j)) return false;
    const sp = S.spawnInterior; if (sp && Math.hypot(sp.x - x, sp.z - z) < 2.2) return false;   // la entrada, libre
    return true;
  }
  async function colocarObj(S, M, x) {
    await I().medir(M, x.m); const o = await M.mueble(x.m); o.position.set(x.x, 0, x.z); o.rotation.y = x.r * Math.PI / 180; o.traverse(q => { if (q.isMesh) { q.castShadow = true; q.receiveShadow = true; } }); o.userData = { decor: x };
    S.mundo.add(o); (S.decorObjs = S.decorObjs || []).push(o); const h = huella(x.m, x.x, x.z, x.r); S.G.bloquea(h[0] + 0.05, h[1] + 0.05, h[2] - 0.05, h[3] - 0.05); S.navG = null; (S.interiorMuebles = S.interiorMuebles || []).push([x.m, x.x, x.z, x.r]); return o;
  }
  async function cargar(S, M, st) { if (!puede(S)) return; S.decorObjs = []; for (const x of lista(st, clave(S))) { try { await colocarObj(S, M, x); } catch (e) { /* mueble que ya no existe */ } } }
  async function activar(S, M, on) {
    if (on === undefined) on = !S.decorando; S.decorando = on; S.raiz.querySelectorAll('.casa-catalogo').forEach(e => e.remove()); if (C && C.fantasma) S.mundo.remove(C.fantasma);
    if (!on) { C = null; if (S.btnDecorar) S.btnDecorar.textContent = 'Decorar'; return; }
    C = { cat: 'Salón', elegido: null, r: 0, fantasma: null }; if (S.btnDecorar) S.btnDecorar.textContent = 'Terminar de decorar'; if (S.panel) S.panel.style.display = 'none'; pintar(S, M);
  }
  function pintar(S, M) {
    const h = GM.h, st = S.st, i = I(), cats = ['Dormitorio', 'Salón', 'Cocina', 'Baño', 'Despacho', 'Decoración']; S.raiz.querySelectorAll('.casa-catalogo').forEach(e => e.remove());
    S.raiz.append(h('div', { class: 'sede-hud casa-catalogo' }, h('div', { class: 'cc-cab' }, h('b', null, 'Decorar'), h('span', null, 'Ahorros ' + (Math.round(i.dinero(st) * 10) / 10).toLocaleString('es-ES') + ' mil €'), h('span', { class: 'cc-ayuda' }, C.elegido ? 'Toca el suelo para colocar, R para girar' : 'Elige un mueble, o toca uno tuyo para venderlo')),
      h('div', { class: 'cc-cats' }, cats.map(c => h('button', { class: 'cc-cat' + (c === C.cat ? ' on' : ''), onclick: () => { C.cat = c; pintar(S, M); } }, c))),
      h('div', { class: 'cc-items' }, i.CATALOGO.filter(c => c[4] === C.cat).map(c => h('button', { class: 'cc-item' + (C.elegido === c[0] ? ' on' : ''), disabled: i.dinero(st) < c[2], onclick: () => elegir(S, M, c[0]) }, h('b', null, c[1]), h('span', null, euros(c[2])), h('i', null, '+' + c[3] + ' confort'))))));
  }
  async function elegir(S, M, m) {
    C.elegido = m; C.r = 0; if (C.fantasma) S.mundo.remove(C.fantasma); await I().medir(M, m); const o = await M.mueble(m), mf = new T.MeshStandardMaterial({ color: 0x4cd07d, transparent: true, opacity: 0.55, depthWrite: false }); o.traverse(q => { if (q.isMesh) q.material = mf; }); o.userData = { fantasma: true, mat: mf }; o.visible = false; S.mundo.add(o); C.fantasma = o; pintar(S, M);
  }
  function hover(S, p) {
    if (!C || !C.fantasma || !C.elegido) return; const x = ajustar(p.x), z = ajustar(p.z), ok = libre(S, C.elegido, x, z, C.r);
    C.fantasma.visible = true; C.fantasma.position.set(x, 0.01, z); C.fantasma.rotation.y = C.r * Math.PI / 180; C.fantasma.userData.mat.color.setHex(ok ? 0x4cd07d : 0xe0533d); C.ok = ok; C.pos = [x, z];
  }
  async function toque(S, M, p) {
    if (!S.decorando || !C) return false; const st = S.st, i = I();
    if (C.elegido) {
      hover(S, p); if (!C.ok) { GM.ui.toast('Ahí no cabe'); return true; } const c = i.CAT[C.elegido]; if (i.dinero(st) < c.precio) { GM.ui.toast('No te llega el dinero'); return true; }
      i.gastar(st, c.precio); const x = { m: C.elegido, x: C.pos[0], z: C.pos[1], r: C.r }; lista(st, clave(S)).push(x); await colocarObj(S, M, x); GM.ui.toast(c.nombre + ' colocado (' + euros(c.precio) + ')'); pintar(S, M); return true;
    }
    const mio = (S.decorObjs || []).map(o => ({ o, d: Math.hypot(o.position.x - p.x, o.position.z - p.z), x: o.userData.decor })).filter(q => q.d < 0.9).sort((a, b) => a.d - b.d)[0];
    if (mio) { const c = i.CAT[mio.x.m] || { precio: 0, nombre: 'Mueble' }, L = lista(st, clave(S)); L.splice(L.indexOf(mio.x), 1); S.mundo.remove(mio.o); S.decorObjs.splice(S.decorObjs.indexOf(mio.o), 1); const h = huella(mio.x.m, mio.x.x, mio.x.z, mio.x.r); { const G = S.G, [ia, ja] = G.celda(h[0] + 0.05, h[1] + 0.05), [ib, jb] = G.celda(h[2] - 0.05, h[3] - 0.05); for (let j = ja; j <= jb; j++) for (let i = ia; i <= ib; i++) if (i >= 0 && j >= 0 && i < G.W && j < G.H) G.b[G.idx(i, j)] = 0; S.navG = null; } i.gastar(st, -c.precio / 2); const k = (S.interiorMuebles || []).findIndex(q => q[0] === mio.x.m && q[1] === mio.x.x && q[2] === mio.x.z); if (k >= 0) S.interiorMuebles.splice(k, 1); GM.ui.toast(c.nombre + ' vendido (+' + euros(c.precio / 2) + ')'); pintar(S, M); return true; }
    return false;
  }
  function rotar(S) { if (C && C.elegido) { C.r = (C.r + 90) % 360; if (C.pos) hover(S, { x: C.pos[0], z: C.pos[1] }); } }
  GM.decorar = { puede, activar, toque, hover, rotar, cargar, libre, lista, activo: () => !!C, selfTest: () => typeof puede === 'function' };
  GM.register && GM.register('decorar', { selfTest: () => true });
})();
