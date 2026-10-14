/* Decorar los locales, el pabellón y la sede (punto 50 en otros espacios): el botón «Decorar» aparece en los interiores de tus locales (restaurante, gimnasio, barbería, bar de la peña, tienda, pabellón)
   y en la sede del club (donde está el despacho). Es el editor completo de la casa (casa_editor.js) adaptado a una sala ya construida:
   - muebles del mismo catálogo y con el mismo dinero (hogar.dinero), con pedidos con entrega (de 0 a 3 días; hasta entonces se ve la caja), sobre la cuadrícula de 0,5 m (verde si cabe, rojo si no, R gira);
   - muros sobre la cuadrícula (se pueden derribar tocándolos) y suelo nuevo para toda la sala (los seis de la casa);
   - deshacer y rehacer (Ctrl+Z, Ctrl+Y) con devolución del dinero; tocar un mueble tuyo lo vende (devuelve la mitad).
   Se guarda en state.sede.decor[<escena>] (muebles) y state.sede.decorMeta[<escena>] (suelo y muros). Lo que colocas admite las acciones de interaccion.js.
   GM.decorar: puede(S), activar(S, M, on), toque(S, M, p), hover(S, p), rotar(S), tecla(S, e), cargar(S, M, st). Prueba: node tools/decorar_prueba.js, t_casa_editor.js. */
