/* Movilidad (puntos 38 a 41): tráfico por horas, planificador de viajes con tiempos reales, patinetes y motos de alquiler, coche y moto propios.
   - Tráfico (38): tipos de vehículo (camión, policía, taxis que paran, tranvía por las vías reales), hora punta con más coches y más lentos, hora valle y noche con pocos, giros en los cruces.
   - Planificador (39): GM.movilidad.opciones(S, st, destino) compara a pie (1,4 m/s), bici pública, patinete, metro, autobús, taxi y coche propio con tiempo y coste; el mapa lo usa en «Ir ya».
     Al andar o conducir el reloj del juego va a ritmo real (1:1); quieto va comprimido. Tarjeta de transporte de 10 viajes.
   - Micromovilidad (40): flota de patinetes y motos eléctricas de alquiler (marcas ficticias «Rodi» y «Volta», sin licencias) con desbloqueo, batería, tarifa por minuto y zonas de aparcamiento.
   - Coche propio (41): concesionario, compra o alquiler (en carrera paga el jugador; en los demás modos hay coche oficial del club), conducción con física sencilla, gasolina, radares y multas, seguro, ITV y aparcamiento.
   Estado persistente en st.sede.movilidad. Pruebas: node tools/movilidad_prueba.js y t_movilidad.js. */
