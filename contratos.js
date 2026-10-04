/* CONTRATOS (GM.mods.contratos)
   Cinco categorías (camiseta, nombre del pabellón, TV, material deportivo, proveedor sanitario). Cada una ofrece 3 alternativas que se excluyen:
   al firmar una, las otras desaparecen hasta que el contrato termine. Los contratos activos viven en finanzas[club].patrocinios (con perfil, cláusulas y efectos).
   Expone: categorias, activos, firmar, rescindir, selfTest. Memoria: state.contratosMem = { dinero, local, prestigio } (veces elegidas). */
(function () {
  const U = GM.util;
  const yearOf = st => parseInt(st.temporada.slice(0, 4), 10);
  const CATS = {
    'Camiseta': { nombre: 'Patrocinador principal', frac: 0.045 },
    'Pabellón (naming)': { nombre: 'Nombre del pabellón', frac: 0.025 },
    'TV': { nombre: 'Derechos de televisión', frac: 0.03 },
    'Equipación': { nombre: 'Material deportivo', frac: 0.02 },
    'Salud': { nombre: 'Proveedor sanitario', frac: 0.01 }
  };
  const PERF = {
    dinero: { etq: 'Más dinero', mult: 1.4, resc: 0.6, ef: { aficion: -1, apoyo: -1, alma: -0.6, pil: { arraigo: -1 } }, desc: 'Paga más, pero la afición y la ciudad lo notan.' },
    local: { etq: 'Marca local', mult: 0.9, resc: 0.3, ef: { aficion: 1, apoyo: 1, alma: 0.6, pil: { arraigo: 1 } }, desc: 'Paga menos y refuerza el vínculo con la ciudad.' },
    prestigio: { etq: 'Marca de prestigio', mult: 1.12, resc: 0.5, ef: { apoyo: 0.5, alma: 0.3, pil: { ambicion: 1 } }, desc: 'Buen dinero e imagen. Cláusula: si el equipo acaba en el 40 % inferior, el contrato se reduce un 15 %.' }
  };
  const NOMBRES = {
    'Camiseta': { dinero: ['Banco Atlántico', 'Grupo Meridian', 'Atlas Capital'], local: ['Cooperativa del Mercat', 'Comercios del barrio', 'Caixa Local'], prestigio: ['Aerolíneas Mistral', 'Nexora Tecnología', 'Orbis Seguros'] },
    'Pabellón (naming)': { dinero: ['Multinacional Delta (naming)', 'Grupo Vértice (naming)'], local: ['Conservar el nombre histórico'], prestigio: ['Marca nacional Aurelia (naming)', 'Volta Energía (naming)'] },
    'TV': { dinero: ['Plataforma de pago Vía+', 'Canal Premium Sport'], local: ['Televisión autonómica', 'Emisora local'], prestigio: ['Canal Deportivo Internacional', 'Eurosport Live'] },
    'Equipación': { dinero: ['Vento Sport Global', 'Nordik Sport'], local: ['Taller local de equipaciones', 'Tèxtils del Baix'], prestigio: ['Aurum Athletic', 'Kinetic Pro'] },
    'Salud': { dinero: ['Clínica Privada Elite', 'Grupo Sanitas Plus'], local: ['Hospital de la comarca', 'CAP del barrio'], prestigio: ['Clínica Mediterrània', 'Instituto Lumen Salud'] }
  };
  const esc = (st, id) => U.clamp(st.equipos[id].presupuesto / 60e6, 0.3, 8);
  const mem = st => st.contratosMem = st.contratosMem || { dinero: 0, local: 0, prestigio: 0 };
  const F = st => st.finanzas[st.clubId];

  function activoDe(st, tipo) { return F(st).patrocinios.find(p => p.tipo === tipo && p.hasta >= yearOf(st)); }
  function enRenovacion(st, c) { return c && c.hasta <= yearOf(st) + 1 && st.fecha >= (yearOf(st) + 1) + '-03-01'; }
  function oferta(st, tipo, perfil) {
    const eq = st.equipos[st.clubId], P = PERF[perfil], C = CATS[tipo], m = mem(st);
    const h = U.hash(st.clubId + tipo + perfil + st.temporada);
    const nombres = NOMBRES[tipo][perfil], nombre = nombres[h % nombres.length];
    const ciu = GM.mods.ciudad ? GM.mods.ciudad.modificadores(st, st.clubId).ingresos : 1;
    const hist = 1 + 0.04 * (m[perfil] - Math.max(m.dinero, m.local, m.prestigio) / 2);
    const conserva = tipo === 'Pabellón (naming)' && perfil === 'local';
    const anos = 1 + (h >>> 3) % 3;
    let imp = conserva ? 0 : Math.round(eq.presupuesto * C.frac * (0.6 + eq.reputacion / 100 * 0.8) * P.mult * (0.94 + (h % 13) / 100) * ciu * U.clamp(hist, 0.85, 1.12) / 1000) * 1000;
    const ef = Object.assign({}, P.ef); if (conserva) { ef.alma = 1.4; ef.aficion = 2; ef.pil = { arraigo: 2 }; }
    let req = null;
    if (perfil === 'prestigio' && eq.reputacion < 50) req = 'Requiere reputación 50+';
    if (perfil === 'prestigio' && st.legado && st.legado.alma < 35) req = 'Requiere un alma del club de 35+';
    return { id: tipo + '|' + perfil + '|' + st.temporada, tipo, perfil, etq: P.etq, nombre, importeAnual: imp, anos, desc: conserva ? 'No vendes el nombre: sin ingresos, pero el club mantiene su identidad.' : P.desc, rescision: P.resc, ef, req };
  }
  function categorias(st) {
    const club = st.clubId;
    return Object.keys(CATS).map(tipo => {
      const act = activoDe(st, tipo), ren = enRenovacion(st, act);
      let ofertas = [], bloqueo = null;
      if (!act || ren) ofertas = ['dinero', 'local', 'prestigio'].map(p => oferta(st, tipo, p));
      if (act && !ren) bloqueo = 'Contrato vigente hasta ' + act.hasta + '. Las alternativas vuelven cuando se acerque su fin.';
      if (act && ren) ofertas.unshift(Object.assign({}, oferta(st, tipo, act.perfil || 'local'), { id: tipo + '|renovar|' + st.temporada, etq: 'Renovar', nombre: act.nombre, importeAnual: Math.round(act.importeAnual * 1.05 / 1000) * 1000, desc: 'Renuevas con tu patrocinador actual (+5 %).', ef: Object.assign({}, act.ef || {}), req: null, perfil: act.perfil || 'local' }));
      return { tipo, nombre: CATS[tipo].nombre, activo: act || null, ofertas, bloqueo, renovacion: !!(act && ren) };
    });
  }
  function aplicarEfecto(st, ef, k) {
    const c = st.ciudad[st.clubId]; k = k || 1;
    if (ef.aficion) c.aficion = U.clamp(c.aficion + ef.aficion * k, 0, 100);
    if (ef.apoyo) c.apoyoAyuntamiento = U.clamp(c.apoyoAyuntamiento + ef.apoyo * k, 0, 100);
    const L = GM.mods.legado;
    if (L && L.activo(st)) L.ajustar(st, ef.pil ? Object.keys(ef.pil).reduce((o, p) => { o[p] = ef.pil[p] * k; return o; }, {}) : {}, (ef.alma || 0) * k);
  }
  function firmar(st, tipo, ofertaId) {
    const cat = categorias(st).find(c => c.tipo === tipo); if (!cat) return { ok: false, motivo: 'Categoría desconocida.' };
    const o = cat.ofertas.find(x => x.id === ofertaId); if (!o) return { ok: false, motivo: 'Esa oferta ya no está disponible.' };
    if (o.req) return { ok: false, motivo: o.req + '.' };
    const f = F(st); f.patrocinios = f.patrocinios.filter(p => p.tipo !== tipo);
    f.patrocinios.push({ id: 'ct-' + st.fecha + '-' + tipo, nombre: o.nombre, tipo, perfil: o.perfil, importeAnual: o.importeAnual, anos: o.anos, hasta: yearOf(st) + o.anos, rescision: o.rescision, ef: o.ef, inicio: st.fecha });
    if (o.etq !== 'Renovar') mem(st)[o.perfil]++;
    if (o.importeAnual && GM.mods.finanzas) GM.mods.finanzas.registrar(st, st.clubId, 'Prima de firma: ' + o.nombre, Math.round(o.importeAnual * 0.08));
    aplicarEfecto(st, o.ef, 2);
    GM.noticia(st, 'Contrato firmado: ' + o.nombre + ' (' + CATS[tipo].nombre.toLowerCase() + ').');
    return { ok: true };
  }
  function rescindir(st, tipo) {
    const f = F(st), c = activoDe(st, tipo); if (!c) return { ok: false, motivo: 'No hay contrato en esa categoría.' };
    const quedan = Math.max(0.5, c.hasta - yearOf(st)), pen = Math.round((c.rescision || 0.5) * c.importeAnual * quedan / 1000) * 1000;
    if (f.caja < pen) return { ok: false, motivo: 'No tienes caja para la penalización (' + U.eur(pen) + ').' };
    if (pen && GM.mods.finanzas) GM.mods.finanzas.registrar(st, st.clubId, 'Penalización por rescindir con ' + c.nombre, -pen);
    f.patrocinios = f.patrocinios.filter(p => p !== c);
    aplicarEfecto(st, { aficion: -2, apoyo: -2, alma: -1 }, 1);
    GM.noticia(st, 'Rescindes el contrato con ' + c.nombre + ' (' + U.eur(pen) + ').');
    return { ok: true, penalizacion: pen };
  }
  function activos(st) { return F(st).patrocinios.slice(); }

  GM.bus.on('dia:avanzado', function () {
    const st = GM.state; if (!st || !st.finanzas || !st.finanzas[st.clubId]) return;
    if (st.fecha.slice(8) === '15') F(st).patrocinios.forEach(p => { if (p.ef && p.hasta >= yearOf(st)) aplicarEfecto(st, p.ef, 0.5); });
  });
  GM.bus.on('temporada:fin', function () {
    const st = GM.state; if (!st || !st.finanzas || !st.finanzas[st.clubId]) return;
    const lg = GM.ligasDe(st, st.clubId)[0]; if (!lg) return;
    const tabla = GM.mods.competiciones.clasificacion(st, lg), pos = tabla.findIndex(r => r.equipoId === st.clubId);
    if (pos >= 0 && pos / tabla.length > 0.6) F(st).patrocinios.forEach(p => { if (p.perfil === 'prestigio') { p.importeAnual = Math.round(p.importeAnual * 0.85 / 1000) * 1000; GM.noticia(st, p.nombre + ' reduce su aportación por los malos resultados.'); } });
  });

  function selfTest() {
    const st = { temporada: '2026-27', fecha: '2026-10-01', clubId: 'a', noticias: [], equipos: { a: { id: 'a', presupuesto: 30e6, reputacion: 60 } }, ciudad: { a: { ambiente: 50, aficion: 50, apoyoAyuntamiento: 50, convenios: [], eventos: [] } }, finanzas: { a: { caja: 1e7, movimientos: [], patrocinios: [], temp: { ingresos: 0, gastos: 0 }, historial: [] } } };
    const c0 = categorias(st).find(c => c.tipo === 'Camiseta');
    const r = firmar(st, 'Camiseta', c0.ofertas[0].id), c1 = categorias(st).find(c => c.tipo === 'Camiseta'), r2 = firmar(st, 'Camiseta', c0.ofertas[1].id);
    const pen = rescindir(st, 'Camiseta');
    return c0.ofertas.length === 3 && r.ok && c1.ofertas.length === 0 && !!c1.bloqueo && !r2.ok && pen.ok && st.contratosMem.dinero === 1 && st.ciudad.a.aficion < 50;
  }
  GM.register('contratos', { categorias, activos, firmar, rescindir, selfTest, CATS, PERF });
})();
