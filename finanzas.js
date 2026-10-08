/* FINANZAS (GM.mods.finanzas)
   Expone: registrar, ingresosPartido, cierreMes, ofertasPatrocinio, firmarPatrocinio, resumen, masaSalarial, selfTest.
   Escribe state.finanzas[clubId] = { caja, movimientos, patrocinios, temp, historial }. Movimientos detallados solo del club del jugador.
   Se suscribe a partido:jugado (taquilla), dia:avanzado (cierre el día 1 de cada mes), temporada:fin y temporada:nueva. */
(function () {
  const U = GM.util;
  const ESC = { NBA: { precio: 82, merch: 12, tv: 1.0e6 }, EUROLIGA: { precio: 34, merch: 5, tv: 0.14e6 }, ACB: { precio: 23, merch: 3, tv: 0.05e6 }, LEGA: { precio: 19, merch: 2, tv: 0.04e6 }, GBL: { precio: 18, merch: 2, tv: 0.04e6 }, BBL: { precio: 24, merch: 3, tv: 0.05e6 }, BSL: { precio: 20, merch: 2.5, tv: 0.05e6 } };
  const BASE = 0.44, OPEX = 0.28;
  // Ingresos comerciales (parte del presupuesto) por liga, calibrados para que la media de cada liga cierre con un beneficio
  // pequeño (~3 % del presupuesto) y algunos clubes pierdan dinero (tools/finanzas_calibrar.js). Antes todos ganaban mucho.
  const BASE_LIGA = { NBA: 0.32, EUROLIGA: 0.17, ACB: 0.26, LEGA: 0.39, GBL: 0.42, BBL: 0.18, BSL: 0.34 };
  const baseDe = (st, id) => { const m = GM.mods.mercado, lg = m && m.ligaDe && st.ligas ? m.ligaDe(st, id) : null; return BASE_LIGA[lg] !== undefined ? BASE_LIGA[lg] : BASE; };
  const MARCAS = ['Nexora', 'Aurelia Seguros', 'Banco Levante', 'Volta Energía', 'Cierzo Bebidas', 'Ibérica Telecom', 'Delta Motor', 'Atlas Logística', 'Mistral Aerolíneas', 'Lumen Salud', 'Orbis Tecnología', 'Costa Dorada Hoteles'];
  const yearOf = st => parseInt(st.temporada.slice(0, 4), 10);
  const M = () => GM.mods;

  function escala(comp) { return ESC[comp] || ESC.LEGA; }
  function masaSalarial(st, clubId) {
    let s = 0; st.equipos[clubId].plantilla.forEach(i => { const p = st.jugadores[i]; if (p) s += p.contrato.salario; });
    return s;
  }
  function registrar(st, clubId, concepto, importe) {
    const f = st.finanzas && st.finanzas[clubId]; if (!f) return;
    importe = Math.round(importe);
    f.caja += importe;
    if (importe >= 0) f.temp.ingresos += importe; else f.temp.gastos -= importe;
    if (clubId === st.clubId) {
      f.movimientos.unshift({ fecha: st.fecha, concepto, importe });
      if (f.movimientos.length > 60) f.movimientos.length = 60;
    }
    GM.bus.emit('dinero:cambio', { clubId, concepto, importe });
  }
  function nombreMarca(clubId, i, st) { return MARCAS[(U.hash(clubId + i + st.temporada)) % MARCAS.length]; }
  function patrocinioBase(st, eq, i, tipo, frac, anos, ciu) {
    const h = U.hash(eq.id + st.temporada + i);
    return { id: 'pat-' + st.temporada + '-' + i, nombre: nombreMarca(eq.id, i, st), tipo, importeAnual: Math.round(eq.presupuesto * frac * (0.6 + eq.reputacion / 100 * 0.8) * (0.92 + (h % 17) / 100) * ciu / 1000) * 1000, anos, hasta: yearOf(st) + anos };
  }
  function ofertasPatrocinio(st, clubId) {
    if (GM.mods.contratos) return [];
    const eq = st.equipos[clubId], f = st.finanzas[clubId];
    const ciu = M().ciudad ? M().ciudad.modificadores(st, clubId).ingresos : 1;
    const tipos = [['Camiseta', 0.065], ['Pabellón (nombre del recinto)', 0.045], ['Cantera y formación', 0.02]];
    const h = U.hash(clubId + st.temporada);
    const out = [];
    tipos.forEach((t, i) => {
      if (f.patrocinios.some(p => p.tipo === t[0])) return;
      const o = patrocinioBase(st, eq, i, t[0], t[1], 1 + ((h >>> i) % 3), ciu);
      if (f.patrocinios.some(p => p.id === o.id)) return;
      out.push(o);
    });
    return out;
  }
  function firmarPatrocinio(st, clubId, id) {
    const o = ofertasPatrocinio(st, clubId).find(x => x.id === id);
    if (!o) return { ok: false, motivo: 'La oferta ya no está disponible.' };
    st.finanzas[clubId].patrocinios.push(o);
    registrar(st, clubId, 'Prima de firma: ' + o.nombre, Math.round(o.importeAnual * 0.1));
    return { ok: true };
  }
  function ingresosPartido(st, g) {
    const eq = st.equipos[g.local], rival = st.equipos[g.visitante];
    const esc = escala(g.comp), m = M();
    const aforo = m.estadio && m.estadio.aforo ? m.estadio.aforo(st, g.local) : eq.pabellon.aforo;
    const ciu = m.ciudad ? m.ciudad.modificadores(st, g.local) : { asistencia: 1, ingresos: 1 };
    const efe = m.estadio && m.estadio.efectos ? m.estadio.efectos(st, g.local) : { precio: 1, merch: 1, asistencia: 1 };
    const cl = st.ciudad[g.local] || { ambiente: 50, aficion: 50 };
    let fr = 0.40 + 0.22 * eq.reputacion / 100 + 0.14 * cl.ambiente / 100 + 0.08 * cl.aficion / 100 + 0.10 * rival.reputacion / 100;
    if (g.fase === 'playoff') fr += 0.12;
    const dv = m.rivalidades && m.rivalidades.derbi ? m.rivalidades.derbi(st, g.local, g.visitante) : null; if (dv) fr += 0.07 * dv.i;
    const fa = st.fans && g.local === st.clubId ? st.fans : null, ab = fa ? fa.abonos.precio : 1;
    if (fa && fa.identidad.rival && g.visitante === fa.identidad.rival) fr += 0.12;
    fr = U.clamp(fr * ciu.asistencia * efe.asistencia * (1 - 0.35 * (ab - 1)), 0.35, 1);
    const asistencia = Math.round(aforo * fr);
    const precio = esc.precio * (0.6 + eq.reputacion / 100 * 0.8) * efe.precio * (g.fase === 'playoff' ? 1.35 : 1) * ab;
    const entradas = Math.round(asistencia * precio * ciu.ingresos);
    const cdI = m.ciudadDeportiva && m.ciudadDeportiva.efectos && st.instalaciones && st.instalaciones[g.local] ? m.ciudadDeportiva.efectos(st, g.local).ingresos : 1;
    const merchandising = Math.round(asistencia * esc.merch * (0.5 + eq.reputacion / 100) * efe.merch * cdI);
    const tv = Math.round(esc.tv * (0.6 + eq.reputacion / 130));
    return { asistencia, entradas, merchandising, tv, total: entradas + merchandising + tv };
  }
  GM.bus.on('partido:jugado', function (e) {
    const st = GM.state; if (!st || !st.finanzas) return;
    const g = e.partido;
    if (!st.finanzas[g.local]) return;
    const r = ingresosPartido(st, g);
    if (g.local === st.clubId || g.visitante === st.clubId) { g.resultado.asistencia = r.asistencia; g.resultado.ingresos = r.total; }
    registrar(st, g.local, 'Taquilla y merchandising vs ' + st.equipos[g.visitante].siglas, r.total);
  });

  function cierreMes(st) {
    const y = yearOf(st);
    Object.keys(st.finanzas).forEach(id => {
      const eq = st.equipos[id], f = st.finanzas[id];
      const sal = masaSalarial(st, id) / 12;
      let mant = 0;
      const m = M();
      if (m.ciudadDeportiva && m.ciudadDeportiva.mantenimiento) mant += m.ciudadDeportiva.mantenimiento(st, id);
      if (m.estadio && m.estadio.mantenimiento) mant += m.estadio.mantenimiento(st, id);
      const pat = f.patrocinios.filter(p => p.hasta >= y).reduce((a, p) => a + p.importeAnual, 0) / 12;
      registrar(st, id, 'Sueldos de la plantilla', -sal);
      registrar(st, id, 'Gastos de estructura y viajes', -eq.presupuesto * OPEX / 12);
      if (mant) registrar(st, id, 'Mantenimiento de instalaciones', -mant);
      registrar(st, id, 'Ingresos comerciales y derechos', eq.presupuesto * baseDe(st, id) / 12);
      if (pat) registrar(st, id, 'Patrocinios', pat);
    });
  }
  GM.bus.on('dia:avanzado', function (e) {
    const st = GM.state; if (!st || !st.finanzas) return;
    if (st.fecha.slice(8) === '01') cierreMes(st);
  });
  GM.bus.on('temporada:fin', function () {
    const st = GM.state; if (!st || !st.finanzas) return;
    const f = st.finanzas[st.clubId];
    f.historial.unshift({ temporada: st.temporada, ingresos: f.temp.ingresos, gastos: f.temp.gastos, caja: f.caja });
    Object.keys(st.finanzas).forEach(id => { st.finanzas[id].temp = { ingresos: 0, gastos: 0 }; });
  });
  GM.bus.on('temporada:nueva', function () {
    const st = GM.state; if (!st || !st.finanzas) return;
    const y = yearOf(st);
    Object.keys(st.finanzas).forEach(id => {
      const f = st.finanzas[id];
      f.patrocinios = f.patrocinios.filter(p => p.hasta >= y + 1);
      if (!f.patrocinios.length && id !== st.clubId) f.patrocinios.push(patrocinioBase(st, st.equipos[id], 0, 'Camiseta', 0.065, 2, 1));
    });
  });

  function resumen(st, clubId) {
    clubId = clubId || st.clubId;
    const f = st.finanzas[clubId], eq = st.equipos[clubId];
    const m = M();
    const masa = masaSalarial(st, clubId);
    const tope = m.mercado && m.mercado.topeSalarial ? m.mercado.topeSalarial(st, clubId) : null;
    const avisos = [];
    if (f.caja < 0) avisos.push('La caja está en negativo. Reduce gastos o busca patrocinadores.');
    else if (f.caja < eq.presupuesto * 0.03) avisos.push('Caja muy baja: cuidado con las obras y los fichajes.');
    if (tope && tope.margen < 0) avisos.push('La masa salarial supera el límite del club.');
    const caducan = f.patrocinios.filter(p => p.hasta <= yearOf(st) + 1);
    if (caducan.length) avisos.push('Patrocinios que terminan esta temporada: ' + caducan.map(p => p.nombre).join(', ') + '.');
    return { caja: f.caja, ingresosTemp: f.temp.ingresos, gastosTemp: f.temp.gastos, masaSalarial: masa, tope, patrocinios: f.patrocinios, ofertas: ofertasPatrocinio(st, clubId), movimientos: f.movimientos, historial: f.historial, avisos };
  }
  function nuevaPartida(st) {
    Object.keys(st.equipos).forEach(id => {
      const eq = st.equipos[id];
      st.finanzas[id] = { caja: Math.round(eq.presupuesto * 0.25), movimientos: [], patrocinios: [patrocinioBase(st, eq, 0, 'Camiseta', 0.065, 2, 1)], temp: { ingresos: 0, gastos: 0 }, historial: [] };
    });
  }
  function selfTest() {
    const st = { temporada: '2026-27', fecha: '2026-10-01', clubId: 'a', ciudad: {}, finanzas: {}, noticias: [], equipos: { a: { id: 'a', presupuesto: 30e6, reputacion: 70, pabellon: { aforo: 8000 }, plantilla: [] }, b: { id: 'b', presupuesto: 30e6, reputacion: 60, pabellon: { aforo: 8000 }, plantilla: [] } }, jugadores: {} };
    nuevaPartida(st);
    const c0 = st.finanzas.a.caja;
    const r = ingresosPartido(st, { comp: 'EUROLIGA', local: 'a', visitante: 'b', fase: 'regular' });
    registrar(st, 'a', 'test', r.total);
    cierreMes(st);
    return r.asistencia > 0 && r.asistencia <= 8000 && st.finanzas.a.caja !== c0 && st.finanzas.a.movimientos.length > 1;
  }
  GM.register('finanzas', { registrar, ingresosPartido, cierreMes, ofertasPatrocinio, firmarPatrocinio, resumen, masaSalarial, nuevaPartida, selfTest });
})();
