/* INTERFAZ: Pantallas de la carrera de jugador: jugador, agente y trayectoria.
   Separado de ui.js. Usa las utilidades del núcleo de la interfaz a través de GM.ui._ (ver ui.js). */
(function () {
  const { registerScreen, ATT, M, POSN, S, U, aplicaKit, avatarEl, aviso, barra, catEdad, chip, clip, clsOvr, dorsal, entr, eq, escudo, h, modal, navegar, nuevaTemporada, perfilModal, refrescar, seccion, toast, ui } = GM.ui._;
  function inicioCarrera(el, st) {
    const K = M().carrera, c = st.carrera, p = st.jugadores.yo, s = K.stats(st), ro = K.rol(st);
    if (c.fase === 'retirado') { trayectoriaPantalla(el, st); return true; }
    el.append(h('button', { class: 'perfil-linea', onclick: () => navegar('jugador') }, avatarEl(st.personaje, 48, { camiseta: true, numero: dorsal(st) }), h('div', { class: 'ct' }, h('b', null, p.nombre), h('span', { class: 'muted' }, c.fase === 'ncaa' ? (c.etapa === 'cantera' ? 'Cantera de ' + eq(c.cantera.clubId).nombre + ', ' + catEdad(p.edad) : 'Universidad de EE. UU., curso ' + c.curso) : K.retrato(st).club + ', ' + (ro || 'sin equipo'))), h('span', { class: 'ovr grande ' + clsOvr(p.ovr) }, p.ovr)));
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
      if (st.noticias.length) el.append(seccion('Noticias', h('div', { class: 'lista noticias' }, st.noticias.slice(0, 5).map(n => h('div', { class: 'item' }, h('span', { class: 'muted f' }, U.fecha(n.fecha)), h('span', null, n.texto))))));
      return true;
    }
    if (c.fase === 'ncaa') {
      const mk = K.mock(st);
      el.append(seccion('Tu temporada universitaria', h('div', { class: 'tarjeta' },
        h('p', null, st.temporadaTerminada ? 'El curso ha terminado.' : 'El curso va avanzando. Entrena cada semana y decide si te declaras para el draft.'),
        h('p', { class: 'muted' }, 'Proyección del draft: ' + mk.proyeccion + (mk.pick <= 60 ? ' (puesto ' + mk.pick + ')' : '') + '.'),
        st.temporadaTerminada ? h('button', { class: 'btn grande', onclick: nuevaTemporada }, 'Empezar curso siguiente') : h('div', { class: 'par' }, h('button', { class: 'btn', onclick: () => { for (let i = 0; i < 7 && !st.temporadaTerminada; i++) M().competiciones.jugarDia(st); refrescar(); } }, 'Avanzar una semana'), h('button', { class: 'btn btn-sec', onclick: () => { let n = 0; while (!st.temporadaTerminada && n < 400) { M().competiciones.jugarDia(st); n++; } refrescar(true); } }, 'Hasta el final')))));
      if (st.noticias.length) el.append(seccion('Noticias', h('div', { class: 'lista noticias' }, st.noticias.slice(0, 5).map(n => h('div', { class: 'item' }, h('span', { class: 'muted f' }, U.fecha(n.fecha)), h('span', null, n.texto))))));
      return true;
    }
    el.append(seccion('Esta temporada', h('div', { class: 'tarjeta' }, h('div', { class: 'chips' }, chip(s.pj + ' partidos'), chip(s.pts.toFixed(1) + ' pts'), chip(s.reb.toFixed(1) + ' reb'), chip(s.ast.toFixed(1) + ' ast'), chip(Math.round(s.min) + ' min'), ro ? chip(ro) : null))));
    return false;
  }
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
      c.fase === 'retirado' ? h('p', null, 'Te retiraste con ' + c.retiro.edad + ' años y un nivel ' + c.retiro.ovr + '. Fama final: ' + Math.round(c.fama) + '. Títulos: ' + c.historial.filter(x => x.titulo).length + '.') : h('p', { class: 'muted' }, 'Para jugar en la NBA suele hacer falta un nivel de ' + K.MIN.NBA + ' o más, o un potencial muy alto siendo joven. En la Euroliga, ' + K.MIN.EUROLIGA + '.'))));
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