(function () {
  const T = THREE, DECORABLES = ['restaurante', 'gimnasio_barrio', 'barberia', 'pena', 'tienda', 'pabellon', 'bar_pueblo'];
  const PRE = { muro: 0.05 };
  const clave = S => S.escena === 'sede' ? 'sede' : 'interior:' + (S.interiorTipo || S.escenaArg || '');
  const lista = (st, k) => { st.sede = st.sede || { charlas: {} }; st.sede.decor = st.sede.decor || {}; return st.sede.decor[k] = st.sede.decor[k] || []; };
  const meta = (st, k) => { st.sede = st.sede || { charlas: {} }; st.sede.decorMeta = st.sede.decorMeta || {}; const m = st.sede.decorMeta[k] = st.sede.decorMeta[k] || {}; m.muros = m.muros || []; return m; };
  const I = () => GM.casa._i, ajustar = v => Math.round(v * 2) / 2, euros = k => Math.round(k * 1000).toLocaleString('es-ES') + ' €';
  let C = null;   // estado del modo decorar
  const puede = S => !!(S && S.G && ((S.escena === 'interior' && DECORABLES.indexOf(S.interiorTipo || S.escenaArg) >= 0) || S.escena === 'sede'));
  const entrega = (st, c) => { const d = c.precio < 0.1 ? 0 : c.precio < 0.4 ? 1 : c.precio < 1 ? 2 : 3; return d ? GM.util.addDays(st.fecha, d) : undefined; };
  const pendiente = (st, x) => !!(x.llega && x.llega > st.fecha);
  function huella(m, x, z, r) { const t = I().TAMS[m] || [1, 1], g = Math.abs(Math.sin(r * Math.PI / 180)) > 0.5, w = g ? t[1] : t[0], d = g ? t[0] : t[1]; return [x - w / 2, z - d / 2, x + w / 2, z + d / 2]; }
  function celdas(S, h, f) { const G = S.G, [i0, j0] = G.celda(h[0] + 0.05, h[1] + 0.05), [i1, j1] = G.celda(h[2] - 0.05, h[3] - 0.05); for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) f(i, j); }
  function libre(S, m, x, z, r) {
    const h = huella(m, x, z, r), G = S.G; let ok = true; celdas(S, h, (i, j) => { if (!G.libre(i, j)) ok = false; }); if (!ok) return false;
    const sp = S.spawnInterior; if (sp && Math.hypot(sp.x - x, sp.z - z) < 2.2) return false;   // la entrada, libre
    return true;
  }
  function libreRect(S, a, b) { let ok = true; celdas(S, [Math.min(a[0], b[0]) - 0.1, Math.min(a[1], b[1]) - 0.1, Math.max(a[0], b[0]) + 0.1, Math.max(a[1], b[1]) + 0.1], (i, j) => { if (!S.G.libre(i, j)) ok = false; }); return ok; }
  const marcar = (S, h, v) => { celdas(S, h, (i, j) => { if (i >= 0 && j >= 0 && i < S.G.W && j < S.G.H) S.G.b[S.G.idx(i, j)] = v; }); S.navG = null; };
  function cajaPedido(x) { const t = I().TAMS[x.m] || [1, 1], g = new T.Group(), b = new T.Mesh(new T.BoxGeometry(Math.min(t[0], 2.2) * 0.92, 0.7, Math.min(t[1], 2.2) * 0.92), new T.MeshStandardMaterial({ color: 0xc9a46a, roughness: 0.85 })); b.position.y = 0.35; b.castShadow = true; g.add(b); return g; }
  async function colocarObj(S, M, x) {
    const st = S.st, pend = pendiente(st, x); await I().medir(M, x.m); const o = pend ? cajaPedido(x) : await M.mueble(x.m); o.position.set(x.x, 0, x.z); o.rotation.y = x.r * Math.PI / 180;
    o.traverse(q => { if (q.isMesh) { q.castShadow = true; q.receiveShadow = true; } }); o.userData = { decor: x, pedido: pend }; S.mundo.add(o); (S.decorObjs = S.decorObjs || []).push(o);
    marcar(S, (h => [h[0] + 0.05, h[1] + 0.05, h[2] - 0.05, h[3] - 0.05])(huella(x.m, x.x, x.z, x.r)), 1); if (!pend) (S.interiorMuebles = S.interiorMuebles || []).push([x.m, x.x, x.z, x.r, 'decor']); return o;
  }
  // ---------- Muros y suelo ----------
  function dibujarMuros(S, M) {
    const st = S.st, k = clave(S), Mt = meta(st, k); if (S.decorMuros) S.mundo.remove(S.decorMuros); const g = S.decorMuros = new T.Group(); S.mundo.add(g);
    Mt.muros.forEach((m, id) => { const horiz = m.a[1] === m.b[1], L = Math.abs(horiz ? m.b[0] - m.a[0] : m.b[1] - m.a[1]), me = new T.Mesh(new T.BoxGeometry(horiz ? L : 0.2, 1.1, horiz ? 0.2 : L), new T.MeshStandardMaterial({ color: 0xe9e4da, roughness: 0.9 })); me.position.set((m.a[0] + m.b[0]) / 2, 0.55, (m.a[1] + m.b[1]) / 2); me.castShadow = me.receiveShadow = true; me.userData = { decorMuro: id }; g.add(me); });
  }
  function bloquearMuros(S, m, v) { const r = [Math.min(m.a[0], m.b[0]) - 0.1, Math.min(m.a[1], m.b[1]) - 0.1, Math.max(m.a[0], m.b[0]) + 0.1, Math.max(m.a[1], m.b[1]) + 0.1]; marcar(S, r, v); }
  function aplicarSuelo(S, M) {
    const st = S.st, Mt = meta(st, clave(S)); if (S.decorSuelo) S.mundo.remove(S.decorSuelo); S.decorSuelo = null; if (Mt.suelo === undefined || Mt.suelo === null) return;
    const [x0, z0, x1, z1] = rectSala(S), k = Mt.suelo, t = M.textura('suelo-casa-' + k, 256, I().dibSuelo(k)), mt = new T.MeshStandardMaterial({ roughness: k === 3 ? 0.25 : 0.7 }); if (t) { mt.map = t.clone(); mt.map.needsUpdate = true; mt.map.repeat.set((x1 - x0) / 3, (z1 - z0) / 3); } else mt.color.set(0xb98e63);
    const p = new T.Mesh(new T.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2), mt); p.position.set((x0 + x1) / 2, 0.009, (z0 + z1) / 2); p.receiveShadow = true; S.mundo.add(p); S.decorSuelo = p;
  }
  function rectSala(S) { const G = S.G; return [G.x0 + 1, G.z0 + 1, G.x0 + G.W * G.c - 1, G.z0 + G.H * G.c - 1]; }
  // ---------- Carga, deshacer y rehacer ----------
  async function cargar(S, M, st) {
    if (!puede(S)) return; (S.decorObjs || []).forEach(o => S.mundo.remove(o)); S.decorObjs = []; S.interiorMuebles = (S.interiorMuebles || []).filter(q => q[4] !== 'decor'); const k = clave(S);
    for (const x of lista(st, k)) { try { await colocarObj(S, M, x); } catch (e) { /* mueble que ya no existe */ } }
    const Mt = meta(st, k); Mt.muros.forEach(m => bloquearMuros(S, m, 1)); dibujarMuros(S, M); aplicarSuelo(S, M);
  }
  const estado = (S, st) => JSON.stringify({ m: lista(st, clave(S)), mt: meta(st, clave(S)) });
  function snap(S) { if (!C) return; C.pila.push({ e: estado(S, S.st), d: I().dinero(S.st) }); if (C.pila.length > 60) C.pila.shift(); C.rehacer.length = 0; }
  async function restaurar(S, M, a) {
    const st = S.st, k = clave(S), o = JSON.parse(a.e), corte = h => [h[0] + 0.05, h[1] + 0.05, h[2] - 0.05, h[3] - 0.05];
    (S.decorObjs || []).forEach(q => { S.mundo.remove(q); const d = q.userData.decor; marcar(S, corte(huella(d.m, d.x, d.z, d.r)), 0); }); meta(st, k).muros.forEach(m => bloquearMuros(S, m, 0));
    S.decorObjs = []; S.interiorMuebles = (S.interiorMuebles || []).filter(q => q[4] !== 'decor'); st.sede.decor[k] = o.m; st.sede.decorMeta[k] = o.mt;
    I().gastar(st, I().dinero(st) - a.d); await cargar(S, M, st); pintar(S, M);
  }
  async function deshacer(S, M) { if (!C || !C.pila.length) return GM.ui.toast('No hay nada que deshacer'); const a = C.pila.pop(); C.rehacer.push({ e: estado(S, S.st), d: I().dinero(S.st) }); await restaurar(S, M, a); GM.ui.toast('Deshecho'); }
  async function rehacer(S, M) { if (!C || !C.rehacer.length) return GM.ui.toast('No hay nada que rehacer'); const a = C.rehacer.pop(); C.pila.push({ e: estado(S, S.st), d: I().dinero(S.st) }); await restaurar(S, M, a); GM.ui.toast('Rehecho'); }
  // ---------- Modo decorar ----------
  async function activar(S, M, on) {
    if (on === undefined) on = !S.decorando; S.decorando = on; S.raiz.querySelectorAll('.casa-catalogo').forEach(e => e.remove()); if (C && C.fantasma) S.mundo.remove(C.fantasma); if (C && C.prev) S.mundo.remove(C.prev);
    if (!on) { C = null; if (S.btnDecorar) S.btnDecorar.textContent = 'Decorar'; return; }
    C = { cat: 'Salón', elegido: null, r: 0, fantasma: null, herr: null, ini: null, prev: null, pila: [], rehacer: [], d0: I().dinero(S.st) }; if (S.btnDecorar) S.btnDecorar.textContent = 'Terminar de decorar'; if (S.panel) S.panel.style.display = 'none'; pintar(S, M);
  }
  function pintar(S, M) {
    const h = GM.h, st = S.st, i = I(), cats = ['Dormitorio', 'Salón', 'Cocina', 'Baño', 'Despacho', 'Decoración', 'Obra', 'Suelo', 'Pedidos']; S.raiz.querySelectorAll('.casa-catalogo').forEach(e => e.remove()); if (!C) return;
    const L = lista(st, clave(S)), pend = L.filter(x => pendiente(st, x));
    let cuerpo;
    if (C.cat === 'Obra') cuerpo = h('div', { class: 'cc-items' }, [['muro', 'Muro', euros(PRE.muro) + ' el metro'], ['derribar', 'Derribar muro', 'Devuelve la mitad']].map(([k, t, d]) => h('button', { class: 'cc-item' + (C.herr === k ? ' on' : ''), onclick: () => { C.herr = C.herr === k ? null : k; C.ini = null; quitarPrev(S); C.elegido = null; if (C.fantasma) { S.mundo.remove(C.fantasma); C.fantasma = null; } pintar(S, M); GM.ui.toast(C.herr === 'muro' ? 'Toca el punto de inicio y luego el final' : C.herr ? 'Toca un muro para derribarlo' : 'Herramienta soltada'); } }, h('b', null, t), h('span', null, d))));
    else if (C.cat === 'Suelo') cuerpo = h('div', { class: 'cc-items' }, i.SUELOS.map((s, k) => { const [x0, z0, x1, z1] = rectSala(S), precio = Math.max(0.1, s[2] * ((x1 - x0) * (z1 - z0)) / 60); return h('button', { class: 'cc-item' + (meta(st, clave(S)).suelo === k ? ' on' : ''), disabled: i.dinero(st) < precio, onclick: async () => { snap(S); i.gastar(st, precio); meta(st, clave(S)).suelo = k; aplicarSuelo(S, M); GM.ui.toast('Suelo: ' + s[0].toLowerCase() + ' (' + euros(precio) + ')'); pintar(S, M); } }, h('b', null, s[0]), h('span', null, euros(precio))); }));
    else if (C.cat === 'Pedidos') cuerpo = h('div', null, pend.length ? pend.map(x => { const c = i.CAT[x.m] || { nombre: x.m, precio: 0 }; return h('div', { class: 'cc-reforma ce-pedido' }, h('b', null, c.nombre), h('span', null, 'Llega el ' + GM.util.fecha(x.llega) + ', ' + euros(c.precio)), h('button', { class: 'btn btn-sec peq', onclick: async () => { snap(S); const k = L.indexOf(x); L.splice(k, 1); i.gastar(st, -c.precio); const o = (S.decorObjs || []).find(q => q.userData.decor === x); if (o) { S.mundo.remove(o); S.decorObjs.splice(S.decorObjs.indexOf(o), 1); marcar(S, (hh => [hh[0] + 0.05, hh[1] + 0.05, hh[2] - 0.05, hh[3] - 0.05])(huella(x.m, x.x, x.z, x.r)), 0); } GM.ui.toast('Pedido cancelado (+' + euros(c.precio) + ')'); pintar(S, M); } }, 'Cancelar el pedido')); }) : h('p', { class: 'muted' }, 'No tienes pedidos en camino. Lo barato llega al momento; lo caro tarda hasta tres días.'));
    else cuerpo = h('div', { class: 'cc-items' }, i.CATALOGO.filter(c => c[4] === C.cat).map(c => h('button', { class: 'cc-item' + (C.elegido === c[0] ? ' on' : ''), disabled: i.dinero(st) < c[2], onclick: () => elegir(S, M, c[0]) }, h('b', null, c[1]), h('span', null, euros(c[2])), h('i', null, '+' + c[3] + ' confort'))));
    S.raiz.append(h('div', { class: 'sede-hud casa-catalogo' }, h('div', { class: 'cc-cab' }, h('b', null, 'Decorar'), h('span', null, 'Ahorros ' + (Math.round(i.dinero(st) * 10) / 10).toLocaleString('es-ES') + ' mil €'), h('span', { class: 'cc-ayuda' }, C.elegido ? 'Toca el suelo para colocar, R para girar' : C.herr ? 'Herramienta de obra' : 'Elige un mueble, o toca uno tuyo para venderlo')),
      h('div', { class: 'ce-barra' }, h('button', { class: 'btn peq', disabled: !C.pila.length, onclick: () => deshacer(S, M) }, 'Deshacer'), h('button', { class: 'btn peq', disabled: !C.rehacer.length, onclick: () => rehacer(S, M) }, 'Rehacer'), h('button', { class: 'btn peq btn-sec', onclick: () => { const el = S.raiz.querySelector('.casa-catalogo'); if (el) el.classList.toggle('cc-min'); } }, 'Ver la sala'), h('span', { class: 'ce-pres' }, 'Obra: ' + euros(Math.max(0, C.d0 - i.dinero(st))) + (pend.length ? ', ' + pend.length + ' en camino' : ''))),
      h('div', { class: 'cc-cats' }, cats.map(c => h('button', { class: 'cc-cat' + (c === C.cat ? ' on' : ''), onclick: () => { C.cat = c; pintar(S, M); } }, c))), cuerpo));
  }
  function quitarPrev(S) { if (C && C.prev) { S.mundo.remove(C.prev); C.prev = null; } }
  async function elegir(S, M, m) {
    C.herr = null; C.ini = null; quitarPrev(S); C.elegido = m; C.r = 0; if (C.fantasma) S.mundo.remove(C.fantasma); await I().medir(M, m); const o = await M.mueble(m), mf = new T.MeshStandardMaterial({ color: 0x4cd07d, transparent: true, opacity: 0.55, depthWrite: false }); o.traverse(q => { if (q.isMesh) q.material = mf; }); o.userData = { fantasma: true, mat: mf }; o.visible = false; S.mundo.add(o); C.fantasma = o; pintar(S, M);
  }
  function hover(S, p) {
    if (!C) return; const x = ajustar(p.x), z = ajustar(p.z);
    if (C.herr === 'muro' && C.ini) { const dx = x - C.ini[0], dz = z - C.ini[1], b = Math.abs(dx) >= Math.abs(dz) ? [x, C.ini[1]] : [C.ini[0], z], L = Math.max(0.1, Math.abs(b[0] - C.ini[0]) + Math.abs(b[1] - C.ini[1])), horiz = b[1] === C.ini[1];
      if (!C.prev) { C.prev = new T.Mesh(new T.BoxGeometry(1, 0.3, 1), new T.MeshBasicMaterial({ color: 0x4cd07d, transparent: true, opacity: 0.6, depthWrite: false })); S.mundo.add(C.prev); } C.prev.scale.set(horiz ? L : 0.2, 1, horiz ? 0.2 : L); C.prev.position.set((b[0] + C.ini[0]) / 2, 0.15, (b[1] + C.ini[1]) / 2); C.prev.material.color.setHex(libreRect(S, C.ini, b) ? 0x4cd07d : 0xe0533d); return; }
    if (!C.fantasma || !C.elegido) return; const ok = libre(S, C.elegido, x, z, C.r);
    C.fantasma.visible = true; C.fantasma.position.set(x, 0.01, z); C.fantasma.rotation.y = C.r * Math.PI / 180; C.fantasma.userData.mat.color.setHex(ok ? 0x4cd07d : 0xe0533d); C.ok = ok; C.pos = [x, z];
  }
  async function toque(S, M, p) {
    if (!S.decorando || !C) return false; const st = S.st, i = I(), k = clave(S), Mt = meta(st, k);
    if (C.herr === 'muro') {
      const x = ajustar(p.x), z = ajustar(p.z);
      if (!C.ini) { C.ini = [x, z]; GM.ui.toast('Ahora el punto final'); return true; }
      const dx = x - C.ini[0], dz = z - C.ini[1], b = Math.abs(dx) >= Math.abs(dz) ? [x, C.ini[1]] : [C.ini[0], z], L = Math.abs(b[0] - C.ini[0]) + Math.abs(b[1] - C.ini[1]);
      if (L < 0.5) { C.ini = null; quitarPrev(S); return true; } if (!libreRect(S, C.ini, b)) { GM.ui.toast('Ahí no se puede levantar'); return true; } const precio = PRE.muro * L; if (i.dinero(st) < precio) { GM.ui.toast('No te llega el dinero'); return true; }
      snap(S); i.gastar(st, precio); const m = { a: C.ini, b }; Mt.muros.push(m); bloquearMuros(S, m, 1); dibujarMuros(S, M); C.ini = b; quitarPrev(S); pintar(S, M); return true;
    }
    if (C.herr === 'derribar') {
      const mejor = Mt.muros.map((m, id) => { const horiz = m.a[1] === m.b[1], lo = horiz ? Math.min(m.a[0], m.b[0]) : Math.min(m.a[1], m.b[1]), hi = horiz ? Math.max(m.a[0], m.b[0]) : Math.max(m.a[1], m.b[1]), c = horiz ? p.x : p.z, perp = horiz ? Math.abs(p.z - m.a[1]) : Math.abs(p.x - m.a[0]); return { id, ok: c >= lo - 0.3 && c <= hi + 0.3 && perp < 0.6, d: perp }; }).filter(q => q.ok).sort((a, b) => a.d - b.d)[0];
      if (!mejor) { GM.ui.toast('Toca un muro'); return true; } snap(S); const m = Mt.muros.splice(mejor.id, 1)[0], L = Math.abs(m.a[0] === m.b[0] ? m.b[1] - m.a[1] : m.b[0] - m.a[0]); bloquearMuros(S, m, 0); i.gastar(st, -PRE.muro * L / 2); dibujarMuros(S, M); GM.ui.toast('Muro derribado (+' + euros(PRE.muro * L / 2) + ')'); pintar(S, M); return true;
    }
    if (C.elegido) {
      hover(S, p); if (!C.ok) { GM.ui.toast('Ahí no cabe'); return true; } const c = i.CAT[C.elegido]; if (i.dinero(st) < c.precio) { GM.ui.toast('No te llega el dinero'); return true; }
      snap(S); i.gastar(st, c.precio); const x = { m: C.elegido, x: C.pos[0], z: C.pos[1], r: C.r }, llega = entrega(st, c); if (llega) x.llega = llega; lista(st, k).push(x); await colocarObj(S, M, x); GM.ui.toast(c.nombre + (llega ? ' pedido, llega el ' + GM.util.fecha(llega) : ' colocado') + ' (' + euros(c.precio) + ')'); pintar(S, M); return true;
    }
    const mio = (S.decorObjs || []).map(o => ({ o, d: Math.hypot(o.position.x - p.x, o.position.z - p.z), x: o.userData.decor })).filter(q => q.d < 0.9).sort((a, b) => a.d - b.d)[0];
    if (mio) { snap(S); const c = i.CAT[mio.x.m] || { precio: 0, nombre: 'Mueble' }, L = lista(st, k); L.splice(L.indexOf(mio.x), 1); S.mundo.remove(mio.o); S.decorObjs.splice(S.decorObjs.indexOf(mio.o), 1); marcar(S, (h => [h[0] + 0.05, h[1] + 0.05, h[2] - 0.05, h[3] - 0.05])(huella(mio.x.m, mio.x.x, mio.x.z, mio.x.r)), 0); i.gastar(st, -c.precio / 2); const q = (S.interiorMuebles || []).findIndex(z => z[4] === 'decor' && z[0] === mio.x.m && z[1] === mio.x.x && z[2] === mio.x.z); if (q >= 0) S.interiorMuebles.splice(q, 1); GM.ui.toast(c.nombre + ' vendido (+' + euros(c.precio / 2) + ')'); pintar(S, M); return true; }
    return false;
  }
  function rotar(S) { if (C && C.elegido) { C.r = (C.r + 90) % 360; if (C.pos) hover(S, { x: C.pos[0], z: C.pos[1] }); } }
  function tecla(S, e) { if (!C) return false; const k = e.key.toLowerCase(), M = GM.sede.motor(); if ((e.ctrlKey || e.metaKey) && k === 'z' && !e.shiftKey) { deshacer(S, M); return true; } if ((e.ctrlKey || e.metaKey) && (k === 'y' || (k === 'z' && e.shiftKey))) { rehacer(S, M); return true; } return false; }
  GM.decorar = { puede, activar, toque, hover, rotar, tecla, cargar, libre, lista, meta, pendiente, deshacer, rehacer, activo: () => !!C, estado: () => C, selfTest: () => typeof puede === 'function' && entrega({ fecha: '2026-10-01' }, { precio: 1.5 }) === '2026-10-04' };
  GM.register && GM.register('decorar', { selfTest: () => GM.decorar.selfTest() });
})();
