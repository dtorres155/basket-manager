/* Pantalla de gestión del pueblo (punto 56): pestaña «Gestión del pueblo» de Ciudad (modo carrera). Resumen y gráfico de población y calidad, presupuesto municipal (tasa, reparto entre servicios, donaciones y subvención),
   servicios, peticiones de los vecinos, vecinos con nombre, asociaciones, fiestas del año y obras en marcha. Usa GM.puebloGestion y las utilidades de GM.ui._. */
(function () {
  const { addTab, U, chip, h, refrescar, seccion, toast, ui, barra } = GM.ui._;
  const k1 = k => (Math.round(k * 10) / 10).toLocaleString('es-ES'),
    G = () => GM.puebloGestion,
    tarjeta = (...c) => h('div', { class: 'tarjeta' }, ...c);
  const desliz = (min, max, paso, valor, fn, et) => {
    const v = h('b', null, et(valor));
    return h(
      'div',
      { class: 'fila' },
      h('input', {
        type: 'range',
        min,
        max,
        step: paso,
        value: valor,
        oninput: e => {
          v.textContent = et(+e.target.value);
        },
        onchange: e => {
          fn(+e.target.value);
          refrescar();
        }
      }),
      v
    );
  };
  function tab(el, st) {
    const Gp = G(),
      g = Gp.gest(st);
    if (!g) return;
    const r = Gp.resumen(st),
      c = st.carrera,
      p = c.pueblo;
    el.append(
      seccion(
        'El pueblo de ' + p.nombre,
        tarjeta(
          h('div', { class: 'fila' }, h('b', { style: { fontSize: '1.4rem' } }, r.pob.toLocaleString('es-ES') + ' habitantes'), chip(r.etiqueta)),
          h(
            'div',
            { class: 'chips' },
            chip('Caja municipal ' + k1(r.caja) + ' mil €'),
            chip('Servicios ' + r.cal + ' de 100'),
            chip('Opinión de ti ' + r.opinion),
            chip((r.crecimiento >= 0 ? 'Crece ' : 'Pierde ') + Math.abs(r.crecimiento) + ' % al mes'),
            chip('Turismo ' + r.turismo)
          ),
          r.ult
            ? h(
                'p',
                { class: 'muted' },
                'Último mes: impuestos ' +
                  k1(r.ult.ing) +
                  ', subvenciones ' +
                  k1(r.ult.subv) +
                  ', asociaciones −' +
                  k1(r.ult.aso) +
                  ', servicios −' +
                  k1(r.ult.gastado) +
                  ' (mil €).'
              )
            : h('p', { class: 'muted' }, 'El presupuesto se cierra el día 15 de cada mes.'),
          h('div', { html: GM.ui.grafico([{ nombre: 'Población', color: '#2f6db5', puntos: g.serie.map(x => x.pob).concat([r.pob]) }], { h: 120, titulo: 'Población' }) }),
          h('div', {
            html: GM.ui.grafico(
              [
                { nombre: 'Servicios', color: '#2e7d32', puntos: g.serie.map(x => x.cal).concat([r.cal]) },
                { nombre: 'Opinión', color: '#e8a52e', puntos: g.serie.map(x => x.op).concat([r.opinion]) }
              ],
              { h: 110, min: 0, max: 100, titulo: 'Calidad y opinión' }
            )
          })
        )
      )
    );
    el.append(
      seccion(
        'Presupuesto',
        tarjeta(
          h(
            'div',
            { class: 'seg compacto' },
            Object.keys(Gp.TASAS).map(k =>
              h(
                'button',
                {
                  class: 'tab' + (g.tasa === k ? ' on' : ''),
                  onclick: () => {
                    Gp.fijarTasa(st, k);
                    refrescar();
                  }
                },
                Gp.TASAS[k].n
              )
            )
          ),
          h('p', { class: 'muted' }, 'Más impuestos, más dinero para los servicios pero peor opinión. Reparte el dinero entre los servicios:'),
          Object.keys(Gp.SERVICIOS).map(k =>
            h(
              'div',
              null,
              h('div', { class: 'fila' }, h('span', null, Gp.SERVICIOS[k] + ' (calidad ' + Math.round(g.cal[k]) + ')'), null),
              barra(g.cal[k], 100, g.cal[k] >= 60 ? 'verde' : g.cal[k] >= 35 ? '' : 'rojo'),
              desliz(
                0,
                60,
                1,
                g.asig[k],
                v => Gp.asignar(st, k, v),
                v => v + ' %'
              )
            )
          ),
          h(
            'div',
            { class: 'par' },
            [5, 20, 50].map(k =>
              h(
                'button',
                {
                  class: 'btn peq',
                  onclick: () => {
                    const x = Gp.donar(st, k);
                    toast(x.ok ? 'Donas ' + k + ' mil € al ayuntamiento' : x.motivo);
                    refrescar();
                  }
                },
                'Donar ' + k + ' mil €'
              )
            ),
            h(
              'button',
              {
                class: 'btn peq btn-sec',
                onclick: () => {
                  const x = Gp.subvencion(st);
                  toast(x.ok ? 'Consigues una subvención de ' + k1(x.importe) + ' mil €' : x.motivo);
                  refrescar();
                }
              },
              'Pedir una subvención'
            )
          )
        )
      )
    );
    el.append(
      seccion(
        'Peticiones de los vecinos (' + g.peticiones.length + ')',
        h(
          'div',
          { class: 'lista' },
          g.peticiones.length
            ? g.peticiones.map(q =>
                h(
                  'div',
                  { class: 'item col' },
                  h('div', { class: 'fila' }, h('b', null, q.t), chip(k1(q.coste) + ' mil €')),
                  h('span', { class: 'muted' }, q.vecino + ' (' + q.oficio + '): ' + q.d + ' Plazo hasta el ' + U.fecha(q.hasta) + '.'),
                  h(
                    'div',
                    { class: 'par' },
                    h(
                      'button',
                      {
                        class: 'btn peq',
                        onclick: () => {
                          const x = Gp.apoyar(st, q.id);
                          toast(x.ok ? x.texto : x.motivo);
                          refrescar();
                        }
                      },
                      'Ayudar'
                    ),
                    h(
                      'button',
                      {
                        class: 'btn peq btn-sec',
                        onclick: () => {
                          Gp.ignorar(st, q.id);
                          refrescar();
                        }
                      },
                      'Ignorar'
                    )
                  )
                )
              )
            : h('p', { class: 'muted' }, 'Nadie te pide nada ahora mismo.')
        )
      )
    );
    el.append(
      seccion(
        'Asociaciones',
        h(
          'div',
          { class: 'lista' },
          Object.keys(Gp.ASOC).map(k => {
            const a = Gp.ASOC[k],
              on = g.asoc.some(x => x.tipo === k);
            return h(
              'div',
              { class: 'item' },
              h('div', { class: 'ct' }, h('b', null, a.n), h('span', { class: 'muted' }, a.d + ' Fundarla ' + k1(a.coste) + ' mil €, mantenerla ' + k1(a.mes) + ' al mes.')),
              h(
                'button',
                {
                  class: 'btn peq' + (on ? ' btn-sec' : ''),
                  onclick: () => {
                    const x = on ? Gp.cerrarAsoc(st, k) : Gp.fundar(st, k);
                    if (!x.ok) toast(x.motivo);
                    refrescar();
                  }
                },
                on ? 'Disolver' : 'Fundar'
              )
            );
          })
        )
      )
    );
    el.append(
      seccion(
        'Fiestas del año',
        tarjeta(
          Object.keys(Gp.FIESTAS).map(k =>
            h(
              'div',
              null,
              h('span', null, Gp.FIESTAS[k].n + ' (' + Gp.FIESTAS[k].md.split('-').reverse().join('/') + ')'),
              desliz(
                0,
                3,
                1,
                g.fiestas[k],
                v => Gp.presupuestoFiesta(st, k, v),
                v => ['sin fiesta', 'sencilla', 'buena', 'por todo lo alto'][v] + ', ' + k1(Gp.FIESTAS[k].base * v) + ' mil €'
              )
            )
          )
        )
      )
    );
    el.append(
      seccion(
        'Vecinos del pueblo',
        h(
          'div',
          { class: 'lista' },
          g.vecinos.map(v =>
            h(
              'div',
              { class: 'item' },
              h('div', { class: 'ct' }, h('b', null, v.n), h('span', { class: 'muted' }, v.oficio + ', ' + v.edad + ' años')),
              h('b', { class: v.op >= 55 ? 'ok' : 'neg' }, Math.round(v.op) + '/100')
            )
          )
        )
      )
    );
    const ob = GM.mods.pueblo.edificios(st).filter(b => b.obra);
    if (ob.length)
      el.append(
        seccion(
          'Obras en marcha',
          h(
            'div',
            { class: 'lista' },
            ob.map(b =>
              h(
                'div',
                { class: 'item col' },
                h('b', null, b.nombre + ': ' + b.obra.proximo),
                barra(b.obra.progreso * 100, 100, ''),
                h('span', { class: 'muted' }, 'Fin el ' + U.fecha(b.obra.fin))
              )
            )
          )
        )
      );
  }
  // Encargos de la ciudad real (punto 60)
  function encargosTab(el, st) {
    const J = GM.ciudadJuego;
    J.generar(st, GM.sede.activa() && GM.sede._estado().escena === 'calle' ? GM.sede._estado() : null);
    const d = J.datos(st),
      L = J.encargos(st);
    el.append(
      seccion(
        'Encargos de la ciudad',
        tarjeta(
          h(
            'div',
            { class: 'chips' },
            chip('Calle ' + Math.round(d.calle) + ' de 100'),
            chip('Récord de triples ' + d.rec.triples + ' de 10'),
            chip('Libres ' + d.rec.libres + ' de 10'),
            chip('Precisión ' + d.rec.precision + ' de 14'),
            chip('Unos contra uno ganados ' + d.rec.uno)
          ),
          h(
            'p',
            { class: 'muted' },
            'Hay dos canchas de barrio en tu ciudad (en el mapa 3D): concurso de triples, tiros libres, uno contra uno callejero y entreno de precisión. Los sitios con encargo llevan un anillo dorado.'
          )
        )
      )
    );
    el.append(
      seccion(
        'Pendientes (' + L.filter(e => !e.hecho).length + ')',
        h(
          'div',
          { class: 'lista' },
          L.length
            ? L.map(e =>
                h(
                  'div',
                  { class: 'item col', style: { opacity: e.hecho ? 0.55 : 1 } },
                  h('div', { class: 'fila' }, h('b', null, e.texto), chip(e.hecho ? 'Cumplido' : e.diario ? 'Hoy' : 'Quedan ' + Math.max(0, U.diffDays(st.fecha, e.hasta)) + ' d')),
                  h(
                    'span',
                    { class: 'muted' },
                    'Premio ' +
                      k1(e.premio.dinero) +
                      ' mil €, fama +' +
                      e.premio.fama +
                      ', calle +' +
                      e.premio.calle +
                      (e.destino && e.destino !== 'cancha' && J.SITIOS[e.destino] ? '. En ' + J.SITIOS[e.destino] + '.' : '. En una cancha.')
                  )
                )
              )
            : h('p', { class: 'muted' }, 'No hay encargos ahora mismo.')
        )
      )
    );
  }
  addTab('ciudad', 'encargos', 'Encargos', encargosTab, st => st.modo === 'carrera' && !!st.carrera && !!GM.ciudadJuego);
  addTab('ciudad', 'gestionpueblo', 'Gestión del pueblo', tab, st => st.modo === 'carrera' && !!st.carrera && !!st.carrera.pueblo && !!GM.puebloGestion);
})();
