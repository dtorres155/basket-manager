/* LA CIUDAD CRECE CON EL CLUB (GM.mods.crecimiento)
   Cuando al club le va bien, su ciudad cambia. Hay ocho hitos urbanos (fan zone, gran tienda oficial, parada de metro con el nombre del club, hotel, plaza, estatua, museo y pistas
   públicas en los barrios). Cada hito se desbloquea al cumplir unos requisitos (afición, reputación, apoyo del ayuntamiento y títulos). En modo gestor o presidente tú lo impulsas
   (con coste en los que paga el club); en carrera y entrenador la ciudad lo hace sola con retraso. Tras una obra de varias semanas el hito se inaugura: da efectos permanentes
   (ingresos, asistencia, cantera) y aparece en la ciudad real (calle_real_detalle.js: rótulos, plaza, estatua y obra en curso). Además, el turismo y el comercio de la ciudad siguen a
   la reputación del club y a los hitos conseguidos.
   Expone: estado, hitos, impulsar, efectos, titulos, selfTest, HITOS. Escribe state.ciudad[club].crec = { hitos: { id: { estado, desde, fin } }, turismo, comercio, hist }. */
(function () {
  const U = GM.util,
    F = () => GM.mods.finanzas;
  const HITOS = [
    {
      id: 'fanzone',
      nombre: 'Fan zone junto al pabellón',
      desc: 'Una explanada con pantallas, música y puestos antes de cada partido.',
      req: { aficion: 58 },
      coste: 180000,
      semanas: 12,
      efecto: { ingresos: 0.015, asistencia: 0.01 },
      una: { ambiente: 2 }
    },
    {
      id: 'pistas',
      nombre: 'Pistas públicas en los barrios',
      desc: 'Canastas nuevas en las plazas: más niños jugando, mejor cantera.',
      req: { aficion: 55, apoyo: 50 },
      coste: 120000,
      semanas: 24,
      efecto: { cantera: 0.05 },
      una: { aficion: 2 }
    },
    {
      id: 'tienda',
      nombre: 'Gran tienda oficial',
      desc: 'Un local grande con camisetas, museo de balones y cafetería.',
      req: { aficion: 66, reputacion: 55 },
      coste: 350000,
      semanas: 24,
      efecto: { ingresos: 0.03 },
      una: {}
    },
    {
      id: 'metro',
      nombre: 'Parada de metro con el nombre del club',
      desc: 'La estación más cercana al pabellón pasa a llevar el nombre del club.',
      req: { titulos: 1, apoyo: 55 },
      coste: 0,
      semanas: 40,
      efecto: { asistencia: 0.04 },
      una: { aficion: 2 }
    },
    {
      id: 'plaza',
      nombre: 'Plaza con el nombre del club',
      desc: 'El ayuntamiento bautiza una plaza junto al pabellón con el nombre del club.',
      req: { apoyo: 62, aficion: 60 },
      coste: 0,
      semanas: 20,
      efecto: { asistencia: 0.01 },
      una: { aficion: 4, apoyo: 3 }
    },
    {
      id: 'estatua',
      nombre: 'Estatua de la leyenda del club',
      desc: 'Un homenaje de bronce a quien lo ganó todo con la camiseta.',
      req: { titulos: 2 },
      coste: 90000,
      semanas: 16,
      efecto: {},
      una: { aficion: 5 }
    },
    {
      id: 'hotel',
      nombre: 'Hotel con el nombre del club',
      desc: 'Un hotel de la zona se asocia con el club: turismo de baloncesto los fines de semana.',
      req: { reputacion: 62, aficion: 60 },
      coste: 0,
      semanas: 52,
      efecto: { ingresos: 0.025 },
      una: { aficion: 3 }
    },
    {
      id: 'museo',
      nombre: 'Museo del club',
      desc: 'Las copas, las camisetas históricas y un recorrido por el pabellón.',
      req: { titulos: 3, reputacion: 65 },
      coste: 600000,
      semanas: 48,
      efecto: { ingresos: 0.02 },
      una: { aficion: 3 }
    }
  ];
  const gestiona = st => st.modo === 'gestor' || st.modo === 'presidente';
  function crec(st, club) {
    const c = st.ciudad && st.ciudad[club || st.clubId];
    if (!c) return null;
    return c.crec || (c.crec = { hitos: {}, turismo: 20, comercio: 30, hist: [] });
  }
  function titulos(st, club) {
    return (st.historial || []).filter(
      h => h.campeon === club && h.comp !== 'TORNEO_VERANO' && (st.ligas[h.comp] || (st.copas && st.copas[h.comp]) || /^(EUROLIGA|EUROCUP|BCL|EUROCUP_COPA)/.test(h.comp))
    ).length;
  }
  function metricas(st, club) {
    const c = st.ciudad[club],
      eq = st.equipos[club];
    return { aficion: c.aficion, apoyo: c.apoyoAyuntamiento, reputacion: eq.reputacion, titulos: titulos(st, club) };
  }
  const cumple = (h, m) => Object.keys(h.req).every(k => m[k] >= h.req[k]);
  function hitos(st, club) {
    club = club || st.clubId;
    const C = crec(st, club);
    if (!C) return [];
    const m = metricas(st, club);
    return HITOS.map(h => {
      const s = C.hitos[h.id] || { estado: 'bloqueado' };
      return Object.assign({}, h, s, {
        falta: Object.keys(h.req)
          .filter(k => m[k] < h.req[k])
          .map(k => ({ k, tiene: Math.round(m[k]), pide: h.req[k] })),
        fase: s.estado === 'obra' ? fase(st, s) : null,
        progreso: s.estado === 'obra' ? U.clamp(1 - U.diffDays(st.fecha, s.fin) / (h.semanas * 7), 0, 1) : 0
      });
    });
  }
  function impulsar(st, id) {
    const C = crec(st),
      h = HITOS.find(x => x.id === id);
    if (!C || !h) return { ok: false, motivo: 'Hito desconocido.' };
    const s = C.hitos[id];
    if (!s || s.estado !== 'disponible')
      return { ok: false, motivo: s && s.estado === 'obra' ? 'Ya está en obras.' : s && s.estado === 'hecho' ? 'Ya está inaugurado.' : 'Todavía no se cumplen los requisitos.' };
    if (!gestiona(st)) return { ok: false, motivo: 'La ciudad lo impulsará sola cuando llegue el momento.' };
    if (h.coste && F()) {
      if (st.finanzas[st.clubId].caja < h.coste) return { ok: false, motivo: 'No hay caja para ' + U.eur(h.coste) + '.' };
      F().registrar(st, st.clubId, 'Obra: ' + h.nombre, -h.coste);
    }
    empezar(st, h);
    return { ok: true };
  }
  function empezar(st, h, club) {
    club = club || st.clubId;
    const C = crec(st, club);
    C.hitos[h.id] = { estado: 'obra', desde: st.fecha, fin: U.addDays(st.fecha, h.semanas * 7) };
    if (club === st.clubId) GM.noticia(st, '🏗️ Empiezan las obras: ' + h.nombre.toLowerCase() + ' (' + h.semanas + ' semanas).');
  }
  // Las obras pasan por tres fases visibles: cimientos, estructura y acabados
  const FASES = ['Cimientos y vallado', 'Estructura', 'Acabados e inauguración'];
  function fase(st, s) {
    const p = U.clamp(U.diffDays(s.desde, st.fecha) / Math.max(1, U.diffDays(s.desde, s.fin)), 0, 1),
      n = p < 0.34 ? 0 : p < 0.75 ? 1 : 2;
    return { n, nombre: FASES[n], pct: Math.round(p * 100) };
  }
  function terminar(st, h, club) {
    club = club || st.clubId;
    const C = crec(st, club),
      c = st.ciudad[club];
    C.hitos[h.id].estado = 'hecho';
    C.hitos[h.id].fecha = st.fecha;
    Object.keys(h.una || {}).forEach(k => {
      const key = k === 'apoyo' ? 'apoyoAyuntamiento' : k;
      c[key] = U.clamp((c[key] || 0) + h.una[k], 0, 100);
    });
    C.hist.unshift({ fecha: st.fecha, texto: 'Se inaugura: ' + h.nombre });
    if (C.hist.length > 20) C.hist.length = 20;
    if (club === st.clubId) {
      GM.noticia(st, '🎉 Se inaugura: ' + h.nombre.toLowerCase() + '. La ciudad crece con el club.');
      GM.bus.emit('crecimiento:hito', { id: h.id });
    }
  }
  function diario(st) {
    if (!st || !st.ciudad || !st.ciudad[st.clubId]) return;
    const C = crec(st);
    if (!C) return;
    HITOS.forEach(h => {
      const s = C.hitos[h.id];
      if (s && s.estado === 'obra' && st.fecha >= s.fin) terminar(st, h);
    });
    if (st.fecha.slice(8, 10) !== '01') return;
    const m = metricas(st, st.clubId),
      eq = st.equipos[st.clubId];
    HITOS.forEach(h => {
      const s = C.hitos[h.id] || (C.hitos[h.id] = { estado: 'bloqueado' });
      if (s.estado === 'bloqueado' && cumple(h, m)) {
        s.estado = 'disponible';
        s.desde = st.fecha;
        GM.noticia(st, '🏙️ ' + (gestiona(st) ? 'Puedes impulsar' : 'La ciudad propone') + ': ' + h.nombre.toLowerCase() + '.');
      } else if (s.estado === 'disponible' && !gestiona(st) && U.diffDays(s.desde, st.fecha) >= 60 && GM.rng.next() < 0.25) empezar(st, h);
    });
    const hechos = HITOS.filter(h => C.hitos[h.id] && C.hitos[h.id].estado === 'hecho').length,
      tt = 15 + eq.reputacion * 0.45 + hechos * 4,
      tc = 25 + m.aficion * 0.35 + hechos * 4;
    C.turismo = Math.round((C.turismo + (tt - C.turismo) * 0.04) * 10) / 10;
    C.comercio = Math.round((C.comercio + (tc - C.comercio) * 0.04) * 10) / 10;
  }
  // Las ciudades de los demás clubes también crecen: una vez al mes cada una mira sus requisitos, empieza obras tras dos meses y las acaba (así, si cambias de club, te encuentras su ciudad con sus hitos)
  function diarioOtras(st) {
    if (st.fecha.slice(8, 10) !== '01' || !st.ciudad) return;
    Object.keys(st.ciudad).forEach(id => {
      if (id === st.clubId || !st.equipos[id] || !st.ciudad[id]) return;
      const C = crec(st, id);
      if (!C) return;
      const m = metricas(st, id);
      HITOS.forEach(h => {
        const s = C.hitos[h.id] || (C.hitos[h.id] = { estado: 'bloqueado' });
        if (s.estado === 'obra' && st.fecha >= s.fin) terminar(st, h, id);
        else if (s.estado === 'bloqueado' && cumple(h, m)) {
          s.estado = 'disponible';
          s.desde = st.fecha;
        } else if (s.estado === 'disponible' && U.diffDays(s.desde, st.fecha) >= 60 && (U.hash(id + h.id + st.fecha) >>> 0) % 100 < 22) empezar(st, h, id);
      });
      const hechos = HITOS.filter(h => C.hitos[h.id].estado === 'hecho').length,
        eq = st.equipos[id];
      C.turismo = Math.round((C.turismo + (15 + eq.reputacion * 0.45 + hechos * 4 - C.turismo) * 0.04) * 10) / 10;
      C.comercio = Math.round((C.comercio + (25 + m.aficion * 0.35 + hechos * 4 - C.comercio) * 0.04) * 10) / 10;
    });
  }
  function ranking(st) {
    return Object.keys(st.ciudad || {})
      .filter(id => st.equipos[id] && st.ciudad[id].crec)
      .map(id => {
        const C = st.ciudad[id].crec;
        return {
          id,
          ciudad: st.equipos[id].ciudad,
          club: st.equipos[id].nombre,
          hechos: HITOS.filter(h => C.hitos[h.id] && C.hitos[h.id].estado === 'hecho').length,
          obras: HITOS.filter(h => C.hitos[h.id] && C.hitos[h.id].estado === 'obra').map(h => h.nombre)
        };
      })
      .sort((a, b) => b.hechos - a.hechos || b.obras.length - a.obras.length)
      .slice(0, 12);
  }
  // ---------- Hitos del pueblo (carrera) ----------
  const HITOS_PUEBLO = [
    {
      id: 'fuente',
      nombre: 'Fuente en la plaza mayor',
      desc: 'El ayuntamiento instala una fuente con una placa con tu nombre.',
      req: { cariño: 52, fama: 20 },
      coste: 40,
      semanas: 8,
      una: { cariño: 3 }
    },
    {
      id: 'calle',
      nombre: 'Calle con tu nombre',
      desc: 'El pleno bautiza una calle del pueblo con tu nombre.',
      req: { cariño: 62, fama: 35 },
      coste: 0,
      semanas: 12,
      una: { cariño: 4, fama: 1 }
    },
    {
      id: 'mural',
      nombre: 'Mural de la cancha',
      desc: 'Los vecinos pintan un mural gigante junto a la canasta de la plaza.',
      req: { cariño: 55 },
      coste: 25,
      semanas: 6,
      una: { cariño: 3 }
    },
    {
      id: 'pabellon',
      nombre: 'Polideportivo con tu nombre',
      desc: 'El polideportivo municipal pasa a llevar tu nombre.',
      req: { cariño: 70, fama: 50 },
      coste: 0,
      semanas: 20,
      una: { cariño: 5, fama: 2 }
    },
    {
      id: 'estatua',
      nombre: 'Estatua del hijo del pueblo',
      desc: 'Una estatua de bronce en la plaza, mirando a la canasta.',
      req: { cariño: 78, fama: 65 },
      coste: 120,
      semanas: 24,
      una: { cariño: 6, fama: 3 }
    },
    {
      id: 'museo',
      nombre: 'Sala de trofeos en el ayuntamiento',
      desc: 'Tus camisetas y trofeos se exponen en el salón de plenos.',
      req: { cariño: 66, fama: 55 },
      coste: 60,
      semanas: 14,
      una: { cariño: 4 }
    }
  ];
  const pu = st => (st.modo === 'carrera' && st.carrera && st.carrera.pueblo ? st.carrera.pueblo : null);
  const cp = st => {
    const p = pu(st);
    if (!p) return null;
    return p.crec || (p.crec = { hitos: {}, hist: [] });
  };
  const metP = st => ({ cariño: pu(st).cariño, fama: st.carrera.fama });
  function hitosPueblo(st) {
    const C = cp(st);
    if (!C) return [];
    const m = metP(st);
    return HITOS_PUEBLO.map(h => {
      const s = C.hitos[h.id] || { estado: 'bloqueado' };
      return Object.assign({}, h, s, {
        falta: Object.keys(h.req)
          .filter(k => m[k] < h.req[k])
          .map(k => ({ k, tiene: Math.round(m[k]), pide: h.req[k] })),
        fase: s.estado === 'obra' ? fase(st, s) : null
      });
    });
  }
  function impulsarPueblo(st, id) {
    const C = cp(st),
      h = HITOS_PUEBLO.find(x => x.id === id);
    if (!C || !h) return { ok: false, motivo: 'Hito desconocido.' };
    const s = C.hitos[id];
    if (!s || s.estado !== 'disponible')
      return { ok: false, motivo: s && s.estado === 'obra' ? 'Ya está en obras.' : s && s.estado === 'hecho' ? 'Ya está inaugurado.' : 'Todavía no se cumplen los requisitos.' };
    if (h.coste) {
      const H = GM.mods.hogar;
      if (H.dinero(st) < h.coste) return { ok: false, motivo: 'Te faltan ' + Math.round((h.coste - H.dinero(st)) * 10) / 10 + ' mil €.' };
      H.gastar(st, h.coste);
      if (GM.patrimonio) GM.patrimonio.reg(st, 'otros', 'Obra en tu pueblo: ' + h.nombre, -h.coste);
    }
    C.hitos[id] = { estado: 'obra', desde: st.fecha, fin: U.addDays(st.fecha, h.semanas * 7) };
    GM.noticia(st, '🏗️ Empiezan las obras en ' + pu(st).nombre + ': ' + h.nombre.toLowerCase() + ' (' + h.semanas + ' semanas).');
    return { ok: true };
  }
  function diarioPueblo(st) {
    const C = cp(st);
    if (!C) return;
    HITOS_PUEBLO.forEach(h => {
      const s = C.hitos[h.id];
      if (s && s.estado === 'obra' && st.fecha >= s.fin) {
        s.estado = 'hecho';
        s.fecha = st.fecha;
        const p = pu(st);
        Object.keys(h.una).forEach(k => {
          if (k === 'cariño') p.cariño = U.clamp(p.cariño + h.una[k], 0, 100);
          else if (k === 'fama') {
            try {
              st.carrera.fama = Math.min(100, st.carrera.fama + h.una[k]);
            } catch (e) {
              /* fama protegida */
            }
          }
        });
        C.hist.unshift({ fecha: st.fecha, texto: 'Se inaugura: ' + h.nombre });
        GM.noticia(st, '🎉 En ' + p.nombre + ' se inaugura: ' + h.nombre.toLowerCase() + '.');
      }
    });
    if (st.fecha.slice(8, 10) !== '01') return;
    const m = metP(st);
    HITOS_PUEBLO.forEach(h => {
      const s = C.hitos[h.id] || (C.hitos[h.id] = { estado: 'bloqueado' });
      if (s.estado === 'bloqueado' && Object.keys(h.req).every(k => m[k] >= h.req[k])) {
        s.estado = 'disponible';
        s.desde = st.fecha;
        GM.noticia(st, '🏘️ Tu pueblo propone: ' + h.nombre.toLowerCase() + '.');
      } else if (s.estado === 'disponible' && h.coste === 0 && U.diffDays(s.desde, st.fecha) >= 45 && (U.hash(h.id + st.fecha) >>> 0) % 100 < 30) {
        C.hitos[h.id] = { estado: 'obra', desde: st.fecha, fin: U.addDays(st.fecha, h.semanas * 7) };
        GM.noticia(st, '🏗️ El ayuntamiento de ' + pu(st).nombre + ' empieza: ' + h.nombre.toLowerCase() + '.');
      }
    });
  }
  GM.bus.on('dia:avanzado', function () {
    diario(GM.state);
    try {
      diarioOtras(GM.state);
      diarioPueblo(GM.state);
    } catch (e) {
      console.error('crecimiento', e);
    }
  });
  function efectos(st, club) {
    const C = crec(st, club || st.clubId),
      e = { ingresos: 0, asistencia: 0, cantera: 0 };
    if (!C) return e;
    HITOS.forEach(h => {
      if (C.hitos[h.id] && C.hitos[h.id].estado === 'hecho')
        Object.keys(h.efecto).forEach(k => {
          e[k] += h.efecto[k];
        });
    });
    e.ingresos += (C.turismo - 30) / 1000;
    e.asistencia += (C.comercio - 40) / 1500;
    return e;
  }
  function estado(st) {
    const C = crec(st);
    return C ? { turismo: C.turismo, comercio: C.comercio, hechos: Object.keys(C.hitos).filter(k => C.hitos[k].estado === 'hecho'), hist: C.hist } : null;
  }
  function nuevaPartida(st) {
    Object.keys(st.ciudad || {}).forEach(id => {
      st.ciudad[id].crec = { hitos: {}, turismo: 20 + st.equipos[id].reputacion * 0.2, comercio: 30, hist: [] };
    });
  }
  function selfTest() {
    const st = {
      fecha: '2027-03-01',
      modo: 'gestor',
      clubId: 'a',
      noticias: [],
      historial: [{ temporada: '2026-27', comp: 'ACB', campeon: 'a' }],
      ligas: { ACB: {} },
      equipos: { a: { reputacion: 70 } },
      ciudad: { a: { aficion: 70, apoyoAyuntamiento: 70, ambiente: 60 } },
      finanzas: { a: { caja: 1e7 } }
    };
    const F0 = GM.mods.finanzas;
    GM.mods.finanzas = null;
    GM.state = st;
    diario(st);
    const H = hitos(st),
      r = impulsar(st, 'fanzone'),
      disp = H.filter(h => h.estado === 'disponible').length;
    st.fecha = '2027-06-20';
    diario(st);
    const ok = crec(st).hitos.fanzone.estado === 'hecho' && efectos(st).ingresos > 0;
    GM.mods.finanzas = F0;
    GM.state = null;
    return disp >= 4 && r.ok && ok && HITOS.length === 8;
  }
  GM.register('crecimiento', {
    estado,
    hitos,
    impulsar,
    efectos,
    titulos,
    nuevaPartida,
    selfTest,
    HITOS,
    HITOS_PUEBLO,
    FASES,
    fase,
    ranking,
    hitosPueblo,
    impulsarPueblo,
    diarioOtras,
    diarioPueblo
  });
})();
