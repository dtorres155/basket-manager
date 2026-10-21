/* Pantalla de Negocios (punto 55): pestaña «Negocios» de Ciudad. Abrir un negocio (tipo, barrio y local alquilado o tuyo), y para cada uno: lo que pasa hoy, el mes, la reputación, precio, calidad, proveedor, marketing,
   plantilla (contratar, subir sueldos, despedir), gráfico de beneficios mensuales, cerrar y traspasar. Usa las utilidades del núcleo a través de GM.ui._ y GM.ui.grafico de ui_patrimonio.js. */
(function () {
  const { addTab, U, chip, h, modal, refrescar, seccion, toast, ui, barra } = GM.ui._;
  const k1 = k => (Math.round(k * 10) / 10).toLocaleString('es-ES'),
    N = () => GM.negocios;
  const deslizador = (min, max, paso, valor, fn, etiqueta) => {
    const v = h('b', null, etiqueta(valor)),
      i = h('input', {
        type: 'range',
        min,
        max,
        step: paso,
        value: valor,
        oninput: e => {
          v.textContent = etiqueta(+e.target.value);
        },
        onchange: e => {
          fn(+e.target.value);
        }
      });
    return h('div', { class: 'fila' }, i, v);
  };
  function abrirModal(st) {
    const Ng = N(),
      bs = Ng.barrios(st),
      F = { tipo: 'bar', barrio: bs[0].nombre, local: '' },
      cuerpo = h('div'),
      propios = Ng.localesLibres(st);
    const pintar = () => {
      cuerpo.innerHTML = '';
      const c = Ng.costeApertura(st, F.tipo, F.barrio, !!F.local),
        T = Ng.TIPOS[F.tipo],
        traf = Ng.trafico(st, F.tipo, F.barrio);
      cuerpo.append(
        h('h3', null, 'Abrir un negocio'),
        h(
          'div',
          { class: 'seg compacto' },
          Object.keys(Ng.TIPOS).map(k =>
            h(
              'button',
              {
                class: 'tab' + (F.tipo === k ? ' on' : ''),
                onclick: () => {
                  F.tipo = k;
                  pintar();
                }
              },
              Ng.TIPOS[k].n
            )
          )
        ),
        h('label', null, 'Barrio'),
        h(
          'select',
          {
            class: 'sel',
            onchange: e => {
              F.barrio = e.target.value;
              pintar();
            }
          },
          bs.map(b => h('option', { value: b.nombre, selected: b.nombre === F.barrio }, b.nombre + ' (precios ×' + b.f + ')'))
        ),
        h('label', null, 'Local'),
        h(
          'select',
          {
            class: 'sel',
            onchange: e => {
              F.local = e.target.value;
              pintar();
            }
          },
          [h('option', { value: '' }, 'Alquilado (' + k1(c.alquiler || Ng.costeApertura(st, F.tipo, F.barrio, false).alquiler) + ' mil €/mes)')].concat(
            propios.map(b => h('option', { value: b.id, selected: b.id === F.local }, 'Mi local: ' + b.nombre))
          )
        ),
        h(
          'div',
          { class: 'chips' },
          chip('Inversión ' + k1(c.inversion) + ' mil €'),
          chip('Fianza ' + k1(c.fianza) + ' mil €'),
          chip('Total ' + k1(c.total) + ' mil €'),
          chip('Tráfico del barrio ' + (traf >= 1.1 ? 'alto' : traf >= 0.8 ? 'medio' : 'bajo'))
        ),
        h(
          'p',
          { class: 'muted' },
          'Clientes potenciales al día en un barrio medio: ' + T.dem + ', gasto medio ' + T.ticket + ' €, equipo inicial de ' + T.emp + ' personas. Las obras duran unas semanas.'
        ),
        h(
          'button',
          {
            class: 'btn grande',
            onclick: () => {
              const r = Ng.abrir(st, F.tipo, F.barrio, F.local || null);
              if (!r.ok) toast(r.motivo);
              else {
                toast('Obras en marcha: abre el ' + U.fecha(r.negocio.abre));
                document.querySelectorAll('.fondo').forEach(e => e.remove());
                refrescar();
              }
            }
          },
          'Abrir por ' + k1(c.total) + ' mil €'
        )
      );
    };
    pintar();
    modal(cuerpo, [{ t: 'Cerrar', cls: 'btn-sec' }], { alta: true });
  }
  function tarjeta(st, n) {
    const Ng = N(),
      T = Ng.TIPOS[n.tipo],
      m = n.mes,
      hoy = n.hoy,
      ult = n.hist[0],
      chart = n.hist.length
        ? GM.ui.grafico(
            [
              {
                nombre: 'Beneficio mensual',
                color: '#2e7d32',
                puntos: n.hist
                  .slice()
                  .reverse()
                  .map(x => x.beneficio)
              }
            ],
            { h: 110, titulo: 'Beneficio' }
          )
        : '';
    const emp = n.empleados.map((e, i) =>
      h(
        'div',
        { class: 'item' },
        h(
          'div',
          { class: 'ct' },
          h('b', null, e.nombre),
          h('span', { class: 'muted' }, k1(e.sueldo) + ' mil €/mes, habilidad ' + e.hab.toFixed(1).replace('.', ',') + ', ánimo ' + Math.round(e.animo))
        ),
        h(
          'button',
          {
            class: 'btn peq btn-sec',
            onclick: () => {
              const r = Ng.despedir(st, n.id, i);
              toast(r.ok ? 'Despedido' : r.motivo);
              refrescar();
            }
          },
          'Despedir'
        )
      )
    );
    return h(
      'div',
      { class: 'tarjeta' },
      h('div', { class: 'fila' }, h('b', null, n.nombre), chip(n.abierto ? 'Abierto' : 'En obras hasta el ' + U.fecha(n.abre))),
      h(
        'span',
        { class: 'muted' },
        T.n +
          ' en ' +
          n.barrio +
          ', ' +
          (n.local.tipo === 'propio' ? 'en un local tuyo' : 'alquiler de ' + k1(n.local.alquiler) + ' mil €/mes') +
          ', inversión de ' +
          k1(n.inversion) +
          ' mil €.'
      ),
      !n.abierto
        ? h('p', null, 'Las obras avanzan; abre en pocos días.')
        : h(
            'div',
            null,
            h(
              'div',
              { class: 'chips' },
              chip('Hoy: ' + (hoy ? hoy.clientes : 0) + ' clientes'),
              chip('Pierdes ' + (hoy ? hoy.perdidos : 0)),
              chip('Mes: ' + k1(m.ing) + ' mil € de ingresos'),
              ult ? chip('Mes anterior: ' + (ult.beneficio >= 0 ? '+' : '') + k1(ult.beneficio) + ' mil €') : null
            ),
            barra(n.reputacion, 100, n.reputacion >= 60 ? 'verde' : n.reputacion >= 35 ? '' : 'rojo'),
            h('span', { class: 'muted' }, 'Reputación ' + Math.round(n.reputacion) + ' de 100'),
            h('div', { html: chart }),
            h('label', null, 'Precio'),
            deslizador(
              0.6,
              1.8,
              0.05,
              n.precio,
              v => {
                Ng.ajustar(st, n.id, 'precio', v);
                refrescar();
              },
              v => '×' + v.toFixed(2).replace('.', ',')
            ),
            h('label', null, 'Marketing al mes (mil €)'),
            deslizador(
              0,
              8,
              0.5,
              n.marketing,
              v => {
                Ng.ajustar(st, n.id, 'marketing', v);
                refrescar();
              },
              v => k1(v)
            ),
            h('label', null, 'Calidad del servicio'),
            deslizador(
              1,
              5,
              1,
              n.calidad,
              v => {
                Ng.ajustar(st, n.id, 'calidad', v);
                refrescar();
              },
              v => v + ' de 5'
            ),
            h('label', null, 'Proveedor'),
            h(
              'select',
              {
                class: 'sel',
                onchange: e => {
                  Ng.ajustar(st, n.id, 'prov', e.target.value);
                  refrescar();
                }
              },
              Object.keys(Ng.PROVEEDORES).map(k => h('option', { value: k, selected: n.prov === k }, Ng.PROVEEDORES[k].n))
            ),
            h('h4', null, 'Plantilla (' + n.empleados.length + ')'),
            h('div', { class: 'lista' }, emp),
            h(
              'div',
              { class: 'par' },
              h(
                'button',
                {
                  class: 'btn peq',
                  onclick: () => {
                    const r = Ng.contratar(st, n.id);
                    toast(r.ok ? 'Contratas a ' + r.empleado.nombre : r.motivo);
                    refrescar();
                  }
                },
                'Contratar'
              ),
              h(
                'button',
                {
                  class: 'btn peq btn-sec',
                  onclick: () => {
                    Ng.subirSueldos(st, n.id, 0.1);
                    toast('Sueldos +10 %');
                    refrescar();
                  }
                },
                'Subir sueldos un 10 %'
              )
            )
          ),
      h(
        'div',
        { class: 'par' },
        n.abierto
          ? h(
              'button',
              {
                class: 'btn peq btn-sec',
                onclick: () => {
                  const v = Ng.valorTraspaso(st, n);
                  if (confirm('Traspasar por ' + k1(v) + ' mil €?')) {
                    const r = Ng.traspasar(st, n.id);
                    toast(r.ok ? 'Traspasado por ' + k1(r.precio) + ' mil €' : r.motivo);
                    refrescar();
                  }
                }
              },
              'Traspasar (' + k1(Ng.valorTraspaso(st, n)) + ' mil €)'
            )
          : null,
        h(
          'button',
          {
            class: 'btn peq btn-sec',
            onclick: () => {
              if (confirm('¿Cerrar ' + n.nombre + '?')) {
                const r = Ng.cerrar(st, n.id);
                toast(r.ok ? 'Cerrado: recuperas ' + k1(r.recuperas) + ' mil € y pagas ' + k1(r.indemnizas) + ' de indemnizaciones' : r.motivo);
                refrescar();
              }
            }
          },
          'Cerrar'
        )
      )
    );
  }
  function negociosTab(el, st) {
    const Ng = N(),
      a = Ng.activos(st),
      r = Ng.resumen(st);
    el.append(
      seccion(
        'Tus negocios',
        h(
          'div',
          { class: 'tarjeta' },
          h(
            'div',
            { class: 'chips' },
            chip(a.length + ' negocios'),
            chip(r.empleados + ' empleados'),
            chip('Último mes: ' + (r.beneficioMes >= 0 ? '+' : '') + k1(r.beneficioMes) + ' mil €')
          ),
          h(
            'p',
            { class: 'muted' },
            'Cada negocio tiene su demanda según el barrio, el día y la franja horaria. Equilibra precio, plantilla y marketing: si hay más gente que personal, pierdes clientes y reputación.'
          ),
          h('button', { class: 'btn', onclick: () => abrirModal(st) }, 'Abrir un negocio')
        )
      )
    );
    a.forEach(n => el.append(tarjeta(st, n)));
    if (!a.length) el.append(h('p', { class: 'muted' }, 'Todavía no tienes ninguno. Un bar o un restaurante es lo más fácil para empezar.'));
  }
  addTab('ciudad', 'negocios', 'Negocios', negociosTab, st => !!GM.negocios);
})();
