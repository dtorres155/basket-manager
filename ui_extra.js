/* INTERFAZ: pestañas nuevas de la temporada (pretemporada y selecciones, All-Star, rivalidades con historia, ojeadores, negociación de contratos, informe del rival y cuerpo
   técnico, prensa con memoria y la ciudad que crece). Se añaden a las pantallas existentes con GM.ui.addTab (ui.js). Usa las utilidades del núcleo a través de GM.ui._. */
(function () {
  const { addTab, M, U, aviso, barra, chip, clip, clsOvr, eq, escudo, h, modal, refrescar, seccion, toast, ui, registerScreen } = GM.ui._;
  const gestor = st => st.modo === 'gestor', pres = st => st.modo === 'presidente', entr = st => st.modo === 'entrenador', carrera = st => st.modo === 'carrera';
  const fila = (k, v) => h('div', { class: 'fila' }, h('span', { class: 'muted' }, k), h('b', null, v));
  const nombre = (st, id) => st.jugadores[id] ? st.jugadores[id].nombre : id;
  const pill = (t, ok) => h('span', { class: 'chip ' + (ok === true ? 'ok' : ok === false ? 'mal' : '') }, t);
  const estrellas = n => '★'.repeat(n) + '☆'.repeat(Math.max(0, 3 - n));

  // ---------- Calendario: pretemporada y selecciones ----------
  function proximaVentana(st, Pt) { const y = parseInt(st.fecha.slice(0, 4), 10); for (let k = 0; k < 6; k++) { const v = Pt.ventanaDe(y + k); if (v && v.hasta >= st.fecha) return v; } return null; }
  function filaPartido(st, g) {
    const club = st.clubId, rival = g.local === club ? g.visitante : g.local, mio = g.local === club || g.visitante === club, r = g.resultado;
    return h('div', { class: 'item' }, h('span', { class: 'muted f' }, U.fecha(g.fecha)), escudo(rival), h('div', { class: 'ct' }, h('b', null, mio ? clip(eq(rival).nombre, 22) : clip(eq(g.local).siglas + ' - ' + eq(g.visitante).siglas, 22)), h('span', { class: 'muted' }, (g.ronda ? g.ronda + ', ' : '') + (mio ? (g.local === club ? 'en casa' : 'fuera') : 'otros equipos'))), r ? h('b', null, r.local + '-' + r.visitante) : h('span', { class: 'muted' }, 'pendiente'));
  }
  function pretemporadaTab(el, st) {
    const Pt = M().pretemporada, P = Pt.estado(st), club = st.clubId;
    el.append(seccion('Pretemporada', h('div', { class: 'tarjeta' }, h('div', { class: 'seg' }, Object.keys(Pt.PLANES).map(k => h('button', { class: 'tab' + (P.plan === k ? ' on' : ''), onclick: () => { Pt.setPlan(st, k); refrescar(); } }, Pt.PLANES[k].etq))),
      h('p', { class: 'muted' }, Pt.PLANES[P.plan].desc + ' Los amistosos suben la química y la forma, pero también hay riesgo de lesión.'), fila('Química del equipo', Math.round(P.quimica) + ' / 100'), barra(P.quimica, 100, P.quimica >= 40 ? 'verde' : 'rojo'))));
    const am = Pt.amistososClub(st).filter(g => !g.torneo);
    el.append(seccion('Amistosos', am.length ? h('div', { class: 'lista' }, am.map(g => filaPartido(st, g))) : h('p', { class: 'muted' }, 'Los amistosos se programan al empezar cada verano (agosto y septiembre). Para tu club, a partir de la próxima pretemporada.')));
    if (P.torneo) {
      const t = P.torneo, gs = st.calendario.filter(g => g.torneo && t.equipos.some(e => e === g.local || e === g.visitante) && g.fecha >= U.addDays(t.semis.length ? (st.calendario.find(x => x.id === t.semis[0]) || {}).fecha : '2000-01-01', -1) && g.comp === 'AMISTOSO');
      el.append(seccion(t.nombre, h('div', { class: 'tarjeta' }, h('div', { class: 'chips' }, t.equipos.map(e => h('span', { class: 'chip' }, eq(e).siglas))), t.campeon ? h('div', { class: 'aviso ok' }, '🏆 Campeón: ' + eq(t.campeon).nombre) : h('p', { class: 'muted' }, 'Semifinales y final a principios de septiembre.'), h('div', { class: 'lista' }, gs.slice(0, 6).map(g => filaPartido(st, g))))));
    }
    const v = P.ventana, s = P.seleccion, prox = proximaVentana(st, Pt);
    if (v && !v.resuelta) el.append(seccion('Selecciones: ' + v.nombre, h('div', { class: 'tarjeta' }, h('p', null, 'Se juega del ' + U.fechaLarga(v.desde) + ' al ' + U.fechaLarga(v.hasta) + '. Tus convocados vuelven cansados y con riesgo de lesión; si triunfan, regresan con el ánimo alto.'))));
    else if (prox && !v) el.append(seccion('Próxima ventana de selecciones', h('div', { class: 'tarjeta' }, h('b', null, prox.nombre), h('p', { class: 'muted' }, 'Del ' + U.fechaLarga(prox.desde) + ' al ' + U.fechaLarga(prox.hasta) + '. La ventana se anuncia al empezar ese verano.'))));
    if (s) el.append(seccion(s.nombre + ': resultado', h('div', { class: 'tarjeta' }, h('div', { class: 'aviso ok' }, '🏆 Campeón: ' + Pt.nombrePais(s.campeon)), fila('Subcampeón', Pt.nombrePais(s.subcampeon)), fila('Tercero', Pt.nombrePais(s.tercero)), fila('Mejor jugador', nombre(st, s.mvp)),
      s.convocados.filter(c => c.id !== 'yo').length ? h('div', null, h('h4', null, 'Convocados de tu club'), h('div', { class: 'lista' }, s.convocados.filter(c => c.id !== 'yo').map(c => h('div', { class: 'item' }, h('span', { class: 'ct' }, h('b', null, nombre(st, c.id)), h('span', { class: 'muted' }, Pt.nombrePais(c.pais))), pill(c.podio === 3 ? 'Oro' : c.podio === 2 ? 'Plata' : c.podio === 1 ? 'Bronce' : 'Sin medalla', c.podio ? true : undefined))))) : h('p', { class: 'muted' }, 'Ninguno de tus jugadores estaba convocado.'),
      s.convocados.some(c => c.id === 'yo') ? h('div', { class: 'aviso ok' }, 'Tú también fuiste convocado con ' + Pt.nombrePais((s.convocados.find(c => c.id === 'yo') || {}).pais) + '.') : null)));
    if (P.hist.length > 1) el.append(seccion('Historial', h('div', { class: 'lista' }, P.hist.slice(1, 6).map(x => h('div', { class: 'item' }, h('span', { class: 'ct' }, h('b', null, x.nombre), h('span', { class: 'muted' }, 'Campeón: ' + Pt.nombrePais(x.campeon) + ', final contra ' + Pt.nombrePais(x.subcampeon))))))));
  }
  addTab('calendario', 'pretemporada', 'Pretemporada', pretemporadaTab, st => !!M().pretemporada);

  // ---------- Calendario: All-Star ----------
  function allstarTab(el, st) {
    const A = M().allstar, S0 = A.estado(st), club = st.clubId, inv = A.invitaciones(st);
    if (inv.length) el.append(seccion('Invitaciones', h('div', { class: 'lista' }, inv.map(i => h('div', { class: 'item col' }, h('div', { class: 'fila' }, h('b', null, (i.concurso === 'triples' ? 'Concurso de triples' : 'Concurso de mates') + ', ' + i.evento), h('span', { class: 'muted' }, U.fecha(i.fecha))),
      h('div', { class: 'par' }, h('button', { class: 'btn peq', onclick: () => { A.responder(st, i.liga, i.concurso, true); refrescar(); } }, 'Participar'), h('button', { class: 'btn peq btn-sec', onclick: () => { A.responder(st, i.liga, i.concurso, false); refrescar(); } }, 'Rechazar')))))));
    const jugables = []; Object.keys(S0.inv).forEach(l => { const ev = S0.eventos[l], i = S0.inv[l]; if (ev && ev.estado === 'pendiente' && GM.ciudadJuego) ['triples', 'mates'].forEach(t => { if (i[t] === 'aceptada') jugables.push({ liga: l, tipo: t, ev, jugado: !!(i.jugado && i.jugado[t]) }); }); });
    if (jugables.length) el.append(seccion('Tus concursos', h('div', { class: 'lista' }, jugables.map(j => h('div', { class: 'item col' }, h('div', { class: 'fila' }, h('b', null, (j.tipo === 'triples' ? 'Concurso de triples' : 'Concurso de mates') + ', ' + j.ev.nombre), h('span', { class: 'muted' }, U.fecha(j.ev.fecha))), j.jugado ? h('span', { class: 'muted' }, 'Ya has jugado tus rondas: cuentan el día del concurso.') : h('button', { class: 'btn peq', onclick: () => { const r = GM.ciudadJuego.jugarAllStar(st, j.liga, j.tipo); if (!r.ok) toast(r.motivo); } }, 'Jugar el concurso ahora'))))));
    const evs = Object.keys(S0.eventos).map(k => S0.eventos[k]);
    if (!evs.length) { el.append(aviso('Este año no hay All-Star en tus ligas.', '')); return; }
    evs.forEach(ev => {
      const dir = ev.estado === 'pendiente' ? A.puedeDirecto(st, ev.id) : null;
      const mios = (ev.seleccionados || []).filter(i => st.jugadores[i] && (st.jugadores[i].equipoId === club || i === 'yo'));
      const lista = ids => h('div', { class: 'lista' }, ids.map(i => h('div', { class: 'item' + (mios.indexOf(i) >= 0 ? ' mio' : '') }, h('span', { class: 'pos' }, st.jugadores[i].pos), h('span', { class: 'ct' }, h('b', null, clip(nombre(st, i), 22)), h('span', { class: 'muted' }, eq(st.jugadores[i].equipoId || club).siglas)), h('span', { class: 'ovr ' + clsOvr(st.jugadores[i].ovr) }, st.jugadores[i].ovr))));
      const contenido = [h('p', { class: 'muted' }, ev.estado === 'pendiente' ? 'Se celebra el ' + U.fechaLarga(ev.fecha) + '.' : ev.estado === 'cancelado' ? 'Cancelado: no hay datos suficientes esta temporada.' : 'Celebrado el ' + U.fechaLarga(ev.fecha) + '.')];
      if (dir) contenido.push(h('div', { class: 'tarjeta' }, h('b', null, 'El partido de las estrellas en directo'), h('p', { class: 'muted' }, dir.ok ? 'Puedes ver el partido con el motor del directo: los 24 elegidos, sin riesgo de lesión ni cansancio. El resultado cuenta.' : dir.motivo), dir.ok ? h('button', { class: 'btn', onclick: () => { const r = A.jugarDirecto(st, ev.id, { onFin: () => refrescar() }); if (!r.ok) toast(r.motivo); } }, 'Ver el partido en directo') : null));
      if (ev.estado === 'hecho') {
        const pa = ev.partido; if (pa.enDirecto) contenido.push(h('p', { class: 'muted' }, 'Jugado en directo.')); contenido.push(h('div', { class: 'tarjeta' }, h('b', null, pa.nombreA + ' ' + pa.pa + ' - ' + pa.pb + ' ' + pa.nombreB), h('p', { class: 'muted' }, 'MVP: ' + nombre(st, pa.mvp))));
        const tabla = (titulo, c) => h('div', null, h('h4', null, titulo + ': ' + nombre(st, c.ganador)), h('div', { class: 'lista' }, c.rondas[0].tabla.slice(0, 8).map((r, i) => h('div', { class: 'item' + (r.id === 'yo' || (st.jugadores[r.id] && st.jugadores[r.id].equipoId === club) ? ' mio' : '') }, h('span', { class: 'muted f' }, '#' + (i + 1)), h('span', { class: 'ct' }, h('b', null, clip(r.nombre, 22))), h('b', null, r.puntos + ' pts')))));
        contenido.push(tabla('Concurso de triples (primera ronda)', ev.triples), tabla('Concurso de mates (primera ronda)', ev.mates));
        contenido.push(h('h4', null, pa.nombreA), lista(pa.a), h('h4', null, pa.nombreB), lista(pa.b));
        if (ev.mio) contenido.push(h('div', { class: 'aviso ok' }, 'Tu jugador: ' + (ev.mio.seleccionado ? 'elegido para el partido. ' : '') + (ev.mio.triples ? 'Ganó el concurso de triples. ' : '') + (ev.mio.mates ? 'Ganó el concurso de mates. ' : '') + (ev.mio.mvp ? 'MVP del partido.' : '')));
        if (mios.length && !ev.mio) contenido.push(h('div', { class: 'aviso ok' }, 'Elegidos de tu club: ' + mios.map(i => nombre(st, i)).join(', ') + '.'));
      }
      el.append(seccion(ev.nombre, ...contenido));
    });
  }
  addTab('calendario', 'allstar', 'All-Star', allstarTab, st => !!M().allstar);

  // ---------- Calendario: rivalidades con historia ----------
  function rivalidadesTab(el, st) {
    const R = M().rivalidades, club = st.clubId, riv = R.rivalesDe(st, club);
    if (!riv.length) { el.append(aviso('Tu club no tiene derbis ni rivalidades históricas todavía. Elige a tu gran rival en Ciudad, pestaña Identidad.', '')); return; }
    riv.forEach(r => {
      const H = R.historia(st, club, r.equipoId), a = H.h2h[club] || 0, b = H.h2h[r.equipoId] || 0, amb = R.ambiente(st, club, r.equipoId);
      el.append(seccion(r.nombre, h('div', { class: 'tarjeta' }, h('div', { class: 'fila' }, h('div', { class: 'fila' }, escudo(club), h('b', null, a + ' - ' + b), escudo(r.equipoId)), h('span', { title: 'Ambiente del clásico' }, estrellas(amb))),
        h('p', { class: 'muted' }, 'Rival: ' + eq(r.equipoId).nombre + '. ' + (H.racha ? 'Racha: ' + eq(H.racha.equipoId).siglas + ' lleva ' + H.racha.n + ' victorias seguidas.' : 'Sin racha.')),
        H.ultimos.length ? h('div', { class: 'chips' }, H.ultimos.map(u => h('span', { class: 'chip ' + (u.ganador === club ? 'ok' : 'mal'), title: U.fecha(u.fecha) }, u.res))) : h('p', { class: 'muted' }, 'Todavía no os habéis enfrentado esta temporada.'),
        H.recuerdos.length ? h('div', null, h('h4', null, 'Para el recuerdo'), h('div', { class: 'lista' }, H.recuerdos.map(m => h('div', { class: 'item col' }, h('div', { class: 'fila' }, h('b', null, m.marcador), h('span', { class: 'muted' }, m.temporada)), h('span', { class: 'muted' }, m.texto))))) : null)));
    });
  }
  addTab('calendario', 'rivalidades', 'Rivalidades', rivalidadesTab, st => !!M().rivalidades && !!M().rivalidades.historia);

  // ---------- Mercado: ojeadores ----------
  function ojeadoresTab(el, st) {
    const O = M().ojeadores, E = O.estado(st), maxO = O.maximo(st);
    el.append(seccion('Tus ojeadores (' + E.equipo.length + '/' + maxO + ')', E.equipo.length ? h('div', { class: 'lista' }, E.equipo.map(o => h('div', { class: 'item col' }, h('div', { class: 'fila' }, h('b', null, o.nombre), chip(O.NIVELES[o.nivel], 'ok')), h('span', { class: 'muted' }, 'Especialidad: ' + O.ESPEC[o.espec] + ', ' + U.eur(o.sueldo) + ' al año, ' + o.vistos + ' jugadores vistos'),
      h('div', { class: 'par' }, h('select', { class: 'sel', onchange: e => { const r = O.asignar(st, o.id, e.target.value); if (!r.ok) toast(r.motivo); refrescar(); } }, h('option', { value: '' }, 'Zona de ojeo…'), O.destinos(st).map(d => h('option', { value: d.id, selected: o.destino === d.id }, d.nombre))), h('button', { class: 'btn peq btn-sec', onclick: () => { O.despedir(st, o.id); refrescar(); } }, 'Despedir'))))) : h('p', { class: 'muted' }, 'Sin ojeadores. Contrata uno y envíalo a una liga, a los agentes libres o a la clase del draft: cada lunes te deja un informe de jóvenes con futuro.')));
    if (E.equipo.length < maxO) el.append(seccion('Candidatos', h('div', { class: 'lista' }, O.candidatos(st).map(c => h('div', { class: 'item col' }, h('div', { class: 'fila' }, h('b', null, c.nombre), chip(O.NIVELES[c.nivel], '')), h('span', { class: 'muted' }, 'Especialidad: ' + O.ESPEC[c.espec] + ', ' + U.eur(c.sueldo) + ' al año'), h('button', { class: 'btn peq', onclick: () => { const r = O.contratar(st, c.id); toast(r.ok ? 'Contratado' : r.motivo); refrescar(); } }, 'Contratar'))))));
    const inf = O.informes(st), segs = inf.filter(i => i.seguido), resto = inf.filter(i => !i.seguido);
    const tarjeta = i => h('div', { class: 'item col' }, h('div', { class: 'fila' }, h('div', { class: 'ct' }, h('b', null, clip(i.nombre, 24) + (i.joya ? ' 💎' : '')), h('span', { class: 'muted' }, i.pos + ', ' + i.edad + ' años, ' + i.nac + ', ' + clip(i.club, 24))), h('div', { class: 'col' }, h('span', { class: 'ovr' }, i.ovr[0] + '-' + i.ovr[1]), h('span', { class: 'muted' }, 'pot. ' + i.pot[0] + '-' + i.pot[1]))),
      h('span', { class: 'muted' }, 'Informe de ' + i.ojeador + ' (' + O.NIVELES[i.nivel] + ', ' + U.fecha(i.fecha) + (i.vistas > 1 ? ', visto ' + i.vistas + ' veces' : '') + '). ' + (i.fuerte ? 'Destaca en ' + i.fuerte + '.' : '') + (i.joya ? ' Podría explotar si juega.' : '')),
      h('div', { class: 'par' }, i.jugadorId && GM.ui._.detalleJugador ? h('button', { class: 'btn peq', onclick: () => GM.ui._.detalleJugador(i.jugadorId) }, 'Ver ficha') : null, i.jugadorId && st.jugadores[i.jugadorId] && st.jugadores[i.jugadorId].juvenil && st.jugadores[i.jugadorId].equipoId !== st.clubId && (gestor(st) || pres(st)) ? h('button', { class: 'btn peq', onclick: () => { const r = O.ficharCantera(st, i.id); toast(r.ok ? 'Fichas al juvenil por ' + U.eur(r.precio) : r.motivo); refrescar(); } }, 'Ofertar ' + U.eur(O.precioJuvenil(st, st.jugadores[i.jugadorId]))) : null, h('button', { class: 'btn peq btn-sec', onclick: () => { O.seguir(st, i.id); refrescar(); } }, i.seguido ? 'Dejar de seguir' : 'Seguir'), h('button', { class: 'btn peq btn-sec', onclick: () => { O.descartar(st, i.id); refrescar(); } }, 'Descartar')));
    if (segs.length) el.append(seccion('En seguimiento', h('div', { class: 'lista' }, segs.map(tarjeta))));
    el.append(seccion('Informes', resto.length ? h('div', { class: 'lista' }, resto.slice(0, 30).map(tarjeta)) : h('p', { class: 'muted' }, 'Aún no hay informes. Asigna una zona a un ojeador y espera al lunes.')));
  }
  addTab('mercado', 'ojeadores', 'Ojeadores', ojeadoresTab, st => !!M().ojeadores && (gestor(st) || pres(st)));
  // En entrenador y carrera las pantallas no tienen pestañas: los ojeadores se añaden al final de la directiva y del agente
  const adjuntar = (id, es, fn) => { const sc = GM.ui.screens[id]; if (!sc) return; const old = sc.render; sc.render = (el, st) => { old(el, st); if (es(st)) fn(el, st); }; }; GM.ui._.adjuntar = adjuntar;
  adjuntar('junta', st => !!M().ojeadores && entr(st), ojeadoresTab); adjuntar('agente', st => !!M().ojeadores && carrera(st), ojeadoresTab);

  // ---------- Negociación de contratos ----------
  function dialogoNegociacion(id, tipo) {
    const st = GM.state, N = M().negociacion, Mm = M().mercado, p = st.jugadores[id], r0 = N.abrir(st, id, tipo === 'renovar' ? 'renovar' : 'fichar');
    if (!r0.ok) { toast(r0.motivo); return; } const ses = r0.sesion; let anos = 2, clausula = 0, opcion = null, bonus = [];
    const sal = h('b', { class: 'gran' }), sl = h('input', { type: 'range', min: Math.round(ses.pedido * 0.6 / 10000) * 10000, max: Math.round(ses.pedido * 1.5 / 10000) * 10000, step: 10000, value: ses.pedido, class: 'rango' });
    const info = h('div'), msg = h('div', { class: 'aviso' }, ses.agente.nombre + ' (' + ses.agente.etq + '): «Mi cliente pide unos ' + U.eur(ses.pedido) + ' al año.»'), años = h('div', { class: 'seg' }), cla = h('div', { class: 'seg' }), opt = h('div', { class: 'seg' }), bon = h('div', { class: 'col' });
    const oferta = () => ({ salario: +sl.value, anos, clausula, opcion, bonus: bonus.filter(b => b.cant > 0) });
    const vm = Mm.valorJugador(p), CLAUSULAS = [[0, 'Sin cláusula'], [Math.round(vm * 1.2 / 1e5) * 1e5, 'Baja'], [Math.round(vm * 2.2 / 1e5) * 1e5, 'Normal'], [Math.round(vm * 5 / 1e5) * 1e5, 'Desorbitada']];
    const pinta = () => {
      const v = N.valorar(st, ses, oferta()); sal.textContent = U.eur(+sl.value) + ' / año'; años.innerHTML = ''; cla.innerHTML = ''; opt.innerHTML = ''; bon.innerHTML = '';
      [1, 2, 3, 4].forEach(n => años.append(h('button', { class: 'tab' + (anos === n ? ' on' : ''), onclick: () => { anos = n; pinta(); } }, n + (n === 1 ? ' año' : ' años'))));
      CLAUSULAS.forEach(c => cla.append(h('button', { class: 'tab' + (clausula === c[0] ? ' on' : ''), onclick: () => { clausula = c[0]; pinta(); } }, c[1] + (c[0] ? ' (' + U.eur(c[0]) + ')' : ''))));
      [[null, 'Sin opción'], ['jugador', 'Del jugador'], ['club', 'Del club']].forEach(o => opt.append(h('button', { class: 'tab' + (opcion === o[0] ? ' on' : ''), onclick: () => { opcion = o[0]; pinta(); } }, o[1])));
      N.bonusDisponibles().forEach(b => { const ex = bonus.find(x => x.tipo === b.tipo); bon.append(h('div', { class: 'fila' }, h('span', null, b.etq + (b.def ? ' (' + (ex ? ex.umbral : b.def) + ' ' + b.unidad + ')' : '')), h('div', { class: 'seg' }, [0, 50000, 150000, 400000].map(c => h('button', { class: 'tab' + ((ex ? ex.cant : 0) === c ? ' on' : ''), onclick: () => { bonus = bonus.filter(x => x.tipo !== b.tipo); if (c) bonus.push({ tipo: b.tipo, cant: c, umbral: b.def }); pinta(); } }, c ? U.eur(c) : 'No'))))); });
      info.innerHTML = ''; info.append(h('p', { class: 'muted' }, 'Valor de la oferta para el jugador: ' + U.eur(v.valor) + ' (pide ' + U.eur(v.exigido) + '). ' + (v.ratio >= 1 ? 'Debería aceptar.' : v.ratio >= 0.9 ? 'Estamos cerca.' : 'Queda lejos.')), h('div', { class: 'chips' }, v.partes.filter(x => x.t !== 'Salario').slice(0, 6).map(x => chip(x.t + ' ' + (x.v >= 0 ? '+' : '') + U.eur(x.v), x.v >= 0 ? 'ok' : 'mal'))));
    };
    sl.addEventListener('input', pinta);
    const cuerpo = h('div', null, h('h3', null, (tipo === 'renovar' ? 'Renovar a ' : 'Negociar con ') + p.nombre), msg, sal, sl, h('h4', null, 'Años'), años, h('h4', null, 'Cláusula de rescisión'), cla, h('h4', null, 'Opción en el último año'), opt, h('h4', null, 'Bonus por objetivos'), bon, info);
    modal(cuerpo, [{
      t: 'Proponer', fn: () => {
        const r = N.proponer(st, ses, oferta()); msg.textContent = r.mensaje; msg.className = 'aviso ' + (r.estado === 'acepta' ? 'ok' : r.estado === 'rompe' ? 'mal' : 'med');
        if (r.estado === 'acepta') { const c = N.cerrar(st, ses); if (!c.ok) { msg.textContent = c.motivo; msg.className = 'aviso mal'; ses.estado = 'abierta'; return false; } toast('Contrato firmado'); refrescar(true); return true; }
        if (r.estado === 'contra') { sl.value = r.contra.salario; pinta(); } if (r.estado === 'rompe') { toast('El agente rompe la negociación'); setTimeout(() => refrescar(true), 50); return true; } return false;
      }
    }, { t: 'Cerrar', cls: 'btn-sec' }]);
    pinta();
  }
  GM.ui._.dialogoNegociacion = dialogoNegociacion;

  // ---------- Plantilla: informe del rival y cuerpo técnico ----------
  function rivalTab(el, st) {
    const T = M().tactica, C = M().competiciones, P = M().partidos, club = st.clubId, g = C.proximoPartido(st, club), sig = g ? (g.local === club ? g.visitante : g.local) : null;
    if (!ui.rivalInforme || ui.rivalInforme === club || !st.equipos[ui.rivalInforme]) ui.rivalInforme = sig;
    const lg = M().mercado.ligaDe(st, club), ids = (st.ligas[lg] ? st.ligas[lg].equipos : []).filter(i => i !== club);
    el.append(seccion('Informe del rival', h('div', { class: 'filtros' }, h('select', { class: 'sel', onchange: e => { ui.rivalInforme = e.target.value; refrescar(); } }, ids.sort((a, b) => eq(a).nombre.localeCompare(eq(b).nombre)).map(i => h('option', { value: i, selected: ui.rivalInforme === i }, eq(i).nombre + (i === sig ? ' (próximo)' : '')))))));
    if (!ui.rivalInforme) { el.append(aviso('No hay próximo partido.', '')); return; }
    const inf = T.informeRival(st, ui.rivalInforme), niv = ['Sin analista: solo lo básico', 'Analista discreto', 'Analista bueno', 'Analista excelente'][inf.nivel];
    el.append(h('div', { class: 'tarjeta' }, h('div', { class: 'fila' }, h('div', { class: 'fila' }, escudo(ui.rivalInforme), h('b', null, eq(ui.rivalInforme).nombre)), chip(niv, '')), h('div', { class: 'duelo' }, h('b', null, inf.mio.toFixed(1)), h('span', { class: 'barra dual' }, h('i', { style: { width: (inf.mio / (inf.mio + inf.ovr) * 100) + '%' } })), h('b', null, inf.ovr.toFixed(1))), h('p', { class: 'muted' }, inf.estilo),
      inf.fuertes.length ? fila('Fuertes', inf.fuertes.join(', ')) : null, inf.debiles.length ? fila('Débiles', inf.debiles.join(', ')) : null, inf.pista ? h('div', { class: 'aviso med' }, 'Pista: ' + inf.pista) : null, inf.nivel === 0 ? h('p', { class: 'muted' }, 'Contrata un analista (pestaña Cuerpo técnico) para saber en qué es fuerte y débil.') : null,
      inf.clave ? fila('Jugador clave', inf.clave.nombre + ' (' + inf.clave.ovr + '), destaca en ' + inf.clave.fuerte) : null,
      inf.quinteto && inf.quinteto.length ? h('div', { class: 'chips' }, inf.quinteto.map(q => h('span', { class: 'chip' }, q.pos + ' ' + clip(q.nombre, 14) + ' ' + q.ovr))) : null));
    if (inf.recomendacion) { const r = inf.recomendacion; el.append(seccion('Plan de partido recomendado', h('div', { class: 'tarjeta' }, h('div', { class: 'chips' }, [['Ataque', r.ataque], ['Defensa', r.defensa], ['Foco', r.foco], ['Presión', r.presion], ['Rebote', r.rebote], ['Rotación', r.rotacion], ['Ritmo', r.ritmo]].map(x => chip(x[0] + ': ' + x[1], ''))), h('ul', null, r.razones.map(x => h('li', null, x))),
      h('button', { class: 'btn', onclick: () => { const x = T.aplicarRecomendacion(st, ui.rivalInforme); toast(x.ok ? 'Plan aplicado a tu táctica' : x.motivo); refrescar(); } }, 'Aplicar el plan a mi táctica')))); }
    const ch = T.estado(st), hoy = ch.charla === st.fecha;
    el.append(seccion('Charla al equipo', h('div', { class: 'tarjeta' }, h('div', { class: 'seg' }, Object.keys(T.CHARLAS).map(k => h('button', { class: 'tab', disabled: hoy, title: T.CHARLAS[k].desc, onclick: () => { const r = T.charla(st, k); toast(r.ok ? r.texto : r.motivo); refrescar(); } }, T.CHARLAS[k].etq))), h('p', { class: 'muted' }, hoy ? 'Ya has hablado al equipo hoy.' : 'Una charla por jornada: motivar sube el ánimo, calma da forma, exigir aprieta a los titulares y repasar el plan funciona si has aplicado el plan al rival.'))));
    void P;
  }
  function staffTab(el, st) {
    const T = M().tactica, ch = T.estado(st), coh = T.cohesion(st);
    el.append(seccion('Cohesión del equipo', h('div', { class: 'tarjeta' }, fila('Cohesión', Math.round(coh) + ' / 100'), barra(coh, 100, coh >= 55 ? 'verde' : 'rojo'), h('p', { class: 'muted' }, 'Sube con victorias y con el plan de equipo; baja con cada fichaje o venta y tras derrotas. Una plantilla cohesionada rinde algo más.'))));
    el.append(seccion('Plan de la semana', h('div', { class: 'tarjeta' }, h('div', { class: 'seg' }, Object.keys(T.PLANES).map(k => h('button', { class: 'tab' + (ch.plan === k ? ' on' : ''), onclick: () => { T.fijarPlan(st, k); refrescar(); } }, T.PLANES[k].etq))), h('p', { class: 'muted' }, T.PLANES[ch.plan].desc + ' Se aplica los lunes.'))));
    el.append(seccion('Cuerpo técnico', h('div', { class: 'lista' }, T.staff(st).map(s => h('div', { class: 'item col' }, h('div', { class: 'fila' }, h('b', null, s.etq), chip(s.nombre, s.nivel ? 'ok' : '')), h('span', { class: 'muted' }, s.desc), s.siguiente ? h('button', { class: 'btn peq', onclick: () => { const r = T.contratar(st, s.id); toast(r.ok ? 'Contratado' : r.motivo); refrescar(); } }, 'Contratar o mejorar (' + U.eur(s.siguiente * 1000) + ')') : h('span', { class: 'muted' }, 'Tienes al mejor.'))))));
  }
  addTab('plantilla', 'rival', 'Rival', rivalTab, st => !!M().tactica && (gestor(st) || entr(st)));
  addTab('plantilla', 'staff', 'Cuerpo técnico', staffTab, st => !!M().tactica && (gestor(st) || entr(st)));

  // ---------- Prensa con memoria ----------
  function prensaSecciones(el, st) {
    const Pr = M().prensa; if (!Pr) return; const E = Pr.estado(st), ab = Pr.abiertas(st);
    el.append(seccion('Prensa y credibilidad', h('div', { class: 'tarjeta' }, fila('Credibilidad', Math.round(E.cred) + ' / 100'), barra(E.cred, 100, E.cred >= 50 ? 'verde' : 'rojo'), h('p', { class: 'muted' }, 'Lo que prometes en las ruedas de prensa se recuerda. Cumplirlo sube tu credibilidad y tus mensajes pesan más; romperlo la hunde. Las ruedas se dan en la sede (despacho o sala de prensa).'))));
    el.append(seccion('Promesas abiertas', ab.length ? h('div', { class: 'lista' }, ab.map(m => h('div', { class: 'item col' }, h('b', null, m.frase), h('span', { class: 'muted' }, 'Dicho el ' + U.fechaLarga(m.desde) + (m.rebajada ? ', matizado' : '')))))
      : h('p', { class: 'muted' }, 'No tienes promesas pendientes.')));
    const rc = Pr.reacciones ? Pr.reacciones(st) : []; if (rc.length) el.append(seccion('Reacciones de otros vestuarios', h('div', { class: 'lista' }, rc.map(r => h('div', { class: 'item col' }, h('span', null, r.texto), h('span', { class: 'muted' }, U.fecha(r.fecha)))))));
    const res = E.mem.filter(m => m.estado !== 'abierta').slice(0, 8);
    if (res.length) el.append(seccion('Hemeroteca', h('div', { class: 'lista' }, res.map(m => h('div', { class: 'item col' }, h('div', { class: 'fila' }, h('b', null, clip(m.frase, 60)), pill(m.estado === 'cumplida' ? 'Cumplida' : 'Rota', m.estado === 'cumplida')), h('span', { class: 'muted' }, U.fechaLarga(m.desde) + (m.resuelta ? ', resuelta el ' + U.fechaLarga(m.resuelta) : '')))))));
  }
  addTab('club', 'prensa', 'Prensa', (el, st) => prensaSecciones(el, st), st => !!M().prensa && (gestor(st) || pres(st)));
  // En entrenador y carrera la prensa se añade al final de sus pantallas
  [['junta', entr], ['trayectoria', carrera]].forEach(([id, es]) => { const sc = GM.ui.screens[id]; if (!sc) return; const old = sc.render; sc.render = (el, st) => { old(el, st); if (es(st) && M().prensa) prensaSecciones(el, st); }; });

  // ---------- Ciudad: la ciudad crece ----------
  function creceTab(el, st) {
    const C = M().crecimiento, H = C.hitos(st), E = C.estado(st), ef = C.efectos(st), puede = gestor(st) || pres(st);
    el.append(seccion('La ciudad crece con el club', h('div', { class: 'tarjeta' }, fila('Turismo', Math.round(E.turismo) + ' / 100'), barra(E.turismo, 100, 'verde'), fila('Comercio', Math.round(E.comercio) + ' / 100'), barra(E.comercio, 100, 'verde'), h('div', { class: 'chips' }, chip('Ingresos ' + (ef.ingresos >= 0 ? '+' : '') + (ef.ingresos * 100).toFixed(1) + ' %', ''), chip('Asistencia ' + (ef.asistencia >= 0 ? '+' : '') + (ef.asistencia * 100).toFixed(1) + ' %', ''), chip('Cantera ' + (ef.cantera >= 0 ? '+' : '') + (ef.cantera * 100).toFixed(1) + ' %', '')),
      h('p', { class: 'muted' }, puede ? 'Impulsa los hitos cuando se desbloqueen: las obras tardan semanas y el resultado se ve por las calles de tu ciudad.' : 'La ciudad impulsa estos hitos sola cuando el club los merece.'))));
    el.append(seccion('Hitos urbanos', h('div', { class: 'lista' }, H.map(x => h('div', { class: 'item col' }, h('div', { class: 'fila' }, h('b', null, x.nombre), pill(x.estado === 'hecho' ? 'Inaugurado' : x.estado === 'obra' ? 'En obras' : x.estado === 'disponible' ? 'Disponible' : 'Bloqueado', x.estado === 'hecho' ? true : x.estado === 'bloqueado' ? undefined : undefined)), h('span', { class: 'muted' }, x.desc),
      x.estado === 'obra' ? h('div', null, barra(x.progreso * 100, 100, 'verde'), h('span', { class: 'muted' }, (x.fase ? x.fase.nombre + ' (' + x.fase.pct + ' %). ' : '') + 'Se inaugura el ' + U.fechaLarga(x.fin))) : null,
      x.estado === 'bloqueado' ? h('span', { class: 'muted' }, 'Falta: ' + x.falta.map(f => ({ aficion: 'afición', apoyo: 'apoyo del ayuntamiento', reputacion: 'reputación', titulos: 'títulos' }[f.k] || f.k) + ' ' + f.tiene + '/' + f.pide).join(', ')) : null,
      x.estado === 'disponible' ? h('button', { class: 'btn peq', disabled: !puede, onclick: () => { const r = C.impulsar(st, x.id); toast(r.ok ? 'Obras en marcha' : r.motivo); refrescar(); } }, puede ? 'Impulsar' + (x.coste ? ' (' + U.eur(x.coste) + ')' : '') : 'La ciudad lo hará sola') : null)))));
  }
  // Otras ciudades y el pueblo (punto 67)
  function extraCrece(el, st) {
    const C = M().crecimiento; if (C.hitosPueblo && st.modo === 'carrera' && st.carrera && st.carrera.pueblo) {
      const hp = C.hitosPueblo(st); el.append(seccion('Hitos de ' + st.carrera.pueblo.nombre, h('div', { class: 'lista' }, hp.map(x => h('div', { class: 'item col' }, h('div', { class: 'fila' }, h('b', null, x.nombre), pill(x.estado === 'hecho' ? 'Inaugurado' : x.estado === 'obra' ? 'En obras' : x.estado === 'disponible' ? 'Disponible' : 'Bloqueado', x.estado === 'hecho' ? true : x.estado === 'obra' ? undefined : false)), h('span', { class: 'muted' }, x.desc),
        x.estado === 'obra' ? h('div', null, barra(x.fase.pct, 100, 'verde'), h('span', { class: 'muted' }, x.fase.nombre + ', se inaugura el ' + U.fechaLarga(x.fin))) : null,
        x.estado === 'bloqueado' ? h('span', { class: 'muted' }, 'Falta: ' + x.falta.map(f => (f.k === 'fama' ? 'fama' : 'cariño del pueblo') + ' ' + f.tiene + '/' + f.pide).join(', ')) : null,
        x.estado === 'disponible' ? h('button', { class: 'btn peq', onclick: () => { const r = C.impulsarPueblo(st, x.id); toast(r.ok ? 'Obras en marcha' : r.motivo); refrescar(); } }, 'Impulsar' + (x.coste ? ' (' + U.eur(x.coste * 1000) + ')' : ' (lo paga el ayuntamiento)')) : null)))));
    }
    if (C.ranking) { const rk = C.ranking(st); el.append(seccion('Otras ciudades que crecen', h('div', { class: 'lista' }, rk.map(x => h('div', { class: 'item' }, h('div', { class: 'ct' }, h('b', null, x.ciudad + ' (' + x.club + ')'), h('span', { class: 'muted' }, x.hechos + ' hitos' + (x.obras.length ? ', en obras: ' + x.obras.join(', ').toLowerCase() : ''))))))));}
  }
  addTab('ciudad', 'crece', 'La ciudad crece', (el, st) => { creceTab(el, st); extraCrece(el, st); }, st => !!M().crecimiento);
})();
