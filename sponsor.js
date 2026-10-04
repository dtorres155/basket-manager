/* PATROCINADORES PERSONALES (GM.mods.sponsor) — modo carrera
   Marcas que te patrocinan a ti, no al club. Cada categoría (calzado, ropa, bebidas, tecnología, lujo) se abre con un grado de reputación
   y ofrece tres alternativas excluyentes: global (más dinero), local (más cercanía) y con causa (valores). Al firmar una, las otras desaparecen hasta
   que acabe el contrato. Cláusulas de rendimiento (puntos, títulos) y rescisión. Ingresos mensuales en tus ahorros.
   Expone: categorias, activos, firmar, rescindir, selfTest. Escribe state.carrera.sponsors = [{ cat, marca, perfil, importe, hasta, rescision, ef }]. */
(function () {
  const U = GM.util, C = st => st.carrera, yearOf = st => parseInt(st.temporada.slice(0, 4), 10);
  const CATS = {
    calzado: { nombre: 'Zapatillas', grado: 1, mult: 1 }, ropa: { nombre: 'Ropa deportiva', grado: 2, mult: 0.8 }, bebida: { nombre: 'Bebidas', grado: 3, mult: 0.9 },
    tecnologia: { nombre: 'Tecnología', grado: 4, mult: 1.1 }, lujo: { nombre: 'Relojes y lujo', grado: 5, mult: 1.4 }
  };
  const PERF = {
    global: { etq: 'Marca global', mult: 1.35, resc: 0.6, ef: { fama: 0.6, moral: -0.4 }, desc: 'Mucho dinero y proyección, con exigencias de imagen.' },
    local: { etq: 'Marca local', mult: 0.85, resc: 0.3, ef: { moral: 0.8 }, desc: 'Menos dinero y más cariño de la gente de tu entorno.' },
    causa: { etq: 'Marca con causa', mult: 1.0, resc: 0.45, ef: { fama: 0.3, moral: 0.5 }, desc: 'Se alinea con tus valores: te piden implicarte en proyectos sociales.' }
  };
  const MARCAS = {
    calzado: { global: ['Aerolite', 'Vanguard Kicks'], local: ['Calzados del Norte', 'Zapatería Casals'], causa: ['Tierra Sneakers'] },
    ropa: { global: ['Nordik Sport', 'Vento Athletic'], local: ['Tèxtils del Baix', 'Taller Mediterráneo'], causa: ['Eco Court'] },
    bebida: { global: ['Volt Energy', 'Isotop'], local: ['Aguas del Pirineo', 'Cervezas Cierzo 0,0'], causa: ['Fuente Viva'] },
    tecnologia: { global: ['Orbis Tech', 'Nexora Mobile'], local: ['Telecom Ibérica', 'Mercatech'], causa: ['Open Labs'] },
    lujo: { global: ['Aurum Genève', 'Maison Delphi'], local: ['Joyeros Reunidos', 'Relojería Regàs'], causa: ['Fundación Aurea'] }
  };
  const act = st => st.modo === 'carrera' && st.carrera && st.carrera.fase !== 'ncaa' && st.carrera.fase !== 'retirado';
  const sp = st => (C(st).sponsors = C(st).sponsors || []);
  const grado = st => GM.mods.carrera.gradoFama(C(st)).idx;
  function base(st) { return Math.round(4 * Math.pow(1.9, grado(st))); }
  function activo(st, cat) { return sp(st).find(s => s.cat === cat && s.hasta >= yearOf(st)); }
  function oferta(st, cat, perfil) {
    const P = PERF[perfil], K = CATS[cat], h = U.hash(st.carrera.agente.nombre + cat + perfil + st.temporada), nombres = MARCAS[cat][perfil], marca = nombres[h % nombres.length];
    const importe = Math.round(base(st) * K.mult * P.mult * (0.9 + (h % 21) / 100) * (st.carrera.agente.perfil === 'dinero' ? 1.1 : 1));
    return { id: cat + '|' + perfil + '|' + st.temporada, cat, perfil, etq: P.etq, marca, importe, anos: 1 + (h >>> 3) % 3, rescision: P.resc, ef: P.ef, desc: P.desc, clausula: perfil === 'global' ? 'Bonus del 15 % si promedias 15 puntos o más.' : perfil === 'causa' ? 'Bonus del 10 % si dedicas tiempo a la fundación.' : 'Bonus del 10 % por cada título.' };
  }
  function categorias(st) {
    if (!act(st)) return [];
    const g = grado(st);
    return Object.keys(CATS).map(cat => {
      const K = CATS[cat], a = activo(st, cat); let ofertas = [], bloqueo = null;
      if (g < K.grado) bloqueo = 'Se abre con el grado «' + GM.mods.carrera.GRADOS[K.grado].n + '».';
      else if (!a) ofertas = ['global', 'local', 'causa'].map(p => oferta(st, cat, p));
      else if (a.hasta <= yearOf(st) + 1 && st.fecha >= (yearOf(st) + 1) + '-03-01') ofertas = [Object.assign(oferta(st, cat, a.perfil), { id: cat + '|renovar|' + st.temporada, etq: 'Renovar', marca: a.marca, importe: Math.round(a.importe * 1.06), desc: 'Renuevas con ' + a.marca + ' (+6 %).' })].concat(['global', 'local', 'causa'].filter(p => p !== a.perfil).map(p => oferta(st, cat, p)));
      else bloqueo = 'Contrato vigente hasta ' + a.hasta + '.';
      return { cat, nombre: K.nombre, activo: a || null, ofertas, bloqueo };
    });
  }
  function firmar(st, cat, id) {
    const k = categorias(st).find(x => x.cat === cat); if (!k) return { ok: false, motivo: 'Categoría no disponible.' };
    const o = k.ofertas.find(x => x.id === id); if (!o) return { ok: false, motivo: 'Esa oferta ya no está disponible.' };
    const c = C(st); c.sponsors = sp(st).filter(s => s.cat !== cat);
    c.sponsors.push({ cat, marca: o.marca, perfil: o.perfil, importe: o.importe, hasta: yearOf(st) + o.anos, rescision: o.rescision, ef: o.ef, clausula: o.clausula });
    c.dinero += Math.round(o.importe * 0.1); c.fama = c.fama + (o.ef.fama || 0) * 2; c.moral = U.clamp(c.moral + (o.ef.moral || 0) * 2, 0, 100);
    c.hitos.unshift({ fecha: st.fecha, texto: 'Firmas con ' + o.marca + ' (' + CATS[cat].nombre.toLowerCase() + ').' }); GM.noticia(st, 'Nuevo patrocinio: ' + o.marca + ' apuesta por ' + st.jugadores.yo.nombre + '.');
    return { ok: true };
  }
  function rescindir(st, cat) {
    const c = C(st), s = activo(st, cat); if (!s) return { ok: false, motivo: 'No hay contrato.' };
    const pen = Math.round(s.rescision * s.importe * Math.max(0.5, s.hasta - yearOf(st)));
    if (c.dinero < pen) return { ok: false, motivo: 'Te faltan ' + Math.round(pen - c.dinero) + ' mil € para la penalización.' };
    c.dinero -= pen; c.sponsors = sp(st).filter(x => x !== s); c.fama = c.fama - 1; c.moral = U.clamp(c.moral - 2, 0, 100); c.hitos.unshift({ fecha: st.fecha, texto: 'Rompes con ' + s.marca + '.' });
    return { ok: true, penalizacion: pen };
  }
  GM.bus.on('dia:avanzado', function () {
    const st = GM.state; if (!st || !act(st) || st.fecha.slice(8) !== '01') return;
    const c = C(st), y = yearOf(st), s0 = GM.mods.carrera.stats(st);
    sp(st).forEach(s => {
      if (s.hasta < y) return;
      let m = s.importe / 12 * 0.6;
      if (s.perfil === 'global' && s0.pts >= 15) m *= 1.15; if (s.perfil === 'local') m *= 1 + 0.1 * c.historial.filter(h => h.titulo).length * 0.2;
      c.dinero += Math.round(m * 10) / 10; if (s.ef.moral) c.moral = U.clamp(c.moral + s.ef.moral * 0.4, 0, 100); if (s.ef.fama) c.fama = c.fama + s.ef.fama * 0.2;
    });
    c.sponsors = sp(st).filter(s => s.hasta >= y || (st.fecha < (y + 1) + '-07-01' && s.hasta >= y));
  });
  function activos(st) { return act(st) ? sp(st).slice() : []; }
  function selfTest() { return Object.keys(CATS).every(k => MARCAS[k].global.length && MARCAS[k].local.length && MARCAS[k].causa.length) && CATS.lujo.grado > CATS.calzado.grado; }
  GM.register('sponsor', { categorias, activos, firmar, rescindir, selfTest, CATS, PERF });
})();
