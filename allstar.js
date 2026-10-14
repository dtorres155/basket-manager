/* ALL-STAR Y CONCURSOS (GM.mods.allstar)
   A mitad de temporada cada liga grande celebra su fin de semana de las estrellas: NBA All-Star (14 de febrero), All-Star de la Euroliga y de la ACB (finales de enero).
   Se eligen los 24 mejores por producción (puntos, rebotes, asistencias y robos por partido, con un mínimo de partidos), repartidos en dos equipos (NBA: Este contra Oeste;
   el resto, Equipo A contra Equipo B por turnos de reparto). Hay partido, concurso de triples (8 tiradores) y concurso de mates (6 saltadores) que se resuelven por rondas.
   En modo carrera, si tu jugador está entre los 24 o tiene nivel de concurso, cinco días antes recibe la invitación y la aceptas o la rechazas (responder).
   Efectos: ánimo y valor de los elegidos de tu club, ambiente de la ciudad y, en carrera, fama.
   Expone: estado, evento, invitaciones, responder, selfTest. Escribe state.allstar = { temp, eventos: { LIGA: { id, nombre, fecha, estado, ... } }, inv }. */
(function () {
  const U = GM.util, yearOf = st => parseInt(st.temporada.slice(0, 4), 10);
  const DEF = {
    NBA: { nombre: 'NBA All-Star', fecha: y => (y + 1) + '-02-14', min: 40, n: 24, pts: 170 },
    EUROLIGA: { nombre: 'All-Star de la Euroliga', fecha: y => (y + 1) + '-01-31', min: 14, n: 20, pts: 120 },
    ACB: { nombre: 'All-Star de la Liga Endesa', fecha: y => (y + 1) + '-01-24', min: 14, n: 20, pts: 112 }
  };
  const att = (j, k) => j.att ? j.att[k] : 60;
  function estado(st) { return st.allstar || (st.allstar = { temp: null, eventos: {}, inv: {} }); }
  function iniciar(st) {
    const A = estado(st); A.temp = st.temporada; A.eventos = {}; A.inv = {};
    Object.keys(DEF).forEach(l => { if (st.ligas && st.ligas[l]) A.eventos[l] = { id: l, nombre: DEF[l].nombre, fecha: DEF[l].fecha(yearOf(st)), estado: 'pendiente' }; });
  }
  const rnd = seed => { let a = U.hash(seed) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  function candidatos(st, liga) {
    const c = (st.estComp || {})[liga]; if (!c) return [];
    const ids = Object.keys(c).filter(i => st.jugadores[i]), max = ids.reduce((m, i) => Math.max(m, c[i][0]), 0), min = Math.max(1, Math.ceil(max * 0.45));
    return ids.filter(i => c[i][0] >= min && c[i][1] / c[i][0] >= 14).map(i => { const a = c[i], pj = a[0], s = a[2] / pj + a[3] / pj * 0.9 + a[4] / pj * 1.3 + (a[5] / pj + a[6] / pj) * 1.5; return { id: i, score: s + st.jugadores[i].ovr * 0.08 }; }).sort((a, b) => b.score - a.score);
  }
  const equipoDe = (st, id) => st.equipos[st.jugadores[id].equipoId] || {};
  // posible participante de un concurso: el mejor tirador de triples (tiro3 y tiro libre) o el más atlético (físico, altura moderada)
  const tiradores = (st, liga, r) => Object.keys(st.jugadores).map(i => st.jugadores[i]).filter(j => j && GM.mods.mercado.ligaDe(st, j.equipoId) === liga && j.att && !j.libre).map(j => ({ j, v: att(j, 'tiro3') * 0.8 + att(j, 'tl') * 0.2 + r() * 6 })).sort((a, b) => b.v - a.v).slice(0, 8);
  const saltadores = (st, liga, r) => Object.keys(st.jugadores).map(i => st.jugadores[i]).filter(j => j && GM.mods.mercado.ligaDe(st, j.equipoId) === liga && j.att && !j.libre && j.edad <= 31).map(j => ({ j, v: att(j, 'fisico') * 0.7 + (j.altura < 205 ? 8 : 0) + (j.altura < 192 ? 4 : 0) + r() * 8 })).sort((a, b) => b.v - a.v).slice(0, 6);
  function concurso(items, rondas, r, valor) {
    let vivos = items.map(x => ({ id: x.j.id, nombre: x.j.nombre, puntos: [] })), hist = [];
    rondas.forEach((n, ri) => { vivos.forEach(v => { const pj = items.find(x => x.j.id === v.id); const p = valor(pj.j, r); v.puntos.push(p); v.total = (v.total || 0) + p; }); vivos.sort((a, b) => b.total - a.total); hist.push({ ronda: ri + 1, tabla: vivos.map(v => ({ id: v.id, nombre: v.nombre, puntos: v.puntos[v.puntos.length - 1], total: v.total })) }); vivos = vivos.slice(0, n); vivos.forEach(v => { v.total = 0; }); });
    return { ganador: vivos[0] ? vivos[0].id : null, rondas: hist };
  }
  function resolver(st, liga) {
    const A = estado(st), ev = A.eventos[liga], d = DEF[liga]; if (!ev || ev.estado !== 'pendiente') return null;
    const r = rnd(st.seed + liga + st.temporada), cand = candidatos(st, liga); if (cand.length < d.n) { ev.estado = 'cancelado'; return null; }
    const top = cand.slice(0, d.n); let a = [], b = [];
    if (liga === 'NBA') top.forEach(t => { const cf = equipoDe(st, t.id).conferencia; (cf === 'O' ? b : a).push(t.id); }); else top.forEach((t, i) => { (i % 4 === 0 || i % 4 === 3 ? a : b).push(t.id); });
    const rating = L => L.reduce((s, i) => s + st.jugadores[i].ovr, 0) / Math.max(1, L.length), ra = rating(a), rb = rating(b), base = d.pts + r() * 14, sa = Math.round(base + (ra - rb) * 1.2 + (r() - 0.5) * 26), sb = Math.round(base - (ra - rb) * 1.2 + (r() - 0.5) * 26);
    const resA = sa === sb ? sa + 2 : sa, ganA = resA > sb, gan = ganA ? a : b, mvp = gan.slice().sort((x, y) => (st.jugadores[y].ovr + r() * 14) - (st.jugadores[x].ovr + r() * 14))[0];
    ev.partido = { a, b, nombreA: liga === 'NBA' ? 'Este' : 'Equipo A', nombreB: liga === 'NBA' ? 'Oeste' : 'Equipo B', pa: resA, pb: sb, mvp };
    // concursos: los invitados y quien haya aceptado
    const inv = A.inv[liga] || {}, yo = st.modo === 'carrera' ? st.jugadores.yo : null;
    let tir = tiradores(st, liga, r), sal = saltadores(st, liga, r);
    if (yo && inv.triples === 'aceptada' && !tir.some(x => x.j.id === 'yo')) { tir = tir.slice(0, 7); tir.push({ j: yo }); }
    if (yo && inv.mates === 'aceptada' && !sal.some(x => x.j.id === 'yo')) { sal = sal.slice(0, 5); sal.push({ j: yo }); }
    const jug = inv.jugado || {}; let kt = 0, km = 0;   // si has jugado tú el concurso (ciudad_juego.js), tus rondas cuentan en lugar de la simulación
    ev.triples = concurso(tir, [4, 2, 1], r, (j, rr) => { const sim = Math.round(8 + (att(j, 'tiro3') - 60) / 4.2 + rr() * 9); if (j.id === 'yo' && jug.triples && jug.triples[kt] !== undefined) return jug.triples[kt++]; return sim; });
    ev.mates = concurso(sal, [3, 1], r, (j, rr) => { const sim = Math.round(38 + (att(j, 'fisico') - 60) / 2.6 + rr() * 11); if (j.id === 'yo' && jug.mates && jug.mates[km] !== undefined) return jug.mates[km++]; return sim; });
    ev.estado = 'hecho';
    const nom = id => st.jugadores[id].nombre, club = st.clubId;
    GM.noticia(st, '⭐ ' + d.nombre + ': ' + ev.partido.nombreA + ' ' + ev.partido.pa + ' - ' + ev.partido.pb + ' ' + ev.partido.nombreB + '. MVP: ' + nom(mvp) + '. Triples: ' + nom(ev.triples.ganador) + '. Mates: ' + nom(ev.mates.ganador) + '.');
    // efectos
    top.forEach(t => { const j = st.jugadores[t.id]; if (j.equipoId === club) { j.estado.moral = U.clamp(j.estado.moral + 5, 20, 100); GM.noticia(st, j.nombre + ' juega el ' + d.nombre + ' con ' + st.equipos[club].nombre + '.'); } });
    if (st.ciudad && st.ciudad[club] && top.some(t => st.jugadores[t.id].equipoId === club)) st.ciudad[club].ambiente = U.clamp(st.ciudad[club].ambiente + 2, 0, 100);
    if (yo && st.carrera) { const sel = top.some(t => t.id === 'yo'); let f = 0; if (sel) f += 3; if (ev.triples.ganador === 'yo') f += 4; if (ev.mates.ganador === 'yo') f += 4; if (mvp === 'yo') f += 4; if (f) { try { st.carrera.fama = Math.min(100, st.carrera.fama + f); } catch (e) { /* protegida */ } } ev.mio = { seleccionado: sel, triples: ev.triples.ganador === 'yo', mates: ev.mates.ganador === 'yo', mvp: mvp === 'yo' }; }
    ev.seleccionados = top.map(t => t.id); GM.bus.emit('allstar:fin', { liga });
    return ev;
  }
  // Invitaciones del jugador de carrera cinco días antes
  function invitar(st, liga) {
    const A = estado(st), yo = st.modo === 'carrera' ? st.jugadores.yo : null; if (!yo || !st.carrera || A.inv[liga]) return;
    const cand = candidatos(st, liga), d = DEF[liga], rango = cand.findIndex(c => c.id === 'yo'), inv = {};
    if (rango >= 0 && rango < d.n) { inv.seleccion = 'aceptada'; GM.noticia(st, '⭐ Estás entre los elegidos para el ' + d.nombre + '.'); }
    if (att(yo, 'tiro3') >= 82) inv.triples = 'ofrecida'; if (att(yo, 'fisico') >= 86 && yo.altura < 200) inv.mates = 'ofrecida';
    A.inv[liga] = inv; if (inv.triples || inv.mates) GM.noticia(st, 'Te invitan a un concurso del ' + d.nombre + ': decide si participas.');
  }
  function responder(st, liga, concurso, acepta) { const A = estado(st), i = A.inv[liga]; if (!i || i[concurso] !== 'ofrecida') return { ok: false, motivo: 'No hay invitación.' }; i[concurso] = acepta ? 'aceptada' : 'rechazada'; return { ok: true }; }
  GM.bus.on('dia:avanzado', function () {
    const st = GM.state; if (!st || !st.allstar) return; const A = st.allstar;
    Object.keys(A.eventos).forEach(l => {
      const ev = A.eventos[l]; if (ev.estado !== 'pendiente') return;
      if (U.diffDays(st.fecha, ev.fecha) === 5) invitar(st, l);
      if (st.fecha >= ev.fecha) { if (!A.inv[l]) invitar(st, l); resolver(st, l); }
    });
  });
  GM.bus.on('temporada:nueva', function () { const st = GM.state; if (st && st.ligas) iniciar(st); });
  function invitaciones(st) { const A = estado(st), out = []; Object.keys(A.inv).forEach(l => { const ev = A.eventos[l]; if (!ev || ev.estado !== 'pendiente') return; ['triples', 'mates'].forEach(c => { if (A.inv[l][c] === 'ofrecida') out.push({ liga: l, concurso: c, evento: ev.nombre, fecha: ev.fecha }); }); }); return out; }
  function registrarJugado(st, liga, tipo, valores) { const i = estado(st).inv[liga]; if (!i) return false; (i.jugado = i.jugado || {})[tipo] = valores; return true; }
  function evento(st, liga) { return estado(st).eventos[liga] || null; }
  function nuevaPartida(st) { st.allstar = { temp: null, eventos: {}, inv: {} }; iniciar(st); }
  function selfTest() {
    const st = { seed: 3, temporada: '2026-27', noticias: [], ligas: { NBA: {} }, equipos: { e1: { conferencia: 'E', plantilla: [] }, e2: { conferencia: 'O', plantilla: [] } }, jugadores: {}, estComp: { NBA: {} }, clubId: 'e1', modo: 'gestor', ciudad: {} };
    GM.mods.mercado = GM.mods.mercado || { ligaDe: () => 'NBA' }; const ligaDe0 = GM.mods.mercado.ligaDe; GM.mods.mercado.ligaDe = () => 'NBA';
    for (let i = 0; i < 60; i++) { const id = 'j' + i, eq = i % 2 ? 'e1' : 'e2'; st.jugadores[id] = { id, nombre: id, equipoId: eq, ovr: 60 + (i % 30), edad: 25, altura: 195, att: { tiro3: 60 + (i % 35), tl: 70, fisico: 55 + (i % 40) }, estado: { moral: 70 } }; st.estComp.NBA[id] = [50, 1700, 10 + (i % 20) * 50 / 50 * 50, 300, 200, 40, 20]; }
    iniciar(st); const ev = resolver(st, 'NBA'); GM.mods.mercado.ligaDe = ligaDe0;
    return !!ev && ev.estado === 'hecho' && ev.partido.a.length + ev.partido.b.length === 24 && !!ev.triples.ganador && !!ev.mates.ganador && ev.triples.rondas.length === 3;
  }
  GM.register('allstar', { registrarJugado, estado, evento, invitaciones, responder, resolver, nuevaPartida, selfTest, DEF });
})();
