/* COMPETICIONES CONTINENTALES (GM.mods.continental)
   EuroCup y Basketball Champions League para los clubes que no están en la Euroliga, por reputación. Cada una tiene:
   fase previa (eliminatorias a doble partido), fase de grupos (ida y vuelta), eliminatorias a doble partido y final a partido único.
   Expone: estado, competicion, tablaGrupo, de(st, clubId), selfTest. Escribe state.continental[id] = { nombre, estado, participantes, previa, grupos, ko, campeon }.
   Los partidos son entradas del calendario con fase 'continental' (no puntúan en las ligas). El campeón se añade a state.historial. */
(function () {
  const U = GM.util;
  const yearOf = st => parseInt(st.temporada.slice(0, 4), 10);
  const DEF = {
    EUROCUP: { nombre: 'EuroCup', directos: 16, previa: 8, tam: 5, ko: ['Cuartos de final', 'Semifinales', 'Final'], j0: m => m + '-20', salto: 14 },
    BCL: { nombre: 'Basketball Champions League', directos: 24, previa: 16, tam: 4, ko: ['Octavos de final', 'Cuartos de final', 'Semifinales', 'Final'], j0: m => m + '-27', salto: 14 }
  };
  const getG = (st, id) => st.calendario.find(g => g.id === id);
  const ocupado = (st, d, a, b) => st.calendario.some(g => g.fecha === d && (g.local === a || g.visitante === a || g.local === b || g.visitante === b));
  function libre(st, d, a, b) { let k = 0; while (ocupado(st, d, a, b) && k++ < 6) d = U.addDays(d, 1); return d; }
  function juego(st, id, c, ronda, local, vis, fecha, extra) {
    const g = Object.assign({ id: 'g' + (++st.seq), fecha: libre(st, fecha, local, vis), comp: id, fase: 'continental', cont: id, ronda, jornada: 0, local, visitante: vis, resultado: null }, extra || {});
    st.calendario.push(g); return g.id;
  }
  function participantes(st) {
    const euro = new Set(st.ligas.EUROLIGA ? st.ligas.EUROLIGA.equipos : []);
    const pool = Object.keys(st.equipos).filter(id => !euro.has(id) && Object.keys(st.ligas).some(l => l !== 'NBA' && l !== 'EUROLIGA' && st.ligas[l].equipos.indexOf(id) >= 0)).sort((a, b) => st.equipos[b].reputacion - st.equipos[a].reputacion);
    const ec = pool.slice(0, 24), resto = pool.slice(24);
    const previaN = Math.min(16, Math.max(0, (resto.length - 16) - ((resto.length - 16) % 2)));
    return { EUROCUP: { directos: ec.slice(0, 16), previa: ec.slice(16, 24) }, BCL: { directos: resto.slice(0, resto.length - previaN), previa: resto.slice(resto.length - previaN) } };
  }
  function iniciar(st) {
    st.continental = {}; const P = participantes(st);
    Object.keys(DEF).forEach(id => { const p = P[id]; if (p.directos.length < 8) return; st.continental[id] = { id, nombre: DEF[id].nombre, estado: 'pendiente', directos: p.directos, pre: p.previa, previa: [], grupos: [], ko: [], campeon: null, y: yearOf(st) }; });
  }
  const sem = (d0, n) => U.addDays(d0, n);
  function empezarPrevia(st, c) {
    const y = yearOf(st), base = DEF[c.id] && (c.id === 'EUROCUP' ? y + '-09-29' : y + '-09-30'), pre = c.pre.slice().sort((a, b) => st.equipos[b].reputacion - st.equipos[a].reputacion), n = pre.length / 2;
    c.previa = [];
    for (let i = 0; i < n; i++) { const a = pre[i], b = pre[pre.length - 1 - i]; c.previa.push({ a, b, g: [juego(st, c.id, c, 'Previa', b, a, base, { pierna: 1 }), juego(st, c.id, c, 'Previa', a, b, sem(base, 7), { pierna: 2 })], ganador: null }); }
    c.estado = 'previa'; if (!n) pasarAGrupos(st, c);
    else GM.noticia(st, c.nombre + ': arranca la fase previa.');
  }
  function ganadorSerie(st, a, b, ids) {
    const gs = ids.map(i => getG(st, i)); let pa = 0, pb = 0;
    gs.forEach(g => { const sa = g.local === a ? g.resultado.local : g.resultado.visitante, sb = g.local === a ? g.resultado.visitante : g.resultado.local; pa += sa; pb += sb; });
    if (pa !== pb) return pa > pb ? a : b;
    return st.equipos[a].reputacion >= st.equipos[b].reputacion ? a : b;
  }
  function serieLista(st, ids) { return ids.every(i => { const g = getG(st, i); return g && g.resultado; }); }
  function pasarAGrupos(st, c) {
    const y = yearOf(st), tam = DEF[c.id].tam, lista = c.directos.concat(c.previa.map(s => s.ganador)).filter(Boolean);
    let ng = 1; while (ng * 2 * tam <= lista.length) ng *= 2; const T = ng * tam, eq = lista.sort((a, b) => st.equipos[b].reputacion - st.equipos[a].reputacion).slice(0, T);
    c.koNombres = ['Octavos de final', 'Cuartos de final', 'Semifinales', 'Final'].slice(-Math.round(Math.log2(ng * 2)));
    const G = Array.from({ length: ng }, () => []);
    eq.forEach((id, i) => { const fila = Math.floor(i / ng); G[fila % 2 === 0 ? i % ng : ng - 1 - (i % ng)].push(id); });
    const d0 = y + (c.id === 'EUROCUP' ? '-10-20' : '-10-27');
    c.grupos = G.map((equipos, gi) => {
      const rondas = rr(equipos), jornadas = rondas.length * 2;
      const ids = [];
      rondas.concat(rondas.map(r => r.map(m => [m[1], m[0]]))).forEach((partidos, k) => partidos.forEach(m => ids.push(juego(st, c.id, c, 'Grupo ' + 'ABCDEFGH'[gi], m[0], m[1], sem(d0, k * DEF[c.id].salto), { jornada: k + 1, grupo: gi }))));
      return { equipos, ids };
    });
    c.estado = 'grupos'; GM.noticia(st, c.nombre + ': empieza la fase de grupos (' + ng + ' grupos).');
  }
  function rr(ids) {
    const t = ids.slice(); if (t.length % 2) t.push(null); const n = t.length, rs = [];
    for (let r = 0; r < n - 1; r++) { const m = []; for (let i = 0; i < n / 2; i++) { const a = t[i], b = t[n - 1 - i]; if (a && b) m.push((r + i) % 2 === 0 ? [a, b] : [b, a]); } rs.push(m); t.splice(1, 0, t.pop()); }
    return rs;
  }
  function tablaGrupo(st, id, gi) {
    const c = st.continental[id], g = c.grupos[gi], fila = {}; g.equipos.forEach(e => { fila[e] = { equipoId: e, pj: 0, g: 0, p: 0, pf: 0, pc: 0 }; });
    g.ids.map(i => getG(st, i)).filter(x => x && x.resultado).forEach(x => { const a = fila[x.local], b = fila[x.visitante], r = x.resultado; a.pj++; b.pj++; a.pf += r.local; a.pc += r.visitante; b.pf += r.visitante; b.pc += r.local; if (r.local > r.visitante) { a.g++; b.p++; } else { b.g++; a.p++; } });
    return Object.keys(fila).map(k => fila[k]).sort((x, y) => y.g - x.g || (y.pf - y.pc) - (x.pf - x.pc) || st.equipos[y.equipoId].reputacion - st.equipos[x.equipoId].reputacion);
  }
  function crearKO(st, c, idx, pares, desde) {
    const ult = idx === c.koNombres.length - 1, d0 = sem(desde, 14), nom = c.koNombres[idx];
    const eliminatorias = pares.map(p => { const ids = ult ? [juego(st, c.id, c, nom, p[0], p[1], d0, { pierna: 1 })] : [juego(st, c.id, c, nom, p[1], p[0], d0, { pierna: 1 }), juego(st, c.id, c, nom, p[0], p[1], sem(d0, 7), { pierna: 2 })]; return { a: p[0], b: p[1], g: ids, ganador: null }; });
    c.ko.push({ nombre: nom, series: eliminatorias });
  }
  GM.bus.on('dia:avanzado', function () {
    const st = GM.state; if (!st || !st.continental) return;
    Object.keys(st.continental).forEach(id => {
      const c = st.continental[id]; if (c.estado === 'fin') return;
      if (c.estado === 'pendiente') { if (st.fecha >= yearOf(st) + '-09-26') empezarPrevia(st, c); return; }
      if (c.estado === 'previa') {
        c.previa.forEach(s => { if (!s.ganador && serieLista(st, s.g)) s.ganador = ganadorSerie(st, s.a, s.b, s.g); });
        if (c.previa.every(s => s.ganador)) pasarAGrupos(st, c); return;
      }
      if (c.estado === 'grupos') {
        if (!c.grupos.every(g => serieLista(st, g.ids))) return;
        const q = []; c.grupos.forEach((g, gi) => { const t = tablaGrupo(st, id, gi); q.push([t[0].equipoId, t[1].equipoId]); });
        const ult = c.grupos.reduce((m, g) => g.ids.reduce((mm, i) => getG(st, i).fecha > mm ? getG(st, i).fecha : mm, m), '2000-01-01');
        const ng = q.length, pares = [];
        for (let i = 0; i < ng; i++) pares.push([q[i][0], q[(i + 1) % ng][1]]);
        c.estado = 'ko'; crearKO(st, c, 0, pares, ult);
        GM.noticia(st, c.nombre + ': empiezan las eliminatorias.'); return;
      }
      if (c.estado === 'ko') {
        const r = c.ko[c.ko.length - 1];
        r.series.forEach(s => { if (!s.ganador && serieLista(st, s.g)) s.ganador = s.g.length === 1 ? (getG(st, s.g[0]).resultado.local > getG(st, s.g[0]).resultado.visitante ? getG(st, s.g[0]).local : getG(st, s.g[0]).visitante) : ganadorSerie(st, s.a, s.b, s.g); });
        if (!r.series.every(s => s.ganador)) return;
        if (c.ko.length >= c.koNombres.length) { c.campeon = r.series[0].ganador; c.estado = 'fin'; st.historial.push({ temporada: st.temporada, comp: id, campeon: c.campeon }); GM.noticia(st, '🏆 ' + st.equipos[c.campeon].nombre + ' gana la ' + c.nombre + '.'); GM.bus.emit('copa:fin', { copa: id, campeon: c.campeon }); return; }
        const gan = r.series.map(s => s.ganador), pares = [], ult = r.series.reduce((m, s) => s.g.reduce((mm, i) => getG(st, i).fecha > mm ? getG(st, i).fecha : mm, m), '2000-01-01');
        for (let i = 0; i < gan.length; i += 2) pares.push(st.equipos[gan[i]].reputacion >= st.equipos[gan[i + 1]].reputacion ? [gan[i], gan[i + 1]] : [gan[i + 1], gan[i]]);
        crearKO(st, c, c.ko.length, pares, ult);
      }
    });
  });
  GM.bus.on('temporada:nueva', function () { const st = GM.state; if (st && st.continental) iniciar(st); });
  function estado(st) { return st.continental || {}; }
  function de(st, clubId) { return Object.keys(st.continental || {}).filter(id => { const c = st.continental[id]; return c.directos.indexOf(clubId) >= 0 || c.pre.indexOf(clubId) >= 0; }); }
  function competicion(st, id) { const c = st.continental[id]; return c ? Object.assign({}, c) : null; }
  function nuevaPartida(st) { iniciar(st); }
  function selfTest() { const t = rr(['a', 'b', 'c', 'd', 'e']); return Object.keys(DEF).length === 2 && t.length === 5 && t.every(r => r.length === 2); }
  const base_ = GM.compNombre; GM.compNombre = (st, comp) => (st.continental && st.continental[comp]) ? st.continental[comp].nombre : (base_ ? base_(st, comp) : comp);
  GM.register('continental', { estado, competicion, tablaGrupo, de, nuevaPartida, selfTest, DEF });
})();
