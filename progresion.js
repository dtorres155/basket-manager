/* PROGRESIÓN DEL JUGADOR (punto 63, GM.progresion) — profundidad deportiva sobre cantera.js y partidos.js.
   - Rasgos (clutch, atleta, tirador, defensor, pasador, rebotero, líder, resiliente, frágil) que salen de los atributos y de un talento oculto propio de cada jugador; y atributos ocultos que no tocan la media:
     clutch (decisivo en los últimos minutos), aguante, liderazgo y mentalidad (aguanta las malas rachas y aprende más).
   - Curvas de desarrollo por posición y edad: cada jugador es precoz, normal o tardío (el pico va de los 24 a los 29 años y los pívots maduran más tarde); el crecimiento semanal sale de esa curva.
   - Entrenamiento colectivo (carga y foco) e individual (foco y carga por jugador, incluida la mentalidad y el descanso). La carga acumulada (0 a 100) sube con los minutos y con el entrenamiento y baja con el descanso:
     por encima de 70 el jugador se resiente (menos progreso y riesgo de lesión por sobrecarga).
   - Lesiones: cada una se anota en el historial; las recaídas (la misma lesión en menos de seis meses) duran más; las graves pueden dejar una secuela permanente (pierde uno o dos puntos de un atributo físico).
     Con el árbol de instalaciones (arbol_instalaciones.js): la prevención baja el riesgo, el control de cargas baja el de sobrecarga y la readaptación reduce las secuelas.
   Estado: state.entreno = { colectivo: { carga, foco }, individual: { <id>: { foco, carga } } }; por jugador: p.ext (atributos ocultos), p.rasgos, p.curva, p.historial = { lesiones, secuelas }, p.estado.carga.
   Expone: RASGOS, FOCOS, CARGAS, rasgos, ext, curva, crecimiento, plan, fijarColectivo, fijarIndividual, aplicarSemana, sumarMinutos, descansoDiario, factorLesion, lesionar, historial, ficha, selfTest. Prueba: t_progresion.js. */
