/* PRENSA CON MEMORIA (GM.mods.prensa)
   Las ruedas de prensa dejan huella. Según el momento (inicio, victoria, derrota, racha, derbi, mercado) la prensa te pregunta y tus respuestas pueden incluir una PROMESA
   (clasificarse para playoffs, ganar el título o la copa, ganar el próximo partido o el derbi, fichar una estrella, o en carrera promediar 20 puntos). Las promesas abiertas
   se recuerdan: en otra rueda un periodista te cita lo que dijiste y puedes mantenerlo, rebajarlo o esquivarlo; cada mes la hemeroteca saca un titular con tus palabras. Cuando
   la promesa se resuelve (playoffs, título, copa, partido, derbi, fichaje o fin de temporada) se cumple o se rompe: sube o baja la CREDIBILIDAD (0 a 100), la afición, el ánimo del
   vestuario y, en modo entrenador, la confianza de la directiva. Con buena credibilidad tus mensajes pesan más; con mala, la prensa duda. Las provocaciones al rival se recuerdan
   en la previa del duelo y motivan al otro vestuario.
   Expone: estado, conferencia, responder, hemeroteca, selfTest. Escribe state.prensa = { cred, mem:[promesas y frases], prov:{ rival:{fecha,frase} }, hist }. */
(function () {
  const U = GM.util, M = () => GM.mods, F = () => GM.mods.finanzas;
  const TIPOS = {
    playoffs: { etq: 'Clasificarse para los playoffs', frase: 'Nos clasificaremos para los playoffs.' }, titulo: { etq: 'Ganar el título de liga', frase: 'Vamos a ganar el título.' },
    copa: { etq: 'Ganar la copa', frase: 'Esta temporada ganaremos la copa.' }, racha1: { etq: 'Ganar el próximo partido', frase: 'Ganaremos el próximo partido.' },
    derbi: { etq: 'Ganar el derbi', frase: 'Vamos a ganar este derbi.' }, fichaje: { etq: 'Fichar a una estrella', frase: 'Vamos a fichar a una estrella.' }, media20: { etq: 'Promediar 20 puntos', frase: 'Esta temporada voy a promediar 20 puntos.' }
  };
  function estado(st) { return st.prensa || (st.prensa = { cred: 50, mem: [], prov: {}, hist: [], seq: 0 }); }
  const ligaDe = st => M().mercado.ligaDe(st, st.clubId);
  const abiertas = st => estado(st).mem.filter(m => m.estado === 'abierta');
  const hace = (st, f) => { const d = U.diffDays(f, st.fecha); return d < 14 ? 'hace ' + d + ' días' : d < 60 ? 'hace ' + Math.round(d / 7) + ' semanas' : 'hace ' + Math.round(d / 30) + ' meses'; };
  const peso = st => 0.6 + estado(st).cred / 100 * 0.8;
  function posicion(st) { const lg = ligaDe(st), t = M().competiciones.clasificacion(st, lg, lg === 'NBA' ? st.equipos[st.clubId].conferencia : null), i = t.findIndex(r => r.equipoId === st.clubId); return { puesto: i + 1, n: t.length, lg }; }
  function contexto(st) {
    const C = M().competiciones, g = C.proximoPartido(st, st.clubId), club = st.clubId, jug = (st.calendario || []).filter(x => x.resultado && (x.local === club || x.visitante === club) && x.fase !== 'amistoso').sort((a, b) => a.fecha < b.fecha ? -1 : 1);
    const gano = x => (x.local === club) === (x.resultado.local > x.resultado.visitante), ult = jug[jug.length - 1], rachaV = (() => { let n = 0; for (let i = jug.length - 1; i >= 0 && gano(jug[i]) === gano(ult || jug[0]); i--) n++; return ult ? n : 0; })();
    const riv = g ? (g.local === club ? g.visitante : g.local) : null, dv = g && riv ? M().rivalidades.derbi(st, g.local, g.visitante) : null;
    if (!ult) return { c: 'inicio', g, riv, dv };
    if (dv && U.diffDays(st.fecha, g.fecha) <= 3) return { c: 'derbi', g, riv, dv, ult };
    if (rachaV >= 3) return { c: gano(ult) ? 'racha_v' : 'racha_d', n: rachaV, g, riv, dv, ult };
    return { c: gano(ult) ? 'victoria' : 'derrota', g, riv, dv, ult };
  }
  const opc = (t, tono, ef, promesa) => ({ t, tono, ef: ef || {}, promesa: promesa || null });
  function conferencia(st) {
    const E = estado(st), ctx = contexto(st), club = st.clubId, ab = abiertas(st), pos = posicion(st), mi = st.equipos[club], carrera = st.modo === 'carrera';
    const h = U.hash(st.fecha + club + 'prensa'), memo = [];
    let pregunta, op = [], tipo = ctx.c;
    const libres = ab.length < 3, nombreRiv = ctx.riv ? st.equipos[ctx.riv].nombre : '';
    const arriba = pos.puesto <= Math.ceil(pos.n * 0.25), mitad = pos.puesto <= Math.ceil(pos.n * 0.55);
    // 1) La prensa recuerda una promesa abierta
    const pr = ab.find(m => U.diffDays(m.desde, st.fecha) >= 14 && (h % 100) < 55);
    if (pr) {
      tipo = 'memoria'; pregunta = 'Periodista: «' + hace(st, pr.desde) + ' dijo: ' + pr.frase + ' ¿Lo mantiene?»' + (E.cred < 35 ? ' (La sala se ríe por lo bajo: ya han fallado otras veces.)' : '');
      op = [opc('Lo mantengo y lo vamos a cumplir.', 'ambicioso', { aficion: 1, cred: 1, presion: true }, null), opc('Las circunstancias han cambiado. Seamos realistas.', 'humilde', { cred: -2, aficion: -1, rebaja: pr.id }), opc('Ahora toca trabajar. Mañana hablaremos.', 'evasivo', { moral: 1 })];
      memo.push(pr.frase);
    } else if (tipo === 'inicio') {
      pregunta = '¿Cuál es el objetivo del club esta temporada?' + (nombreRiv ? ' Empezáis contra ' + nombreRiv + '.' : '');
      op = [opc('Competir cada partido y crecer con la cantera.', 'humilde', { moral: 2, aficion: 2 }), libres ? opc('Ganar títulos. Este club no se conforma.', 'ambicioso', { moral: 1, aficion: 4, presion: true }, 'titulo') : opc('Ganar títulos. Este club no se conforma.', 'ambicioso', { moral: 1, aficion: 3, presion: true }), libres ? opc('Primero, los playoffs. Paso a paso.', 'humilde', { moral: 1, aficion: 2 }, 'playoffs') : opc('Paso a paso.', 'humilde', { moral: 1, aficion: 1 })];
    } else if (tipo === 'derbi') {
      pregunta = 'Se acerca el ' + ctx.dv.nombre.toLowerCase() + ' contra ' + nombreRiv + '. ¿Cómo lo afronta?';
      const rec = M().rivalidades.historia(st, club, ctx.riv).recuerdos[0]; if (rec) memo.push(rec.texto);
      op = [libres ? opc('Vamos a ganarlo. Se lo debemos a la afición.', 'ambicioso', { moral: 2, aficion: 3, presion: true }, 'derbi') : opc('Lo vamos a ganar.', 'ambicioso', { moral: 2, aficion: 2 }), opc('Respeto total, pero ellos saben lo que se juegan.', 'humilde', { moral: 1, aficion: 1 }), opc('Su club habla mucho y juega poco.', 'combativo', { moral: 3, aficion: 3, rival: ctx.riv, multa: 15000 })];
    } else if (tipo === 'racha_v') {
      pregunta = 'Lleva ' + ctx.n + ' victorias seguidas. ¿Se siente invencible?';
      op = [opc('No. Cada partido empieza a cero.', 'humilde', { moral: 2, aficion: 1, cred: 1 }), libres && !arriba ? opc('Vamos lanzados: iremos a los playoffs.', 'ambicioso', { moral: 2, aficion: 3 }, 'playoffs') : opc('Estamos en el camino, pero queda mucho.', 'humilde', { moral: 1, aficion: 1 }), libres && arriba ? opc('Este equipo puede ganar el título.', 'ambicioso', { moral: 1, aficion: 4, presion: true }, 'titulo') : opc('Disfrutamos y seguimos.', 'evasivo', { moral: 2 })];
    } else if (tipo === 'racha_d') {
      pregunta = 'Van ' + ctx.n + ' derrotas seguidas. ¿Hay crisis?';
      op = [opc('Asumo la responsabilidad. El equipo ha competido.', 'humilde', { moral: 3, aficion: -1, cred: 1 }), libres ? opc('Os prometo que ganaremos el próximo partido.', 'ambicioso', { moral: 1, aficion: 2 }, 'racha1') : opc('Daremos la cara el próximo partido.', 'ambicioso', { moral: 1, aficion: 1 }), opc('Hay jugadores que tienen que dar más.', 'combativo', { moral: -5, aficion: 2 })];
    } else if (tipo === 'victoria') {
      pregunta = '¿Qué ha cambiado en el equipo para ganar el último partido?';
      op = [opc('Mérito de los jugadores. Ellos son los protagonistas.', 'humilde', { moral: 3, aficion: 1 }), libres ? opc('Es el camino. ' + (arriba ? 'Queremos ganarlo todo.' : mitad ? 'Queremos estar en los playoffs.' : 'Vamos a por los playoffs.'), 'ambicioso', { moral: 2, aficion: 3, presion: true }, arriba ? 'titulo' : 'playoffs') : opc('Es el camino. Seguimos.', 'ambicioso', { moral: 2, aficion: 2 }), opc('Un partido no cambia nada. Humildad.', 'evasivo', { moral: 1, cred: 1 })];
    } else {
      pregunta = 'Tras la derrota, ¿qué falló?';
      op = [opc('Asumo la responsabilidad. El equipo ha competido.', 'humilde', { moral: 3, aficion: -1, cred: 1 }), opc('Hay jugadores que tienen que dar más.', 'combativo', { moral: -4, aficion: 2 }), libres ? opc('Ganaremos el próximo. Tienen mi palabra.', 'ambicioso', { moral: 1, aficion: 2 }, 'racha1') : opc('Hablaremos del arbitraje otro día.', 'combativo', { moral: 1, aficion: 2, multa: 20000 })];
    }
    // opciones propias del modo
    if (!pr && carrera && libres && !ab.some(m => m.tipo === 'media20')) op.push(opc('Quiero promediar 20 puntos esta temporada.', 'ambicioso', { aficion: 2, presion: true }, 'media20'));
    if (!pr && (st.modo === 'gestor' || st.modo === 'presidente') && libres && !ab.some(m => m.tipo === 'fichaje') && tipo !== 'derbi') op.push(opc('Vamos a reforzar el equipo con una estrella.', 'ambicioso', { aficion: 3, presion: true }, 'fichaje'));
    return { pregunta, respuestas: op.map(o => o.t), contexto: tipo, memoria: memo, _o: op, credibilidad: E.cred };
  }
  function crearPromesa(st, tipo, op) {
    const E = estado(st), lg = ligaDe(st), P = { id: 'pm' + (++E.seq), tipo, frase: TIPOS[tipo].frase, desde: st.fecha, estado: 'abierta', rebajada: false, liga: lg };
    if (tipo === 'derbi') { const g = M().competiciones.proximoPartido(st, st.clubId); P.rival = g ? (g.local === st.clubId ? g.visitante : g.local) : null; P.partido = g ? g.id : null; P.frase = 'Vamos a ganar el derbi contra ' + (P.rival ? st.equipos[P.rival].nombre : 'el rival') + '.'; }
    if (tipo === 'racha1') { const g = M().competiciones.proximoPartido(st, st.clubId); P.partido = g ? g.id : null; }
    if (tipo === 'fichaje') { const mx = Math.max.apply(null, st.equipos[st.clubId].plantilla.map(i => st.jugadores[i].ovr)); P.nivel = Math.min(90, Math.max(72, mx + 2)); P.hasta = U.addDays(st.fecha, 75); P.frase = 'Vamos a fichar a una estrella (' + P.nivel + ' de media o más).'; }
    if (tipo === 'media20') { P.objetivo = 20; P.frase = 'Esta temporada voy a promediar 20 puntos por partido.'; }
    return P;
  }
  function responder(st, i) {
    const E = estado(st), c = conferencia(st), op = c._o[i]; if (!op) return { ok: false, motivo: 'Respuesta no válida.' };
    const w = peso(st), ef = op.ef, out = [], pl = st.equipos[st.clubId].plantilla.map(id => st.jugadores[id]).filter(p => p && p.id !== 'yo');
    if (ef.moral) { const v = Math.round(ef.moral * w); pl.forEach(p => { p.estado.moral = U.clamp(p.estado.moral + v * 1.4, 20, 100); }); out.push('ánimo ' + (v > 0 ? '+' : '') + v); }
    const ci = st.ciudad && st.ciudad[st.clubId]; if (ci && ef.aficion) { const v = Math.round(ef.aficion * (ef.aficion > 0 ? w : 1) * 10) / 10; ci.aficion = U.clamp(ci.aficion + v, 0, 100); out.push('afición ' + (v > 0 ? '+' : '') + v); }
    if (ef.cred) { E.cred = U.clamp(E.cred + ef.cred, 0, 100); out.push('credibilidad ' + (ef.cred > 0 ? '+' : '') + ef.cred); }
    if (ef.multa && st.modo !== 'carrera' && F()) { F().registrar(st, st.clubId, 'Multa por declaraciones', -ef.multa); out.push('multa de ' + U.eur(ef.multa)); }
    if (ef.rebaja) { const m = E.mem.find(x => x.id === ef.rebaja); if (m) { m.rebajada = true; m.frase = m.frase + ' (después matizó que las circunstancias habían cambiado)'; } }
    if (ef.rival) { E.prov[ef.rival] = { fecha: st.fecha, frase: op.t }; out.push('el rival toma nota'); }
    if (op.promesa) { const P = crearPromesa(st, op.promesa, op); E.mem.unshift(P); out.push('promesa registrada: ' + TIPOS[op.promesa].etq.toLowerCase()); }
    E.hist.unshift({ fecha: st.fecha, ctx: c.contexto, frase: op.t, tono: op.tono }); if (E.hist.length > 60) E.hist.length = 60; if (E.mem.length > 40) E.mem.length = 40;
    if (st.modo === 'entrenador' && st.entrenador && st.entrenador.fase === 'activo' && ef.presion) st.entrenador.confianza = U.clamp(st.entrenador.confianza + 1, 0, 100);
    GM.noticia(st, 'Rueda de prensa: «' + op.t + '»');
    return { ok: true, texto: out.length ? 'Titulares del día: ' + out.join(', ') + '.' + (ef.presion ? ' La exigencia sube.' : '') : 'Pasa sin pena ni gloria.' };
  }
  // ---------- Resolver promesas ----------
  function resolver(st, m, cumple) {
    const E = estado(st); if (m.estado !== 'abierta') return; m.estado = cumple ? 'cumplida' : 'incumplida'; m.resuelta = st.fecha; const f = m.rebajada ? 0.5 : 1;
    const pl = st.equipos[st.clubId].plantilla.map(id => st.jugadores[id]).filter(p => p && p.id !== 'yo'), ci = st.ciudad && st.ciudad[st.clubId];
    E.cred = U.clamp(E.cred + (cumple ? 6 : -8) * f, 0, 100); if (ci) ci.aficion = U.clamp(ci.aficion + (cumple ? 4 : -4) * f, 0, 100);
    pl.forEach(p => { p.estado.moral = U.clamp(p.estado.moral + (cumple ? 2 : -2), 20, 100); });
    if (st.modo === 'entrenador' && st.entrenador && st.entrenador.fase === 'activo') st.entrenador.confianza = U.clamp(st.entrenador.confianza + (cumple ? 4 : -6) * f, 0, 100);
    GM.noticia(st, cumple ? '📰 Cumple su palabra: «' + m.frase + '» (' + hace(st, m.desde) + ').' : '📰 Promesa rota: «' + m.frase + '» (' + hace(st, m.desde) + '). La prensa no lo olvida.');
  }
  GM.bus.on('partido:jugado', function (e) {
    const st = GM.state; if (!st || !st.prensa) return; const g = e.partido, club = st.clubId; if (g.local !== club && g.visitante !== club) return;
    const gano = (g.local === club) === (g.resultado.local > g.resultado.visitante);
    abiertas(st).forEach(m => { if (m.tipo === 'racha1' && g.fecha >= m.desde && g.fase !== 'amistoso') resolver(st, m, gano); else if (m.tipo === 'derbi' && m.rival && (g.local === m.rival || g.visitante === m.rival) && g.fecha >= m.desde) resolver(st, m, gano); });
  });
  GM.bus.on('fichaje:hecho', function (e) { const st = GM.state; if (!st || !st.prensa || e.a !== st.clubId) return; const p = st.jugadores[e.jugadorId]; abiertas(st).forEach(m => { if (m.tipo === 'fichaje' && p && p.ovr >= m.nivel) resolver(st, m, true); }); });
  GM.bus.on('dia:avanzado', function () {
    const st = GM.state; if (!st || !st.prensa || !st.equipos[st.clubId]) return; const E = st.prensa, lg = ligaDe(st);
    abiertas(st).forEach(m => {
      if (m.tipo === 'fichaje' && m.hasta && st.fecha >= m.hasta) return resolver(st, m, false);
      if ((m.tipo === 'playoffs' || m.tipo === 'titulo') && st.pendReg && st.pendReg[lg] === 0) { const po = st.playoffs && st.playoffs[lg], pos = posicion(st); const dentro = lg === 'NBA' ? pos.puesto <= 10 : pos.puesto <= Math.ceil(pos.n * 0.5); if (m.tipo === 'playoffs') return resolver(st, m, dentro); if (!dentro) return resolver(st, m, false); if (po && po.campeon) return resolver(st, m, po.campeon === st.clubId); }
      if (m.tipo === 'titulo') { const po = st.playoffs && st.playoffs[lg]; if (po && po.campeon) resolver(st, m, po.campeon === st.clubId); }
      if (m.tipo === 'copa') { const c = Object.keys(st.copas || {}).map(k => st.copas[k]).find(x => x.liga === lg); if (c && c.estado === 'fin') resolver(st, m, c.campeon === st.clubId); }
    });
    // provocaciones: la víspera del duelo el rival responde
    const g = M().competiciones.proximoPartido(st, st.clubId);
    if (g && U.diffDays(st.fecha, g.fecha) === 1) { const riv = g.local === st.clubId ? g.visitante : g.local, pv = E.prov[riv]; if (pv && !pv.usado) { pv.usado = true; st.equipos[riv].plantilla.forEach(id => { const p = st.jugadores[id]; if (p) p.estado.moral = U.clamp(p.estado.moral + 5, 20, 100); }); GM.noticia(st, '🗞️ ' + st.equipos[riv].nombre + ' recuerda tus palabras: «' + pv.frase + '». Llegan con ganas de venganza.'); const ci = st.ciudad && st.ciudad[st.clubId]; if (ci) ci.ambiente = U.clamp(ci.ambiente + 2, 0, 100); } }
    // hemeroteca: el día 1 de cada mes sale una frase antigua
    if (st.fecha.slice(8, 10) === '01') { const vieja = E.mem.filter(m => U.diffDays(m.desde, st.fecha) >= 30).sort((a, b) => (a.rec || 0) - (b.rec || 0))[0]; if (vieja) { vieja.rec = (vieja.rec || 0) + 1; GM.noticia(st, '🗞️ Hemeroteca: ' + hace(st, vieja.desde) + ' dijo «' + vieja.frase + '»' + (vieja.estado === 'abierta' ? ' y sigue pendiente.' : vieja.estado === 'cumplida' ? ' y lo cumplió.' : ' y no lo cumplió.')); } }
  });
  GM.bus.on('temporada:fin', function () {
    const st = GM.state; if (!st || !st.prensa) return; const E = st.prensa;
    abiertas(st).forEach(m => { if (m.tipo === 'media20') { const s = (st.estadisticas || {}).yo; return resolver(st, m, !!s && s.pj >= 20 && s.pts / s.pj >= m.objetivo); } if (m.tipo === 'titulo') return resolver(st, m, st.historial.some(h => h.temporada === st.temporada && h.campeon === st.clubId && h.comp === m.liga)); if (m.tipo === 'copa') return resolver(st, m, st.historial.some(h => h.temporada === st.temporada && h.campeon === st.clubId && st.copas && st.copas[h.comp])); if (m.tipo === 'playoffs') { const pos = posicion(st); return resolver(st, m, pos.puesto > 0 && pos.puesto <= Math.ceil(pos.n * 0.5)); } resolver(st, m, false); });
    E.prov = {};
  });
  function hemeroteca(st) { return estado(st).mem.slice(0, 20); }
  function nuevaPartida(st) { st.prensa = { cred: 50, mem: [], prov: {}, hist: [], seq: 0 }; }
  function selfTest() {
    const st = { fecha: '2026-11-02', temporada: '2026-27', clubId: 'a', modo: 'gestor', noticias: [], equipos: { a: { plantilla: [] } }, jugadores: {}, ciudad: { a: { aficion: 50, ambiente: 50 } }, prensa: { cred: 50, mem: [], prov: {}, hist: [], seq: 0 } };
    const P = { id: 'p1', tipo: 'racha1', frase: 'Ganaremos', desde: '2026-10-20', estado: 'abierta', rebajada: false }; st.prensa.mem.push(P);
    resolver(st, P, true); const c1 = st.prensa.cred; const Q = { id: 'p2', tipo: 'titulo', frase: 'Ganaremos el título', desde: '2026-10-20', estado: 'abierta', rebajada: true }; st.prensa.mem.push(Q); resolver(st, Q, false);
    return c1 === 56 && st.prensa.cred === 52 && P.estado === 'cumplida' && Q.estado === 'incumplida' && st.ciudad.a.aficion === 50 + 4 - 2 && hace(st, '2026-10-10') === 'hace 3 semanas' && Object.keys(TIPOS).length === 7;
  }
  GM.register('prensa', { estado, conferencia, responder, hemeroteca, abiertas, nuevaPartida, selfTest, TIPOS });
})();
