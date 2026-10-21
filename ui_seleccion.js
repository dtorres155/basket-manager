/* Pantalla del punto 66: pestaña «Selecciones» en Calendario. La ventana de selecciones (Mundial, Juegos Olímpicos, Eurobasket): convocatoria con la decisión de dejar ir o no a cada jugador, grupos,
   partidos del día y las eliminatorias, estadísticas de tus convocados y el salón de la fama del club con las medallas. Usa GM.seleccion y GM.mods.pretemporada. */
(function () {
  const { addTab, U, h, refrescar, seccion, toast, barra, clip, aviso } = GM.ui._;
  const S = () => GM.seleccion,
    PT = () => GM.mods.pretemporada,
    nombre = (st, id) => (st.jugadores[id] ? st.jugadores[id].nombre : id),
    pais = c => (PT() ? PT().nombrePais(c) : c);
  const fila = (k, v) => h('div', { class: 'fila' }, h('span', { class: 'muted' }, k), h('b', null, v)),
    MED = { oro: '🥇 Oro', plata: '🥈 Plata', bronce: '🥉 Bronce' };
  const partido = m =>
    h(
      'div',
      { class: 'fila' },
      h('span', { class: 'muted f' }, U.fecha(m.fecha) + ' ' + m.fase),
      h('span', null, pais(m.a) + (m.resultado ? ' ' + m.resultado.a : '') + ' - ' + (m.resultado ? m.resultado.b + ' ' : '') + pais(m.b))
    );
  function tab(el, st) {
    const R = S().resumen(st),
      P = PT().estado(st);
    if (!R) {
      const prox = P.hist && P.hist[0];
      el.append(aviso('No hay ventana de selecciones ahora mismo. Se anuncia al empezar el verano de un Mundial (2027), unos Juegos Olímpicos (2028) o un Eurobasket (2029).', ''));
    } else {
      const V = R.V,
        estado = V.resuelta ? 'terminada' : V.estado;
      el.append(
        seccion(
          V.nombre,
          h(
            'div',
            { class: 'tarjeta' },
            h(
              'p',
              null,
              'Del ' +
                U.fechaLarga(V.desde) +
                ' al ' +
                U.fechaLarga(V.hasta) +
                '. ' +
                (estado === 'convocatoria'
                  ? 'Las listas ya están anunciadas: decide a quién dejas ir antes de que empiece.'
                  : estado === 'terminada'
                    ? 'El torneo ha terminado.'
                    : 'El torneo está en juego.')
            ),
            P.federacion !== undefined ? fila('Relación con la federación', Math.round(P.federacion) + ' / 100') : null
          )
        )
      );
      if (R.convocados.length)
        el.append(
          seccion(
            'Tus convocados (' + R.convocados.length + ')',
            h(
              'div',
              { class: 'lista' },
              R.convocados.map(c =>
                h(
                  'div',
                  { class: 'item' },
                  h(
                    'div',
                    { class: 'ct' },
                    h('b', null, c.nombre + ', ' + c.paisNombre),
                    h(
                      'span',
                      { class: 'muted' },
                      'Media ' +
                        c.ovr +
                        ', ' +
                        (c.rank < 5 ? 'titular' : c.rank < 9 ? 'rotación' : 'banquillo') +
                        ' en su selección' +
                        (c.baja ? ', baja por lesión' : c.decision === 'acepta' ? ', ha aceptado' : c.decision === 'rechaza' ? ', no irá' : '')
                    )
                  ),
                  estado === 'convocatoria' && !c.baja
                    ? h(
                        'div',
                        { class: 'par' },
                        h(
                          'button',
                          {
                            class: 'btn peq',
                            disabled: c.decision === 'acepta',
                            onclick: () => {
                              const r = S().responder(st, c.id, true);
                              toast(r.ok ? r.texto : r.motivo);
                              refrescar();
                            }
                          },
                          'Dejarle ir'
                        ),
                        h(
                          'button',
                          {
                            class: 'btn peq btn-sec',
                            disabled: c.decision === 'rechaza',
                            onclick: () => {
                              const r = S().responder(st, c.id, false);
                              toast(r.ok ? r.texto : r.motivo);
                              refrescar();
                            }
                          },
                          'Negarse'
                        )
                      )
                    : null
                )
              )
            )
          )
        );
      else el.append(h('p', { class: 'muted' }, 'Ninguno de tus jugadores está convocado.'));
      if (R.hoy.length || R.prox) el.append(seccion(R.hoy.length ? 'Hoy' : 'Próximo partido', h('div', { class: 'tarjeta' }, (R.hoy.length ? R.hoy : [R.prox]).map(partido))));
      el.append(
        seccion(
          'Grupos',
          h(
            'div',
            { class: 'lista' },
            R.grupos.map((T, i) =>
              h(
                'div',
                { class: 'tarjeta' },
                h('b', null, 'Grupo ' + 'ABCDEF'[i]),
                T.map((t, k) =>
                  h(
                    'div',
                    { class: 'fila' },
                    h('span', null, k + 1 + '. ' + pais(t.pais)),
                    h('span', { class: 'muted' }, t.v + ' V, ' + t.d + ' D, ' + (t.pf - t.pc >= 0 ? '+' : '') + (t.pf - t.pc))
                  )
                )
              )
            )
          )
        )
      );
      const ko = V.partidos.filter(m => !/^Grupo/.test(m.fase));
      if (ko.length) el.append(seccion('Eliminatorias', h('div', { class: 'tarjeta' }, ko.map(partido))));
      if (R.stats.length)
        el.append(
          seccion(
            'Tus jugadores en el torneo',
            h(
              'div',
              { class: 'tarjeta' },
              R.stats.map(s =>
                h(
                  'div',
                  { class: 'fila' },
                  h('span', null, clip(s.nombre, 24) + ' (' + pais(s.pais) + ')'),
                  h(
                    'span',
                    { class: 'muted' },
                    s.pj +
                      ' pj, ' +
                      Math.round(s.min / Math.max(1, s.pj)) +
                      ' min, ' +
                      s.pts +
                      ' pts, ' +
                      s.reb +
                      ' reb, ' +
                      s.ast +
                      ' ast' +
                      (s.lesion ? ', lesión ' + s.lesion + ' días' : '')
                  )
                )
              )
            )
          )
        );
      if (V.resultado)
        el.append(
          seccion(
            'Resultado',
            h(
              'div',
              { class: 'tarjeta' },
              h('div', { class: 'aviso ok' }, '🏆 Campeón: ' + pais(V.resultado.campeon)),
              fila('Subcampeón', pais(V.resultado.subcampeon)),
              fila('Tercero', pais(V.resultado.tercero)),
              fila('Mejor jugador', nombre(st, V.resultado.mvp))
            )
          )
        );
    }
    const M = (st.salon && st.salon.medallas) || [];
    el.append(
      seccion(
        'Salón de la fama del club: medallas (' + M.length + ')',
        M.length
          ? h(
              'div',
              { class: 'lista' },
              M.slice(0, 20).map(m =>
                h(
                  'div',
                  { class: 'item' },
                  h('span', { class: 'muted f' }, m.anio),
                  h(
                    'div',
                    { class: 'ct' },
                    h('b', null, MED[m.medalla] + ': ' + m.jugador),
                    h('span', { class: 'muted' }, m.torneo + ' con ' + pais(m.pais) + ', ' + m.pj + ' partidos, ' + m.pts + ' puntos')
                  )
                )
              )
            )
          : h('p', { class: 'muted' }, 'Aún ninguno de tus jugadores ha subido al podio con su selección.')
      )
    );
  }
  addTab('calendario', 'selecciones', 'Selecciones', tab, st => !!GM.seleccion && !!GM.mods.pretemporada);
})();
