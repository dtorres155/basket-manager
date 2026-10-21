/* TÁCTICA Y PLANTILLA CON MÁS FONDO (punto 64, GM.tacticaPlus) — sobre tactica.js y partidos.js. Preparar un partido cambia el resultado:
   - Libro de jugadas: hasta tres jugadas de pizarra (pick and roll, pick and pop, aislamiento, poste, corte a la espalda, ataque en movimiento, contraataque, ruptura de zona) con su frecuencia. Cada jugada tiene
     idoneidad según los jugadores que están en pista (un buen base y un pívot rápido para el pick and roll, un pívot que tire para el pick and pop…) y dominio del equipo (0 a 100) que sube entrenándola.
     Si el rival te ha visto repetir las mismas jugadas, su entrenador (la IA) se adapta y restan eficacia: conviene variar.
   - Emparejamientos: quién marca a quién. Un buen defensor sobre la estrella rival baja su acierto (y deja a sus compañeros con un defensor menos).
   - Minutos objetivo por jugador (el reparto se ajusta al total del partido).
   - Química: cada pareja y cada quinteto acumulan minutos y saldo de puntos juntos; un quinteto con química alta rinde algo más y uno sin rodaje, algo menos.
   - Análisis avanzado: más-menos (+/-), +/- por 40 minutos y valoración por 36 minutos de cada jugador; el departamento de datos (arbol_instalaciones.js) afina el informe y suma eficacia a las jugadas.
   - Charla del descanso en el directo: motivar, calmar, exigir o repasar el plan; cambia lo que queda de partido según el marcador y el liderazgo del vestuario.
   Estado: state.pizarra = { libro: [{ id, w }], dominio: { <jugada>: 0-100 }, emp: { <mío>: <rival> }, minutos: { <jugador>: min }, vistas: { <jugada>: n }, prep: { fecha, rival } }; state.quimica = { pares, quintetos }.
   Expone: JUGADAS, estado, fijarLibro, idoneidad, recomendar, preparar, fijarEmparejamiento, fijarMinutos, quimicaQuinteto, avanzadas, ajustePm, equipo, extenderDirecto, cierrePartido, selfTest. Prueba: t_tactica_plus.js. */
