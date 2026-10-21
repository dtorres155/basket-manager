/* PRETEMPORADA, TORNEOS DE VERANO Y SELECCIÓN (GM.mods.pretemporada)
   Al empezar cada verano (temporada:nueva) el club juega cuatro amistosos y un torneo de verano de cuatro equipos (semifinal y final o tercer puesto) antes de la liga.
   Los amistosos son entradas del calendario con fase 'amistoso' (no cuentan para clasificación, estadísticas ni taquilla): sirven para ganar química y forma, con el
   riesgo de alguna lesión. El plan de pretemporada (ligero, normal o duro) cambia ese equilibrio.
   Cada cuatro años hay ventana de selecciones: Mundial (año 3 del ciclo: 2027, 2031), Juegos Olímpicos (2028, 2032) y Eurobasket (2029, 2033). Las selecciones salen de los
   mejores jugadores de cada país (nac); se juega con grupos y eliminatorias; los convocados de tu club llegan cansados, con riesgo de lesión y, si triunfan, con más ánimo y
   algo de progresión. En carrera, tu jugador puede ser convocado según su nivel dentro de su país.
   Expone: estado, setPlan, amistososClub, ventanaDe, resolverSeleccion, selfTest. Escribe state.pretemp = { temp, plan, quimica, amistosos, torneo, seleccion, hist }. */
