/* Pantalla de Patrimonio (puntos 54 y 58 de la hoja de ruta): pestaña «Patrimonio» de Ciudad con resumen y gráfico del patrimonio neto, mercado de bienes con filtros, tus bienes, deudas y préstamos, seguros, impuestos y el libro de cuentas.
   También ofrece GM.ui.grafico(series, opciones) -> texto SVG de un gráfico de líneas (lo usan los negocios, la economía y las finanzas). Usa las utilidades del núcleo a través de GM.ui._. */
(function () {
  const { addTab, M, U, aviso, chip, h, modal, refrescar, seccion, toast, ui } = GM.ui._;
  const k1 = k => (Math.round(k * 10) / 10).toLocaleString('es-ES'),
    eur = k => Math.round(k * 1000).toLocaleString('es-ES') + ' €';
  // Gráfico de líneas sencillo: series = [{ nombre, color, puntos: [valores] }], etiquetas opcionales
  function grafico(series, o) {
    o = o || {};
    const W = o.w || 560,
      Hh = o.h || 160,
      pad = 28,
      todos = [].concat(...series.map(s => s.puntos));
    if (!todos.length) return '<p class="muted">Aún no hay datos.</p>';
    let mn = Math.min(...todos, o.min === undefined ? Infinity : o.min),
      mx = Math.max(...todos, o.max === undefined ? -Infinity : o.max);
    if (mn === mx) {
      mn -= 1;
      mx += 1;
    }
    const n = Math.max(...series.map(s => s.puntos.length)),
      x = i => pad + (n <= 1 ? 0 : i / (n - 1)) * (W - pad - 8),
      y = v => Hh - 18 - ((v - mn) / (mx - mn)) * (Hh - 30);
    const cero =
      mn < 0 && mx > 0 ? '<line x1="' + pad + '" x2="' + (W - 8) + '" y1="' + y(0) + '" y2="' + y(0) + '" stroke="currentColor" stroke-opacity=".25" stroke-dasharray="3 3"/>' : '';
    const ls = series
      .map(
        s =>
          '<polyline fill="none" stroke="' +
          (s.color || '#2f6db5') +
          '" stroke-width="2.2" stroke-linejoin="round" points="' +
          s.puntos.map((v, i) => x(i).toFixed(1) + ',' + y(v).toFixed(1)).join(' ') +
          '"/>'
      )
      .join('');
    const leyenda =
      series.length > 1
        ? series.map((s, i) => '<text x="' + (pad + i * 110) + '" y="11" font-size="11" fill="' + (s.color || '#2f6db5') + '">' + s.nombre + '</text>').join('')
        : '';
    return (
      '<svg viewBox="0 0 ' +
      W +
      ' ' +
      Hh +
      '" width="100%" role="img" aria-label="' +
      (o.titulo || 'Gráfico') +
      '" style="color:inherit"><text x="2" y="' +
      (Hh - 22) +
      '" font-size="10" fill="currentColor" fill-opacity=".6">' +
      k1(mn) +
      '</text><text x="2" y="' +
      30 +
      '" font-size="10" fill="currentColor" fill-opacity=".6">' +
      k1(mx) +
      '</text>' +
      cero +
      ls +
      leyenda +
      (o.etiquetas
        ? '<text x="' +
          pad +
          '" y="' +
          (Hh - 3) +
          '" font-size="10" fill="currentColor" fill-opacity=".6">' +
          o.etiquetas[0] +
          '</text><text x="' +
          (W - 8) +
          '" y="' +
          (Hh - 3) +
          '" font-size="10" text-anchor="end" fill="currentColor" fill-opacity=".6">' +
          o.etiquetas[1] +
          '</text>'
        : '') +
      '</svg>'
    );
  }
  GM.ui.grafico = grafico;
  const PT = () => GM.patrimonio,
    SUB = [
      ['resumen', 'Resumen'],
      ['mercado', 'Mercado'],
      ['bienes', 'Mis bienes'],
      ['deudas', 'Deudas'],
      ['seguros', 'Seguros'],
      ['impuestos', 'Impuestos'],
      ['libro', 'Libro']
    ];
  const tarjeta = (...c) => h('div', { class: 'tarjeta' }, ...c);
  function resumen(el, st) {
    const P = PT(),
      n = P.neto(st),
      s = P.serie(st),
      hace = s.length > 12 ? s[s.length - 13].neto : s.length ? s[0].neto : n.total,
      dif = Math.round((n.total - hace) * 10) / 10;
    el.append(
      seccion(
        'Patrimonio neto',
        tarjeta(
          h(
            'div',
            { class: 'fila' },
            h('b', { style: { fontSize: '1.6rem' } }, k1(n.total) + ' mil €'),
            h('span', { class: dif >= 0 ? 'ok' : 'neg' }, (dif >= 0 ? '+' : '') + k1(dif) + ' en 12 meses')
          ),
          h('div', { class: 'chips' }, chip('Caja ' + k1(n.caja)), chip('Casas ' + k1(n.casas)), chip('Bienes ' + k1(n.bienes)), chip('Deudas −' + k1(n.deudas))),
          h('div', {
            html: grafico(
              [
                { nombre: 'Patrimonio neto', color: '#2f6db5', puntos: s.map(x => x.neto).concat([n.total]) },
                { nombre: 'Caja', color: '#e8a52e', puntos: s.map(x => x.caja).concat([n.caja]) }
              ],
              { etiquetas: s.length ? [U.fecha(s[0].f), 'hoy'] : null, titulo: 'Patrimonio neto' }
            )
          }),
          h(
            'p',
            { class: 'muted' },
            'El patrimonio sube y baja con el mercado y con tus decisiones: cada bien se revaloriza o se hunde según su barrio y cada deuda cuesta intereses.'
          )
        )
      )
    );
    retosLogros(el, st);
    const l = P.libro(st).slice(0, 5);
    el.append(
      seccion(
        'Últimos movimientos',
        h(
          'div',
          { class: 'lista' },
          l.length
            ? l.map(x =>
                h(
                  'div',
                  { class: 'item' },
                  h('div', { class: 'ct' }, h('b', null, x.t), h('span', { class: 'muted' }, U.fecha(x.f) + ', ' + P.CATS[x.c])),
                  h('b', { class: x.v >= 0 ? 'ok' : 'neg' }, (x.v >= 0 ? '+' : '') + k1(x.v))
                )
              )
            : h('p', { class: 'muted' }, 'Todavía no hay movimientos.')
        )
      )
    );
  }
  function retosLogros(el, st) {
    const LE = GM.logrosEco;
    if (!LE || st.modo !== 'carrera') return;
    const r = LE.resumen(st),
      pct = x => Math.round(Math.min(1, x.valor / x.meta) * 100);
    el.append(
      seccion(
        'Retos de tu etapa: ' + r.etapa.toLowerCase(),
        h(
          'div',
          { class: 'lista' },
          r.retos.map(x =>
            h(
              'div',
              { class: 'item col' },
              h('div', { class: 'fila' }, h('b', null, x.t), chip(x.hecho ? 'Cumplido' : pct(x) + ' %')),
              GM.ui._.barra(x.hecho ? 100 : pct(x), 100, x.hecho ? 'verde' : ''),
              h('span', { class: 'muted' }, 'Premio: ' + k1(x.premio.dinero) + ' mil €, fama +' + x.premio.fama + (x.hecho ? ', conseguido el ' + U.fecha(x.fecha) : ''))
            )
          )
        )
      )
    );
    const L = LE.logrosEco(st),
      grupos = [...new Set(L.map(x => x.grupo))];
    el.append(
      seccion(
        'Logros económicos (' + r.hechos + ' de ' + r.logros + ')',
        h(
          'div',
          null,
          grupos.map(g =>
            h(
              'div',
              null,
              h('h4', null, g),
              h(
                'div',
                { class: 'lista' },
                L.filter(x => x.grupo === g).map(x =>
                  h(
                    'div',
                    { class: 'item', style: { opacity: x.fecha ? 1 : 0.7 } },
                    h(
                      'div',
                      { class: 'ct' },
                      h('b', null, (x.fecha ? '🏅 ' : '') + x.t),
                      h('span', { class: 'muted' }, x.d + (x.fecha ? ' Conseguido el ' + U.fecha(x.fecha) + '.' : x.prog !== null ? ' ' + Math.round(x.prog * 100) + ' %' : ''))
                    )
                  )
                )
              )
            )
          )
        )
      )
    );
  }
  function mercado(el, st) {
    const P = PT(),
      F = (ui.fMercado = ui.fMercado || { tipo: '', barrio: '', orden: 'precio' }),
      of = P.mercado(st),
      bs = [...new Set(of.map(o => o.barrio))];
    const sel = (valor, opciones, fn) =>
      h(
        'select',
        {
          class: 'sel',
          onchange: e => {
            fn(e.target.value);
            refrescar();
          }
        },
        opciones.map(([v, t]) => h('option', { value: v, selected: v === valor }, t))
      );
    el.append(
      h(
        'div',
        { class: 'par' },
        sel(F.tipo, [['', 'Todo']].concat(Object.keys(P.TIPOS).map(k => [k, P.TIPOS[k].n])), v => {
          F.tipo = v;
        }),
        sel(F.barrio, [['', 'Todos los barrios']].concat(bs.map(b => [b, b])), v => {
          F.barrio = v;
        }),
        sel(
          F.orden,
          [
            ['precio', 'Más baratos'],
            ['renta', 'Más rentables'],
            ['nombre', 'Por nombre']
          ],
          v => {
            F.orden = v;
          }
        )
      )
    );
    let L = of.filter(o => (!F.tipo || o.tipo === F.tipo) && (!F.barrio || o.barrio === F.barrio));
    L = L.sort((a, b) => (F.orden === 'renta' ? b.renta / b.precio - a.renta / a.precio : F.orden === 'nombre' ? a.nombre.localeCompare(b.nombre, 'es') : a.precio - b.precio));
    el.append(
      seccion(
        'Ofertas de este mes (' + L.length + ')',
        h(
          'div',
          { class: 'lista' },
          L.length
            ? L.map(o =>
                h(
                  'div',
                  { class: 'item col' },
                  h('div', { class: 'fila' }, h('b', null, o.nombre), chip(k1(o.precio) + ' mil €')),
                  h(
                    'span',
                    { class: 'muted' },
                    P.TIPOS[o.tipo].n +
                      ', ' +
                      o.barrio +
                      (o.m2 ? ', ' + o.m2 + ' m²' : '') +
                      (o.renta ? ', alquiler de ' + k1(o.renta) + ' mil €/mes' : '') +
                      (o.tipo === 'coche' ? (o.clasico ? ', se revaloriza' : ', se deprecia') : '')
                  ),
                  h(
                    'div',
                    { class: 'par' },
                    h(
                      'button',
                      {
                        class: 'btn peq',
                        onclick: () => {
                          const r = P.comprar(st, o.id, 'contado');
                          toast(r.ok ? 'Comprado: ' + o.nombre : r.motivo);
                          refrescar();
                        }
                      },
                      'Comprar al contado'
                    ),
                    o.tipo === 'coche' || o.tipo === 'arte'
                      ? null
                      : h(
                          'button',
                          {
                            class: 'btn peq btn-sec',
                            onclick: () => {
                              const r = P.comprar(st, o.id, 'hipoteca');
                              toast(r.ok ? 'Hipoteca firmada: ' + o.nombre : r.motivo);
                              refrescar();
                            }
                          },
                          'Con hipoteca (' + k1(o.precio * 0.2) + ' de entrada)'
                        )
                  )
                )
              )
            : h('p', { class: 'muted' }, 'Nada con esos filtros.')
        )
      )
    );
  }
  function bienes(el, st) {
    const P = PT(),
      e = P.est(st);
    el.append(
      seccion(
        'Mis bienes (' + e.bienes.length + ')',
        h(
          'div',
          { class: 'lista' },
          e.bienes.length
            ? e.bienes.map(b => {
                const v = P.valorBien(st, b),
                  g = Math.round((v - b.compra.precio) * 10) / 10,
                  deuda = e.deudas.find(d => d.bien === b.id);
                return h(
                  'div',
                  { class: 'item col' },
                  h('div', { class: 'fila' }, h('b', null, b.nombre), chip(k1(v) + ' mil €')),
                  h(
                    'span',
                    { class: 'muted' },
                    P.TIPOS[b.tipo].n +
                      ', comprado por ' +
                      k1(b.compra.precio) +
                      ' mil € el ' +
                      U.fecha(b.compra.fecha) +
                      ', ' +
                      (g >= 0 ? '+' : '') +
                      k1(g) +
                      ' mil €' +
                      (b.alquilado ? ', alquilado' : '') +
                      (deuda ? ', debes ' + k1(deuda.restante) + ' mil €' : '') +
                      (b.obra ? ', en obras hasta el ' + U.fecha(b.obra.fin) : '')
                  ),
                  h(
                    'div',
                    { class: 'par' },
                    b.renta
                      ? h(
                          'button',
                          {
                            class: 'btn peq btn-sec',
                            onclick: () => {
                              P.alquilar(st, b.id);
                              refrescar();
                            }
                          },
                          b.alquilado ? 'Dejar de alquilar' : 'Poner en alquiler (' + k1(b.renta) + ' mil €/mes)'
                        )
                      : null,
                    b.tipo === 'solar' && !b.obra
                      ? h(
                          'button',
                          {
                            class: 'btn peq btn-sec',
                            onclick: () => {
                              const r = P.edificar(st, b.id);
                              toast(r.ok ? 'Obra de 90 días por ' + k1(r.coste) + ' mil €' : r.motivo);
                              refrescar();
                            }
                          },
                          'Edificar'
                        )
                      : null,
                    h(
                      'button',
                      {
                        class: 'btn peq',
                        onclick: () => {
                          const r = P.vender(st, b.id);
                          toast(r.ok ? 'Vendido: cobras ' + k1(r.precio) + ' mil € (' + (r.ganancia >= 0 ? 'ganas ' : 'pierdes ') + k1(Math.abs(r.ganancia)) + ')' : r.motivo);
                          refrescar();
                        }
                      },
                      'Vender'
                    )
                  )
                );
              })
            : h('p', { class: 'muted' }, 'Aún no tienes solares, locales, plazas, coches ni arte. Mira el mercado.')
        )
      )
    );
    const cs = GM.casasProd ? GM.casasProd.lista(st).filter(p => p.modo === 'compra' || p.modo === 'hipoteca') : [];
    if (cs.length)
      el.append(
        seccion(
          'Tus casas',
          h(
            'div',
            { class: 'lista' },
            cs.map(p =>
              h(
                'div',
                { class: 'item' },
                h(
                  'div',
                  { class: 'ct' },
                  h('b', null, p.barrioNombre + ', ' + (p.ciudad || '')),
                  h('span', { class: 'muted' }, 'Valor ' + k1(GM.casasProd.valor(st, p)) + ' mil €, ' + (p.modo === 'hipoteca' ? 'con hipoteca' : 'pagada'))
                )
              )
            )
          )
        )
      );
  }
  function deudas(el, st) {
    const P = PT(),
      e = P.est(st),
      imp = h('input', { type: 'range', min: 5, max: Math.max(10, Math.floor(P.limiteCredito(st) - P.deudaTotal(st))), value: 20, step: 5 }),
      mes = h('input', { type: 'range', min: 6, max: 120, value: 36, step: 6 }),
      tx = h('p', { class: 'muted' });
    const cuota = () => {
      const i = +imp.value,
        m = +mes.value,
        r = (P.PAISES[st.equipos[st.clubId].pais] || P.PAISES.DEF).tipo + 0.025,
        mm = r / 12,
        c = (i * mm) / (1 - Math.pow(1 + mm, -m));
      tx.textContent = k1(i) + ' mil € a ' + m + ' meses, interés del ' + (r * 100).toFixed(1).replace('.', ',') + ' %, cuota de ' + k1(c) + ' mil € al mes.';
    };
    imp.oninput = mes.oninput = cuota;
    cuota();
    el.append(
      seccion(
        'Deudas (' + k1(P.deudaTotal(st)) + ' mil €)',
        h(
          'div',
          { class: 'lista' },
          e.deudas.length
            ? e.deudas.map(d =>
                h(
                  'div',
                  { class: 'item col' },
                  h('div', { class: 'fila' }, h('b', null, d.nombre), chip('Debes ' + k1(d.restante) + ' mil €')),
                  h(
                    'span',
                    { class: 'muted' },
                    'Cuota de ' +
                      k1(d.cuota) +
                      ' mil € al mes, interés del ' +
                      (d.tasa * 100).toFixed(1).replace('.', ',') +
                      ' %' +
                      (d.impagos ? ', ' + d.impagos + ' impagos' : '')
                  ),
                  h(
                    'div',
                    { class: 'par' },
                    h(
                      'button',
                      {
                        class: 'btn peq btn-sec',
                        onclick: () => {
                          const r = P.amortizar(st, d.id, Math.min(d.restante, Math.max(5, d.restante / 4)));
                          toast(r.ok ? 'Amortizas una parte' : r.motivo);
                          refrescar();
                        }
                      },
                      'Amortizar un cuarto'
                    ),
                    h(
                      'button',
                      {
                        class: 'btn peq',
                        onclick: () => {
                          const r = P.amortizar(st, d.id);
                          toast(r.ok ? 'Deuda cancelada' : r.motivo);
                          refrescar();
                        }
                      },
                      'Pagar todo'
                    )
                  )
                )
              )
            : h('p', { class: 'muted' }, 'No debes nada.')
        )
      )
    );
    el.append(
      seccion(
        'Pedir un préstamo',
        tarjeta(
          h('p', { class: 'muted' }, 'El banco te presta hasta ' + k1(Math.max(0, P.limiteCredito(st) - P.deudaTotal(st))) + ' mil € más, según tu patrimonio y tu sueldo.'),
          h('label', null, 'Importe'),
          imp,
          h('label', null, 'Plazo'),
          mes,
          tx,
          h(
            'button',
            {
              class: 'btn',
              onclick: () => {
                const r = P.prestamo(st, +imp.value, +mes.value);
                toast(r.ok ? 'Préstamo concedido' : r.motivo);
                refrescar();
              }
            },
            'Pedir el préstamo'
          )
        )
      )
    );
  }
  function seguros(el, st) {
    const P = PT(),
      e = P.est(st);
    el.append(
      seccion(
        'Seguros',
        h(
          'div',
          { class: 'lista' },
          Object.keys(P.SEGUROS).map(k =>
            h(
              'div',
              { class: 'item' },
              h('div', { class: 'ct' }, h('b', null, P.SEGUROS[k].n), h('span', { class: 'muted' }, P.SEGUROS[k].d + ' Cuota de ' + k1(P.cuotaSeguro(st, k)) + ' mil € al mes.')),
              h(
                'button',
                {
                  class: 'btn peq' + (e.seguros[k] ? '' : ' btn-sec'),
                  onclick: () => {
                    P.contratarSeguro(st, k);
                    refrescar();
                  }
                },
                e.seguros[k] ? 'Contratado' : 'Contratar'
              )
            )
          )
        )
      )
    );
  }
  function impuestos(el, st) {
    const P = PT(),
      e = P.est(st),
      pais = st.equipos[st.clubId].pais,
      pa = P.PAISES[pais] || P.PAISES.DEF;
    el.append(
      seccion(
        'Impuestos en ' + (pais || 'tu país'),
        tarjeta(
          h(
            'p',
            null,
            'Tu nómina llega neta (el ' +
              Math.round(pa.neto * 100) +
              ' % del bruto). Alquileres, negocios y plusvalías tributan en la declaración del ' +
              U.fecha(st.fecha.slice(0, 4) + '-' + pa.dia) +
              '.'
          ),
          h(
            'div',
            { class: 'chips' },
            chip('Rentas de ' + e.imp.anio + ': ' + k1(e.imp.ingresos) + ' mil €'),
            chip('Impuesto sobre los bienes: ' + (pa.ibi * 100).toFixed(2).replace('.', ',') + ' %')
          ),
          h(
            'div',
            { class: 'lista' },
            pa.imp.map(([lim, r], i) =>
              h(
                'div',
                { class: 'item' },
                h('span', null, (i ? 'Hasta ' : 'Hasta ') + (lim > 1e8 ? 'sin límite' : k1(lim) + ' mil €')),
                h('b', null, Math.round(r * 1000) / 10 + ' %')
              )
            )
          )
        )
      )
    );
    el.append(
      seccion(
        'Declaraciones anteriores',
        h(
          'div',
          { class: 'lista' },
          e.imp.pagado.length
            ? e.imp.pagado.map(x =>
                h(
                  'div',
                  { class: 'item' },
                  h('div', { class: 'ct' }, h('b', null, 'Ejercicio ' + x.anio), h('span', { class: 'muted' }, 'Base de ' + k1(x.base) + ' mil €')),
                  h('b', null, k1(x.pagado) + ' mil €')
                )
              )
            : h('p', { class: 'muted' }, 'Aún no has presentado ninguna.')
        )
      )
    );
  }
  function libro(el, st) {
    const P = PT(),
      F = (ui.fLibro = ui.fLibro || { c: '' }),
      L = P.libro(st)
        .filter(x => !F.c || x.c === F.c)
        .slice(0, 80);
    el.append(
      h(
        'div',
        { class: 'seg compacto' },
        [['', 'Todo']].concat(Object.keys(P.CATS).map(k => [k, P.CATS[k]])).map(([k, t]) =>
          h(
            'button',
            {
              class: 'tab' + (F.c === k ? ' on' : ''),
              onclick: () => {
                F.c = k;
                refrescar();
              }
            },
            t
          )
        )
      )
    );
    el.append(
      seccion(
        'Libro de cuentas',
        h(
          'div',
          { class: 'lista' },
          L.length
            ? L.map(x =>
                h(
                  'div',
                  { class: 'item' },
                  h('div', { class: 'ct' }, h('b', null, x.t), h('span', { class: 'muted' }, U.fecha(x.f) + ', ' + P.CATS[x.c])),
                  h('b', { class: x.v >= 0 ? 'ok' : 'neg' }, (x.v >= 0 ? '+' : '') + k1(x.v))
                )
              )
            : h('p', { class: 'muted' }, 'No hay movimientos de esa clase.')
        )
      )
    );
  }
  function pestana(el, st) {
    const P = PT();
    if (!P) return;
    P.est(st);
    const sub = (ui.subPatr = ui.subPatr || 'resumen');
    el.append(
      h(
        'div',
        { class: 'seg compacto' },
        SUB.map(([k, t]) =>
          h(
            'button',
            {
              class: 'tab' + (sub === k ? ' on' : ''),
              onclick: () => {
                ui.subPatr = k;
                refrescar();
              }
            },
            t
          )
        )
      )
    );
    (({ resumen, mercado, bienes, deudas, seguros, impuestos, libro })[sub] || resumen)(el, st);
  }
  // ---------- Economía (punto 57): tu ciudad frente a otras, el ciclo y la inflación ----------
  function economiaTab(el, st) {
    const E = GM.economia;
    if (!E) return;
    const f = E.ficha(st),
      cl = E.ciclo(st),
      F = (ui.fEco = ui.fEco || { otra: '' });
    const ids = E.ranking(st),
      otra = F.otra && st.equipos[F.otra] ? F.otra : (ids.find(x => x.ciudad !== st.equipos[st.clubId].ciudad && x.pais !== f.pais) || ids[0]).id,
      cmp = E.comparar(st, st.clubId, otra),
      pct = x => (x >= 0 ? '+' : '') + x + ' %';
    el.append(
      seccion(
        'Tu ciudad: ' + f.ciudad,
        tarjeta(
          h(
            'div',
            { class: 'chips' },
            chip('Coste de vida ×' + f.vida.toFixed(2).replace('.', ',')),
            chip('Salario medio ' + k1(f.salarioMedio) + ' mil €'),
            chip('Alquiler ' + f.alquilerM2.toFixed(1).replace('.', ',') + ' €/m²'),
            chip('Inflación acumulada ' + Math.round((f.inflacionAcum - 1) * 1000) / 10 + ' %')
          ),
          h(
            'p',
            null,
            'Ahora: ' +
              f.ciclo.toLowerCase() +
              '. Los ingresos de tu club por patrocinio van ×' +
              f.club.patrocinio.toFixed(2).replace('.', ',') +
              ' y los de taquilla ×' +
              f.club.taquilla.toFixed(2).replace('.', ',') +
              '; los jugadores piden un ' +
              Math.round((f.sueldos - 1) * 100) +
              ' % ' +
              (f.sueldos >= 1 ? 'más' : 'menos') +
              ' de sueldo que en una ciudad media.'
          ),
          h('p', { class: 'muted' }, 'Lo que cuesta vivir al mes con tu nivel de vida: ' + k1(E.gastosMes(st, 1.8)) + ' mil € (nivel medio).')
        )
      )
    );
    const opts = ids.map(x => h('option', { value: x.id, selected: x.id === otra }, x.ciudad + ' (' + x.pais + ')'));
    el.append(
      seccion(
        'Compara con otra ciudad',
        tarjeta(
          h(
            'select',
            {
              class: 'sel',
              onchange: e => {
                F.otra = e.target.value;
                refrescar();
              }
            },
            opts
          ),
          h(
            'div',
            { class: 'lista' },
            [
              ['Coste de vida', cmp.vida],
              ['Alquiler por m²', cmp.alquiler],
              ['Salario medio', cmp.salario]
            ].map(([t, v]) => h('div', { class: 'item' }, h('span', null, t + ' en ' + f.ciudad + ' frente a ' + cmp.b.ciudad), h('b', { class: v > 0 ? 'neg' : 'ok' }, pct(v))))
          )
        )
      )
    );
    const años = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      infl = años.map(a => Math.round((E.inflacion(st, st.clubId, a + (parseInt(st.temporada, 10) - 2026)) - 1) * 1000) / 10);
    el.append(
      seccion(
        'Inflación acumulada en los próximos 10 años (según el ciclo previsto)',
        tarjeta(
          h('div', { html: grafico([{ nombre: 'Inflación acumulada (%)', color: '#c0392b', puntos: infl }], { etiquetas: [st.temporada, '+10 años'], titulo: 'Inflación' }) })
        )
      )
    );
    const rk = ids.slice(),
      caras = rk.slice(0, 6),
      baratas = rk.slice(-6).reverse(),
      fila = x =>
        h(
          'div',
          { class: 'item' },
          h('span', null, x.ciudad + ' (' + x.pais + ')'),
          h('b', null, '×' + x.vida.toFixed(2).replace('.', ',') + ', alquiler ' + x.alquilerM2.toFixed(0) + ' €/m²')
        );
    el.append(seccion('Las más caras', h('div', { class: 'lista' }, caras.map(fila))), seccion('Las más baratas', h('div', { class: 'lista' }, baratas.map(fila))));
  }
  addTab('ciudad', 'economia', 'Economía', economiaTab, st => !!GM.economia);
  addTab('ciudad', 'patrimonio', 'Patrimonio', pestana, st => !!GM.patrimonio);
})();
