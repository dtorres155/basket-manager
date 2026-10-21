/* Pantalla del móvil con apps (punto 69): el botón Móvil abre una pantalla de inicio con las apps disponibles en el modo (Mensajes, Banco, Mapa, Transporte, Inmobiliaria, Prensa, Redes y Calendario).
   Mensajes sigue siendo el chat de carrera (ui_carrera.js, GM.ui.movilMensajes). El resto salen de GM.movilApps. Usa las utilidades de GM.ui._. */
(function () {
  const { U, h, modal, refrescar, toast, clip, cerrarModales } = GM.ui._;
  const MA = () => GM.movilApps,
    S = () => GM.state,
    eur = e => U.eur(e),
    fila = (k, v) => h('div', { class: 'fila' }, h('span', { class: 'muted' }, k), h('b', null, v));
  const ICONO = { mensajes: '✉', banco: '€', mapa: '⌖', transporte: '⛟', inmobiliaria: '⌂', prensa: '▤', redes: '☺', calendario: '▦' };
  function abrir(app) {
    const st = S(),
      cuerpo = h('div', { class: 'movil movil-apps' });
    let cerrar = null;
    const cab = (t, atras) =>
      h(
        'div',
        { class: 'movil-cab' },
        atras ? h('button', { class: 'btn btn-sec peq', onclick: inicio }, 'Inicio') : null,
        h('b', null, t),
        h('span', { class: 'muted' }, U.fecha(st.fecha))
      );
    function inicio() {
      cuerpo.innerHTML = '';
      cuerpo.append(cab('Móvil', false));
      cuerpo.append(
        h(
          'div',
          { class: 'movil-rejilla' },
          MA()
            .disponibles(st)
            .map(a => {
              const n = MA().insignia(st, a.id);
              return h(
                'button',
                { class: 'movil-app', onclick: () => ir(a.id) },
                h('span', { class: 'movil-ico' }, ICONO[a.id] || '•'),
                h('span', null, a.n),
                n ? h('span', { class: 'movil-num' }, n) : null
              );
            })
        )
      );
    }
    function banco() {
      const b = MA().banco(st);
      cuerpo.innerHTML = '';
      cuerpo.append(
        cab('Banco', true),
        h(
          'div',
          { class: 'tarjeta' },
          h('h3', null, eur(b.saldo)),
          h('span', { class: 'muted' }, b.tipo === 'club' ? 'Caja del club' : 'Tu cuenta'),
          b.neto !== null ? fila('Patrimonio neto', eur(b.neto)) : null,
          fila('Ingresos del mes', eur(b.ingresos)),
          fila('Gastos del mes', eur(b.gastos))
        )
      );
      if (b.deudas.length)
        cuerpo.append(
          h('h4', null, 'Deudas'),
          h(
            'div',
            { class: 'lista' },
            b.deudas.map(d =>
              h(
                'div',
                { class: 'item' },
                h('div', { class: 'ct' }, h('b', null, d.nombre), h('span', { class: 'muted' }, 'Quedan ' + eur(d.restante) + ', cuota ' + eur(d.cuota))),
                h(
                  'button',
                  {
                    class: 'btn peq',
                    onclick: () => {
                      const r = MA().amortizar(st, d.id, 5);
                      toast(r.ok ? 'Amortizas 5.000 €' : r.motivo);
                      banco();
                    }
                  },
                  'Pagar 5.000 €'
                )
              )
            )
          )
        );
      if (b.puedeEnviar)
        cuerpo.append(
          h(
            'div',
            { class: 'par' },
            [1, 5, 10].map(k =>
              h(
                'button',
                {
                  class: 'btn btn-sec peq',
                  onclick: () => {
                    const r = MA().enviarDinero(st, k);
                    toast(r.ok ? r.texto : r.motivo);
                    banco();
                  }
                },
                'Enviar ' + eur(k * 1000) + ' a la familia'
              )
            )
          )
        );
      cuerpo.append(
        h('h4', null, 'Últimos movimientos'),
        b.movimientos.length
          ? h(
              'div',
              { class: 'lista' },
              b.movimientos.map(m =>
                h(
                  'div',
                  { class: 'item' },
                  h('span', { class: 'muted f' }, m.f ? U.fecha(m.f) : ''),
                  h('div', { class: 'ct' }, h('span', null, clip(m.t || '', 40))),
                  h('b', { style: { color: m.v < 0 ? '#c0392b' : '#1fa05a' } }, eur(m.v))
                )
              )
            )
          : h('p', { class: 'muted' }, 'Todavía no hay movimientos.')
      );
    }
    function inmo() {
      const d = MA().inmobiliaria(st);
      cuerpo.innerHTML = '';
      cuerpo.append(cab('Inmobiliaria', true), h('p', { class: 'muted' }, 'Ofertas de este mes. Los precios cambian cada mes y según el barrio.'));
      cuerpo.append(
        h(
          'div',
          { class: 'lista' },
          d.ofertas.map(o =>
            h(
              'div',
              { class: 'item col' },
              h('div', { class: 'fila' }, h('b', null, o.nombre), h('span', null, eur(o.precio * 1000))),
              h('span', { class: 'muted' }, o.barrio + (o.renta ? ', renta ' + eur(o.renta * 1000) + ' al mes' : '')),
              h(
                'div',
                { class: 'par' },
                h(
                  'button',
                  {
                    class: 'btn peq',
                    onclick: () => {
                      const r = MA().comprarBien(st, o.id, 'contado');
                      toast(r.ok ? 'Compra hecha' : r.motivo);
                      inmo();
                    }
                  },
                  'Comprar al contado'
                ),
                o.plazos
                  ? h(
                      'button',
                      {
                        class: 'btn peq btn-sec',
                        onclick: () => {
                          const r = MA().comprarBien(st, o.id, 'hipoteca');
                          toast(r.ok ? 'Hipoteca firmada' : r.motivo);
                          inmo();
                        }
                      },
                      'A plazos'
                    )
                  : null
              )
            )
          )
        )
      );
      if (d.bienes.length)
        cuerpo.append(
          h('h4', null, 'Tus bienes'),
          h(
            'div',
            { class: 'lista' },
            d.bienes.map(b =>
              h(
                'div',
                { class: 'item' },
                h('div', { class: 'ct' }, h('b', null, b.nombre), h('span', { class: 'muted' }, 'Vale ' + eur(b.valor * 1000))),
                b.alquilable
                  ? h(
                      'button',
                      {
                        class: 'btn peq btn-sec',
                        onclick: () => {
                          const r = GM.patrimonio.alquilar(st, b.id, !b.alquilado);
                          toast(r.ok ? (b.alquilado ? 'Dejas de alquilarlo' : 'Lo pones en alquiler') : r.motivo);
                          inmo();
                        }
                      },
                      b.alquilado ? 'Retirar del alquiler' : 'Alquilar'
                    )
                  : null
              )
            )
          )
        );
    }
    function prensa() {
      const p = MA().prensa(st);
      cuerpo.innerHTML = '';
      cuerpo.append(cab('Prensa', true));
      if (p.rumores.length)
        cuerpo.append(
          h('h4', null, 'Rumores del mercado'),
          h(
            'div',
            { class: 'lista' },
            p.rumores.map(r =>
              h(
                'div',
                { class: 'item col' },
                h('span', null, r.texto),
                h('span', { class: 'muted' }, r.fuente + ', ' + U.fecha(r.fecha) + (r.resuelto ? (r.resuelto === 'confirmado' ? ', confirmado' : ', desmentido') : ''))
              )
            )
          )
        );
      if (p.promesas.length)
        cuerpo.append(
          h('h4', null, 'Tus promesas abiertas' + (p.credibilidad !== null ? ' (credibilidad ' + p.credibilidad + ')' : '')),
          h(
            'div',
            { class: 'lista' },
            p.promesas.map(m => h('div', { class: 'item col' }, h('span', null, m.frase), h('span', { class: 'muted' }, 'Dicho el ' + U.fecha(m.desde))))
          )
        );
      if (p.reacciones.length)
        cuerpo.append(
          h('h4', null, 'Reacciones de otros vestuarios'),
          h(
            'div',
            { class: 'lista' },
            p.reacciones.map(r => h('div', { class: 'item col' }, h('span', null, r.texto)))
          )
        );
      cuerpo.append(
        h('h4', null, 'Titulares'),
        h(
          'div',
          { class: 'lista' },
          p.titulares.map(t => h('div', { class: 'item' }, h('span', { class: 'muted f' }, U.fecha(t.f)), h('div', { class: 'ct' }, h('span', null, t.t))))
        )
      );
    }
    function redes() {
      const r = MA().redes(st);
      cuerpo.innerHTML = '';
      cuerpo.append(
        cab('Redes', true),
        h(
          'div',
          { class: 'tarjeta' },
          h('h3', null, r.seguidores.toLocaleString('es-ES') + ' seguidores'),
          h('span', { class: 'muted' }, r.tipo === 'club' ? 'Cuenta oficial del club' : 'Tu cuenta')
        )
      );
      cuerpo.append(
        h('h4', null, 'Publicar'),
        h(
          'div',
          { class: 'lista' },
          r.tipos.map(t =>
            h(
              'div',
              { class: 'item' },
              h('div', { class: 'ct' }, h('b', null, t.t), h('span', { class: 'muted' }, t.d)),
              h(
                'button',
                {
                  class: 'btn peq',
                  disabled: !t.disponible,
                  onclick: () => {
                    const x = MA().publicar(st, t.id);
                    toast(x.ok ? x.texto || 'Publicado' : x.motivo);
                    redes();
                  }
                },
                'Publicar'
              )
            )
          )
        )
      );
      if (r.posts.length)
        cuerpo.append(
          h('h4', null, 'Recientes'),
          h(
            'div',
            { class: 'lista' },
            r.posts.map(p =>
              h('div', { class: 'item col' }, h('span', null, p.texto || p.t), h('span', { class: 'muted' }, (p.f ? U.fecha(p.f) + ', ' : '') + (p.likes || 0) + ' me gusta'))
            )
          )
        );
    }
    function calendario() {
      const L = MA().calendario(st);
      cuerpo.innerHTML = '';
      cuerpo.append(
        cab('Calendario', true),
        L.length
          ? h(
              'div',
              { class: 'lista' },
              L.map(e =>
                h(
                  'div',
                  { class: 'item' },
                  h('span', { class: 'muted f' }, U.fecha(e.f)),
                  h(
                    'div',
                    { class: 'ct' },
                    h('b', null, e.texto),
                    h(
                      'span',
                      { class: 'muted' },
                      { partido: 'Partido', mercado: 'Mercado', evento: 'Evento', encargo: 'Encargo', obra: 'Obra', negocio: 'Negocio', contrato: 'Contrato' }[e.tipo] || e.tipo
                    )
                  )
                )
              )
            )
          : h('p', { class: 'muted' }, 'No hay nada en el horizonte.')
      );
    }
    function ir(id) {
      if (id === 'mensajes') {
        if (cerrar) cerrar();
        GM.ui.movilMensajes && GM.ui.movilMensajes();
        return;
      }
      if (id === 'mapa') {
        if (cerrar) cerrar();
        setTimeout(() => GM.sede && GM.sede.abrirMapa && GM.sede.abrirMapa(), 60);
        return;
      }
      if (id === 'transporte') {
        cuerpo.innerHTML = '';
        cuerpo.append(cab('Transporte', true));
        if (GM.movilidad && GM.movilidad.app) GM.movilidad.app(cuerpo, st, () => ir('transporte'));
        return;
      }
      ({ banco, inmobiliaria: inmo, prensa, redes, calendario })[id]();
    }
    modal(
      cuerpo,
      [
        {
          t: 'Cerrar',
          cls: 'btn-sec',
          fn: () => {
            refrescar();
          }
        }
      ],
      { alta: true }
    );
    cerrar = cerrarModales;
    if (app) ir(app);
    else inicio();
  }
  GM.ui.movil = abrir;
  GM.ui.movilApps = abrir;
})();
