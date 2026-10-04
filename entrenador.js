/* MODO ENTRENADOR (GM.mods.entrenador) — modo 'entrenador'
   Eres el entrenador de un club (lo gestiona la IA: tú pones la táctica y el vestuario). La directiva te fija un objetivo según el nivel del club y mide su
   confianza en ti: resultados, derbis, copas y decisiones. Puedes pedir fichajes (la directiva decide), contratar ayudantes, gestionar eventos de prensa y de vestuario.
   Si la confianza se hunde te despiden; si lo haces bien, llegan ofertas de clubes mejores.
   Expone: estado, objetivo, rango, pedirFichaje, candidatosFichaje, ayudantes, contratar, eventos, elegirEvento, ofertas, aceptar, selfTest.
   Escribe state.entrenador = { fase, reputacion, confianza, objetivo, ayudantes, historial, ofertas, pend, res, hitos, ultimoEvento, club }. */
(function () {
  const U = GM.util, yearOf = st => parseInt(st.temporada.slice(0, 4), 10), M = () => GM.mods.mercado, E = st => st.entrenador;
  const NOMLIGA = { NBA: 'NBA', EUROLIGA: 'Euroliga', ACB: 'Liga Endesa', LEGA: 'Lega Basket', GBL: 'Liga griega', BBL: 'Bundesliga', BSL: 'Liga turca' };
  const NIVEL = { NBA: 4, EUROLIGA: 3, ACB: 2, LEGA: 2, GBL: 2, BBL: 2, BSL: 2 };
  const AYUDANTES = {
    fisico: { etq: 'Preparador físico', desc: 'El equipo se recupera antes y se lesiona menos.', coste: 25 },
    tecnico: { etq: 'Técnico individual', desc: 'Los tres jugadores más jóvenes progresan más rápido.', coste: 30 },
    psico: { etq: 'Psicólogo deportivo', desc: 'Sube el ánimo del vestuario y ayuda tras las derrotas.', coste: 20 }
  };
  const NIVELES = ['sin contratar', 'discreto', 'bueno', 'excelente'];

  function ligaPrincipal(st, club) { return M().ligaDe(st, club); }
  function rango(st) {
    const club = st.clubId, lg = ligaPrincipal(st, club), t = st.clasificaciones[lg];
    if (!t) return null;
    const conf = lg === 'NBA' ? st.equipos[club].conferencia : null, tabla = GM.mods.competiciones.clasificacion(st, lg, conf);
    const i = tabla.findIndex(r => r.equipoId === club), pj = i >= 0 ? tabla[i].pj : 0;
    return { puesto: i + 1, de: tabla.length, pj, liga: lg, conf };
  }
  function objetivoPara(st, club) {
    const lg = ligaPrincipal(st, club), ids = st.ligas[lg].equipos, orden = ids.slice().sort((a, b) => GM.mods.partidos.ovrEquipo(st, b) - GM.mods.partidos.ovrEquipo(st, a));
    let pos = orden.indexOf(club) + 1; const n = ids.length;
    if (lg === 'NBA') pos = Math.ceil(pos / 2);
    const nn = lg === 'NBA' ? 15 : n, dep = pos / nn;
    const hasta = dep <= 0.12 ? 1 : dep <= 0.25 ? 3 : dep <= 0.5 ? Math.ceil(nn * 0.4) : dep <= 0.75 ? Math.ceil(nn * 0.6) : Math.ceil(nn * 0.8);
    const txt = hasta <= 1 ? 'Ganar la liga' : hasta <= 3 ? 'Acabar entre los tres primeros' : hasta <= Math.ceil(nn * 0.4) ? 'Meter al equipo en playoffs' : hasta <= Math.ceil(nn * 0.6) ? 'Acabar en mitad de tabla' : 'Salvar la temporada sin sobresaltos';
    return { puesto: hasta, txt, liga: lg, nn };
  }
  function nuevaPartida(st) {
    if (st.modo !== 'entrenador') return;
    const club = st.clubId, rep = st.equipos[club].reputacion;
    st.entrenador = { fase: 'activo', reputacion: U.clamp(25 + rep * 0.25, 20, 60), confianza: 60, objetivo: objetivoPara(st, club), ayudantes: { fisico: 0, tecnico: 0, psico: 0 }, historial: [], ofertas: [], pend: [], res: [], hitos: [{ fecha: st.fecha, texto: 'Te sientas por primera vez en el banquillo de ' + st.equipos[club].nombre + '.' }], ultimoEvento: st.fecha, peticiones: 3, club };
    st.equipos[club].tactica = null;
    GM.noticia(st, st.equipos[club].nombre + ' presenta a su nuevo entrenador.');
  }
  function cambiaConf(st, d, motivo) { const e = E(st); if (!e || e.fase !== 'activo') return; e.confianza = U.clamp(e.confianza + d, 0, 100); }

  // ---------- Resultados y vida del equipo ----------
  GM.bus.on('partido:jugado', function (ev) {
    const st = GM.state; if (!st || st.modo !== 'entrenador' || !st.entrenador || st.entrenador.fase !== 'activo') return;
    const g = ev.partido, club = st.clubId; if (g.local !== club && g.visitante !== club) return;
    const gano = (g.resultado.local > g.resultado.visitante) === (g.local === club), dv = GM.mods.rivalidades ? GM.mods.rivalidades.derbi(st, g.local, g.visitante) : null;
    let d = gano ? 0.9 : -1;
    if (g.fase === 'copa') d *= 2; if (g.fase === 'playoff') d *= 2.2;
    if (dv) d *= 1 + 0.5 * dv.i;
    const c = E(st), f = c.ayudantes.psico; if (!gano && f) d *= 1 - 0.1 * f;
    cambiaConf(st, d);
    if (!gano && dv) GM.noticia(st, 'La prensa se ceba tras la derrota en el ' + dv.nombre.toLowerCase() + '.');
  });
  GM.bus.on('dia:avanzado', function () {
    const st = GM.state; if (!st || st.modo !== 'entrenador' || !st.entrenador) return;
    const c = E(st); if (c.fase !== 'activo') return;
    const club = st.clubId, pl = st.equipos[club].plantilla.map(i => st.jugadores[i]).filter(Boolean);
    if (U.weekday(st.fecha) === 1) {
      if (c.ayudantes.fisico) pl.forEach(p => { p.estado.fatiga = Math.max(0, p.estado.fatiga - 3 * c.ayudantes.fisico); });
      if (c.ayudantes.tecnico) pl.slice().sort((a, b) => a.edad - b.edad).slice(0, 3).forEach(p => { p.xp = (p.xp || 0) + 0.03 * c.ayudantes.tecnico; });
      if (c.ayudantes.psico) pl.forEach(p => { p.estado.moral = Math.min(100, p.estado.moral + 0.6 * c.ayudantes.psico); });
      c.peticiones = Math.min(3, c.peticiones + 0.25);
      if (c.pend.length < 2 && U.diffDays(c.ultimoEvento, st.fecha) >= 12 && GM.rng.next() < 0.22) nuevoEvento(st);
    }
    if (st.fecha.slice(8) === '01') {
      const r = rango(st);
      if (r && r.pj >= 8) cambiaConf(st, U.clamp((c.objetivo.puesto - r.puesto) * 1.2, -5, 4));
      if (c.confianza < 12 && r && r.pj >= 15) despedir(st);
    }
  });
  function despedir(st) {
    const c = E(st), club = st.clubId;
    c.fase = 'libre'; c.reputacion = Math.max(5, c.reputacion - 8); c.confianza = 0;
    c.hitos.unshift({ fecha: st.fecha, texto: 'Te despiden de ' + st.equipos[club].nombre + '.' });
    GM.noticia(st, st.equipos[club].nombre + ' destituye a su entrenador tras una racha negativa.');
    c.ofertas = generarOfertas(st);
  }

  // ---------- Peticiones a la directiva ----------
  function candidatosFichaje(st) {
    const Mm = M(), club = st.clubId, out = [];
    Mm.libres(st).slice(0, 10).forEach(p => out.push({ id: p.id, nombre: p.nombre, pos: p.pos, edad: p.edad, ovr: p.ovr, pot: p.pot, libre: true, precio: 0, salario: Mm.salarioPedido(st, p.id, club) }));
    const caja = st.finanzas[club].caja;
    Mm.buscar(st, { minOvr: 66 }).filter(p => Mm.precioMinimo(st, p.id) <= caja * 0.35 && p.ovr >= st.equipos[club].plantilla.map(i => st.jugadores[i].ovr).sort((a, b) => b - a)[6] + 1).slice(0, 8).forEach(p => out.push({ id: p.id, nombre: p.nombre, pos: p.pos, edad: p.edad, ovr: p.ovr, pot: p.pot, libre: false, precio: Mm.precioMinimo(st, p.id), salario: p.contrato.salario, club: st.equipos[p.equipoId].siglas }));
    return out;
  }
  function pedirFichaje(st, jugId) {
    const c = E(st), Mm = M(), club = st.clubId, p = st.jugadores[jugId]; if (!p) return { ok: false, motivo: 'Jugador desconocido.' };
    if (c.peticiones < 1) return { ok: false, motivo: 'Ya has pedido demasiado. Espera unas semanas.' };
    c.peticiones -= 1;
    const prob = U.clamp(0.25 + c.confianza / 150 + (c.reputacion - 50) / 200, 0.05, 0.9);
    if (GM.rng.next() > prob) { cambiaConf(st, -1); return { ok: false, motivo: 'La directiva lo rechaza: «Ahora no es el momento, entrenador».' }; }
    const r = p.libre ? Mm.ofertar(st, jugId, { salario: Math.round(Mm.salarioPedido(st, jugId, club) * 1.05 / 10000) * 10000, anos: p.edad <= 26 ? 3 : 2 }) : Mm.comprar(st, jugId);
    if (r.ok) { cambiaConf(st, 1); c.hitos.unshift({ fecha: st.fecha, texto: 'La directiva atiende tu petición y ficha a ' + p.nombre + '.' }); }
    return r.ok ? { ok: true } : { ok: false, motivo: 'La directiva lo intenta, pero no sale: ' + (r.motivo || 'sin acuerdo') };
  }
  function contratar(st, id) {
    const c = E(st), a = AYUDANTES[id], cur = c.ayudantes[id]; if (!a) return { ok: false, motivo: 'Ayudante desconocido.' };
    if (cur >= 3) return { ok: false, motivo: 'Ya tienes al mejor.' };
    const coste = a.coste * (cur + 1), F = GM.mods.finanzas;
    if (F && st.finanzas[st.clubId].caja < coste * 1000) return { ok: false, motivo: 'La directiva no tiene presupuesto para ' + coste + ' mil euros.' };
    if (F) F.registrar(st, st.clubId, 'Fichaje de ayudante: ' + a.etq, -coste * 1000);
    c.ayudantes[id] = cur + 1; c.hitos.unshift({ fecha: st.fecha, texto: 'Incorporas a tu cuerpo técnico: ' + a.etq.toLowerCase() + ' (' + NIVELES[c.ayudantes[id]] + ').' });
    return { ok: true };
  }

  // ---------- Eventos ----------
  const EVENTOS = [
    { id: 'prensa', t: 'Rueda de prensa tras la jornada', q: 'Periodista deportivo', d: 'Te preguntan por la dirección del equipo y por las críticas de los aficionados.', ops: [
      { t: 'Respaldar a la plantilla', d: 'El vestuario te lo agradece.', ef: { moral: 2, conf: 0 } }, { t: 'Exigir más', d: 'La directiva aprueba el tono, el vestuario menos.', ef: { moral: -2, conf: 2 } }, { t: 'Cambiar de tema', d: 'Sin ruido.', ef: {} }] },
    { id: 'estrella', t: 'Una estrella pide más protagonismo', q: 'Capitán del equipo', d: 'Tu jugador más importante quiere más tiros y más minutos.', ops: [
      { t: 'Darle más protagonismo', d: 'Se calma. Los demás protestan en voz baja.', ef: { moral: 1, conf: 1, rep: 0 } }, { t: 'Mantener el plan', d: 'Dejas claro quién manda.', ef: { moral: -2, conf: 1, rep: 1 } }] },
    { id: 'presi', t: 'El presidente tiene una idea', q: 'Presidente del club', d: 'Quiere que alinees a un joven de la cantera por «motivos de cercanía con la afición».', ops: [
      { t: 'Hacerle caso', d: 'Un gesto que le gusta.', ef: { conf: 3, moral: -1 } }, { t: 'Explicar por qué no', d: 'Defiendes tus criterios.', ef: { conf: -2, rep: 2 } }] },
    { id: 'tentacion', t: 'Un club mayor pregunta por ti', q: 'Tu agente', d: 'Un club de más nivel sondea tu situación. Si sale, la directiva se enterará.', ops: [
      { t: 'Escuchar la oferta', d: 'Sube tu reputación, baja la confianza.', ef: { conf: -4, rep: 3 } }, { t: 'Decirles que no', d: 'Compromiso con el club.', ef: { conf: 3 } }] },
    { id: 'lesion', t: 'Se lesiona un titular', q: 'Servicios médicos', d: 'Tu mejor jugador estará fuera varias semanas, pero podría forzar para llegar a un partido importante.', ops: [
      { t: 'Cuidarlo', d: 'Vuelve bien, aunque tardes.', ef: { moral: 2, conf: -1 } }, { t: 'Forzar la recuperación', d: 'Puede volver antes, con riesgo.', ef: { moral: -1, conf: 1, fatiga: 25 } }] },
    { id: 'filial', t: 'Una promesa pide hueco', q: 'Director de cantera', d: 'Un juvenil de la cantera merece un puesto en la rotación.', ops: [
      { t: 'Darle minutos', d: 'Es una inversión de futuro.', ef: { conf: 1, rep: 1, xp: 0.4 } }, { t: 'Que espere un año', d: 'Prefieres jugadores hechos.', ef: {} }] },
    { id: 'derbi', t: 'Discurso antes del derbi', q: 'Capitán del equipo', d: 'El vestuario espera tus palabras antes de un partido grande.', ops: [
      { t: 'Apelar al orgullo', d: 'Sube el ánimo, sube la presión.', ef: { moral: 3, conf: 0 } }, { t: 'Pedir calma y plan', d: 'Un mensaje táctico.', ef: { moral: 1 } }] }
  ];
  function nuevoEvento(st) {
    const c = E(st), usados = new Set(c.res.slice(-3).map(r => r.id)), lista = EVENTOS.filter(e => !usados.has(e.id) && !c.pend.some(p => p.id === e.id));
    if (!lista.length) return; const e = GM.rng.pick(lista); c.pend.push({ id: e.id, fecha: st.fecha }); c.ultimoEvento = st.fecha; GM.noticia(st, 'Tienes una decisión pendiente: ' + e.t + '.');
  }
  function eventos(st) { return E(st).pend.map(p => { const e = EVENTOS.find(x => x.id === p.id); return { id: e.id, titulo: e.t, quien: e.q, texto: e.d, opciones: e.ops.map((o, i) => ({ i, t: o.t, d: o.d })) }; }); }
  function elegirEvento(st, id, i) {
    const c = E(st), idx = c.pend.findIndex(x => x.id === id), e = EVENTOS.find(x => x.id === id); if (idx < 0 || !e || !e.ops[i]) return { ok: false, motivo: 'Decisión no disponible.' };
    const ef = e.ops[i].ef, pl = st.equipos[st.clubId].plantilla.map(p => st.jugadores[p]).filter(Boolean), out = [];
    if (ef.moral) { pl.forEach(p => { p.estado.moral = U.clamp(p.estado.moral + ef.moral * 3, 20, 100); }); out.push('ánimo del vestuario ' + (ef.moral > 0 ? 'sube' : 'baja')); }
    if (ef.conf) { cambiaConf(st, ef.conf * 2); out.push('confianza ' + (ef.conf > 0 ? '+' : '') + ef.conf * 2); }
    if (ef.rep) { c.reputacion = U.clamp(c.reputacion + ef.rep, 0, 100); out.push('reputación ' + (ef.rep > 0 ? '+' : '') + ef.rep); }
    if (ef.fatiga) { const star = pl.slice().sort((a, b) => b.ovr - a.ovr)[0]; star.estado.fatiga = Math.min(100, star.estado.fatiga + ef.fatiga); }
    if (ef.xp) { const j = pl.slice().sort((a, b) => a.edad - b.edad)[0]; j.xp = (j.xp || 0) + ef.xp; out.push(j.nombre + ' progresa'); }
    c.pend.splice(idx, 1); c.res.push({ id, i, fecha: st.fecha }); if (c.res.length > 30) c.res.shift();
    return { ok: true, efectos: out };
  }

  // ---------- Fin de temporada y ofertas ----------
  GM.bus.on('temporada:fin', function () {
    const st = GM.state; if (!st || st.modo !== 'entrenador' || !st.entrenador) return;
    const c = E(st), club = st.clubId, r = rango(st); if (c.fase === 'retirado') return;
    if (c.fase === 'activo' && r) {
      const titulo = st.historial.some(h => h.temporada === st.temporada && h.campeon === club && st.ligas[h.comp]), copa = st.historial.some(h => h.temporada === st.temporada && h.campeon === club && !st.ligas[h.comp]);
      const ok = r.puesto <= c.objetivo.puesto, ex = titulo || (ok && r.puesto <= Math.max(1, Math.floor(c.objetivo.puesto / 2)));
      c.historial.push({ temporada: st.temporada, club: st.equipos[club].nombre, liga: NOMLIGA[r.liga], puesto: r.puesto, de: r.de, objetivo: c.objetivo.txt, cumplido: ok, titulo, copa });
      c.reputacion = U.clamp(c.reputacion + (titulo ? 10 : ok ? 4 : -4) + (copa ? 3 : 0), 0, 100);
      cambiaConf(st, ok ? 8 : -12);
      c.hitos.unshift({ fecha: st.fecha, texto: (titulo ? '🏆 Campeón con ' : ok ? 'Objetivo cumplido con ' : 'Objetivo fallado con ') + st.equipos[club].nombre + ' (puesto ' + r.puesto + ').' });
      GM.noticia(st, ok ? 'La directiva está satisfecha con el trabajo del entrenador.' : 'La directiva no está contenta: el objetivo no se ha cumplido.');
      if (c.confianza < 25) despedir(st); else c.ofertas = generarOfertas(st);
    }
  });
  function generarOfertas(st) {
    const c = E(st), club = st.clubId, out = []; let seq = 0;
    const mi = st.equipos[club].reputacion, lgAct = NIVEL[ligaPrincipal(st, club)];
    if (c.fase === 'activo' && c.confianza >= 45) out.push({ id: 'e' + (++seq), clubId: club, liga: ligaPrincipal(st, club), tipo: 'Renovación', anos: 2, obj: objetivoPara(st, club), nota: 'La directiva quiere que sigas.' });
    const cand = Object.keys(st.equipos).filter(id => id !== club).map(id => ({ id, lg: ligaPrincipal(st, id), rep: st.equipos[id].reputacion })).filter(k => k.rep <= c.reputacion + 30 && k.rep >= c.reputacion - 30 - (c.fase === 'libre' ? 20 : 0)).filter(k => NIVEL[k.lg] <= Math.max(lgAct, c.fase === 'libre' ? 2 : 0) + (c.reputacion >= 55 ? 1 : 0) && !(k.lg === 'NBA' && c.reputacion < 60 && lgAct < 4)).map(k => Object.assign(k, { score: k.rep * 0.6 + NIVEL[k.lg] * 6 + GM.rng.next() * 18 + (k.rep > mi ? 6 : 0) })).sort((a, b) => b.score - a.score);
    const porLiga = {}; cand.forEach(k => { if (out.length >= 5 || (porLiga[k.lg] || 0) >= 2) return; porLiga[k.lg] = (porLiga[k.lg] || 0) + 1; out.push({ id: 'e' + (++seq), clubId: k.id, liga: k.lg, tipo: k.rep > mi ? 'Ascenso' : 'Nuevo proyecto', anos: GM.rng.int(1, 3), obj: objetivoPara(st, k.id), nota: k.rep > mi ? 'Un club de más nivel, con más presión.' : 'Un proyecto a tu medida.' }); });
    return out;
  }
  function aceptar(st, id) {
    const c = E(st), o = c.ofertas.find(x => x.id === id); if (!o) return { ok: false, motivo: 'La oferta ya no está disponible.' };
    const cambia = o.clubId !== st.clubId || c.fase === 'libre';
    st.clubId = o.clubId; st.equipos[o.clubId].tactica = null; c.fase = 'activo'; c.club = o.clubId; c.objetivo = o.obj; c.confianza = 60; c.ofertas = [];
    c.hitos.unshift({ fecha: st.fecha, texto: (o.tipo === 'Renovación' ? 'Renuevas con ' : 'Firmas por ') + st.equipos[o.clubId].nombre + '.' });
    GM.noticia(st, 'Nuevo entrenador en ' + st.equipos[o.clubId].nombre + '.');
    return { ok: true, cambioClub: cambia };
  }
  function cerrar(st) {
    const c = E(st); if (!c) return;
    if (c.fase === 'libre' || !c.ofertas.length) { if (!c.ofertas.length) c.ofertas = generarOfertas(st); const o = c.ofertas.find(x => x.tipo === 'Renovación') || c.ofertas[0]; if (o) { aceptar(st, o.id); GM.noticia(st, 'La directiva te mantiene en el cargo.'); } }
    else { const o = c.ofertas.find(x => x.tipo === 'Renovación'); if (o) aceptar(st, o.id); else if (c.ofertas[0]) aceptar(st, c.ofertas[0].id); }
    c.ofertas = [];
  }
  GM.bus.on('temporada:nueva', function () { const st = GM.state; if (st && st.modo === 'entrenador' && st.entrenador && st.entrenador.fase === 'activo') st.entrenador.objetivo = objetivoPara(st, st.clubId); });
  function estado(st) { return st.modo === 'entrenador' && st.entrenador ? st.entrenador : null; }
  function selfTest() { return AYUDANTES.fisico.coste > 0 && EVENTOS.every(e => e.ops.length >= 2) && NIVELES.length === 4; }
  GM.register('entrenador', { estado, rango, objetivoPara, candidatosFichaje, pedirFichaje, contratar, eventos, elegirEvento, aceptar, cerrar, nuevaPartida, selfTest, AYUDANTES, NIVELES, NOMLIGA });
})();