(function () {
  const U = GM.util;
  const MARCAS = { patinete: 'Rodi', moto: 'Volta' };
  const MODELOS = [
    { id: 'moto', nombre: 'Moto 125', precio: 3800, kit: null, vmax: 19, ancho: 0.8, largo: 2.0 },
    { id: 'compacto', nombre: 'Utilitario', precio: 11500, kit: 'compacto', vmax: 20, ancho: 1.75, largo: 3.9 },
    { id: 'turismo', nombre: 'Berlina', precio: 26000, kit: 'turismo', vmax: 22, ancho: 1.85, largo: 4.5 },
    { id: 'todoterreno', nombre: 'Todoterreno', precio: 41000, kit: 'todoterreno', vmax: 22, ancho: 1.95, largo: 4.6 }
  ];
  const COLORES = ['#c0392b', '#1f4e79', '#e9e9e9', '#2c2c2c', '#2e7d32', '#d4a017'];
  const mem = st => { st.sede = st.sede || { charlas: {} }; return st.sede.movilidad || (st.sede.movilidad = { tarjeta: 0, coche: null, multas: [], gastado: 0, viajes: 0 }); };
  const carrera = st => st.modo === 'carrera' && st.carrera;
  const euros = v => (Math.round(v * 100) / 100).toLocaleString('es-ES', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' €';
  const dinero = st => carrera(st) ? st.carrera.dinero * 1000 : Infinity;
  const pagar = (st, e) => { if (carrera(st)) st.carrera.dinero -= e / 1000; mem(st).gastado += e; if (GM.bus && carrera(st)) GM.bus.emit && GM.bus.emit('dinero:cambio', {}); };
  const toast = t => { if (GM.ui && GM.ui.toast) GM.ui.toast(t); };
  const sumaDias = (f, n) => U.addDays ? U.addDays(f, n) : f;
  const hora = S => S.hora || 12;
  const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
  const distancia = (S, a, b) => GM.sede && GM.sede.distancia ? GM.sede.distancia(a[0], a[1], b[0], b[1]) : dist2(a[0], a[1], b[0], b[1]) * 1.25;
  const dow = S => new Date(String(S.st.fecha).slice(0, 10) + 'T12:00:00').getDay();

  // ------------------------------------------------------------ tráfico (38)
  const punta = (h, d) => d >= 1 && d <= 5 && ((h >= 7.5 && h < 9.7) || (h >= 13.4 && h < 15.2) || (h >= 17.4 && h < 20.2));
  function densidad(h, d) { if (punta(h, d)) return 1; if (h < 5.5) return 0.18; if (h < 7) return 0.42; if (h >= 22.5) return 0.25; if (h >= 20.2) return 0.6; return d === 0 || d === 6 ? 0.5 : 0.62; }
  const factorVel = (h, d) => punta(h, d) ? 0.55 : 1;
  function camion(color) {
    const g = new THREE.Group(), m = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6 }, o || {})), B = (w, hh, d, mt, x, y, z) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mt); me.position.set(x, y, z); me.castShadow = true; g.add(me); return me; };
    B(2.3, 2.2, 1.9, m(color || '#c9ced3'), 0, 1.5, 2.3); B(2.1, 0.9, 0.05, m('#22303a', { roughness: 0.1, metalness: 0.5 }), 0, 1.95, 3.27); B(2.45, 2.7, 5.4, m('#f1f1ee'), 0, 1.95, -1.0); B(2.2, 0.4, 7.6, m('#2b2f33'), 0, 0.55, 0.5);
    for (const [x, z] of [[-1.05, 2.6], [1.05, 2.6], [-1.05, -1.2], [1.05, -1.2], [-1.05, -2.6], [1.05, -2.6]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.35, 14), m('#151515')); w.rotation.z = Math.PI / 2; w.position.set(x, 0.5, z); g.add(w); }
    g.userData = { coche: true }; return g;
  }
  function tranvia(club) {
    const g = new THREE.Group(), cuerpo = new THREE.MeshStandardMaterial({ color: club && club.colores ? club.colores[0] : '#1d4f91', roughness: 0.4, metalness: 0.3 }), blanco = new THREE.MeshStandardMaterial({ color: '#eceff1', roughness: 0.4 }), vid = new THREE.MeshStandardMaterial({ color: '#1b2a36', roughness: 0.1, metalness: 0.5 });
    const B = (w, hh, d, mt, x, y, z) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mt); me.position.set(x, y, z); me.castShadow = true; g.add(me); return me; };
    for (const z0 of [-7.6, 7.6]) { B(2.4, 3.1, 14.4, blanco, 0, 2.0, z0); B(2.44, 0.9, 14.2, vid, 0, 2.55, z0); B(2.46, 0.6, 14.4, cuerpo, 0, 0.95, z0); B(1.1, 0.12, 2.2, new THREE.MeshStandardMaterial({ color: '#555' }), 0, 3.65, z0); }
    B(2.0, 2.7, 1.2, blanco, 0, 1.9, 0); g.position.y = 0.1; g.userData = { tranvia: true }; return g;
  }
  // Tipos de vehículo y tranvía sobre las vías reales (S.tranvia = [{ t, p }])
  function trafico(S, M, st) {
    const club = st.equipos[st.clubId], pl = S.coches.filter(c => c.len === 4.2 && !c.bus && !c.reparto && !c.bici && !c.amb && !c.unaVez);
    pl.forEach((c, i) => { c.k = (i + 0.5) / pl.length; });
    S.coches.filter(c => c.bici || c.moto).forEach(c => { c.k = 0.35; });
    const cam = pl.filter((c, i) => i % 6 === 3).slice(0, 3);
    cam.forEach((c, i) => { const o = camion(['#c9ced3', '#d9b24a', '#6b8fb5'][i]); o.position.copy(c.obj.position); S.mundo.remove(c.obj); S.mundo.add(o); c.obj = o; c.len = 8.2; c.vmax = 5.5; c.tipo = 'camion'; });
    const pol = pl.filter(c => !cam.includes(c))[1];
    if (pol && GM.kit && GM.kit.coche) { const o = GM.kit.coche('#f4f6f8', 'turismo'); o.position.y = -0.12; o.userData.coche = true; const barra = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 0.3), new THREE.MeshStandardMaterial({ color: 0x1d4f91, emissive: 0x2255ff, emissiveIntensity: 1.2 })); barra.position.set(0, 1.45, 0.1); o.add(barra); const rojo = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.14, 0.3), new THREE.MeshStandardMaterial({ color: 0xc0392b, emissive: 0xff2200, emissiveIntensity: 1.2 })); rojo.position.set(0.35, 1.45, 0.1); o.add(rojo); S.mundo.remove(pol.obj); S.mundo.add(o); pol.obj = o; pol.tipo = 'policia'; pol.vmax = 8.5; }
    S.coches.filter(c => c.obj && c.obj.userData && c.len === 4.2 && /taxi/i.test(c.tipo || '')).forEach(c => { c.paraAleatorio = true; });
    pl.filter((c, i) => i % 5 === 0).forEach(c => { c.paraAleatorio = true; c.tSig = 10 + Math.random() * 40; });
    const tr = (S.tranvia || []).filter(t => t.t <= 1);
    if (tr.length && S.G) {
      let mejor = null, ml = 0; tr.forEach(t => { const den = []; t.p.forEach((q, i) => { if (i) { const o = t.p[i - 1], l = dist2(q[0], q[1], o[0], o[1]), n = Math.max(1, Math.ceil(l / 6)); for (let k = 1; k < n; k++) den.push([o[0] + (q[0] - o[0]) * k / n, o[1] + (q[1] - o[1]) * k / n]); } den.push(q); }); let run = []; const probar = () => { if (run.length > ml) { ml = run.length; mejor = run; } run = []; }; den.forEach(q => { if (Math.hypot(q[0], q[1]) < (S.RW || 300) - 15) run.push(q); else probar(); }); probar(); });
      if (mejor && mejor.length >= 12) { const acum = [0]; for (let i = 1; i < mejor.length; i++) acum.push(acum[i - 1] + dist2(mejor[i][0], mejor[i][1], mejor[i - 1][0], mejor[i - 1][1])); const obj = tranvia(club); S.mundo.add(obj); S.tram = { obj, p: mejor, acum, L: acum[acum.length - 1], pos: acum[acum.length - 1] * Math.random() * 0.8, dir: 1, vel: 0, tParada: 0, proxParada: 90 }; }
    }
  }
  function actualizarTram(S, dt) {
    const T = S.tram; if (!T || !T.obj) return; const h = hora(S); const act = h >= 5.5 && h < 24; T.obj.visible = act; if (!act) return;
    let obj = 7.5; if (T.tParada > 0) { T.tParada -= dt; obj = 0; } else { T.proxParada -= T.vel * dt; if (T.proxParada <= 0) { T.tParada = 9; T.proxParada = 110 + Math.random() * 60; } else if (T.proxParada < 25) obj = Math.max(1.5, T.proxParada * 0.28); }
    const fin = T.dir > 0 ? T.L - T.pos : T.pos; if (fin < 30) obj = Math.min(obj, Math.max(1, fin * 0.25)); T.vel += Math.max(-1.2 * dt * 3, Math.min(0.9 * dt, obj - T.vel)); T.pos += T.dir * T.vel * dt; if (T.pos > T.L) { T.pos = T.L; T.dir = -1; T.tParada = 12; } else if (T.pos < 0) { T.pos = 0; T.dir = 1; T.tParada = 12; }
    let i = 0; while (i + 2 < T.acum.length && T.acum[i + 1] < T.pos) i++; const a = T.p[i], b = T.p[i + 1], l = (T.acum[i + 1] - T.acum[i]) || 1, u = (T.pos - T.acum[i]) / l, dx = (b[0] - a[0]) / l, dz = (b[1] - a[1]) / l;
    T.obj.position.x = a[0] + (b[0] - a[0]) * u; T.obj.position.z = a[1] + (b[1] - a[1]) * u; T.obj.rotation.y = Math.atan2(dx * T.dir, dz * T.dir);
  }

  // ------------------------------------------------------------ planificador (39)
  function estaciones(S) { const e = S.estacionesReal || S.estaciones || {}, l = []; Object.keys(e).forEach(k => { if (e[k] && e[k].x !== undefined) l.push(Object.assign({ k }, e[k])); }); return l; }
  const masCerca = (L, p, f) => { let m = null, d = 1e9; L.forEach(q => { const x = f ? f(q) : Array.isArray(q) ? q : [q.x, q.z], dd = dist2(x[0], x[1], p[0], p[1]); if (dd < d) { d = dd; m = q; } }); return m ? { q: m, d } : null; };
  function opciones(S, st, dest) {
    const yo = [S.yo.obj.position.x, S.yo.obj.position.z], h = hora(S), d = dow(S), M = mem(st), out = [], D = distancia(S, yo, dest), rec = dist2(yo[0], yo[1], dest[0], dest[1]);
    const W = 1.4;
    out.push({ id: 'pie', nombre: 'A pie', min: D / W / 60, coste: 0, detalle: Math.round(D) + ' m a 1,4 m/s', ok: true, anda: true });
    if (D > 90) out.push({ id: 'corriendo', nombre: 'Corriendo', min: D / 3.2 / 60, coste: 0, detalle: 'Doble clic al andar: 3,2 m/s', ok: true, anda: true });
    const est = estaciones(S), eO = masCerca(est, yo), eD = masCerca(est, dest);
    // bici pública
    if (est.length && eO && eD && eO.d < 220 && D > 220) { const rid = distancia(S, [eO.q.x, eO.q.z], dest), min = (eO.d * 1.25 / W + rid / 4.4 + 90) / 60; out.push({ id: 'bici', nombre: 'Bici pública', min, coste: 1, detalle: 'Estación a ' + Math.round(eO.d) + ' m, 1 €', ok: dinero(st) >= 1, motivo: 'Sin dinero' }); }
    // patinete o moto eléctrica de alquiler
    const fl = masCerca(S.flota || [], yo); if (fl && fl.d < 260 && D > 160) { const rid = distancia(S, [fl.q.x, fl.q.z], dest), tr = rid / 5.4 / 60, caminar = fl.d * 1.25 / W / 60, c = 0.15 + 0.22 * (tr + 0.5); out.push({ id: 'patinete', nombre: 'Patinete de alquiler', min: caminar + tr + 0.5, coste: c, detalle: MARCAS.patinete + ' a ' + Math.round(fl.d) + ' m, 0,15 € + 0,22 €/min', ok: fl.q.pat > 0 && dinero(st) >= c, motivo: fl.q.pat > 0 ? 'Sin dinero' : 'No quedan patinetes' }); }
    // metro
    if (eO && eD && eO.q !== eD.q && h >= 5.5 && h < 24 && D > 250) { const cab = punta(h, d) ? 3 : h < 7 || h > 22 ? 10 : 6, ride = dist2(eO.q.x, eO.q.z, eD.q.x, eD.q.z) * 1.3 / 9, min = (eO.d * 1.25 / W + eD.d * 1.25 / W + ride) / 60 + cab / 2 + 1, c = M.tarjeta > 0 ? 0 : 1.5; out.push({ id: 'metro', nombre: 'Metro', min, coste: c, detalle: 'Cada ' + cab + ' min' + (M.tarjeta > 0 ? ', tarjeta (' + M.tarjeta + ' viajes)' : ', billete 1,50 €'), ok: dinero(st) >= c, motivo: 'Sin dinero' }); }
    // autobús urbano
    if (S.paradas && S.paradas.length >= 2 && h >= 6 && h < 23.5 && D > 350) { const pO = masCerca(S.paradas, yo), pD = masCerca(S.paradas, dest); if (pO && pD && pO.q !== pD.q && pO.d < 300 && pD.d < 300) { const cab = punta(h, d) ? 6 : 12, min = (pO.d * 1.25 / W + pD.d * 1.25 / W) / 60 + cab / 2 + dist2(pO.q[0], pO.q[1], pD.q[0], pD.q[1]) * 1.2 / 5 / 60, c = M.tarjeta > 0 ? 0 : 1.4; out.push({ id: 'bus', nombre: 'Autobús' + (S.rutaBus ? ' línea ' + S.rutaBus : ''), min, coste: c, detalle: 'Cada ' + cab + ' min, billete 1,40 €', ok: dinero(st) >= c, motivo: 'Sin dinero' }); } }
    // metro y autobús con transbordo en la estación de destino cuando queda lejos (más de 650 m) y hay parada cerca
    if (eO && eD && eO.q !== eD.q && eD.d > 110 && S.paradas && S.paradas.length >= 2 && h >= 6 && h < 23.5) { const pD = masCerca(S.paradas, dest), pE = masCerca(S.paradas, [eD.q.x, eD.q.z]); if (pD && pE && pD.d < 120 && pE.d < 160 && pD.q !== pE.q && dist2(pE.q[0], pE.q[1], pD.q[0], pD.q[1]) > 100) { const cab = punta(h, d) ? 6 : 12, metro = (eO.d * 1.25 / W) / 60 + (punta(h, d) ? 1.5 : 3) + dist2(eO.q.x, eO.q.z, eD.q.x, eD.q.z) * 1.3 / 9 / 60 + 1, bus = pE.d * 1.25 / W / 60 + cab / 2 + dist2(pE.q[0], pE.q[1], pD.q[0], pD.q[1]) * 1.2 / 5 / 60 + pD.d * 1.25 / W / 60, c = M.tarjeta > 1 ? 0 : 2.9; out.push({ id: 'metrobus', nombre: 'Metro y autobús', min: metro + bus + 3, coste: c, detalle: 'Transbordo en ' + eD.q.nombre + ', billetes 2,90 €', ok: dinero(st) >= c, motivo: 'Sin dinero' }); } }
    // taxi
    { const noche = h < 6 || h >= 22, c = Math.max(5, (3.2 + D / 1000 * 1.15) * (noche ? 1.2 : 1)), min = 4 + D / 7.5 / 60; out.push({ id: 'taxi', nombre: 'Taxi', min, coste: c, detalle: 'Espera 4 min' + (noche ? ', tarifa nocturna' : ''), ok: dinero(st) >= c, motivo: 'Sin dinero' }); }
    // coche propio
    const co = M.coche; if (co && co.pos && co.pos[st.clubId]) { const p = co.pos[st.clubId], cd = distancia(S, yo, [p.x, p.z]), rid = distancia(S, [p.x, p.z], dest), c = rid / 1000 * 0.16; out.push({ id: 'coche', nombre: 'Tu ' + (co.nombre || 'coche'), min: cd / W / 60 + rid / 8.5 / 60 + 2.5, coste: c, detalle: 'Aparcado a ' + Math.round(cd) + ' m, gasolina ' + Math.round(co.gas) + ' %', ok: co.gas > rid / 100 * 1 + 3, motivo: 'Poca gasolina' }); }
    out.forEach(o => { o.min = Math.max(0.3, o.min); });
    return out.sort((a, b) => a.min - b.min).map(o => Object.assign(o, { _rec: rec }));
  }
  const fmtMin = m => m < 1 ? 'menos de 1 min' : m < 60 ? Math.round(m) + ' min' : Math.floor(m / 60) + ' h ' + String(Math.round(m % 60)).padStart(2, '0') + ' min';
  // Panel del mapa: elige cómo ir (a pie, o transporte con viaje instantáneo que gasta el tiempo y el dinero reales)
  function panel(S, st, z, cb) {
    const h = GM.h, dest = [z.obj.position.x, z.obj.position.z], ops = opciones(S, st, dest), M = mem(st); const cierra = () => p.remove();
    const fila = o => h('div', { class: 'mov-fila' + (o.ok ? '' : ' mov-no') }, h('b', null, o.nombre), h('span', null, fmtMin(o.min) + (o.coste ? ', ' + euros(o.coste) : '')), h('small', null, o.ok ? o.detalle : o.motivo || 'No disponible'),
      h('button', { class: 'btn peq' + (o.anda ? ' btn-sec' : ''), disabled: !o.ok, onclick: () => { cierra(); if (o.anda) { if (o.id === 'corriendo') S.yo.rapido = true; cb.ir(); } else viajar(S, st, o, z, cb); } }, o.anda ? 'Ir' : 'Viajar'));
    const p = h('div', { class: 'sede-hud mov-panel' }, h('div', { class: 'mapa-cab' }, h('b', null, 'Cómo ir a ' + z.sala.nombre), h('span', null, 'Distancia ' + Math.round(distancia(S, [S.yo.obj.position.x, S.yo.obj.position.z], dest)) + ' m por la calle. Andando el reloj va a ritmo real.'), h('button', { class: 'sp-cerrar', onclick: cierra }, '×')),
      h('div', { class: 'mov-lista' }, ops.map(fila)), h('div', { class: 'mov-pie' }, h('span', null, 'Tarjeta de transporte: ' + M.tarjeta + ' viajes'), h('button', { class: 'btn btn-sec peq', onclick: () => { if (dinero(st) < 10) { toast('No tienes 10 €'); return; } pagar(st, 10); M.tarjeta += 10; toast('Tarjeta de 10 viajes: 10 €'); cierra(); panel(S, st, z, cb); } }, 'Comprar 10 viajes (10 €)')));
    S.raiz.append(p);
  }
  function viajar(S, st, o, z, cb) {
    const M = mem(st); if (o.id === 'metro' || o.id === 'bus' || o.id === 'metrobus') { const n = o.id === 'metrobus' ? 2 : 1; if (M.tarjeta >= n) M.tarjeta -= n; else pagar(st, o.coste); } else pagar(st, o.coste);
    M.viajes++; if (o.id === 'patinete' && S.flota) { const f = masCerca(S.flota, [S.yo.obj.position.x, S.yo.obj.position.z]); void f; }
    if (o.id === 'coche' && M.coche) { M.coche.gas = Math.max(0, M.coche.gas - o._rec / 100); M.coche.pos[st.clubId] = { x: z.obj.position.x + 3, z: z.obj.position.z + 3, ry: 0 }; reponerCoche(S, st); }
    iniciarViaje(S, st, o, z, cb);
  }
  // Trayecto con cámara: el jugador va dentro del vehículo y la cámara recorre el camino por las calles mientras el reloj avanza lo que dura el viaje
  function iniciarViaje(S, st, o, z, cb) {
    const yo = S.yo, a = [yo.obj.position.x, yo.obj.position.z], b = [z.obj.position.x, z.obj.position.z]; let pts = S.grafo && GM.nav && GM.nav.rutaGrafo ? GM.nav.rutaGrafo(S.grafo, a, b) : null; pts = [a].concat(pts && pts.length > 1 ? pts : [], [b]); const acum = [0]; for (let i = 1; i < pts.length; i++) acum.push(acum[i - 1] + dist2(pts[i][0], pts[i][1], pts[i - 1][0], pts[i - 1][1]));
    yo.camino = null; yo.obj.visible = false; yo.oculto = true; S.viajando = true; S.viaje = { pts, acum, L: acum[acum.length - 1] || 1, t: 0, dur: Math.max(3.2, Math.min(9, o.min * 0.4)), min: o.min, h0: hora(S), o, cb, z };
    const h = GM.h; S.chipViaje = h('div', { class: 'sede-hud mov-cond' }, h('b', { class: 'mov-vel' }, o.nombre), h('span', { class: 'mov-lim' }), h('button', { class: 'btn peq', onclick: () => { if (S.viaje) S.viaje.t = S.viaje.dur; } }, 'Saltar')); S.raiz.append(S.chipViaje);
  }
  function pasoViaje(S, dt) {
    const V = S.viaje; if (!V) return; V.t += dt; const u = Math.min(1, V.t / V.dur), e = u * u * (3 - 2 * u), s = e * V.L; let i = 0; while (i + 2 < V.acum.length && V.acum[i + 1] < s) i++; const a = V.pts[i], b = V.pts[i + 1] || a, l = (V.acum[i + 1] - V.acum[i]) || 1, k = Math.max(0, Math.min(1, (s - V.acum[i]) / l));
    S.yo.obj.position.set(a[0] + (b[0] - a[0]) * k, 0, a[1] + (b[1] - a[1]) * k); S.foco.copy(S.yo.obj.position); S.hora = Math.min(23.9, V.h0 + V.min / 60 * e);
    if (S.chipViaje) S.chipViaje.querySelector('.mov-lim').textContent = 'Llegas en ' + fmtMin(V.min * (1 - e));
    if (u >= 1) { const o = V.o, cb = V.cb, min = V.min; S.viaje = null; S.viajando = false; if (S.chipViaje) { S.chipViaje.remove(); S.chipViaje = null; } S.yo.obj.visible = true; S.yo.oculto = false; S.hora = Math.min(23.9, V.h0 + min / 60); cb.saltar(min); toast(o.nombre + ': llegas en ' + fmtMin(min) + (o.coste ? ' (' + euros(o.coste) + ')' : '')); }
  }

  // ------------------------------------------------------------ micromovilidad (40)
  function flota(S, M, st) {
    S.flota = []; if (!S.G || !S.paseoBase || !GM.vecinos || !GM.vecinos.patineteMesh) return; const club = st.equipos[st.clubId], r = (() => { let a = U.hash('flota' + st.clubId) >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; })();
    const base = S.paseoBase.filter(q => { const d = Math.hypot(q[0], q[1]); return d > 25 && d < (S.RW || 300) - 40; }).sort(() => r() - 0.5); const libre = (x, z, w, d) => { for (let i = -w; i <= w; i += 0.5) for (let j = -d; j <= d; j += 0.5) { const [a, b] = S.G.celda(x + i, z + j); if (!S.G.libre(a, b)) return false; } return true; };
    for (const q of base) { if (S.flota.length >= 7) break; if (S.flota.some(f => dist2(f.x, f.z, q[0], q[1]) < 85)) continue; if (S.zonas && S.zonas.some(zn => dist2(zn.obj.position.x, zn.obj.position.z, q[0], q[1]) < 8)) continue; if (!libre(q[0], q[1], 2.2, 1.2)) continue;
      const k = S.flota.length, g = new THREE.Group(); g.position.set(q[0], 0, q[1]); S.mundo.add(g); const pat = 3 + ((r() * 2) | 0), items = []; for (let i = 0; i < pat; i++) { const m = GM.vecinos.patineteMesh(1); m.position.x = -1.4 + i * 0.7; m.rotation.y = Math.PI / 2 + (r() - 0.5) * 0.2; g.add(m); items.push(m); }
      let moto = null; if (GM.urbano && GM.urbano.moto) { moto = GM.urbano.moto('#2f8f7a'); moto.position.x = 1.6; moto.rotation.y = Math.PI / 2; g.add(moto); }
      const pa = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.8).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: M.textura('zona-micro', 128, (x, n) => { x.clearRect(0, 0, n, n); x.fillStyle = 'rgba(40,160,110,.55)'; x.fillRect(0, 0, n, n); x.strokeStyle = '#fff'; x.lineWidth = 6; x.strokeRect(5, 5, n - 10, n - 10); x.fillStyle = '#fff'; x.font = 'bold 54px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('P', n / 2, n / 2 + 3); }), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })); pa.position.set(0.1, 0.03, 0); g.add(pa);
      const f = { x: q[0], z: q[1], pat, moto: moto ? 1 : 0, items, motoObj: moto, k, sala: null }; S.flota.push(f);
      const sala = { id: 'micro_' + k, nombre: 'Patinetes y motos ' + MARCAS.patinete, accion: '', destino: {}, acciones: s2 => { const yo = S.yo, en = yo && yo.alquiler;
        if (en) { const cerca = dist2(yo.obj.position.x, yo.obj.position.z, f.x, f.z) < 9; return [{ id: 'dejar', t: 'Aparcar aquí y terminar', d: 'Terminas el alquiler y se cobra el tiempo.', disponible: cerca, motivo: 'Acércate a la zona', fn: () => terminar(S, s2, f) }]; }
        const m = mem(s2), puede = (c) => dinero(s2) >= c;
        return [{ id: 'pat', t: 'Desbloquear un patinete', d: MARCAS.patinete + ': 0,15 € y 0,22 € por minuto. Quedan ' + f.pat + '.', disponible: f.pat > 0 && puede(1), motivo: f.pat > 0 ? 'Sin dinero' : 'No quedan', fn: () => alquilar(S, s2, f, 'patinete') },
          { id: 'moto', t: 'Desbloquear una moto eléctrica', d: MARCAS.moto + ': 0,30 € y 0,29 € por minuto. Quedan ' + f.moto + '.', disponible: f.moto > 0 && puede(2), motivo: f.moto > 0 ? 'Sin dinero' : 'No quedan', fn: () => alquilar(S, s2, f, 'moto') },
          { id: 'inf', t: 'Ver mis gastos de movilidad', d: 'Gastado: ' + euros(m.gastado) + ', viajes: ' + m.viajes, disponible: true, fn: () => ({ ok: true, texto: 'Gastado en movilidad: ' + euros(m.gastado) }) }]; } };
      f.sala = sala; const zn = M.zona(S.mundo, sala, q[0], q[1] + 2.2, club); S.zonas.push(zn); f.zona = zn; }
  }
  function alquilar(S, st, f, tipo) {
    const yo = S.yo; if (!yo || yo.alquiler) return { ok: false, texto: 'Ya llevas un vehículo' };
    const t = tipo === 'moto' ? { desb: 0.3, min: 0.29, vel: 3.6 } : { desb: 0.15, min: 0.22, vel: 3.6 }, Mv = mem(st), rs = Mv.reserva && Mv.reserva.tipo === tipo && Mv.reserva.k === f.k; pagar(st, t.desb);
    if (rs) { Mv.reserva = null; if (tipo === 'moto') f.moto++; else f.pat++; }
    if (tipo === 'moto') { f.moto--; if (f.motoObj) f.motoObj.visible = false; if (GM.ciudadBarrios) GM.ciudadBarrios.bici(true, null, 'moto'); yo.bici = true; }
    else { f.pat--; const it = f.items[f.pat]; if (it) it.visible = false; yo.patinete = true; yo.velPat = t.vel; const sc = yo.obj.scale.x || 1, m = GM.vecinos.patineteMesh(1 / sc); yo.obj.add(m); yo.patineteObj = m; GM.sede.animar(yo, 'idle'); yo.actual = null; }
    yo.alquiler = { tipo, t0: performance.now(), t, bat: 100, dist: 0, ult: [yo.obj.position.x, yo.obj.position.z], f }; hudAlquiler(S, st);
    return { ok: true, texto: MARCAS[tipo] + ': vehículo desbloqueado. Te cobrarán por minuto; aparca en una zona marcada con la P.' };
  }
  // Reserva (desde el móvil): aparta un patinete o moto del punto durante 10 minutos reales; si caduca se devuelve y se cobran 0,50 €
  function reservar(S, st, tipo, f) { const M = mem(st); if (M.reserva) return { ok: false, texto: 'Ya tienes una reserva' }; if (!f || (tipo === 'moto' ? f.moto : f.pat) < 1) return { ok: false, texto: 'No quedan vehículos en ese punto' }; if (tipo === 'moto') { f.moto--; if (f.motoObj) f.motoObj.visible = false; } else { f.pat--; if (f.items[f.pat]) f.items[f.pat].visible = false; } M.reserva = { tipo, k: f.k, hasta: Date.now() + 600000, club: st.clubId }; return { ok: true, texto: MARCAS[tipo] + ' reservado en el punto ' + (f.k + 1) + ' durante 10 minutos' }; }
  function reservas(S, st) { const M = mem(st), r = M.reserva; if (!r || r.club !== st.clubId || !S.flota) return; if (Date.now() > r.hasta) { const f = S.flota[r.k]; if (f) { if (r.tipo === 'moto') { f.moto++; if (f.motoObj) f.motoObj.visible = true; } else { if (f.items[f.pat]) f.items[f.pat].visible = true; f.pat++; } } M.reserva = null; pagar(st, 0.5); toast('Reserva caducada: 0,50 €'); } }
  function terminar(S, st, f) {
    const yo = S.yo, a = yo && yo.alquiler; if (!a) return { ok: false, texto: 'No llevas ningún vehículo' };
    const min = (performance.now() - a.t0) / 60000, c = a.t.min * Math.max(1, Math.ceil(min * 2) / 2); pagar(st, c);
    if (a.tipo === 'moto') { if (GM.ciudadBarrios) GM.ciudadBarrios.bici(false); yo.bici = false; if (f) { f.moto++; if (f.motoObj) f.motoObj.visible = true; } }
    else { if (yo.patineteObj) { yo.obj.remove(yo.patineteObj); yo.patineteObj = null; } yo.patinete = false; if (f) { if (f.items[f.pat]) f.items[f.pat].visible = true; f.pat++; } GM.sede.animar(yo, 'idle'); yo.actual = null; }
    yo.alquiler = null; if (S.chipMov) { S.chipMov.remove(); S.chipMov = null; }
    return { ok: true, texto: 'Alquiler terminado: ' + Math.round(min * 10) / 10 + ' min, ' + euros(c) };
  }
  function hudAlquiler(S, st) {
    if (S.chipMov) S.chipMov.remove(); const h = GM.h; const el = h('div', { class: 'sede-hud mov-chip' }); S.chipMov = el;
    const bt = h('button', { class: 'btn peq', onclick: () => { const yo = S.yo, a = yo.alquiler; if (!a) return; const f = (S.flota || []).find(q => dist2(yo.obj.position.x, yo.obj.position.z, q.x, q.z) < 9); if (!f) { toast('Aparca en una zona con la P'); return; } toast(terminar(S, st, f).texto); } }, 'Terminar'); el.append(h('span', { class: 'mov-txt' }), bt); S.raiz.append(el);
  }
  function actualizarAlquiler(S, st, dt) {
    const yo = S.yo, a = yo && yo.alquiler; if (!a) { if (S.chipMov) { S.chipMov.remove(); S.chipMov = null; } return; }
    const d = dist2(yo.obj.position.x, yo.obj.position.z, a.ult[0], a.ult[1]); if (d < 3) { a.dist += d; a.bat = Math.max(0, a.bat - d / 80); a.ult = [yo.obj.position.x, yo.obj.position.z]; }
    yo.velPat = a.tipo === 'patinete' ? (a.bat < 15 ? 1.8 : 3.6) : yo.velPat; if (a.tipo === 'moto' && yo.bici) yo.velBici = a.bat < 15 ? 1.8 : 3.6;
    if (a.bat <= 0 && !a.avisado) { a.avisado = true; toast('Batería agotada: aparca el vehículo'); }
    const min = (performance.now() - a.t0) / 60000; if (S.chipMov) { S.tChip = (S.tChip || 0) - dt; if (S.tChip <= 0) { S.tChip = 0.5; S.chipMov.querySelector('.mov-txt').textContent = MARCAS[a.tipo] + ': ' + Math.floor(min) + ':' + String(Math.floor(min % 1 * 60)).padStart(2, '0') + ' min, ' + euros(a.t.desb + a.t.min * min) + ', batería ' + Math.round(a.bat) + ' %'; } }
  }

  // ------------------------------------------------------------ coche y moto propios (41)
  const hoy = S => String(S.st.fecha).slice(0, 10);
  function vistaCoche(co, club) {
    const mo = MODELOS.find(m => m.id === co.modelo) || MODELOS[1];
    if (mo.id === 'moto') return GM.urbano && GM.urbano.moto ? GM.urbano.moto(co.color) : new THREE.Group();
    if (GM.kit && GM.kit.coche) { const o = GM.kit.coche(co.color, mo.kit); o.position.y = -0.12; return o; }
    return GM.calle && GM.calle.util && GM.calle.util.coche ? GM.calle.util.coche(co.color) : new THREE.Group();
  }
  function reponerCoche(S, st) {
    if (!S.mundo || !S.G) return; const M = mem(st), co = M.coche; if (S.cocheObj) { S.mundo.remove(S.cocheObj); S.cocheObj = null; } if (S.cocheZona) { S.zonas = S.zonas.filter(z => z !== S.cocheZona); S.mundo.remove(S.cocheZona.obj); if (S.cocheZona.et) S.mundo.remove(S.cocheZona.et); S.cocheZona = null; }
    if (!co || (co.alquilerHasta && co.alquilerHasta < hoy(S))) { if (co && co.alquilerHasta) M.coche = null; return; }
    if (co.garaje && co.garaje[st.clubId]) return; if (!co.pos) co.pos = {}; let p = co.pos[st.clubId]; if (!p) { const sp = S.spawnCalle || { x: 0, z: 0 }; p = { x: sp.x + 3.5, z: sp.z + 2.5, ry: 0 }; const caben = (x, z) => { for (let i = -2.6; i <= 2.6; i += 0.65) for (let j = -1.4; j <= 1.4; j += 0.7) if (!S.G.libre(...S.G.celda(x + i, z + j))) return false; return true; }; for (let k = 0; k < 90; k++) { const x = sp.x + Math.cos(k * 0.8) * (3 + k * 0.45), z = sp.z + Math.sin(k * 0.8) * (3 + k * 0.45); if (caben(x, z)) { p = { x, z, ry: Math.PI / 2 }; break; } } co.pos[st.clubId] = p; }
    const o = vistaCoche(co, st.equipos[st.clubId]); o.position.set(p.x, o.position.y, p.z); o.rotation.y = p.ry || 0; o.userData = Object.assign(o.userData || {}, { cochePropio: true }); S.mundo.add(o); S.cocheObj = o;
    const sala = { id: 'micoche', nombre: 'Tu ' + (co.nombre || 'coche'), accion: '', destino: {}, acciones: s2 => accionesCoche(S, s2) }; const zn = S.motor.zona(S.mundo, sala, p.x + 2.2, p.z, st.equipos[st.clubId]); S.zonas.push(zn); S.cocheZona = zn;
  }
  function puntosCombustible(S) { const l = (S.gasolineras || []).map(q => [q.x, q.z]); (S.zonas || []).forEach(z => { if (/^(casa|local_gasol|taller)/.test(z.sala.id) || z.sala.id === 'concesionario') l.push([z.obj.position.x, z.obj.position.z]); }); return l; }
  function accionesCoche(S, st) {
    const M = mem(st), co = M.coche; if (!co) return []; const p = co.pos[st.clubId], fin = String(S.st.fecha).slice(0, 10), cerca = masCerca(puntosCombustible(S), [p.x, p.z]), enSurtidor = cerca && cerca.d < 45, falta = Math.max(0, 100 - co.gas), litros = falta * 0.45, coste = litros * 1.68, pagaClub = !carrera(st);
    const venc = f => !f || f < fin;
    return [{ id: 'cond', t: co.modelo === 'moto' ? 'Subir a la moto y conducir' : 'Subir y conducir', d: 'WASD o flechas, espacio freno de mano. Gasolina ' + Math.round(co.gas) + ' %.' + (venc(co.seguro) ? ' Sin seguro en vigor.' : ''), disponible: !S.conduciendo && co.gas > 0, motivo: co.gas > 0 ? '' : 'Sin gasolina', fn: () => conducir(S, st) },
      { id: 'rep', t: 'Repostar (' + Math.round(falta) + ' %)', d: pagaClub ? 'Lo paga el club.' : 'Unos ' + euros(coste) + '. Solo junto a una gasolinera, tu casa o el taller.', disponible: falta > 3 && enSurtidor && (pagaClub || dinero(st) >= coste), motivo: !enSurtidor ? 'Acerca el coche a una gasolinera o a tu casa' : falta <= 3 ? 'Ya está lleno' : 'Sin dinero', fn: () => { if (!pagaClub) pagar(st, coste); co.gas = 100; return { ok: true, texto: 'Depósito lleno' + (pagaClub ? '' : ': ' + euros(coste)) }; } },
      { id: 'seg', t: 'Renovar el seguro un año', d: pagaClub ? 'Lo paga el club.' : '420 €. Vence: ' + (co.seguro || 'sin seguro'), disponible: pagaClub || dinero(st) >= 420, motivo: 'Sin dinero', fn: () => { if (!pagaClub) pagar(st, 420); co.seguro = sumaDias(fin, 365); return { ok: true, texto: 'Seguro hasta ' + co.seguro }; } },
      { id: 'itv', t: 'Pasar la ITV', d: pagaClub ? 'Lo paga el club.' : '55 €, vale dos años. Vence: ' + (co.itv || 'sin pasar'), disponible: pagaClub || dinero(st) >= 55, motivo: 'Sin dinero', fn: () => { if (!pagaClub) pagar(st, 55); co.itv = sumaDias(fin, 730); return { ok: true, texto: 'ITV favorable hasta ' + co.itv }; } },
      { id: 'rep2', t: 'Reparar los daños (' + Math.round(co.dano || 0) + ' %)', d: pagaClub ? 'Lo paga el club.' : 'Unos ' + euros((co.dano || 0) * 9) + ', solo cerca del concesionario o de tu casa.', disponible: (co.dano || 0) > 3 && (pagaClub || dinero(st) >= (co.dano || 0) * 9) && cerca && cerca.d < 45, motivo: (co.dano || 0) <= 3 ? 'No tiene daños' : 'Acerca el coche al taller o a tu casa', fn: () => { if (!pagaClub) pagar(st, (co.dano || 0) * 9); co.dano = 0; return { ok: true, texto: 'Coche reparado' }; } },
      { id: 'gar', t: 'Guardar en el garaje de casa', d: 'Se aparca en el garaje y se saca desde la puerta de tu casa.', disponible: !!S.garajeZona && dist2(p.x, p.z, S.garajeZona.obj.position.x, S.garajeZona.obj.position.z) < 25, motivo: 'Acércalo a tu casa', fn: () => { co.garaje = co.garaje || {}; co.garaje[st.clubId] = true; reponerCoche(S, st); return { ok: true, texto: 'Coche en el garaje' }; } },
      { id: 'mul', t: 'Pagar las multas pendientes', d: M.multas.filter(x => !x.pagada).length + ' pendientes', disponible: M.multas.some(x => !x.pagada), motivo: 'No tienes multas', fn: () => { const tot = M.multas.filter(x => !x.pagada).reduce((a, x) => a + x.importe, 0); if (dinero(st) < tot) return { ok: false, texto: 'No tienes ' + euros(tot) }; pagar(st, tot); M.multas.forEach(x => { x.pagada = true; }); return { ok: true, texto: 'Multas pagadas: ' + euros(tot) }; } },
      { id: 'vend', t: co.alquilerHasta ? 'Devolver el coche de alquiler' : 'Vender el vehículo', d: co.alquilerHasta ? 'Termina el alquiler.' : 'Te dan el 70 % del precio.', disponible: !S.conduciendo, motivo: '', fn: () => { const mo = MODELOS.find(m => m.id === co.modelo); if (!co.alquilerHasta && !co.oficial && mo && carrera(st)) st.carrera.dinero += mo.precio * 0.7 / 1000; M.coche = null; reponerCoche(S, st); return { ok: true, texto: 'Ya no tienes el vehículo' }; } }];
  }
  function concesionario(S, M, st) {
    const club = st.equipos[st.clubId], base = (S.paseoBase || []).filter(q => { const d = Math.hypot(q[0], q[1]); return d > 70 && d < (S.RW || 300) - 60; }); let sitio = null;
    for (const q of base) { let ok = true; for (let i = -9; i <= 9 && ok; i += 0.75) for (let j = -2; j <= 8 && ok; j += 0.75) { const [a, b] = S.G.celda(q[0] + i, q[1] + j); if (!S.G.libre(a, b)) ok = false; } if (ok && (!S.zonas || !S.zonas.some(z => dist2(z.obj.position.x, z.obj.position.z, q[0], q[1]) < 14))) { sitio = q; break; } }
    if (!sitio) return; const [x, z] = sitio, g = new THREE.Group(); g.position.set(x, 0, z); S.mundo.add(g);
    const sol = new THREE.Mesh(new THREE.PlaneGeometry(18, 10).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x8e8e90, roughness: 0.9 })); sol.position.set(0, 0.03, 3); g.add(sol); if (GM.kit && GM.kit.coche) ['turismo', 'compacto', 'todoterreno'].forEach((t, i) => { const o = GM.kit.coche(COLORES[i * 2 % 6], t); o.position.set(-5.5 + i * 5.5, 0.04, 4.5); o.rotation.y = 0.5 - i * 0.4; g.add(o); });
    const nm = 'AUTOS ' + String(club.ciudad || 'CENTRO').toUpperCase().slice(0, 14); if (GM.mods.calleReal && GM.mods.calleReal._int) GM.mods.calleReal._int.cartel(g, M, nm, '#1d4f91', '#ffffff', 0, 3.6, -1.5, 0, 7); const mo = new THREE.Mesh(new THREE.BoxGeometry(18, 3.2, 0.3), new THREE.MeshStandardMaterial({ color: 0xdfe6ea })); mo.position.set(0, 1.6, -2); g.add(mo);
    for (let i = -9; i <= 9; i += 0.75) for (let j = -2; j <= 8; j += 0.75) { const [a, b] = S.G.celda(x + i, z + j); if (j < -1) S.G.b[S.G.idx(a, b)] = 1; }
    const sala = { id: 'concesionario', nombre: 'Concesionario de autos', accion: '', destino: {}, acciones: s2 => accionesConcesionario(S, s2) }; const zn = M.zona(S.mundo, sala, x, z + 4.8, club); S.zonas.push(zn);
  }
  function accionesConcesionario(S, st) {
    const M = mem(st), tiene = !!M.coche, c = carrera(st), l = [];
    if (!c) { l.push({ id: 'ofi', t: M.coche ? 'Cambiar el coche oficial' : 'Recoger el coche oficial del club', d: 'El club te cede un utilitario.', disponible: true, fn: () => { M.coche = { modelo: 'turismo', color: (st.equipos[st.clubId].colores || ['#1f4e79'])[0] === '#000000' ? '#2c2c2c' : st.equipos[st.clubId].colores[0], nombre: 'coche oficial', gas: 100, seguro: sumaDias(hoy(S), 365), itv: sumaDias(hoy(S), 730), oficial: true, pos: {} }; reponerCoche(S, st); return { ok: true, texto: 'Tienes el coche oficial, aparcado junto a la sede' }; } }); return l; }
    MODELOS.forEach((mo, i) => l.push({ id: 'c_' + mo.id, t: 'Comprar ' + mo.nombre + ' (' + euros(mo.precio) + ')', d: 'Incluye seguro un año e ITV. Color ' + COLORES[i % 6] + '.', disponible: !tiene && dinero(st) >= mo.precio, motivo: tiene ? 'Ya tienes un vehículo: véndelo antes' : 'Te faltan ' + euros(mo.precio - dinero(st)), fn: () => { pagar(st, mo.precio); M.coche = { modelo: mo.id, color: COLORES[(U.hash(st.fecha + mo.id) >>> 0) % 6], nombre: mo.nombre.toLowerCase(), gas: 100, seguro: sumaDias(hoy(S), 365), itv: sumaDias(hoy(S), 730), pos: {} }; reponerCoche(S, st); return { ok: true, texto: mo.nombre + ' comprado: ' + euros(mo.precio) + '. Lo tienes aparcado junto a la sede.' }; } }));
    l.push({ id: 'alq', t: 'Alquilar un utilitario un día (45 €)', d: 'Con seguro; gasolina aparte.', disponible: !tiene && dinero(st) >= 45, motivo: tiene ? 'Ya tienes un vehículo' : 'Sin dinero', fn: () => { pagar(st, 45); M.coche = { modelo: 'compacto', color: '#e9e9e9', nombre: 'coche de alquiler', gas: 70, seguro: sumaDias(hoy(S), 2), itv: sumaDias(hoy(S), 365), alquilerHasta: sumaDias(hoy(S), 1), pos: {} }; reponerCoche(S, st); return { ok: true, texto: 'Coche de alquiler hasta mañana, junto a la sede' }; } });
    return l;
  }
  // Conducción: modelo cinemático (bicicleta), colisiones con la rejilla, radares y HUD
  function conducir(S, st) {
    const M = mem(st), co = M.coche, p = co.pos[st.clubId], mo = MODELOS.find(m => m.id === co.modelo) || MODELOS[1]; if (!co || S.conduciendo) return { ok: false, texto: 'No se puede' };
    S.panelFijo = false; if (S.panel) S.panel.style.display = 'none'; S.zonaActual = null;
    const yo = S.yo; yo.camino = null; yo.obj.visible = false; yo.oculto = true; S.conduciendo = true;
    S.cond = { co, mo, x: p.x, z: p.z, ry: p.ry || 0, v: 0, dir: 0, lim: 50, tLim: 0, hudT: 0, km: 0, avisos: {} }; const teclas = S.cond.teclas = {}; const kd = e => { const k = e.key.toLowerCase(); teclas[k] = e.type === 'keydown'; if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].indexOf(k) >= 0) e.preventDefault(); if (e.type === 'keydown' && (k === 'f' || k === 'enter')) bajar(S, st); };
    S.cond.kd = kd; window.addEventListener('keydown', kd); window.addEventListener('keyup', kd); S.zoomAntes = S.zoom; S.zoom = Math.max(S.zoom, 17);
    const h = GM.h; S.hudCond = h('div', { class: 'sede-hud mov-cond' }, h('b', { class: 'mov-vel' }, '0'), h('span', { class: 'mov-lim' }), h('span', { class: 'mov-gas' }), h('button', { class: 'btn peq', onclick: () => bajar(S, st) }, 'Bajar (F)')); S.raiz.append(S.hudCond);
    const sinSeg = !co.seguro || co.seguro < hoy(S), sinItv = !co.itv || co.itv < hoy(S); if (sinSeg || sinItv) toast((sinSeg ? 'Sin seguro en vigor. ' : '') + (sinItv ? 'ITV caducada. ' : '') + 'Si te pilla un radar, la multa será mayor.');
    return { ok: true, texto: 'Conduces ' + (co.nombre || 'tu coche') };
  }
  function bajar(S, st) {
    const C = S.cond; if (!C) return; window.removeEventListener('keydown', C.kd); window.removeEventListener('keyup', C.kd); const M = mem(st), co = C.co, yo = S.yo;
    let sitio = null; for (const [dx, dz] of [[2.4, 0], [-2.4, 0], [0, 2.4], [0, -2.4], [3.6, 1.2], [-3.6, -1.2]]) { const x = C.x + dx, z = C.z + dz; if (S.G.libre(...S.G.celda(x, z))) { sitio = [x, z]; break; } }
    const enCalzada = (S.callesTodas || []).some(c => c.k <= 5 && c.p.some((q, i) => { if (!i) return false; const a = c.p[i - 1], dx = q[0] - a[0], dz = q[1] - a[1], l2 = dx * dx + dz * dz || 1e-9, u = Math.max(0, Math.min(1, ((C.x - a[0]) * dx + (C.z - a[1]) * dz) / l2)); return Math.hypot(C.x - a[0] - u * dx, C.z - a[1] - u * dz) < (c.w || 6) / 2 - 0.4; }));
    if (enCalzada) multa(S, st, 'Aparcado en mitad de la calzada (retirada por la grúa)', 90);
    co.pos[st.clubId] = { x: C.x, z: C.z, ry: C.ry }; co.km = (co.km || 0) + C.km / 1000; yo.obj.visible = true; yo.oculto = false; const q = sitio || [C.x + 2.4, C.z]; yo.obj.position.set(q[0], 0, q[1]); S.foco.set(q[0], 0, q[1]); S.conduciendo = false; S.zoom = S.zoomAntes || S.zoom; S.cond = null; if (S.hudCond) { S.hudCond.remove(); S.hudCond = null; }
    reponerCoche(S, st); GM.sede.animar(yo, 'idle');
  }
  function multa(S, st, motivo, imp) { const M = mem(st); M.multas.push({ fecha: hoy(S), motivo, importe: imp, pagada: false }); if (dinero(st) >= imp) { pagar(st, imp); M.multas[M.multas.length - 1].pagada = true; } toast('Multa: ' + motivo + ', ' + euros(imp)); }
  function limiteEn(S, x, z) { let mejor = 50, md = 1e9; (S.callesTodas || []).forEach(c => { if (c.k > 5) return; for (let i = 0; i + 1 < c.p.length; i++) { const a = c.p[i], b = c.p[i + 1]; if (x < Math.min(a[0], b[0]) - 12 || x > Math.max(a[0], b[0]) + 12 || z < Math.min(a[1], b[1]) - 12 || z > Math.max(a[1], b[1]) + 12) continue; const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1e-9, u = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)), d = Math.hypot(x - a[0] - u * dx, z - a[1] - u * dz); if (d < md) { md = d; mejor = c.vel || (c.k <= 2 ? 50 : c.k === 3 ? 40 : 30); } } }); return md < 14 ? mejor : 30; }
  function radares(S, M) {
    S.radares = []; const vias = (S.callesTodas || []).filter(c => c.k <= 3 && c.p.length >= 2).sort((a, b) => b.p.length - a.p.length).slice(0, 8), usados = [];
    for (const c of vias) { if (S.radares.length >= 4) break; const i = Math.floor(c.p.length / 2), a = c.p[i - 1] || c.p[0], b = c.p[i], l = dist2(a[0], a[1], b[0], b[1]) || 1, ux = (b[0] - a[0]) / l, uz = (b[1] - a[1]) / l, w = c.w || 8, x = b[0] - uz * (w / 2 + 1.1), z = b[1] + ux * (w / 2 + 1.1); if (Math.hypot(b[0], b[1]) > (S.RW || 300) - 30 || usados.some(q => dist2(q[0], q[1], x, z) < 120)) continue; if (!S.G.libre(...S.G.celda(x, z))) continue; usados.push([x, z]);
      const g = new THREE.Group(); g.position.set(x, 0, z); const po = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 3.6, 8), new THREE.MeshStandardMaterial({ color: 0x6b7077 })); po.position.y = 1.8; g.add(po); const ca = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.8), new THREE.MeshStandardMaterial({ color: 0x8a9096 })); ca.position.y = 3.7; ca.rotation.y = Math.atan2(-ux, -uz); g.add(ca); const lente = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12), new THREE.MeshBasicMaterial({ color: 0xffc400 })); lente.position.set(0, 3.7, 0.41); ca.add(lente); S.mundo.add(g); S.radares.push({ x: b[0], z: b[1], lim: c.vel || 50, t: 0 }); S.G.b[S.G.idx(...S.G.celda(x, z))] = 1; }
  }
  function pasoConduccion(S, st, dt) {
    const C = S.cond; if (!C) return; const k = C.teclas, co = C.co, mo = C.mo, G = S.G, M = mem(st), acel = (k.w || k.arrowup ? 1 : 0) - (k.s || k.arrowdown ? 1 : 0), giro = (k.a || k.arrowleft ? 1 : 0) - (k.d || k.arrowright ? 1 : 0);
    const vmax = co.gas > 0 ? mo.vmax * ((co.dano || 0) > 60 ? 0.7 : 1) : 0; if (acel > 0) C.v += (C.v < vmax ? 4.6 : -3) * dt * (C.v < 0 ? 2 : 1); else if (acel < 0) C.v += (C.v > 0.2 ? -9 : -3.2) * dt; else C.v -= Math.sign(C.v) * Math.min(Math.abs(C.v), 1.6 * dt); if (k[' ']) C.v -= Math.sign(C.v) * Math.min(Math.abs(C.v), 12 * dt); C.v = Math.max(-4.5, Math.min(vmax, C.v));
    const lim = Math.min(0.55, 0.75 / (1 + Math.abs(C.v) * 0.18)); C.dir += (giro * lim - C.dir) * Math.min(1, dt * 7); C.ry += (C.v / (mo.largo * 0.62)) * Math.tan(C.dir) * dt;
    const nx = C.x + Math.sin(C.ry) * C.v * dt, nz = C.z + Math.cos(C.ry) * C.v * dt, sx = Math.sin(C.ry), sz = Math.cos(C.ry), px = sz, pz = -sx, hl = mo.largo / 2 - 0.5, hw = mo.ancho / 2 - 0.35; let choca = false; const toca = (cx, cz) => { for (const [a, b] of [[hl, hw], [hl, -hw], [-hl, hw], [-hl, -hw], [hl, 0]]) { const [i, j] = G.celda(cx + sx * a + px * b, cz + sz * a + pz * b); if (!G.libre(i, j)) return true; } return false; };
    if (toca(nx, nz) && !(C.atascado = toca(C.x, C.z))) choca = true;   // si ya estás metido en algo (aparcado pegado a un muro) puedes salir
    if (choca) { if (Math.abs(C.v) > 4 && !C.avisos.golpe) { C.avisos.golpe = 1; co.dano = Math.min(100, (co.dano || 0) + Math.abs(C.v) * 1.6); toast('Choque contra un edificio' + (co.dano > 60 ? ': el coche está muy dañado' : '')); setTimeout(() => { if (S.cond) S.cond.avisos.golpe = 0; }, 2500); } C.v *= -0.25; }
    if (!choca) (S.coches || []).forEach(o => { if (!o.obj.visible || o.bici || o.unaVez) return; const d = dist2(o.obj.position.x, o.obj.position.z, nx, nz); if (d < 2.6 + (o.len > 6 ? 1.6 : 0) && Math.abs(C.v) > 1.2) { if (!C.avisos.golpe) { C.avisos.golpe = 1; co.dano = Math.min(100, (co.dano || 0) + Math.abs(C.v) * 2.1); if (Math.abs(C.v) > 5) multa(S, st, 'Colisión con otro vehículo (parte amistoso)', 150); else toast('Roce con otro coche'); setTimeout(() => { if (S.cond) S.cond.avisos.golpe = 0; }, 3000); } o.vel = 0; o.tParada = 3; C.v *= -0.3; } });
    S.gente.forEach(g => { if (g.oculto || !g.obj.visible || g.fijo) return; const d = dist2(g.obj.position.x, g.obj.position.z, C.x, C.z); if (d < 3.4 && Math.abs(C.v) > 2.5) { const ax = g.obj.position.x - C.x, az = g.obj.position.z - C.z, l = Math.hypot(ax, az) || 1; g.camino = null; g.obj.position.x += ax / l * dt * 5; g.obj.position.z += az / l * dt * 5; if (!g.quejado) { g.quejado = true; setTimeout(() => { g.quejado = false; }, 6000); if (GM.sede && GM.sede.motor) GM.sede.motor().bocadillo(['¡Cuidado!', '¡Mira por dónde vas!', '¡Más despacio!'][(Math.random() * 3) | 0], g.obj); if (Math.abs(C.v) > 7 && !C.avisos.temer) { C.avisos.temer = 1; multa(S, st, 'Conducción temeraria entre peatones', 120); setTimeout(() => { if (S.cond) S.cond.avisos.temer = 0; }, 20000); } } } }); if (!choca) { const d = Math.hypot(nx - C.x, nz - C.z); C.x = nx; C.z = nz; C.km += d; co.gas = Math.max(0, co.gas - d / 100); }
    const yo = S.yo; yo.obj.position.set(C.x, 0, C.z); S.foco.lerp(yo.obj.position, Math.min(1, dt * 10)); const o = S.cocheObj; if (o) { o.position.x = C.x; o.position.z = C.z; o.rotation.y = C.ry; const bal = Math.max(-0.05, Math.min(0.05, C.dir * C.v * 0.01)); o.rotation.z = bal; }
    C.tLim -= dt; if (C.tLim <= 0) { C.tLim = 0.5; C.lim = limiteEn(S, C.x, C.z); }
    (S.radares || []).forEach(r => { r.t -= dt; if (r.t > 0 || dist2(C.x, C.z, r.x, r.z) > 9) return; const kmh = Math.abs(C.v) * 3.6, lim = r.lim || C.lim; if (kmh > lim + 8) { r.t = 25; const sin = !co.seguro || co.seguro < hoy(S) || !co.itv || co.itv < hoy(S); multa(S, st, 'Radar: ' + Math.round(kmh) + ' km/h en zona de ' + lim + (sin ? ' (y sin seguro o ITV)' : ''), (kmh > lim + 30 ? 400 : kmh > lim + 20 ? 200 : 100) * (sin ? 3 : 1)); } else r.t = 4; });
    C.hudT -= dt; if (S.hudCond && C.hudT <= 0) { C.hudT = 0.15; const kmh = Math.round(Math.abs(C.v) * 3.6); S.hudCond.querySelector('.mov-vel').textContent = kmh + ' km/h'; S.hudCond.querySelector('.mov-lim').textContent = 'Límite ' + C.lim; S.hudCond.querySelector('.mov-lim').className = 'mov-lim' + (kmh > C.lim + 8 ? ' mov-ex' : ''); S.hudCond.querySelector('.mov-gas').textContent = 'Gasolina ' + Math.round(co.gas) + ' %' + (co.gas < 12 ? ' (reserva)' : '') + ((co.dano || 0) > 5 ? ', daños ' + Math.round(co.dano) + ' %' : ''); }
    if (co.gas <= 0 && !C.avisos.gas) { C.avisos.gas = 1; toast('Te has quedado sin gasolina'); }
  }
  // Se llama desde calle_real_vida.actualizar cada fotograma
  function actualizar(S, M, dt) {
    if (!S.st) return; actualizarTram(S, dt); actualizarAlquiler(S, S.st, dt); pasoConduccion(S, S.st, dt); pasoViaje(S, dt); reservas(S, S.st);
  }
  // Garaje de casa: una zona junto a la puerta de tu vivienda para sacar o guardar el coche
  function garaje(S, M, st) {
    const casa = (S.zonas || []).find(z => /^casa_/.test(z.sala.id)); S.garajeZona = null; if (!casa) return; const club = st.equipos[st.clubId];
    const sala = { id: 'garaje', nombre: 'Garaje de casa', accion: '', destino: {}, acciones: s2 => { const m = mem(s2), co = m.coche; if (!co) return [{ id: 'nada', t: 'Aún no tienes coche', d: 'Pásate por el concesionario.', disponible: false, motivo: 'Sin vehículo', fn: () => ({ ok: false }) }]; const dentro = !!(co.garaje && co.garaje[s2.clubId]); return [dentro ? { id: 'sacar', t: 'Sacar el coche', d: 'Aparece en la puerta del garaje.', disponible: true, fn: () => { co.garaje[s2.clubId] = false; const q = casa.obj.position; co.pos[s2.clubId] = { x: q.x + 4.5, z: q.z + 3, ry: Math.PI / 2 }; reponerCoche(S, s2); return { ok: true, texto: 'Coche fuera del garaje' }; } } : { id: 'guardar', t: 'Guardar el coche aquí', d: 'Tiene que estar a menos de 25 m.', disponible: !!co.pos[s2.clubId] && dist2(co.pos[s2.clubId].x, co.pos[s2.clubId].z, casa.obj.position.x, casa.obj.position.z) < 25, motivo: 'Acércalo a casa', fn: () => { co.garaje = co.garaje || {}; co.garaje[s2.clubId] = true; reponerCoche(S, s2); return { ok: true, texto: 'Coche guardado en el garaje' }; } }]; } };
    const q = casa.obj.position, zn = M.zona(S.mundo, sala, q.x + 3.5, q.z + 2.6, club); S.zonas.push(zn); S.garajeZona = zn;
  }
  function poblar(S, M, st) {
    S.motor = M; trafico(S, M, st); try { flota(S, M, st); } catch (e) { S.flota = []; } try { concesionario(S, M, st); } catch (e) { /* sin sitio */ } try { radares(S, M); } catch (e) { S.radares = []; } try { garaje(S, M, st); } catch (e) { /* sin casa */ } S.cond = null; S.conduciendo = false; reponerCoche(S, st);
  }
  // Aplicación de movilidad del móvil: reservas, taxi y VTC, tarjeta de transporte, gastos, tu coche y multas
  function app(cuerpo, st, volver) {
    const h = GM.h, S = GM.sede && GM.sede.activa && GM.sede.activa() ? GM.sede._estado() : null, M = mem(st), real = !!(S && S.real && S.yo); cuerpo.innerHTML = '';
    const sec = (t, ...hijos) => h('div', { class: 'tarjeta' }, h('b', null, t), ...hijos), fila = (t, d, boton) => h('div', { class: 'fila', style: { marginTop: '8px' } }, h('div', { class: 'ct' }, h('b', null, t), h('span', { class: 'muted' }, d)), boton || null);
    cuerpo.append(h('div', { class: 'movil-cab' }, h('button', { class: 'btn btn-sec peq', onclick: volver }, 'Volver'), h('b', null, 'Movilidad')));
    cuerpo.append(sec('Resumen', h('p', { class: 'muted' }, 'Gastado en movilidad: ' + euros(M.gastado) + ', viajes: ' + M.viajes + ', tarjeta de transporte: ' + M.tarjeta + ' viajes.'), h('button', { class: 'btn btn-sec peq', onclick: () => { if (dinero(st) < 10) { toast('No tienes 10 €'); return; } pagar(st, 10); M.tarjeta += 10; toast('Tarjeta de 10 viajes: 10 €'); app(cuerpo, st, volver); } }, 'Recargar tarjeta (10 €)')));
    if (!real) { cuerpo.append(h('p', { class: 'muted' }, 'Abre la ciudad para reservar vehículos o pedir un taxi.')); return; }
    const yo = [S.yo.obj.position.x, S.yo.obj.position.z], R = M.reserva, fl = masCerca(S.flota || [], yo), cab = [];
    if (R && R.club === st.clubId) cab.push(fila('Reserva activa', MARCAS[R.tipo] + ' en el punto ' + (R.k + 1) + ', caduca en ' + Math.max(0, Math.round((R.hasta - Date.now()) / 60000)) + ' min', null));
    else if (fl) cab.push(fila('Punto más cercano, a ' + Math.round(fl.d) + ' m', fl.q.pat + ' patinetes y ' + fl.q.moto + ' motos', h('div', { class: 'chips' }, h('button', { class: 'btn peq', disabled: fl.q.pat < 1, onclick: () => { toast(reservar(S, st, 'patinete', fl.q).texto); app(cuerpo, st, volver); } }, 'Reservar patinete'), h('button', { class: 'btn peq', disabled: fl.q.moto < 1, onclick: () => { toast(reservar(S, st, 'moto', fl.q).texto); app(cuerpo, st, volver); } }, 'Reservar moto'))));
    cab.push(fila('Bici pública', 'La reserva vale en cualquier estación y el desbloqueo es gratis.', h('button', { class: 'btn peq', disabled: !!(M.reservaBici && M.reservaBici > Date.now()), onclick: () => { M.reservaBici = Date.now() + 600000; toast('Bici reservada 10 minutos: desbloqueo gratis'); app(cuerpo, st, volver); } }, M.reservaBici > Date.now() ? 'Reservada' : 'Reservar')));
    cuerpo.append(sec('Patinetes, motos y bicis', ...cab));
    const dest = (S.zonas || []).filter(z => !/^(micro|micoche|garaje|bici_)/.test(z.sala.id)).sort((a, b) => dist2(a.obj.position.x, a.obj.position.z, yo[0], yo[1]) - dist2(b.obj.position.x, b.obj.position.z, yo[0], yo[1])).slice(0, 8);
    cuerpo.append(sec('Taxi y VTC', ...dest.map(z => { const D = distancia(S, yo, [z.obj.position.x, z.obj.position.z]), noche = hora(S) < 6 || hora(S) >= 22, punta2 = hora(S) >= 18 && hora(S) < 20.5, taxi = Math.max(5, (3.2 + D / 1000 * 1.15) * (noche ? 1.2 : 1)), vtc = Math.max(4.5, (2.4 + D / 1000 * 0.95) * (punta2 ? 1.5 : 1));
      const mk = (id, nombre, c, esp) => { const o = { id, nombre, min: esp + D / 7.5 / 60, coste: c, ok: dinero(st) >= c, _rec: D }; return h('button', { class: 'btn peq btn-sec', disabled: !o.ok, onclick: () => { document.querySelectorAll('.modal-fondo, .modal').forEach(e => e.remove()); pagar(st, c); mem(st).viajes++; iniciarViaje(S, st, o, z, { saltar: () => { const zx = z.obj.position.x, zz = z.obj.position.z, q = S.G.libre(...S.G.celda(zx, zz + 1.2)) ? [zx, zz + 1.2] : [zx, zz]; S.yo.camino = null; S.yo.obj.position.set(q[0], 0, q[1]); S.foco.set(q[0], 0, q[1]); } }); } }, nombre + ' ' + euros(c) + ', ' + fmtMin(o.min)); };
      return fila(z.sala.nombre, Math.round(D) + ' m', h('div', { class: 'chips' }, mk('taxi', 'Taxi', taxi, 4), mk('vtc', 'VTC', vtc, 3 + (punta2 ? 3 : 0)))); })));
    const co = M.coche; cuerpo.append(sec('Tu vehículo', co ? h('p', { class: 'muted' }, (co.nombre || co.modelo) + ': gasolina ' + Math.round(co.gas) + ' %, daños ' + Math.round(co.dano || 0) + ' %, seguro ' + (co.seguro || 'sin seguro') + ', ITV ' + (co.itv || 'sin pasar') + (co.garaje && co.garaje[st.clubId] ? ', en el garaje de casa' : '')) : h('p', { class: 'muted' }, 'No tienes coche ni moto. El concesionario está en la ciudad.'), ...(M.multas.length ? M.multas.slice(-4).reverse().map(m => fila(m.motivo, m.fecha + ', ' + euros(m.importe) + (m.pagada ? ', pagada' : ', pendiente'))) : [h('p', { class: 'muted' }, 'Sin multas.')])));
  }
  function calleCercana(S, x, z) { let mejor = null, md = 1e9; (S.callesTodas || []).forEach(c => { if (c.k > 5) return; for (let i = 0; i + 1 < c.p.length; i++) { const a = c.p[i], b = c.p[i + 1]; if (x < Math.min(a[0], b[0]) - 45 || x > Math.max(a[0], b[0]) + 45 || z < Math.min(a[1], b[1]) - 45 || z > Math.max(a[1], b[1]) + 45) continue; const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1e-9, u = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)), d = Math.hypot(x - a[0] - u * dx, z - a[1] - u * dz) - (c.w || 6) / 2; if (d < md) { md = d; mejor = c; } } }); return mejor ? { c: mejor, d: Math.max(0, md) } : null; }
  GM.movilidad = { iniciarViaje, garaje, reservar, app, calleCercana, poblar, actualizar, opciones, panel, densidad, punta, factorVel, MODELOS, MARCAS, mem, camion, tranvia, terminar, alquilar, conducir, bajar, flota, pasoConduccion, limiteEn, multa, accionesConcesionario, accionesCoche, reponerCoche, fmtMin, euros, selfTest: () => densidad(8, 2) === 1 && densidad(3, 2) < 0.3 && punta(8.5, 3) && !punta(8.5, 0) && opciones !== undefined };
  GM.register && GM.register('movilidad', { selfTest: () => GM.movilidad.selfTest() });
})();
