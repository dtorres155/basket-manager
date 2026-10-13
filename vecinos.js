/* Comportamiento de los vecinos (punto 27): roles con agenda (policía, repartidor, comerciante, turista, jubilado), grupos (parejas, amigos y familias que van juntos),
   reacciones al clima y a los resultados del club, actividades con su animación y saludos por nombre.
   Lo llama calle3d.siguiente (también la ciudad real) con GM.vecinos.siguiente(S, M, n, D): devuelve true si el vecino ya ha decidido qué hacer.
   asignar(S, st, p, k) se llama al crear cada vecino; actualizar(S, M, dt) corre cada fotograma (saludos). Prueba: node tools/vecinos_prueba.js. */
(function () {
  const U = GM.util;
  const ROLES = [['policia', 0.04], ['repartidor', 0.05], ['comerciante', 0.08], ['turista', 0.07]];
  const ETQ = { policia: 'Policía local', repartidor: 'Repartidor', comerciante: 'Comerciante', turista: 'Turista', jubilado: 'Jubilado', estudiante: 'Estudiante' };
  const PERS = ['amable', 'seco', 'bromista', 'timido', 'hablador'];
  const rolPara = r => { let x = r(); for (const [k, p] of ROLES) { x -= p; if (x < 0) return k; } return ''; };
  const dist = (a, b) => Math.hypot(a.obj.position.x - b.obj.position.x, a.obj.position.z - b.obj.position.z);
  const pick = (r, a) => a[(r() * a.length) | 0];
  const vivo = n => !n.oculto && !n.enCasa && !n.dentro;

  // Patinete: tabla, vástago, manillar y dos ruedas bajo los pies de quien lo monta
  let _mp = null;
  function patineteMesh(k) {
    const g = new THREE.Group(), m = _mp || (_mp = { metal: new THREE.MeshStandardMaterial({ color: '#cfd4da', metalness: 0.7, roughness: 0.35 }), tabla: new THREE.MeshStandardMaterial({ color: '#d9531e', roughness: 0.6 }), goma: new THREE.MeshStandardMaterial({ color: '#16181b', roughness: 0.9 }) });
    const caja = (w, h, d, mat, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); o.position.set(x, y, z); g.add(o); return o; };
    caja(0.14, 0.025, 0.62, m.tabla, 0, 0.09, 0.0); const v = caja(0.025, 0.95, 0.025, m.metal, 0, 0.55, 0.3); v.rotation.x = -0.12; caja(0.5, 0.025, 0.025, m.metal, 0, 1.02, 0.32);
    [[0.33], [-0.3]].forEach(([z]) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.04, 14), m.goma); w.rotation.z = Math.PI / 2; w.position.set(0, 0.075, z); g.add(w); });
    g.scale.setScalar(k); g.position.z = 0.12 * k; return g;
  }
  function asignar(S, st, p, k) {
    const club = st.equipos[st.clubId], h = U.hash(st.fecha + 'vn' + k);
    p.nombre = GM.nombreAleatorio(club.pais, h); p.pers = PERS[(h >>> 5) % PERS.length]; p.idV = 'v' + h;
    const esp = p.rolV || (p.edad === 'mayor' ? 'jubilado' : '');
    if (esp) { p.rolEsp = esp; if (ETQ[esp] && !p.hincha) p.rol = ETQ[esp]; }
    if (p.edad === 'nino') p.nino = true;
    if (p.rolEsp === 'jubilado') p.lento = true;
    if (p.edad === 'joven' && !p.rolEsp && !p.hincha && k % 9 === 4) { p.patinete = true; p.rol = 'Chaval en patinete'; const sc = p.obj.scale.x || 1; p.obj.add(patineteMesh(1 / sc)); }
    if (p.rolEsp === 'comerciante') p.puestoIdx = h % 97;
    // grupos: cada tercer vecino camina con el anterior (pareja, amigos o familia con un niño)
    const prev = S._gprev;
    if (prev && !p.rolEsp && !prev.rolEsp && !prev.sigue && k % 3 === 1 && prev.peaton) {
      p.sigue = prev; (prev.miembros = prev.miembros || [prev]).push(p);
      if (prev.edad === 'adulto' && p.edad === 'nino') { p.rol = 'Hijo de vecinos'; p.nino = false; p.familia = true; } else if (p.nino && prev.edad !== 'adulto') p.nino = false;
      p.hincha = p.hincha || prev.hincha;
    }
    if (!p.rolEsp) S._gprev = p.sigue ? null : p;
  }

  // Actividad al llegar a un sitio: animación según lo que se hace allí
  function actividad(n, cat, M) {
    const r = n.r, g = n.miembros || n.sigue;
    if (g && r() < 0.7) return r() < 0.5 ? 'hablar' : 'hablar2';
    switch (cat) {
      case 'compras': return r() < 0.5 ? 'movil' : n.rolEsp === 'jubilado' ? 'bolsas' : 'esperar';
      case 'comer': return r() < 0.55 ? 'comer' : r() < 0.5 ? 'hablar' : 'movil';
      case 'bares': return r() < 0.4 ? 'hablar2' : r() < 0.5 ? 'comer' : 'esperar';
      case 'parque': return n.nino ? 'celebrar' : r() < 0.5 ? 'hablar' : 'esperar';
      case 'paseo': return r() < 0.4 ? 'movil' : r() < 0.5 ? 'esperar' : 'hablar2';
      default: return 'esperar';
    }
  }
  // Mira hacia otro vecino o hacia el jugador
  function mira(n, x, z) { n.obj.rotation.y = Math.atan2(x - n.obj.position.x, z - n.obj.position.z); }
  function zonaMasCercana(L, n) { let m = null, d = 1e9; L.forEach(q => { const dd = Math.hypot(q[0] - n.obj.position.x, q[1] - n.obj.position.z); if (dd < d) { d = dd; m = q; } }); return m; }

  function siguiente(S, M, n, D) {
    const h = S.hora || 9, r = n.r, st = S.st, C = S.clima || {}, llueve = C.tipo === 'lluvia' || C.tipo === 'nieve', calor = (C.temp || 15) >= 27;
    // --- Grupos: el que sigue va con el líder; el líder espera si el otro se queda atrás
    if (n.sigue) {
      const l = n.sigue;
      if (l.oculto || l.enCasa || l.dentro) { if (!n.oculto) { n.oculto = true; n.enCasa = false; } n.espera = 2; return true; }
      if (n.oculto) { n.oculto = false; n.enCasa = false; n.dentro = false; n.obj.position.copy(l.obj.position); n.obj.position.x += 0.9; }
      const d = dist(n, l);
      if (d > 2.3) { n.rapido = !!l.rapido || d > 7; n.lento = l.lento; const a = r() * 6.28, q = [l.obj.position.x + Math.cos(a) * 1.1, l.obj.position.z + Math.sin(a) * 1.1]; if (M.irA(n, q[0], q[1], () => { n.espera = 0.6; })) { n.espera = 0.9; return true; } n.espera = 1; return true; }
      mira(n, l.obj.position.x, l.obj.position.z); M.anim(n, n.familia ? 'esperar' : (r() < 0.6 ? 'escuchar' : 'hablar')); n.espera = 1.5 + r() * 2.5; return true;
    }
    if (n.miembros && vivo(n)) { const f = n.miembros.find(x => x !== n && x.sigue === n && vivo(x) && dist(x, n) > 6); if (f) { M.anim(n, 'esperar'); mira(n, f.obj.position.x, f.obj.position.z); n.espera = 1.5; return true; } }
    const ir = (q, alLlegar, rapido) => { n.rapido = !!rapido; return M.irA(n, q[0] + (r() - 0.5) * 1.4, q[1] + (r() - 0.5) * 1.0, alLlegar); };
    const esp = n.rolEsp;
    // --- Reacciones al clima (la mitad de los vecinos busca cobijo o un helado)
    if (!esp && !n.nino && !n.hincha && !n.refugiado) {
      if (llueve && r() < 0.5 && D.comer.length) { n.refugiado = true; if (ir(zonaMasCercana(D.comer, n), () => { M.anim(n, r() < 0.5 ? 'comer' : 'hablar2'); n.espera = 12 + r() * 14; n.refugiado = false; }, true)) return true; n.refugiado = false; }
      else if (calor && h >= 12 && h < 21 && r() < 0.25) { const L = D.compras.length ? D.compras : D.comer; if (L.length) { n.refugiado = true; if (ir(zonaMasCercana(L, n), () => { M.anim(n, 'comer'); n.espera = 8 + r() * 8; n.refugiado = false; })) return true; n.refugiado = false; } }
    }
    // --- Tras una victoria o una derrota del club, los aficionados se juntan a hablar de ello
    if (n.hincha && !esp && h >= 18 && h < 22 && st.fecha && S.dia && (S.dia.tipo === 'victoria' || S.dia.tipo === 'derrota') && r() < 0.4 && D.bares.length) {
      const gana = S.dia.tipo === 'victoria'; if (ir(pick(r, D.bares), () => { M.anim(n, gana ? 'celebrar' : 'hablar2'); n.espera = 8 + r() * 10; })) return true;
    }
    if (!esp) return false;
    // --- Roles con agenda
    if (esp === 'policia') {
      if (h < 7 || h >= 22.5) { n.oculto = true; n.enCasa = true; n.hasta = 7; n.espera = 8; return true; }
      const partido = S.dia && S.dia.tipo === 'partido' && S.dia.casa && h >= 16 && h < 22.5 && S.ptoPab;
      const q = partido ? [S.ptoPab[0] + (r() - 0.5) * 6, S.ptoPab[1] + (r() - 0.5) * 3] : pick(r, S.paseo);
      n.rapido = false; if (M.irA(n, q[0], q[1], () => { M.anim(n, 'esperar'); n.espera = 4 + r() * 8; const cerca = S.gente.find(o => o !== n && vivo(o) && !o.fijo && dist(o, n) < 3); if (cerca && r() < 0.4) { mira(n, cerca.obj.position.x, cerca.obj.position.z); M.anim(n, 'hablar'); } })) return true;
      n.espera = 2; return true;
    }
    if (esp === 'repartidor') {
      if (h < 8 || h >= 20.5) { n.oculto = true; n.enCasa = true; n.hasta = 8; n.espera = 8; return true; }
      const L = D.compras.length ? D.compras : S.paseo; if (ir(pick(r, L), () => { M.anim(n, 'abrirPuerta'); n.espera = 2 + r() * 3; }, true)) return true;
      n.espera = 2; return true;
    }
    if (esp === 'comerciante') {
      const L = D.compras.length ? D.compras : S.paseo, puesto = L[n.puestoIdx % L.length];
      if (h < 8.4 || h >= 20.6) { n.oculto = true; n.enCasa = true; n.hasta = 8.4; n.espera = 8; return true; }
      const comiendo = h >= 14 && h < 15.8, q = comiendo && D.comer.length ? D.comer[n.puestoIdx % D.comer.length] : puesto;
      const cerca = Math.hypot(q[0] - n.obj.position.x, q[1] - n.obj.position.z) < 3.5;
      if (!cerca) { if (ir(q, () => { M.anim(n, comiendo ? 'comer' : 'esperar'); n.espera = 6 + r() * 6; })) return true; n.espera = 2; return true; }
      M.anim(n, comiendo ? 'comer' : (r() < 0.5 ? 'esperar' : r() < 0.5 ? 'hablar2' : 'movil')); n.espera = 6 + r() * 10; return true;
    }
    if (esp === 'turista') {
      if (h < 9 || h >= 21.5) { n.oculto = true; n.enCasa = true; n.hasta = 9; n.espera = 8; return true; }
      const monumentos = (S.zonas || []).filter(z => /pabellon|ayuntamiento|plaza|estacion|metro|mercado|pena/.test(z.sala.id)).map(z => [z.obj.position.x, z.obj.position.z]), L = monumentos.length ? monumentos : S.paseo;
      n.ruta = ((n.ruta === undefined ? (r() * L.length) | 0 : n.ruta) + 1) % L.length; n.rapido = false;
      if (ir(L[n.ruta], () => { M.anim(n, 'movil'); n.espera = 6 + r() * 6; })) return true; n.espera = 2; return true;
    }
    if (esp === 'jubilado') {
      if (h < 8 || h >= 21) { n.oculto = true; n.enCasa = true; n.hasta = 8; n.espera = 8; return true; }
      const cat = h < 13 ? (r() < 0.5 ? 'parque' : 'paseo') : h < 17 ? (r() < 0.5 ? 'comer' : 'parque') : 'bares', L = D[cat] && D[cat].length ? D[cat] : S.paseo;
      n.rapido = false; if (ir(pick(r, L), () => { M.anim(n, actividad(n, cat, M)); n.espera = 10 + r() * 14; })) return true; n.espera = 3; return true;
    }
    return false;
  }

  // Saludos por nombre: quien se cruza con el jugador lo saluda, y recuerda si ya se conocían (memoria en st.sede.memoria)
  function memoria(st) { st.sede = st.sede || { charlas: {} }; return st.sede.memoria || (st.sede.memoria = { vecinos: {}, temas: {} }); }
  function actualizar(S, M, dt) {
    S.tSaludo = (S.tSaludo || 0) - dt; if (S.tSaludo > 0 || !S.yo || S.pausa) return; S.tSaludo = 3.5;
    const st = S.st, yo = S.yo.obj.position, cerca = S.gente.filter(p => p.idV && vivo(p) && !p.fijo && !p.saludoHecho && p.obj.position.distanceTo(yo) < 2.8 && !(p.camino && p.camino.length > 3 && p.rapido));
    if (!cerca.length || Math.random() < 0.35) return;
    const p = cerca[(Math.random() * cerca.length) | 0], mem = memoria(st), conoce = mem.vecinos[p.idV], nom = (st.personaje && st.personaje.nombre) || 'crack', fama = (st.carrera && st.carrera.fama) || 0;
    p.saludoHecho = true; mira(p, yo.x, yo.z);
    const base = conoce ? ['Hola otra vez, ' + nom, '¡' + nom + '! ¿Qué tal todo?', 'Mira quién anda por aquí, ' + nom] : p.hincha ? ['¡Vamos, ' + nom + '!', '¡Eres tú! ¿' + nom + '?'] : fama > 30 || st.modo !== 'carrera' ? ['Buenas, ' + nom, 'Hola, ' + nom + ', ¿todo bien?'] : ['Buenos días.', 'Hola.'];
    const tono = { amable: t => t, seco: t => t.split(',')[0].replace('¡', '').replace('!', '.'), bromista: t => t + ' ...¿has traído el balón?', timido: t => t.replace('¡', '').replace('!', '…'), hablador: t => t + ' ¿Tienes un minuto?' }[p.pers] || (t => t);
    M.bocadillo(tono(base[(Math.random() * base.length) | 0]), p.obj); M.anim(p, 'saludar'); p.espera = Math.max(p.espera || 0, 2.5);
  }

  // Metro: quien va a una boca de metro baja la escalera (animación de escaleras) y desaparece un rato; sale por otra boca
  function metro(S, M, n, q, h) {
    const z = (S.zonas || []).find(o => /^metro/.test(o.sala.id) && Math.hypot(o.obj.position.x - q[0], o.obj.position.z - q[1]) < 6); if (!z || n.nino || n.rolEsp === 'policia' || n.r() > 0.55) return false;
    const x = z.obj.position.x, zz = z.obj.position.z; n.rapido = false; n.camino = [[x, zz - 1.2], [x, zz - 3.4]]; M.anim(n, 'escaleras'); if (n.accion) n.accion.timeScale = 1.1;
    n.alLlegar = () => { n.oculto = true; n.dentro = true; n.hasta = h + 0.4 + n.r() * 1.5; n.espera = 4; const otras = (S.zonas || []).filter(o => /^metro/.test(o.sala.id) && o !== z); if (otras.length) { const o = otras[(n.r() * otras.length) | 0]; n.obj.position.set(o.obj.position.x, 0, o.obj.position.z + 1.5); } };
    return true;
  }
  GM.vecinos = { metro, rolPara, asignar, siguiente, actualizar, actividad, memoria, ETQ, PERS };
})();
