/* COPAS (GM.mods.copas)
   Cada liga nacional tiene su copa de eliminatoria única entre los 8 mejores clasificados en la fecha de la competición:
   Copa del Rey (ACB), NBA Cup, Copa de Grecia, BBL-Pokal, Coppa Italia y Copa de Turquía. Cuartos, semifinales y final con el mejor clasificado como local.
   Expone: estado, copa, partidosClub, selfTest. Escribe state.copas[id] = { nombre, liga, estado, rondas:[{nombre,partidos:[ids]}], campeon }.
   Los partidos son entradas del calendario con fase 'copa' (no puntúan en la liga). El campeón se añade a state.historial. */
(function () {
  const U = GM.util;
  const yearOf = st => parseInt(st.temporada.slice(0, 4), 10);
  const DEF = {
    COPA_REY: { liga: 'ACB', nombre: 'Copa del Rey', fecha: y => (y + 1) + '-02-11', min: 14 },
    NBA_CUP: { liga: 'NBA', nombre: 'NBA Cup', fecha: y => y + '-12-02', min: 20 },
    COPA_GRECIA: { liga: 'GBL', nombre: 'Copa de Grecia', fecha: y => (y + 1) + '-02-20', min: 14 },
    POKAL: { liga: 'BBL', nombre: 'BBL-Pokal', fecha: y => (y + 1) + '-02-18', min: 14 },
    COPPA_ITALIA: { liga: 'LEGA', nombre: 'Coppa Italia', fecha: y => (y + 1) + '-02-16', min: 12 },
    COPA_TURQUIA: { liga: 'BSL', nombre: 'Copa de Turquía', fecha: y => (y + 1) + '-02-25', min: 14 }
  };
  const RONDAS = ['Cuartos de final', 'Semifinales', 'Final'];
  const getG = (st, id) => st.calendario.find(g => g.id === id);
  const ocupado = (st, d, a, b) => st.calendario.some(g => g.fecha === d && (g.local === a || g.visitante === a || g.local === b || g.visitante === b));
  function libre(st, d, a, b) { let k = 0; while (ocupado(st, d, a, b) && k++ < 40) d = U.addDays(d, 1); return d; }

  function iniciar(st) {
    st.copas = {};
    Object.keys(DEF).forEach(id => { if (st.ligas[DEF[id].liga]) st.copas[id] = { nombre: DEF[id].nombre, liga: DEF[id].liga, estado: 'pendiente', fecha: DEF[id].fecha(yearOf(st)), rondas: [], campeon: null }; });
  }
  function crearRonda(st, c, idx, pares, desde) {
    const fecha0 = U.addDays(desde, idx === 0 ? 0 : 2), r = { nombre: RONDAS[idx], partidos: [] };
    pares.forEach((p, i) => {
      const f = libre(st, U.addDays(fecha0, idx === 0 ? Math.floor(i / 2) : Math.floor(i)), p[0], p[1]);
      const g = { id: 'g' + (++st.seq), fecha: f, comp: c.liga, fase: 'copa', copa: c.id, ronda: idx + 1, jornada: 0, local: p[0], visitante: p[1], resultado: null };
      st.calendario.push(g); r.partidos.push(g.id);
    });
    c.rondas.push(r);
  }
  function ganador(g) { return g.resultado.local > g.resultado.visitante ? g.local : g.visitante; }

  GM.bus.on('dia:avanzado', function () {
    const st = GM.state; if (!st || !st.copas) return;
    Object.keys(st.copas).forEach(id => {
      const c = st.copas[id]; c.id = id; if (c.estado === 'fin') return;
      if (c.estado === 'pendiente') {
        if (st.fecha < c.fecha) return;
        const tabla = GM.mods.competiciones.clasificacion(st, c.liga);
        if (!tabla.length || tabla[0].pj < DEF[id].min * 0.6) return;
        const top = tabla.slice(0, 8).map(r => r.equipoId);
        c.estado = 'activa'; c.participantes = top;
        crearRonda(st, c, 0, [[top[0], top[7]], [top[3], top[4]], [top[1], top[6]], [top[2], top[5]]], st.fecha);
        GM.noticia(st, c.nombre + ': arrancan los cuartos de final.');
        return;
      }
      const r = c.rondas[c.rondas.length - 1], gs = r.partidos.map(i => getG(st, i));
      if (!gs.every(g => g && g.resultado)) return;
      const gan = gs.map(ganador), ult = gs.reduce((m, g) => g.fecha > m ? g.fecha : m, gs[0].fecha);
      if (gan.length === 1) {
        c.campeon = gan[0]; c.estado = 'fin';
        st.historial.push({ temporada: st.temporada, comp: id, campeon: c.campeon });
        GM.noticia(st, '🏆 ' + st.equipos[c.campeon].nombre + ' gana la ' + c.nombre + '.');
        GM.bus.emit('copa:fin', { copa: id, campeon: c.campeon });
        return;
      }
      const pares = [];
      for (let i = 0; i < gan.length; i += 2) pares.push(c.participantes.indexOf(gan[i]) < c.participantes.indexOf(gan[i + 1]) ? [gan[i], gan[i + 1]] : [gan[i + 1], gan[i]]);
      crearRonda(st, c, c.rondas.length, pares, ult);
    });
  });
  GM.bus.on('temporada:nueva', function () { const st = GM.state; if (st && st.copas) iniciar(st); });

  GM.compNombre = (st, comp) => st.ligas[comp] ? st.ligas[comp].nombre : (st.copas && st.copas[comp] ? st.copas[comp].nombre : comp);
  function estado(st) { return st.copas || {}; }
  function copa(st, id) {
    const c = st.copas[id]; if (!c) return null;
    return Object.assign({ id }, c, { rondas: c.rondas.map(r => ({ nombre: r.nombre, partidos: r.partidos.map(i => getG(st, i)).filter(Boolean) })) });
  }
  function partidosClub(st, clubId) { return st.calendario.filter(g => g.fase === 'copa' && (g.local === clubId || g.visitante === clubId)); }
  function nuevaPartida(st) { iniciar(st); }
  function selfTest() {
    const st = { temporada: '2026-27', fecha: '2027-02-12', seq: 0, noticias: [], historial: [], calendario: [], ligas: { ACB: { nombre: 'ACB', equipos: [] } }, equipos: {} };
    ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].forEach(i => { st.equipos[i] = { nombre: i.toUpperCase() }; });
    iniciar(st); const c = st.copas.COPA_REY; c.id = 'COPA_REY'; c.participantes = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    crearRonda(st, c, 0, [['a', 'h'], ['d', 'e'], ['b', 'g'], ['c', 'f']], st.fecha); c.estado = 'activa';
    return st.calendario.length === 4 && st.calendario.every(g => g.fase === 'copa') && c.rondas[0].nombre === 'Cuartos de final' && ganador({ local: 'x', visitante: 'y', resultado: { local: 80, visitante: 70 } }) === 'x';
  }
  GM.register('copas', { estado, copa, partidosClub, nuevaPartida, selfTest, DEF });
})();
