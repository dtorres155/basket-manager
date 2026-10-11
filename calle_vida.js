/* VIDA DE LA CALLE (GM.calleVida) — eventos, reacciones, vehículos y fauna en la calle del club (lo usa calle3d.js)
   - Eventos: mercadillo los sábados por la mañana (puestos con vendedores en la plaza), obras que cortan un tramo de acera una de cada
     cuatro semanas (vallas, conos, zanja y operarios), fiesta mayor (14-16 de agosto y 8 de diciembre, con banderines), y la previa
     del derbi (más aficionados con cánticos: lo hace calle3d en la fase del partido).
   - Reacciones: los vecinos que te cruzan comentan el último resultado, el tiempo o el derbi (te pitan si perdisteis); algunos piden
     una foto (bocadillo con «flash»); si eres «chico malo» (estilo.v < -35) te siguen dos fotógrafos con cámara.
   - Vehículos: motos (vespas y scooter) que adelantan en el carril, furgoneta de reparto que se detiene unos segundos a descargar y
     el autobús urbano con parada que ya había.
   - Pájaros: gorriones posados en las copas de los árboles que echan a volar si te acercas o pasa alguien corriendo, y vuelven.
   Expone: construir(S, M, st, ctx), poblar(S, M, st), actualizar(S, M, dt), esMercadillo(st), hayObras(st). */
