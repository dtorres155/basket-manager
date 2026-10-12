/* RIVALIDADES (GM.mods.rivalidades)
   Derbis y rivalidades históricas. Un partido entre rivales sube la asistencia (finanzas), mueve la afición y el ánimo de la plantilla (por victoria o derrota)
   y se anuncia en el próximo partido. Se añade como rival «tu gran rival» el elegido en Afición > Identidad (state.fans.identidad.rival).
   Con historia: cada partido entre rivales deja rachas y, si fue memorable (final de liga o de copa, paliza de 20 o más, victoria ajustada de 3 o menos, prórroga o la primera victoria
   tras una racha de cinco), un recuerdo con su texto. Los recuerdos se citan en la previa del siguiente duelo y en la prensa (prensa.js). El ambiente de cada clásico (0 a 3) suma
   la intensidad del derbi, sus recuerdos y lo que se juega.
   Expone: derbi(st,a,b), rivalesDe(st,club), historial(st,a,b), historia(st,a,b), recuerdos(st,club), ambiente(st,a,b), selfTest.
   Escribe state.rivalidades = { h2h:{ 'a|b': {a:n, b:n} }, rachas:{ 'a|b': {ult, n} }, mem:[{ id, fecha, temporada, a, b, ganador, marcador, tipo, texto, nombre }] }. */
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
    registrarHistoria(st, g, d, gan, k);
    [g.local, g.visitante].forEach(id => st.equipos[id].plantilla.forEach(pid => { const p = st.jugadores[pid]; if (p) p.estado.moral = U.clamp(p.estado.moral + (id === gan ? 2 : -2) * d.i, 20, 100); }));
    if (g.local === st.clubId || g.visitante === st.clubId) {
      const c = st.ciudad && st.ciudad[st.clubId], mio = gan === st.clubId, rival = g.local === st.clubId ? g.visitante : g.local;
      if (c) { c.aficion = U.clamp(c.aficion + (mio ? 3 : -2) * d.i, 0, 100); c.ambiente = U.clamp(c.ambiente + (mio ? 2 : -1) * d.i, 0, 100); }
      GM.noticia(st, d.nombre + ': ' + (mio ? 'victoria' : 'derrota') + ' ante ' + st.equipos[rival].nombre + ' (' + g.resultado.local + '-' + g.resultado.visitante + '). ' + (mio ? 'La grada está en éxtasis.' : 'Duele más de lo normal.'));
    }
  });
  // ---------- Historia y recuerdos ----------
  const finalDe = (st, g) => { if (g.fase === 'copa') return g.ronda === 3; if (g.fase !== 'playoff') return false; const po = st.playoffs && st.playoffs[g.comp], F = GM.mods.competiciones && GM.mods.competiciones.FORM && po ? GM.mods.competiciones.FORM[po.formato] : null; return !!F && g.ronda === F.rondas.length; };
  function registrarHistoria(st, g, d, gan, k) {
    const R = st.rivalidades; R.rachas = R.rachas || {}; R.mem = R.mem || []; const rc = R.rachas[k] || (R.rachas[k] = { ult: null, n: 0 }), perd = gan === g.local ? g.visitante : g.local;
    const antes = { ult: rc.ult, n: rc.n }; if (rc.ult === gan) rc.n++; else { rc.ult = gan; rc.n = 1; }
    const a = g.resultado.local, b = g.resultado.visitante, dif = Math.abs(a - b), nom = id => st.equipos[id].nombre, marc = (gan === g.local ? a + '-' + b : b + '-' + a), fin = finalDe(st, g);
    let tipo = null, texto = '';
    if (fin) { tipo = 'final'; texto = nom(gan) + ' derrotó a ' + nom(perd) + ' (' + marc + ') en un partido decisivo de ' + (GM.compNombre ? GM.compNombre(st, g.copa || g.comp) : g.comp) + '.'; }
    else if (antes.ult === perd && antes.n >= 5) { tipo = 'racha'; texto = nom(gan) + ' cortó por fin una racha de ' + antes.n + ' derrotas seguidas ante ' + nom(perd) + ' (' + marc + ').'; }
    else if (g.resultado.ot) { tipo = 'prorroga'; texto = 'Prórroga de vértigo: ' + nom(gan) + ' se impuso a ' + nom(perd) + ' por ' + marc + '.'; }
    else if (dif >= 20) { tipo = 'paliza'; texto = nom(gan) + ' arrolló a ' + nom(perd) + ' por ' + marc + '.'; }
    else if (dif <= 3) { tipo = 'ajustado'; texto = nom(gan) + ' ganó por la mínima a ' + nom(perd) + ' (' + marc + ').'; }
    if (!tipo) return;
    R.mem.unshift({ id: g.id, fecha: g.fecha, temporada: st.temporada, a: g.local, b: g.visitante, ganador: gan, marcador: marc, tipo, texto, nombre: d.nombre, peso: tipo === 'final' ? 3 : tipo === 'racha' ? 2 : 1 });
    if (R.mem.length > 90) R.mem.length = 90;
    if (g.local === st.clubId || g.visitante === st.clubId) GM.noticia(st, '📜 Queda para la historia del ' + d.nombre.toLowerCase() + ': ' + texto);
  }
  function historia(st, a, b) {
    const R = st.rivalidades, k = key(a, b), duelos = (st.calendario || []).filter(g => g.resultado && ((g.local === a && g.visitante === b) || (g.local === b && g.visitante === a))).sort((x, y) => y.fecha < x.fecha ? -1 : 1);
    const mem = ((R && R.mem) || []).filter(m => key(m.a, m.b) === k), rc = R && R.rachas ? R.rachas[k] : null;
    return { h2h: historial(st, a, b), racha: rc && rc.n >= 2 ? { equipoId: rc.ult, n: rc.n } : null, ultimos: duelos.slice(0, 5).map(g => ({ fecha: g.fecha, local: g.local, visitante: g.visitante, res: g.resultado.local + '-' + g.resultado.visitante, ganador: g.resultado.local > g.resultado.visitante ? g.local : g.visitante })), recuerdos: mem.slice(0, 6) };
  }
  function recuerdos(st, club) { const R = st.rivalidades; return ((R && R.mem) || []).filter(m => m.a === club || m.b === club).slice(0, 20); }
  // Ambiente especial de un duelo: 0 normal, 1 caliente, 2 clásico, 3 clásico con mucha historia
  function ambiente(st, a, b) { const d = derbi(st, a, b); if (!d) return 0; const R = st.rivalidades, k = key(a, b), peso = ((R && R.mem) || []).filter(m => key(m.a, m.b) === k).reduce((s, m) => s + m.peso, 0); return Math.min(3, d.i + (peso >= 6 ? 1 : 0)); }
  // La previa de un clásico recuerda lo mejor y lo peor de sus encuentros
  GM.bus.on('dia:avanzado', function () {
    const st = GM.state; if (!st || !st.rivalidades || !GM.mods.competiciones) return; const g = GM.mods.competiciones.proximoPartido(st, st.clubId); if (!g || g.previa) return;
    if (U.diffDays(st.fecha, g.fecha) > 1) return; const d = derbi(st, g.local, g.visitante); if (!d) return; g.previa = true;
    const rival = g.local === st.clubId ? g.visitante : g.local, H = historia(st, st.clubId, rival), amb = ambiente(st, g.local, g.visitante), rec = H.recuerdos[0];
    GM.noticia(st, '🔥 ' + d.nombre + ' a la vista: ' + (amb >= 3 ? 'ambiente de clásico histórico. ' : amb >= 2 ? 'la ciudad no habla de otra cosa. ' : '') + (rec ? 'Se recuerda que ' + rec.texto : 'Todo el barrio espera este duelo.'));
    const c = st.ciudad && st.ciudad[st.clubId]; if (c) { c.ambiente = U.clamp(c.ambiente + amb, 0, 100); c.aficion = U.clamp(c.aficion + (amb >= 2 ? 1 : 0), 0, 100); }
  });
  function nuevaPartida(st) { st.rivalidades = { h2h: {}, rachas: {}, mem: [] }; }
  function selfTest() {
    const st = { clubId: 'real-madrid', equipos: { 'real-madrid': { ciudad: 'Madrid' }, 'fc-barcelona': { ciudad: 'Barcelona' }, x: { ciudad: 'Madrid' }, y: { ciudad: 'Sevilla' } }, rivalidades: { h2h: {} } };
    return derbi(st, 'real-madrid', 'fc-barcelona').i === 2 && derbi(st, 'real-madrid', 'x').nombre === 'Derbi de Madrid' && derbi(st, 'real-madrid', 'y') === null && key('b', 'a') === 'a|b';
  }
  GM.register('rivalidades', { derbi, rivalesDe, historial, historia, recuerdos, ambiente, nuevaPartida, selfTest });
})();
