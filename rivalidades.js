/* RIVALIDADES (GM.mods.rivalidades)
   Derbis y rivalidades históricas. Un partido entre rivales sube la asistencia (finanzas), mueve la afición y el ánimo de la plantilla (por victoria o derrota)
   y se anuncia en el próximo partido. Se añade como rival «tu gran rival» el elegido en Afición > Identidad (state.fans.identidad.rival).
   Expone: derbi(st,a,b), rivalesDe(st,club), historial(st,a,b), selfTest. Escribe state.rivalidades = { h2h:{ 'a|b': {a:n, b:n} } }. */
(function () {
  const U = GM.util;
  const PARES = [
    ['real-madrid', 'fc-barcelona', 'El Clásico', 2], ['joventut-badalona', 'fc-barcelona', 'Derbi catalán', 2], ['baskonia', 'bilbao-basket', 'Derbi vasco', 1], ['valencia-basket', 'real-madrid', 'Duelo de campeones', 1],
    ['olympiacos', 'panathinaikos', 'Derbi de los eternos rivales', 2], ['aris', 'paok', 'Derbi de Tesalónica', 2], ['aek-atenas', 'olympiacos', 'Derbi griego', 1], ['aek-atenas', 'panathinaikos', 'Derbi de Atenas', 1],
    ['fenerbahce', 'anadolu-efes', 'Derbi de Estambul', 2], ['fenerbahce', 'galatasaray', 'Derbi de Estambul', 2], ['galatasaray', 'besiktas', 'Derbi de Estambul', 2], ['fenerbahce', 'besiktas', 'Derbi de Estambul', 2],
    ['bayern-munich', 'alba-berlin', 'Duelo alemán', 2], ['olimpia-milano', 'virtus-bologna', 'Duelo italiano', 2], ['crvena-zvezda', 'partizan', 'Derbi eterno de Belgrado', 2], ['maccabi-tel-aviv', 'hapoel-tel-aviv', 'Derbi de Tel Aviv', 2],
    ['los-angeles-lakers', 'boston-celtics', 'Lakers contra Celtics', 2], ['los-angeles-lakers', 'los-angeles-clippers', 'Derbi de Los Ángeles', 2], ['new-york-knicks', 'brooklyn-nets', 'Derbi de Nueva York', 2],
    ['boston-celtics', 'new-york-knicks', 'Clásico del Este', 1], ['boston-celtics', 'miami-heat', 'Rivalidad del Este', 1], ['boston-celtics', 'philadelphia-76ers', 'Rivalidad histórica', 1],
    ['golden-state-warriors', 'los-angeles-lakers', 'Costa Oeste', 1], ['golden-state-warriors', 'sacramento-kings', 'Derbi de California', 1], ['dallas-mavericks', 'houston-rockets', 'Derbi de Texas', 1],
    ['houston-rockets', 'san-antonio-spurs', 'Derbi de Texas', 1], ['dallas-mavericks', 'san-antonio-spurs', 'Derbi de Texas', 1], ['chicago-bulls', 'detroit-pistons', 'Rivalidad del Medio Oeste', 1], ['minnesota-timberwolves', 'milwaukee-bucks', 'Rivalidad del Norte', 1]
  ];
  const key = (a, b) => a < b ? a + '|' + b : b + '|' + a;
  function mapa(st) { if (!st._rivMapa) { st._rivMapa = {}; } return st._rivMapa; }
  function derbi(st, a, b) {
    if (a === b || !st.equipos[a] || !st.equipos[b]) return null;
    const k = key(a, b);
    for (const p of PARES) if (key(p[0], p[1]) === k) return { nombre: p[2], i: p[3] };
    const r = st.fans && st.fans.identidad && st.fans.identidad.rival;
    if (r && st.clubId && ((a === st.clubId && b === r) || (b === st.clubId && a === r))) return { nombre: 'Tu gran rival', i: 2 };
    const A = st.equipos[a], B = st.equipos[b];
    if (A.ciudad && A.ciudad === B.ciudad && a !== b) return { nombre: 'Derbi de ' + A.ciudad, i: 1 };
    return null;
  }
  function rivalesDe(st, club) {
    const out = [];
    Object.keys(st.equipos).forEach(id => { const d = derbi(st, club, id); if (d) out.push(Object.assign({ equipoId: id }, d, { hist: historial(st, club, id) })); });
    return out.sort((x, y) => y.i - x.i);
  }
  function historial(st, a, b) { const h = st.rivalidades && st.rivalidades.h2h[key(a, b)]; return h ? { [a]: h[a] || 0, [b]: h[b] || 0 } : { [a]: 0, [b]: 0 }; }

  GM.bus.on('partido:jugado', function (e) {
    const st = GM.state; if (!st || !st.rivalidades) return;
    const g = e.partido, d = derbi(st, g.local, g.visitante); if (!d) return;
    const gan = g.resultado.local > g.resultado.visitante ? g.local : g.visitante, k = key(g.local, g.visitante), h = st.rivalidades.h2h[k] || (st.rivalidades.h2h[k] = {});
    h[gan] = (h[gan] || 0) + 1;
    [g.local, g.visitante].forEach(id => st.equipos[id].plantilla.forEach(pid => { const p = st.jugadores[pid]; if (p) p.estado.moral = U.clamp(p.estado.moral + (id === gan ? 2 : -2) * d.i, 20, 100); }));
    if (g.local === st.clubId || g.visitante === st.clubId) {
      const c = st.ciudad && st.ciudad[st.clubId], mio = gan === st.clubId, rival = g.local === st.clubId ? g.visitante : g.local;
      if (c) { c.aficion = U.clamp(c.aficion + (mio ? 3 : -2) * d.i, 0, 100); c.ambiente = U.clamp(c.ambiente + (mio ? 2 : -1) * d.i, 0, 100); }
      GM.noticia(st, d.nombre + ': ' + (mio ? 'victoria' : 'derrota') + ' ante ' + st.equipos[rival].nombre + ' (' + g.resultado.local + '-' + g.resultado.visitante + '). ' + (mio ? 'La grada está en éxtasis.' : 'Duele más de lo normal.'));
    }
  });
  function nuevaPartida(st) { st.rivalidades = { h2h: {} }; }
  function selfTest() {
    const st = { clubId: 'real-madrid', equipos: { 'real-madrid': { ciudad: 'Madrid' }, 'fc-barcelona': { ciudad: 'Barcelona' }, x: { ciudad: 'Madrid' }, y: { ciudad: 'Sevilla' } }, rivalidades: { h2h: {} } };
    return derbi(st, 'real-madrid', 'fc-barcelona').i === 2 && derbi(st, 'real-madrid', 'x').nombre === 'Derbi de Madrid' && derbi(st, 'real-madrid', 'y') === null && key('b', 'a') === 'a|b';
  }
  GM.register('rivalidades', { derbi, rivalesDe, historial, nuevaPartida, selfTest });
})();