(function () {
  const T = THREE, U = GM.util;
  const MATS = {}; const mat = (c, o) => { const k = c + JSON.stringify(o || {}); return MATS[k] || (MATS[k] = new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.9 }, o || {}))); };
  const caja = (G, w, h, d, m, x, y, z, ry) => { const me = new T.Mesh(new T.BoxGeometry(w, h, d), typeof m === 'string' ? mat(m) : m); me.position.set(x, y + h / 2, z); if (ry) me.rotation.y = ry; me.castShadow = true; me.receiveShadow = true; G.add(me); return me; };
  const sem = st => Math.floor(U.diffDays('2026-01-05', st.fecha) / 7);
  const esMercadillo = st => U.weekday(st.fecha) === 6 && !(st.dia && st.dia.tipo === 'partido');
  const hayObras = st => sem(st) % 4 === 1;
  const esFiesta = st => GM.puebloJuego && GM.puebloJuego.esFiesta(st);

  // ---------- Construcción ----------
  function construir(S, M, st, ctx) {
    const { W, G, r, club } = ctx; S.puebloAnim = S.puebloAnim || []; S.cvPuestos = []; S.cvObras = null; S.cvPajaros = [];
    // Mercadillo: una hilera de puestos en el borde norte de la plaza, con toldos de colores y vendedores (los pone poblar)
    const A = S.real ? S.vidaAnc || {} : null;   // en la ciudad real los sitios los da calle_real.js
    if (esMercadillo(st) && GM.puebloVida && (!A || A.puestos)) {
      const cols = ['#c0392b', '#2f6f9e', '#f39c12', '#2e7d32', '#8e44ad', '#e84393', '#16a085'];
      for (let i = 0; i < (A ? A.puestos.length : 6); i++) { const x = A ? A.puestos[i][0] : -11.5 + i * 4.8, z = A ? A.puestos[i][1] : 28.6; if (GM.urbano && GM.urbano.libre && !GM.urbano.libre(G, x - 1.4, z - 0.9, x + 1.4, z + 1.2)) continue; GM.puebloVida.puestoMercado(W, M, x, z, 0, cols[i % cols.length], r, i); G.bloquea(x - 1.4, z - 0.8, x + 1.4, z + 1.2); S.cvPuestos.push({ x, z }); }
      S.mercadillo = true;
    }
    // Obras: tramo de acera sur de la avenida (x de 26 a 37) con zanja, vallas, conos, montón de arena y cartel
    if (hayObras(st) && (!A || A.obra)) {
      const x0 = A ? A.obra[0] : 24, x1 = A ? A.obra[2] : 32.5, z0 = A ? A.obra[1] : 4.3, z1 = A ? A.obra[3] : 5.5, g = new T.Group(); W.add(g);
      caja(g, x1 - x0 - 1, 0.04, z1 - z0 - 0.4, '#3a2f26', (x0 + x1) / 2, 0.0, (z0 + z1) / 2); caja(g, x1 - x0, 0.04, 0.3, '#8a7a68', (x0 + x1) / 2, 0.0, z0 - 0.15);
      for (let i = 0; i < 6; i++) { const x = x0 + i * ((x1 - x0) / 5); caja(g, 0.06, 1.0, 0.06, '#8a8f94', x, 0, z0 - 0.5); caja(g, 0.06, 1.0, 0.06, '#8a8f94', x, 0, z1 + 0.5); }
      for (let i = 0; i < 5; i++) { const x = x0 + 1 + i * ((x1 - x0 - 2) / 4); for (const z of [z0 - 0.5, z1 + 0.5]) { const v = caja(g, 1.9, 0.18, 0.04, i % 2 ? '#f4f4f0' : '#e74c3c', x, 0.8, z); void v; caja(g, 1.9, 0.18, 0.04, i % 2 ? '#e74c3c' : '#f4f4f0', x, 0.6, z); } }
      for (let i = 0; i < 6; i++) { const cn = new T.Mesh(new T.ConeGeometry(0.17, 0.5, 10), mat('#ff6a1a')); cn.position.set(x0 - 0.4 + (i % 3) * 0.6, 0.27, z1 + 0.9 + Math.floor(i / 3) * 0.5); g.add(cn); const ba = new T.Mesh(new T.CylinderGeometry(0.18, 0.2, 0.05, 8), mat('#2a2a2a')); ba.position.set(cn.position.x, 0.02, cn.position.z); g.add(ba); }
      const mon = new T.Mesh(new T.SphereGeometry(1.1, 10, 7, 0, 6.283, 0, 1.4), mat('#b8a47c', { roughness: 1 })); mon.scale.set(1.6, 0.7, 1); mon.position.set(x1 + 0.3, 0.02, z0 + 1); g.add(mon);
      const cart = new T.Mesh(new T.PlaneGeometry(1.4, 0.9), mat('#f1c40f', { side: T.DoubleSide })); cart.position.set(x0 - 0.8, 1.4, z0 - 0.5); cart.rotation.y = 0.1; g.add(cart); caja(g, 0.05, 1.4, 0.05, '#555', x0 - 0.8, 0, z0 - 0.5);
      const mi = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 0.04, 6), mat('#222')); mi.position.set(0, -10, 0); void mi; G.bloquea(x0 - 0.3, z0 - 0.6, x1 + 0.3, z1 + 0.6); S.cvObras = { x: (x0 + x1) / 2, z: z0 - 1.2, x0, x1, z0, z1 };
      const barra = new T.Mesh(new T.SphereGeometry(0.1, 5, 4), mat('#ff6a1a')); barra.userData = { destello: true }; barra.position.set(x0 - 0.8, 1.9, z0 - 0.5); g.add(barra);
      S.puebloAnim.push(t => { barra.visible = Math.sin(t * 7) > 0; });
    }
    if (!A && GM.arquitectura && GM.arquitectura.monumento) GM.arquitectura.monumento(W, G, club, st);   // rasgo reconocible de la ciudad al fondo
    // Fiesta mayor: banderines con los colores del club sobre la avenida y la calle central
    if (esFiesta(st) && GM.puebloJuego) GM.puebloJuego.fiesta(S, W, st, club, A ? A.fiesta : [{ w: 6, p: [[-38, -0.1], [38, -0.1]] }, { w: 6, p: [[0.1, -22], [0.1, 22]] }], r);
    // Pájaros posados en las copas de los árboles (posiciones de los árboles de la avenida)
    const arb = S.arbolesPos && S.arbolesPos.length ? S.arbolesPos : [];
    if (arb.length && GM.puebloVida && GM.puebloVida.golondrina) arb.slice(0, 14).forEach(([x, z], i) => { if (r() < 0.55) return; const b = GM.puebloVida.golondrina(); b.scale.setScalar(1.35); b.position.set(x + (r() - 0.5) * 0.8, 3.7 + r() * 1.2, z + (r() - 0.5) * 0.8); b.rotation.y = r() * 6.28; b.userData.posado = true; b.userData.casa = b.position.clone(); b.userData.estado = 'posado'; b.userData.t = 0; b.userData.alas.forEach(([p, s]) => { p.rotation.z = s * 1.0; }); W.add(b); S.cvPajaros.push(b); });
    // Motos y furgoneta de reparto como tráfico
    if (!A && !S.rua && GM.urbano && GM.urbano.moto) {
      const carriles = [['x', 1, 0.75], ['x', -1, -0.75], ['z', 1, -0.75], ['z', -1, 0.75]], RANGO = { x: [-150, 150], z: [-100, 24] }, cols = ['#2f8f7a', '#c0392b', '#e8e2d4', '#2f6f9e', '#f1c40f'];
      carriles.forEach(([eje, dir, c], ci) => { for (let i = 0; i < (eje === 'x' ? 2 : 1); i++) { const [mn, mx] = RANGO[eje], largo = mx - mn, obj = GM.urbano.moto(cols[(ci + i) % cols.length]); const pil = new T.Mesh(new T.CapsuleGeometry(0.17, 0.5, 4, 8), mat(['#1d2024', '#3b3b3b', '#5a1020'][(ci + i) % 3])); pil.position.set(0, 1.0, -0.3); obj.add(pil); const cab = new T.Mesh(new T.SphereGeometry(0.16, 10, 8), mat(['#e8e2d4', '#c0392b', '#1d2024'][(ci + i) % 3], { metalness: 0.2 })); cab.position.set(0, 1.55, -0.28); obj.add(cab); S.mundo.add(obj); S.coches.push({ obj, eje, dir, c, pos: mn + (i + 0.6 + ci * 0.13) * (largo / (eje === 'x' ? 2 : 1)) * 0.5 + r() * 6, vel: 7, largo, min: mn, max: mx, len: 2.3, moto: true }); } });
      if (GM.kit.coche) { const obj = GM.kit.coche('#e8e8e8', 'furgoneta'); obj.userData.reparto = true; S.mundo.add(obj); S.coches.push({ obj, eje: 'x', dir: -1, c: -1.5, pos: 70, vel: 5, largo: 300, min: -150, max: 150, len: 5.4, bus: true, reparto: true, parada: 28, tParada: 0 }); }
    }
  }

  // ---------- Gente ----------
  async function poblar(S, M, st) {
    const r = (() => { let a = U.hash(st.fecha + 'cv') >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; })(), PIEL = ['#f1c7a5', '#e0ac85', '#c68863', '#9a6142'], PELO = ['#1d1510', '#3b2617', '#6a4425', '#a9793e', '#8a8a8a'], MOD = ['h-casual_2', 'm-casual', 'h-farmer', 'm-formal', 'h-beach', 'm-adventurer', 'h-casual_hoodie', 'm-punk'];
    const nueva = async (modelo, rol, x, z, ry, opc) => { const p = await M.personaje(Object.assign({ modelo, altura: 160 + r() * 26, piel: PIEL[(r() * 4) | 0], pelo: PELO[(r() * 5) | 0] }, opc || {})); p.obj.position.set(x, 0, z); p.obj.rotation.y = ry || 0; Object.assign(p, { fijo: true, rol, r: () => r(), espera: 99 }); p.obj.userData = { npc: S.gente.length }; M.anim(p, 'idle'); S.mundo.add(p.obj); S.gente.push(p); return p; };
    for (const pu of S.cvPuestos || []) await nueva(r() < 0.5 ? 'h-farmer' : 'm-casual', 'Vendedor del mercadillo', pu.x, pu.z - 0.95, 0);
    if (S.mercadillo) for (let i = 0; i < 7; i++) { const pu = (S.cvPuestos || [])[(r() * (S.cvPuestos || [{}]).length) | 0]; if (pu) { const p = await nueva(MOD[(r() * MOD.length) | 0], 'Cliente del mercadillo', pu.x + (r() - 0.5) * 2, pu.z + 2.2 + r() * 1.6, Math.PI); p.fijo = false; p.vecino = true; p.espera = r() * 5; } }
    if (S.cvObras) { const o = S.cvObras; for (let i = 0; i < 3; i++) await nueva(i % 2 ? 'm-worker' : 'h-worker', 'Obrero de la zanja', o.x0 + 2 + i * 3, o.z0 + 0.9, i * 1.5, { altura: 168 + r() * 14 }).then(p => { M.anim(p, i === 1 ? 'idle' : 'interact-right'); }); }
    const est = st.carrera && st.carrera.estilo ? st.carrera.estilo.v : 0;
    S.cvFotografos = []; if (st.modo === 'carrera' && est < -35) for (let i = 0; i < 2; i++) { const p = await nueva(i ? 'm-formal' : 'h-casual_hoodie', 'Fotógrafo', (S.yo ? S.yo.obj.position.x : 0) + 6 + i * 2, (S.yo ? S.yo.obj.position.z : 0) + 5, 0); p.fijo = true; const cam = new T.Mesh(new T.BoxGeometry(0.22, 0.14, 0.14), mat('#1d2024')); cam.position.set(0.1, 1.35, 0.22); p.obj.add(cam); const lente = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 0.1, 8).rotateX(Math.PI / 2), mat('#3a3f45')); lente.position.set(0.1, 1.35, 0.33); p.obj.add(lente); S.cvFotografos.push(p); }
  }

  // ---------- Bucle ----------
  const FRASES_G = ['¡Vaya partido ganasteis!', 'Qué gran victoria. ¡Así se juega!', 'Estamos que lo rompemos.'], FRASES_P = ['Ya ganaréis el próximo.', 'Cuánto sufrimiento... pero seguimos.', 'Hay que levantar la cabeza.'];
  // Distrito en el que estás y su afición (0-100) según el mapa de la ciudad
  function barrioDe(st, x, z) { const b = GM.mods.ciudad3d && GM.mods.ciudad3d.barrios ? GM.mods.ciudad3d.barrios(st) : []; const R = GM.sede._estado && GM.sede._estado().real, k = R ? (x < -90 ? 3 : x > 90 ? 4 : z < -90 ? 1 : 0) : (x < -45 ? 3 : x > 45 ? 4 : z < -33 ? 1 : 0); return b[k] ? { nombre: b[k].nombre, afi: b[k].aficion } : null; }
  function actualizar(S, M, dt) {
    const t = performance.now() / 1000, st = S.st, yo = S.yo && S.yo.obj.position; if (!yo) return;
    if (GM.arquitectura) GM.arquitectura.aguaMover(t);
    // pájaros: huyen si te acercas o pasa alguien corriendo, y vuelven a su rama
    (S.cvPajaros || []).forEach((b, i) => { const u = b.userData, d = Math.hypot(b.position.x - yo.x, b.position.z - yo.z); let asusta = d < 5.2; if (!asusta) for (const n of S.gente) { if (n.rapido && n.camino && n.camino.length && Math.hypot(b.position.x - n.obj.position.x, b.position.z - n.obj.position.z) < 4) { asusta = true; break; } }
      if (u.estado === 'posado') { b.position.y = u.casa.y + Math.sin(t * 3 + i) * 0.01; if (asusta) { u.estado = 'vuelo'; u.t = 0; u.dir = [Math.cos(i * 2.1), Math.sin(i * 2.1)]; } }
      else if (u.estado === 'vuelo') { u.t += dt; b.position.x += u.dir[0] * dt * 6; b.position.z += u.dir[1] * dt * 6; b.position.y += dt * 3.2; b.rotation.y = Math.atan2(u.dir[0], u.dir[1]); const fl = Math.sin(t * 22 + i) * 0.7; u.alas.forEach(([p, s]) => { p.rotation.z = s * fl; }); if (u.t > 3) { u.estado = 'espera'; u.t = 0; b.visible = false; } }
      else if (u.estado === 'espera') { u.t += dt; if (u.t > 9 && d > 9) { b.position.copy(u.casa); b.visible = true; u.estado = 'posado'; u.alas.forEach(([p, s]) => { p.rotation.z = s * 1.0; }); } } });
    // fotógrafos: siguen al jugador a distancia y disparan el flash
    if (S.cvFotografos && S.cvFotografos.length) { S.cvFotografos.forEach((p, i) => { const o = p.obj.position, dx = yo.x - o.x, dz = yo.z - o.z, d = Math.hypot(dx, dz); if (d > 5 + i * 1.5) { const v = Math.min(3.8, 1.2 + d * 0.5) * dt; o.x += dx / d * v; o.z += dz / d * v; M.anim(p, 'walk'); } else M.anim(p, 'idle'); p.obj.rotation.y = Math.atan2(dx, dz); S.cvFlash = (S.cvFlash || 0) - dt; if (S.cvFlash <= 0 && d < 9) { S.cvFlash = 5 + Math.random() * 5; M.bocadillo(['📸 ¡Una foto!', '¡Mira aquí!', '¡Una declaración!'][(Math.random() * 3) | 0], p.obj); } }); }
    // reacciones de los vecinos
    S.cvT = S.cvT || 0; if (t < S.cvT) return; S.cvT = t + 0.7; S.cvSal = S.cvSal || {};
    const nom = (st.jugadores.yo && st.jugadores.yo.nombre || 'campeón').split(' ')[0], u = ultimo(st), llueve = S.clima && S.clima.tipo === 'lluvia', frio = S.clima && S.clima.tipo === 'nubes';
    const bar = barrioDe(st, yo.x, yo.z), sg = (st.equipos[st.clubId] || {}).siglas || '';
    S.gente.forEach(n => { if (!n.obj.visible || n.fijo || n.cvHab) return; const d = Math.hypot(n.obj.position.x - yo.x, n.obj.position.z - yo.z), id = n.obj.id; if (d > 3.4 || S.cvSal[id] === st.fecha) return; S.cvSal[id] = st.fecha; const k = (id * 7 + st.fecha.length) % 6; let f;
      if (bar && k < 2 && bar.afi < 38) f = ['En ' + bar.nombre + ' no se os quiere mucho, ' + nom + '.', 'Aquí cuesta ver gente del ' + sg + '...', 'Hace falta que vengáis más por ' + bar.nombre + '.'][(id + k) % 3];
      else if (bar && k < 2 && bar.afi > 72) f = ['¡En ' + bar.nombre + ' somos del ' + sg + ' hasta la muerte!', '¡Aquí tienes tu barrio, ' + nom + '!', '¡Vamos ' + sg + '! ¡Este barrio va contigo!'][(id + k) % 3];
      else
      if (u && !u.gana && u.derbi && n.hincha) f = ['¡Menuda vergüenza lo del derbi!', '¡Fuera, fuera!', 'Así no se pierde un derbi...'][k % 3];
      else if (u && n.hincha) f = (u.gana ? FRASES_G : FRASES_P)[k % 3];
      else if (llueve && k < 2) f = ['Qué asco de lluvia, ' + nom + '.', 'Cógete un paraguas, ' + nom + '.'][k];
      else if (k === 2) f = '¿Me haces una foto, ' + nom + '? 📱'; else if (k === 3 && u) f = u.gana ? 'Buen partido, ' + nom + '.' : 'Ánimo, ' + nom + '.'; else if (frio && k === 4) f = 'Hoy se está fresquito.'; else return;
      M.bocadillo(f, n.obj); });
  }
  function ultimo(st) { let g = null; (st.calendario || []).forEach(x => { if (x.resultado && (x.local === st.clubId || x.visitante === st.clubId) && (!g || x.fecha > g.fecha)) g = x; }); if (!g) return null; const loc = g.local === st.clubId, nos = loc ? g.resultado.local : g.resultado.visitante, ellos = loc ? g.resultado.visitante : g.resultado.local, riv = st.equipos[loc ? g.visitante : g.local], derbi = GM.mods.rivalidades && GM.mods.rivalidades.derbi ? !!GM.mods.rivalidades.derbi(st, st.clubId, riv && riv.id) : false; return { gana: nos > ellos, derbi, fecha: g.fecha }; }
  GM.calleVida = { construir, poblar, actualizar, esMercadillo, hayObras };
})();
