/* SELECCIONES JUGABLES (punto 66, GM.seleccion) — sustituye la resolución automática de pretemporada.js por una ventana de selecciones con decisiones y partidos día a día.
   - Convocatoria: al empezar el verano de Mundial, Juegos u Eurobasket se anuncian las listas. De los jugadores de tu club convocados (y de tu jugador en modo carrera) decides si los dejas ir o no
     (hasta el día anterior a la ventana). Rechazar la convocatoria les baja el ánimo, enfada a la federación y, en carrera, cuesta fama; los lesionados son baja automática.
   - Torneo jugado: fase de grupos (tres jornadas), cuartos, semifinales, tercer puesto y final en las fechas de la ventana. Cada partido de un convocado tuyo tiene minutos propios (según su lugar en la lista de su país)
     y estadísticas (puntos, rebotes, asistencias), cansancio y riesgo de lesión; todo se acumula en state.pretemp.ventana.stats y se ve en la pestaña Pretemporada.
   - Medallas: oro, plata y bronce se guardan en el palmarés de cada jugador (p.palmares) y en el salón de la fama del club (state.salon.medallas; en carrera, también en el salón de la fama del jugador).
   Estado: state.pretemp.ventana = { id, nombre, desde, hasta, europa, n, equipos, grupos, partidos, decisiones, stats, resultado, estado }. Expone: crear, convocados, responder, dia, resumen, selfTest. Prueba: t_seleccion.js. */
