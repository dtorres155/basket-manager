/* CARRERA DE JUGADOR (GM.mods.carrera) — modo 'carrera'
   Tú eres un jugador (id 'yo') dentro del mundo simulado. Orígenes: cantera europea, universidad de EE. UU. (camino al draft NBA) o liga europea modesta.
   El club lo lleva la IA. Tú decides: entrenamiento personal, representante, ofertas (renovar, cambiar de club o de liga, draft NBA, contrato de dos vías,
   fichaje NBA), eventos personales y cuándo retirarte.
   Expone: estado, stats, rol, ofertas, aceptar, entrenar, declararse, mock, eventos, elegirEvento, retirarse, retrato, selfTest.
   Escribe state.carrera = { fase:'ncaa'|'pro'|'libre'|'retirado', origen, curso, declarado, agente, entreno, dinero, fama, moral, historial, hitos, ofertas, pend, res, mejor }. */
(function () {
  const U = GM.util, yearOf = st => parseInt(st.temporada.slice(0, 4), 10);
  const C = st => st.carrera, YO = st => st.jugadores.yo, M = () => GM.mods.mercado;
  const MIN = { NBA: 70, EUROLIGA: 68, ACB: 60, LEGA: 58, GBL: 58, BBL: 59, BSL: 60 };
  const NIVEL = { NBA: 4, EUROLIGA: 3, ACB: 2, LEGA: 2, GBL: 2, BBL: 2, BSL: 2 };
  const NOMLIGA = { NBA: 'NBA', EUROLIGA: 'Euroliga', ACB: 'Liga Endesa', LEGA: 'Lega Basket', GBL: 'Liga griega', BBL: 'Bundesliga', BSL: 'Liga turca' };
  const FOCOS = { tiro: ['tiro3', 'tiro2', 'tl'], defensa: ['defInt', 'defPer', 'iq'], fisico: ['fisico', 'reb'], pase: ['pase', 'bote', 'iq'], mente: ['iq', 'tl', 'pase'] };
  const INTENS = { suave: 0.6, normal: 1, intensa: 1.5 };
  const AGENTES = {
    dinero: { etq: 'Cazador de contratos', desc: 'Consigue más dinero, aunque te vende al mejor postor.', sal: 1.12 },
    prestigio: { etq: 'Estratega', desc: 'Busca ligas y clubes de más nivel aunque pague menos.', sal: 0.97, nivel: 1 },
    leal: { etq: 'De confianza', desc: 'Prioriza renovar y la estabilidad en tu club.', sal: 1.0, ren: 1.1 },
    equilibrado: { etq: 'Equilibrado', desc: 'Un poco de todo y sin sorpresas.', sal: 1.03 }
  };
  // dinero: ahorros iniciales en miles de euros (un cadete de 14 años no tiene casi nada)
  const ORIGENES = {
    cadete: { dinero: 1, etq: 'Cadete en una cantera', desc: 'Empiezas con 14 años en la cantera de un club. Jugarás en cadete, junior y filial; a los 18 llegan las decisiones: contrato profesional, universidad en EE. UU. o un año más de filial.', edad: 14, ovr: 42, pot: 84 },
    cantera: { dinero: 4, etq: 'Cantera europea', desc: 'Empiezas con 18 años en la cantera de un club profesional. Poco nivel hoy, mucho margen.', edad: 18, ovr: 58, pot: 82 },
    ncaa: { dinero: 3, etq: 'Universidad de EE. UU.', desc: 'Juegas en la NCAA y aspiras al draft de la NBA. Si no te eligen, tendrás que abrirte camino en Europa.', edad: 19, ovr: 64, pot: 86 },
    europa: { dinero: 15, etq: 'Liga europea modesta', desc: 'Empiezas con 20 años en un club de ACB o Lega. Más minutos, menos techo.', edad: 20, ovr: 64, pot: 78 }
  };
  const PERFIL = { tirador: 'T', defensor: 'D', interior: 'R', creador: 'P', atleta: 'E' };
  // Reputación: 9 grados. Cuesta ganarla (más cuanto más alta) y depende del nivel de la liga donde juegas.
  const GRADOS = [{ u: 0, n: 'Desconocido' }, { u: 8, n: 'Promesa' }, { u: 18, n: 'Talento emergente' }, { u: 30, n: 'Profesional consolidado' }, { u: 44, n: 'Referente de la liga' }, { u: 58, n: 'Estrella continental' }, { u: 72, n: 'Estrella mundial' }, { u: 86, n: 'Icono' }, { u: 96, n: 'Leyenda' }];
  // Estatus dentro de cada club: de recién llegado a leyenda del club.
  const ESTATUS = [{ u: 0, n: 'Recién llegado' }, { u: 6, n: 'Promesa' }, { u: 20, n: 'Jugador de rotación' }, { u: 38, n: 'Titular' }, { u: 60, n: 'Referente' }, { u: 84, n: 'Ídolo' }, { u: 110, n: 'Leyenda del club' }];
  const TIER = { NBA: 4, EUROLIGA: 3, ACB: 2, LEGA: 2, GBL: 2, BBL: 2, BSL: 2 };
  const FACTOR_TIER = { NBA: 1.3, EUROLIGA: 1, ACB: 0.8, LEGA: 0.8, GBL: 0.75, BBL: 0.75, BSL: 0.75 };
  function instalaFama(c) {
    const v = typeof c.fama === 'number' ? c.fama : (c._f || 0);
    Object.defineProperty(c, '_f', { value: v, writable: true, enumerable: false, configurable: true });
    Object.defineProperty(c, 'fama', { enumerable: true, configurable: true, get() { return this._f; }, set(x) {
      let d = x - this._f;
      if (d > 0) d *= 0.55 * (1 - this._f / 130) * (this._tier || 0.7);
      this._f = U.clamp(this._f + d, 0, 100);
    } });
  }
  const grado = f => { let i = 0; GRADOS.forEach((g, k) => { if (f >= g.u) i = k; }); return i; };
  function gradoFama(c) { const i = grado(c.fama), s = GRADOS[i + 1]; return { idx: i, nombre: GRADOS[i].n, sig: s ? s.n : null, frac: s ? (c.fama - GRADOS[i].u) / (s.u - GRADOS[i].u) : 1 }; }
  function nuevoEstatus(pts) { let i = 0; ESTATUS.forEach((g, k) => { if (pts >= g.u) i = k; }); return i; }
  function estatusClub(st) {
    const c = C(st), p = YO(st), id = p && p.equipoId; if (!id || !c.clubes || !c.clubes[id]) return null;
    const e = c.clubes[id], i = nuevoEstatus(e.pts), s = ESTATUS[i + 1];
    return { clubId: id, idx: i, nombre: ESTATUS[i].n, pts: e.pts, sig: s ? s.n : null, frac: s ? (e.pts - ESTATUS[i].u) / (s.u - ESTATUS[i].u) : 1, temps: e.temps, traidor: false };
  }
  function actualizaTier(st) { const c = C(st), lg = liga(st); c.tier = lg ? FACTOR_TIER[lg] : 0.55; c._tier = c.tier; }

  function nuevaPartida(st) {
    if (st.modo !== 'carrera') return;
    const o = st.opciones.carrera, pj = st.personaje || {};
    const nombre = ((pj.nombre || '') + ' ' + (pj.apellido || '')).trim() || 'Jugador Nuevo', base = ORIGENES[o.origen], cadete = o.origen === 'cadete', club = o.origen === 'ncaa' || cadete ? null : o.clubId;
    let ovr = base.ovr, pot = base.pot;
    if (cadete) { const rep = st.equipos[o.clubId].reputacion; pot += rep >= 85 ? 2 : 0; }
    if (club) { const rep = st.equipos[club].reputacion; if (rep >= 85) { ovr -= 2; pot += 2; } else if (rep < 55) ovr += 3; }
    const h = U.hash(nombre + o.pos), nac = o.nac || 'ES';
    const p = GM.mkJugador(club || 'ncaa', 999, nombre, o.pos, base.edad, o.altura || GM.alturaPos(o.pos, h), nac, GM.pasaporte(nac), ovr, pot, PERFIL[o.perfil] || 'E', club ? (o.origen === 'cantera' ? 60000 : 250000) : 0, club ? 2028 : 0);
    if (cadete) p.equipoId = null;
    p.id = 'yo'; p.esYo = true; p.ficticio = false; p.equipoId = club; p.libre = false; p.juvenil = false;
    st.jugadores.yo = p;
    if (club) { const eq = st.equipos[club]; if (eq.plantilla.length >= 15) quitarPeor(st, club); eq.plantilla.push('yo'); eq.tactica = null; st.clubId = club; }
    st.carrera = { fase: club ? 'pro' : 'ncaa', origen: o.origen, curso: 1, declarado: false, agente: { perfil: o.agente || 'equilibrado', nombre: GM.nombreAleatorio(nac === 'US' ? 'US' : 'ES', U.hash('ag' + nombre)) }, entreno: { foco: o.perfil === 'defensor' ? 'defensa' : o.perfil === 'tirador' ? 'tiro' : o.perfil === 'creador' ? 'pase' : 'fisico', intensidad: 'normal' }, dinero: base.dinero, fama: 20, moral: 60, historial: [], hitos: [], ofertas: [], pend: [], res: [], mejor: null, ultimoEvento: st.fecha, ncaa: { pts: 0 }, fichado: club, vivienda: { actual: null, propiedades: [], coche: null, fundacion: null } };
    if (cadete) { st.carrera.etapa = 'cantera'; st.carrera.cantera = { clubId: o.clubId }; st.clubId = o.clubId; } else if (!club) st.carrera.etapa = 'universidad';
    st.carrera.clubes = {}; if (club) st.carrera.clubes[club] = { desde: st.fecha, temps: 0, pts: 0 };
    instalaFama(st.carrera); actualizaTier(st);
    st.carrera.hitos.unshift({ fecha: st.fecha, texto: club ? 'Empiezas tu carrera en ' + st.equipos[club].nombre + '.' : cadete ? 'Entras en la cantera de ' + st.equipos[o.clubId].nombre + ' con 14 años.' : 'Empiezas tu etapa universitaria con la mirada puesta en el draft.' });
    GM.noticia(st, club ? 'Nace una promesa: ' + nombre + ' debuta en ' + st.equipos[club].nombre + '.' : cadete ? nombre + ' empieza en la cantera de ' + st.equipos[o.clubId].nombre + '.' : nombre + ' empieza la temporada universitaria.');
  }
  function quitarPeor(st, clubId) {
    const eq = st.equipos[clubId], peor = eq.plantilla.map(i => st.jugadores[i]).filter(x => x && !x.esYo).sort((a, b) => a.ovr - b.ovr)[0];
    if (peor) M().sacar(st, peor);
  }

  // ---------- Estado derivado ----------
  function stats(st) { const s = st.estadisticas.yo; if (!s || !s.pj) return { pj: 0, min: 0, pts: 0, reb: 0, ast: 0 }; return { pj: s.pj, min: s.min / s.pj, pts: s.pts / s.pj, reb: s.reb / s.pj, ast: s.ast / s.pj }; }
  function rol(st) {
    const p = YO(st); if (!p || !p.equipoId || C(st).fase === 'ncaa') return null;
    const r = st.equipos[p.equipoId].plantilla.map(i => st.jugadores[i]).filter(Boolean).sort((a, b) => b.ovr - a.ovr), i = r.findIndex(x => x.id === 'yo');
    return i < 5 ? 'Titular' : i < 9 ? 'Rotación' : i < 12 ? 'Banquillo' : 'Fuera de la rotación';
  }
  const liga = (st) => { const p = YO(st); return p && p.equipoId ? M().ligaDe(st, p.equipoId) : null; };
  const categoria = e => e <= 15 ? 'Cadete' : e <= 17 ? 'Junior' : 'Filial';
  function estado(st) { return st.modo === 'carrera' && st.carrera ? st.carrera : null; }
  function retrato(st) { const c = C(st), p = YO(st); return { nombre: p.nombre, edad: p.edad, ovr: p.ovr, pot: p.pot, pos: p.pos, club: p.equipoId ? st.equipos[p.equipoId].nombre : c.etapa === 'cantera' ? 'Cantera de ' + st.equipos[c.cantera.clubId].nombre : 'Universidad', liga: liga(st) ? NOMLIGA[liga(st)] : c.fase === 'ncaa' ? (c.etapa === 'cantera' ? categoria(p.edad) : 'NCAA') : 'Agente libre', agente: c.agente.nombre }; }

  // ---------- Entrenamiento y vida diaria ----------
  // ---------- Potencial dinámico ----------
  // Lo que haces mueve tu techo hasta ±15 sobre el de partida (con 99 como máximo), hasta los 27 años: con las decisiones
  // correctas cualquier origen puede acabar siendo el mejor jugador del juego, y con las malas te quedas muy por debajo. Los cambios se acumulan en fracciones
  // (c.potencial.resto) y el potencial sube o baja de punto en punto. El mes se resume en c.potencial.historial con sus motivos.
  const POT_MAX = 15, POT_EDAD = 27;
  function potEstado(st) { const c = C(st); if (!c.potencial) c.potencial = { ajuste: 0, resto: 0, mes: {}, historial: [] }; return c.potencial; }
  function ajustarPot(st, delta, motivo) {
    const c = C(st), p = YO(st); if (!p || !delta || c.fase === 'retirado' || p.edad > POT_EDAD) return 0;
    const P = potEstado(st), d = U.clamp(delta, -POT_MAX - P.ajuste - P.resto, POT_MAX - P.ajuste - P.resto); if (!d) return 0;
    P.resto += d; P.mes[motivo] = (P.mes[motivo] || 0) + d;
    const antes = p.pot;
    while (P.resto >= 1) { P.resto -= 1; if (p.pot < 99) { p.pot++; P.ajuste++; } }
    while (P.resto <= -1) { P.resto += 1; if (p.pot > p.ovr) { p.pot--; P.ajuste--; } }
    if (p.pot !== antes) { const t = (p.pot > antes ? 'Tu potencial sube a ' : 'Tu potencial baja a ') + p.pot + ' (' + motivo.toLowerCase() + ').'; GM.noticia(st, t); c.hitos.unshift({ fecha: st.fecha, texto: t }); }
    return d;
  }
  function potSemana(st) {
    const c = C(st), p = YO(st), P = potEstado(st), e = c.entreno, joven = p.edad <= 23;
    if (e.intensidad === 'intensa' && !p.estado.lesion) ajustarPot(st, 0.01, 'Entrenas a tope');
    if (e.intensidad === 'suave' && joven) ajustarPot(st, -0.012, 'Entrenas con el freno puesto');
    P.foco = P.foco === e.foco ? P.foco : (P.semanas = 0, e.foco); P.semanas = (P.semanas || 0) + 1;
    if (P.semanas >= 4) ajustarPot(st, 0.006, 'Constancia en el entrenamiento');
    if (c.moral >= 70) ajustarPot(st, 0.004, 'Buen ánimo');
    else if (c.moral < 30) ajustarPot(st, -0.006, 'Ánimo por los suelos');
    if (p.estado.fatiga > 85) ajustarPot(st, -0.005, 'Juegas reventado de cansancio');
    const men = c.social && c.social.contactos && c.social.contactos.find(k => k.tipo === 'mentor');
    if (men && men.rel >= 70) ajustarPot(st, 0.008, 'Lo que aprendes de tu mentor');
    // Calidad de la temporada (0 a 1): decide cuánto subes de nivel al acabarla (progresoAnual)
    const r = rol(st);
    let q = { intensa: 0.3, normal: 0.2, suave: 0.05 }[e.intensidad] || 0.2;
    if (P.semanas >= 4) q += 0.1;
    q += U.clamp((c.moral - 30) / 50, 0, 1) * 0.2;
    q += c.fase === 'ncaa' ? 0.22 : r === 'Titular' ? 0.3 : r === 'Rotación' ? 0.2 : r === 'Banquillo' ? 0.08 : 0;
    if (men && men.rel >= 70) q += 0.1;
    if (p.estado.fatiga > 85 || p.estado.lesion) q -= 0.15;
    const T = c.temp || (c.temp = { q: 0, n: 0 }); T.q += U.clamp(q, 0, 1); T.n++;
  }
  // Nivel que ganas (o pierdes) al acabar la temporada; p.edad ya es la nueva. cantera.js lo limita por tu potencial.
  function progresoAnual(st, p) {
    const c = C(st); if (!c) return 0;
    const T = c.temp || { q: 0, n: 0 }, q = T.n ? T.q / T.n : 0.5; c.temp = { q: 0, n: 0 }; c.calidad = Math.round(q * 100);
    const base = p.edad <= 18 ? 4 : p.edad <= 21 ? 3.5 : p.edad <= 24 ? 2.5 : p.edad <= 27 ? 1 : p.edad <= 30 ? 0 : p.edad <= 33 ? -1.5 : -3;
    const d = base >= 0 ? base * (0.2 + 1.3 * q) : base * (1.5 - q);   // temporada perfecta x1,5; desastrosa x0,2
    return Math.round(d + GM.rng.next() - 0.5);
  }
  function potMes(st) {
    const c = C(st), p = YO(st), P = potEstado(st);
    if (p.edad <= 22) {
      const r = rol(st);
      if (c.fase === 'ncaa') ajustarPot(st, c.etapa === 'cantera' ? 0.015 : 0.025, c.etapa === 'cantera' ? 'Juegas en tu categoría' : 'Minutos en la universidad');
      else if (r === 'Titular') ajustarPot(st, 0.08, 'Minutos de titular siendo joven');
      else if (r === 'Rotación') ajustarPot(st, 0.04, 'Minutos en la rotación');
      else if (r === 'Banquillo') ajustarPot(st, -0.03, 'Pocos minutos');
      else if (r) ajustarPot(st, -0.06, 'Sin jugar');
      const s = stats(st), lg = liga(st);
      if (r === 'Titular' && (lg === 'NBA' || lg === 'EUROLIGA')) ajustarPot(st, 0.03, 'Titular joven en la élite');
      if (s.pj >= 5 && s.pts >= 15) ajustarPot(st, 0.03, 'Rindes como una estrella');
    }
    const ks = Object.keys(P.mes), tot = ks.reduce((s, k) => s + P.mes[k], 0);
    if (ks.length) {
      const mot = ks.sort((a, b) => Math.abs(P.mes[b]) - Math.abs(P.mes[a])).slice(0, 4).map(k => ({ t: k, v: Math.round(P.mes[k] * 100) / 100 }));
      P.historial.unshift({ fecha: st.fecha, delta: Math.round(tot * 100) / 100, pot: p.pot, motivos: mot }); if (P.historial.length > 12) P.historial.length = 12;
    }
    P.mes = {};
  }
  function potLesion(st) {
    const p = YO(st), l = p && p.estado.lesion; if (!l || l.contada) return;
    l.contada = true; if (l.dias >= 30) ajustarPot(st, -0.8, 'Lesión grave'); else if (l.dias >= 10) ajustarPot(st, -0.2, 'Lesión');
  }
  function entrenar(st) {
    const c = C(st), p = YO(st); if (!p || c.fase === 'retirado') return;
    potSemana(st);
    const g = p.edad <= 21 ? 0.025 : p.edad <= 24 ? 0.018 : p.edad <= 28 ? 0.008 : p.edad <= 31 ? 0 : -0.02, f = INTENS[c.entreno.intensidad] || 1;
    const mod = 1 + (c.moral - 50) / 250;
    p.xp = (p.xp || 0) + g * f * mod * (0.7 + 0.6 * GM.rng.next());
    const keys = FOCOS[c.entreno.foco] || FOCOS.mente;
    if (p.xp >= 1 && p.ovr < Math.max(p.pot, p.ovr)) {
      p.xp = 0; p.ovr = Math.min(99, p.ovr + 1);
      for (let i = 0; i < 3; i++) { const k = keys[GM.rng.int(0, keys.length - 1)]; p.att[k] = Math.min(99, p.att[k] + 1); }
      c.hitos.unshift({ fecha: st.fecha, texto: 'Subes a ' + p.ovr + ' de nivel.' }); if (c.hitos.length > 40) c.hitos.length = 40;
      GM.noticia(st, 'Progresas: ahora eres un ' + p.ovr + ' de nivel.');
    } else if (p.xp >= 1) p.xp = 0.5;
    if (c.entreno.intensidad === 'intensa' && !p.estado.lesion && GM.rng.next() < (c.prevencion ? 0.004 : 0.012)) { p.estado.lesion = { tipo: 'Sobrecarga', dias: GM.rng.int(10, 24) }; GM.noticia(st, 'Te lesionas por sobrecarga: ' + p.estado.lesion.dias + ' días de baja.'); }
  }
  function declararse(st) {
    const c = C(st); if (!elegibleDraft(st)) return { ok: false, motivo: 'Puedes presentarte al draft con 19 a 22 años, desde la universidad o desde un club europeo.' };
    c.declarado = !c.declarado; c.hitos.unshift({ fecha: st.fecha, texto: c.declarado ? 'Te declaras elegible para el draft de la NBA.' : 'Decides seguir otro año en la universidad.' });
    return { ok: true, declarado: c.declarado };
  }
  GM.bus.on('partido:jugado', function (e) {
    const st = GM.state; if (!st || st.modo !== 'carrera' || !st.carrera) return;
    const s = e.partido.resultado.stats && e.partido.resultado.stats.yo; if (!s || !s.min) return;
    const c = C(st);
    if (!c.mejor || s.pts > c.mejor.pts) { c.mejor = { pts: s.pts, reb: s.reb, ast: s.ast, fecha: e.partido.fecha, rival: e.partido.local === YO(st).equipoId ? e.partido.visitante : e.partido.local }; if (s.pts >= 20) c.hitos.unshift({ fecha: e.partido.fecha, texto: 'Partidazo: ' + s.pts + ' puntos.' }); }
  });
  GM.bus.on('dia:avanzado', function () {
    const st = GM.state; if (!st || st.modo !== 'carrera' || !st.carrera) return;
    const c = C(st), p = YO(st); if (c.fase === 'retirado') return;
    potLesion(st);
    if (U.weekday(st.fecha) === 1) {
      entrenar(st);
      if (c.pend.length < 2 && U.diffDays(c.ultimoEvento, st.fecha) >= 10 && GM.rng.next() < 0.22) nuevoEvento(st);
    }
    if (st.fecha.slice(5) === '04-15') avisoDraft(st);
    if (st.fecha.slice(8) === '01') {
      potMes(st);
      if (p.contrato && p.contrato.salario) c.dinero += Math.round(p.contrato.salario * 0.58 / 12 / 1000);
      efectosVivienda(st); ingresosVivienda(st);
      const r = rol(st), objetivo = r === 'Titular' ? 75 : r === 'Rotación' ? 60 : r === 'Banquillo' ? 44 : c.fase === 'ncaa' ? 62 : 32;
      c.moral = U.clamp(c.moral + (objetivo - c.moral) * 0.2, 0, 100);
      const s = stats(st), rend = U.clamp(s.pts * 3 + (liga(st) ? NIVEL[liga(st)] * 5 : 8), 0, 100);
      actualizaTier(st); if (rend > c.fama) c.fama = c.fama + (rend - c.fama) * 0.05; else c.fama = c.fama + (rend - c.fama) * 0.01;
    }
  });

  // ---------- Draft ----------
  function mock(st) {
    const p = YO(st), clase = M().claseDraft(st), sc = x => x.pot * 0.6 + x.ovr * 0.4, mio = sc(p);
    const mejores = clase.filter(x => sc(x) > mio).length;
    return { pick: Math.min(61, mejores + 1), top: clase.slice(0, 8).map(x => ({ nombre: x.nombre, ovr: x.ovr, pot: x.pot, pos: x.pos })), proyeccion: mejores < 3 ? 'Top 3: la gran promesa del draft' : mejores < 14 ? 'Lotería' : mejores < 30 ? 'Primera ronda' : mejores < 60 ? 'Segunda ronda' : 'Sin elegir: aún no tienes nivel' };
  }
  // Elegible con 19 a 22 años desde la universidad o desde un club europeo (no desde la NBA ni desde cadete o junior).
  // El 15 de abril llega el aviso con la proyección y decides si te presentas (evento 'draft').
  function elegibleDraft(st) {
    const c = C(st), p = YO(st); if (!c || !p || c.fase === 'retirado' || c.draftPick || p.edad < 19 || p.edad > 22) return false;
    if (c.fase === 'ncaa') return c.etapa !== 'cantera';
    return c.fase === 'pro' && !!p.equipoId && liga(st) !== 'NBA';
  }
  function avisoDraft(st) {
    const c = C(st); if (!elegibleDraft(st) || c.declarado || c.pend.some(x => x.id === 'draft') || (c.fase === 'ncaa' && c.curso >= 3)) return;
    c.pend.unshift({ id: 'draft', fecha: st.fecha });
    const mk = mock(st);
    GM.noticia(st, 'Se abre el plazo del draft de la NBA. Tu proyección: ' + mk.proyeccion.toLowerCase() + (mk.pick <= 60 ? ' (puesto ' + mk.pick + ')' : '') + '. ¿Te presentas?');
  }
  function preDraft(st) {
    if (st.modo !== 'carrera' || !st.carrera) return null;
    const c = C(st); c.pend = c.pend.filter(x => x.id !== 'draft');
    if (!elegibleDraft(st)) { c.declarado = false; return null; }
    if (c.fase === 'ncaa') c._fueNcaa = true;
    if (c.declarado || (c.fase === 'ncaa' && c.curso >= 3)) { c._enDraft = true; c._clubAntes = c.fase === 'pro' ? YO(st).equipoId : null; return YO(st); }
    return null;
  }
  function postDraft(st, picks) {
    const c = st.carrera; if (!c || !c._enDraft) return;
    c._enDraft = false;
    const k = picks.find(x => x.jugadorId === 'yo'), p = YO(st), antes = c._clubAntes; c._clubAntes = null;
    if (k && antes && st.equipos[antes]) st.equipos[antes].plantilla = st.equipos[antes].plantilla.filter(i => i !== 'yo');
    if (!k && antes) {
      c.declarado = false; p.equipoId = antes;
      c.hitos.unshift({ fecha: st.fecha, texto: 'No te eligen en el draft. Sigues en ' + st.equipos[antes].nombre + ' y podrás intentarlo otra vez.' });
      GM.noticia(st, p.nombre + ' no es elegido en el draft de la NBA y sigue en ' + st.equipos[antes].nombre + '.'); return;
    }
    if (k) {
      c.fase = 'pro'; c.fichado = k.equipoId; st.clubId = k.equipoId; c.declarado = false; st.equipos[k.equipoId].tactica = null;
      c.hitos.unshift({ fecha: st.fecha, texto: 'Eliges en el draft de la NBA: nº ' + k.n + ' para ' + st.equipos[k.equipoId].nombre + '.' });
      c.draftPick = k.n; c.fama = Math.min(100, c.fama + (k.n <= 3 ? 32 : k.n <= 14 ? 25 : k.n <= 30 ? 16 : 10));
      GM.noticia(st, '¡Draft de la NBA! ' + p.nombre + ' es elegido en el puesto ' + k.n + ' por ' + st.equipos[k.equipoId].nombre + '.');
    } else {
      c.fase = 'libre'; c.declarado = false; p.equipoId = null; p.libre = true; p.contrato = { salario: 0, hasta: 0 };
      c.hitos.unshift({ fecha: st.fecha, texto: 'No te eligen en el draft. Tocará buscar tu camino en el mercado.' });
      GM.noticia(st, p.nombre + ' no es elegido en el draft de la NBA.');
    }
  }

  // ---------- Cierre de temporada ----------
  function preCierre(st) {
    if (st.modo !== 'carrera' || !st.carrera) return;
    const c = C(st), p = YO(st); if (c.fase === 'retirado') return;
    const y = st.temporada;
    if (c.fase === 'ncaa') {
      const pts = Math.round((4 + (p.ovr - 50) * 0.55 + GM.rng.next() * 2) * 10) / 10, reb = Math.round((2 + (p.ovr - 50) * 0.18) * 10) / 10, ast = Math.round((1 + (p.ovr - 50) * 0.12) * 10) / 10, w = GM.rng.int(16, 31);
      if (c.etapa === 'cantera') { const k = (p.ovr - 38) * 0.4; c.historial.push({ temporada: y, club: 'Cantera de ' + st.equipos[c.cantera.clubId].nombre, liga: categoria(p.edad), pj: 24, pts: Math.round((3 + k * 0.5 + GM.rng.next()) * 10) / 10, reb: Math.round((1.5 + k * 0.2) * 10) / 10, ast: Math.round((1 + k * 0.12) * 10) / 10, titulo: GM.rng.next() < 0.12, nota: w + '-' + (28 - w) }); }
      else c.historial.push({ temporada: y, club: 'Universidad de EE. UU.', liga: 'NCAA', pj: 32, pts, reb, ast, titulo: false, nota: w + '-' + (34 - w) });
      c.fama = U.clamp(c.fama + (pts - 8) * 0.8, 0, 100);
    } else {
      const s = stats(st), titulo = st.historial.some(h => h.temporada === y && h.campeon === p.equipoId);
      c.historial.push({ temporada: y, club: p.equipoId ? st.equipos[p.equipoId].nombre : '—', liga: liga(st) ? NOMLIGA[liga(st)] : '—', pj: st.estadisticas.yo ? st.estadisticas.yo.pj : 0, pts: Math.round(s.pts * 10) / 10, reb: Math.round(s.reb * 10) / 10, ast: Math.round(s.ast * 10) / 10, titulo, nota: '' });
      { const e = c.clubes[p.equipoId] || (c.clubes[p.equipoId] = { desde: st.fecha, temps: 0, pts: 0 }), r0 = rol(st), antes = nuevoEstatus(e.pts);
        e.temps++; e.pts += (r0 === 'Titular' ? 11 : r0 === 'Rotación' ? 6 : r0 === 'Banquillo' ? 2 : 0) + 3 + (s.pts >= 15 ? 5 : s.pts >= 10 ? 2 : 0) + (titulo ? 16 : 0);
        const ahora = nuevoEstatus(e.pts); if (ahora > antes) { c.hitos.unshift({ fecha: st.fecha, texto: 'En ' + st.equipos[p.equipoId].nombre + ' ya eres «' + ESTATUS[ahora].n.toLowerCase() + '».' }); GM.noticia(st, p.nombre + ' se gana el estatus de ' + ESTATUS[ahora].n.toLowerCase() + ' en ' + st.equipos[p.equipoId].nombre + '.'); if (ahora === 6) { c.hitos.unshift({ fecha: st.fecha, texto: 'El club retira tu dorsal: eres una leyenda.' }); c.fama = c.fama + 6; } } }
      if (titulo) { c.hitos.unshift({ fecha: st.fecha, texto: '🏆 Campeón con ' + st.equipos[p.equipoId].nombre + '.' }); c.fama = Math.min(100, c.fama + 12); GM.noticia(st, '¡Eres campeón!'); }
    }
  }
  GM.bus.on('temporada:fin', function () {
    const st = GM.state; if (!st || st.modo !== 'carrera' || !st.carrera) return;
    const c = C(st), p = YO(st); if (c.fase === 'retirado') return;
    if (c.fase === 'ncaa' && c.etapa === 'cantera') {
      c.curso++; const cat = categoria(p.edad), pasada = c.historial.length && c.historial[c.historial.length - 1].liga;
      c.hitos.unshift({ fecha: st.fecha, texto: 'Terminas la temporada en ' + (pasada || 'la cantera') + '.' });
      if (p.edad >= 18) { c.ofertas = ofertasCantera(st); GM.noticia(st, 'Con ' + p.edad + ' años llega el momento de decidir tu futuro.'); }
      else if (cat !== pasada) { c.hitos.unshift({ fecha: st.fecha, texto: 'Subes a la categoría ' + cat + '.' }); GM.noticia(st, 'Subes a la categoría ' + cat + '.'); }
      return;
    }
    if (c.fase === 'ncaa') { c.curso++; c.hitos.unshift({ fecha: st.fecha, texto: 'Terminas el curso universitario.' }); return; }
    generarOfertas(st);
    if (p.edad >= 36 || (p.edad >= 33 && p.ovr < 58)) GM.noticia(st, 'Se acerca el momento de pensar en la retirada.');
  });

  // ---------- Ofertas y movimientos ----------
  function impacto(st, nuevoId) {
    const c = C(st), p = YO(st), viejo = p.equipoId; if (!viejo || viejo === nuevoId) return null;
    const lo = M().ligaDe(st, viejo), ln = M().ligaDe(st, nuevoId), to = TIER[lo], tn = TIER[ln], e = c.clubes[viejo] ? nuevoEstatus(c.clubes[viejo].pts) : 0, rival = GM.mods.rivalidades ? GM.mods.rivalidades.derbi(st, viejo, nuevoId) : null;
    const out = { rival: !!rival, sube: tn > to, baja: tn < to, textos: [] };
    if (rival) out.textos.push('Es un rival de ' + st.equipos[viejo].nombre + ': su afición te lo reprochará' + (e >= 3 ? ' y perderás mucha reputación.' : '.'));
    if (tn > to) out.textos.push('Das el salto a una liga mayor: tu reputación se resentirá porque allí partes casi de cero.');
    if (tn < to && p.edad >= 30 && c.fama >= 58) out.textos.push('Bajas de liga, pero tu nombre pesa: llegarías como una figura.');
    return out.textos.length ? out : null;
  }
  function ajusteMovimiento(st, viejo, nuevo) {
    const c = C(st), p = YO(st); if (!viejo || viejo === nuevo) return;
    const lo = M().ligaDe(st, viejo), ln = M().ligaDe(st, nuevo), to = TIER[lo], tn = TIER[ln], rival = GM.mods.rivalidades ? GM.mods.rivalidades.derbi(st, viejo, nuevo) : null;
    const eAnt = c.clubes[viejo] ? nuevoEstatus(c.clubes[viejo].pts) : 0;
    let perdida = 0;
    if (rival) { perdida = 2 + eAnt * 2.2 + (rival.i === 2 ? 3 : 0); c.hitos.unshift({ fecha: st.fecha, texto: 'La afición de ' + st.equipos[viejo].nombre + ' no te perdona fichar por su rival.' }); GM.noticia(st, 'Polémica: ' + p.nombre + ' ficha por el rival de ' + st.equipos[viejo].nombre + '.'); if (c.clubes[viejo]) c.clubes[viejo].traidor = true; }
    else if (eAnt >= 4) { perdida = eAnt * 0.5; c.hitos.unshift({ fecha: st.fecha, texto: 'La afición de ' + st.equipos[viejo].nombre + ' despide a su ' + ESTATUS[eAnt].n.toLowerCase() + '.' }); }
    if (perdida) c._f = U.clamp(c._f - perdida, 0, 100);
    if (tn > to) c._f = U.clamp(c._f * Math.pow(to / tn, 0.9), 0, 100);        // subir de liga: partes con menos reputación
    let pts = 0;
    if (tn < to && p.edad >= 30) { pts = Math.min(110, c.fama * 1.1 * (p.edad >= 32 ? 1.2 : 1)); if (c.fama >= 85 && p.edad >= 32) pts = 110; }   // bajar de liga siendo veterano: llegas como figura
    else if (tn === to && c.clubes[viejo]) pts = Math.min(12, c.clubes[viejo].pts * 0.12);
    if (!c.clubes[nuevo]) c.clubes[nuevo] = { desde: st.fecha, temps: 0, pts: Math.round(pts) }; else c.clubes[nuevo].pts = Math.max(c.clubes[nuevo].pts, Math.round(pts));
    if (pts >= 84) c.hitos.unshift({ fecha: st.fecha, texto: 'Llegas a ' + st.equipos[nuevo].nombre + ' como ' + ESTATUS[nuevoEstatus(pts)].n.toLowerCase() + '.' });
  }
  function generarOfertas(st) {
    const c = C(st), p = YO(st), ag = AGENTES[c.agente.perfil], y = yearOf(st);
    const club = p.equipoId, cand = [], out = []; let seq = 0;
    Object.keys(st.equipos).forEach(id => {
      if (id === club) return;
      const lg = M().ligaDe(st, id); let min = MIN[lg];
      if (lg === 'NBA' && p.edad <= 22 && p.pot >= 84) min -= 6;
      if (p.ovr < min - 2) return;
      if (lg === 'NBA' && c.fama < 35 && p.ovr < 76) return;
      if (lg === 'EUROLIGA' && c.fama < 20 && p.ovr < 72) return;
      const eq = st.equipos[id], orden = eq.plantilla.map(i => st.jugadores[i]).filter(x => x && !x.esYo).sort((a, b) => b.ovr - a.ovr);
      const quinto = orden[4] ? orden[4].ovr : 60, noveno = orden[8] ? orden[8].ovr : 55;
      const r = p.ovr >= quinto ? 'Titular' : p.ovr >= noveno ? 'Rotación' : 'Banquillo';
      cand.push({ id, lg, eq, r, score: NIVEL[lg] * 10 + eq.reputacion * 0.2 + (r === 'Titular' ? 8 : r === 'Rotación' ? 3 : -6) + GM.rng.next() * 14 + (ag.nivel ? NIVEL[lg] * 4 : 0) + (c.fama - 40) * 0.1 });
    });
    cand.sort((a, b) => b.score - a.score);
    const porLiga = {};
    cand.forEach(k => { if (out.length >= 6 || (porLiga[k.lg] || 0) >= 2) return; porLiga[k.lg] = (porLiga[k.lg] || 0) + 1; out.push(k); });
    const impactoDe = id => impacto(st, id);
    c.ofertas = out.map(k => {
      const sal = Math.round(M().salarioPedido(st, 'yo', k.id) * (0.92 + 0.2 * GM.rng.next()) * ag.sal / 10000) * 10000, joven = p.edad <= 24;
      const tipo = k.lg === 'NBA' ? (p.ovr < 72 ? 'Contrato de dos vías' : 'Contrato NBA') : 'Contrato profesional';
      return { id: 'o' + (++seq), clubId: k.id, liga: k.lg, tipo, rol: k.r, salario: k.lg === 'NBA' && p.ovr < 72 ? 1.2e6 : sal, anos: joven ? GM.rng.int(2, 4) : GM.rng.int(1, 3), nota: k.lg === 'NBA' ? 'Cumples el sueño de llegar a la NBA.' : k.lg === 'EUROLIGA' ? 'Competición de máximo nivel en Europa.' : 'Más minutos para crecer.', impacto: impactoDe(k.id) };
    });
    // renovación con el club actual
    if (club && p.contrato.hasta <= y + 1 && p.contrato.hasta > 0) {
      const eq = st.equipos[club], lg = M().ligaDe(st, club), r = rol(st);
      c.ofertas.unshift({ id: 'o' + (++seq), clubId: club, liga: lg, tipo: 'Renovación', rol: r, salario: Math.round(M().salarioPedido(st, 'yo', club) * 1.05 * (ag.ren || 1) / 10000) * 10000, anos: p.edad <= 24 ? 3 : 2, nota: 'Sigues en ' + eq.nombre + '.' });
    }
    c.ofertas.forEach(o => { o.salario = Math.max(o.liga === 'NBA' ? 1.2e6 : 6e4, o.salario); });
    if (c.ofertas.length) GM.noticia(st, 'Tu representante ' + c.agente.nombre + ' tiene ' + c.ofertas.length + ' ofertas sobre la mesa.');
    return c.ofertas;
  }
  function ofertasCantera(st) {
    const c = C(st), p = YO(st), ac = c.cantera.clubId, eq = st.equipos[ac], out = []; let seq = 100;
    const orden = eq.plantilla.map(i => st.jugadores[i]).filter(x => x && !x.esYo).sort((a, b) => b.ovr - a.ovr), corte = orden[11] ? orden[11].ovr : 55, ag = AGENTES[c.agente.perfil];
    if (p.ovr >= corte - 6) out.push({ id: 'o' + (++seq), clubId: ac, liga: M().ligaDe(st, ac), tipo: 'Primer equipo de ' + eq.nombre, rol: p.ovr >= corte ? 'Rotación' : 'Banquillo', salario: Math.max(60000, Math.round(M().salarioPedido(st, 'yo', ac) * 0.8 / 10000) * 10000), anos: 3, nota: 'Das el salto al primer equipo de tu club formador.', impacto: null });
    const prev = c.ofertas; c.ofertas = []; const extra = generarOfertas(st).slice(0, 3); c.ofertas = prev; extra.forEach(o => { o.id = 'o' + (++seq); if (o.liga === 'NBA' || o.liga === 'EUROLIGA') return; out.push(o); });
    out.push({ id: 'oU', clubId: ac, liga: 'NCAA', tipo: 'Universidad', rol: '', salario: 0, anos: 0, nota: 'Viajas a EE. UU. para jugar en la NCAA. Desde allí, el draft de la NBA es posible.' });
    if (c.curso < 6) out.push({ id: 'oF', clubId: ac, liga: M().ligaDe(st, ac), tipo: 'Seguir en el filial', rol: 'Titular', salario: 0, anos: 1, nota: 'Un año más en el filial para ganar minutos y madurar.' });
    return out;
  }
  function aceptar(st, id) {
    { const c0 = C(st), o0 = c0.ofertas.find(x => x.id === id);
      if (o0 && o0.tipo === 'Universidad') { c0.etapa = 'universidad'; c0.curso = 1; c0.declarado = false; c0.ofertas = []; c0.hitos.unshift({ fecha: st.fecha, texto: 'Viajas a EE. UU. para jugar en la universidad.' }); GM.noticia(st, YO(st).nombre + ' se marcha a jugar a la NCAA.'); return { ok: true, cambioClub: false }; }
      if (o0 && o0.tipo === 'Seguir en el filial') { c0.ofertas = []; c0.hitos.unshift({ fecha: st.fecha, texto: 'Decides seguir un año más en el filial.' }); return { ok: true, cambioClub: false }; } }
    const c = C(st), p = YO(st), o = c.ofertas.find(x => x.id === id); if (!o) return { ok: false, motivo: 'La oferta ya no está disponible.' };
    if (c.fase === 'retirado') return { ok: false, motivo: 'Estás retirado.' };
    const nuevo = st.equipos[o.clubId], antes = p.equipoId;
    if (!c.clubes) c.clubes = {}; if (antes !== o.clubId) ajusteMovimiento(st, antes, o.clubId); else if (!c.clubes[o.clubId]) c.clubes[o.clubId] = { desde: st.fecha, temps: 0, pts: 0 };
    if (antes && antes !== o.clubId) st.equipos[antes].plantilla = st.equipos[antes].plantilla.filter(i => i !== 'yo');
    if (antes !== o.clubId) { if (nuevo.plantilla.length >= 15) quitarPeor(st, o.clubId); if (nuevo.plantilla.indexOf('yo') < 0) nuevo.plantilla.push('yo'); }
    st.mercado.libres = st.mercado.libres.filter(i => i !== 'yo');
    p.equipoId = o.clubId; p.libre = false; p.contrato = { salario: o.salario, hasta: yearOf(st) + o.anos };
    nuevo.tactica = null; st.clubId = o.clubId; c.fase = 'pro'; c.fichado = o.clubId;
    c.dinero += Math.round(o.salario * 0.05 / 1000);
    const nueva = o.tipo !== 'Renovación';
    c.hitos.unshift({ fecha: st.fecha, texto: (nueva ? 'Fichas por ' : 'Renuevas con ') + nuevo.nombre + ' (' + NOMLIGA[o.liga] + ').' });
    actualizaTier(st);
    GM.noticia(st, nueva ? p.nombre + ' ficha por ' + nuevo.nombre + '.' : p.nombre + ' renueva con ' + nuevo.nombre + '.');
    c.ofertas = [];
    return { ok: true, cambioClub: nueva };
  }
  // Se llama al empezar una nueva temporada: si no decides, tu representante cierra algo.
  function cerrar(st) {
    const c = C(st), p = YO(st); if (!c || c.fase === 'retirado') return;
    if (c.fase === 'ncaa' && c.etapa === 'cantera') { if (c.ofertas.length) { const m = c.ofertas.find(o => /^Primer equipo/.test(o.tipo)) || c.ofertas.find(o => o.tipo === 'Seguir en el filial') || c.ofertas[0]; aceptar(st, m.id); GM.noticia(st, 'Tu representante decide por ti.'); } return; }
    if (c.fase === 'ncaa') return;
    const caduca = !p.equipoId || (p.contrato.hasta && p.contrato.hasta <= yearOf(st) + 1);
    if (!caduca) { c.ofertas = []; return; }
    if (!c.ofertas.length) generarOfertas(st);
    const mejor = c.ofertas.slice().sort((a, b) => (b.tipo === 'Renovación' ? 5 : 0) + NIVEL[b.liga] * 3 - ((a.tipo === 'Renovación' ? 5 : 0) + NIVEL[a.liga] * 3))[0];
    if (mejor) { aceptar(st, mejor.id); GM.noticia(st, 'Tu representante cierra el contrato por ti.'); }
    else {
      const cands = Object.keys(st.equipos).filter(i => M().ligaDe(st, i) !== 'NBA').sort((a, b) => st.equipos[a].reputacion - st.equipos[b].reputacion);
      c.ofertas = [{ id: 'oX', clubId: cands[0], liga: M().ligaDe(st, cands[0]), tipo: 'Contrato profesional', rol: 'Rotación', salario: 120000, anos: 1, nota: 'Una última oportunidad.' }]; aceptar(st, 'oX');
    }
  }
  function retirarse(st) {
    const c = C(st), p = YO(st); if (c.fase === 'retirado') return { ok: false, motivo: 'Ya estás retirado.' };
    if (p.equipoId) st.equipos[p.equipoId].plantilla = st.equipos[p.equipoId].plantilla.filter(i => i !== 'yo');
    p.equipoId = null; c.fase = 'retirado'; c.retiro = { temporada: st.temporada, edad: p.edad, ovr: p.ovr }; c.ofertas = [];
    c.hitos.unshift({ fecha: st.fecha, texto: 'Te retiras con ' + p.edad + ' años.' });
    GM.noticia(st, p.nombre + ' anuncia su retirada.');
    return { ok: true };
  }

  // ---------- Vivienda y estilo de vida ----------
  const TIPOS_VIV = {
    estudio: { nombre: 'Estudio humilde', base: 90, comodidad: 0 }, piso: { nombre: 'Piso pequeño', base: 180, comodidad: 1 }, reformado: { nombre: 'Piso reformado', base: 320, comodidad: 2 },
    atico: { nombre: 'Ático con terraza', base: 650, comodidad: 3 }, casa: { nombre: 'Casa con jardín', base: 900, comodidad: 4 }, mansion: { nombre: 'Mansión con piscina', base: 2600, comodidad: 5 }
  };
  const COCHES = { utilitario: { nombre: 'Utilitario', precio: 20, moral: 1, fama: 0 }, deportivo: { nombre: 'Deportivo', precio: 140, moral: 3, fama: 1 }, lujo: { nombre: 'Coche de lujo', precio: 320, moral: 3, fama: 3 } };
  function ciudadActual(st) { return st.equipos[st.clubId].ciudad; }
  function barriosVivienda(st) {
    const ciu = ciudadActual(st), nombres = GM.mods.ciudad3d ? GM.mods.ciudad3d.barrios(st).map(b => b.nombre) : [];
    return nombres.map((n, i) => { const h = U.hash(ciu + 'viv' + i); return { i, nombre: n, precio: Math.round((i === 1 ? 1.45 : i === 0 ? 1.25 : 0.75 + (h % 40) / 100) * 100) / 100, transporte: 1 + (h >>> 3) % 5, ruido: 1 + (h >>> 6) % 5, prestigio: i === 1 ? 5 : i === 0 ? 4 : 1 + (h >>> 9) % 4 }; });
  }
  function precioVivienda(st, barrio, tipo) { const b = barriosVivienda(st)[barrio]; return Math.round(TIPOS_VIV[tipo].base * b.precio); }
  function comprarVivienda(st, barrio, tipo, modo) {
    const c = C(st), v = c.vivienda; if (c.fase === 'ncaa') return { ok: false, motivo: c.etapa === 'cantera' ? 'Vives en la residencia de la cantera hasta los 18.' : 'Vives en la residencia universitaria.' };
    const b = barriosVivienda(st)[barrio], t = TIPOS_VIV[tipo]; if (!b || !t) return { ok: false, motivo: 'Opción no válida.' };
    const H = GM.mods.hogar; if (H && H.TIPOS[tipo] && H.nivel(st) < H.TIPOS[tipo].req) return { ok: false, motivo: 'Requiere nivel de vida ' + H.TIPOS[tipo].req + ' (' + H.NIVELES[H.TIPOS[tipo].req] + ').' };
    const precio = precioVivienda(st, barrio, tipo), alquiler = Math.max(1, Math.round(precio * 0.005 * 10) / 10);
    const coste = modo === 'compra' ? precio : modo === 'hipoteca' ? Math.round(precio * 0.2) : alquiler * 2;
    if (c.dinero < coste) return { ok: false, motivo: 'Te faltan ' + Math.round(coste - c.dinero) + ' mil € de ahorros.' };
    c.dinero -= coste;
    if (v.actual && v.actual.modo === 'compra') v.propiedades.push(Object.assign({}, v.actual, { alquilada: false }));
    v.actual = { id: 'v' + (st.fecha) + barrio + tipo, barrio, barrioNombre: b.nombre, tipo, modo, precio, alquiler, cuota: alquiler, ciudad: ciudadActual(st), desde: st.fecha, comodidad: t.comodidad, transporte: b.transporte, ruido: b.ruido, prestigio: b.prestigio };
    c.hitos.unshift({ fecha: st.fecha, texto: (modo === 'compra' ? 'Compras un ' : 'Alquilas un ') + t.nombre.toLowerCase() + ' en ' + b.nombre + '.' });
    c.moral = U.clamp(c.moral + 4, 0, 100); GM.noticia(st, 'Nuevo hogar: ' + t.nombre.toLowerCase() + ' en ' + b.nombre + '.');
    return { ok: true };
  }
  function gestionarPropiedad(st, id, accion) {
    const c = C(st), v = c.vivienda, arr = v.actual && v.actual.id === id ? [v.actual] : v.propiedades.filter(p => p.id === id), p = arr[0];
    if (!p) return { ok: false, motivo: 'Propiedad no encontrada.' };
    if (accion === 'vender') {
      if (p.modo !== 'compra' && p.modo !== 'hipoteca') return { ok: false, motivo: 'Solo puedes vender lo que has comprado.' };
      const precio = Math.round(p.precio * (0.9 + GM.rng.next() * 0.2) * (p.modo === 'hipoteca' ? 0.7 : 1)); c.dinero += precio;
      if (v.actual && v.actual.id === id) v.actual = null; else v.propiedades = v.propiedades.filter(x => x.id !== id);
      c.hitos.unshift({ fecha: st.fecha, texto: 'Vendes tu vivienda en ' + p.barrioNombre + ' por ' + precio + ' mil €.' }); return { ok: true, precio };
    }
    if (accion === 'alquilar') { if (v.actual && v.actual.id === id) return { ok: false, motivo: 'Vives en ella.' }; p.alquilada = !p.alquilada; return { ok: true, alquilada: p.alquilada }; }
    if (accion === 'dejar') { if (!v.actual || v.actual.id !== id || p.modo !== 'alquiler') return { ok: false, motivo: 'No puedes dejarla.' }; v.actual = null; return { ok: true }; }
    return { ok: false, motivo: 'Acción desconocida.' };
  }
  function comprarCoche(st, id) {
    const c = C(st), v = c.vivienda, k = COCHES[id]; if (!k) return { ok: false, motivo: 'Coche desconocido.' };
    if (c.dinero < k.precio) return { ok: false, motivo: 'Te faltan ' + Math.round(k.precio - c.dinero) + ' mil € de ahorros.' };
    if (v.coche) c.dinero += Math.round(COCHES[v.coche.id].precio * 0.6);
    c.dinero -= k.precio; v.coche = { id, nombre: k.nombre }; c.moral = U.clamp(c.moral + k.moral, 0, 100); c.fama = U.clamp(c.fama + k.fama, 0, 100);
    c.hitos.unshift({ fecha: st.fecha, texto: 'Te compras un coche: ' + k.nombre.toLowerCase() + '.' }); return { ok: true };
  }
  function crearFundacion(st, nombre, aporte) {
    const c = C(st), v = c.vivienda; if (v.fundacion) return { ok: false, motivo: 'Ya tienes una fundación.' };
    if (c.dinero < 150) return { ok: false, motivo: 'Necesitas 150 mil € de ahorros para crearla.' };
    c.dinero -= 150; v.fundacion = { nombre: String(nombre || 'Fundación ' + st.jugadores.yo.nombre.split(' ').pop()).slice(0, 30), aporte: U.clamp(aporte || 3, 1, 10) };
    c.hitos.unshift({ fecha: st.fecha, texto: 'Creas la ' + v.fundacion.nombre + '.' }); c.fama = Math.min(100, c.fama + 5); c.moral = Math.min(100, c.moral + 4); return { ok: true };
  }
  function invitarEquipo(st) {
    const c = C(st), v = c.vivienda; if (!v.actual) return { ok: false, motivo: 'Necesitas una vivienda.' };
    if (c.ultCasa && U.diffDays(c.ultCasa, st.fecha) < 14) return { ok: false, motivo: 'Ya has organizado una cena hace poco.' };
    if (c.dinero < 1.5) return { ok: false, motivo: 'No tienes ahorros para la cena.' };
    c.dinero -= 1.5; c.ultCasa = st.fecha; c.moral = U.clamp(c.moral + 3 + (v.actual.comodidad - 1) * 0.5, 0, 100); c.fama = U.clamp(c.fama + 0.5, 0, 100);
    GM.noticia(st, 'Cena en casa con los compañeros: buen ambiente en el vestuario.'); return { ok: true };
  }
  function fijarAporte(st, x) { const f = C(st).vivienda.fundacion; if (!f) return { ok: false, motivo: 'No tienes fundación.' }; f.aporte = U.clamp(x, 1, 10); return { ok: true }; }
  function efectosVivienda(st) {
    const c = C(st), v = c.vivienda, p = YO(st), a = v.actual; if (!a) return;
    const lejos = c.fase === 'pro' && a.ciudad !== ciudadActual(st);
    c.moral = U.clamp(c.moral + (a.comodidad - 2) * 0.5 + (a.transporte - 3) * 0.3 - (a.ruido - 3) * 0.3 - (lejos ? 1.2 : 0), 0, 100);
    c.fama = U.clamp(c.fama + (a.prestigio - 3) * 0.1, 0, 100);
    if (a.modo === 'alquiler') c.dinero -= a.alquiler;
    if (a.modo === 'hipoteca') c.dinero -= a.cuota || a.alquiler;
    if (v.coche) c.moral = U.clamp(c.moral + 0.2, 0, 100);
    p.estado.fatiga = U.clamp(p.estado.fatiga - Math.max(0, (a.transporte - 2)) * 0.6, 0, 100);
  }
  function ingresosVivienda(st) {
    const c = C(st), v = c.vivienda;
    v.propiedades.forEach(p => { if (p.alquilada) c.dinero += Math.round(p.precio * 0.004 * 10) / 10; });
    if (v.fundacion) { const don = Math.round(YO(st).contrato.salario * v.fundacion.aporte / 100 / 12 / 1000 * 10) / 10; if (don) { c.dinero -= don; c.fama = Math.min(100, c.fama + 0.3); } }
  }

  // ---------- Eventos personales ----------
  const EVENTOS = [
    { id: 'draft', t: 'El draft de la NBA', q: 'Tu representante', d: 'Se abre el plazo para presentarse al draft.', ops: [
      { t: 'Presentarme al draft', d: 'Si te eligen, das el salto a la NBA. Si no, sigues donde estás.', ef: { draft: true } }, { t: 'Esperar un año', d: 'Sigues creciendo y lo intentas más adelante.', ef: { draft: false } }] },
    { id: 'zapatillas', t: 'Contrato de zapatillas', q: 'Tu representante', d: 'Tres marcas quieren que lleves sus zapatillas esta temporada.', ops: [
      { t: 'Marca global', d: 'Mucho dinero y proyección.', ef: { dinero: 90, fama: 3, moral: -2 } }, { t: 'Marca local', d: 'Menos dinero, más cercanía.', ef: { dinero: 35, fama: 1, moral: 4 } }, { t: 'Las que yo quiera', d: 'Libertad total.', ef: { moral: 5 } }] },
    { id: 'redes', t: 'Polémica en redes', q: 'Departamento de comunicación', d: 'Un comentario tuyo se ha sacado de contexto y la afición discute.', ops: [
      { t: 'Pedir disculpas', d: 'Se calma, pero cuesta orgullo.', ef: { fama: -1, moral: 2 } }, { t: 'Responder con firmeza', d: 'Gana apoyos y pierde otros.', ef: { fama: 3, moral: -4 } }, { t: 'Ignorarlo', d: 'Se enfría solo o no.', ef: { fama: -2 } }] },
    { id: 'mentor', t: 'Un veterano te ofrece ayuda', q: 'Veterano del vestuario', d: 'Alguien con mil partidos a la espalda quiere guiarte.', ops: [
      { t: 'Aceptar la mentoría', d: 'Aprendes más rápido.', ef: { xp: 0.6, moral: 3 } }, { t: 'Seguir tu camino', d: 'Prefieres ir a tu aire.', ef: { moral: 1 } }] },
    { id: 'fisio', t: 'Preparación física privada', q: 'Preparador físico', d: 'Un preparador de élite te propone trabajar a diario contigo.', ops: [
      { t: 'Contratarlo', d: 'Cuesta dinero, pero reduces el riesgo de lesión.', ef: { dinero: -40, prevencion: true, moral: 2 } }, { t: 'No hace falta', d: 'Te las apañas con el club.', ef: {} }] },
    { id: 'seleccion', t: 'Convocatoria con la selección', q: 'Seleccionador', d: 'Te llaman para una ventana internacional.', ops: [
      { t: 'Ir', d: 'Más fama, algo de desgaste.', ef: { fama: 4, moral: 3, xp: 0.2 } }, { t: 'Descansar', d: 'Te quedas con tu club.', ef: { moral: -2 } }] },
    { id: 'caridad', t: 'Fundación local', q: 'Directora de la fundación', d: 'Te piden que apadrines un campus para niños del barrio.', ops: [
      { t: 'Apadrinar el campus', d: 'La gente lo agradece.', ef: { dinero: -15, fama: 4, moral: 5 } }, { t: 'Una visita puntual', d: 'Sin compromiso.', ef: { fama: 1 } }] },
    { id: 'charla', t: 'Charla con el entrenador', q: 'Entrenador', d: 'Te dice que tendrás más minutos si mejoras en un aspecto concreto.', ops: [
      { t: 'Defensa', d: 'Pasas a entrenar defensa.', ef: { foco: 'defensa', moral: 2 } }, { t: 'Tiro', d: 'Pasas a entrenar tiro.', ef: { foco: 'tiro', moral: 2 } }, { t: 'Físico', d: 'Pasas a entrenar físico.', ef: { foco: 'fisico', moral: 2 } }] },
    { id: 'agente-cambio', t: 'Otro representante llama', q: 'Un agente de renombre', d: 'Dice que puede conseguirte más y mejor. Habrá que romper con el actual.', ops: [
      { t: 'Cambiar a «Estratega»', d: 'Mira a ligas de más nivel.', ef: { agente: 'prestigio' } }, { t: 'Cambiar a «Cazador de contratos»', d: 'Va a por el dinero.', ef: { agente: 'dinero' } }, { t: 'Seguir con el mío', d: 'Lealtad ante todo.', ef: { moral: 2 } }] },
    { id: 'casa', t: 'Casa nueva', q: 'Inmobiliaria', d: 'Te ofrecen un piso cerca del pabellón.', ops: [
      { t: 'Comprarlo', d: 'Una inversión grande.', ef: { dinero: -120, moral: 6 } }, { t: 'Alquilar', d: 'Más flexible.', ef: { dinero: -20, moral: 2 } }] }
  ];
  function nuevoEvento(st) {
    const c = C(st), usados = new Set(c.res.slice(-4).map(r => r.id)), lista = EVENTOS.filter(e => e.id !== 'draft' && !usados.has(e.id) && !c.pend.some(p => p.id === e.id));
    if (!lista.length) return;
    const e = GM.rng.pick(lista); c.pend.push({ id: e.id, fecha: st.fecha }); c.ultimoEvento = st.fecha;
    GM.noticia(st, 'Tienes una decisión personal: ' + e.t + '.');
  }
  function eventos(st) { return C(st).pend.map(p => { const e = EVENTOS.find(x => x.id === p.id), mk = e.id === 'draft' ? mock(st) : null; return { id: e.id, titulo: e.t, quien: e.q, texto: mk ? 'Se abre el plazo del draft. Las previsiones te sitúan en: ' + mk.proyeccion.toLowerCase() + (mk.pick <= 60 ? ' (puesto ' + mk.pick + ' de 60)' : '') + '. Tienes ' + YO(st).ovr + ' de nivel y ' + YO(st).pot + ' de potencial.' : e.d, opciones: e.ops.map((o, i) => ({ i, t: o.t, d: o.d })) }; }); }
  function elegirEvento(st, id, i) {
    const c = C(st), p = YO(st), idx = c.pend.findIndex(x => x.id === id), e = EVENTOS.find(x => x.id === id);
    if (idx < 0 || !e || !e.ops[i]) return { ok: false, motivo: 'Decisión no disponible.' };
    const ef = e.ops[i].ef, out = [];
    if (ef.dinero) { c.dinero += ef.dinero; out.push((ef.dinero > 0 ? '+' : '') + ef.dinero + ' mil €'); }
    if (ef.fama) { c.fama = U.clamp(c.fama + ef.fama, 0, 100); out.push('fama ' + (ef.fama > 0 ? '+' : '') + ef.fama); }
    if (ef.moral) { c.moral = U.clamp(c.moral + ef.moral, 0, 100); out.push('moral ' + (ef.moral > 0 ? '+' : '') + ef.moral); }
    if (ef.xp) { p.xp = (p.xp || 0) + ef.xp; out.push('progresión extra'); }
    if (ef.foco) { c.entreno.foco = ef.foco; out.push('entrenas ' + ef.foco); }
    if (ef.agente) { c.agente.perfil = ef.agente; out.push('nuevo representante'); }
    if (ef.prevencion) c.prevencion = true;
    if (ef.draft !== undefined) { c.declarado = ef.draft; c.hitos.unshift({ fecha: st.fecha, texto: ef.draft ? 'Te presentas al draft de la NBA.' : 'Decides esperar un año para el draft.' }); out.push(ef.draft ? 'te presentas al draft' : 'esperas un año'); }
    c.pend.splice(idx, 1); c.res.push({ id, i, fecha: st.fecha }); if (c.res.length > 40) c.res.shift();
    return { ok: true, efectos: out };
  }
  function selfTest() {
    const a = AGENTES.dinero.sal > AGENTES.prestigio.sal && ORIGENES.ncaa.pot > ORIGENES.europa.pot && EVENTOS.every(e => e.ops.length >= 2);
    return a && FOCOS.tiro.length === 3 && TIPOS_VIV.atico.base > TIPOS_VIV.piso.base;
  }
  GM.bus.on('partida:cargada', function () { const st = GM.state; if (st && st.modo === 'carrera' && st.carrera) { instalaFama(st.carrera); if (!st.carrera.clubes) st.carrera.clubes = {}; actualizaTier(st); } });
  GM.register('carrera', { progresoAnual, elegibleDraft, avisoDraft, ajustarPot, potEstado, POT_MAX, gradoFama, estatusClub, impacto, GRADOS, ESTATUS, instalaFama, invitarEquipo, TIPOS_VIV, COCHES, barriosVivienda, precioVivienda, comprarVivienda, gestionarPropiedad, comprarCoche, crearFundacion, fijarAporte, estado, stats, rol, liga, retrato, entrenar, declararse, mock, preDraft, postDraft, preCierre, generarOfertas, aceptar, cerrar, retirarse, eventos, elegirEvento, nuevaPartida, selfTest, AGENTES, ORIGENES, NOMLIGA, NIVEL, MIN, FOCOS, INTENS });
})();
