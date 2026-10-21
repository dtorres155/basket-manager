/* Paneles de sala dentro del mundo 3D: abrir una sala, pintar su panel y la ficha de la gente, y refrescarlos.
   Se separó de sede3d.js: GM.sedePaneles({ S: () => escena activa, U, anim, cambiarEscena, destino, ejecutar, flotar, barra, avanzar, entrarClasica, repoblar }) devuelve { abrirSala, pintarPanel, pintarFicha, refrescarSala, reaccion }. */
(function () {
  GM.sedePaneles = function (ctx) {
    const { U, anim, cambiarEscena, destino, ejecutar, flotar, barra, avanzar, entrarClasica, repoblar } = ctx;
    const S = new Proxy(
      {},
      {
        get: (_, k) => ctx.S()[k],
        set: (_, k, v) => {
          ctx.S()[k] = v;
          return true;
        }
      }
    ); // la escena activa cambia al abrir otra: se lee en cada acceso
    function abrirSala(sala, panelId) {
      if (!panelId) GM.bus.emit('sala:abierta', { id: sala.id, escena: S.escena });
      const h = GM.h,
        st = S.st,
        A = GM.mods.sedeAcciones,
        P = S.panel;
      P.innerHTML = '';
      P.className = 'sede-hud sede-sala tema-' + (panelId || sala.id);
      P.style.display = 'flex';
      P.append(
        h(
          'div',
          { class: 'sp-cab' },
          panelId ? h('button', { class: 'sp-volver', onclick: () => abrirSala(sala) }, '‹') : null,
          h('b', null, panelId ? (A.acciones(st, sala.id).find(x => x.id === panelId) || {}).t || sala.nombre : sala.nombre),
          h(
            'button',
            {
              class: 'sp-x',
              'aria-label': 'Cerrar',
              onclick: () => {
                P.style.display = 'none';
              }
            },
            '×'
          )
        )
      );
      const cuerpo = h('div', { class: 'sp-cuerpo' });
      P.append(cuerpo);
      if (panelId) pintarPanel(panelId, cuerpo, sala);
      else {
        if (sala.ficha && sala.ficha(st)) pintarFicha(cuerpo, sala);
        else if (sala.acciones)
          sala.acciones(st).forEach(x =>
            cuerpo.append(
              h(
                'button',
                {
                  class: 'sp-accion',
                  disabled: !x.disponible,
                  onclick: () => {
                    const r = x.fn();
                    GM.ui.toast(r.ok ? r.texto || 'Hecho' : r.motivo || 'No disponible');
                    if (r.ok) {
                      reaccion(r.texto || '', sala);
                      if (S && S.escena === 'pueblo' && x.id === 'obra') {
                        S.zonaActual = null;
                        cambiarEscena('pueblo');
                        return;
                      }
                    }
                    if (S) abrirSala(sala);
                  }
                },
                h('b', null, x.t),
                h('span', null, x.disponible ? x.d : x.motivo || x.d)
              )
            )
          );
        else if (!A) cuerpo.append(h('p', null, sala.accion));
        else
          A.acciones(st, sala.id).forEach(x =>
            cuerpo.append(
              h(
                'button',
                { class: 'sp-accion' + (x.panel ? ' abre' : ''), disabled: !x.disponible, onclick: () => (x.panel ? abrirSala(sala, x.id) : ejecutar(x.id, sala)) },
                h('b', null, x.t),
                h('span', null, x.disponible ? x.d : x.motivo)
              )
            )
          );
      }
      if (sala.irA && !panelId)
        cuerpo.prepend(h('button', { class: 'pb-entrar sp-ir', onclick: () => cambiarEscena(sala.irA) }, GM.iconos ? GM.iconos.el('puerta', 18) : null, sala.boton || 'Ir'));
      const d = destino(sala);
      if (d) P.append(h('button', { class: 'sp-link', onclick: () => entrarClasica(d) }, 'Abrir la pantalla completa'));
    }
    function pintarPanel(id, c, sala) {
      const h = GM.h,
        st = S.st,
        A = GM.mods.sedeAcciones,
        eq = st.equipos[st.clubId];
      if (id === 'plantilla') {
        const ps = eq.plantilla
          .map(i => st.jugadores[i])
          .filter(p => p && p.id !== 'yo')
          .sort((a, b) => b.ovr - a.ovr);
        c.append(
          h(
            'div',
            { class: 'sp-cartas' },
            ps.map(p =>
              h(
                'div',
                { class: 'sp-carta' + (p.estado.lesion ? ' lesion' : '') },
                h('b', null, p.nombre.split(' ').slice(-1)[0]),
                h('span', null, p.pos + ', ' + p.ovr),
                barra('Ánimo', p.estado.moral),
                barra('Forma', p.estado.forma),
                p.estado.lesion ? h('em', null, 'Lesionado, ' + p.estado.lesion.dias + ' d') : null
              )
            )
          )
        );
      } else if (id === 'pizarra') {
        const t = A.pizarra(st),
          opc = (campo, lista) =>
            h(
              'div',
              { class: 'sp-tiza' },
              lista.map(([v, txt]) =>
                h(
                  'button',
                  {
                    class: t[campo] === v ? 'on' : '',
                    onclick: () => {
                      const r = A.fijarTactica(st, campo, v);
                      if (!r.ok) GM.ui.toast(r.motivo);
                      abrirSala(sala, 'pizarra');
                    }
                  },
                  txt
                )
              )
            );
        c.append(
          h('p', { class: 'sp-tit' }, 'Ritmo'),
          opc('ritmo', [
            [2, 'Pausado'],
            [3, 'Normal'],
            [4, 'Rápido'],
            [5, 'A tope']
          ]),
          h('p', { class: 'sp-tit' }, 'Defensa'),
          opc('defensa', [
            ['hombre', 'Individual'],
            ['zona', 'Zona'],
            ['mixta', 'Mixta']
          ]),
          h('p', { class: 'sp-tit' }, 'Ataque'),
          opc('foco', [
            ['equilibrado', 'Equilibrado'],
            ['exterior', 'Tiro exterior'],
            ['interior', 'Juego interior']
          ]),
          h('p', { class: 'sp-tit' }, 'Quinteto'),
          h(
            'div',
            { class: 'sp-quinteto' },
            t.quinteto.map(p => h('span', null, p.pos + ' ' + p.nombre.split(' ').slice(-1)[0]))
          )
        );
      } else if (id === 'lesionados') {
        const ls = A.lesionados(st);
        if (!ls.length) c.append(h('p', null, 'Nadie en la camilla. El fisio aprovecha para ordenar el botiquín.'));
        ls.forEach(p =>
          c.append(
            h(
              'div',
              { class: 'sp-fila' },
              h(
                'div',
                null,
                h('b', null, p.nombre),
                h('span', null, p.estado.lesion.tipo + ', ' + p.estado.lesion.dias + ' días' + (p.estado.lesion.tratado ? ', en tratamiento intensivo' : ''))
              ),
              p.estado.lesion.tratado
                ? null
                : h(
                    'button',
                    {
                      class: 'btn peq',
                      onclick: () => {
                        const r = A.tratar(st, p.id);
                        GM.ui.toast(r.ok ? r.texto : r.motivo);
                        abrirSala(sala, 'lesionados');
                      }
                    },
                    'Tratamiento intensivo, ' + U.eur(A.COSTE_TRAT)
                  )
            )
          )
        );
      } else if (id === 'rueda') {
        const rp = A.ruedaPrensa(st);
        c.append(h('div', { class: 'sp-pregunta' }, h('span', null, 'Periodista'), rp.pregunta));
        rp.respuestas.forEach((t, i) =>
          c.append(
            h(
              'button',
              {
                class: 'sp-respuesta',
                onclick: () => {
                  const r = A.responder(st, i);
                  GM.ui.toast(r.ok ? r.texto : r.motivo);
                  if (r.ok) reaccion(r.texto, sala);
                  abrirSala(sala);
                }
              },
              '«' + t + '»'
            )
          )
        );
      } else if (id === 'ordenador') {
        const o = A.ordenador(st);
        c.append(
          h(
            'div',
            { class: 'sp-ventana' },
            h('div', { class: 'sp-barra' }, 'Gestión deportiva, ' + eq.siglas),
            h('p', null, 'Caja ' + U.eur(o.caja) + ', masa salarial ' + U.eur(o.masa) + ' de ' + U.eur(o.tope)),
            h('p', { class: 'sp-tit' }, 'Agentes libres'),
            o.libres.map(x =>
              h(
                'div',
                { class: 'sp-fila' },
                h('div', null, h('b', null, x.p.nombre + ' (' + x.p.ovr + ')'), h('span', null, x.p.pos + ', ' + x.p.edad + ' años, pide ' + U.eur(x.pide) + ' al año')),
                h(
                  'button',
                  {
                    class: 'btn peq',
                    onclick: () => {
                      const r = A.ofrecer(st, x.p.id);
                      GM.ui.toast(r.ok ? '¡' + x.p.nombre + ' firma por 2 temporadas!' : r.motivo);
                      if (r.ok) repoblar();
                      abrirSala(sala, 'ordenador');
                    }
                  },
                  'Ofrecer'
                )
              )
            ),
            h('p', { class: 'sp-tit' }, 'Contratos que acaban'),
            o.renov.length
              ? o.renov.map(x =>
                  h(
                    'div',
                    { class: 'sp-fila' },
                    h('div', null, h('b', null, x.p.nombre + ' (' + x.p.ovr + ')'), h('span', null, 'Hasta ' + x.p.contrato.hasta + ', pide ' + U.eur(x.pide))),
                    h(
                      'button',
                      {
                        class: 'btn peq',
                        onclick: () => {
                          const r = A.renovar(st, x.p.id);
                          GM.ui.toast(r.ok ? x.p.nombre + ' renueva' : r.motivo);
                          abrirSala(sala, 'ordenador');
                        }
                      },
                      'Renovar'
                    )
                  )
                )
              : h('p', null, 'Ninguno este año.')
          )
        );
      } else if (id === 'noticias') {
        const club = st.equipos[st.clubId],
          ns = (st.noticias || []).slice(0, 10);
        c.append(
          h(
            'div',
            { class: 'sp-periodico' },
            h('div', { class: 'sp-cabecera-diario' }, 'El Diario de ' + club.ciudad),
            h('span', { class: 'sp-fecha' }, U.fechaLarga(st.fecha)),
            ns.length ? ns.map((n, i) => h('p', { class: i ? '' : 'portada' }, n.texto)) : h('p', null, 'Hoy no hay noticias del club.')
          )
        );
      } else if (id === 'partido') {
        const C = GM.mods.competiciones,
          g = C.proximoPartido(st, st.clubId);
        if (!g) c.append(h('p', null, 'No quedan partidos esta temporada.'));
        else {
          const L = st.equipos[g.local],
            V = st.equipos[g.visitante];
          c.append(
            h(
              'div',
              { class: 'sp-ticket' },
              h('span', null, U.fechaLarga(g.fecha) + (g.fecha === st.fecha ? ', hoy' : '')),
              h('b', null, L.siglas + '  vs  ' + V.siglas),
              h('span', null, L.nombre + ' contra ' + V.nombre),
              h('span', null, g.local === st.clubId ? 'En casa, ' + L.pabellon.nombre : 'Fuera, ' + L.pabellon.nombre)
            )
          );
        }
        c.append(
          h(
            'div',
            { class: 'sp-botones' },
            h(
              'button',
              {
                class: 'btn',
                onclick: () => {
                  avanzar(() => GM.ui.jugarUnDia());
                }
              },
              g && g.fecha === st.fecha ? 'Jugar el partido' : 'Avanzar un día'
            ),
            h('button', { class: 'btn btn-sec', onclick: () => avanzar(() => GM.ui.hastaPartido()) }, 'Hasta el partido')
          )
        );
      }
    }
    function pintarFicha(c, sala) {
      const st = S.st,
        hecho = r => {
          if (!S) return;
          GM.ui.toast(r.ok ? r.texto || 'Hecho' : r.motivo || 'No disponible');
          if (r.ok) {
            reaccion(r.texto || '', sala);
            if (r.reconstruir && S.escena === 'pueblo') {
              S.zonaActual = null;
              cambiarEscena('pueblo');
              return;
            }
          }
          abrirSala(sala);
        };
      GM.iconos.ficha(c, sala.ficha(st), hecho);
    }
    function refrescarSala() {
      if (S.zonaActual && S.panel.style.display !== 'none' && !/tema-(rueda|ordenador|pizarra|lesionados|plantilla|partido)/.test(S.panel.className)) abrirSala(S.zonaActual.sala);
    }
    function reaccion(texto, sala) {
      const m = /([a-zá-úñ]+) ([+−-]\d+)/i.exec(texto || ''),
        etq = m ? m[2] + ' ' + m[1] : '✓';
      S.gente
        .filter(n => !n.fijo)
        .forEach((n, i) => {
          setTimeout(() => {
            if (!S) return;
            flotar(etq, n.obj, /[−-]/.test(etq) ? '#ffb4a8' : '#b8f5c8');
            if (!n.camino || !n.camino.length) {
              anim(n, 'emote-yes');
              n.espera = 3;
            }
          }, i * 60);
        });
    }
    return { abrirSala, pintarPanel, pintarFicha, refrescarSala, reaccion };
  };
})();
