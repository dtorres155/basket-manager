/* Pantalla de cesiones y ascensos (pestaña «Cesiones» en Plantilla y «Ascensos» en Club): ceder jóvenes de la plantilla o de la cantera a clubes de LEB Oro y LEB Plata, ver los cedidos y la historia de ascensos y descensos de España. Usa GM.ascensos. */
(function () {
  const { addTab, h, seccion, toast, refrescar, clsOvr, escudo } = GM.ui._;
  const A = () => GM.mods.ascensos,
    hayInferiores = st => !!A() && !!st.ligas && A().destinos(st).length > 0,
    activa = st => hayInferiores(st) && (st.modo === 'gestor' || st.modo === 'presidente');
  function cesionesTab(el, st) {
    const D = A().datos(st),
      sel = h(
        'select',
        null,
        A()
          .destinos(st)
          .slice(0, 40)
          .map(d => h('option', { value: d.id }, d.e.nombre + ' (' + st.ligas[d.liga].nombre + ')'))
      ),
      msg = h('div', { class: 'aviso', style: { display: 'none' } });
    el.append(
      seccion(
        'Cedidos ahora',
        D.cesiones.length
          ? h(
              'div',
              { class: 'lista' },
              D.cesiones.map(c => {
                const p = st.jugadores[c.j];
                return h(
                  'div',
                  { class: 'item' },
                  h(
                    'div',
                    { class: 'ct' },
                    h('b', null, p ? p.nombre : c.j),
                    h('span', { class: 'muted' }, ' en ' + ((st.equipos[c.a] || {}).nombre || c.a) + ', vuelve al acabar la temporada')
                  )
                );
              })
            )
          : h(
              'p',
              { class: 'muted' },
              'No tienes a nadie cedido. Un joven que no juega gana minutos en LEB Oro o LEB Plata y vuelve con más nivel: hasta +3 de media por temporada.'
            )
      )
    );
    el.append(
      seccion(
        'Ceder a un joven',
        h('div', { class: 'par' }, h('label', { class: 'muted' }, 'Club de destino'), sel),
        msg,
        h(
          'div',
          { class: 'lista' },
          A()
            .candidatos(st, st.clubId)
            .slice(0, 25)
            .map(({ p, desdeCantera }) =>
              h(
                'div',
                { class: 'item' },
                h('div', { class: 'ct' }, h('b', null, p.nombre), h('span', { class: 'muted' }, ' ' + p.pos + ', ' + p.edad + ' años' + (desdeCantera ? ', cantera' : ''))),
                h('span', { class: 'ovr ' + clsOvr(p.ovr) }, p.ovr),
                h('span', { class: 'muted' }, ' pot ' + p.pot),
                h(
                  'button',
                  {
                    class: 'btn btn-sec',
                    onclick: () => {
                      const r = A().ceder(st, p.id, sel.value);
                      if (r.ok) {
                        toast(p.nombre + ' cedido');
                        refrescar();
                      } else {
                        msg.style.display = '';
                        msg.textContent = r.motivo;
                      }
                    }
                  },
                  'Ceder'
                )
              )
            )
        )
      )
    );
  }
  function ascensosTab(el, st) {
    const D = A().datos(st),
      nom = i => (st.equipos[i] || {}).nombre || i;
    el.append(
      seccion(
        'Ascensos y descensos',
        D.hist.length
          ? h(
              'div',
              { class: 'lista' },
              D.hist
                .slice()
                .reverse()
                .map(x =>
                  h(
                    'div',
                    { class: 'item' },
                    h(
                      'div',
                      { class: 'ct' },
                      h('b', null, x.temporada),
                      h('span', { class: 'muted' }, ' suben: ' + x.sube.map(nom).join(', ') + '; bajan: ' + x.baja.map(nom).join(', '))
                    )
                  )
                )
            )
          : h(
              'p',
              { class: 'muted' },
              'Todavía no ha habido ascensos. Al acabar la temporada bajan los dos últimos de la ACB, suben los dos primeros de LEB Oro y se mueven tres equipos entre LEB Oro y LEB Plata.'
            )
      )
    );
    const pais = (st.equipos[st.clubId] || {}).pais;
    []
      .concat(...A().ESCALA.map(e => [e[0], e[1]]))
      .filter((l, i, a) => a.indexOf(l) === i && st.ligas[l] && st.ligas[l].pais === pais && A().ESCALA.some(e => e.indexOf(l) >= 0))
      .forEach(l => {
        const L = st.ligas[l];
        if (!L) return;
        const tab = GM.mods.competiciones.clasificacion(st, l);
        el.append(
          seccion(
            L.nombre,
            h(
              'div',
              { class: 'lista' },
              tab.map((r, i) =>
                h(
                  'div',
                  { class: 'item' },
                  escudo(r.equipoId),
                  h('div', { class: 'ct' }, h('b', null, i + 1 + '. ' + nom(r.equipoId))),
                  h('span', { class: 'muted' }, r.g + ' V, ' + r.p + ' D')
                )
              )
            )
          )
        );
      });
  }
  addTab('plantilla', 'cesiones', 'Cesiones', cesionesTab, activa);
  addTab('club', 'ascensos', 'Ascensos', ascensosTab, hayInferiores);
})();
