/* TU PUEBLO (GM.mods.pueblo) — modo carrera
   Tu pueblo natal crece con tu reputación y con lo que inviertas: de aldea a ciudad del baloncesto. Con más nivel, más casas, mejores edificios y nuevas
   infraestructuras interactivas (canasta, polideportivo, escuela, ambulatorio, mural y estatua, bar de la peña, tienda, hotel, pabellón con tu nombre).
   Acciones: visitar, fiesta en tu honor, clínic con los niños e inversiones. Los edificios dan renta, cariño y reputación cada mes.
   Expone: estado, nivel, edificios, invertir, visitar, fiesta, clinic, mount, unmount, selfTest. Escribe state.carrera.pueblo. */
(function () {
  const U = GM.util, C = st => st.carrera;
  const NIVELES = ['Aldea', 'Pueblo', 'Villa', 'Ciudad pequeña', 'Ciudad del baloncesto'], UMBRAL = [0, 16, 38, 68, 105];
  const NOMBRES = { ES: ['Vilanova de Sau', 'Torrelles del Monte', 'Castellar Alto', 'Sant Martí del Vall', 'Alcudia de la Sierra', 'Pozoblanco Nuevo', 'Fuente Clara'], US: ['Maple Creek', 'Rivers Bend', 'Cedar Falls', 'Oak Ridge'], FR: ['Saint-Aubin', 'Villeneuve', 'Les Arcs'], RS: ['Zlatibor', 'Novi Slatina'], GR: ['Nea Kallithea', 'Agios Pavlos'], IT: ['Borgo Alto', 'San Lorenzo'], LT: ['Kaunas Sodai'], DE: ['Neustadt', 'Burgdorf'], TR: ['Yeni Köy'] };
  const EDI = {
    canasta: { n: 'Canasta de la plaza', req: 1, coste: 5, max: 3, niv: ['Canasta y suelo de cemento', 'Cancha pública con vallas', 'Cancha cubierta con gradas'], ef: { cariño: 0.4, fama: 0.02 }, uso: ['Echar un uno contra uno con los chavales', { moral: 2, cariño: 1.5 }] },
    bar: { n: 'Bar de la peña', req: 1, coste: 12, max: 2, niv: ['Bar con pantalla', 'Sede de la peña con museo'], ef: { cariño: 0.5, moral: 0.2 }, uso: ['Tomar algo con la peña', { moral: 2.5, cariño: 1 }] },
    escuela: { n: 'Escuela de baloncesto', req: 2, coste: 45, max: 3, niv: ['Escuela con un entrenador', 'Escuela con dos pistas', 'Academia de referencia regional'], ef: { cariño: 0.4, fama: 0.05 }, uso: ['Dar una clase a los pequeños', { cariño: 2, fama: 0.2 }] },
    mural: { n: 'Mural y estatua', req: 2, coste: 20, max: 3, niv: ['Mural en la plaza', 'Mural y placa conmemorativa', 'Estatua de bronce'], ef: { fama: 0.12, cariño: 0.3 }, uso: ['Pasear por tu mural', { moral: 1.5, fama: 0.1 }] },
    ambulatorio: { n: 'Ambulatorio', req: 3, coste: 110, max: 2, niv: ['Centro de salud', 'Hospital comarcal con tu nombre'], ef: { cariño: 0.6, fama: 0.08, moral: 0.2 }, uso: ['Visitar a los pacientes', { cariño: 2, fama: 0.2 }] },
    polideportivo: { n: 'Polideportivo municipal', req: 3, coste: 160, max: 3, niv: ['Polideportivo básico', 'Polideportivo con piscina', 'Complejo deportivo con ciudad deportiva'], ef: { cariño: 0.5, fama: 0.1, dinero: 1.5 }, uso: ['Entrenar en el polideportivo', { xp: 0.06, moral: 1.5 }] },
    tienda: { n: 'Tienda de deportes', req: 3, coste: 70, max: 2, niv: ['Tienda con tu camiseta', 'Tienda oficial con tu marca'], ef: { dinero: 4, fama: 0.05 }, uso: ['Firmar camisetas en la tienda', { fama: 0.3, cariño: 1 }] },
    hotel: { n: 'Hotel y turismo', req: 4, coste: 260, max: 2, niv: ['Hotel rural', 'Gran hotel con balcón al pabellón'], ef: { dinero: 9, fama: 0.1 }, uso: ['Recibir a invitados del hotel', { fama: 0.4, moral: 1 }] },
    pabellon: { n: 'Pabellón con tu nombre', req: 4, coste: 420, max: 2, niv: ['Pabellón municipal', 'Pabellón de 4.000 localidades'], ef: { cariño: 0.8, fama: 0.2 }, uso: ['Jugar un partido benéfico', { moral: 3, fama: 0.5, cariño: 3 }] }
  };
  const act = st => st.modo === 'carrera' && !!st.carrera && !!st.carrera.pueblo;
  const P = st => C(st).pueblo;
  function nuevaPartida(st) {
    if (st.modo !== 'carrera' || !st.carrera) return;
    const nac = st.jugadores.yo.nac, lista = NOMBRES[nac] || NOMBRES.ES, h = U.hash(st.jugadores.yo.nombre + 'pueblo');
    st.carrera.pueblo = { nombre: lista[h % lista.length], nac, aportado: 0, cariño: 40, edificios: [{ tipo: 'canasta', nivel: 1 }], hitos: [], cd: {}, nivel: 1, energia: 0 };
  }
  function puntos(st) { const c = C(st), p = P(st); return GM.mods.carrera.gradoFama(c).idx * 10 + p.aportado / 18 + p.cariño * 0.18; }
  function nivel(st) { const pt = puntos(st); let n = 0; UMBRAL.forEach((u, i) => { if (pt >= u) n = i; }); return n + 1; }
  function estado(st) {
    if (!act(st)) return null; const p = P(st), n = nivel(st), pt = puntos(st), sig = UMBRAL[n] !== undefined ? UMBRAL[n] : null;
    return { nombre: p.nombre, nivel: n, etiqueta: NIVELES[n - 1], poblacion: Math.round(300 * Math.pow(2.3, n - 1) + p.cariño * 8), cariño: p.cariño, aportado: p.aportado, pts: pt, sig, frac: sig ? U.clamp((pt - UMBRAL[n - 1]) / (sig - UMBRAL[n - 1]), 0, 1) : 1 };
  }
  function edificios(st) {
    const p = P(st), n = nivel(st);
    return Object.keys(EDI).map(k => {
      const e = EDI[k], b = p.edificios.find(x => x.tipo === k), nv = b ? b.nivel : 0, coste = Math.round(e.coste * Math.pow(nv + 1, 1.6));
      let motivo = null; if (n < e.req) motivo = 'Requiere que el pueblo sea ' + NIVELES[e.req - 1].toLowerCase(); else if (nv >= e.max) motivo = 'Nivel máximo'; else if (GM.mods.hogar.dinero(st) < coste) motivo = 'Te faltan ' + Math.round(coste - GM.mods.hogar.dinero(st)) + ' mil €';
      return { tipo: k, nombre: e.n, nivel: nv, max: e.max, actual: nv ? e.niv[nv - 1] : null, proximo: nv < e.max ? e.niv[nv] : null, coste, req: e.req, motivo, uso: nv ? e.uso[0] : null };
    });
  }
  function invertir(st, tipo) {
    const e = edificios(st).find(x => x.tipo === tipo); if (!e) return { ok: false, motivo: 'Edificio desconocido.' }; if (e.motivo) return { ok: false, motivo: e.motivo };
    const c = C(st), p = P(st), antes = nivel(st); c.dinero -= e.coste; p.aportado += e.coste;
    const b = p.edificios.find(x => x.tipo === tipo); if (b) b.nivel++; else p.edificios.push({ tipo, nivel: 1 });
    p.cariño = U.clamp(p.cariño + 4, 0, 100); c.fama = c.fama + 0.4;
    p.hitos.unshift({ fecha: st.fecha, texto: 'Inviertes en ' + e.nombre.toLowerCase() + ': ' + e.proximo + '.' }); c.hitos.unshift({ fecha: st.fecha, texto: 'En ' + p.nombre + ' se estrena: ' + e.proximo.toLowerCase() + '.' });
    GM.noticia(st, p.nombre + ' estrena ' + e.proximo.toLowerCase() + ' gracias a ' + st.jugadores.yo.nombre + '.');
    const ahora = nivel(st); if (ahora > antes) { p.hitos.unshift({ fecha: st.fecha, texto: p.nombre + ' pasa a ser ' + NIVELES[ahora - 1].toLowerCase() + '.' }); GM.noticia(st, p.nombre + ' crece: ahora es ' + NIVELES[ahora - 1].toLowerCase() + '.'); }
    return { ok: true };
  }
  function gasta(st, k) { const c = C(st); if (c.dinero < k) return false; c.dinero -= k; return true; }
  function cd(st, id, dias) { const p = P(st); if (p.cd[id] && U.diffDays(p.cd[id], st.fecha) < dias) return dias - U.diffDays(p.cd[id], st.fecha); return 0; }
  function accion(st, id, dias, coste, fn) {
    const r = cd(st, id, dias); if (r) return { ok: false, motivo: 'Disponible de nuevo en ' + r + ' días.' };
    if (coste && !gasta(st, coste)) return { ok: false, motivo: 'Te faltan ahorros: ' + coste + ' mil €.' };
    P(st).cd[id] = st.fecha; return fn();
  }
  function visitar(st) {
    return accion(st, 'visita', 14, 0.8, () => { const c = C(st), p = P(st); c.moral = U.clamp(c.moral + 5, 0, 100); p.cariño = U.clamp(p.cariño + 3, 0, 100); if (GM.mods.social && c.social) c.social.contactos.filter(k => k.tipo === 'familia' || k.tipo === 'amigo').forEach(k => { k.rel = U.clamp(k.rel + 7, 0, 100); }); return { ok: true, efectos: ['ánimo +5', 'tu familia y tus amigos te echaban de menos'] }; });
  }
  function fiesta(st) { return accion(st, 'fiesta', 45, 15, () => { const c = C(st), p = P(st); p.cariño = U.clamp(p.cariño + 9, 0, 100); c.fama = c.fama + 0.6; c.moral = U.clamp(c.moral + 3, 0, 100); p.aportado += 15; return { ok: true, efectos: ['cariño del pueblo +9', 'reputación +'] }; }); }
  function clinic(st) { return accion(st, 'clinic', 21, 2, () => { const c = C(st), p = P(st); p.cariño = U.clamp(p.cariño + 4, 0, 100); c.fama = c.fama + 0.25; c.moral = U.clamp(c.moral + 2, 0, 100); return { ok: true, efectos: ['cariño +4', 'los niños te adoran'] }; }); }
  function usar(st, tipo) {
    const e = edificios(st).find(x => x.tipo === tipo); if (!e || !e.nivel) return { ok: false, motivo: 'Aún no está construido.' };
    const u = EDI[tipo].uso[1], c = C(st), p = P(st);
    return accion(st, 'uso-' + tipo, 10, 0, () => { if (u.moral) c.moral = U.clamp(c.moral + u.moral, 0, 100); if (u.cariño) p.cariño = U.clamp(p.cariño + u.cariño, 0, 100); if (u.fama) c.fama = c.fama + u.fama; if (u.xp) st.jugadores.yo.xp = (st.jugadores.yo.xp || 0) + u.xp; return { ok: true, texto: EDI[tipo].uso[0], efectos: Object.keys(u).map(k => ({ moral: 'ánimo', cariño: 'cariño', fama: 'reputación', xp: 'progresión' }[k])) }; });
  }
  GM.bus.on('dia:avanzado', function () {
    const st = GM.state; if (!st || !act(st) || st.fecha.slice(8) !== '15') return;
    const c = C(st), p = P(st); if (c.fase === 'retirado' && false) return;
    p.edificios.forEach(b => { const e = EDI[b.tipo].ef; if (e.dinero) c.dinero += e.dinero * b.nivel; if (e.fama) c.fama = c.fama + e.fama * b.nivel; if (e.moral) c.moral = U.clamp(c.moral + e.moral * b.nivel, 0, 100); if (e.cariño) p.cariño = U.clamp(p.cariño + e.cariño * b.nivel * 0.3, 0, 100); });
    p.cariño = U.clamp(p.cariño + (30 - p.cariño) * 0.04, 0, 100);
    const n = nivel(st); if (n > p.nivel) { p.nivel = n; p.hitos.unshift({ fecha: st.fecha, texto: p.nombre + ' crece y pasa a ser ' + NIVELES[n - 1].toLowerCase() + '.' }); GM.noticia(st, p.nombre + ' crece: ahora es ' + NIVELES[n - 1].toLowerCase() + '.'); }
  });

  // ---------- 3D ----------
  let V = null;
  const col = h => GM.kit.color(h);
  function casa(g, x, z, rot, niv, h0) {
    const K = GM.kit, pal = [0xe8d8b8, 0xd9c2a0, 0xf0e6d2, 0xc9b79c, 0xe6cfa8], techo = [0xa4432e, 0x8a3a28, 0x6b4a3a], H = U.hash('h' + x + z + h0) >>> 0;
    const gr = new THREE.Group(); gr.position.set(x, 0, z); gr.rotation.y = rot;
    if (niv <= 2) { gr.add(K.caja(1.4, 0.8 + (H % 3) * 0.1, 1.2, pal[H % 5], 0, 0, 0)); const r = K.cono(1.1, 0.6, techo[H % 3], 0, 0.8, 0, 4); r.rotation.y = Math.PI / 4; r.scale.set(1, 1, 0.9); gr.add(r); gr.add(K.caja(0.25, 0.4, 0.04, 0x6b4a2b, 0, 0, 0.62)); }
    else if (niv === 3) { gr.add(K.caja(1.5, 1.4, 1.3, pal[H % 5], 0, 0, 0)); gr.add(K.caja(1.6, 0.1, 1.4, techo[H % 3], 0, 1.4, 0)); gr.add(K.caja(0.3, 0.3, 0.04, 0x9fcde4, -0.4, 0.8, 0.67)); gr.add(K.caja(0.3, 0.3, 0.04, 0x9fcde4, 0.4, 0.8, 0.67)); }
    else { const alto = 2 + (H % 4) * 0.8; gr.add(K.caja(1.8, alto, 1.6, [0xdad4c6, 0xc9ced6, 0xe9e6dc][H % 3], 0, 0, 0)); for (let f = 0; f < Math.floor(alto / 0.7); f++) { gr.add(K.caja(1.5, 0.28, 0.04, 0x9fcde4, 0, 0.35 + f * 0.7, 0.82)); } gr.add(K.caja(1.9, 0.12, 1.7, 0x555, 0, alto, 0)); }
    return gr;
  }
  function edificio(tipo, nv, S) {
    const g = new THREE.Group(), K = GM.kit, B = (w, h, d, c, x, y, z) => g.add(K.caja(w, h, d, c, x, y, z));
    switch (tipo) {
      case 'canasta': B(2.4, 0.04, 2.4, nv > 1 ? 0xc98d4f : 0x9a9a9a, 0, 0, 0); g.add(K.cilindro(0.04, 1.6, 0x555, 1.0, 0, 0, 6)); B(0.6, 0.4, 0.04, 0xffffff, 1.0, 1.4, 0); if (nv > 1) for (let i = 0; i < 5; i++) B(0.04, 0.8, 0.04, 0x555, -1.2, 0, -1.0 + i * 0.5); if (nv > 2) { B(2.6, 0.1, 2.6, 0x6c7a86, 0, 1.9, 0); [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]].forEach(q => B(0.08, 1.9, 0.08, 0x555, q[0], 0, q[1])); } break;
      case 'bar': B(1.8, 0.9, 1.4, 0xd9c2a0, 0, 0, 0); B(1.9, 0.12, 1.5, nv > 1 ? S.c1 : 0x8a3a28, 0, 0.9, 0); B(1.0, 0.3, 0.04, S.c1, 0, 0.55, 0.72); B(0.6, 0.28, 0.04, 0x1a3a5c, -0.5, 0.3, 0.72); if (nv > 1) { B(0.04, 0.5, 0.04, 0xdfe3e8, 0.8, 0.9, 0.6); B(0.35, 0.2, 0.02, S.c2, 0.97, 1.2, 0.6); } break;
      case 'escuela': B(2.6, 1.0, 1.5, 0xf0c64a, 0, 0, 0); B(2.7, 0.1, 1.6, 0xb5543c, 0, 1.0, 0); B(1.8, 0.04, 1.2, 0xc98d4f, 0, 0, 1.6); if (nv > 1) B(1.8, 0.04, 1.2, 0xc98d4f, 2.0, 0, 1.6); if (nv > 2) { B(1.2, 1.4, 1.0, 0xf5f0e2, -1.8, 0, 0); B(1.3, 0.1, 1.1, S.c1, -1.8, 1.4, 0); } break;
      case 'mural': B(2.6, 1.3, 0.2, 0xe9e0cc, 0, 0, 0); B(2.2, 0.9, 0.04, S.c1, 0, 0.2, 0.12); B(0.8, 0.5, 0.05, S.c2, -0.5, 0.4, 0.14); B(0.5, 0.5, 0.05, 0xe8b923, 0.6, 0.4, 0.14); if (nv > 2) { B(0.9, 0.5, 0.9, 0xcfc7b4, 2.0, 0, 0); B(0.35, 0.9, 0.3, 0x8a6a3a, 2.0, 0.5, 0); g.add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), K.mat(0x8a6a3a))).position.set(2.0, 1.55, 0); } break;
      case 'ambulatorio': B(2.4, 1.1 + nv * 0.4, 1.6, 0xf4f6f8, 0, 0, 0); B(0.6, 0.15, 0.04, 0xd62d2d, 0, 1.1 + nv * 0.4 - 0.3, 0.82); B(0.15, 0.6, 0.04, 0xd62d2d, 0, 0.8 + nv * 0.4 - 0.2, 0.82); if (nv > 1) { B(1.2, 1.9, 1.2, 0xe9edf1, 1.9, 0, 0); g.add(K.cilindro(0.5, 0.05, 0x3a4450, 1.9, 1.9, 0, 12)); } break;
      case 'polideportivo': B(3.2, 1.5, 2.2, 0xdfe3e8, 0, 0, 0); const rf = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 3.3, 12, 1, false, 0, Math.PI), K.mat(S.c1)); rf.rotation.z = Math.PI / 2; rf.position.set(0, 1.5, 0); g.add(rf); if (nv > 1) { B(1.8, 0.1, 1.2, 0x59b4e6, 2.8, 0, 0); B(1.9, 0.06, 1.3, 0xf0f0ee, 2.8, 0, 0); } if (nv > 2) { B(1.6, 1.8, 1.4, 0xf0f0ee, -2.6, 0, 0); B(1.7, 0.1, 1.5, S.c2, -2.6, 1.8, 0); } break;
      case 'tienda': B(1.8, 0.9, 1.2, 0xf2e6d0, 0, 0, 0); for (let i = 0; i < 6; i++) B(0.31, 0.08, 0.5, i % 2 ? S.c2 : S.c1, -0.78 + i * 0.31, 0.78, 0.8); B(1.2, 0.35, 0.04, 0xb3dcf2, 0, 0.2, 0.62); if (nv > 1) { B(1.8, 0.7, 1.2, 0xf2e6d0, 0, 0.9, 0); B(1.2, 0.3, 0.04, S.c1, 0, 1.2, 0.62); } break;
      case 'hotel': B(2.4, 2.0 + nv * 0.8, 1.6, 0xe9e0cc, 0, 0, 0); for (let f = 0; f < 3 + nv * 2; f++) B(2.0, 0.22, 0.04, 0x9fcde4, 0, 0.4 + f * 0.5, 0.82); B(2.5, 0.12, 1.7, 0x8a3a28, 0, 2.0 + nv * 0.8, 0); B(1.0, 0.5, 0.5, S.c1, 0, 0, 1.0); break;
      case 'pabellon': B(3.4, 1.3, 2.6, 0xb9c4c9, 0, 0, 0); const r2 = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 3.5, 14, 1, false, 0, Math.PI), K.mat(S.c1)); r2.rotation.z = Math.PI / 2; r2.position.set(0, 1.3, 0); g.add(r2); for (let i = 0; i < 6; i++) B(0.45, 1.3, 0.05, i % 2 ? S.c2 : S.c1, -1.4 + i * 0.56, 0, 1.32); if (nv > 1) { B(4.4, 1.6, 3.2, 0xb9c4c9, 0, 0, 0); r2.scale.set(1, 1.3, 1.2); } break;
    }
    return g;
  }
  function escena(st) {
    const K = GM.kit, v = V.vista, W = V.mundo, e = estado(st), p = P(st), pj = st.personaje, eq = st.equipos[st.clubId], CP = GM.campus; v.limpiar(W);
    const S = { c1: col(eq.colores[0] === '#000000' ? '#333333' : eq.colores[0]), c2: col(eq.colores[1] || '#ffffff') }, n = e.nivel;
    W.add(K.caja(90, 0.3, 90, 0x7fb069, 0, -0.34, 0));
    // colinas y río
    for (let i = 0; i < 6; i++) { const m = K.cono(9 + i * 1.5, 3 + (i % 3), [0x6fae5a, 0x5e9c4c, 0x7fb069][i % 3], -30 + i * 12, -0.3, -28 - (i % 2) * 6, 7); W.add(m); }
    for (let i = 0; i < 22; i++) W.add(K.caja(2.4, 0.05, 2.6, 0x59b4e6, -26 + i * 2.4, -0.01, 15 + Math.sin(i * 0.5) * 3, 0.9));
    // plaza
    W.add(K.cilindro(6, 0.08, 0xdcd3bd, 0, 0, 0, 24)); W.add(K.cilindro(0.9, 0.35, 0xcfc7b4, 0, 0.08, 0, 14)); W.add(K.cilindro(0.7, 0.05, 0x59b4e6, 0, 0.42, 0, 14)); W.add(K.cilindro(0.08, 0.9, 0xdfe3e8, 0, 0.1, 0, 6));
    for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.4; W.add(K.caja(1.0, 0.18, 0.3, 0x8a5a33, Math.cos(a) * 3.4, 0.1, Math.sin(a) * 3.4)); }
    // calles curvas
    const calles = [[-34, 8], [-34, -6], [-5, -34]]; let nCasas = 0;
    const total = 6 + n * 9;
    [0, 1, 2].forEach(s => { const fase = s * 1.9; for (let t = 0; t <= 60; t++) { const x = -34 + t * 1.15, z = (s === 0 ? 9 : s === 1 ? -9 : 0) + Math.sin(t * 0.18 + fase) * (4 + s); if (s === 2) { const zz = -34 + t * 1.15, xx = Math.sin(t * 0.2 + 1) * 6 - 4; W.add(K.caja(1.9, 0.04, 1.3, 0x5b6169, xx, -0.02, zz)); continue; } W.add(K.caja(1.4, 0.04, 1.9, 0x5b6169, x, -0.02, z)); } });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(8.5, 0.55, 4, 40), K.mat(0x5b6169)); ring.rotation.x = Math.PI / 2; ring.position.y = 0; ring.scale.z = 0.02; W.add(ring);
    for (let i = 0; nCasas < total && i < 400; i++) {
      const s = i % 3, t = Math.floor(i / 3) * 1.15 * 2.6 + 3, lado = (Math.floor(i / 3)) % 2 ? 1 : -1; let x, z, rot;
      if (s < 2) { x = -32 + (t % 62); const base = s === 0 ? 9 : -9, fase = s * 1.9; z = base + Math.sin((x + 34) / 1.15 * 0.18 + fase) * (4 + s) + lado * 3.2; rot = lado > 0 ? Math.PI : 0; } else { const zz = -32 + (t % 62), xx = Math.sin((zz + 34) / 1.15 * 0.2 + 1) * 6 - 4; x = xx + lado * 3.2; z = zz; rot = lado > 0 ? -Math.PI / 2 : Math.PI / 2; }
      if (Math.hypot(x, z) < 10.5 || Math.abs(z - (15 + Math.sin((x + 26) / 2.4 * 0.5) * 3)) < 3) continue;
      const cg = casa(W, x, z, rot, n, i); W.add(cg); nCasas++;
      if (U.hash(x + ',' + z) % 100 < p.cariño * 0.7 && n >= 2) { const f = K.caja(0.5, 0.25, 0.02, i % 2 ? S.c1 : S.c2, x, 1.2 + (n >= 4 ? 1.6 : 0), z); W.add(f); }
    }
    // infraestructuras en anillo
    const ed = edificios(st).filter(x => x.nivel); V.edificios = [];
    ed.forEach((b, i) => { const a = (i / 10) * 6.283 + 0.5, r = 9.6, g = edificio(b.tipo, b.nivel, S); g.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); g.rotation.y = -a + Math.PI / 2 + Math.PI; g.userData = { tipo: b.tipo }; W.add(g); V.edificios.push(g); });
    // solares de lo que aún no existe
    edificios(st).filter(x => !x.nivel).forEach((b, i) => { const k = ed.length + i, a = (k / 10) * 6.283 + 0.5, r = 9.6; if (k >= 10) return; const g = new THREE.Group(); g.add(K.caja(2.2, 0.04, 2.0, 0xb9cdae, 0, 0, 0)); g.add(K.cilindro(0.03, 0.9, 0xdfe3e8, 0, 0, 0, 5)); g.add(K.caja(0.7, 0.35, 0.04, b.motivo && /Requiere/.test(b.motivo) ? 0x7a828c : S.c1, 0, 0.6, 0)); g.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); g.rotation.y = -a + Math.PI / 2 + Math.PI; g.userData = { tipo: b.tipo }; W.add(g); V.edificios.push(g); });
    // gente, banderas y rótulo
    const gente = 6 + n * 6;
    for (let i = 0; i < gente; i++) { const q = new THREE.Group(), h = U.hash('p' + i) >>> 0, hincha = h % 100 < p.cariño; q.add(K.caja(0.2, 0.4, 0.14, hincha ? (h % 2 ? S.c1 : S.c2) : [0x7a8791, 0x3c5a7a, 0x8a6a4a][h % 3], 0, 0.3, 0)); q.add(K.cilindro(0.08, 0.14, 0xe0b48f, 0, 0.7, 0, 6)); q.userData.anim = t => { const a = t * 0.12 * (i % 2 ? 1 : -1) + i; q.position.set(Math.cos(a) * (5 + (i % 3) * 0.6), 0.1, Math.sin(a) * (5 + (i % 3) * 0.6)); }; W.add(q); }
    for (let i = 0; i < 3 + Math.round(p.cariño / 20); i++) { const a = i * 1.1, f = new THREE.Group(); f.add(K.cilindro(0.03, 1.8, 0xdfe3e8, 0, 0, 0, 5)); const t = K.caja(0.5, 0.3, 0.02, i % 2 ? S.c1 : S.c2, 0.28, 1.5, 0); f.add(t); f.position.set(Math.cos(a) * 5.6, 0, Math.sin(a) * 5.6); f.userData.anim = tt => { t.rotation.y = Math.sin(tt * 3 + i) * 0.3; }; W.add(f); }
    CP.rotulo(W, p.nombre.toUpperCase().slice(0, 18), 5.0, 0.7, S.c1, 0xffffff, 0, 2.6, -11).rotation.y = 0;
    if (CP.config.calidad === 'alta') K.sombrear(W);
    const an = []; W.traverse(o => { if (o.userData && typeof o.userData.anim === 'function') an.push(o.userData.anim); }); v.anim = an.length ? (t => an.forEach(f => f(t))) : null;
    CP.ambiente(v, 'dia'); v.place();
  }
  function panel(st) {
    const h = GM.h, Pn = V.panel; Pn.innerHTML = '';
    const e = estado(st), msg = h('div', { class: 'aviso', style: { display: 'none' } }), resp = r => { if (!r.ok) { msg.style.display = 'block'; msg.textContent = r.motivo; } else { if (GM.ui && GM.ui.toast) GM.ui.toast(r.texto ? r.texto + ': ' + r.efectos.join(', ') : r.efectos ? r.efectos.join(', ') : 'Hecho'); V.refrescar(); if (GM.ui && GM.ui.cabecera) GM.ui.cabecera(); } };
    Pn.append(h('div', { class: 'fila' }, h('div', { class: 'ct' }, h('b', null, e.nombre), h('span', { class: 'muted' }, e.etiqueta + ', ' + e.poblacion.toLocaleString('es-ES') + ' habitantes')), h('b', null, Math.round(GM.mods.hogar.dinero(st)).toLocaleString('es-ES') + ' k€')));
    Pn.append(h('div', { class: 'fila' }, h('span', { class: 'muted' }, 'Cariño del pueblo'), h('b', null, Math.round(e.cariño))), h('span', { class: 'barra ' + (e.cariño >= 60 ? 'verde' : 'ambar') }, h('i', { style: { width: e.cariño + '%' } })));
    Pn.append(h('div', { class: 'fila' }, h('span', { class: 'muted' }, e.sig ? 'Crecimiento hacia ' + NIVELES[e.nivel] : 'Nivel máximo'), h('b', null, Math.round(e.frac * 100) + ' %')), h('span', { class: 'barra' }, h('i', { style: { width: e.frac * 100 + '%' } })));
    Pn.append(h('div', { class: 'seg' }, [['Visitar el pueblo, 0,8 k€', () => visitar(st)], ['Fiesta en tu honor, 15 k€', () => fiesta(st)], ['Clínic con los niños, 2 k€', () => clinic(st)]].map(a => h('button', { class: 'tab', onclick: () => resp(a[1]()) }, a[0]))));
    Pn.append(h('h4', null, 'Infraestructuras'));
    Pn.append(h('div', { class: 'lista' }, edificios(st).map(b => h('div', { class: 'item col' }, h('div', { class: 'fila' }, h('b', null, (b.nivel ? '' : '🔒 ') + b.nombre), b.nivel ? h('span', { class: 'chip ok' }, 'Nivel ' + b.nivel + '/' + b.max) : h('span', { class: 'muted' }, 'Sin construir')), h('span', { class: 'muted' }, b.actual ? b.actual : b.motivo || 'Disponible'),
      h('div', { class: 'par' }, b.proximo ? h('button', { class: 'btn peq', disabled: !!b.motivo, onclick: () => resp(invertir(st, b.tipo)) }, (b.nivel ? 'Mejorar' : 'Construir') + ', ' + b.coste + ' k€') : null, b.uso ? h('button', { class: 'btn peq btn-sec', onclick: () => resp(usar(st, b.tipo)) }, b.uso) : null)))));
    const hi = P(st).hitos.slice(0, 5); if (hi.length) { Pn.append(h('h4', null, 'Historia del pueblo')); Pn.append(h('div', { class: 'lista' }, hi.map(x => h('div', { class: 'item' }, h('span', { class: 'muted f' }, U.fecha(x.fecha)), h('span', { class: 'ct' }, x.texto))))); }
    Pn.append(msg);
  }
  function mount(el, st) {
    unmount(); const h = GM.h, raiz = h('div', { class: 'c3d' }), vistaEl = h('div', { class: 'vista3d' }), panelEl = h('div', { class: 'panel3d' });
    raiz.append(vistaEl, panelEl); el.appendChild(raiz); V = { raiz, panel: panelEl, vista: null, mundo: null, st };
    if (GM.kit && GM.kit.disponible()) {
      try { V.vista = GM.kit.crear(vistaEl, { radio: 40, theta: 0.5, phi: 0.95, min: 10, max: 70, fondo: 0xb9d9ee, sombras: GM.campus && GM.campus.config.calidad === 'alta' }); V.mundo = new THREE.Group(); V.vista.scene.add(V.mundo); V.vista.target.set(0, 0, 2); V.vista.place();
        V.vista.onTap = (cx, cy) => { const hits = V.vista.pick(cx, cy, V.mundo.children); for (const it of hits) { let o = it.object; while (o && !(o.userData && o.userData.tipo)) o = o.parent; if (o) { const b = edificios(st).find(x => x.tipo === o.userData.tipo); if (b && GM.ui && GM.ui.toast) GM.ui.toast(b.nombre + (b.nivel ? ' (nivel ' + b.nivel + ')' : ': ' + (b.motivo || 'disponible'))); return; } } };
      } catch (e) { V.vista = null; }
    }
    if (!V.vista) vistaEl.append(h('div', { class: 'vacio' }, 'La vista 3D no está disponible en este dispositivo o sin conexión. Gestiona tu pueblo desde la lista.'));
    V.refrescar = () => { if (V.vista) escena(st); panel(st); }; V.refrescar(); return true;
  }
  function unmount() { if (!V) return; if (V.vista) V.vista.dispose(); if (V.raiz && V.raiz.parentNode) V.raiz.parentNode.removeChild(V.raiz); V = null; }
  function selfTest() { return Object.keys(EDI).every(k => EDI[k].niv.length === EDI[k].max) && UMBRAL.length === NIVELES.length; }
  GM.register('pueblo', { estado, nivel, edificios, invertir, visitar, fiesta, clinic, usar, mount, unmount, nuevaPartida, selfTest, EDI, NIVELES });
})();
