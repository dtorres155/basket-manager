/* RÚA DE CAMPEONES (GM.mods.rua) — cuando tu club gana un título (liga, copa o competición europea), la ciudad lo celebra:
   durante el día siguiente y el otro, en la calle (calle3d.js) un autobús descapotable con los jugadores y el trofeo recorre la avenida
   entre una multitud con los colores del club, con confeti y banderas.
   Expone: activa(st), revisar(st), nuevaPartida, selfTest. Escribe state.rua = { comp, nombre, desde, hasta } y state.ruaHist (títulos ya vistos). */
(function () {
  const U = GM.util;
  function nombreComp(st, comp) {
    const l = st.ligas && st.ligas[comp], c = st.copas && st.copas[comp], e = st.continental && st.continental[comp];
    return (c && c.nombre) || (e && e.nombre) || (l && l.nombre) || comp;
  }
  // Mira si en el historial hay títulos nuevos del club (se llama al avanzar cada día)
  function revisar(st) {
    if (!st || !st.historial) return;
    if (st.ruaHist == null) st.ruaHist = st.historial.length;
    const nuevos = st.historial.slice(st.ruaHist).filter(h => h.campeon === st.clubId); st.ruaHist = st.historial.length;
    if (!nuevos.length) return;
    const h = nuevos[nuevos.length - 1], nombre = nombreComp(st, h.comp);
    st.rua = { comp: h.comp, nombre, desde: st.fecha, hasta: U.addDays(st.fecha, 1) };
    GM.noticia(st, '🏆 Rúa de campeones: el ' + st.equipos[st.clubId].nombre + ' pasea el título de ' + nombre + ' por las calles de ' + st.equipos[st.clubId].ciudad + '. Sal a la calle a verlo.');
  }
  function activa(st) { return !!(st && st.rua && st.fecha >= st.rua.desde && st.fecha <= st.rua.hasta); }
  function nuevaPartida(st) { st.rua = null; st.ruaHist = 0; }
  GM.bus.on('dia:avanzado', () => revisar(GM.state));
  function selfTest() {
    const st = { fecha: '2027-06-10', clubId: 'x', equipos: { x: { nombre: 'X', ciudad: 'Y' } }, historial: [{ comp: 'ACB', campeon: 'z' }], ruaHist: 0, noticias: [] };
    revisar(st); if (st.rua) return false;
    st.historial.push({ comp: 'ACB', campeon: 'x' }); const n = GM.noticia; GM.noticia = () => {}; revisar(st); GM.noticia = n;
    return activa(st) && st.ruaHist === 2 && !activa(Object.assign({}, st, { fecha: '2027-06-12' }));
  }
  GM.register('rua', { activa, revisar, nuevaPartida, selfTest });
})();
