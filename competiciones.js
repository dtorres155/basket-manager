/* COMPETICIONES (GM.mods.competiciones)
   Calendario 2026-27 (NBA 82 partidos + play-in + playoffs al 7; Euroliga 38 jornadas + play-in + playoffs al 5 + Final Four;
   ACB y Lega a doble vuelta + playoffs). Expone: generarCalendario, proximoPartido, clasificacion, playoffs, jugarDia,
   avanzarHastaPartido, calendarioClub, finTemporada, nuevaTemporada, selfTest.
   Escribe state.calendario, clasificaciones, playoffs, estadisticas, historial. Emite partido:jugado, dia:avanzado, temporada:fin. */
(function () {
  const U = GM.util;
  const mx = (a, b) => a > b ? a : b;
  const yearOf = st => parseInt(st.temporada.slice(0, 4), 10);
  const swap = m => [m[1], m[0]];
  const PATRON = { 1: ['a'], 3: ['a', 'b', 'a'], 5: ['a', 'a', 'b', 'b', 'a'], 7: ['a', 'a', 'b', 'b', 'a', 'b', 'a'] };
  const FORM = {
    nba: { ini: y => y + '-10-20', paso: 2.1, snap: false, dos: true, pi: y => (y + 1) + '-04-14', po: y => (y + 1) + '-04-18',
      rondas: [{ n: 'Primera ronda', m: 7 }, { n: 'Semifinales de conferencia', m: 7 }, { n: 'Finales de conferencia', m: 7 }, { n: 'Finales de la NBA', m: 7 }] },
    euroliga: { ini: y => y + '-09-24', paso: 5.5, snap: false, dos: true, pi: y => (y + 1) + '-04-20', po: y => (y + 1) + '-04-27',
      rondas: [{ n: 'Playoffs', m: 5 }, { n: 'Semifinales (Final Four)', m: 1, min: y => (y + 1) + '-05-28' }, { n: 'Final', m: 1, min: y => (y + 1) + '-05-30' }] },
    acb: { ini: y => y + '-10-03', paso: 6.4, snap: true, po: y => (y + 1) + '-05-05',
      rondas: [{ n: 'Cuartos de final', m: 3 }, { n: 'Semifinales', m: 5 }, { n: 'Final', m: 5 }] },
    liga_simple: { ini: y => y + '-10-04', paso: 7.2, snap: true, po: y => (y + 1) + '-04-20',
      rondas: [{ n: 'Semifinales', m: 3 }, { n: 'Final', m: 3 }] }
  };
  const ORDEN = { nba: 0, euroliga: 1, acb: 2, liga_simple: 3 };

  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = GM.rng.int(0, i); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function rondasRR(ids) {
    const t = ids.slice(); if (t.length % 2) t.push(null);
    const n = t.length, rs = [];
    for (let r = 0; r < n - 1; r++) {
      const m = [];
      for (let i = 0; i < n / 2; i++) {
        const a = t[i], b = t[n - 1 - i];
        if (a && b) m.push((r + i) % 2 === 0 ? [a, b] : [b, a]);
      }
      rs.push(m);
      t.splice(1, 0, t.pop());
    }
    return rs;
  }
  const getG = (st, id) => st.calendario.find(g => g.id === id);
  function creaG(st, comp, fase, local, vis, fecha, jornada, extra) {
    if (fase !== 'regular') { let k = 0; while (k++ < 30 && st.calendario.some(g => g.fecha === fecha && (g.local === local || g.visitante === local || g.local === vis || g.visitante === vis))) fecha = U.addDays(fecha, 1); }
    const g = Object.assign({ id: 'g' + (++st.seq), fecha, comp, fase, jornada, local, visitante: vis, resultado: null }, extra || {});
    st.calendario.push(g); return g.id;
  }
  const ganadorG = g => g.resultado.local > g.resultado.visitante ? g.local : g.visitante;
  const perdedorG = g => g.resultado.local > g.resultado.visitante ? g.visitante : g.local;

  function generarCalendario(st) {
    st.calendario = []; st.clasificaciones = {}; st.playoffs = {}; st.pendReg = {}; st.seq = 0; st.temporadaTerminada = false;
    const y = yearOf(st), ocupado = {};
    Object.keys(st.ligas).sort((a, b) => ORDEN[st.ligas[a].formato] - ORDEN[st.ligas[b].formato]).forEach(comp => {
      const liga = st.ligas[comp], F = FORM[liga.formato];
      if (!F) return;
      const ids = shuffle(liga.equipos.slice());
      const rr = rondasRR(ids);
      let rondas = rr.concat(rr.map(r => r.map(swap)));
      if (liga.formato === 'nba') rondas = rondas.concat(rr.slice(0, 82 - rondas.length).map((r, i) => i % 2 ? r : r.map(swap)));
      st.clasificaciones[comp] = ids.map(id => ({ equipoId: id, pj: 0, g: 0, p: 0, pf: 0, pc: 0 }));
      let count = 0;
      rondas.forEach((games, r) => {
        let d0 = U.addDays(F.ini(y), Math.floor(r * F.paso));
        if (F.snap) while ([0, 6].indexOf(U.weekday(d0)) < 0) d0 = U.addDays(d0, 1);
        games.forEach((g, i) => {
          let d = F.dos && i >= games.length / 2 ? U.addDays(d0, 1) : d0;
          while (ocupado[d + g[0]] || ocupado[d + g[1]]) d = U.addDays(d, 1);
          ocupado[d + g[0]] = ocupado[d + g[1]] = 1;
          creaG(st, comp, 'regular', g[0], g[1], d, r + 1); count++;
        });
      });
      st.pendReg[comp] = count;
    });
    st.calendario.sort((a, b) => a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0);
  }

  function ordenar(rows) {
    return rows.slice().sort((a, b) => b.g - a.g || (b.pf - b.pc) - (a.pf - a.pc) || b.pf - a.pf);
  }
  function clasificacion(st, comp, conf) {
    let rows = st.clasificaciones[comp] || [];
    if (conf) rows = rows.filter(r => st.equipos[r.equipoId].conferencia === conf);
    return ordenar(rows);
  }
  function anota(st, g, res) {
    const c = st.clasificaciones[g.comp];
    const a = c.find(r => r.equipoId === g.local), b = c.find(r => r.equipoId === g.visitante);
    a.pj++; b.pj++; a.pf += res.local; a.pc += res.visitante; b.pf += res.visitante; b.pc += res.local;
    if (res.local > res.visitante) { a.g++; b.p++; } else { b.g++; a.p++; }
  }

  // ---------- Playoffs ----------
  function iniciarPO(st, comp) {
    const liga = st.ligas[comp], f = liga.formato, F = FORM[f], y = yearOf(st);
    const tabla = clasificacion(st, comp);
    const rank = {}; tabla.forEach((r, i) => { rank[r.equipoId] = i + 1; });
    const po = { comp, formato: f, rank, fase: 'rondas', rondas: [], ri: -1, campeon: null, playin: null };
    st.playoffs[comp] = po;
    if (f === 'nba' || f === 'euroliga') {
      po.fase = 'playin';
      const confs = f === 'nba' ? ['E', 'O'] : [null];
      po.playin = confs.map(c => {
        const t = clasificacion(st, comp, c).map(r => r.equipoId);
        return { conf: c, directos: t.slice(0, 6), seeds: t.slice(0, 10), g1: null, g2: null, g3: null, s7: null, s8: null };
      });
      st.nPI = F.pi(y);
      GM.noticia(st, (f === 'nba' ? 'NBA' : 'Euroliga') + ': termina la fase regular. ¡Empieza el play-in!');
    } else {
      const n = f === 'acb' ? 8 : 4;
      const seeds = tabla.slice(0, n).map(r => r.equipoId);
      armaR1(st, po, [seeds]);
      GM.noticia(st, liga.nombre + ': termina la fase regular. Arrancan los playoffs.');
    }
  }
  function parejasR1(seeds) {
    if (seeds.length === 8) return [[0, 7], [3, 4], [1, 6], [2, 5]].map(p => [seeds[p[0]], seeds[p[1]]]);
    return [[seeds[0], seeds[3]], [seeds[1], seeds[2]]];
  }
  function armaR1(st, po, listas) {
    const pares = [];
    listas.forEach(s => parejasR1(s).forEach(p => pares.push(p)));
    crearRonda(st, po, 0, pares);
  }
  function crearRonda(st, po, idx, pares) {
    const y = yearOf(st), F = FORM[po.formato], cfg = F.rondas[idx];
    let ini = U.addDays(st.fecha, idx === 0 ? 1 : 2);
    if (idx === 0) ini = mx(ini, F.po(y));
    if (cfg.min) ini = mx(ini, cfg.min(y));
    po.ri = idx; po.fase = 'rondas';
    po.rondas.push({ nombre: cfg.n, mejorDe: cfg.m, series: pares.map((p, i) => {
      const a = po.rank[p[0]] <= po.rank[p[1]] ? p[0] : p[1], b = a === p[0] ? p[1] : p[0];
      return { id: po.comp + '-r' + idx + '-s' + i, a, b, mejorDe: cfg.m, wa: 0, wb: 0, ganador: null, pend: null, last: null, inicio: ini };
    }) });
  }
  function procesaSerie(st, po, s) {
    if (s.ganador) return;
    if (s.pend) {
      const g = getG(st, s.pend);
      if (g && g.resultado) {
        if (ganadorG(g) === s.a) s.wa++; else s.wb++;
        s.pend = null; s.last = g.fecha;
        const need = Math.floor(s.mejorDe / 2) + 1;
        if (s.wa >= need) s.ganador = s.a; else if (s.wb >= need) s.ganador = s.b;
      }
    }
    if (!s.ganador && !s.pend) {
      const n = s.wa + s.wb;
      const host = PATRON[s.mejorDe][n] === 'a' ? s.a : s.b, other = host === s.a ? s.b : s.a;
      const fecha = s.last ? U.addDays(s.last, 2) : mx(s.inicio, U.addDays(st.fecha, 1));
      s.pend = creaG(st, po.comp, 'playoff', host, other, fecha, n + 1, { ronda: po.ri + 1, serie: s.id });
    }
  }
  function procesarPO(st) {
    Object.keys(st.playoffs).forEach(comp => {
      const po = st.playoffs[comp];
      if (po.campeon) return;
      if (po.fase === 'playin') {
        po.playin.forEach(gr => {
          if (!gr.g1) {
            const f = mx(U.addDays(st.fecha, 1), st.nPI);
            gr.g1 = creaG(st, comp, 'playin', gr.seeds[6], gr.seeds[7], f, 1);
            gr.g2 = creaG(st, comp, 'playin', gr.seeds[8], gr.seeds[9], f, 1);
          } else if (!gr.g3) {
            const a = getG(st, gr.g1), b = getG(st, gr.g2);
            if (a.resultado && b.resultado) {
              gr.s7 = ganadorG(a);
              gr.g3 = creaG(st, comp, 'playin', perdedorG(a), ganadorG(b), U.addDays(mx(a.fecha, b.fecha), 2), 2);
            }
          } else if (!gr.s8) {
            const c = getG(st, gr.g3);
            if (c.resultado) gr.s8 = ganadorG(c);
          }
        });
        if (po.playin.every(gr => gr.s8)) {
          armaR1(st, po, po.playin.map(gr => gr.directos.concat([gr.s7, gr.s8])));
        }
        return;
      }
      const R = po.rondas[po.ri];
      R.series.forEach(s => procesaSerie(st, po, s));
      if (R.series.every(s => s.ganador)) {
        const F = FORM[po.formato];
        if (po.ri >= F.rondas.length - 1) {
          po.campeon = R.series[0].ganador;
          const liga = st.ligas[po.comp];
          st.historial.push({ temporada: st.temporada, comp: po.comp, campeon: po.campeon });
          GM.noticia(st, '🏆 ' + st.equipos[po.campeon].nombre + ' campeón de ' + liga.nombre + '.');
        } else {
          const w = R.series.map(s => s.ganador), pares = [];
          for (let i = 0; i < w.length; i += 2) pares.push([w[i], w[i + 1]]);
          crearRonda(st, po, po.ri + 1, pares);
        }
      }
    });
  }

  // ---------- Día a día ----------
  function jugarDia(st) {
    const hoy = st.fecha;
    const juegos = st.calendario.filter(g => g.fecha === hoy && !g.resultado);
    const P = GM.mods.partidos;
    juegos.forEach(g => {
      const sim = (st._directo && st._directo[g.id]) || P.simular(st, g);
      if (st._directo) delete st._directo[g.id];
      const mio = g.local === st.clubId || g.visitante === st.clubId;
      g.resultado = mio ? sim : { local: sim.local, visitante: sim.visitante, ot: sim.ot, cuartos: sim.cuartos };
      for (const pid in sim.stats) {
        const s = sim.stats[pid], t = st.estadisticas[pid] || (st.estadisticas[pid] = { pj: 0, min: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, fal: 0 });
        t.pj++; t.min += s.min; t.pts += s.pts; t.reb += s.reb; t.ast += s.ast; t.stl += s.stl; t.blk += s.blk; t.tov += s.tov; t.fal += s.fal;
      }
      if (g.fase === 'regular') { anota(st, g, sim); st.pendReg[g.comp]--; }
      GM.bus.emit('partido:jugado', { partido: g });
    });
    Object.keys(st.pendReg).forEach(c => { if (st.pendReg[c] === 0 && !st.playoffs[c]) iniciarPO(st, c); });
    procesarPO(st);
    st.fecha = U.addDays(hoy, 1);
    GM.bus.emit('dia:avanzado', { fecha: st.fecha });
    if (!st.temporadaTerminada && Object.keys(st.playoffs).length && Object.keys(st.ligas).every(c => !FORM[st.ligas[c].formato] || (st.playoffs[c] && st.playoffs[c].campeon))) finTemporada(st);
    return juegos;
  }
  function proximoPartido(st, clubId) {
    let best = null;
    for (const g of st.calendario) {
      if (g.resultado || g.fecha < st.fecha) continue;
      if (g.local !== clubId && g.visitante !== clubId) continue;
      if (!best || g.fecha < best.fecha) best = g;
    }
    return best;
  }
  function avanzarHastaPartido(st, clubId, max) {
    let n = 0; max = max || 400;
    while (n < max) {
      const p = proximoPartido(st, clubId);
      if (p && p.fecha <= st.fecha) break;
      if (!p && st.temporadaTerminada) break;
      jugarDia(st); n++;
      if (st.temporadaTerminada) break;
    }
    return n;
  }
  function calendarioClub(st, clubId) {
    return st.calendario.filter(g => g.local === clubId || g.visitante === clubId).sort((a, b) => a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0);
  }
  function playoffs(st, comp) { return st.playoffs[comp] || null; }
  function finTemporada(st) {
    st.temporadaTerminada = true;
    GM.noticia(st, 'Se acaba la temporada ' + st.temporada + '. Toca preparar la siguiente.');
    GM.bus.emit('temporada:fin', { temporada: st.temporada });
  }
  function nuevaTemporada(st) {
    if (GM.mods.mercado && GM.mods.mercado.cerrarContratos) GM.mods.mercado.cerrarContratos(st);
    const y = yearOf(st) + 1;
    st.temporada = y + '-' + String((y + 1) % 100).padStart(2, '0');
    const base = y + '-07-01';
    if (st.fecha < base) st.fecha = base;
    st.estadisticas = {};
    generarCalendario(st);
    GM.noticia(st, 'Arranca la temporada ' + st.temporada + '.');
    GM.bus.emit('temporada:nueva', { temporada: st.temporada });
  }
  function nuevaPartida(st) { st.estadisticas = {}; generarCalendario(st); }

  function selfTest() {
    if (!GM.mkJugador || !GM.mods.partidos) return false;
    const st = { clubId: 'x', temporada: '2026-27', fecha: '2026-09-24', noticias: [], historial: [], estadisticas: {}, equipos: {}, jugadores: {}, ligas: {} };
    const ids = ['t1', 't2', 't3', 't4', 't5', 't6'];
    ids.forEach((id, k) => {
      const pl = [];
      ['PG', 'SG', 'SF', 'PF', 'C', 'PG', 'SG', 'SF'].forEach((pos, i) => { const j = GM.mkJugador(id, i + 1, id + i, pos, 26, 200, 'ES', 'UE', 70 + k - i, 70, 'E', 1e6, 2027); st.jugadores[j.id] = j; pl.push(j.id); });
      st.equipos[id] = { id, nombre: id, plantilla: pl };
    });
    st.ligas.L = { id: 'L', nombre: 'Liga de prueba', formato: 'liga_simple', equipos: ids };
    GM.rng.seed(7);
    generarCalendario(st);
    let guard = 0;
    while (!st.temporadaTerminada && guard++ < 500) jugarDia(st);
    const rows = clasificacion(st, 'L');
    return st.temporadaTerminada && rows.every(r => r.pj === 10) && !!st.playoffs.L.campeon;
  }

  GM.register('competiciones', { generarCalendario, proximoPartido, clasificacion, playoffs, jugarDia, avanzarHastaPartido, calendarioClub, finTemporada, nuevaTemporada, nuevaPartida, selfTest, FORM });
})();