(function () {
  const U = GM.util, clamp = U.clamp, PT = () => GM.mods.pretemporada;
  const rndDe = seed => { let s = (U.hash(String(seed)) >>> 0); return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const nom = (st, c) => (PT() ? PT().nombrePais(c) : c);
  // ---------- Crear la ventana: listas, grupos y calendario de grupos ----------
  function crear(st, v) {
    const todas = PT().seleccionesDe(st, v), n = v.n || 16, eq = todas.slice(0, n); if (eq.length < 8) return null;
    const yo = st.modo === 'carrera' ? st.jugadores.yo : null;
    if (yo && yo.nac) { const s2 = eq.find(x => x.pais === yo.nac); const rank = Object.values(st.jugadores).filter(j => j && j.nac === yo.nac && j.ovr > yo.ovr).length; if (s2 && rank < 12 && s2.jugadores.indexOf('yo') < 0) s2.jugadores.push('yo'); }
    const nG = Math.floor(eq.length / 4), grupos = Array.from({ length: nG }, () => []); eq.forEach((t, i) => { const r = Math.floor(i / nG); grupos[r % 2 ? nG - 1 - (i % nG) : i % nG].push(t.pais); });
    const V = { id: v.id, nombre: v.nombre, desde: v.desde, hasta: v.hasta, europa: !!v.europa, n, equipos: eq.map(t => ({ pais: t.pais, nombre: t.nombre, rating: t.rating, jugadores: t.jugadores.slice() })), grupos, partidos: [], decisiones: {}, stats: {}, resultado: null, estado: 'convocatoria', resuelta: false, seq: 0 };
    const dia = k => U.addDays(v.desde, k);
    grupos.forEach((G, gi) => { const par = [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]]; par.forEach((ronda, ri) => ronda.forEach(([a, b]) => { if (G[a] && G[b]) V.partidos.push({ id: 'sel' + (++V.seq), fecha: dia(1 + ri * 2), fase: 'Grupo ' + 'ABCDEF'[gi], a: G[a], b: G[b], resultado: null }); })); });
    return V;
  }
  const lista = (V, pais) => { const t = V.equipos.find(x => x.pais === pais); return t ? t.jugadores : []; };
  // ---------- Convocatoria ----------
  function convocados(st) {
    const p = PT().estado(st), V = p.ventana; if (!V || !V.equipos) return []; const club = st.equipos[st.clubId], mios = new Set((club ? club.plantilla : []).concat(st.modo === 'carrera' ? ['yo'] : [])), out = [];
    V.equipos.forEach(t => t.jugadores.forEach(id => { if (!mios.has(id) || !st.jugadores[id]) return; const j = st.jugadores[id], baja = !!(j.estado.lesion && j.estado.lesion.dias > 0); out.push({ id, nombre: j.nombre, pais: t.pais, paisNombre: t.nombre, ovr: j.ovr, baja, decision: baja ? 'baja' : (V.decisiones[id] || 'pendiente'), rank: t.jugadores.slice().sort((a, b) => (st.jugadores[b] ? st.jugadores[b].ovr : 0) - (st.jugadores[a] ? st.jugadores[a].ovr : 0)).indexOf(id) }); })); return out;
  }
  function responder(st, id, acepta) {
    const p = PT().estado(st), V = p.ventana; if (!V || V.estado !== 'convocatoria' || st.fecha >= V.desde) return { ok: false, motivo: 'La convocatoria ya está cerrada.' }; const c = convocados(st).find(x => x.id === id); if (!c) return { ok: false, motivo: 'No está convocado.' }; if (c.baja) return { ok: false, motivo: 'Es baja por lesión.' };
    V.decisiones[id] = acepta ? 'acepta' : 'rechaza'; const j = st.jugadores[id];
    if (!acepta) { j.estado.moral = clamp(j.estado.moral - 8, 20, 100); p.federacion = clamp((p.federacion || 50) - 10, 0, 100); if (id === 'yo' && st.carrera) { try { st.carrera.fama = Math.max(0, st.carrera.fama - 2); } catch (e) { /* fama protegida */ } } GM.noticia && GM.noticia(st, j.nombre + ' no irá con ' + nom(st, c.pais) + ': la federación se queja.'); }
    else { j.estado.moral = clamp(j.estado.moral + 3, 20, 100); p.federacion = clamp((p.federacion || 50) + 3, 0, 100); }
    return { ok: true, texto: acepta ? j.nombre + ' acepta la convocatoria.' : j.nombre + ' se queda: tendrás que aguantar las quejas.' };
  }
  const va = (V, id) => V.decisiones[id] !== 'rechaza';
  // ---------- Un partido ----------
  const fuerza = (V, pais) => V.equipos.find(t => t.pais === pais);
  function jugarPartido(st, V, m) {
    const A = fuerza(V, m.a), B = fuerza(V, m.b), rnd = rndDe(st.seed + m.id + V.id), d = A.rating - B.rating, base = 74 + rnd() * 12; let sa = Math.round(base + d * 0.55 + (rnd() - 0.5) * 22), sb = Math.round(base - d * 0.55 + (rnd() - 0.5) * 22); if (sa === sb) sa++;
    m.resultado = { a: sa, b: sb }; const mios = new Set(st.equipos[st.clubId].plantilla.concat(st.modo === 'carrera' ? ['yo'] : []));
    [[m.a, sa, sb], [m.b, sb, sa]].forEach(([pais, pf, pc]) => {
      const L = lista(V, pais).filter(id => st.jugadores[id]).slice().sort((x, y) => st.jugadores[y].ovr - st.jugadores[x].ovr);
      L.forEach((id, rank) => { if (!mios.has(id) || !va(V, id)) return; const j = st.jugadores[id]; if (j.estado.lesion && j.estado.lesion.dias > 0 && !V.stats[id]) return; const s = V.stats[id] || (V.stats[id] = { pais, pj: 0, min: 0, pts: 0, reb: 0, ast: 0, lesion: null });
        const base = rank < 5 ? 25 : rank < 9 ? 14 : 5, min = Math.max(0, Math.round(base + (rnd() - 0.5) * 8 + (Math.abs(pf - pc) >= 20 ? (rank < 5 ? -5 : 5) : 0))), ppm = 0.42 + (j.ovr - 60) / 160, at = j.att || {};
        s.pj++; s.min += min; s.pts += Math.max(0, Math.round(min * ppm * (0.7 + rnd() * 0.7))); s.reb += Math.round(min * (0.1 + ((at.reb || 55) - 50) / 400) * (0.6 + rnd() * 0.8)); s.ast += Math.round(min * (0.06 + ((at.pase || 55) - 50) / 500) * (0.6 + rnd() * 0.8));
        j.estado.fatiga = clamp((j.estado.fatiga || 0) + min * 0.18, 0, 100); if (GM.progresion) GM.progresion.sumarMinutos(j, min);
        if (rnd() < 0.006 * (min / 25) * (GM.progresion ? GM.progresion.factorLesion(st, j) : 1) && !(j.estado.lesion && j.estado.lesion.dias > 0)) { let dias = 18 + Math.floor(rnd() * 50); if (GM.progresion) dias = GM.progresion.lesionar(st, j, 'Lesión con la selección', dias, 'selección').dias; j.estado.lesion = { tipo: 'Lesión con la selección', dias }; s.lesion = dias; GM.noticia && GM.noticia(st, j.nombre + ' se lesiona con ' + nom(st, pais) + ' (' + dias + ' días).'); } });
    });
  }
  const ganadorDe = m => (m.resultado.a > m.resultado.b ? m.a : m.b), perdedorDe = m => (m.resultado.a > m.resultado.b ? m.b : m.a);
  function tablaGrupo(V, gi) {
    const G = V.grupos[gi], T = G.map(p => ({ pais: p, v: 0, d: 0, pf: 0, pc: 0 })); V.partidos.filter(m => m.fase === 'Grupo ' + 'ABCDEF'[gi] && m.resultado).forEach(m => { const x = T.find(t => t.pais === m.a), y = T.find(t => t.pais === m.b); x.pf += m.resultado.a; x.pc += m.resultado.b; y.pf += m.resultado.b; y.pc += m.resultado.a; if (m.resultado.a > m.resultado.b) { x.v++; y.d++; } else { y.v++; x.d++; } });
    return T.sort((a, b) => b.v - a.v || (b.pf - b.pc) - (a.pf - a.pc) || b.pf - a.pf);
  }
  function eliminatorias(st, V) {
    if (V.partidos.some(m => /^Grupo/.test(m.fase) && !m.resultado)) return; if (V.partidos.some(m => m.fase === 'Cuartos')) return;
    const tablas = V.grupos.map((g, i) => tablaGrupo(V, i)), pasan = []; tablas.forEach(T => { pasan.push(T[0].pais, T[1].pais); }); if (V.grupos.length === 3) { const terceros = tablas.map(T => T[2]).sort((a, b) => b.v - a.v || (b.pf - b.pc) - (a.pf - a.pc)); pasan.push(terceros[0].pais, terceros[1].pais); }
    const dia = k => U.addDays(V.desde, k); for (let i = 0; i < 4; i++) V.partidos.push({ id: 'sel' + (++V.seq), fecha: dia(8), fase: 'Cuartos', a: pasan[i], b: pasan[7 - i], resultado: null }); V.estado = 'eliminatorias';
  }
  function avanzarRonda(st, V) {
    const fase = f => V.partidos.filter(m => m.fase === f), hechas = f => fase(f).length && fase(f).every(m => m.resultado), dia = k => U.addDays(V.desde, k);
    if (hechas('Cuartos') && !fase('Semifinal').length) { const q = fase('Cuartos').map(ganadorDe); for (let i = 0; i < 2; i++) V.partidos.push({ id: 'sel' + (++V.seq), fecha: dia(10), fase: 'Semifinal', a: q[i * 2], b: q[i * 2 + 1], resultado: null }); }
    if (hechas('Semifinal') && !fase('Final').length) { const s = fase('Semifinal'); V.partidos.push({ id: 'sel' + (++V.seq), fecha: dia(12), fase: 'Tercer puesto', a: perdedorDe(s[0]), b: perdedorDe(s[1]), resultado: null }, { id: 'sel' + (++V.seq), fecha: dia(13), fase: 'Final', a: ganadorDe(s[0]), b: ganadorDe(s[1]), resultado: null }); }
  }
  // ---------- Cierre: medallas, palmarés y efectos ----------
  function cerrarTorneo(st, V) {
    const fin = V.partidos.find(m => m.fase === 'Final'), ter = V.partidos.find(m => m.fase === 'Tercer puesto'); if (!fin || !fin.resultado || !ter || !ter.resultado) return;
    const campeon = ganadorDe(fin), sub = perdedorDe(fin), tercero = ganadorDe(ter), rnd = rndDe(st.seed + 'mvp' + V.id + V.desde), cj = lista(V, campeon).slice().sort((a, b) => (st.jugadores[b] ? st.jugadores[b].ovr : 0) - (st.jugadores[a] ? st.jugadores[a].ovr : 0));
    const mvp = cj[rnd() < 0.7 ? 0 : 1] || cj[0], y = parseInt(V.desde.slice(0, 4), 10), p = PT().estado(st);
    V.resultado = { id: V.id, nombre: V.nombre, anio: y, desde: V.desde, hasta: V.hasta, campeon, subcampeon: sub, tercero, mvp, participantes: V.equipos.map(t => t.pais), convocados: [] };
    const salon = st.salon || (st.salon = { medallas: [] }), mios = new Set(st.equipos[st.clubId].plantilla.concat(st.modo === 'carrera' ? ['yo'] : []));
    V.equipos.forEach(t => t.jugadores.forEach(id => { const j = st.jugadores[id]; if (!j || !mios.has(id) || !va(V, id) || !V.stats[id]) return; const medalla = t.pais === campeon ? 'oro' : t.pais === sub ? 'plata' : t.pais === tercero ? 'bronce' : null, podio = medalla ? ({ oro: 3, plata: 2, bronce: 1 })[medalla] : 0;
      j.estado.moral = clamp(j.estado.moral + (podio ? 6 + podio * 2 : -2), 20, 100); if (podio && j.edad <= 27 && GM.rng.next() < 0.3) j.xp = (j.xp || 0) + 0.3;
      (j.palmares = j.palmares || []).push({ torneo: V.nombre, anio: y, pais: t.pais, medalla, pj: V.stats[id].pj, pts: V.stats[id].pts }); if (medalla) { salon.medallas.unshift({ jugador: j.nombre, id, torneo: V.nombre, anio: y, medalla, pais: t.pais, pts: V.stats[id].pts, pj: V.stats[id].pj }); if (id === 'yo' && st.carrera) { (st.carrera.medallas = st.carrera.medallas || []).push({ torneo: V.nombre, anio: y, medalla }); try { st.carrera.fama = Math.min(100, st.carrera.fama + 2 + podio); } catch (e) { /* protegida */ } } }
      V.resultado.convocados.push({ id, pais: t.pais, podio, medalla }); }));
    V.estado = 'terminada'; V.resuelta = true; p.seleccion = V.resultado; p.hist.unshift(V.resultado); if (p.hist.length > 12) p.hist.pop(); st.historial.push({ temporada: st.temporada, comp: V.id, campeon: 'pais:' + campeon });
    GM.noticia && GM.noticia(st, '🏆 ' + nom(st, campeon) + ' gana el ' + V.nombre + ' (final contra ' + nom(st, sub) + ').'); const med = V.resultado.convocados.filter(c => c.medalla);
    if (med.length) GM.noticia && GM.noticia(st, '🏅 Medallas para tu club: ' + med.slice(0, 4).map(c => st.jugadores[c.id].nombre + ' (' + c.medalla + ')').join(', ') + '.');
  }
  // ---------- Día a día ----------
  function dia(st) {
    const p = PT().estado(st), V = p.ventana; if (!V || !V.equipos || V.resuelta) return false;
    if (st.fecha >= V.desde && V.estado === 'convocatoria') { V.estado = 'grupos'; GM.noticia && GM.noticia(st, 'Empieza el ' + V.nombre + '.'); }
    V.partidos.filter(m => m.fecha <= st.fecha && !m.resultado).sort((a, b) => (a.fecha < b.fecha ? -1 : 1)).forEach(m => { jugarPartido(st, V, m); eliminatorias(st, V); avanzarRonda(st, V); });
    eliminatorias(st, V); avanzarRonda(st, V); V.partidos.filter(m => m.fecha <= st.fecha && !m.resultado).forEach(m => { jugarPartido(st, V, m); }); avanzarRonda(st, V); cerrarTorneo(st, V); return true;
  }
  function resumen(st) {
    const p = PT().estado(st), V = p.ventana; if (!V || !V.equipos) return null; const hoy = V.partidos.filter(m => m.fecha === st.fecha), prox = V.partidos.filter(m => !m.resultado).sort((a, b) => (a.fecha < b.fecha ? -1 : 1))[0];
    return { V, convocados: convocados(st), grupos: V.grupos.map((g, i) => tablaGrupo(V, i)), hoy, prox, stats: Object.keys(V.stats).map(id => Object.assign({ id, nombre: st.jugadores[id].nombre }, V.stats[id])).sort((a, b) => b.pts - a.pts) };
  }
  function selfTest() {
    if (!PT()) return false; const st = { seed: 5, modo: 'gestor', fecha: '2027-08-20', temporada: '2027-28', noticias: [], historial: [], clubId: 'a', equipos: { a: { plantilla: ['ES0', 'ES1', 'FR0'] } }, jugadores: {}, pretemp: { hist: [], ventana: null } };
    ['ES', 'FR', 'US', 'DE', 'IT', 'GR', 'TR', 'RS', 'LT', 'SI', 'CA', 'AU', 'HR', 'LV', 'GB', 'BR'].forEach((c, k) => { for (let i = 0; i < 10; i++) { const id = c + i; st.jugadores[id] = { id, nombre: id, nac: c, ovr: 80 - k - i, edad: 27, att: { reb: 60, pase: 60 }, estado: { moral: 70, fatiga: 0, forma: 80, lesion: null } }; } });
    const V = crear(st, { id: 'MUNDIAL', nombre: 'Mundial', desde: '2027-08-25', hasta: '2027-09-10', europa: false, n: 16 }); if (!V || V.grupos.length !== 4 || V.partidos.length !== 24) return false; st.pretemp.ventana = V;
    const c = convocados(st); if (c.length < 2 || !responder(st, 'ES0', false).ok) return false; for (let i = 0; i < 20; i++) { st.fecha = U.addDays(st.fecha, 1); dia(st); }
    return V.resuelta && !!V.resultado.campeon && V.partidos.filter(m => m.fase === 'Final').length === 1 && !!V.stats.ES1 && !V.stats.ES0 && st.jugadores.ES1.palmares.length === 1;
  }
  GM.seleccion = { crear, convocados, responder, dia, resumen, tablaGrupo, selfTest };
  GM.register && GM.register('seleccion', GM.seleccion);
})();
