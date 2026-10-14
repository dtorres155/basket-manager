/* Interacción dentro de los edificios (punto 51): tocar un mueble de tu casa o de un interior abre sus acciones (sentarse, dormir, cocinar, ver la tele, trabajar en el ordenador,
   entrenar, ducharse, abrir la nevera o un armario, encender una lámpara...). El personaje camina hasta el mueble, hace la animación, una barra de progreso avanza mientras pasa el tiempo
   del día y el objeto cambia de estado (la tele se enciende, la hornilla brilla, la ducha cae, la puerta se abre, la luz se apaga). Al terminar se aplican los efectos (GM.mods.hogar.aplicar).
   GM.interaccion.toque(S, M, p) lo llama sede_hud.js al tocar el suelo; busca el mueble más cercano en S.mueblesCasa (tu casa) o S.interiorMuebles (interiores: [nombre, x, z, grados]).
   Cada mueble grande tiene al menos una acción; los demás reciben «Mirar». Prueba: node tools/interaccion_prueba.js, t_interaccion.js. */
(function () {
  const T = THREE;
  const A = (id, t, d, o) => Object.assign({ id, t, d, dur: 4, min: 10, ef: {} }, o);
  // Cada definición: expresión sobre el nombre del modelo (Kenney Furniture Kit), nombre para el usuario y acciones
  const DEFS = [
    { re: /^bed/, n: 'Cama', acc: [A('siesta', 'Echarte una siesta', 'Una hora tumbado.', { dur: 5, min: 60, pose: 'tumbado', ef: { fat: -14, moral: 1 } }), A('dormir', 'Dormir hasta mañana', 'Solo de tarde o de noche: pasa el día.', { dur: 7, min: 480, pose: 'tumbado', ef: { fat: -40, moral: 2 }, noche: true }), A('hacer', 'Hacer la cama', 'Deja la habitación en orden.', { dur: 3, min: 5, anim: 'esperar', ef: { moral: 0.3 } })] },
    { re: /^(loungeSofa|loungeDesignSofa|loungeChair|loungeDesignChair|loungeChairRelax)/, n: 'Sofá', acc: [A('sentar', 'Sentarte a descansar', 'Media hora en el sofá.', { dur: 4, min: 30, pose: 'sit', ef: { fat: -4, moral: 1.2 } }), A('movil', 'Mirar el móvil', 'Un rato sin hacer nada.', { dur: 4, min: 20, pose: 'sit', ef: { moral: 0.8 } })] },
    { re: /^(chair|chairCushion|chairRounded|chairDesk|stoolBar|stoolBarSquare|bench)/, n: 'Asiento', acc: [A('sentar', 'Sentarte', 'Un momento de calma.', { dur: 3, min: 15, pose: 'sit', ef: { fat: -2, moral: 0.5 } })] },
    { re: /^(table|tableRound|tableCross|tableCoffee|tableCoffeeGlass|tableCoffeeSquare|tableGlass|sideTable|kitchenBar)/, n: 'Mesa', acc: [A('comer', 'Comer algo en la mesa', 'Un bocado tranquilo.', { dur: 4, min: 25, anim: 'comer', coste: 0.03, ef: { fat: -3, moral: 1 }, plato: true }), A('mirar', 'Mirar la mesa', 'Papeles, tazas y un par de libros.', { dur: 1.5, min: 1, anim: 'idle', ef: {}, dicho: 'Todo en su sitio, más o menos.' })] },
    { re: /^(televisionModern|televisionVintage|cabinetTelevision)/, n: 'Televisión', acc: [A('tele', 'Ver la tele', 'Un partido o un programa, con la tele encendida.', { dur: 6, min: 60, anim: 'esperar', estado: 'tele', ef: { moral: 1.8, xp: 0.02 } }), A('tele2', 'Ver un partido de baloncesto', 'Estudias a los rivales.', { dur: 7, min: 90, anim: 'esperar', estado: 'tele', ef: { moral: 1.2, xp: 0.06, conf: 0.4 } })] },
    { re: /^(kitchenStove|kitchenStoveElectric)/, n: 'Cocina', acc: [A('cocinar', 'Cocinar y comer', 'Cocinas algo y te lo comes.', { dur: 7, min: 50, anim: 'bolsas', estado: 'fuego', coste: 0.05, ef: { fat: -5, moral: 2 }, plato: true })] },
    { re: /^kitchenFridge/, n: 'Nevera', acc: [A('nevera', 'Abrir la nevera y picar algo', 'Abres la puerta y coges algo.', { dur: 3, min: 5, anim: 'comer', estado: 'puerta', ef: { fat: -1, moral: 0.6 } })] },
    { re: /^(kitchenCabinet|kitchenCabinetUpper|bookcaseClosed|bookcaseClosedDoors|bookcaseClosedWide|cabinetBed|cabinetBedDrawer|cabinetBedDrawerTable|sideTableDrawers|bathroomCabinet|bathroomCabinetDrawer)/, n: 'Mueble con puertas', acc: [A('abrir', 'Abrir y mirar dentro', 'Abres la puerta o el cajón y miras qué hay.', { dur: 2.5, min: 3, anim: 'esperar', estado: 'puerta', ef: { moral: 0.2 }, dicho: 'Cuántas cosas guardadas.' })] },
    { re: /^(kitchenSink|bathroomSink|bathroomSinkSquare)/, n: 'Lavabo', acc: [A('lavar', 'Lavarte las manos', 'Un poco de agua fría.', { dur: 2.5, min: 3, anim: 'esperar', ef: { fat: -1, moral: 0.3 } })] },
    { re: /^kitchenCoffeeMachine/, n: 'Cafetera', acc: [A('cafe', 'Prepararte un café', 'Un café y a seguir.', { dur: 4, min: 8, anim: 'comer', coste: 0.01, ef: { fat: -3, moral: 0.6 } })] },
    { re: /^(kitchenMicrowave|toaster|kitchenBlender|dryer|washer|washerDryerStacked)/, n: 'Electrodoméstico', acc: [A('usar', 'Ponerlo en marcha', 'Un rato y queda listo.', { dur: 4, min: 30, anim: 'esperar', ef: { moral: 0.3 } })] },
    { re: /^(desk|deskCorner|laptop|computerScreen|computerKeyboard)/, n: 'Ordenador', acc: [A('trabajar', 'Trabajar en el ordenador', 'Estudias, planificas y contestas correos.', { dur: 6, min: 90, anim: 'movil', estado: 'pantalla', ef: { xp: 0.05, conf: 0.6, fat: 2 } }), A('video', 'Analizar vídeo de partidos', 'Horas de vídeo con la pantalla encendida.', { dur: 7, min: 120, anim: 'movil', estado: 'pantalla', ef: { xp: 0.1, conf: 1, fat: 3 } })] },
    { re: /^(shower|showerRound)/, n: 'Ducha', acc: [A('ducha', 'Darte una ducha', 'Agua caliente y a descansar.', { dur: 5, min: 15, anim: 'esperar', estado: 'ducha', ef: { fat: -8, moral: 1.2 } })] },
    { re: /^bathtub/, n: 'Bañera', acc: [A('bano', 'Darte un baño', 'Largo y caliente.', { dur: 6, min: 40, anim: 'esperar', estado: 'ducha', ef: { fat: -12, moral: 2 } })] },
    { re: /^toilet/, n: 'Inodoro', acc: [A('wc', 'Usar el baño', 'Lo imprescindible.', { dur: 2, min: 5, anim: 'esperar', ef: {} })] },
    { re: /^(lamp|lampRound|lampSquare|lampRoundFloor|lampSquareFloor|lampRoundTable|lampSquareTable|lampSquareCeiling|lampWall)/, n: 'Lámpara', acc: [A('luz', 'Encender o apagar la luz', 'Cambia la luz de la lámpara.', { dur: 1, min: 0, anim: 'esperar', estado: 'luz', ef: {} })] },
    { re: /^(speaker|speakerSmall|radio)/, n: 'Música', acc: [A('musica', 'Poner música', 'Tu lista favorita.', { dur: 5, min: 30, anim: 'esperar', estado: 'musica', ef: { moral: 1.4 } })] },
    { re: /^(bookcaseOpen|bookcaseOpenLow|books)/, n: 'Estantería', acc: [A('leer', 'Leer un libro', 'Un capítulo tranquilo.', { dur: 5, min: 45, anim: 'esperar', ef: { moral: 0.8, xp: 0.02 } })] },
    { re: /^(pottedPlant|plantSmall1|plantSmall2|plantSmall3)/, n: 'Planta', acc: [A('regar', 'Regar la planta', 'Un poco de agua.', { dur: 2.5, min: 3, anim: 'esperar', ef: { moral: 0.3 } })] },
    { re: /^bathroomMirror/, n: 'Espejo', acc: [A('espejo', 'Mirarte al espejo', 'Te arreglas el pelo y ensayas la sonrisa.', { dur: 2.5, min: 3, anim: 'esperar', ef: { moral: 0.5 } })] },
    { re: /^(bear|rug|pillow|trashcan|coatRack|doorway)/, n: 'Objeto', acc: [A('mirar', 'Mirar', 'Un detalle de la casa.', { dur: 1.5, min: 1, anim: 'idle', ef: {}, dicho: 'Ahí sigue.' })] }
  ];
  const MEDIDAS = n => /Sofa|sofa/.test(n) ? [2.3, 1.1] : /bed/i.test(n) ? [2.1, 1.7] : /tableRound/.test(n) ? [1.5, 1.5] : /table|desk|kitchenBar|cabinet|bookcase/i.test(n) ? [1.5, 0.9] : /chair|Chair|stool|bench/i.test(n) ? [0.8, 0.8] : /kitchen|fridge|washer|dryer|shower|bath/i.test(n) ? [1.0, 0.9] : [0.7, 0.7];
  const defDe = n => DEFS.find(d => d.re.test(n)) || null;
  const lista = S => { const L = []; (S.mueblesCasa || []).forEach(o => { const m = o.userData && o.userData.muebleCasa; if (m) L.push({ n: m.m, x: o.position.x, z: o.position.z, ry: o.rotation.y, o }); });
    (S.interiorMuebles || []).forEach(([n, x, z, deg]) => L.push({ n, x, z, ry: (deg || 0) * Math.PI / 180, o: null })); return L; };
  function cercano(S, p) {
    let mejor = null, dm = 1e9; lista(S).forEach(q => { if (!defDe(q.n) || /^rug/.test(q.n)) return; const [w, d] = MEDIDAS(q.n), r = Math.max(w, d) / 2 + 0.35, dist = Math.hypot(q.x - p.x, q.z - p.z); if (dist < r && dist < dm) { dm = dist; mejor = q; } });
    return mejor;
  }
  const accionesDe = (S, q) => { const d = defDe(q.n); return d ? d.acc : []; };
  // ---------- Estado de los objetos (la tele, la hornilla, la luz...) ----------
  const ESTADOS = new WeakMap();   // objeto o clave -> { tipo: valor }
  function caja(S, q) { if (q.o) return new T.Box3().setFromObject(q.o); const [w, d] = MEDIDAS(q.n); return new T.Box3(new T.Vector3(q.x - w / 2, 0, q.z - d / 2), new T.Vector3(q.x + w / 2, 1.0, q.z + d / 2)); }
  function adorno(S, q, tipo, dur) {
    const W = S.mundo, bb = caja(S, q), c = bb.getCenter(new T.Vector3()), sz = bb.getSize(new T.Vector3()), fx = Math.sin(q.ry), fz = Math.cos(q.ry), prof = Math.abs(fx) > 0.5 ? sz.x : sz.z, ancho = Math.abs(fx) > 0.5 ? sz.z : sz.x, res = { objs: [], tick: null, fin: null };
    const poner = o => { W.add(o); res.objs.push(o); return o; };
    if (tipo === 'tele' || tipo === 'pantalla') {
      const cv = document.createElement('canvas'); cv.width = 64; cv.height = 40; const x = cv.getContext('2d'), tex = new T.CanvasTexture(cv), m = new T.MeshBasicMaterial({ map: tex, toneMapped: false }), pl = new T.Mesh(new T.PlaneGeometry(ancho * (tipo === 'tele' ? 0.78 : 0.5), sz.y * (tipo === 'tele' ? 0.62 : 0.4)), m);
      const alto = q.o && /^(laptop|computerScreen)/.test(q.n) ? bb.min.y + sz.y * 0.55 : bb.min.y + sz.y * (tipo === 'tele' ? 0.56 : 0.55) + (/^desk/.test(q.n) ? 0.45 : 0); pl.position.set(c.x + fx * (prof / 2 + 0.02), alto, c.z + fz * (prof / 2 + 0.02)); pl.rotation.y = q.ry; poner(pl);
      const luz = poner(new T.PointLight(tipo === 'tele' ? 0x9ec5ff : 0xcfe6ff, 1.6, 4, 1.8)); luz.position.set(c.x + fx * (prof / 2 + 0.6), alto, c.z + fz * (prof / 2 + 0.6));
      res.tick = t => { x.fillStyle = tipo === 'tele' ? ['#2d6fb0', '#e8c14a', '#2e7d32', '#c0392b'][Math.floor(t * 2.2) % 4] : '#0d2540'; x.fillRect(0, 0, 64, 40); if (tipo === 'tele') { x.fillStyle = '#fff'; x.fillRect(8 + (t * 25) % 40, 12, 10, 8); x.fillStyle = '#d9692b'; x.beginPath(); x.arc(32, 28, 5, 0, 7); x.fill(); } else { x.fillStyle = '#7fd0ff'; for (let i = 0; i < 6; i++) x.fillRect(5, 4 + i * 6, 12 + ((i * 17 + Math.floor(t * 3)) % 40), 2); } tex.needsUpdate = true; luz.intensity = 1.2 + 0.5 * Math.sin(t * 7); };
      res.fin = () => { m.map.dispose(); m.dispose(); };
    } else if (tipo === 'fuego') {
      const luz = poner(new T.PointLight(0xff7a2a, 2.2, 3.2, 1.8)); luz.position.set(c.x, bb.max.y + 0.15, c.z);
      for (const [ox, oz] of [[-0.18, -0.15], [0.18, -0.15], [-0.18, 0.15], [0.18, 0.15]]) { const a = new T.Mesh(new T.RingGeometry(0.05, 0.1, 16).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: 0xff6a1a })); a.position.set(c.x + ox, bb.max.y + 0.012, c.z + oz); poner(a); }
      res.tick = t => { luz.intensity = 1.8 + 0.7 * Math.sin(t * 11) * Math.sin(t * 5); };
    } else if (tipo === 'ducha') {
      const n = 46, g = new T.BufferGeometry(), pos = new Float32Array(n * 3), v = new Float32Array(n); for (let i = 0; i < n; i++) { pos[i * 3] = c.x + (Math.random() - 0.5) * 0.5; pos[i * 3 + 1] = bb.max.y - Math.random() * 1.4; pos[i * 3 + 2] = c.z + (Math.random() - 0.5) * 0.5; v[i] = 1.6 + Math.random(); }
      g.setAttribute('position', new T.BufferAttribute(pos, 3)); const pts = poner(new T.Points(g, new T.PointsMaterial({ color: 0x9fd8ff, size: 0.11, transparent: true, opacity: 0.9, depthTest: false })));
      res.tick = (t, dt) => { const p = g.attributes.position; for (let i = 0; i < n; i++) { p.array[i * 3 + 1] -= v[i] * (dt || 0.016); if (p.array[i * 3 + 1] < 0.05) p.array[i * 3 + 1] = bb.max.y; } p.needsUpdate = true; };
    } else if (tipo === 'puerta') {
      const col = q.o ? (() => { let c0 = 0xe9e4da; q.o.traverse(k => { if (k.isMesh && k.material && k.material.color && c0 === 0xe9e4da) c0 = k.material.color.getHex(); }); return c0; })() : 0xe9e4da, w = ancho * 0.92, h = sz.y * (/^kitchenFridge/.test(q.n) ? 0.8 : 0.5), pivote = new T.Group(), puerta = new T.Mesh(new T.BoxGeometry(w, h, 0.03), new T.MeshStandardMaterial({ color: col, roughness: 0.6 }));
      puerta.position.set(w / 2, 0, 0); pivote.add(puerta); const rx = Math.cos(q.ry), rz = -Math.sin(q.ry);
      pivote.position.set(c.x + fx * (prof / 2 + 0.02) - rx * w / 2, bb.min.y + h / 2 + (/^kitchenFridge/.test(q.n) ? 0.12 : sz.y * 0.22), c.z + fz * (prof / 2 + 0.02) - rz * w / 2); pivote.rotation.y = q.ry; poner(pivote);
      const t0 = performance.now(); res.tick = () => { const k = Math.min(1, (performance.now() - t0) / 450); pivote.rotation.y = q.ry - (1 - Math.pow(1 - k, 3)) * 1.2; };
    } else if (tipo === 'luz') { /* se maneja con el PointLight del propio mueble */ }
    return res;
  }
  // ---------- Panel y barra ----------
  let PANEL = null, BARRA = null, CORR = null;
  function quitarPanel() { if (PANEL) { PANEL.remove(); PANEL = null; } }
  function cancelar(S, M, motivo) {
    if (!CORR) return; const c = CORR; CORR = null; clearInterval(c.iv); if (BARRA) { BARRA.remove(); BARRA = null; }
    c.adornos.forEach(a => { a.objs.forEach(o => { if (o.parent) o.parent.remove(o); }); if (a.fin) a.fin(); });
    if (S.yo) { S.yo.obj.rotation.set(0, S.yo.obj.rotation.y, 0); S.yo.obj.position.y = 0; if (S.yo.sentado || S.yo.tumbado) { S.yo.tumbado = false; M.anim(S.yo, 'idle'); } else M.anim(S.yo, 'idle'); S.yo.asiento = 0; }
    if (S.fundidoInter) { S.fundidoInter.remove(); S.fundidoInter = null; }
    if (motivo && GM.ui && GM.ui.toast) GM.ui.toast(motivo);
  }
  function terminar(S, M, c) {
    const st = S.st, a = c.acc; cancelar(S, M);
    let txt = a.dicho || ''; if (GM.mods.hogar && GM.mods.hogar.aplicar) { const r = GM.mods.hogar.aplicar(st, a.ef, a.coste); txt = (r.texto ? r.texto : '') + (txt ? (r.texto ? ' ' : '') + txt : ''); if (r.motivo) txt = r.motivo; }
    if (a.estado === 'luz') alternarLuz(c.q);
    if (GM.ui && GM.ui.toast) GM.ui.toast((a.t.replace(/^[A-Z]/, x => x) + (txt ? ': ' + txt : '')).slice(0, 140));
    if (a.noche && GM.sede && GM.sede.avanzarDia) GM.sede.avanzarDia();
    GM.bus && GM.bus.emit('interaccion:hecha', { id: a.id, mueble: c.q.n, escena: S.escena });
  }
  function alternarLuz(q) { const pl = q.o && q.o.luzCasa; if (pl) pl.visible = !pl.visible; }
  function libreCerca(S, q) {
    const [w, d] = MEDIDAS(q.n), r = Math.max(w, d) / 2 + 0.55, G = S.G, yo = S.yo.obj.position; let mejor = null, dm = 1e9;
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2, x = q.x + Math.sin(a) * (Math.abs(Math.sin(a)) > 0.5 ? w / 2 + 0.55 : r), z = q.z + Math.cos(a) * (Math.abs(Math.cos(a)) > 0.5 ? d / 2 + 0.55 : r);
      let ok = true; if (G && G.celda && G.libre) { const [i, j] = G.celda(x, z); ok = G.libre(i, j); } const dist = Math.hypot(x - yo.x, z - yo.z); if (ok && dist < dm) { dm = dist; mejor = [x, z]; } }
    return mejor || [q.x, q.z + 1.2];
  }
  function empezar(S, M, q, a) {
    quitarPanel(); if (!S.yo || CORR) return; const st = S.st;
    if (a.noche && (S.hora || 12) < 19) { GM.ui.toast('Aún es pronto para dormir hasta mañana'); return; }
    const st0 = GM.mods.hogar && GM.mods.hogar.puede ? GM.mods.hogar.puede(st, a.coste) : { ok: true }; if (!st0.ok) { GM.ui.toast(st0.motivo); return; }
    const dest = a.pose === 'sit' || a.pose === 'tumbado' ? libreCerca(S, q) : libreCerca(S, q), llegar = () => comenzar(S, M, q, a);
    M.irA(S.yo, dest[0], dest[1], llegar);
  }
  function comenzar(S, M, q, a) {
    if (!S.yo || CORR) return; const yo = S.yo, o = yo.obj;
    o.lookAt(q.x, 0, q.z); const adornos = []; let nombreObj = (defDe(q.n) || {}).n || 'objeto';
    if (a.pose === 'sit') { o.position.set(q.x, 0, q.z); yo.asiento = /bed|Sofa|sofa|lounge/.test(q.n) ? 0.42 : 0.45; o.rotation.y = q.ry; M.anim(yo, 'sit'); }
    else if (a.pose === 'tumbado') { const fx = Math.sin(q.ry), fz = Math.cos(q.ry); o.rotation.order = 'YXZ'; o.rotation.set(-Math.PI / 2, q.ry, 0); o.position.set(q.x + fx * 0.75, 0.62, q.z + fz * 0.75); yo.tumbado = true; if (yo.mixer) yo.mixer.stopAllAction(); }
    else if (a.anim) M.anim(yo, a.anim);
    if (a.estado && a.estado !== 'luz') { const k = a.estado, ya = ESTADOS.get(q.o || q) || {}; adornos.push(adorno(S, q, k)); ya[k] = true; }
    if (a.estado === 'luz') { alternarLuz(q); }
    if (a.plato) { const pl = new T.Mesh(new T.CylinderGeometry(0.11, 0.1, 0.02, 12), new T.MeshStandardMaterial({ color: 0xf2efe6 })); const bb = caja(S, q); pl.position.set((bb.min.x + bb.max.x) / 2, bb.max.y + 0.02, (bb.min.z + bb.max.z) / 2); S.mundo.add(pl); adornos.push({ objs: [pl] }); }
    if (a.pose === 'tumbado' || a.id === 'dormir') { const v = GM.h('div', { class: 'inter-sueno', style: { opacity: '0', transition: 'opacity 1.2s' } }); S.raiz.append(v); S.fundidoInter = v; requestAnimationFrame(() => { v.style.opacity = '0.62'; }); }
    const barra = GM.h('div', { class: 'sede-hud inter-barra' }, GM.h('b', null, a.t), GM.h('div', { class: 'inter-pista' }, GM.h('i', null)), GM.h('button', { class: 'btn btn-sec peq', onclick: () => cancelar(S, M, 'Lo dejas a medias') }, 'Parar'));
    S.raiz.append(barra); BARRA = barra; const relleno = barra.querySelector('i'); const t0 = performance.now(); let h0 = S.hora || 12, previo = 0;
    const c = CORR = { q, acc: a, adornos, iv: null, t0 };
    c.iv = setInterval(() => {
      if (!GM.sede || GM.sede._estado() !== S || !CORR) { cancelar(S, M); return; }
      if (S.yo.camino && S.yo.camino.length > 0 && !yo.tumbado && !yo.sentado) { cancelar(S, M, 'Lo dejas a medias'); return; }
      const t = (performance.now() - t0) / 1000, k = Math.min(1, t / (a.dur * (GM.interaccion.velocidad || 1))); relleno.style.width = Math.round(k * 100) + '%';
      adornos.forEach(ad => { if (ad.tick) ad.tick(t, 0.08); });
      if (a.min > 0) { S.hora = Math.min(23.5, (S.hora || 12) + a.min / 60 * (k - previo)); S.tLuz = 0; } previo = k;
      if (k >= 1) terminar(S, M, c);
    }, 80);
  }
  function panel(S, M, q) {
    quitarPanel(); const d = defDe(q.n), acc = d ? d.acc : []; if (!acc.length) return false; const h = GM.h;
    PANEL = h('div', { class: 'sede-hud inter-panel' }, h('div', { class: 'inter-cab' }, h('b', null, d.n), h('button', { class: 'sp-x', 'aria-label': 'Cerrar', onclick: quitarPanel }, '×')),
      acc.map(a => { const noche = a.noche && (S.hora || 12) < 19; return h('button', { class: 'sp-accion', disabled: noche, onclick: () => empezar(S, M, q, a) }, h('b', null, a.t), h('span', null, noche ? 'Solo por la tarde o por la noche.' : a.d + (a.min ? ' (' + (a.min >= 60 ? Math.round(a.min / 6) / 10 + ' h' : a.min + ' min') + ')' : ''))); }));
    S.raiz.append(PANEL); return true;
  }
  function toque(S, M, p) {
    if (!S || !S.yo || CORR || !(S.escena === 'casa' || S.escena === 'interior' || S.interiorMuebles)) return false;
    const q = cercano(S, p); if (!q) return false; return panel(S, M, q);
  }
  function selfTest() { return defDe('bedDouble') && defDe('kitchenStove') && defDe('televisionModern') && defDe('lampRoundFloor') && DEFS.every(d => d.acc.length > 0 && d.acc.every(a => a.id && a.t && a.dur > 0)) && !defDe('inexistente'); }
  GM.interaccion = { velocidad: 1, DEFS, defDe, toque, cercano, panel, empezar, cancelar, accionesDe, MEDIDAS, selfTest, activa: () => !!CORR };
  GM.register && GM.register('interaccion', { selfTest });
})();
