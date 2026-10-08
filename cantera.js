/* CANTERA Y ENTRENAMIENTO (GM.mods.cantera)
   Expone: generarJuveniles, ojear, ficharJuvenil, subirAlPrimerEquipo, soltarJuvenil, fijarFoco, progresionDiaria, progresionAnual, selfTest.
   Escribe state.cantera[clubId] = { juveniles, prospectos, foco, scouts }. Solo el club del jugador tiene juveniles.
   Entrenamiento semanal (lunes) y progresión anual de todos los jugadores en temporada:fin. */
(function () {
  const U = GM.util;
  const POS = ['PG', 'SG', 'SF', 'PF', 'C'];
  const FOCOS = {
    equilibrado: ['tiro3', 'tiro2', 'tl', 'pase', 'bote', 'reb', 'defInt', 'defPer', 'fisico', 'iq'],
    tiro: ['tiro3', 'tiro2', 'tl'], defensa: ['defInt', 'defPer', 'iq'], fisico: ['fisico', 'reb'], pase: ['pase', 'bote', 'iq']
  };
  const ZONAS = { espana: 'ES', balcanes: 'RS', francia: 'FR', eeuu: 'US', europa: 'GEN' };
  const yearOf = st => parseInt(st.temporada.slice(0, 4), 10);
  const eff = (st, id) => GM.mods.ciudadDeportiva && GM.mods.ciudadDeportiva.efectos ? GM.mods.ciudadDeportiva.efectos(st, id) : { entrenamiento: 1, cantera: 1 };
  const ciu = (st, id) => GM.mods.ciudad ? GM.mods.ciudad.modificadores(st, id).cantera : 1;

  function nuevoJuvenil(st, clubId, pais, calidad) {
    const c = st.cantera[clubId]; c.seq = (c.seq || 0) + 1;
    const h = U.hash(clubId + st.temporada + c.seq), pos = POS[h % 5], pa = pais || (h % 3 ? st.equipos[clubId].pais : 'GEN');
    const ovr = Math.round(U.clamp(40 + calidad * 10 + (h % 7) - 3, 36, 56)), pot = Math.round(U.clamp(ovr + 8 + calidad * 14 + (h >>> 4) % 9, 55, 90));
    const nac = pa === 'GEN' ? 'PL' : pa;
    const p = GM.mkJugador('jv', c.seq, GM.nombreAleatorio(pa, h), pos, 16 + (h >>> 6) % 4, GM.alturaPos(pos, h), nac, GM.pasaporte(nac), ovr, pot, ['T', 'P', 'D', 'R', 'E'][(h >>> 8) % 5], Math.round(40000 + ovr * 1500), yearOf(st) + 3);
    p.id = clubId.slice(0, 8) + '-jv' + c.seq; p.equipoId = clubId; p.juvenil = true; p.ficticio = true;
    st.jugadores[p.id] = p;
    return p;
  }
  function generarJuveniles(st, clubId, n) {
    const c = st.cantera[clubId], q = (eff(st, clubId).cantera + ciu(st, clubId)) / 2 - 1 + Math.min(1, (c.scouts[0].nivel - 1) * 0.15);
    for (let i = 0; i < (n === undefined ? 6 : n); i++) c.juveniles.push(nuevoJuvenil(st, clubId, null, 0.5 + q + GM.rng.next() * 0.5).id);
    return c.juveniles.length;
  }
  function ojear(st, clubId, zona) {
    const c = st.cantera[clubId], F = GM.mods.finanzas;
    const coste = Math.round(U.clamp(st.equipos[clubId].presupuesto / 60e6, 0.3, 8) * 15000 / 1000) * 1000;
    if (!ZONAS[zona]) return { ok: false, motivo: 'Zona desconocida.' };
    if (F && st.finanzas[clubId].caja < coste) return { ok: false, motivo: 'No hay caja para el viaje de ojeo.' };
    if (F) F.registrar(st, clubId, 'Ojeo en ' + zona, -coste);
    c.prospectos.forEach(i => { delete st.jugadores[i]; });
    c.prospectos = [];
    const base = 0.4 + (c.scouts[0].nivel - 1) * 0.2 + eff(st, clubId).cantera - 1;
    for (let i = 0; i < 3; i++) {
      const p = nuevoJuvenil(st, clubId, ZONAS[zona], base + GM.rng.next() * 0.9);
      p.equipoId = null; p.prospecto = true;
      c.prospectos.push(p.id);
    }
    return { ok: true, prospectos: c.prospectos.map(i => st.jugadores[i]), coste };
  }
  function ficharJuvenil(st, clubId, jugId) {
    const c = st.cantera[clubId], p = st.jugadores[jugId];
    if (c.prospectos.indexOf(jugId) < 0) return { ok: false, motivo: 'Ese prospecto ya no está disponible.' };
    if (c.juveniles.length >= 10) return { ok: false, motivo: 'La cantera está llena (10 juveniles).' };
    p.equipoId = clubId; p.prospecto = false; c.prospectos = c.prospectos.filter(i => i !== jugId); c.juveniles.push(jugId);
    return { ok: true };
  }
  function soltarJuvenil(st, clubId, jugId) {
    const c = st.cantera[clubId];
    c.juveniles = c.juveniles.filter(i => i !== jugId); delete st.jugadores[jugId];
    return { ok: true };
  }
  function subirAlPrimerEquipo(st, jugId) {
    const club = st.clubId, c = st.cantera[club], p = st.jugadores[jugId];
    if (!p || c.juveniles.indexOf(jugId) < 0) return { ok: false, motivo: 'No es un juvenil de tu club.' };
    if (st.equipos[club].plantilla.length >= 15) return { ok: false, motivo: 'La plantilla está completa (15).' };
    c.juveniles = c.juveniles.filter(i => i !== jugId);
    p.juvenil = false; p.contrato = { salario: Math.max(120000, Math.round(p.ovr * 4000)), hasta: yearOf(st) + 3 };
    st.equipos[club].plantilla.push(jugId);
    GM.noticia(st, p.nombre + ' debuta con el primer equipo (cantera).');
    return { ok: true };
  }
  function fijarFoco(st, clubId, foco) { if (FOCOS[foco]) st.cantera[clubId].foco = foco; }

  function sube(p, keys, n) {
    for (let i = 0; i < n; i++) { const k = keys[GM.rng.int(0, keys.length - 1)]; p.att[k] = Math.min(99, p.att[k] + 1); }
  }
  function progresionDiaria(st) {
    const club = st.clubId, c = st.cantera[club], keys = FOCOS[c.foco] || FOCOS.equilibrado;
    const mult = eff(st, club).entrenamiento * (0.9 + 0.1 * ciu(st, club));
    const lista = st.equipos[club].plantilla.concat(c.juveniles);
    lista.forEach(id => {
      const p = st.jugadores[id]; if (!p || p.esYo) return;
      const g = p.edad <= 21 ? 0.14 : p.edad <= 24 ? 0.09 : p.edad <= 27 ? 0.04 : p.edad <= 30 ? 0.01 : -0.025;
      p.xp = (p.xp || 0) + g * mult * (0.7 + 0.6 * GM.rng.next());
      if (p.xp >= 1 && p.ovr < Math.max(p.pot, p.ovr)) { p.xp = 0; p.ovr = Math.min(99, p.ovr + 1); sube(p, keys, 3); }
      else if (p.xp >= 1) p.xp = 0.5;
      else if (p.xp <= -1) { p.xp = 0; p.ovr = Math.max(40, p.ovr - 1); const k = FOCOS.equilibrado[GM.rng.int(0, 9)]; p.att[k] = Math.max(20, p.att[k] - 1); }
    });
  }
  GM.bus.on('dia:avanzado', function () {
    const st = GM.state; if (!st || !st.cantera || !st.cantera[st.clubId]) return;
    if (U.weekday(st.fecha) === 1) progresionDiaria(st);
  });

  // Potencial dinámico de todos los jugadores hasta los 24 años: depende de los minutos que reciben (decisión del entrenador
  // o del club), del nivel de desarrollo del club (instalaciones del tuyo, reputación del resto) y de un talento tardío oculto
  // (algunos jugadores, también de segunda ronda, explotan si juegan). Se aplica antes de cumplir años.
  function potAnual(st, p) {
    if (p.esYo || p.edad > 24 || !p.equipoId || !st.equipos[p.equipoId]) return;
    if (!st.estadisticas) return;                                       // sin estadísticas (pruebas): neutral
    const s = st.estadisticas[p.id], mpg = s && s.pj ? s.min / s.pj : 0, eq = st.equipos[p.equipoId];
    let d = mpg >= 26 ? 1.6 : mpg >= 18 ? 0.9 : mpg >= 10 ? 0.2 : s && s.pj >= 10 ? -0.6 : -1.4;
    d += p.equipoId === st.clubId ? (eff(st, p.equipoId).entrenamiento - 1) * 12 : (eq.reputacion - 60) / 40;
    const chispa = (U.hash('chispa' + p.id) % 1000) / 1000;
    if (chispa > 0.92 && mpg >= 14) d += 2 + (chispa - 0.92) * 40;      // talento tardío: hasta +5 al año si juega
    else if (chispa < 0.12) d -= 1;                                      // se estanca antes de lo previsto
    d += GM.rng.next() * 1.4 - 0.7;
    p.pot = U.clamp(p.pot + Math.round(U.clamp(d, -4, 6)), p.ovr, 99);
  }
  function progresionAnual(st) {
    for (const id in st.jugadores) {
      const p = st.jugadores[id];
      if (p.prospecto) continue;
      potAnual(st, p);
      p.edad++;
      let d;
      if (p.edad <= 21) d = GM.rng.int(1, 4); else if (p.edad <= 24) d = GM.rng.int(0, 3);
      else if (p.edad <= 28) d = GM.rng.int(-1, 1); else if (p.edad <= 31) d = GM.rng.int(-2, 0); else d = GM.rng.int(-4, -1);
      // Los jóvenes crecen según su margen: un 68 con 94 de techo puede ser estrella a los 22-23
      if (!p.esYo && p.edad <= 26 && p.pot - p.ovr > 4) d = Math.max(d, Math.round((p.pot - p.ovr) * (p.edad <= 21 ? 0.3 : p.edad <= 24 ? 0.24 : 0.18) + GM.rng.int(-1, 1)));
      // Tu jugador: lo que sube depende de cómo has llevado la temporada (carrera.js, progresoAnual)
      if (p.esYo && GM.mods.carrera && GM.mods.carrera.progresoAnual) d = GM.mods.carrera.progresoAnual(st, p);
      if (d > 0) d = Math.min(d, Math.max(0, p.pot - p.ovr + (p.edad >= 25 ? 1 : 0)));
      p.ovr = U.clamp(p.ovr + d, p.esYo ? 35 : 40, 99);
      if (p.edad >= (p.esYo ? 28 : 25)) p.pot = Math.max(p.ovr, p.pot - 1);
      Object.keys(p.att).forEach(k => { p.att[k] = U.clamp(p.att[k] + d + GM.rng.int(-1, 1), 20, 99); });
      p.xp = 0;
    }
    // renovar cantera del club del jugador
    const club = st.clubId, c = st.cantera[club];
    if (c) {
      c.juveniles.slice().forEach(id => { const p = st.jugadores[id]; if (p && p.edad >= 21) { c.juveniles = c.juveniles.filter(i => i !== id); GM.noticia(st, p.nombre + ' sale de la cantera al cumplir 21 años.'); delete st.jugadores[id]; } });
      generarJuveniles(st, club, Math.max(0, 6 - c.juveniles.length));
    }
  }
  GM.bus.on('temporada:fin', function () { const st = GM.state; if (st && st.cantera) progresionAnual(st); });

  function nuevaPartida(st) {
    Object.keys(st.equipos).forEach(id => { st.cantera[id] = { juveniles: [], prospectos: [], foco: 'equilibrado', scouts: [{ zona: 'espana', nivel: 1 }], seq: 0 }; });
    generarJuveniles(st, st.clubId, 6);
  }
  function selfTest() {
    if (!GM.mkJugador) return false;
    const st = { temporada: '2026-27', fecha: '2026-10-05', clubId: 'a', noticias: [], equipos: { a: { id: 'a', pais: 'ES', presupuesto: 30e6, reputacion: 60, plantilla: [] } }, jugadores: {}, cantera: {} };
    for (let i = 0; i < 30; i++) { const p = GM.mkJugador('a', i + 1, 'x' + i, 'SF', 20 + i % 15, 200, 'ES', 'UE', 62 + i % 6, 66, 'E', 1e6, 2027); st.jugadores[p.id] = p; st.equipos.a.plantilla.push(p.id); }
    st.cantera.a = { juveniles: [], prospectos: [], foco: 'equilibrado', scouts: [{ zona: 'espana', nivel: 1 }], seq: 0 };
    const grupo = (f) => { const l = st.equipos.a.plantilla.map(i => st.jugadores[i]).filter(f); return l.reduce((s, p) => s + p.ovr, 0) / (l.length || 1); };
    const y0 = grupo(p => p.edad <= 22), o0 = grupo(p => p.edad >= 33);
    GM.rng.seed(3);
    for (let y = 0; y < 3; y++) progresionAnual(st);
    const jovenes = st.equipos.a.plantilla.map(i => st.jugadores[i]).filter(p => p.edad <= 25);
    return grupo(p => p.edad <= 25) >= y0 - 1 && grupo(p => p.edad >= 36) <= o0 + 1 && st.cantera.a.juveniles.length === 6 && jovenes.length > 0;
  }
  GM.register('cantera', { generarJuveniles, ojear, ficharJuvenil, subirAlPrimerEquipo, soltarJuvenil, fijarFoco, progresionDiaria, progresionAnual, potAnual, nuevaPartida, selfTest, FOCOS, ZONAS });
})();
