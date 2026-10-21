/* APPS DEL MÓVIL (punto 69, GM.movilApps) — el móvil deja de ser solo mensajes y sirve para moverse y gestionar en todos los modos:
   - Banco: saldo (tu dinero en carrera, la caja del club en los demás modos), patrimonio neto, ingresos y gastos del mes, deudas con opción de amortizar y los últimos movimientos; en carrera puedes enviar dinero a la familia.
   - Mapa y rutas / Transporte: abren el mapa del mundo en el que estés y el planificador de viajes de movilidad.js (a pie, bici, patinete, metro, bus, taxi y coche con tiempos y precios).
   - Inmobiliaria: las ofertas del mes de patrimonio.js (solares, locales, plazas, coches y arte) con comprar al contado o a plazos, y tus bienes con alquilar.
   - Prensa: titulares de tu club, rumores del mercado con su fuente, tus promesas abiertas y las reacciones de otros vestuarios.
   - Redes: seguidores, publicaciones recientes y publicar (carrera); en los demás modos, la cuenta del club que sube la afición.
   - Calendario: lo próximo, ordenado por fecha: partidos, mercado, All-Star, selecciones, encargos de la ciudad, obras y hitos urbanos.
   - Mensajes: los chats de carrera (movil.js). Cada app devuelve datos; la pantalla está en ui_movil.js. Prueba: t_movil_apps.js. */