(function () {
  const U = GM.util,
    clamp = U.clamp,
    P = () => GM.mods.partidos,
    activo = st => st.modo === 'gestor' || st.modo === 'entrenador';
  const g = (e, k) => e.p.att[k] * e.f;
  const mejor = (L, fn, filtro) => {
    let b = null,
      v = -1;
    L.forEach(e => {
      if (filtro && !filtro(e)) return;
      const x = fn(e);
      if (x > v) {
        v = x;
        b = e;
      }
    });
    return { e: b, v: b ? v : 0 };
  };
  const grande = e => e.p.pos === 'C' || e.p.pos === 'PF',
    normaliza = (v, a, b) => clamp((v - a) / (b - a), 0, 1);
  // fuerza: cuánto puede subir el acierto (sobre 1) con idoneidad y dominio máximos; para: tipo de tiro al que ayuda
  const JUGADAS = {
    pick_roll: {
      n: 'Pick and roll central',
      fuerza: 0.055,
      para: 'ambos',
      d: 'Un base que lee el bloqueo y un pívot que rueda al aro.',
      ideal: (L, D) => {
        const h = mejor(L, e => (g(e, 'bote') + g(e, 'pase')) / 2),
          r = mejor(
            L,
            e => g(e, 'reb') * 0.35 + g(e, 'fisico') * 0.3 + g(e, 'tiro2') * 0.35,
            e => grande(e) || e.p.pos === 'SF'
          );
        return h.e && r.e && h.e !== r.e ? (normaliza(h.v, 55, 85) + normaliza(r.v, 55, 85)) / 2 : 0;
      }
    },
    pick_pop: {
      n: 'Pick and pop',
      fuerza: 0.055,
      para: 3,
      d: 'El pívot abre el campo y tira de tres tras el bloqueo.',
      ideal: (L, D) => {
        const h = mejor(L, e => (g(e, 'bote') + g(e, 'pase')) / 2),
          r = mejor(L, e => g(e, 'tiro3'), grande);
        return h.e && r.e && r.v >= 58 ? (normaliza(h.v, 55, 85) + normaliza(r.v, 55, 82)) / 2 : 0;
      }
    },
    aislamiento: {
      n: 'Aislamiento de la estrella',
      fuerza: 0.042,
      para: 'ambos',
      d: 'Se despeja un lado para que la estrella juegue uno contra uno.',
      ideal: (L, D) => normaliza(mejor(L, e => e.p.ovr * 0.5 * e.f + g(e, 'bote') * 0.25 + g(e, 'tiro2') * 0.25).v, 62, 90)
    },
    poste: {
      n: 'Juego de poste',
      fuerza: 0.055,
      para: 2,
      d: 'El balón al pívot de espaldas al aro.',
      ideal: (L, D) => normaliza(mejor(L, e => g(e, 'tiro2') * 0.45 + g(e, 'fisico') * 0.3 + g(e, 'reb') * 0.25, grande).v, 58, 85)
    },
    corte: {
      n: 'Corte a la espalda',
      fuerza: 0.04,
      para: 2,
      d: 'Un jugador se escapa por detrás de la defensa a recibir bajo el aro.',
      ideal: (L, D) => normaliza((L.reduce((s, e) => s + g(e, 'iq'), 0) / L.length + L.reduce((s, e) => s + g(e, 'pase'), 0) / L.length) / 2, 55, 82)
    },
    movimiento: {
      n: 'Ataque en movimiento',
      fuerza: 0.05,
      para: 'ambos',
      d: 'Cinco jugadores que pasan y cortan hasta encontrar el mejor tiro.',
      ideal: (L, D) => (normaliza(L.reduce((s, e) => s + g(e, 'pase'), 0) / L.length, 52, 80) + normaliza(L.reduce((s, e) => s + g(e, 'tiro3'), 0) / L.length, 52, 80)) / 2
    },
    contraataque: {
      n: 'Contraataque',
      fuerza: 0.05,
      para: 2,
      d: 'Correr tras cada recuperación: gana si el ritmo es alto y el equipo es atlético.',
      ideal: (L, D, T) =>
        normaliza((L.reduce((s, e) => s + g(e, 'fisico'), 0) / L.length + L.reduce((s, e) => s + g(e, 'bote'), 0) / L.length) / 2, 55, 82) * (T && T.ritmo >= 4 ? 1 : 0.55)
    },
    zona: {
      n: 'Ruptura de zona',
      fuerza: 0.06,
      para: 3,
      d: 'Tiradores abiertos y circulación para romper una zona.',
      ideal: (L, D) => (D && D.tac && D.tac.defensa === 'zona' ? normaliza(L.reduce((s, e) => s + g(e, 'tiro3'), 0) / L.length, 52, 80) : 0.05)
    }
  };
  const est = st => st.pizarra || (st.pizarra = { libro: [], dominio: {}, emp: {}, minutos: {}, vistas: {}, prep: null });
  const analitica = (st, id) => {
    try {
      return GM.arbolInst && st.instalaciones && st.instalaciones[id] ? GM.arbolInst.efectos(st, id).analitica || 0 : 0;
    } catch (e) {
      return 0;
    }
  };
  // ---------- Libro de jugadas ----------
  function fijarLibro(st, lista) {
    if (!activo(st)) return { ok: false, motivo: 'Este modo no gestiona la pizarra.' };
    if (!Array.isArray(lista) || lista.length > 3) return { ok: false, motivo: 'Como mucho tres jugadas.' };
    if (lista.some(x => !JUGADAS[x.id])) return { ok: false, motivo: 'Jugada desconocida.' };
    if (new Set(lista.map(x => x.id)).size !== lista.length) return { ok: false, motivo: 'No repitas jugadas.' };
    est(st).libro = lista.map(x => ({ id: x.id, w: clamp(Math.round(x.w || 1), 1, 5) }));
    return { ok: true };
  }
  const dominio = (st, id) => est(st).dominio[id] || 0;
  function idoneidad(st, jugadaId, quinteto, rivalTac) {
    const J = JUGADAS[jugadaId];
    if (!J) return 0;
    const L = quinteto.map(i => ({ p: st.jugadores[i], f: 1 })).filter(e => e.p);
    return L.length ? Math.round(J.ideal(L, { tac: rivalTac || {} }, { ritmo: 3 }) * 100) / 100 : 0;
  }
  // El libro de la IA: las tres jugadas que mejor le encajan, con un dominio proporcional a su reputación (calibrado para que no cambie la liga)
  function libroIA(st, eqId) {
    const c = (st._libroIA = st._libroIA && st._libroIA.f === st.fecha ? st._libroIA : { f: st.fecha, m: {} });
    if (c.m[eqId]) return c.m[eqId];
    const q = P().tacticaAuto(st, eqId).quinteto,
      ord = Object.keys(JUGADAS)
        .map(id => [id, idoneidad(st, id, q)])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2),
      rep = (st.equipos[eqId] && st.equipos[eqId].reputacion) || 60;
    return (c.m[eqId] = ord.map(([id], i) => ({ id, w: 3 - i, dom: clamp(10 + rep * 0.16, 12, 28) })));
  }
  function equipo(st, eqId, tac) {
    const mio = eqId === st.clubId && activo(st),
      pz = est(st);
    if (!mio) return { libro: libroIA(st, eqId), emp: autoEmp(st, eqId), ia: true, vistas: null };
    return {
      libro: pz.libro.map(x => ({ id: x.id, w: x.w, dom: dominio(st, x.id) * (1 + 0.04 * analitica(st, eqId)) })),
      emp: Object.assign({}, pz.emp),
      ia: false,
      minutos: pz.minutos
    };
  }
  // ---------- Emparejamientos ----------
  function autoEmp(st, eqId) {
    const c = (st._empIA = st._empIA && st._empIA.f === st.fecha ? st._empIA : { f: st.fecha, m: {} });
    if (c.m[eqId]) return c.m[eqId];
    return (c.m[eqId] = {}); // la IA defiende en bloque: sin cambios de pareja (una mejora futura puede asignarlas)
  }
  function fijarEmparejamiento(st, mio, rival) {
    if (!activo(st)) return { ok: false, motivo: 'Este modo no gestiona la pizarra.' };
    const e = est(st);
    if (!rival) {
      delete e.emp[mio];
      return { ok: true };
    }
    if (!st.jugadores[mio] || !st.jugadores[rival]) return { ok: false, motivo: 'Jugador desconocido.' };
    e.emp[mio] = rival;
    return { ok: true };
  }
  function fijarMinutos(st, id, min) {
    if (!activo(st)) return { ok: false, motivo: 'Este modo no gestiona la pizarra.' };
    const e = est(st);
    if (min === null || min === undefined || min === '') {
      delete e.minutos[id];
      return { ok: true };
    }
    e.minutos[id] = clamp(Math.round(+min), 0, 40);
    return { ok: true };
  }
  // Aplica los minutos objetivo a la rotación de un equipo (la llama partidos.mkTeam): los demás se reparten lo que queda
  function aplicarMinutos(team, minutos, gmin) {
    if (!minutos) return;
    const ids = Object.keys(minutos);
    if (!ids.length) return;
    const total = gmin * 5;
    let fijos = 0,
      libres = 0;
    team.rot.forEach(e => {
      if (minutos[e.p.id] !== undefined) {
        e.target = Math.min(gmin * 0.97, (minutos[e.p.id] * gmin) / 40);
        fijos += e.target;
      } else libres += e.target;
    });
    const resto = Math.max(0, total - fijos),
      k = libres > 0 ? resto / libres : 1;
    team.rot.forEach(e => {
      if (minutos[e.p.id] === undefined) e.target = Math.min(gmin * 0.9, e.target * k);
    });
  }
  // ---------- Efecto en la simulación ----------
  // Una posesión: la jugada elegida (si el equipo tiene libro), el defensor asignado al tirador y la química del quinteto
  function ajustePm(O, D, si, is3) {
    let d = 0;
    const pz = O.pz;
    if (pz && pz.libro.length && GM.rng.next() < 0.55) {
      // se juega una jugada de la pizarra en poco más de la mitad de las posesiones
      let t = 0;
      pz.libro.forEach(x => {
        t += x.w;
      });
      let r = GM.rng.next() * t,
        x = pz.libro[0];
      for (const k of pz.libro) {
        r -= k.w;
        if (r <= 0) {
          x = k;
          break;
        }
      }
      const J = JUGADAS[x.id],
        cache = O.pzI || (O.pzI = {});
      if (cache[x.id] === undefined) cache[x.id] = J.ideal(O.L, D, O.tac);
      const ideal = cache[x.id],
        coincide = J.para === 'ambos' || J.para === (is3 ? 3 : 2),
        adapt = O.adapt && O.adapt[x.id] ? O.adapt[x.id] : 0;
      d += ideal * (x.dom / 100) * J.fuerza * 1.6 * (coincide ? 1 : 0.3) * (1 - adapt) - (pz.ia ? 0.0115 : 0) - (ideal < 0.25 && x.dom > 0 ? (0.25 - ideal) * 0.02 : 0);
      if (O.uso) O.uso[x.id] = (O.uso[x.id] || 0) + 1;
    }
    const dp = D.pz && D.pz.emp,
      sh = O.L[si];
    if (dp && sh) {
      const de = Object.keys(dp)
        .filter(k => dp[k] === sh.p.id)
        .map(k => D.L.find(e => e.p.id === k))
        .find(Boolean);
      if (de) {
        const val = is3 ? g(de, 'defPer') : g(de, 'defInt') * 0.6 + g(de, 'defPer') * 0.4,
          media = is3 ? D.dP : D.dI * 0.6 + D.dP * 0.4;
        d -= ((val - media) * 0.8) / (is3 ? 680 : 600);
      } else if (Object.keys(dp).length) {
        const medio = Object.keys(dp)
          .map(k => D.L.find(e => e.p.id === k))
          .filter(Boolean);
        if (medio.length) {
          const val = medio.reduce((s, e) => s + (is3 ? g(e, 'defPer') : g(e, 'defInt') * 0.6 + g(e, 'defPer') * 0.4), 0) / medio.length,
            media = is3 ? D.dP : D.dI * 0.6 + D.dP * 0.4;
          d += ((((val - media) * 0.2) / (is3 ? 680 : 600)) * medio.length) / 2;
        }
      }
    }
    return d + (O.quim || 0) + ((O.bonus && O.bonus.charla) || 0);
  }
  // ---------- Química ----------
  const clave = (a, b) => (a < b ? a + '|' + b : b + '|' + a),
    claveQ = ids => ids.slice().sort().join(',');
  const quim = st => st.quimica || (st.quimica = { pares: {}, quintetos: {} });
  function valorPar(r) {
    if (!r) return 45;
    const por40 = r.min > 0 ? (r.pm / r.min) * 40 : 0;
    return clamp(Math.round(45 + 35 * (1 - Math.exp(-r.min / 700)) + clamp(por40 * 1.2, -12, 12)), 10, 95);
  }
  function quimicaQuinteto(st, ids) {
    const Q = quim(st);
    let s = 0,
      n = 0;
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        s += valorPar(Q.pares[clave(ids[i], ids[j])]);
        n++;
      }
    const q = Q.quintetos[claveQ(ids)],
      bono = q ? 6 * (1 - Math.exp(-q.min / 300)) : 0;
    return clamp(Math.round(n ? s / n + bono : 45), 10, 99);
  }
  const bonoQuim = (st, ids) => (ids.length === 5 ? ((quimicaQuinteto(st, ids) - 55) / 45) * 0.012 : 0);
  const quimicaEquipo = (st, T, L) =>
    T.id === st.clubId && activo(st)
      ? bonoQuim(
          st,
          L.map(e => e.p.id)
        )
      : 0;
  // La IA se adapta a lo que ve: si ya te ha visto repetir una jugada, resta eficacia (más cuanto mejor es su equipo)
  function alinear(st, A, B) {
    // la IA también defiende con cabeza: su mejor defensor marca a la estrella rival (y, si es un club grande, el segundo a la segunda)
    [
      [A, B],
      [B, A]
    ].forEach(([yo, otro]) => {
      if (!yo.pz || !yo.pz.ia) return;
      const rep = (st.equipos[yo.id] && st.equipos[yo.id].reputacion) || 60;
      if (rep < 52) return;
      const mios = yo.rot
          .slice(0, 7)
          .slice()
          .sort((a, b) => b.p.att.defPer + b.p.att.defInt + b.p.att.fisico * 0.4 - (a.p.att.defPer + a.p.att.defInt + a.p.att.fisico * 0.4)),
        objetivos = otro.rot
          .slice(0, 5)
          .slice()
          .sort((a, b) => b.p.ovr - a.p.ovr),
        n = rep >= 72 ? 2 : 1,
        emp = {};
      for (let i = 0; i < n && mios[i] && objetivos[i]; i++) emp[mios[i].p.id] = objetivos[i].p.id;
      yo.pz.emp = emp;
    });
    [
      [A, B],
      [B, A]
    ].forEach(([mio, otro]) => {
      if (mio.id !== st.clubId || !activo(st) || otro.id === st.clubId) return;
      const v = est(st).vistas,
        rep = (st.equipos[otro.id] && st.equipos[otro.id].reputacion) || 60;
      mio.adapt = {};
      Object.keys(v).forEach(id => {
        mio.adapt[id] = clamp(v[id] * 0.04 * (0.6 + rep / 150), 0, 0.3);
      });
    });
  }
  function registrarStint(D, LA, LB, dA, dB, min) {
    const st = D.state;
    if (!D.pm) {
      D.pm = {};
      D.stints = [];
    }
    [
      [LA, dA - dB],
      [LB, dB - dA]
    ].forEach(([L, dif]) => {
      L.forEach(e => {
        const r = D.pm[e.p.id] || (D.pm[e.p.id] = { pm: 0, min: 0 });
        r.pm += dif;
        r.min += min;
      });
    });
    [
      [D.A, LA, dA - dB],
      [D.B, LB, dB - dA]
    ].forEach(([T, L, dif]) => {
      if (T.id === st.clubId) D.stints.push({ ids: L.map(e => e.p.id), dif, min });
    });
  }
  // Al terminar el partido: la química del club del usuario y el más-menos de cada jugador
  function cierrePartido(D, res) {
    const st = D.state;
    if (!D.pm) return;
    res.pm = {};
    Object.keys(D.pm).forEach(id => {
      res.pm[id] = Math.round(D.pm[id].pm);
    });
    if (!activo(st) || !D.stints) return;
    const Q = quim(st);
    D.stints.forEach(s => {
      for (let i = 0; i < 5; i++)
        for (let j = i + 1; j < 5; j++) {
          const k = clave(s.ids[i], s.ids[j]),
            r = Q.pares[k] || (Q.pares[k] = { min: 0, pm: 0 });
          r.min += s.min;
          r.pm += s.dif;
        }
      const k5 = claveQ(s.ids),
        q = Q.quintetos[k5] || (Q.quintetos[k5] = { min: 0, pm: 0 });
      q.min += s.min;
      q.pm += s.dif;
    });
    if (Object.keys(Q.quintetos).length > 400)
      Object.keys(Q.quintetos).forEach(k => {
        if (Q.quintetos[k].min < 8) delete Q.quintetos[k];
      }); // el estado no crece sin límite
    const e = est(st),
      lado = D.A.id === st.clubId ? D.A : D.B;
    if (lado.uso)
      Object.keys(lado.uso).forEach(id => {
        e.dominio[id] = clamp((e.dominio[id] || 0) + Math.min(1.5, lado.uso[id] * 0.03), 0, 100);
      });
    Object.keys(JUGADAS).forEach(id => {
      e.vistas[id] = (e.vistas[id] || 0) * 0.8 + (lado.uso && lado.uso[id] ? 1 : 0);
    });
  }
  // ---------- Análisis avanzado ----------
  function avanzadas(st, id) {
    const p = st.jugadores[id],
      s = st.estadisticas && st.estadisticas[id];
    if (!p || !s || !s.pj) return null;
    const min = s.min || 1,
      pm = s.pm || 0;
    return {
      id,
      nombre: p.nombre,
      pj: s.pj,
      min: Math.round((min / s.pj) * 10) / 10,
      pm: Math.round(pm),
      pm40: Math.round((pm / min) * 40 * 10) / 10,
      val36: Math.round(((s.pts + s.reb + s.ast + s.stl + s.blk - s.tov) / min) * 36 * 10) / 10,
      pts36: Math.round((s.pts / min) * 36 * 10) / 10,
      reb36: Math.round((s.reb / min) * 36 * 10) / 10,
      ast36: Math.round((s.ast / min) * 36 * 10) / 10
    };
  }
  function tablaAvanzada(st) {
    return st.equipos[st.clubId].plantilla
      .map(i => avanzadas(st, i))
      .filter(Boolean)
      .sort((a, b) => b.pm40 - a.pm40);
  }
  function mejoresQuintetos(st, n) {
    const Q = quim(st);
    return Object.keys(Q.quintetos)
      .map(k => ({ ids: k.split(','), min: Math.round(Q.quintetos[k].min), pm: Math.round(Q.quintetos[k].pm), quim: quimicaQuinteto(st, k.split(',')) }))
      .filter(x => x.min >= 15)
      .sort((a, b) => b.pm / b.min - a.pm / a.min)
      .slice(0, n || 5);
  }
  // ---------- Preparar el partido contra un rival ----------
  function recomendar(st, rivalId) {
    const q = P().tacticaValida(st, st.clubId).quinteto,
      rt = P().tacticaAuto(st, rivalId),
      rival = st.equipos[rivalId].plantilla
        .map(i => st.jugadores[i])
        .filter(Boolean)
        .sort((a, b) => b.ovr - a.ovr);
    const jug = Object.keys(JUGADAS)
        .map(id => [id, idoneidad(st, id, q, rt)])
        .sort((a, b) => b[1] - a[1])
        .filter(x => x[1] >= 0.35)
        .slice(0, 3),
      libro = jug.map(([id, v], i) => ({ id, w: 3 - i, ideal: v }));
    const propios = q.map(i => st.jugadores[i]).filter(Boolean),
      objetivos = rival.slice(0, 3),
      emp = {},
      usados = new Set();
    objetivos.forEach(o => {
      const d = propios.filter(p => !usados.has(p.id)).sort((a, b) => b.att.defPer + b.att.defInt + b.att.fisico * 0.5 - (a.att.defPer + a.att.defInt + a.att.fisico * 0.5))[0];
      if (d) {
        emp[d.id] = o.id;
        usados.add(d.id);
      }
    });
    return {
      libro,
      emp,
      razones: libro
        .map(x => JUGADAS[x.id].n + ' (idoneidad ' + Math.round(x.ideal * 100) + ' %)')
        .concat(Object.keys(emp).map(k => st.jugadores[k].nombre + ' marcará a ' + st.jugadores[emp[k]].nombre))
    };
  }
  function preparar(st, rivalId) {
    if (!activo(st)) return { ok: false, motivo: 'Este modo no gestiona la pizarra.' };
    const r = recomendar(st, rivalId),
      e = est(st);
    e.libro = r.libro.map(x => ({ id: x.id, w: x.w }));
    e.emp = r.emp;
    e.prep = { fecha: st.fecha, rival: rivalId };
    return { ok: true, razones: r.razones };
  }
  // ---------- Charla del descanso (directo) ----------
  const CHARLAS = {
    motivar: { n: 'Motivar', d: 'Si vas perdiendo, el equipo sale con más fuerza.' },
    calma: { n: 'Pedir calma', d: 'Menos pérdidas, un poco más de acierto.' },
    exigir: { n: 'Exigir', d: 'Más intensidad, pero el cansancio pasa factura.' },
    plan: { n: 'Repasar el plan', d: 'Recuerda las jugadas: mejor si las has trabajado.' }
  };
  function extenderDirecto(D, st) {
    D.charlaDescanso = function (lado, tipo) {
      const T = lado === 'A' ? D.A : D.B,
        c = CHARLAS[tipo];
      if (!c) return { ok: false, motivo: 'Charla desconocida.' };
      if (T.charlaHecha) return { ok: false, motivo: 'Ya has hablado en el descanso.' };
      T.charlaHecha = true;
      const dif = lado === 'A' ? D.A.score - D.B.score : D.B.score - D.A.score,
        lider = T.rot.reduce((s, e) => s + (GM.progresion ? GM.progresion.ext(e.p).liderazgo : 55), 0) / Math.max(1, T.rot.length),
        k = 0.7 + lider / 160;
      let bono = 0,
        txt = '';
      if (tipo === 'motivar') {
        bono = (dif < 0 ? 0.008 : 0.003) * k;
        T.rot.forEach(e => {
          e.p.estado.moral = clamp(e.p.estado.moral + 2, 20, 100);
        });
        txt = dif < 0 ? 'El vestuario sale mordiendo.' : 'El equipo mantiene la energía.';
      } else if (tipo === 'calma') {
        bono = 0.003 * k;
        T.bonus.tov = (T.bonus.tov || 0) - 0.008 * k;
        txt = 'El equipo sale tranquilo y cuida el balón.';
      } else if (tipo === 'exigir') {
        bono = 0.009 * k;
        T.rot.forEach(e => {
          e.f = Math.max(0.6, e.f * 0.99);
        });
        txt = 'Sales a por todas, pero se nota el esfuerzo.';
      } else {
        const pz = T.pz && T.pz.libro && T.pz.libro.length ? T.pz.libro.reduce((s, x) => s + x.dom, 0) / T.pz.libro.length : 0;
        bono = (0.002 + (pz / 100) * 0.007) * k;
        txt = pz > 30 ? 'Todos conocen sus jugadas.' : 'Repasas el plan, pero apenas habéis trabajado jugadas.';
      }
      T.bonus.charla = (T.bonus.charla || 0) + bono;
      return { ok: true, texto: txt, bono: Math.round(bono * 1000) / 1000 };
    };
  }
  // ---------- Entrenamiento de las jugadas (los lunes) ----------
  GM.bus.on('dia:avanzado', () => {
    const st = GM.state;
    if (!st || !st.pizarra || !activo(st) || U.weekday(st.fecha) !== 1) return;
    const e = st.pizarra,
      an = analitica(st, st.clubId);
    Object.keys(JUGADAS).forEach(id => {
      const en = e.libro.some(x => x.id === id);
      e.dominio[id] = clamp((e.dominio[id] || 0) + (en ? 3.5 + an * 0.8 : -0.6), 0, 100);
      e.vistas[id] = Math.max(0, (e.vistas[id] || 0) - (en ? 0 : 0.5));
    });
  });
  function selfTest() {
    const st = { modo: 'gestor', clubId: 'a', fecha: '2026-10-05', equipos: { a: { id: 'a', plantilla: [] } }, jugadores: {}, instalaciones: {} };
    const L = ['PG', 'SG', 'SF', 'PF', 'C'].map((pos, i) => {
      const p = GM.mkJugador('a', i + 1, 'J' + i, pos, 26, 200, 'ES', 'UE', 72, 72, 'E', 1e6, 2028);
      p.id = 'a-' + i;
      st.jugadores[p.id] = p;
      st.equipos.a.plantilla.push(p.id);
      return p.id;
    });
    if (
      !fijarLibro(st, [
        { id: 'pick_roll', w: 3 },
        { id: 'poste', w: 2 }
      ]).ok ||
      fijarLibro(st, [{ id: 'x', w: 1 }]).ok ||
      fijarLibro(st, [
        { id: 'pick_roll', w: 1 },
        { id: 'pick_roll', w: 1 }
      ]).ok
    )
      return false;
    const i = idoneidad(st, 'pick_roll', L);
    if (!(i > 0 && i <= 1)) return false;
    if (!fijarEmparejamiento(st, L[0], L[1]).ok || est(st).emp[L[0]] !== L[1]) return false;
    fijarMinutos(st, L[0], 33);
    if (est(st).minutos[L[0]] !== 33) return false;
    const q = quimicaQuinteto(st, L);
    return q >= 10 && q <= 99 && valorPar({ min: 800, pm: 40 }) > valorPar(null) && Object.keys(JUGADAS).length === 8;
  }
  GM.tacticaPlus = {
    JUGADAS,
    CHARLAS,
    est,
    estado: est,
    fijarLibro,
    idoneidad,
    dominio,
    libroIA,
    equipo,
    fijarEmparejamiento,
    fijarMinutos,
    aplicarMinutos,
    ajustePm,
    quimicaQuinteto,
    bonoQuim,
    quimicaEquipo,
    alinear,
    registrarStint,
    cierrePartido,
    avanzadas,
    tablaAvanzada,
    mejoresQuintetos,
    recomendar,
    preparar,
    extenderDirecto,
    valorPar,
    analitica,
    selfTest
  };
  GM.register && GM.register('tacticaPlus', GM.tacticaPlus);
})();
