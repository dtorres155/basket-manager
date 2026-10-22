/* AVISOS DE INICIO (GM.avisosInicio) — dos tarjetas arriba de Inicio:
   1) «Qué ha pasado»: lo nuevo desde la última vez que lo marcaste como visto (noticias, tus partidos, mensajes del móvil sin leer, contratos por vencer). Se descarta con «Entendido» (st.vistaInicio = fecha). Solo sale si hay algo.
   2) «Contratos que vencen» (gestor y presidente): si tienes jugadores con el contrato acabando esta temporada, una tarjeta roja a partir de marzo (amarilla antes) con los nombres, su media y un botón a Finanzas, Contratos. Además, el día 1 de enero, marzo, mayo y junio llega una noticia.
   Así quien juega sin tocar nada no se encuentra con la plantilla vacía en julio. Expone: contratos(st), nuevo(st), selfTest. Prueba: t_misiones.js (lógica) y tools/tanda37_ui.js (pantalla). */
(function () {
  const modoGestion = st => st.modo === 'gestor' || st.modo === 'presidente';
  function contratos(st) {
    if (!modoGestion(st) || !st.equipos[st.clubId] || !GM.mods.mercado || !GM.mods.mercado.expiran) return [];
    return GM.mods.mercado.expiran(st, st.clubId);
  }
  // lo nuevo desde st.vistaInicio (o los últimos 3 días si nunca se marcó)
  function nuevo(st) {
    if (!st.vistaInicio) st.vistaInicio = st.fecha;
    const desde = st.vistaInicio,
      C = GM.mods.competiciones,
      mio = st.clubId;
    const noticias = (st.noticias || []).filter(n => n.fecha > desde).slice(0, 8);
    const partidos = (st.calendario || []).filter(g => g.resultado && g.fecha > desde && (g.local === mio || g.visitante === mio)).slice(-4);
    const mensajes = GM.mods.movil && GM.mods.movil.noLeidos ? GM.mods.movil.noLeidos(st) || 0 : 0;
    return { desde, noticias, partidos, mensajes, hay: noticias.length + partidos.length + (mensajes > 0 ? 1 : 0) > 0, C };
  }
  function bloqueNuevo(el, st) {
    const { h, seccion } = GM.ui._,
      n = nuevo(st);
    if (!n.hay || st.vistaInicio === st.fecha) return;
    const filaPartido = g => {
      const local = g.local === st.clubId,
        a = g.resultado.local,
        b = g.resultado.visitante,
        mios = local ? a : b,
        suyos = local ? b : a,
        rival = st.equipos[local ? g.visitante : g.local];
      return h('li', null, (mios > suyos ? 'Victoria' : 'Derrota') + ' ' + mios + '-' + suyos + (local ? ' contra ' : ' en ') + (rival ? rival.nombre : ''));
    };
    el.append(
      seccion(
        'Qué ha pasado',
        h(
          'div',
          { class: 'tarjeta' },
          h(
            'ul',
            { class: 'cronica' },
            n.partidos.map(filaPartido),
            n.mensajes > 0 ? h('li', null, n.mensajes + (n.mensajes === 1 ? ' mensaje sin leer en el móvil' : ' mensajes sin leer en el móvil')) : null,
            n.noticias.map(x => h('li', null, x.texto))
          ),
          h(
            'button',
            {
              class: 'btn btn-sec peq',
              onclick: () => {
                st.vistaInicio = st.fecha;
                GM.ui.navegar('inicio');
              }
            },
            'Entendido'
          )
        )
      )
    );
  }
  function bloqueContratos(el, st) {
    const lista = contratos(st);
    if (!lista.length) return;
    const { h, seccion } = GM.ui._,
      mes = +String(st.fecha).slice(5, 7),
      urgente = mes >= 3 && mes <= 6,
      nombres = lista
        .slice(0, 5)
        .map(p => p.nombre + ' (' + p.ovr + ')')
        .join(', ');
    el.append(
      seccion(
        'Contratos que vencen',
        h(
          'div',
          { class: 'aviso ' + (urgente ? 'mal' : 'med') },
          h('b', null, lista.length + (lista.length === 1 ? ' jugador acaba' : ' jugadores acaban') + ' contrato esta temporada. '),
          nombres + (lista.length > 5 ? ' y ' + (lista.length - 5) + ' más' : '') + '. Si no los renuevas antes del verano, se van y la plantilla se queda corta.',
          h(
            'div',
            { class: 'par', style: { marginTop: '8px' } },
            h(
              'button',
              {
                class: 'btn',
                onclick: () => {
                  GM.ui._.ui.tab.finanzas = 'contratos';
                  GM.ui.navegar('finanzas');
                }
              },
              'Ver contratos'
            )
          )
        )
      )
    );
  }
  // una noticia en los meses clave
  GM.bus.on('dia:avanzado', () => {
    const st = GM.state;
    if (!st || !modoGestion(st)) return;
    const f = String(st.fecha);
    if (!/-(01|03|05|06)-01$/.test(f)) return;
    const l = contratos(st);
    if (l.length)
      GM.noticia(
        st,
        l.length +
          (l.length === 1 ? ' jugador acaba' : ' jugadores acaban') +
          ' contrato esta temporada (' +
          l[0].nombre +
          (l.length > 1 ? ' y otros' : '') +
          '). Renueva antes del verano.'
      );
  });
  if (GM.ui && GM.ui._ && GM.ui._.inicioBloques) {
    GM.ui._.inicioBloques.unshift(bloqueContratos);
    GM.ui._.inicioBloques.unshift(bloqueNuevo);
  }
  function selfTest() {
    const st = { modo: 'carrera', fecha: '2026-10-01', noticias: [{ fecha: '2026-10-02', texto: 'x' }], calendario: [], equipos: {}, clubId: 'a' };
    return Array.isArray(contratos(st)) && contratos(st).length === 0 && nuevo(st).hay === true && nuevo(Object.assign(st, { vistaInicio: '2026-10-05' })).noticias.length === 0;
  }
  GM.avisosInicio = { contratos, nuevo, selfTest };
  GM.register && GM.register('avisosInicio', GM.avisosInicio);
})();