(function () {
  const U = GM.util,
    clamp = U.clamp,
    carr = st => st.modo === 'carrera' && !!st.carrera && st.carrera.fase !== 'retirado',
    eur = k => U.eur(Math.round(k * 1000));
  const APPS = [
    { id: 'mensajes', n: 'Mensajes', ic: 'sobre', visible: st => carr(st) && !!GM.mods.movil },
    { id: 'banco', n: 'Banco', ic: 'moneda', visible: st => true },
    { id: 'mapa', n: 'Mapa', ic: 'mapa', visible: st => !!(GM.sede && GM.sede.activa && GM.sede.activa()) },
    { id: 'transporte', n: 'Transporte', ic: 'coche', visible: st => !!GM.movilidad },
    {
      id: 'inmobiliaria',
      n: 'Inmobiliaria',
      ic: 'casa',
      visible: st => !!GM.patrimonio && (carr(st) || st.modo === 'gestor' || st.modo === 'presidente' || st.modo === 'entrenador')
    },
    { id: 'prensa', n: 'Prensa', ic: 'diario', visible: st => true },
    { id: 'redes', n: 'Redes', ic: 'foto', visible: st => true },
    { id: 'calendario', n: 'Calendario', ic: 'cal', visible: st => true }
  ];
  const disponibles = st => APPS.filter(a => a.visible(st));
  const insignia = (st, id) => (id === 'mensajes' && GM.mods.movil ? GM.mods.movil.noLeidos(st) : id === 'prensa' ? Math.min(9, noticiasRecientes(st).length) : 0);
  // ---------- Banco ----------
  function banco(st) {
    if (carr(st)) {
      const H = GM.mods.hogar,
        P = GM.patrimonio,
        n = P ? P.neto(st) : null,
        libro = P ? P.libro(st) : [],
        mes = st.fecha.slice(0, 7),
        delMes = libro.filter(l => String(l.f || l.fecha || '').slice(0, 7) === mes),
        deudas = P ? P.est(st).deudas : [];
      return {
        tipo: 'jugador',
        saldo: Math.round(H.dinero(st) * 1000),
        neto: n ? Math.round(n.total * 1000) : null,
        ingresos: Math.round(delMes.filter(l => l.v > 0).reduce((s, l) => s + l.v, 0) * 1000),
        gastos: Math.round(-delMes.filter(l => l.v < 0).reduce((s, l) => s + l.v, 0) * 1000),
        deudas: deudas.map(d => ({ id: d.id, nombre: d.nombre, restante: Math.round(d.restante * 1000), cuota: Math.round((d.cuota || 0) * 1000) })),
        movimientos: libro.slice(0, 8).map(l => ({ f: l.f || l.fecha, t: l.t, v: Math.round(l.v * 1000) })),
        puedeEnviar: true
      };
    }
    const f = st.finanzas && st.finanzas[st.clubId],
      T = f && f.temp ? f.temp : { ingresos: 0, gastos: 0 },
      mov = f && f.movimientos ? f.movimientos.slice(-8).reverse() : [];
    return {
      tipo: 'club',
      saldo: Math.round(f ? f.caja : 0),
      neto: null,
      ingresos: Math.round(T.ingresos || 0),
      gastos: Math.round(T.gastos || 0),
      deudas: [],
      movimientos: mov.map(m => ({ f: m.fecha || m.f, t: m.concepto || m.t, v: Math.round(m.importe !== undefined ? m.importe : m.v) })),
      puedeEnviar: false
    };
  }
  function enviarDinero(st, miles) {
    if (!carr(st)) return { ok: false, motivo: 'Solo en carrera.' };
    const H = GM.mods.hogar;
    if (!(miles > 0) || H.dinero(st) < miles) return { ok: false, motivo: 'No te llega.' };
    H.gastar(st, miles);
    if (GM.patrimonio) GM.patrimonio.reg(st, 'vida', 'Envías dinero a la familia', -miles);
    const so = st.carrera.social;
    (so && so.contactos ? so.contactos.filter(k => k.tipo === 'familia') : []).forEach(k => {
      k.rel = clamp(k.rel + 2 + miles / 5, 0, 100);
    });
    if (GM.mods.movil) GM.mods.movil.enviar(st, 'familia', 'Gracias por el dinero, cariño. Con eso nos apañamos un tiempo.');
    return { ok: true, texto: 'Envías ' + eur(miles) + ' a tu familia.' };
  }
  const amortizar = (st, id, miles) => (GM.patrimonio ? GM.patrimonio.amortizar(st, id, miles) : { ok: false, motivo: 'No hay banco.' });
  // ---------- Inmobiliaria ----------
  function inmobiliaria(st) {
    const P = GM.patrimonio;
    if (!P) return { ofertas: [], bienes: [] };
    const ofertas = P.mercado(st).map(o => ({
        id: o.id,
        nombre: o.nombre,
        tipo: o.tipo,
        barrio: o.barrio,
        precio: o.precio,
        renta: o.renta || 0,
        plazos: o.tipo !== 'coche' && o.tipo !== 'arte'
      })),
      bienes = P.est(st).bienes.map(b => ({
        id: b.id,
        nombre: b.nombre,
        tipo: b.tipo,
        valor: Math.round(P.valorBien(st, b) * 10) / 10,
        alquilado: !!b.alquilado,
        alquilable: !!b.renta
      }));
    return { ofertas, bienes };
  }
  const comprarBien = (st, id, modo) => (GM.patrimonio ? GM.patrimonio.comprar(st, id, modo) : { ok: false, motivo: 'No hay inmobiliaria.' });
  // ---------- Prensa ----------
  const noticiasRecientes = st => (st.noticias || []).slice(0, 12);
  function prensa(st) {
    const Pr = GM.mods.prensa,
      T = GM.traspasos && (st.modo === 'gestor' || st.modo === 'entrenador') ? GM.traspasos : null;
    return {
      titulares: noticiasRecientes(st).map(n => ({ f: n.fecha, t: n.texto })),
      rumores: T ? T.titulares(st, 5) : [],
      promesas: Pr && st.prensa ? Pr.abiertas(st).map(m => ({ frase: m.frase, desde: m.desde })) : [],
      reacciones: Pr && Pr.reacciones ? Pr.reacciones(st).slice(0, 4) : [],
      credibilidad: Pr && st.prensa ? Math.round(st.prensa.cred) : null
    };
  }
  // ---------- Redes ----------
  function redes(st) {
    if (carr(st) && GM.mods.vida) {
      const r = GM.mods.vida.redes(st);
      return { tipo: 'jugador', seguidores: r.seg, posts: r.posts, puede: r.puede, tipos: r.tipos };
    }
    const E = (st.redesClub = st.redesClub || { seg: Math.round(8000 + (st.equipos[st.clubId].reputacion || 50) * 700), ult: null, posts: [] });
    return {
      tipo: 'club',
      seguidores: E.seg,
      posts: E.posts.slice(0, 6),
      puede: E.ult !== st.fecha,
      tipos: [
        { id: 'victoria', t: 'Celebrar el último resultado', d: 'La afición responde.' },
        { id: 'cantera', t: 'Presentar a un juvenil', d: 'Cuenta la cantera.' },
        { id: 'abonos', t: 'Campaña de abonos', d: 'Más afición y algo más de ingresos.' }
      ].map(x => Object.assign(x, { disponible: E.ult !== st.fecha }))
    };
  }
  function publicar(st, id) {
    if (carr(st) && GM.mods.vida) return GM.mods.vida.publicar(st, id);
    const E = (redes(st), st.redesClub);
    if (E.ult === st.fecha) return { ok: false, motivo: 'Ya has publicado hoy.' };
    const ci = st.ciudad && st.ciudad[st.clubId],
      k = id === 'abonos' ? 1.2 : id === 'cantera' ? 0.8 : 0.6;
    if (ci) ci.aficion = clamp(ci.aficion + k, 0, 100);
    const nuevos = Math.round(E.seg * 0.004 * (0.7 + GM.rng.next() * 0.6));
    E.seg += nuevos;
    E.ult = st.fecha;
    E.posts.unshift({
      f: st.fecha,
      t: { victoria: 'Seguimos adelante: gracias por el apoyo.', cantera: 'Nuestra cantera sigue creciendo.', abonos: 'Ya puedes sacar tu abono.' }[id] || 'Publicación del club',
      likes: Math.round(E.seg * 0.03)
    });
    if (E.posts.length > 10) E.posts.length = 10;
    if (id === 'abonos' && GM.mods.finanzas && st.finanzas[st.clubId])
      GM.mods.finanzas.registrar(st, st.clubId, 'Campaña de abonos en redes', Math.round(st.equipos[st.clubId].presupuesto * 0.0004));
    return { ok: true, texto: 'Publicado: +' + nuevos + ' seguidores y algo más de afición.' };
  }
  // ---------- Calendario ----------
  function calendario(st, n) {
    const out = [],
      club = st.clubId,
      hoy = st.fecha,
      add = (f, tipo, texto) => {
        if (f && f >= hoy) out.push({ f, tipo, texto });
      };
    (st.calendario || [])
      .filter(g => !g.resultado && (g.local === club || g.visitante === club))
      .sort((a, b) => (a.fecha < b.fecha ? -1 : 1))
      .slice(0, 5)
      .forEach(g =>
        add(
          g.fecha,
          'partido',
          (g.local === club ? 'En casa contra ' : 'Visita a ') + st.equipos[g.local === club ? g.visitante : g.local].nombre + (g.fase === 'amistoso' ? ' (amistoso)' : '')
        )
      );
    if (GM.traspasos && st.ligas && st.mercado && (st.modo === 'gestor' || st.modo === 'entrenador')) {
      const v = GM.traspasos.ventana(st, club);
      if (v.abierta) add(v.cierra, 'mercado', 'Cierra el mercado (' + v.nombre.toLowerCase() + ')');
      else add(v.abre, 'mercado', 'Abre el mercado');
    }
    const A = GM.mods.allstar && GM.mods.allstar.estado ? GM.mods.allstar.estado(st) : null;
    if (A)
      Object.keys(A.eventos).forEach(k => {
        if (A.eventos[k].estado === 'pendiente') add(A.eventos[k].fecha, 'evento', A.eventos[k].nombre);
      });
    const V = st.pretemp && st.pretemp.ventana;
    if (V && !V.resuelta) {
      add(V.desde, 'evento', 'Empieza el ' + V.nombre);
    }
    if (GM.ciudadJuego && carr(st))
      GM.ciudadJuego
        .encargos(st)
        .filter(e => !e.hecho)
        .slice(0, 3)
        .forEach(e => add(e.hasta, 'encargo', 'Encargo: ' + e.texto));
    if (GM.patrimonio && st.patrimonio)
      st.patrimonio.bienes
        .filter(b => b.obra && b.obra.fin)
        .slice(0, 3)
        .forEach(b => add(b.obra.fin, 'obra', 'Termina la obra de ' + b.nombre));
    if (GM.negocios && st.negocios)
      GM.negocios
        .activos(st)
        .filter(x => !x.abierto)
        .forEach(x => add(x.abre, 'negocio', 'Abre ' + x.nombre));
    if (GM.mods.crecimiento && st.ciudad && st.ciudad[club])
      GM.mods.crecimiento
        .hitos(st)
        .filter(h => h.estado === 'obra')
        .slice(0, 2)
        .forEach(h => add(h.fin, 'obra', 'Se inaugura: ' + h.nombre.toLowerCase()));
    if (carr(st) && st.jugadores.yo && st.jugadores.yo.contrato)
      add(st.jugadores.yo.contrato.hasta - 1 + '-06-30', 'contrato', 'Vence tu contrato en el verano de ' + st.jugadores.yo.contrato.hasta);
    return out.sort((a, b) => (a.f < b.f ? -1 : a.f > b.f ? 1 : 0)).slice(0, n || 12);
  }
  function selfTest() {
    const st = {
      modo: 'gestor',
      fecha: '2026-10-01',
      clubId: 'a',
      equipos: { a: { id: 'a', nombre: 'A', presupuesto: 1e7, reputacion: 60 } },
      finanzas: { a: { caja: 5e6, temp: { ingresos: 100, gastos: 40 }, movimientos: [{ fecha: '2026-09-30', concepto: 'Taquilla', importe: 1000 }] } },
      calendario: [{ id: 'g1', fecha: '2026-10-04', local: 'a', visitante: 'b' }],
      noticias: [{ fecha: '2026-09-30', texto: 'Hola' }],
      jugadores: {}
    };
    st.equipos.b = { nombre: 'B' };
    const b = banco(st),
      c = calendario(st),
      p = prensa(st);
    return (
      disponibles(st).length >= 5 &&
      b.tipo === 'club' &&
      b.saldo === 5e6 &&
      b.movimientos.length === 1 &&
      c.length >= 1 &&
      c[0].tipo === 'partido' &&
      p.titulares.length === 1 &&
      APPS.length === 8
    );
  }
  GM.movilApps = { APPS, disponibles, insignia, banco, enviarDinero, amortizar, inmobiliaria, comprarBien, prensa, redes, publicar, calendario, selfTest };
  GM.register && GM.register('movilApps', GM.movilApps);
})();
