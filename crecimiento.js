/* LA CIUDAD CRECE CON EL CLUB (GM.mods.crecimiento)
   Cuando al club le va bien, su ciudad cambia. Hay ocho hitos urbanos (fan zone, gran tienda oficial, parada de metro con el nombre del club, hotel, plaza, estatua, museo y pistas
   públicas en los barrios). Cada hito se desbloquea al cumplir unos requisitos (afición, reputación, apoyo del ayuntamiento y títulos). En modo gestor o presidente tú lo impulsas
   (con coste en los que paga el club); en carrera y entrenador la ciudad lo hace sola con retraso. Tras una obra de varias semanas el hito se inaugura: da efectos permanentes
   (ingresos, asistencia, cantera) y aparece en la ciudad real (calle_real_detalle.js: rótulos, plaza, estatua y obra en curso). Además, el turismo y el comercio de la ciudad siguen a
   la reputación del club y a los hitos conseguidos.
   Expone: estado, hitos, impulsar, efectos, titulos, selfTest, HITOS. Escribe state.ciudad[club].crec = { hitos: { id: { estado, desde, fin } }, turismo, comercio, hist }. */
(function () {
  const U = GM.util, F = () => GM.mods.finanzas;
  const HITOS = [
    { id: 'fanzone', nombre: 'Fan zone junto al pabellón', desc: 'Una explanada con pantallas, música y puestos antes de cada partido.', req: { aficion: 58 }, coste: 180000, semanas: 12, efecto: { ingresos: 0.015, asistencia: 0.01 }, una: { ambiente: 2 } },
    { id: 'pistas', nombre: 'Pistas públicas en los barrios', desc: 'Canastas nuevas en las plazas: más niños jugando, mejor cantera.', req: { aficion: 55, apoyo: 50 }, coste: 120000, semanas: 24, efecto: { cantera: 0.05 }, una: { aficion: 2 } },
    { id: 'tienda', nombre: 'Gran tienda oficial', desc: 'Un local grande con camisetas, museo de balones y cafetería.', req: { aficion: 66, reputacion: 55 }, coste: 350000, semanas: 24, efecto: { ingresos: 0.03 }, una: {} },
    { id: 'metro', nombre: 'Parada de metro con el nombre del club', desc: 'La estación más cercana al pabellón pasa a llevar el nombre del club.', req: { titulos: 1, apoyo: 55 }, coste: 0, semanas: 40, efecto: { asistencia: 0.04 }, una: { aficion: 2 } },
    { id: 'plaza', nombre: 'Plaza con el nombre del club', desc: 'El ayuntamiento bautiza una plaza junto al pabellón con el nombre del club.', req: { apoyo: 62, aficion: 60 }, coste: 0, semanas: 20, efecto: { asistencia: 0.01 }, una: { aficion: 4, apoyo: 3 } },
    { id: 'estatua', nombre: 'Estatua de la leyenda del club', desc: 'Un homenaje de bronce a quien lo ganó todo con la camiseta.', req: { titulos: 2 }, coste: 90000, semanas: 16, efecto: {}, una: { aficion: 5 } },
    { id: 'hotel', nombre: 'Hotel con el nombre del club', desc: 'Un hotel de la zona se asocia con el club: turismo de baloncesto los fines de semana.', req: { reputacion: 62, aficion: 60 }, coste: 0, semanas: 52, efecto: { ingresos: 0.025 }, una: { aficion: 3 } },
    { id: 'museo', nombre: 'Museo del club', desc: 'Las copas, las camisetas históricas y un recorrido por el pabellón.', req: { titulos: 3, reputacion: 65 }, coste: 600000, semanas: 48, efecto: { ingresos: 0.02 }, una: { aficion: 3 } }
  ];
  const gestiona = st => st.modo === 'gestor' || st.modo === 'presidente';
  function crec(st, club) { const c = st.ciudad && st.ciudad[club || st.clubId]; if (!c) return null; return c.crec || (c.crec = { hitos: {}, turismo: 20, comercio: 30, hist: [] }); }
  function titulos(st, club) { return (st.historial || []).filter(h => h.campeon === club && h.comp !== 'TORNEO_VERANO' && (st.ligas[h.comp] || (st.copas && st.copas[h.comp]) || /^(EUROLIGA|EUROCUP|BCL|EUROCUP_COPA)/.test(h.comp))).length; }
  function metricas(st, club) { const c = st.ciudad[club], eq = st.equipos[club]; return { aficion: c.aficion, apoyo: c.apoyoAyuntamiento, reputacion: eq.reputacion, titulos: titulos(st, club) }; }
  const cumple = (h, m) => Object.keys(h.req).every(k => m[k] >= h.req[k]);
  function hitos(st, club) {
    club = club || st.clubId; const C = crec(st, club); if (!C) return []; const m = metricas(st, club);
    return HITOS.map(h => { const s = C.hitos[h.id] || { estado: 'bloqueado' }; return Object.assign({}, h, s, { falta: Object.keys(h.req).filter(k => m[k] < h.req[k]).map(k => ({ k, tiene: Math.round(m[k]), pide: h.req[k] })), progreso: s.estado === 'obra' ? U.clamp(1 - U.diffDays(st.fecha, s.fin) / (h.semanas * 7), 0, 1) : 0 }); });
  }
  function impulsar(st, id) {
    const C = crec(st), h = HITOS.find(x => x.id === id); if (!C || !h) return { ok: false, motivo: 'Hito desconocido.' }; const s = C.hitos[id];
    if (!s || s.estado !== 'disponible') return { ok: false, motivo: s && s.estado === 'obra' ? 'Ya está en obras.' : s && s.estado === 'hecho' ? 'Ya está inaugurado.' : 'Todavía no se cumplen los requisitos.' };
    if (!gestiona(st)) return { ok: false, motivo: 'La ciudad lo impulsará sola cuando llegue el momento.' };
    if (h.coste && F()) { if (st.finanzas[st.clubId].caja < h.coste) return { ok: false, motivo: 'No hay caja para ' + U.eur(h.coste) + '.' }; F().registrar(st, st.clubId, 'Obra: ' + h.nombre, -h.coste); }
    empezar(st, h); return { ok: true };
  }
  function empezar(st, h) { const C = crec(st); C.hitos[h.id] = { estado: 'obra', desde: st.fecha, fin: U.addDays(st.fecha, h.semanas * 7) }; GM.noticia(st, '🏗️ Empiezan las obras: ' + h.nombre.toLowerCase() + ' (' + h.semanas + ' semanas).'); }
  function terminar(st, h) {
    const C = crec(st), c = st.ciudad[st.clubId]; C.hitos[h.id].estado = 'hecho'; C.hitos[h.id].fecha = st.fecha;
    Object.keys(h.una || {}).forEach(k => { const key = k === 'apoyo' ? 'apoyoAyuntamiento' : k; c[key] = U.clamp((c[key] || 0) + h.una[k], 0, 100); });
    C.hist.unshift({ fecha: st.fecha, texto: 'Se inaugura: ' + h.nombre }); GM.noticia(st, '🎉 Se inaugura: ' + h.nombre.toLowerCase() + '. La ciudad crece con el club.'); GM.bus.emit('crecimiento:hito', { id: h.id });
  }
  function diario(st) {
    if (!st || !st.ciudad || !st.ciudad[st.clubId]) return; const C = crec(st); if (!C) return;
    HITOS.forEach(h => { const s = C.hitos[h.id]; if (s && s.estado === 'obra' && st.fecha >= s.fin) terminar(st, h); });
    if (st.fecha.slice(8, 10) !== '01') return;
    const m = metricas(st, st.clubId), eq = st.equipos[st.clubId];
    HITOS.forEach(h => {
      const s = C.hitos[h.id] || (C.hitos[h.id] = { estado: 'bloqueado' });
      if (s.estado === 'bloqueado' && cumple(h, m)) { s.estado = 'disponible'; s.desde = st.fecha; GM.noticia(st, '🏙️ ' + (gestiona(st) ? 'Puedes impulsar' : 'La ciudad propone') + ': ' + h.nombre.toLowerCase() + '.'); }
      else if (s.estado === 'disponible' && !gestiona(st) && U.diffDays(s.desde, st.fecha) >= 60 && GM.rng.next() < 0.25) empezar(st, h);
    });
    const hechos = HITOS.filter(h => C.hitos[h.id] && C.hitos[h.id].estado === 'hecho').length, tt = 15 + eq.reputacion * 0.45 + hechos * 4, tc = 25 + m.aficion * 0.35 + hechos * 4;
    C.turismo = Math.round((C.turismo + (tt - C.turismo) * 0.04) * 10) / 10; C.comercio = Math.round((C.comercio + (tc - C.comercio) * 0.04) * 10) / 10;
  }
  GM.bus.on('dia:avanzado', function () { diario(GM.state); });
  function efectos(st, club) {
    const C = crec(st, club || st.clubId), e = { ingresos: 0, asistencia: 0, cantera: 0 }; if (!C) return e;
    HITOS.forEach(h => { if (C.hitos[h.id] && C.hitos[h.id].estado === 'hecho') Object.keys(h.efecto).forEach(k => { e[k] += h.efecto[k]; }); });
    e.ingresos += (C.turismo - 30) / 1000; e.asistencia += (C.comercio - 40) / 1500; return e;
  }
  function estado(st) { const C = crec(st); return C ? { turismo: C.turismo, comercio: C.comercio, hechos: Object.keys(C.hitos).filter(k => C.hitos[k].estado === 'hecho'), hist: C.hist } : null; }
  function nuevaPartida(st) { Object.keys(st.ciudad || {}).forEach(id => { st.ciudad[id].crec = { hitos: {}, turismo: 20 + st.equipos[id].reputacion * 0.2, comercio: 30, hist: [] }; }); }
  function selfTest() {
    const st = { fecha: '2027-03-01', modo: 'gestor', clubId: 'a', noticias: [], historial: [{ temporada: '2026-27', comp: 'ACB', campeon: 'a' }], ligas: { ACB: {} }, equipos: { a: { reputacion: 70 } }, ciudad: { a: { aficion: 70, apoyoAyuntamiento: 70, ambiente: 60 } }, finanzas: { a: { caja: 1e7 } } };
    const F0 = GM.mods.finanzas; GM.mods.finanzas = null; GM.state = st; diario(st);
    const H = hitos(st), r = impulsar(st, 'fanzone'), disp = H.filter(h => h.estado === 'disponible').length; st.fecha = '2027-06-20'; diario(st); const ok = crec(st).hitos.fanzone.estado === 'hecho' && efectos(st).ingresos > 0; GM.mods.finanzas = F0; GM.state = null;
    return disp >= 4 && r.ok && ok && HITOS.length === 8;
  }
  GM.register('crecimiento', { estado, hitos, impulsar, efectos, titulos, nuevaPartida, selfTest, HITOS });
})();
