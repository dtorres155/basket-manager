/* Pantallas de los puntos 62 y 63: pestaña «Árbol de mejoras» en Club (ramas de instalaciones con requisitos, obras por fases, efectos y mantenimiento) y pestaña «Entrenamiento» en Plantilla (plan colectivo,
   plan individual con foco y carga, carga acumulada, rasgos, atributos ocultos e historial de lesiones). Usa GM.arbolInst, GM.progresion y las utilidades de GM.ui._. */
(function () {
  const { addTab, U, h, modal, refrescar, seccion, toast, ui, barra, clsOvr, escudo } = GM.ui._;
  const P = () => GM.progresion,
    A = () => GM.arbolInst,
    gestor = st => st.modo === 'gestor',
    pres = st => st.modo === 'presidente',
    entr = st => st.modo === 'entrenador';
  const pct = v => (v >= 0 ? '+' : '') + Math.round(v * 100) + ' %';
  const ETQ = {
    cupo: v => '+' + v + ' juvenil' + (v > 1 ? 'es' : '') + ' al año',
    cantera: v => pct(v) + ' calidad de cantera',
    jprog: v => pct(v) + ' progreso de juveniles',
    ojeo: v => '+' + v + ' prospecto por viaje',
    prevencion: v => '-' + Math.round(v * 100) + ' % lesiones',
    recuperacion: v => pct(v) + ' recuperación',
    secuelas: v => '-' + Math.round(v * 100) + ' % secuelas',
    sobrecarga: v => '-' + Math.round(v * 100) + ' % lesiones por sobrecarga',
    analitica: v => '+' + v + ' nivel de analítica',
    ingresos: v => pct(v) + ' ingresos',
    ciudad: v => pct(v) + ' arraigo en la ciudad',
    aforoPct: v => pct(v) + ' aforo',
    ambiente: v => pct(v) + ' ambiente',
    asistencia: v => pct(v) + ' asistencia',
    precio: v => pct(v) + ' precio de entradas',
    merch: v => pct(v) + ' merchandising'
  };
  const efTxt = ef =>
    Object.keys(ef || {})
      .map(k => (ETQ[k] ? ETQ[k](ef[k]) : k))
      .join(', ');
  function arbolTab(el, st) {
    const id = st.clubId,
      T = A().arbol(st, id),
      R = A().resumen(st, id),
      msg = h('div', { class: 'aviso', style: { display: 'none' } });
    el.append(
      seccion(
        'Tus instalaciones',
        h(
          'div',
          { class: 'tarjeta' },
          h(
            'div',
            { class: 'chips' },
            h('span', { class: 'chip' }, R.hechas + ' de ' + R.de + ' mejoras de especialización'),
            h('span', { class: 'chip' }, 'Obras en marcha: ' + R.obras),
            h('span', { class: 'chip' }, 'Mantenimiento: ' + U.eur(R.mantAnual) + ' al año')
          ),
          h(
            'div',
            { class: 'chips' },
            h('span', { class: 'chip' }, 'Lesiones ×' + R.efectos.prevencion.toFixed(2)),
            h('span', { class: 'chip' }, 'Recuperación ×' + R.efectos.recuperacion.toFixed(2)),
            h('span', { class: 'chip' }, 'Juveniles +' + (R.efectos.cupo || 0)),
            h('span', { class: 'chip' }, 'Analítica nivel ' + (R.efectos.analitica || 0))
          ),
          h(
            'p',
            { class: 'muted' },
            'Cada rama pide el edificio de la ciudad deportiva al nivel indicado y las mejoras anteriores. Puedes tener tres obras a la vez; cada una pasa por proyecto, obra y equipamiento, y se ve en el campus (andamios, antenas, pistas pequeñas, ambulancia…).'
          )
        )
      )
    );
    el.append(msg);
    Object.keys(A().RAMAS).forEach(rama => {
      const L = T[rama];
      if (!L || !L.length) return;
      const hechas = L.filter(n => n.estado === 'hecha').length;
      el.append(
        seccion(
          A().RAMAS[rama] + ' (' + hechas + ' de ' + L.length + ')',
          h(
            'div',
            { class: 'lista' },
            L.map(n => {
              const fase = n.fase,
                col = n.estado === 'hecha' ? 'ok' : n.estado === 'obra' ? 'med' : n.estado === 'bloqueada' ? '' : 'ok';
              return h(
                'div',
                { class: 'item', style: { opacity: n.estado === 'bloqueada' ? 0.6 : 1 } },
                h(
                  'div',
                  { class: 'ct' },
                  h('b', null, (n.estado === 'hecha' ? '✓ ' : n.estado === 'obra' ? '🚧 ' : '') + n.n),
                  h('span', { class: 'muted' }, n.d),
                  h('span', { class: 'muted' }, (n.rama === 'pabellon' ? '' : efTxt(n.ef)) + (n.mant ? '. Mantenimiento ' + U.eur(Math.round(n.mant)) + ' al año' : '')),
                  n.estado === 'obra' && fase ? h('div', null, h('span', { class: 'chip ' + col }, fase.nombre + ', ' + fase.pct + ' %'), barra(fase.pct, 100, '')) : null,
                  n.estado === 'bloqueada' ? h('span', { class: 'muted' }, '🔒 ' + n.motivo) : null
                ),
                n.estado === 'disponible'
                  ? h(
                      'button',
                      {
                        class: 'btn peq',
                        onclick: () => {
                          const r = A().construir(st, id, n.id);
                          if (!r.ok) {
                            msg.style.display = 'block';
                            msg.textContent = r.motivo;
                            toast(r.motivo);
                          } else {
                            toast('Empieza la obra');
                            refrescar();
                          }
                        }
                      },
                      U.eur(n.coste) + ', ' + n.dias + ' días'
                    )
                  : null
              );
            })
          )
        )
      );
    });
  }
  const FOCOS = () => P().FOCOS,
    CARGAS = () => P().CARGAS;
  function fichaJugador(st, p) {
    const f = P().ficha(st, p),
      H = f.historial,
      x = f.ext,
      fila = (k, v) => h('div', { class: 'fila' }, h('span', { class: 'muted' }, k), h('b', null, v));
    modal(
      h(
        'div',
        null,
        h('h3', null, p.nombre),
        h('p', { class: 'muted' }, p.pos + ', ' + p.edad + ' años, media ' + p.ovr + ', potencial ' + p.pot),
        h(
          'div',
          { class: 'chips' },
          f.rasgos.length ? f.rasgos.map(r => h('span', { class: 'chip ok', title: r.d }, r.n)) : h('span', { class: 'muted' }, 'Sin rasgos destacados')
        ),
        f.rasgos.map(r => h('p', { class: 'muted' }, r.n + ': ' + r.d)),
        seccion(
          'Atributos ocultos',
          h(
            'div',
            { class: 'tarjeta' },
            [
              ['Decisivo (clutch)', x.clutch],
              ['Aguante', x.aguante],
              ['Liderazgo', x.liderazgo],
              ['Mentalidad', x.mental]
            ].map(([k, v]) => h('div', null, h('div', { class: 'fila' }, h('span', null, k), h('b', null, Math.round(v))), barra(v, 100, '')))
          )
        ),
        seccion(
          'Desarrollo',
          h(
            'div',
            { class: 'tarjeta' },
            fila('Curva', { precoz: 'Precoz', normal: 'Normal', tardia: 'Tardía' }[f.curva]),
            fila('Pico esperado', f.pico + ' años'),
            fila('Carga acumulada', f.carga + ' / 100' + (f.carga > 70 ? ' (sobrecarga)' : '')),
            barra(f.carga, 100, f.carga > 70 ? 'mal' : ''),
            fila('Plan', FOCOS()[f.plan.foco].n + ', carga ' + CARGAS()[f.plan.carga].n.toLowerCase() + (f.plan.propio ? ' (individual)' : ''))
          )
        ),
        seccion(
          'Historial de lesiones (' + H.lesiones.length + ')',
          H.lesiones.length
            ? h(
                'div',
                { class: 'lista' },
                H.lesiones
                  .slice(0, 12)
                  .map(l =>
                    h(
                      'div',
                      { class: 'item' },
                      h('span', { class: 'muted f' }, U.fecha(l.f)),
                      h(
                        'div',
                        { class: 'ct' },
                        h('b', null, l.tipo),
                        h('span', { class: 'muted' }, l.dias + ' días' + (l.notas.length ? ', ' + l.notas.join(', ') : '') + ' (' + l.origen + ')')
                      )
                    )
                  )
              )
            : h('p', { class: 'muted' }, 'Sin lesiones registradas.')
        ),
        H.secuelas.length
          ? seccion(
              'Secuelas',
              h(
                'div',
                { class: 'lista' },
                H.secuelas.map(s =>
                  h(
                    'div',
                    { class: 'item' },
                    h(
                      'div',
                      { class: 'ct' },
                      h('b', null, s.tipo),
                      h('span', { class: 'muted' }, 'Pierde ' + s.v + ' punto' + (s.v > 1 ? 's' : '') + ' de ' + s.att + ' (' + U.fecha(s.f) + ')')
                    )
                  )
                )
              )
            )
          : null
      )
    );
  }
  function entrenoTab(el, st) {
    const E = st.entreno || (st.entreno = { colectivo: { carga: 1, foco: 'equilibrado' }, individual: {} }),
      eq = st.equipos[st.clubId],
      jug = eq.plantilla
        .map(i => st.jugadores[i])
        .filter(Boolean)
        .sort((a, b) => b.ovr - a.ovr);
    const cantera = st.cantera && st.cantera[st.clubId] ? st.cantera[st.clubId].juveniles.map(i => st.jugadores[i]).filter(Boolean) : [];
    const sel = (v, ops, fn) =>
      h(
        'select',
        {
          class: 'sel',
          onchange: e => {
            fn(e.target.value);
            refrescar();
          }
        },
        ops.map(([k, t]) => h('option', { value: k, selected: String(v) === String(k) }, t))
      );
    el.append(
      seccion(
        'Entrenamiento colectivo',
        h(
          'div',
          { class: 'tarjeta' },
          h(
            'div',
            { class: 'par' },
            h('label', { class: 'muted' }, 'Foco'),
            sel(
              E.colectivo.foco,
              Object.keys(FOCOS())
                .filter(k => k !== 'descanso')
                .map(k => [k, FOCOS()[k].n]),
              v => {
                if (GM.mods.cantera && st.cantera && st.cantera[st.clubId]) GM.mods.cantera.fijarFoco(st, st.clubId, v);
                else P().fijarColectivo(st, undefined, v);
              }
            )
          ),
          h(
            'div',
            { class: 'par' },
            h('label', { class: 'muted' }, 'Carga'),
            sel(
              E.colectivo.carga,
              CARGAS().map((c, i) => [i, c.n]),
              v => P().fijarColectivo(st, +v)
            )
          ),
          h(
            'p',
            { class: 'muted' },
            'Los lunes se aplica la semana de entrenamiento. Más carga, más progreso pero también más cansancio acumulado: por encima de 70 el jugador se resiente y aumenta el riesgo de lesión por sobrecarga. La carga baja con los días de descanso y el control de cargas del centro médico ayuda.'
          )
        )
      )
    );
    const fila = p => {
      const pl = P().plan(st, p.id),
        f = P().ficha(st, p),
        l = p.estado.lesion;
      return h(
        'div',
        { class: 'item' },
        h(
          'div',
          { class: 'ct' },
          h(
            'b',
            { style: { cursor: 'pointer' }, onclick: () => fichaJugador(st, p) },
            p.nombre +
              (f.rasgos.length
                ? ' · ' +
                  f.rasgos
                    .slice(0, 2)
                    .map(r => r.n)
                    .join(', ')
                : '')
          ),
          h('span', { class: 'muted' }, p.pos + ', ' + p.edad + ' años, media ' + p.ovr + (l ? ', lesionado ' + l.dias + ' días' : '')),
          h('div', null, barra(f.carga, 100, f.carga > 70 ? 'mal' : ''), h('span', { class: 'muted' }, 'Carga ' + f.carga))
        ),
        h(
          'div',
          { class: 'ct' },
          sel(pl.propio ? pl.foco : '', [['', 'Foco del equipo']].concat(Object.keys(FOCOS()).map(k => [k, FOCOS()[k].n])), v => {
            if (!v) P().fijarIndividual(st, p.id, null, null);
            else P().fijarIndividual(st, p.id, v, undefined);
          }),
          sel(pl.propio ? pl.carga : '', [['', 'Carga del equipo']].concat(CARGAS().map((c, i) => [i, c.n])), v => {
            if (v === '') P().fijarIndividual(st, p.id, null, null);
            else P().fijarIndividual(st, p.id, undefined, +v);
          })
        )
      );
    };
    el.append(seccion('Plantilla (' + jug.length + ')', h('div', { class: 'lista' }, jug.map(fila))));
    if (cantera.length) el.append(seccion('Cantera (' + cantera.length + ')', h('div', { class: 'lista' }, cantera.map(fila))));
  }
  addTab('club', 'arbol', 'Árbol de mejoras', arbolTab, st => !!GM.arbolInst && !!GM.mods.ciudadDeportiva && (gestor(st) || pres(st)));
  addTab('plantilla', 'entrenamiento', 'Entrenamiento', entrenoTab, st => !!GM.progresion && (gestor(st) || entr(st) || pres(st)));
})();
