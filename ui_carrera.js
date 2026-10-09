/* INTERFAZ: Pantallas de la carrera de jugador: jugador, agente y trayectoria.
   Separado de ui.js. Usa las utilidades del núcleo de la interfaz a través de GM.ui._ (ver ui.js). */
(function () {
  const { registerScreen, ATT, M, POSN, S, U, aplicaKit, avatarEl, aviso, barra, catEdad, chip, clip, clsOvr, dorsal, entr, eq, escudo, h, modal, navegar, nuevaTemporada, perfilModal, refrescar, seccion, toast, ui } = GM.ui._;
  function inicioCarrera(el, st) {
    const K = M().carrera, c = st.carrera, p = st.jugadores.yo, s = K.stats(st), ro = K.rol(st);
    if (c.fase === 'retirado') { trayectoriaPantalla(el, st); return true; }
    el.append(h('button', { class: 'perfil-linea', onclick: () => navegar('jugador') }, avatarEl(st.personaje, 48, { camiseta: true, numero: dorsal(st) }), h('div', { class: 'ct' }, h('b', null, p.nombre), h('span', { class: 'muted' }, c.fase === 'ncaa' ? (c.etapa === 'cantera' ? 'Cantera de ' + eq(c.cantera.clubId).nombre + ', ' + catEdad(p.edad) : 'Universidad de EE. UU., curso ' + c.curso) : K.retrato(st).club + ', ' + (ro || 'sin equipo'))), h('span', { class: 'ovr grande ' + clsOvr(p.ovr) }, p.ovr)));
    estiloCard(el, st);
    eventosCards(el, st);
    if (c.fase === 'libre') el.append(aviso('No tienes equipo. Ve a Agente y acepta una oferta antes de empezar la temporada.', 'med'));
    if (c.ofertas.length && (c.fase !== 'ncaa' || c.etapa === 'cantera')) el.append(seccion('Ofertas', h('div', { class: 'tarjeta' }, h('p', null, 'Tu representante tiene ' + c.ofertas.length + ' ofertas.'), h('button', { class: 'btn', onclick: () => navegar('agente') }, 'Ver ofertas'))));
    if (c.fase === 'ncaa' && c.etapa === 'cantera') {
      const gf = K.gradoFama(c), cat = catEdad(p.edad);
      el.append(seccion('Tu etapa en la cantera', h('div', { class: 'tarjeta' }, h('div', { class: 'fila' }, h('b', null, 'Categoría ' + cat), h('b', null, p.edad + ' años')),
        h('p', null, st.temporadaTerminada ? 'La temporada ha terminado.' : 'Cada semana entrenas y el club te va viendo. Si progresas, subes de categoría.'),
        h('div', { class: 'chips' }, chip('Nivel ' + p.ovr + ', potencial ' + p.pot), chip('Reputación: ' + gf.nombre)),
        p.edad < 18 ? h('p', { class: 'muted' }, 'A los 18 llegarán las ofertas: contrato profesional, universidad en EE. UU. o un año más en el filial.') : h('p', { class: 'aviso med' }, 'Con ' + p.edad + ' años es el momento de decidir tu futuro. Mira las ofertas de tu representante.'),
        st.temporadaTerminada ? h('button', { class: 'btn grande', onclick: nuevaTemporada }, 'Empezar la temporada siguiente') : h('div', { class: 'par' }, h('button', { class: 'btn', onclick: () => { for (let i = 0; i < 7 && !st.temporadaTerminada; i++) M().competiciones.jugarDia(st); refrescar(); } }, 'Avanzar una semana'), h('button', { class: 'btn btn-sec', onclick: () => { let n = 0; while (!st.temporadaTerminada && n < 400) { M().competiciones.jugarDia(st); n++; } refrescar(true); } }, 'Hasta el final')))));
      partidosJuveniles(el, st);
      if (st.noticias.length) el.append(seccion('Noticias', h('div', { class: 'lista noticias' }, st.noticias.slice(0, 5).map(n => h('div', { class: 'item' }, h('span', { class: 'muted f' }, U.fecha(n.fecha)), h('span', null, n.texto))))));
      return true;
    }
    if (c.fase === 'ncaa') {
      const mk = K.mock(st);
      el.append(seccion('Tu temporada universitaria', h('div', { class: 'tarjeta' },
        h('p', null, st.temporadaTerminada ? 'El curso ha terminado.' : 'El curso va avanzando. Entrena cada semana y decide si te declaras para el draft.'),
        h('p', { class: 'muted' }, 'Proyección del draft: ' + mk.proyeccion + (mk.pick <= 60 ? ' (puesto ' + mk.pick + ')' : '') + '.'),
        st.temporadaTerminada ? h('button', { class: 'btn grande', onclick: nuevaTemporada }, 'Empezar curso siguiente') : h('div', { class: 'par' }, h('button', { class: 'btn', onclick: () => { for (let i = 0; i < 7 && !st.temporadaTerminada; i++) M().competiciones.jugarDia(st); refrescar(); } }, 'Avanzar una semana'), h('button', { class: 'btn btn-sec', onclick: () => { let n = 0; while (!st.temporadaTerminada && n < 400) { M().competiciones.jugarDia(st); n++; } refrescar(true); } }, 'Hasta el final')))));
      partidosJuveniles(el, st);
      if (st.noticias.length) el.append(seccion('Noticias', h('div', { class: 'lista noticias' }, st.noticias.slice(0, 5).map(n => h('div', { class: 'item' }, h('span', { class: 'muted f' }, U.fecha(n.fecha)), h('span', null, n.texto))))));
      return true;
    }
    el.append(seccion('Esta temporada', h('div', { class: 'tarjeta' }, h('div', { class: 'chips' }, chip(s.pj + ' partidos'), chip(s.pts.toFixed(1) + ' pts'), chip(s.reb.toFixed(1) + ' reb'), chip(s.ast.toFixed(1) + ' ast'), chip(Math.round(s.min) + ' min'), ro ? chip(ro) : null))));
    return false;
  }
  // Disciplinado o rebelde: barra de «chico malo» a «profesional ejemplar», lo último que lo ha movido y los planes
  function estiloCard(el, st) {
    const Es = M().estilo, e = Es && Es.estado(st); if (!e) return;
    const pct = (e.v + 100) / 2, Mv = M().movil, nl = Mv ? Mv.noLeidos(st) : 0;
    el.append(seccion('Tu estilo', h('div', { class: 'tarjeta estilo' },
      h('div', { class: 'fila' }, h('b', null, e.etiqueta), h('span', { class: 'muted' }, (e.v > 0 ? '+' : '') + e.v)),
      h('div', { class: 'estilo-barra' }, h('span', { class: 'estilo-marca', style: { left: pct + '%' } })),
      h('div', { class: 'fila muted f' }, h('span', null, 'Chico malo'), h('span', null, 'Profesional ejemplar')),
      e.sancion ? h('p', { class: 'aviso med' }, 'Sancionado: no juegas ' + (e.sancion === 1 ? 'el próximo partido' : 'los próximos ' + e.sancion + ' partidos') + '.') : null,
      h('p', { class: 'muted' }, e.v <= -25 ? 'Más fama y patrocinios atrevidos, pero arriesgas multas, sanciones, lesiones y potencial.' : e.v >= 25 ? 'Tu potencial sube y el entrenador confía en ti; la fama crece más despacio.' : 'Ni santo ni gamberro: tus decisiones marcarán el camino.'),
      e.hist.length ? h('div', { class: 'lista' }, e.hist.slice(0, 3).map(x => h('div', { class: 'item' }, h('span', null, x.motivo), h('b', { class: x.d >= 0 ? '' : 'neg' }, (x.d > 0 ? '+' : '') + x.d)))) : null,
      h('div', { class: 'par' }, h('button', { class: 'btn', onclick: () => planesModal(st) }, 'Hacer planes'), h('button', { class: 'btn btn-sec', onclick: () => abrirMovil() }, 'Móvil' + (nl ? ' (' + nl + ')' : ''))))));
  }
  function planesModal(st) {
    const cuerpo = h('div');
    const pintar = () => {
      const Es = M().estilo, e = Es.estado(st), ps = Es.planes(st); cuerpo.innerHTML = '';
      const col = (tit, lado) => h('div', { class: 'planes-col' }, h('b', null, tit), ps.filter(p => p.lado === lado).map(p => h('button', { class: 'btn btn-sec plan', disabled: !p.disponible, onclick: () => { const r = Es.hacer(st, p.id); if (!r.ok) toast(r.motivo); else { toast(r.texto + (r.efectos.length ? ': ' + r.efectos.join(', ') : '')); pintar(); refrescar(); } } }, h('span', null, p.t), h('span', { class: 'muted' }, p.disponible ? p.d : p.motivo))));
      cuerpo.append(h('h3', null, 'Planes'), h('p', { class: 'muted' }, 'Ahora te ven como: ' + e.etiqueta.toLowerCase() + '.'), h('div', { class: 'planes' }, col('De rebelde', 'r'), col('De profesional', 'p')));
    };
    pintar(); modal(cuerpo, [{ t: 'Cerrar', cls: 'btn-sec' }], { alta: true });
  }
  // ---------- El móvil ----------
  function abrirMovil(chatId) {
    const st = S(), Mv = M().movil; if (!Mv) return;
    const cuerpo = h('div', { class: 'movil' });
    const ini = n => n.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
    const lista = () => {
      cuerpo.innerHTML = ''; const cs = Mv.chats(st);
      cuerpo.append(h('div', { class: 'movil-cab' }, h('b', null, 'Mensajes'), h('span', { class: 'muted' }, U.fecha(st.fecha))));
      if (!cs.length) cuerpo.append(h('p', { class: 'muted' }, 'Aún no tienes mensajes.'));
      cs.forEach(c => cuerpo.append(h('button', { class: 'movil-chat', onclick: () => ver(c.id) }, h('span', { class: 'movil-av' }, ini(c.nombre)),
        h('div', { class: 'ct' }, h('b', null, c.nombre), h('span', { class: 'muted' }, clip(c.ultimo, 46))),
        c.pendientes ? h('span', { class: 'movil-pend' }, 'Decidir') : c.noLeidos ? h('span', { class: 'movil-num' }, c.noLeidos) : null)));
    };
    const ver = id => {
      const c = Mv.chats(st).find(x => x.id === id); Mv.leer(st, id); cuerpo.innerHTML = '';
      cuerpo.append(h('div', { class: 'movil-cab' }, h('button', { class: 'btn btn-sec peq', onclick: lista }, 'Volver'), h('div', { class: 'ct' }, h('b', null, c.nombre), h('span', { class: 'muted' }, c.rol))));
      const hilo = h('div', { class: 'movil-hilo' });
      Mv.chat(st, id).forEach(m => {
        hilo.append(h('div', { class: 'burbuja ' + (m.de === 'yo' ? 'yo' : 'el') }, h('span', null, m.t), h('i', null, U.fecha(m.fecha))));
        if (m.ops && m.estado === 'pendiente') hilo.append(h('div', { class: 'movil-ops' }, m.ops.map((o, i) => h('button', { class: 'btn btn-sec peq', title: o.d, onclick: () => { const r = Mv.contestar(st, id, m.n, i); if (!r.ok) toast(r.motivo); else { if (r.efectos && r.efectos.length) toast(r.efectos.join(', ')); ver(id); refrescar(); } } }, h('span', null, o.t), o.d ? h('span', { class: 'muted' }, o.d) : null))));
        else if (m.estado === 'ignorado') hilo.append(h('div', { class: 'movil-nota' }, 'Sin contestar'));
      });
      cuerpo.append(hilo); setTimeout(() => { hilo.scrollTop = hilo.scrollHeight; }, 0);
    };
    if (chatId) ver(chatId); else lista();
    modal(cuerpo, [{ t: 'Cerrar', cls: 'btn-sec', fn: () => { refrescar(); } }], { alta: true });
  }
  GM.ui.movil = abrirMovil;
  function eventosCards(el, st) {
    const K = entr() ? M().entrenador : M().carrera, ev = K.eventos(st);
    if (!ev.length) return;
    el.append(seccion('Decisiones', ev.map(e => h('div', { class: 'tarjeta' }, h('b', null, e.titulo), h('div', { class: 'cita' }, h('span', { class: 'avatar' }, e.quien.charAt(0)), h('div', { class: 'ct' }, h('b', null, e.quien), h('p', { class: 'dicho' }, '«' + e.texto + '»'))),
      h('div', { class: 'lista' }, e.opciones.map(o => h('button', { class: 'btn btn-sec', style: { flexDirection: 'column', alignItems: 'flex-start' }, onclick: () => { const r = K.elegirEvento(st, e.id, o.i); if (!r.ok) toast(r.motivo); else { toast(r.efectos.length ? r.efectos.join(', ') : 'Hecho'); refrescar(); } } }, h('span', null, o.t), h('span', { class: 'muted', style: { fontWeight: 400 } }, o.d))))))));
  }
  function jugadorPantalla(el, st) {
    const K = M().carrera, c = st.carrera, p = st.jugadores.yo, s = K.stats(st), ro = K.rol(st);
    el.append(h('div', { class: 'tarjeta ficha' }, h('div', { class: 'fila' }, avatarEl(st.personaje, 84, { camiseta: true, numero: dorsal(st) }), h('div', { class: 'ct', style: { marginLeft: '10px' } }, h('b', { class: 'gran' }, p.nombre), h('span', { class: 'muted' }, POSN[p.pos] + ', ' + p.edad + ' años, ' + p.altura + ' cm')), h('span', { class: 'ovr grande ' + clsOvr(p.ovr) }, p.ovr)),
      h('div', { class: 'chips' }, chip('Potencial ' + p.pot), chip('Forma ' + Math.round(p.estado.forma)), chip('Fatiga ' + Math.round(p.estado.fatiga)), chip('Moral ' + Math.round(c.moral)), chip(K.gradoFama(c).nombre), p.estado.lesion ? chip('Lesión, ' + p.estado.lesion.dias + ' d', 'mal') : null)));
    { const l = p.estado.lesion; if (l) el.append(aviso('Lesionado: ' + (l.tipo || 'lesión').toLowerCase() + ', ' + l.dias + (l.dias === 1 ? ' día' : ' días') + ' de baja. ' + (l.plan === 'conservador' ? 'Recuperación conservadora.' : l.plan === 'arriesgado' ? 'Vuelves antes de tiempo: cuidado con las recaídas.' : l.plan === 'normal' ? 'Sigues el plan de los médicos.' : 'Los médicos esperan tu respuesta en el móvil.') + ' En la sede, el fisio te ayuda a acortar la baja.', 'med')); }
    { const V = M().vida && M().vida.vestuario(st); if (V) el.append(seccion('Vestuario', h('div', { class: 'tarjeta' },
      h('div', { class: 'fila' }, h('b', null, 'Química: ' + V.etiqueta.toLowerCase()), h('span', { class: 'muted' }, V.quimica + ' de 100')), barra(V.quimica, 100, V.quimica >= 55 ? 'verde' : V.quimica >= 30 ? 'ambar' : 'rojo'),
      V.capitan ? h('div', { class: 'fila', style: { marginTop: '10px' } }, h('div', { class: 'ct' }, h('b', null, 'Capitán: ' + V.capitan.nombre), h('span', { class: 'muted' }, V.capitan.trato)), h('b', null, V.capitan.rel)) : null,
      V.rival ? h('div', { class: 'fila', style: { marginTop: '8px' } }, h('div', { class: 'ct' }, h('b', null, 'Rival por el puesto: ' + V.rival.nombre), h('span', { class: 'muted' }, V.rival.puesto + (V.rival.ovr ? ' (nivel ' + V.rival.ovr + ' contra tu ' + p.ovr + ')' : ''))), h('b', null, V.rival.rel)) : null,
      h('p', { class: 'muted' }, 'Con buena química el equipo llega en mejor forma y tú más animado. Un capitán que te aprecia te protege tras un mal partido; si no, te señala. Las relaciones se cuidan en Ciudad, vida social, y en el vestuario de la sede.')))); }
    { const gf = K.gradoFama(c), es = K.estatusClub(st);
      el.append(seccion('Reputación', h('div', { class: 'tarjeta' }, h('div', { class: 'fila' }, h('b', null, gf.nombre), h('span', { class: 'muted' }, gf.sig ? 'Siguiente: ' + gf.sig : 'Nivel máximo')), barra(gf.frac * 100, 100, 'verde'),
        es ? [h('div', { class: 'fila', style: { marginTop: '10px' } }, h('b', null, 'En ' + clip(eq(es.clubId).nombre, 20) + ': ' + es.nombre), h('span', { class: 'muted' }, es.temps + (es.temps === 1 ? ' temporada' : ' temporadas'))), barra(es.frac * 100, 100, es.idx >= 5 ? 'verde' : 'ambar'), h('p', { class: 'muted' }, es.sig ? 'Siguiente grado en el club: ' + es.sig + '.' : 'Eres leyenda de este club.')] : null,
        h('p', { class: 'muted' }, 'La reputación cuesta ganarla y depende del nivel de la liga donde juegas. Cambiar de liga o fichar por un rival la afecta.')))); }
    if (c.fase !== 'ncaa') el.append(seccion('Esta temporada', h('div', { class: 'tarjeta' }, h('div', { class: 'chips' }, chip(s.pj + ' partidos'), chip(Math.round(s.min) + ' min'), chip(s.pts.toFixed(1) + ' pts'), chip(s.reb.toFixed(1) + ' reb'), chip(s.ast.toFixed(1) + ' ast')),
      ro ? h('p', null, 'Rol en el equipo: ' + ro + '. ' + (ro === 'Titular' ? 'El entrenador cuenta contigo para empezar.' : ro === 'Rotación' ? 'Entras con regularidad desde el banquillo.' : 'Necesitas subir de nivel para ganarte minutos.')) : null, c.mejor ? h('p', { class: 'muted' }, 'Tu mejor partido: ' + c.mejor.pts + ' pts, ' + c.mejor.reb + ' reb, ' + c.mejor.ast + ' ast.') : null)));
    { // Potencial dinámico: lo que haces mueve tu techo
      const P = K.potEstado(st), aj = P.ajuste + P.resto, ult = P.historial[0], mes = Object.keys(P.mes || {});
      const linea = (t, v) => h('div', { class: 'fila' }, h('span', null, t), h('b', { class: v >= 0 ? 'sube' : 'baja' }, v >= 0 ? 'sube' : 'baja'));
      el.append(seccion('Tu potencial', h('div', { class: 'tarjeta' },
        h('div', { class: 'fila' }, h('b', null, 'Potencial ' + p.pot), h('span', { class: 'muted' }, Math.abs(aj) < 0.05 ? 'sin cambios todavía' : (aj > 0 ? '+' : '−') + Math.abs(aj).toFixed(1).replace('.', ',') + ' por cómo te cuidas')),
        barra(aj + K.POT_MAX, K.POT_MAX * 2, aj >= 0 ? 'verde' : 'ambar'),
        mes.length ? h('div', null, h('p', { class: 'muted', style: { margin: '10px 0 4px' } }, 'Este mes'), mes.sort((x, y) => Math.abs(P.mes[y]) - Math.abs(P.mes[x])).slice(0, 4).map(k => linea(k, P.mes[k]))) : null,
        ult ? h('div', null, h('p', { class: 'muted', style: { margin: '10px 0 4px' } }, 'El mes pasado'), ult.motivos.map(m => linea(m.t, m.v))) : null,
        h('p', { class: 'muted', style: { marginTop: '10px' } }, p.edad > 27 ? 'A tu edad el potencial ya no se mueve.' : 'Lo suben entrenar fuerte y con constancia, jugar minutos de joven, el buen ánimo y tu mentor. Lo bajan las lesiones, el cansancio, las noches largas y quedarte sin jugar. Como mucho ' + K.POT_MAX + ' puntos arriba o abajo, hasta los 27 años.'))));
    }
    el.append(seccion('Entrenamiento personal', h('div', { class: 'tarjeta' }, h('b', null, 'En qué trabajas'),
      h('div', { class: 'seg' }, [['tiro', 'Tiro'], ['defensa', 'Defensa'], ['fisico', 'Físico'], ['pase', 'Pase y bote'], ['mente', 'Mentalidad']].map(o => h('button', { class: 'tab' + (c.entreno.foco === o[0] ? ' on' : ''), onclick: () => { c.entreno.foco = o[0]; refrescar(); } }, o[1]))),
      h('b', null, 'Intensidad'), h('div', { class: 'seg' }, [['suave', 'Suave'], ['normal', 'Normal'], ['intensa', 'Intensa']].map(o => h('button', { class: 'tab' + (c.entreno.intensidad === o[0] ? ' on' : ''), onclick: () => { c.entreno.intensidad = o[0]; refrescar(); } }, o[1]))),
      h('p', { class: 'muted' }, 'Los lunes trabajas lo que elijas. Una intensidad alta te hace progresar más rápido, pero aumenta el riesgo de lesión.' + (c.prevencion ? ' Tu preparador físico reduce ese riesgo.' : '')))));
    el.append(seccion('Atributos', h('div', { class: 'tarjeta' }, h('div', { class: 'attrs' }, Object.keys(ATT).map(k => h('div', { class: 'at' }, h('span', null, ATT[k]), barra(p.att[k], 99, p.att[k] >= 75 ? 'verde' : p.att[k] >= 55 ? 'ambar' : 'rojo'), h('b', null, p.att[k])))))));
    el.append(h('button', { class: 'btn btn-sec', onclick: perfilModal }, 'Cambiar aspecto'));
  }
  function ofertaModal(o) {
    const st = S(), K = M().carrera, c = st.carrera, e = eq(o.clubId), j = st.jugadores.yo;
    modal(h('div', null, h('div', { class: 'fila' }, h('h3', null, e.nombre), escudo(o.clubId, true)), h('p', { class: 'muted' }, o.tipo + ', ' + K.NOMLIGA[o.liga]),
      h('div', { class: 'chips' }, chip(U.eur(o.salario) + ' al año'), chip(o.anos + (o.anos === 1 ? ' temporada' : ' temporadas')), chip('Rol: ' + o.rol)), h('p', null, o.nota), h('p', { class: 'muted' }, 'Pabellón: ' + e.pabellon.nombre + '. Nivel del equipo: ' + Math.round(M().partidos.ovrEquipo(st, o.clubId)) + '.'),
      o.liga === 'NBA' ? h('p', { class: 'aviso ok' }, 'Es tu oportunidad de jugar en la NBA.') : null,
      (() => { const im = o.tipo === 'Renovación' || !j.equipoId ? null : K.impacto(st, o.clubId); return im ? im.textos.map(t => h('p', { class: 'aviso ' + (im.rival ? 'mal' : 'med') }, t)) : null; })()),
      [{ t: 'Aceptar oferta', fn: () => { const r = K.aceptar(st, o.id); if (!r.ok) { toast(r.motivo); return false; } ui.comp = null; aplicaKit(eq(st.clubId).colores); toast(r.cambioClub ? 'Fichaje cerrado' : 'Renovado'); refrescar(true); } }, { t: 'Cerrar', cls: 'btn-sec' }]);
  }
  function agentePantalla(el, st) {
    const K = M().carrera, c = st.carrera, p = st.jugadores.yo, ag = K.AGENTES[c.agente.perfil];
    el.append(seccion('Tu representante', h('div', { class: 'tarjeta' }, h('div', { class: 'cita' }, h('span', { class: 'avatar' }, c.agente.nombre.charAt(0)), h('div', { class: 'ct' }, h('b', null, c.agente.nombre), h('span', { class: 'rol' }, ag.etq), h('p', { class: 'dicho' }, '«' + ag.desc + '»'))))));
    eventosCards(el, st);
    if (c.fase === 'ncaa' && c.etapa === 'cantera') {
      el.append(seccion('Tu futuro', h('div', { class: 'tarjeta' }, h('p', null, p.edad < 18 ? 'Todavía eres juvenil. A los 18 tu representante te presentará las opciones: contrato profesional, universidad en EE. UU. (con camino al draft de la NBA) o un año más en el filial.' : 'Es la hora de decidir. Elige con cabeza: la liga y el rol que aceptes marcarán tus primeros años.'))));
      if (c.ofertas.length) el.append(seccion('Ofertas', h('div', { class: 'lista' }, c.ofertas.map(o => h('button', { class: 'item', onclick: () => ofertaModal(o) }, escudo(o.clubId), h('div', { class: 'ct' }, h('b', null, eq(o.clubId).nombre), h('span', { class: 'muted' }, o.tipo + ', ' + K.NOMLIGA[o.liga] + ', ' + U.eur(o.salario) + ', ' + o.anos + (o.anos === 1 ? ' año' : ' años'))), o.liga === 'NBA' ? chip('NBA', 'ok') : chip(o.rol))))));
      return;
    }
    if (c.fase === 'ncaa') {
      const mk = K.mock(st);
      el.append(seccion('Camino al draft de la NBA', h('div', { class: 'tarjeta' },
        h('p', null, 'Curso ' + c.curso + ' de 3. ' + (c.curso >= 3 ? 'Este año tendrás que entrar en el draft.' : 'Puedes declararte elegible o esperar otro año.')),
        h('div', { class: 'chips' }, chip('Proyección: ' + mk.proyeccion, mk.pick <= 30 ? 'ok' : ''), mk.pick <= 60 ? chip('Puesto ' + mk.pick) : null),
        h('p', { class: 'muted' }, 'Si te eligen, juegas en la NBA con contrato de novato. Si nadie te elige, saldrás al mercado y tu representante buscará una opción en Europa o un contrato de dos vías.'),
        h('button', { class: 'btn' + (c.declarado ? '' : ' btn-sec'), onclick: () => { K.declararse(st); refrescar(); } }, c.declarado ? 'Estás declarado para el draft (tocar para retirarte)' : 'Declararme para el draft'),
        h('h4', null, 'Candidatos de esta clase'), h('div', { class: 'lista' }, mk.top.slice(0, 5).map(x => h('div', { class: 'item' }, h('span', { class: 'pos' }, x.pos), h('span', { class: 'ct' }, h('b', null, x.nombre)), h('span', { class: 'muted' }, 'pot. ' + x.pot), h('span', { class: 'ovr ' + clsOvr(x.ovr) }, x.ovr)))))));
      return;
    }
    if (c.fase === 'retirado') { el.append(aviso('Te has retirado.', 'med')); return; }
    if (K.elegibleDraft(st)) {
      const mk = K.mock(st);
      el.append(seccion('El draft de la NBA', h('div', { class: 'tarjeta' },
        h('p', null, 'Con ' + p.edad + ' años puedes presentarte al draft desde Europa. Si no te eligen, sigues en tu club y podrás intentarlo hasta los 22.'),
        h('div', { class: 'chips' }, chip('Proyección: ' + mk.proyeccion, mk.pick <= 30 ? 'ok' : ''), mk.pick <= 60 ? chip('Puesto ' + mk.pick) : null),
        h('button', { class: 'btn' + (c.declarado ? '' : ' btn-sec'), onclick: () => { K.declararse(st); refrescar(); } }, c.declarado ? 'Te presentas al draft (tocar para retirarte)' : 'Presentarme al draft'))));
    }
    { const SP = M().sponsor, cats = SP.categorias(st), tot = SP.activos(st).reduce((a, s) => a + s.importe, 0);
      el.append(seccion('Patrocinadores personales', h('p', { class: 'muted' }, 'Marcas que te patrocinan a ti. Cada categoría ofrece tres alternativas incompatibles. Ingresos actuales: ' + Math.round(tot).toLocaleString('es-ES') + ' mil € al año.'),
        cats.map(k => h('div', { class: 'tarjeta' }, h('div', { class: 'fila' }, h('b', null, k.nombre), k.activo ? chip('Activo', 'ok') : k.bloqueo && !k.ofertas.length ? chip('Bloqueado') : chip('Libre')),
          k.activo ? h('div', { class: 'item col' }, h('div', { class: 'fila' }, h('b', null, k.activo.marca), h('b', null, k.activo.importe + ' k€/año')), h('span', { class: 'muted' }, SP.PERF[k.activo.perfil].etq + ', hasta ' + k.activo.hasta + '. ' + k.activo.clausula),
            h('button', { class: 'btn btn-sec peq', onclick: () => { const r = SP.rescindir(st, k.cat); toast(r.ok ? 'Contrato roto (' + r.penalizacion + ' mil €)' : r.motivo); refrescar(); } }, 'Rescindir')) : null,
          k.bloqueo ? h('p', { class: 'muted' }, k.bloqueo) : null,
          k.ofertas.map(o => h('button', { class: 'item col', style: { textAlign: 'left' }, onclick: () => modal(h('div', null, h('h3', null, o.marca), h('p', { class: 'muted' }, o.etq + ', ' + k.nombre), h('p', null, o.desc), h('div', { class: 'chips' }, chip(o.importe + ' k€ al año'), chip(o.anos + (o.anos === 1 ? ' temporada' : ' temporadas')), chip('Rescisión ' + Math.round(o.rescision * 100) + ' %')), h('p', { class: 'muted' }, o.clausula)),
            [{ t: 'Firmar', fn: () => { const r = SP.firmar(st, k.cat, o.id); if (!r.ok) { toast(r.motivo); return false; } toast('Patrocinio firmado'); refrescar(); } }, { t: 'Cancelar', cls: 'btn-sec' }]) }, h('div', { class: 'fila' }, h('b', null, o.marca), h('b', null, o.importe + ' k€')), h('span', { class: 'muted' }, o.etq + ', ' + o.anos + (o.anos === 1 ? ' temporada' : ' temporadas')))))))); }
    el.append(seccion('Contrato', h('div', { class: 'tarjeta' }, p.equipoId ? [h('div', { class: 'fila' }, h('b', null, eq(p.equipoId).nombre), escudo(p.equipoId)), h('p', { class: 'muted' }, K.NOMLIGA[K.liga(st)] + ', ' + U.eur(p.contrato.salario) + ' al año, hasta ' + p.contrato.hasta)] : h('p', null, 'No tienes equipo.'))));
    el.append(seccion('Ofertas', c.ofertas.length ? h('div', { class: 'lista' }, c.ofertas.map(o => h('button', { class: 'item', onclick: () => ofertaModal(o) }, escudo(o.clubId), h('div', { class: 'ct' }, h('b', null, eq(o.clubId).nombre), h('span', { class: 'muted' }, o.tipo + ', ' + K.NOMLIGA[o.liga] + ', ' + U.eur(o.salario) + ', ' + o.anos + (o.anos === 1 ? ' año' : ' años'))), o.liga === 'NBA' ? chip('NBA', 'ok') : chip(o.rol)))) : [h('p', { class: 'muted' }, c.fase === 'libre' ? 'Sin ofertas todavía.' : 'Las ofertas llegan al final de la temporada o cuando tu contrato se acerca a su fin.'), c.fase === 'libre' ? h('button', { class: 'btn', onclick: () => { K.generarOfertas(st); refrescar(); } }, 'Pedir ofertas a mi representante') : null]));
  }
  function partidosJuveniles(el, st) {
    const K = M().carrera, r = K.resumenJuvenil(st), c = st.carrera; if (!r) return;
    const R = r.torneo ? (r.torneo.vivo ? (c.etapa === 'cantera' ? 'En la fase final' : 'En el torneo de la NCAA') : r.torneo.campeon ? 'Campeones' : r.torneo.pct >= 70 ? 'Eliminados en el torneo' : 'Sin torneo') : null;
    el.append(seccion('Tus partidos', h('div', { class: 'tarjeta' },
      h('div', { class: 'chips' }, chip(r.g + '-' + r.p, r.g > r.p ? 'ok' : ''), chip(r.pts + ' pts'), chip(r.reb + ' reb'), chip(r.ast + ' ast'), chip(Math.round(r.min) + ' min'), R ? chip(R, r.torneo.campeon ? 'ok' : '') : null),
      h('div', { class: 'lista' }, r.partidos.slice(-6).reverse().map(g => h('div', { class: 'item' }, h('span', { class: 'muted f' }, U.fecha(g.fecha)), h('span', { class: 'ct' }, h('b', null, (g.gana ? 'G ' : 'P ') + g.res[0] + '-' + g.res[1]), ' contra ' + g.rival + (g.ronda ? ' (' + g.ronda + ')' : '')), h('span', { class: 'muted' }, g.min ? g.pts + ' pts, ' + g.reb + ' reb, ' + g.ast + ' ast' : 'no juegas')))))));
  }
  function trayectoriaEntrenador(el, st) {
    const c = st.entrenador, E = M().entrenador;
    el.append(seccion('Tu carrera en el banquillo', h('div', { class: 'tarjeta' }, h('div', { class: 'fila' }, h('b', null, 'Reputación'), h('b', null, Math.round(c.reputacion))), barra(c.reputacion, 100, 'verde'), h('p', { class: 'muted' }, 'Con reputación suficiente te llegan ofertas de ligas mejores: la Euroliga a partir de 55 y la NBA desde 60.'))));
    el.append(seccion('Temporadas', c.historial.length ? h('table', { class: 'tabla' }, h('tr', null, h('th', { class: 'iz' }, 'Temp.'), h('th', { class: 'iz' }, 'Club'), h('th', null, 'Pos.'), h('th', null, 'Obj.')), c.historial.slice().reverse().map(x => h('tr', null, h('td', { class: 'iz' }, x.temporada.slice(2)), h('td', { class: 'iz' }, (x.titulo ? '🏆 ' : '') + clip(x.club, 16) + ' (' + x.liga + ')'), h('td', null, x.puesto + '/' + x.de), h('td', null, x.cumplido ? '✔' : '✖')))) : h('p', { class: 'muted' }, 'Aún no has completado ninguna temporada.')));
    el.append(seccion('Hitos', h('div', { class: 'lista' }, c.hitos.slice(0, 12).map(x => h('div', { class: 'item' }, h('span', { class: 'muted f' }, U.fecha(x.fecha)), h('span', { class: 'ct' }, x.texto))))));
  }
  function trayectoriaPantalla(el, st) {
    if (entr()) return trayectoriaEntrenador(el, st);
    const K = M().carrera, c = st.carrera, p = st.jugadores.yo, lg = K.liga(st);
    const nivelAct = c.fase === 'ncaa' ? 0 : lg ? (lg === 'NBA' ? 3 : lg === 'EUROLIGA' ? 2 : 1) : 0;
    const PELD = [['Cantera o universidad', 'Aprendes el oficio'], ['Liga Endesa o Lega', 'Primeros minutos como profesional'], ['Euroliga', 'La élite europea'], ['NBA', 'El sueño']];
    el.append(seccion(c.fase === 'retirado' ? 'Salón de la fama' : 'El camino', h('div', { class: 'tarjeta' }, h('div', { class: 'escalera' }, PELD.map((d, i) => h('div', { class: 'peldano' + (i === nivelAct ? ' act' : i < nivelAct ? ' sup' : '') }, h('b', null, d[0]), h('span', { class: 'muted' }, d[1]))).reverse()),
      c.fase === 'retirado' ? h('p', null, 'Te retiraste con ' + c.retiro.edad + ' años y un nivel ' + c.retiro.ovr + '.') : h('p', { class: 'muted' }, 'Para jugar en la NBA suele hacer falta un nivel de ' + K.MIN.NBA + ' o más, o un potencial muy alto siendo joven. En la Euroliga, ' + K.MIN.EUROLIGA + '.'))));
    if (c.fase === 'retirado') { // salón de la fama: el resumen de tu carrera
      const lg = K.legado(st), fila = (k, v) => h('div', { class: 'fila' }, h('span', { class: 'muted' }, k), h('b', null, v));
      el.append(seccion('Tu legado', h('div', { class: 'tarjeta' },
        h('h3', null, lg.veredicto), h('div', { class: 'chips' }, chip(lg.grado, lg.salon ? 'ok' : ''), chip('Fama ' + lg.fama), lg.mejorDelJuego ? chip('Llegaste a ser el mejor del juego', 'ok') : null),
        fila('Nivel máximo', lg.pico), fila('Temporadas como profesional', lg.temporadas + (lg.temporadasNBA ? ', ' + lg.temporadasNBA + ' en la NBA' : '')),
        fila('Partidos y puntos', lg.pj + ' partidos, ' + lg.puntosTotales.toLocaleString('es-ES') + ' puntos'), fila('Medias', lg.pts + ' pts, ' + lg.reb + ' reb, ' + lg.ast + ' ast'),
        lg.draft ? fila('Draft de la NBA', 'número ' + lg.draft) : null, lg.mejorPartido ? fila('Mejor partido', lg.mejorPartido.pts + ' puntos') : null,
        fila('Clubes', lg.clubes.length ? lg.clubes.join(', ') : 'ninguno'), fila('Títulos', lg.titulos.length ? lg.titulos.join(', ') : 'ninguno'))));
    }
    const V = M().vida;
    if (V && c.fase === 'retirado') {
      const of = V.ofertasRetiro(st), elegir = (tipo, id, nom) => modal(h('div', null, h('h3', null, tipo === 'comentarista' ? '¿Comentarista?' : (tipo === 'entrenador' ? '¿Entrenar al ' : '¿Dirigir el ') + nom + '?'), h('p', null, tipo === 'comentarista' ? 'Seguirás en esta partida comentando partidos.' : 'La partida pasa al modo ' + (tipo === 'entrenador' ? 'entrenador' : 'gestor') + ' con este club. Tu carrera de jugador queda en el historial.')),
        [{ t: 'Aceptar', fn: () => { const r = V.elegirRetiro(st, tipo, id); toast(r.ok ? r.texto : r.motivo); if (r.cambioModo) setTimeout(() => { ui.pantalla = 'inicio'; GM.ui._.juego(); }, 0); else refrescar(); } }, { t: 'Cancelar', cls: 'btn-sec' }]);
      if (of.length) el.append(seccion('Después de la retirada', of.map(o => h('div', { class: 'tarjeta' }, h('b', null, o.t), h('p', { class: 'muted' }, o.d),
        o.clubes.length ? h('div', { class: 'lista' }, o.clubes.map(e => h('button', { class: 'btn btn-sec', onclick: () => elegir(o.id, e.id, e.nombre) }, (o.id === 'entrenador' ? 'Entrenar al ' : 'Dirigir el ') + e.nombre))) : h('button', { class: 'btn', onclick: () => elegir(o.id) }, 'Hacerte comentarista')))));
      else if (c.post && c.post.tipo === 'comentarista') el.append(seccion('Comentarista', h('div', { class: 'tarjeta' }, h('p', null, 'Comentas partidos en la tele: ' + c.post.sueldo + ' mil € al mes. Fama ' + Math.round(c.fama) + '.'),
        h('div', { class: 'par' }, h('button', { class: 'btn', onclick: () => { const r = V.comentar(st); toast(r.ok ? r.texto : r.motivo); refrescar(); } }, 'Comentar el partido de la semana'),
          st.temporadaTerminada ? h('button', { class: 'btn btn-sec', onclick: nuevaTemporada }, 'Temporada siguiente') : h('button', { class: 'btn btn-sec', onclick: () => { for (let i = 0; i < 7 && !st.temporadaTerminada; i++) M().competiciones.jugarDia(st); refrescar(); } }, 'Avanzar una semana')))));
    }
    if (V && c.fase !== 'ncaa') {
      if (c.fase !== 'retirado') { const Rt = V.retos(st); el.append(seccion('Retos de la temporada', h('div', { class: 'tarjeta' }, Rt.map(r => h('div', { class: 'reto' }, h('div', { class: 'fila' }, h('span', null, (r.hecho ? '✓ ' : '') + r.t), h('b', null, String(r.valor).replace('.', ',') + ' de ' + r.meta)), barra(Math.min(r.valor, r.meta), r.meta, r.hecho ? 'verde' : 'ambar'))), h('p', { class: 'muted' }, 'Al acabar la temporada, cada reto cumplido da fama, ánimo y 2.000 €.')))); }
      const L = V.logros(st).sort((a, b) => (b.fecha ? 1 : 0) - (a.fecha ? 1 : 0)), n = L.filter(x => x.fecha).length;
      el.append(seccion('Logros (' + n + ' de ' + L.length + ')', h('div', { class: 'logros' }, L.map(x => h('div', { class: 'logro' + (x.fecha ? ' on' : '') }, h('b', null, x.t), h('span', { class: 'muted' }, x.fecha ? U.fecha(x.fecha) : x.d), x.prog !== null && !x.fecha ? barra(x.valor, x.meta, 'ambar') : null))),
        h('p', { class: 'muted' }, 'Los logros conseguidos se ven en la vitrina del salón de tu casa.')));
    }
    el.append(seccion('Temporadas', c.historial.length ? h('table', { class: 'tabla' }, h('tr', null, h('th', { class: 'iz' }, 'Temp.'), h('th', { class: 'iz' }, 'Club'), h('th', null, 'PJ'), h('th', null, 'Pts'), h('th', null, 'Reb'), h('th', null, 'Ast')),
      c.historial.slice().reverse().map(x => h('tr', null, h('td', { class: 'iz' }, x.temporada.slice(2)), h('td', { class: 'iz' }, (x.titulo ? '🏆 ' : '') + clip(x.club, 16) + ' (' + x.liga + ')'), h('td', null, x.pj), h('td', null, x.pts), h('td', null, x.reb), h('td', null, x.ast)))) : h('p', { class: 'muted' }, 'Aún no has completado ninguna temporada.')));
    el.append(seccion('Hitos', h('div', { class: 'lista' }, c.hitos.slice(0, 12).map(x => h('div', { class: 'item' }, h('span', { class: 'muted f' }, U.fecha(x.fecha)), h('span', { class: 'ct' }, x.texto))))));
    if (c.fase !== 'retirado') el.append(h('button', { class: 'btn btn-sec peligro', onclick: () => modal(h('div', null, h('h3', null, '¿Retirarte?'), h('p', null, 'Tu carrera terminará con ' + p.edad + ' años. No se puede deshacer.')), [{ t: 'Retirarme', cls: 'peligro', fn: () => { M().carrera.retirarse(st); refrescar(true); } }, { t: 'Seguir jugando', cls: 'btn-sec' }]) }, 'Retirarme'));
  }
  Object.assign(GM.ui._, { inicioCarrera, eventosCards, jugadorPantalla, ofertaModal, agentePantalla, trayectoriaEntrenador, trayectoriaPantalla });
  registerScreen('jugador', { titulo: 'Jugador', icono: 'users', render: jugadorPantalla });
  registerScreen('agente', { titulo: 'Agente', icono: 'dir', render: agentePantalla });
  registerScreen('trayectoria', { titulo: 'Carrera', icono: 'trofeo', render: trayectoriaPantalla });
})();