(function () {
  const U = GM.util,
    yearOf = st => parseInt(st.temporada.slice(0, 4), 10);
  const PAISES = {
    ES: 'España',
    FR: 'Francia',
    US: 'Estados Unidos',
    DE: 'Alemania',
    IT: 'Italia',
    GR: 'Grecia',
    TR: 'Turquía',
    RS: 'Serbia',
    LT: 'Lituania',
    SI: 'Eslovenia',
    CA: 'Canadá',
    AU: 'Australia',
    HR: 'Croacia',
    LV: 'Letonia',
    GB: 'Gran Bretaña',
    BR: 'Brasil',
    AR: 'Argentina',
    NG: 'Nigeria',
    IL: 'Israel',
    FI: 'Finlandia',
    PL: 'Polonia',
    ME: 'Montenegro',
    BA: 'Bosnia',
    GE: 'Georgia',
    UA: 'Ucrania',
    CZ: 'Chequia',
    SE: 'Suecia',
    BE: 'Bélgica',
    NL: 'Países Bajos',
    PT: 'Portugal',
    JP: 'Japón',
    CN: 'China',
    DO: 'República Dominicana',
    PR: 'Puerto Rico',
    CM: 'Camerún',
    SN: 'Senegal',
    MX: 'México',
    EE: 'Estonia',
    HU: 'Hungría',
    BG: 'Bulgaria',
    RO: 'Rumanía',
    MK: 'Macedonia del Norte',
    CD: 'R. D. del Congo',
    TN: 'Túnez',
    EG: 'Egipto'
  };
  const EUROPA = [
    'ES',
    'FR',
    'DE',
    'IT',
    'GR',
    'TR',
    'RS',
    'LT',
    'SI',
    'HR',
    'LV',
    'GB',
    'IL',
    'FI',
    'PL',
    'ME',
    'BA',
    'GE',
    'UA',
    'CZ',
    'SE',
    'BE',
    'NL',
    'PT',
    'EE',
    'HU',
    'BG',
    'RO',
    'MK'
  ];
  const PLANES = {
    ligero: { etq: 'Ligera', desc: 'Pocas cargas: llegas fresco, con menos química.', q: 0.6, forma: 6, lesion: 0.5 },
    normal: { etq: 'Normal', desc: 'Equilibrada.', q: 1, forma: 10, lesion: 1 },
    duro: { etq: 'Dura', desc: 'Mucha química y forma, pero más riesgo de lesión y cansancio.', q: 1.5, forma: 14, lesion: 2 }
  };
  const nombrePais = c => PAISES[c] || c;
  function ventanaDe(y) {
    const k = y % 4;
    if (k === 3) return { id: 'MUNDIAL', nombre: 'Mundial de baloncesto ' + y, desde: y + '-08-25', hasta: y + '-09-10', europa: false };
    if (k === 0) return { id: 'JJOO', nombre: 'Juegos Olímpicos ' + y, desde: y + '-07-26', hasta: y + '-08-11', europa: false, n: 12 };
    if (k === 1) return { id: 'EUROBASKET', nombre: 'Eurobasket ' + y, desde: y + '-08-27', hasta: y + '-09-14', europa: true };
    return null;
  }
  function estado(st) {
    return st.pretemp || (st.pretemp = { temp: null, plan: 'normal', quimica: 0, amistosos: [], torneo: null, seleccion: null, hist: [] });
  }
  const getG = (st, id) => st.calendario.find(g => g.id === id);
  const ocupado = (st, d, ids) => st.calendario.some(g => g.fecha === d && (ids.indexOf(g.local) >= 0 || ids.indexOf(g.visitante) >= 0));
  function libre(st, d, ids) {
    let k = 0;
    while (ocupado(st, d, ids) && k++ < 30) d = U.addDays(d, 1);
    return d;
  }
  const ligaDe = (st, id) => GM.mods.mercado.ligaDe(st, id);
  function rivales(st, club, n) {
    const rep = st.equipos[club].reputacion,
      lg = ligaDe(st, club),
      r = U.hash(club + st.temporada + 'pre');
    const todos = Object.keys(st.equipos).filter(id => id !== club && st.equipos[id].plantilla.length >= 8);
    const cerca = todos.map(id => ({ id, d: Math.abs(st.equipos[id].reputacion - rep) + (ligaDe(st, id) === lg ? 0 : 6) + (U.hash(id + r) % 9) })).sort((a, b) => a.d - b.d);
    return cerca
      .slice(0, n * 3)
      .filter((_, i) => i % 3 !== 2 || i < n)
      .slice(0, n)
      .map(x => x.id);
  }
  function crear(st, fecha, local, visitante, extra) {
    const f = libre(st, fecha, [local, visitante]),
      g = Object.assign({ id: 'g' + ++st.seq, fecha: f, comp: 'AMISTOSO', fase: 'amistoso', jornada: 0, local, visitante, resultado: null }, extra || {});
    st.calendario.push(g);
    return g;
  }
  function iniciarVerano(st) {
    const p = estado(st),
      club = st.clubId,
      y = yearOf(st);
    p.temp = st.temporada;
    p.amistosos = [];
    p.torneo = null;
    p.quimica = 0;
    p.seleccion = null;
    if (!st.equipos[club]) return;
    const riv = rivales(st, club, 9);
    // cuatro amistosos entre el 18 de agosto y el 20 de septiembre, alternando local y visitante
    [y + '-08-19', y + '-08-26', y + '-09-02', y + '-09-16'].forEach((f, i) => {
      const o = riv[i];
      if (!o) return;
      const g = i % 2 ? crear(st, f, o, club) : crear(st, f, club, o);
      p.amistosos.push(g.id);
    });
    // torneo de verano de cuatro equipos: semifinales el 9 de septiembre, final y tercer puesto el 11
    const t = riv.slice(4, 7);
    if (t.length === 3) {
      // tres formatos (punto 66): copa de cuatro equipos, cuadrangular a una vuelta y torneo de seis con dos grupos y final
      const formato = ['copa', 'liguilla', 'grupos'][U.hash(club + st.temporada + 'fmt') % 3],
        anfi = st.equipos[club].reputacion >= 55 ? 'Torneo Ciudad de ' + st.equipos[club].ciudad : 'Trofeo de verano de ' + st.equipos[t[0]].ciudad,
        T = { nombre: anfi, equipos: [club].concat(t), semis: [], formato, partidos: [], final: null, tercero: null, campeon: null };
      if (formato === 'copa') {
        const s1 = crear(st, y + '-09-09', club, t[0], { torneo: true, ronda: 'Semifinal' }),
          s2 = crear(st, y + '-09-09', t[1], t[2], { torneo: true, ronda: 'Semifinal' });
        T.semis = [s1.id, s2.id];
      } else if (formato === 'liguilla') {
        T.nombre = 'Cuadrangular ' + anfi.replace(/^(Torneo|Trofeo) /, '');
        [
          [
            0,
            [
              [club, t[0]],
              [t[1], t[2]]
            ]
          ],
          [
            2,
            [
              [club, t[1]],
              [t[0], t[2]]
            ]
          ],
          [
            4,
            [
              [club, t[2]],
              [t[0], t[1]]
            ]
          ]
        ].forEach(([d, ps], j) => ps.forEach(([a, b]) => T.partidos.push(crear(st, U.addDays(y + '-09-08', d), a, b, { torneo: true, ronda: 'Jornada ' + (j + 1) }).id)));
      } else {
        const r5 = riv.slice(4, 9);
        if (r5.length === 5) {
          T.nombre = 'Torneo de seis equipos ' + anfi.replace(/^(Torneo|Trofeo) /, '');
          T.equipos = [club].concat(r5);
          T.grupos = [
            [club, r5[0], r5[1]],
            [r5[2], r5[3], r5[4]]
          ];
          T.grupos.forEach((G, gi) =>
            [
              [0, 1],
              [1, 2],
              [0, 2]
            ].forEach(([a, b], k) => T.partidos.push(crear(st, U.addDays(y + '-09-07', k + (gi ? 0 : 0)), G[a], G[b], { torneo: true, ronda: 'Grupo ' + 'AB'[gi] }).id))
          );
        } else T.formato = 'copa';
        if (T.formato === 'copa') {
          const s1 = crear(st, y + '-09-09', club, t[0], { torneo: true, ronda: 'Semifinal' }),
            s2 = crear(st, y + '-09-09', t[1], t[2], { torneo: true, ronda: 'Semifinal' });
          T.semis = [s1.id, s2.id];
        }
      }
      p.torneo = T;
    }
    GM.noticia(st, 'Empieza la pretemporada: cuatro amistosos y el ' + (p.torneo ? p.torneo.nombre : 'torneo de verano') + '.');
  }
  function ganadorDe(g) {
    return g.resultado.local > g.resultado.visitante ? g.local : g.visitante;
  }
  function perdedorDe(g) {
    return g.resultado.local > g.resultado.visitante ? g.visitante : g.local;
  }
  // Tras los amistosos: química, forma y alguna lesión; el torneo avanza de ronda
  GM.bus.on('amistoso:jugado', function (e) {
    const st = GM.state;
    if (!st || !st.pretemp) return;
    const g = e.partido,
      p = estado(st),
      club = st.clubId,
      plan = PLANES[p.plan] || PLANES.normal;
    if (g.torneo && p.torneo && g.ronda === 'Semifinal' && p.torneo.semis.every(i => getG(st, i) && getG(st, i).resultado) && !p.torneo.final) {
      const [a, b] = p.torneo.semis.map(i => getG(st, i)),
        d = U.addDays(a.fecha, 2);
      p.torneo.final = crear(st, d, ganadorDe(a), ganadorDe(b), { torneo: true, ronda: 'Final' }).id;
      p.torneo.tercero = crear(st, d, perdedorDe(a), perdedorDe(b), { torneo: true, ronda: 'Tercer puesto' }).id;
    }
    if (g.torneo && g.ronda === 'Final' && p.torneo && !p.torneo.campeon) {
      p.torneo.campeon = ganadorDe(g);
      const nom = st.equipos[p.torneo.campeon].nombre;
      GM.noticia(st, '🏆 ' + nom + ' gana el ' + p.torneo.nombre + '.');
      st.historial.push({ temporada: st.temporada, comp: 'TORNEO_VERANO', campeon: p.torneo.campeon });
      if (p.torneo.campeon === club) {
        st.equipos[club].plantilla.forEach(i => {
          const j = st.jugadores[i];
          if (j) j.estado.moral = U.clamp(j.estado.moral + 4, 20, 100);
        });
        p.quimica = U.clamp(p.quimica + 4, 0, 100);
      }
    }
    if (g.torneo && p.torneo && p.torneo.formato && p.torneo.formato !== 'copa') avanzaTorneo(st, p);
    if (g.local === club) taquillaAmistoso(st, g); // los amistosos en casa dejan taquilla (punto 66)
    if (g.local !== club && g.visitante !== club) return;
    p.quimica = U.clamp(p.quimica + Math.round(5 * plan.q), 0, 100);
    const pl = st.equipos[club].plantilla.map(i => st.jugadores[i]).filter(Boolean);
    pl.forEach(j => {
      j.estado.forma = U.clamp(j.estado.forma + plan.forma * 0.3, 40, 100);
      j.estado.fatiga = U.clamp((j.estado.fatiga || 0) + (p.plan === 'duro' ? 8 : 3), 0, 100);
    });
    if (GM.rng.next() < (0.03 * plan.lesion * pl.length) / 12 && pl.length) {
      const j = GM.rng.pick(pl);
      if (!(j.estado.lesion && j.estado.lesion.dias > 0)) {
        j.estado.lesion = { tipo: 'Molestias de pretemporada', dias: GM.rng.int(8, 28) };
        GM.noticia(st, 'Pretemporada: ' + j.nombre + ' se lesiona en el amistoso (' + j.estado.lesion.dias + ' días).');
      }
    }
  });
  // Tabla de un torneo a partir de sus partidos del calendario (victorias y diferencia de puntos)
  function tablaTorneo(st, ids, equipos) {
    const T = {};
    equipos.forEach(e => {
      T[e] = { equipoId: e, v: 0, pf: 0, pc: 0 };
    });
    ids
      .map(i => getG(st, i))
      .filter(g => g && g.resultado)
      .forEach(g => {
        const a = T[g.local],
          b = T[g.visitante];
        if (!a || !b) return;
        a.pf += g.resultado.local;
        a.pc += g.resultado.visitante;
        b.pf += g.resultado.visitante;
        b.pc += g.resultado.local;
        if (g.resultado.local > g.resultado.visitante) a.v++;
        else b.v++;
      });
    return Object.keys(T)
      .map(k => T[k])
      .sort((x, y) => y.v - x.v || y.pf - y.pc - (x.pf - x.pc) || y.pf - x.pf);
  }
  function avanzaTorneo(st, p) {
    const T = p.torneo,
      hechos = ids => ids.every(i => getG(st, i) && getG(st, i).resultado),
      club = st.clubId;
    if (T.campeon) return;
    if (T.formato === 'liguilla' && hechos(T.partidos)) {
      const tb = tablaTorneo(st, T.partidos, T.equipos);
      T.tabla = tb;
      T.campeon = tb[0].equipoId;
    } else if (T.formato === 'grupos') {
      if (!T.final && hechos(T.partidos)) {
        const t0 = tablaTorneo(st, T.partidos.slice(0, 3), T.grupos[0]),
          t1 = tablaTorneo(st, T.partidos.slice(3), T.grupos[1]),
          d = U.addDays(getG(st, T.partidos[T.partidos.length - 1]).fecha, 2);
        T.tablas = [t0, t1];
        T.final = crear(st, d, t0[0].equipoId, t1[0].equipoId, { torneo: true, ronda: 'Final' }).id;
        T.tercero = crear(st, d, t0[1].equipoId, t1[1].equipoId, { torneo: true, ronda: 'Tercer puesto' }).id;
      }
    }
    if (T.campeon) {
      const nom = st.equipos[T.campeon].nombre;
      GM.noticia(st, '🏆 ' + nom + ' gana el ' + T.nombre + '.');
      st.historial.push({ temporada: st.temporada, comp: 'TORNEO_VERANO', campeon: T.campeon });
      if (T.campeon === club) {
        st.equipos[club].plantilla.forEach(i => {
          const j = st.jugadores[i];
          if (j) j.estado.moral = U.clamp(j.estado.moral + 4, 20, 100);
        });
        p.quimica = U.clamp(p.quimica + 4, 0, 100);
      }
    }
  }
  // Taquilla de un amistoso en casa: menos público y entradas más baratas que en la liga, algo más en un torneo
  function taquillaAmistoso(st, g) {
    const F = GM.mods.finanzas,
      eq = st.equipos[g.local];
    if (!F || !st.finanzas || !st.finanzas[g.local] || !g.resultado) return;
    const m = GM.mods,
      cl = (st.ciudad && st.ciudad[g.local]) || { ambiente: 50, aficion: 50 };
    const aforo = m.estadio && m.estadio.aforo ? m.estadio.aforo(st, g.local) : eq.pabellon.aforo,
      ciu = m.ciudad ? m.ciudad.modificadores(st, g.local) : { asistencia: 1, ingresos: 1 },
      eco = GM.economia ? GM.economia.factorClub(st, g.local).taquilla : 1;
    const fr = U.clamp((0.22 + (0.25 * eq.reputacion) / 100 + (0.1 * cl.ambiente) / 100 + (g.torneo ? 0.1 : 0)) * ciu.asistencia, 0.2, 0.85),
      asistencia = Math.round(aforo * fr),
      precio = 16 * (0.6 + (eq.reputacion / 100) * 0.8) * (g.torneo ? 1.2 : 1),
      entradas = Math.round(asistencia * precio * ciu.ingresos * eco);
    g.resultado.asistencia = asistencia;
    g.resultado.ingresos = entradas;
    F.registrar(st, g.local, 'Taquilla del amistoso' + (g.torneo ? ' (torneo)' : ''), entradas);
  }
  function setPlan(st, id) {
    if (!PLANES[id]) return { ok: false, motivo: 'Plan desconocido.' };
    estado(st).plan = id;
    return { ok: true };
  }

  // ---------- Selecciones ----------
  function seleccionesDe(st, v) {
    const por = {};
    Object.values(st.jugadores).forEach(j => {
      if (!j || !j.nac || j.edad > 38 || j.edad < 18) return;
      (por[j.nac] = por[j.nac] || []).push(j);
    });
    const out = [];
    Object.keys(por).forEach(c => {
      if (v.europa && EUROPA.indexOf(c) < 0) return;
      const L = por[c]
        .slice()
        .sort((a, b) => b.ovr - a.ovr)
        .slice(0, 12);
      if (L.length < 8) return;
      const w = [1.3, 1.2, 1.1, 1, 0.9, 0.8, 0.6, 0.5],
        rating = L.slice(0, 8).reduce((s, j, i) => s + j.ovr * w[i], 0) / w.reduce((s, x) => s + x, 0);
      out.push({ pais: c, nombre: nombrePais(c), rating: Math.round(rating * 10) / 10, jugadores: L.map(j => j.id) });
    });
    return out.sort((a, b) => b.rating - a.rating);
  }
  function partidoSel(a, b, rnd) {
    const d = a.rating - b.rating,
      base = 74 + rnd() * 12,
      sa = Math.round(base + d * 0.55 + (rnd() - 0.5) * 22),
      sb = Math.round(base - d * 0.55 + (rnd() - 0.5) * 22);
    return sa === sb ? { a: sa + 1, b: sb } : { a: sa, b: sb };
  }
  function resolverSeleccion(st, v) {
    const p = estado(st),
      y = parseInt(v.desde.slice(0, 4), 10),
      seed = U.hash(st.seed + 'sel' + y);
    let s = seed >>> 0;
    const rnd = () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const todas = seleccionesDe(st, v),
      n = v.n || 16,
      eq = todas.slice(0, n);
    if (eq.length < 8) return null;
    // tu jugador (carrera) puede ser convocado: entra en la lista de su país si está entre los 12 mejores
    const yo = st.modo === 'carrera' ? st.jugadores.yo : null;
    if (yo && yo.nac) {
      const s2 = todas.find(x => x.pais === yo.nac);
      const rank = Object.values(st.jugadores).filter(j => j && j.nac === yo.nac && j.ovr > yo.ovr).length;
      if (rank < 12 && s2 && eq.indexOf(s2) >= 0 && s2.jugadores.indexOf('yo') < 0) {
        s2.jugadores.push('yo');
        s2.convocadoYo = true;
      }
    }
    // grupos de cuatro por serpentina y todos contra todos
    const nG = Math.floor(eq.length / 4),
      grupos = Array.from({ length: nG }, () => []);
    eq.forEach((t, i) => {
      const r = Math.floor(i / nG);
      grupos[r % 2 ? nG - 1 - (i % nG) : i % nG].push(t);
    });
    const tabla = grupos.map(G => {
      const T = G.map(t => ({ t, v: 0, pf: 0, pc: 0 }));
      for (let i = 0; i < T.length; i++)
        for (let j = i + 1; j < T.length; j++) {
          const r = partidoSel(T[i].t, T[j].t, rnd);
          T[i].pf += r.a;
          T[i].pc += r.b;
          T[j].pf += r.b;
          T[j].pc += r.a;
          if (r.a > r.b) T[i].v++;
          else T[j].v++;
        }
      return T.sort((a, b) => b.v - a.v || b.pf - b.pc - (a.pf - a.pc));
    });
    let pasan = [];
    tabla.forEach(T => {
      pasan.push(T[0].t, T[1].t);
    });
    if (nG === 3) {
      pasan.push(
        tabla.map(T => T[2]).sort((a, b) => b.v - a.v || b.pf - b.pc - (a.pf - a.pc))[0].t,
        tabla.map(T => T[2]).sort((a, b) => b.v - a.v || b.pf - b.pc - (a.pf - a.pc))[1].t
      );
    }
    const ronda = L => {
      const w = [],
        l = [];
      for (let i = 0; i < L.length / 2; i++) {
        const a = L[i],
          b = L[L.length - 1 - i],
          r = partidoSel(a, b, rnd);
        if (r.a > r.b) {
          w.push(a);
          l.push(b);
        } else {
          w.push(b);
          l.push(a);
        }
      }
      return { w, l };
    };
    const qf = ronda(pasan.slice(0, 8)),
      sf = ronda(qf.w),
      tercero = ronda(sf.l).w[0],
      fin = ronda(sf.w),
      campeon = fin.w[0],
      sub = fin.l[0];
    // mejor jugador: el mejor de la selección campeona, con algo de azar
    const mvpId =
      campeon.jugadores.slice().sort((a, b) => (st.jugadores[b] ? st.jugadores[b].ovr : 0) - (st.jugadores[a] ? st.jugadores[a].ovr : 0))[rnd() < 0.7 ? 0 : 1] ||
      campeon.jugadores[0];
    const res = {
      id: v.id,
      nombre: v.nombre,
      anio: y,
      desde: v.desde,
      hasta: v.hasta,
      campeon: campeon.pais,
      subcampeon: sub.pais,
      tercero: tercero.pais,
      mvp: mvpId,
      participantes: eq.map(t => t.pais),
      convocados: []
    };
    // efectos sobre los jugadores de tu club
    const club = st.clubId,
      mios = new Set(st.equipos[club].plantilla.concat(['yo']));
    eq.forEach(t =>
      t.jugadores.forEach(id => {
        const j = st.jugadores[id];
        if (!j || (!mios.has(id) && !(id === 'yo'))) return;
        const podio = t.pais === campeon.pais ? 3 : t.pais === sub.pais ? 2 : t.pais === tercero.pais ? 1 : 0;
        j.estado.fatiga = U.clamp((j.estado.fatiga || 0) + 25 + podio * 3, 0, 100);
        j.estado.moral = U.clamp(j.estado.moral + (podio ? 6 + podio * 2 : -2), 20, 100);
        if (rnd() < 0.045 && !(j.estado.lesion && j.estado.lesion.dias > 0)) {
          j.estado.lesion = { tipo: 'Lesión con la selección', dias: 18 + Math.floor(rnd() * 50) };
          GM.noticia(st, j.nombre + ' vuelve lesionado de la selección (' + j.estado.lesion.dias + ' días).');
        }
        if (podio && j.edad <= 27 && rnd() < 0.3 && GM.setOvr) {
          j.xp = (j.xp || 0) + 0.3;
        }
        res.convocados.push({ id, pais: t.pais, podio });
      })
    );
    if (yo && res.convocados.some(c => c.id === 'yo') && st.carrera) {
      try {
        st.carrera.fama = Math.min(100, st.carrera.fama + 2 + (res.convocados.find(c => c.id === 'yo').podio ? 3 : 0));
      } catch (e) {
        /* fama protegida */
      }
    }
    p.seleccion = res;
    p.hist.unshift(res);
    if (p.hist.length > 12) p.hist.pop();
    GM.noticia(st, '🏆 ' + nombrePais(campeon.pais) + ' gana el ' + v.nombre + ' (final contra ' + nombrePais(sub.pais) + ').');
    const mi = res.convocados.filter(c => c.id !== 'yo');
    if (mi.length)
      GM.noticia(
        st,
        'Tu club cede ' +
          mi.length +
          (mi.length === 1 ? ' jugador' : ' jugadores') +
          ' al ' +
          v.nombre +
          ': ' +
          mi
            .slice(0, 4)
            .map(c => st.jugadores[c.id].nombre)
            .join(', ') +
          '.'
      );
    st.historial.push({ temporada: st.temporada, comp: v.id, campeon: 'pais:' + campeon.pais });
    return res;
  }
  // Los convocados se anuncian al empezar el verano; el torneo se resuelve al llegar su fecha de inicio (y se cuenta con sus efectos)
  function anunciar(st) {
    const y = yearOf(st),
      v = ventanaDe(y);
    if (!v) return;
    const p = estado(st);
    p.ventana = { id: v.id, nombre: v.nombre, desde: v.desde, hasta: v.hasta, resuelta: false };
    const todas = seleccionesDe(st, v).slice(0, v.n || 16),
      club = st.clubId,
      mios = [];
    todas.forEach(t =>
      t.jugadores.forEach(id => {
        if (id !== 'yo' && st.equipos[club].plantilla.indexOf(id) >= 0) mios.push(st.jugadores[id].nombre + ' (' + nombrePais(t.pais) + ')');
      })
    );
    if (GM.seleccion) {
      const V = GM.seleccion.crear(st, { id: v.id, nombre: v.nombre, desde: v.desde, hasta: v.hasta, europa: v.id === 'EUROBASKET', n: v.id === 'JJOO' ? 12 : 16 });
      if (V) p.ventana = V;
    }
    GM.noticia(
      st,
      v.nombre +
        ': ' +
        (mios.length
          ? 'convocados de tu club: ' + mios.slice(0, 5).join(', ') + '. Decide si los dejas ir en Calendario, Pretemporada.'
          : 'ninguno de tus jugadores está convocado.')
    );
  }
  GM.bus.on('temporada:nueva', function () {
    const st = GM.state;
    if (!st || !st.calendario) return;
    iniciarVerano(st);
    anunciar(st);
  });
  GM.bus.on('dia:avanzado', function () {
    const st = GM.state;
    if (!st || !st.pretemp || !st.pretemp.ventana || st.pretemp.ventana.resuelta) return;
    const v = st.pretemp.ventana;
    if (GM.seleccion && v.equipos) {
      GM.seleccion.dia(st);
      return;
    }
    if (st.fecha >= v.hasta) {
      v.resuelta = true;
      resolverSeleccion(st, { id: v.id, nombre: v.nombre, desde: v.desde, hasta: v.hasta, europa: v.id === 'EUROBASKET', n: v.id === 'JJOO' ? 12 : 16 });
    }
  });
  function amistososClub(st, club) {
    return st.calendario.filter(g => g.fase === 'amistoso' && (g.local === (club || st.clubId) || g.visitante === (club || st.clubId)));
  }
  function nuevaPartida(st) {
    st.pretemp = { temp: null, plan: 'normal', quimica: 0, amistosos: [], torneo: null, seleccion: null, hist: [], ventana: null };
  }
  function selfTest() {
    const v = ventanaDe(2027),
      w = ventanaDe(2028),
      e = ventanaDe(2029);
    if (!v || v.id !== 'MUNDIAL' || w.id !== 'JJOO' || e.id !== 'EUROBASKET' || ventanaDe(2030)) return false;
    const st = { jugadores: {}, seed: 1, noticias: [], historial: [], temporada: '2027-28', equipos: { a: { plantilla: [] } }, clubId: 'a', modo: 'gestor' };
    ['ES', 'FR', 'US', 'DE', 'IT', 'GR', 'TR', 'RS', 'LT', 'SI', 'CA', 'AU', 'HR', 'LV', 'GB', 'BR'].forEach((c, k) => {
      for (let i = 0; i < 10; i++) {
        const id = c + i;
        st.jugadores[id] = { id, nombre: id, nac: c, ovr: 80 - k - i, edad: 27, estado: { moral: 70, fatiga: 0, forma: 80, lesion: null } };
        if (c === 'ES' && i < 2) st.equipos.a.plantilla.push(id);
      }
    });
    const r = resolverSeleccion(st, { id: 'MUNDIAL', nombre: 'Mundial', desde: '2027-08-25', hasta: '2027-09-10', europa: false });
    return !!r && !!r.campeon && r.participantes.length === 16 && r.convocados.length >= 2 && st.jugadores.ES0.estado.fatiga >= 25;
  }
  GM.register('pretemporada', {
    tablaTorneo,
    taquillaAmistoso,
    estado,
    setPlan,
    amistososClub,
    ventanaDe,
    resolverSeleccion,
    seleccionesDe,
    nombrePais,
    nuevaPartida,
    selfTest,
    PLANES
  });
})();