(function () {
  const U = GM.util,
    clamp = U.clamp,
    KEYS = () => GM.KEYS_ATT || ['tiro3', 'tiro2', 'tl', 'pase', 'bote', 'reb', 'defInt', 'defPer', 'fisico', 'iq'];
  const RASGOS = {
    clutch: 'Decisivo',
    atleta: 'Atleta',
    tirador: 'Tirador',
    defensor: 'Defensor',
    pasador: 'Pasador',
    rebotero: 'Rebotero',
    lider: 'Líder',
    resiliente: 'Resiliente',
    fragil: 'Frágil'
  };
  const DESC_RASGO = {
    clutch: 'Rinde más en los últimos minutos de partidos igualados.',
    atleta: 'Mejor físico: se cansa menos y se lesiona algo menos.',
    tirador: 'Su tiro mejora más rápido con el trabajo.',
    defensor: 'Gana puntos de defensa con más facilidad.',
    pasador: 'Mejora su visión de juego con más rapidez.',
    rebotero: 'Instinto para el rebote.',
    lider: 'Sube la química del vestuario.',
    resiliente: 'Se recupera antes de las malas rachas.',
    fragil: 'Más propenso a las lesiones y a las recaídas.'
  };
  const FOCOS = {
    equilibrado: { n: 'Equilibrado', att: ['tiro3', 'tiro2', 'tl', 'pase', 'bote', 'reb', 'defInt', 'defPer', 'fisico', 'iq'] },
    tiro: { n: 'Tiro', att: ['tiro3', 'tiro2', 'tl'] },
    defensa: { n: 'Defensa', att: ['defInt', 'defPer', 'iq'] },
    fisico: { n: 'Físico', att: ['fisico', 'reb'] },
    pase: { n: 'Pase y bote', att: ['pase', 'bote', 'iq'] },
    mentalidad: { n: 'Mentalidad', att: [] },
    descanso: { n: 'Descanso', att: [] }
  };
  const CARGAS = [
    { n: 'Descanso', mult: 0.35, carga: -9 },
    { n: 'Normal', mult: 1, carga: 4 },
    { n: 'Alta', mult: 1.35, carga: 9 },
    { n: 'Intensa', mult: 1.6, carga: 15 }
  ];
  const hsh = (p, s) => (U.hash(String(p.id) + s) >>> 0) % 100;
  // ---------- Rasgos, atributos ocultos y curvas ----------
  function ext(p) {
    if (p.ext) return p.ext;
    const a = p.att || {},
      h = k => hsh(p, k);
    p.ext = {
      clutch: clamp(Math.round(35 + h('c') * 0.45 + ((a.iq || 60) - 60) * 0.5), 20, 99),
      aguante: clamp(Math.round(40 + ((a.fisico || 60) - 50) * 0.7 + h('a') * 0.25), 20, 99),
      liderazgo: clamp(Math.round(30 + h('l') * 0.4 + Math.max(0, (p.edad || 24) - 22) * 2.2 + ((a.iq || 60) - 60) * 0.3), 15, 99),
      mental: clamp(Math.round(40 + h('m') * 0.5 + ((a.iq || 60) - 60) * 0.25), 20, 99)
    };
    return p.ext;
  }
  function rasgos(p) {
    if (p.rasgos) return p.rasgos;
    const a = p.att || {},
      x = ext(p),
      r = [];
    if (a.tiro3 >= 80 || (a.tiro3 + a.tl) / 2 >= 82) r.push('tirador');
    if (a.fisico >= 82) r.push('atleta');
    if ((a.defInt + a.defPer) / 2 >= 80) r.push('defensor');
    if (a.pase >= 80) r.push('pasador');
    if (a.reb >= 80) r.push('rebotero');
    if (x.clutch >= 78) r.push('clutch');
    if (x.liderazgo >= 80) r.push('lider');
    if (x.mental >= 82) r.push('resiliente');
    if (hsh(p, 'f') < 9 && r.indexOf('atleta') < 0) r.push('fragil');
    p.rasgos = r.slice(0, 4);
    return p.rasgos;
  }
  const PICO_POS = { PG: 0, SG: -0.3, SF: 0.2, PF: 0.7, C: 1.2 };
  function curva(p) {
    if (p.curva) return p.curva;
    const h = hsh(p, 'curva');
    p.curva = h < 22 ? 'precoz' : h < 80 ? 'normal' : 'tardia';
    return p.curva;
  }
  const pico = p => ({ precoz: 24.5, normal: 27, tardia: 29.2 })[curva(p)] + (PICO_POS[p.pos] || 0);
  // Crecimiento semanal base (puntos de experiencia por semana) según la distancia al pico
  function crecimiento(p) {
    const d = (p.edad || 24) - pico(p);
    return d <= -6 ? 0.16 : d <= -3 ? 0.12 : d <= -1 ? 0.075 : d <= 1 ? 0.03 : d <= 3.5 ? 0.0 : d <= 6 ? -0.02 : -0.04;
  }
  // ---------- Planes de entrenamiento ----------
  const E = st => st.entreno || (st.entreno = { colectivo: { carga: 1, foco: 'equilibrado' }, individual: {} });
  function plan(st, id) {
    const e = E(st),
      i = e.individual[id];
    return { foco: (i && i.foco) || e.colectivo.foco, carga: i && i.carga !== undefined && i.carga !== null ? i.carga : e.colectivo.carga, propio: !!i };
  }
  function fijarColectivo(st, carga, foco) {
    const e = E(st);
    if (carga !== undefined && carga !== null) {
      if (carga < 0 || carga > 3) return { ok: false, motivo: 'Carga no válida.' };
      e.colectivo.carga = carga;
    }
    if (foco) {
      if (!FOCOS[foco] || (foco === 'mentalidad' && false)) return { ok: false, motivo: 'Foco no válido.' };
      e.colectivo.foco = foco;
    }
    return { ok: true };
  }
  function fijarIndividual(st, id, foco, carga) {
    const e = E(st);
    if (!st.jugadores[id]) return { ok: false, motivo: 'Jugador desconocido.' };
    if (foco === null && carga === null) {
      delete e.individual[id];
      return { ok: true };
    }
    if (foco && !FOCOS[foco]) return { ok: false, motivo: 'Foco no válido.' };
    if (carga !== undefined && carga !== null && (carga < 0 || carga > 3)) return { ok: false, motivo: 'Carga no válida.' };
    const i = (e.individual[id] = e.individual[id] || {});
    if (foco) i.foco = foco;
    if (carga !== undefined && carga !== null) i.carga = carga;
    return { ok: true };
  }
  const efec = (st, id) => (GM.mods.ciudadDeportiva && GM.mods.ciudadDeportiva.efectos ? GM.mods.ciudadDeportiva.efectos(st, id) : {});
  // La semana de entrenamiento de un jugador (la llama cantera.progresionDiaria los lunes): devuelve lo que ha cambiado
  function aplicarSemana(st, p, mult, juvenil) {
    const pl = plan(st, p.id),
      C = CARGAS[pl.carga],
      e = p.estado || (p.estado = { forma: 80, fatiga: 0, moral: 70, lesion: null }),
      x = ext(p),
      r = rasgos(p),
      ef = efec(st, p.equipoId || st.clubId);
    const carga0 = e.carga || 0,
      cambios = { att: null, mental: 0, xp: 0 };
    e.carga = clamp(carga0 + C.carga, 0, 100);
    if (pl.foco === 'descanso') {
      e.carga = clamp(e.carga - 14, 0, 100);
      e.fatiga = Math.max(0, (e.fatiga || 0) - 6);
      return cambios;
    }
    const resiente = e.carga > 70 ? 1 - (e.carga - 70) / 60 : 1,
      mentalF = 0.9 + x.mental / 500,
      jprog = juvenil ? 1 + (ef.jprog || 0) : 1,
      base = crecimiento(p);
    let g = base * C.mult * mult * jprog * mentalF * Math.max(0.4, resiente) * (0.7 + 0.6 * GM.rng.next());
    if (base < 0) g = base * (pl.carga >= 2 ? 1.2 : 0.85) * (0.8 + 0.4 * GM.rng.next()) * (e.carga > 70 ? 1.25 : 1); // pasado el pico, entrenar fuerte desgasta más
    if (pl.foco === 'mentalidad') {
      x.mental = clamp(x.mental + 0.8 * (0.5 + GM.rng.next()) * C.mult, 20, 99);
      x.clutch = clamp(x.clutch + 0.4, 20, 99);
      cambios.mental = 1;
      g *= 0.3;
    }
    const keys = (FOCOS[pl.foco] || FOCOS.equilibrado).att.length ? FOCOS[pl.foco].att : FOCOS.equilibrado.att,
      bonus =
        (pl.foco === 'tiro' && r.indexOf('tirador') >= 0) ||
        (pl.foco === 'defensa' && r.indexOf('defensor') >= 0) ||
        (pl.foco === 'pase' && r.indexOf('pasador') >= 0) ||
        (pl.foco === 'fisico' && r.indexOf('atleta') >= 0);
    if (bonus && g > 0) g *= 1.25;
    p.xp = (p.xp || 0) + g;
    cambios.xp = g;
    if (p.xp >= 1) {
      if (p.ovr < Math.max(p.pot, p.ovr)) {
        p.xp = 0;
        GM.setOvr(p, p.ovr + 1, keys);
        cambios.att = keys;
      } else p.xp = 0.5;
    } else if (p.xp <= -1) {
      p.xp = 0;
      GM.setOvr(
        p,
        Math.max(40, p.ovr - 1),
        FOCOS.equilibrado.att.slice().sort(() => GM.rng.next() - 0.5)
      );
      cambios.att = ['declive'];
    }
    // sobrecarga: por encima de 70 hay riesgo de lesión semanal
    if (e.carga > 70 && !e.lesion) {
      const prob = ((e.carga - 70) / 100) * 0.3 * (ef.sobrecarga !== undefined ? ef.sobrecarga : 1) * (r.indexOf('fragil') >= 0 ? 1.5 : 1) * (r.indexOf('atleta') >= 0 ? 0.8 : 1);
      if (GM.rng.next() < prob) {
        const dias = GM.rng.int(5, 20),
          o = lesionar(st, p, 'Lesión por sobrecarga', dias, 'entrenamiento');
        e.lesion = { tipo: 'Lesión por sobrecarga', dias: o.dias };
        cambios.lesion = o;
      }
    }
    return cambios;
  }
  const sumarMinutos = (p, min) => {
    const e = p.estado;
    if (e) e.carga = clamp((e.carga || 0) + min * 0.28, 0, 100);
  };
  const descansoDiario = (p, rec) => {
    const e = p.estado;
    if (e && e.carga > 0) e.carga = Math.max(0, e.carga - 1.6 * (rec || 1));
  };
  // ---------- Lesiones, historial y secuelas ----------
  const hist = p => p.historial || (p.historial = { lesiones: [], secuelas: [] });
  function factorLesion(st, p) {
    const ef = efec(st, p.equipoId || st.clubId),
      r = rasgos(p),
      c = (p.estado && p.estado.carga) || 0;
    return clamp(
      (ef.prevencion !== undefined ? ef.prevencion : 1) *
        (1 + Math.max(0, c - 55) / 120) *
        (r.indexOf('fragil') >= 0 ? 1.45 : 1) *
        (r.indexOf('atleta') >= 0 ? 0.88 : 1) *
        (1 + (hist(p).secuelas.length ? 0.08 * hist(p).secuelas.length : 0)),
      0.3,
      2.5
    );
  }
  const PARTE = {
    'Esguince de tobillo': 'tobillo',
    'Sobrecarga muscular': 'muscular',
    'Rotura fibrilar': 'muscular',
    'Contusión en la rodilla': 'rodilla',
    'Molestias en la espalda': 'espalda',
    'Fractura en un dedo': 'mano',
    'Esguince de rodilla': 'rodilla',
    'Lesión por sobrecarga': 'muscular'
  };
  function lesionar(st, p, tipo, dias, origen) {
    const H = hist(p),
      f = st.fecha || '',
      parte = PARTE[tipo] || tipo,
      prev = H.lesiones.find(l => (PARTE[l.tipo] || l.tipo) === parte && f && U.diffDays(l.f, f) < 180);
    let d = dias;
    const notas = [];
    if (prev) {
      d = Math.round(d * 1.3);
      notas.push('recaída');
    }
    if (rasgos(p).indexOf('fragil') >= 0) d = Math.round(d * 1.15);
    d = Math.max(1, d);
    const ef = efec(st, p.equipoId || st.clubId),
      grave = d >= 31;
    let secuela = null;
    if (grave && GM.rng.next() < 0.35 * (ef.secuelas !== undefined ? ef.secuelas : 1) * (p.edad >= 30 ? 1.4 : 1)) {
      const k = ['fisico', 'bote', 'defPer'][GM.rng.int(0, 2)],
        v = GM.rng.int(1, 2);
      p.att[k] = Math.max(20, p.att[k] - v);
      if (GM.ovrDe) p.ovr = GM.ovrDe(p.att, p.pos);
      secuela = { f, tipo, att: k, v };
      H.secuelas.push(secuela);
      notas.push('secuela');
    }
    H.lesiones.unshift({ f, tipo, dias: d, grave, origen: origen || 'partido', notas });
    if (H.lesiones.length > 30) H.lesiones.length = 30;
    return { dias: d, recaida: !!prev, secuela };
  }
  const historial = p => hist(p);
  function ficha(st, p) {
    return {
      rasgos: rasgos(p).map(k => ({ id: k, n: RASGOS[k], d: DESC_RASGO[k] })),
      ext: ext(p),
      curva: curva(p),
      pico: Math.round(pico(p) * 10) / 10,
      carga: Math.round((p.estado && p.estado.carga) || 0),
      plan: plan(st, p.id),
      historial: hist(p)
    };
  }
  function selfTest() {
    const prev = GM.state,
      mk = (id, edad) => {
        const p = GM.mkJugador('t', id, 'J' + id, 'SF', edad, 200, 'ES', 'ES', 70, 85, 'E', 1e6, 2028);
        p.id = 'pj' + id;
        p.equipoId = 'a';
        return p;
      };
    const st = {
      clubId: 'a',
      fecha: '2026-10-05',
      temporada: '2026-27',
      equipos: { a: { id: 'a', plantilla: [], presupuesto: 60e6 } },
      jugadores: {},
      instalaciones: { a: {} },
      seed: 'x'
    };
    GM.state = st;
    try {
      const a = mk(1, 20),
        b = mk(2, 20),
        c = mk(3, 33);
      st.jugadores[a.id] = a;
      st.jugadores[b.id] = b;
      st.jugadores[c.id] = c;
      if (!(crecimiento(a) > crecimiento(c)) || crecimiento(c) >= 0) return false;
      if (!ext(a) || !Array.isArray(rasgos(a)) || ['precoz', 'normal', 'tardia'].indexOf(curva(a)) < 0) return false;
      fijarIndividual(st, b.id, 'descanso', 0);
      for (let i = 0; i < 8; i++) {
        aplicarSemana(st, a, 1, false);
        aplicarSemana(st, b, 1, false);
      }
      fijarIndividual(st, a.id, 'fisico', 3);
      const antes = a.estado.carga;
      for (let i = 0; i < 6; i++) aplicarSemana(st, a, 1, false);
      const l = lesionar(st, a, 'Esguince de tobillo', 12, 'partido'),
        l2 = lesionar(st, a, 'Esguince de tobillo', 12, 'partido');
      const f = factorLesion(st, a);
      return (
        a.estado.carga >= antes &&
        b.estado.carga < a.estado.carga &&
        l2.recaida &&
        l2.dias >= l.dias &&
        hist(a).lesiones.length >= 2 &&
        f > 0.3 &&
        f < 2.6 &&
        ficha(st, a).rasgos !== undefined &&
        plan(st, a.id).carga === 3
      );
    } finally {
      GM.state = prev;
    }
  }
  GM.progresion = {
    RASGOS,
    DESC_RASGO,
    FOCOS,
    CARGAS,
    rasgos,
    ext,
    curva,
    pico,
    crecimiento,
    plan,
    fijarColectivo,
    fijarIndividual,
    aplicarSemana,
    sumarMinutos,
    descansoDiario,
    factorLesion,
    lesionar,
    historial,
    ficha,
    selfTest
  };
  GM.register && GM.register('progresion', GM.progresion);
})();
