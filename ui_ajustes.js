/* AJUSTES Y DATOS DEL JUGADOR (punto 82, GM.ajustes) — una sola pantalla de ajustes con seis apartados: Gráficos (nivel de calidad), Sonido (mezcla de general, música, ambiente, interfaz y voces), Controles (teclas del mundo 3D y mando),
   Idioma y accesibilidad (idioma, daltonismo, lector de pantalla, tamaño de letra, contraste), Datos (exportar e importar la partida, copias automáticas y carpeta de sincronización, que sirve de «nube» si es una carpeta de OneDrive, Dropbox o Drive del ordenador)
   y Novedades (lo que ha cambiado en cada versión; sale solo la primera vez que abres una versión nueva). En Datos y Novedades está también el informe de errores: «Descargar informe» crea un archivo para reportar un fallo (registro.js).
   Se abre desde el menú de la partida y del menú principal: GM.ajustes.abrir(apartado). Expone: abrir, NOVEDADES, novedadesPendientes, marcarNovedades, selfTest. Prueba: tools/tanda35_ui.js. */
(function () {
  const { h, modal, toast, cerrarModales } = GM.ui._;
  const NOVEDADES = [
    {
      v: '0.9.123',
      fecha: '2026-10',
      t: [
        'LEB Oro y LEB Plata con ascensos, descensos y cesiones de canteranos (también en el modo carrera).',
        'Plantillas reales de 31 clubes de Francia, Lituania, la Liga Adriática e Israel.',
        'Catalán e inglés, daltonismo, lector de pantalla, controles remapeables y mando.',
        'Interfaz dentro del mundo 3D: brújula, reloj con velocidad, objetivos y menú radial.',
        'Música dinámica, mezcla de sonido y misiones de inicio.',
        'Iconos de ciudad, vehículos y mobiliario con los colores de cada país.'
      ]
    },
    { v: '0.9.117', fecha: '2026-10', t: ['Ligas nuevas solo con datos (Francia, Lituania, Adriática e Israel), narrador del directo, móvil con apps, personajes con historia.'] },
    { v: '0.9.115', fecha: '2026-10', t: ['Árbol de instalaciones, progresión de jugadores, pizarra táctica, traspasos negociados y selecciones jugables.'] }
  ];
  const KEY = 'gm1:novedades',
    ultima = () => NOVEDADES[0].v;
  const vista = () => {
    try {
      return window.localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
  };
  const novedadesPendientes = () => vista() !== ultima();
  const marcarNovedades = () => {
    try {
      window.localStorage.setItem(KEY, ultima());
    } catch (e) {
      /* sin almacenamiento */
    }
  };
  const boton = (t, fn, cls, extra) => h('button', Object.assign({ class: 'btn ' + (cls || 'btn-sec'), style: { marginTop: '8px' }, onclick: fn }, extra || {}), t);
  const fila = (t, ...c) => h('div', { class: 'ajuste' }, h('b', null, t), ...c);
  const seg = (opts, actual, fn) =>
    h(
      'div',
      { class: 'seg' },
      opts.map(([v, n]) => h('button', { class: 'tab' + (actual === v ? ' on' : ''), onclick: () => fn(v) }, n))
    );
  const slider = (k, rot) =>
    h(
      'label',
      { class: 'ajuste', style: { display: 'block' } },
      h('b', null, rot),
      h('input', {
        type: 'range',
        min: 0,
        max: 100,
        value: Math.round(GM.musica.nivel(k) * 100),
        style: { width: '100%' },
        'aria-label': rot,
        oninput: e => GM.musica.setNivel(k, e.target.value / 100)
      })
    );
  function graficos(el, rep) {
    const CP = GM.campus,
      DESC = {
        bajo: 'Móvil flojo: sin sombras, mitad de gente, texturas de 512',
        medio: 'Móvil o PC modesto: sin sombras en tiempo real',
        alto: 'PC: sombras del sol, cielo HDRI y oclusión en interiores',
        ultra: 'PC potente: sombras lejanas, oclusión en todo y más resolución'
      };
    el.append(
      h('p', { class: 'muted' }, 'Calidad gráfica. Se aplica al abrir de nuevo el mundo 3D.'),
      h(
        'div',
        { class: 'lista' },
        (CP ? CP.NIVELES : []).map(n =>
          h(
            'button',
            {
              class: 'btn ' + (CP.config.nivel === n ? '' : 'btn-sec'),
              style: { display: 'block', width: '100%', textAlign: 'left', marginBottom: '6px' },
              onclick: () => {
                CP.setNivel(n);
                toast('Calidad ' + n);
                rep();
              }
            },
            h('b', null, n.charAt(0).toUpperCase() + n.slice(1)),
            h('span', { class: 'muted' }, ' ' + (DESC[n] || ''))
          )
        )
      )
    );
  }
  function sonido(el, rep) {
    if (!GM.musica) {
      el.append(h('p', { class: 'muted' }, 'El sonido no está disponible en este dispositivo.'));
      return;
    }
    el.append(
      boton(GM.sonido && GM.sonido.activo() ? 'Silenciar todo' : 'Activar el sonido', () => {
        if (GM.sonido) toast(GM.sonido.alternar() ? 'Sonido activado' : 'Sonido desactivado');
        rep();
      }),
      slider('general', 'General'),
      slider('musica', 'Música'),
      slider('ambiente', 'Ambiente'),
      slider('interfaz', 'Sonidos de la interfaz'),
      slider('voces', 'Voces'),
      fila(
        'Voces cortas (síntesis del navegador)',
        seg(
          [
            [true, 'Sí'],
            [false, 'No']
          ],
          GM.musica.voces(),
          v => {
            GM.musica.setVoces(v);
            if (v) GM.musica.voz('Voces activadas');
            rep();
          }
        )
      ),
      GM.diseno
        ? fila(
            'Sonidos al pulsar botones',
            seg(
              [
                [true, 'Sí'],
                [false, 'No']
              ],
              GM.diseno.sonidoActivo(),
              v => {
                GM.diseno.setSonido(v);
                rep();
              }
            )
          )
        : null
    );
  }
  function controles(el, rep) {
    if (!GM.controles) return;
    el.append(
      h(
        'p',
        { class: 'muted' },
        'Pulsa una acción y luego la tecla nueva.' +
          (GM.controles.hayMando()
            ? ' Mando conectado: stick para caminar, A interactuar, B atrás, X menú radial, Y mapa.'
            : ' Si conectas un mando, el stick camina, A interactúa, B vuelve, X abre el menú radial e Y el mapa.')
      ),
      h(
        'div',
        null,
        GM.controles.ACCIONES.map(([id, n]) =>
          h(
            'button',
            {
              class: 'tab',
              style: { margin: '2px' },
              onclick: ev => {
                ev.currentTarget.textContent = n + ': pulsa una tecla';
                const f = e => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.removeEventListener('keydown', f, true);
                  GM.controles.asignar(id, e.key.toLowerCase());
                  rep();
                };
                window.addEventListener('keydown', f, true);
              }
            },
            n + ': ' + GM.controles.tecla(id)
          )
        )
      ),
      boton('Restablecer teclas', () => {
        GM.controles.restablecer();
        rep();
      })
    );
  }
  function idioma(el, rep) {
    if (GM.i18n)
      el.append(
        fila(
          'Idioma',
          seg(
            GM.i18n.IDIOMAS.map(([v, n]) => [v, n]),
            GM.i18n.idioma(),
            v => {
              GM.i18n.setIdioma(v);
              rep();
            }
          )
        ),
        h('p', { class: 'muted' }, 'La traducción es parcial: lo que no está traducido se queda en español.')
      );
    if (GM.accesibilidad)
      el.append(
        fila(
          'Daltonismo',
          seg(GM.accesibilidad.DALTON, GM.accesibilidad.estado().dalton, v => {
            GM.accesibilidad.set('dalton', v);
            rep();
          })
        ),
        fila(
          'Lector de pantalla',
          seg(
            [
              [false, 'No'],
              [true, 'Sí']
            ],
            GM.accesibilidad.estado().lector,
            v => {
              GM.accesibilidad.set('lector', v);
              rep();
            }
          )
        )
      );
    el.append(
      boton('Tamaño de letra, contraste y animaciones', () => {
        cerrarModales();
        GM.ui._.accesModal();
      })
    );
    if (GM.misiones)
      el.append(
        boton('Mostrar las ayudas de cada pantalla otra vez', () => {
          GM.misiones.reiniciarAyudas();
          toast('Las ayudas volverán a salir');
        })
      );
  }
  function datos(el) {
    const U = GM.ui._,
      st = GM.state;
    el.append(
      boton('Exportar la partida', () => {
        cerrarModales();
        U.dialogoExportar();
      }),
      boton('Importar una partida', () => {
        cerrarModales();
        U.dialogoImportar();
      }),
      U.copiasModal
        ? boton('Copias automáticas y carpeta de sincronización', () => {
            cerrarModales();
            U.copiasModal();
          })
        : null,
      h(
        'p',
        { class: 'muted' },
        'Carpeta de sincronización: elige una carpeta que ya sincronice OneDrive, Dropbox o Google Drive en tu ordenador y cada autoguardado se copia allí. Así tienes tu partida «en la nube» sin cuentas ni servidores nuestros.'
      ),
      h('h4', null, 'Informe de errores'),
      h(
        'p',
        { class: 'muted' },
        'Errores registrados en este dispositivo: ' +
          (GM.registro ? GM.registro.lista().length : 0) +
          '. El informe no incluye tu partida ni datos personales: solo la versión, el navegador, el modo y los últimos errores.'
      ),
      boton('Descargar el informe', () => {
        if (GM.registro) GM.registro.descargar().then(ok => toast(ok ? 'Informe descargado' : 'No se pudo crear el archivo'));
      }),
      boton('Vaciar el registro', () => {
        if (GM.registro) GM.registro.vaciar();
        toast('Registro vaciado');
      }),
      st ? null : null
    );
  }
  function novedades(el) {
    marcarNovedades();
    NOVEDADES.forEach(n =>
      el.append(
        h('h4', null, 'Versión ' + n.v),
        h(
          'ul',
          { class: 'cronica' },
          n.t.map(x => h('li', null, x))
        )
      )
    );
  }
  const APARTADOS = [
    ['graficos', 'Gráficos', graficos],
    ['sonido', 'Sonido', sonido],
    ['controles', 'Controles', controles],
    ['idioma', 'Idioma y accesibilidad', idioma],
    ['datos', 'Datos', datos],
    ['novedades', 'Novedades', novedades]
  ];
  function abrir(apartado) {
    let act = APARTADOS.some(a => a[0] === apartado) ? apartado : 'graficos';
    const cuerpo = h('div');
    const pintar = () => {
      cuerpo.replaceChildren(
        h('h3', null, 'Ajustes'),
        h(
          'div',
          { class: 'tabs' },
          APARTADOS.map(([id, n]) =>
            h(
              'button',
              {
                class: 'tab' + (act === id ? ' on' : ''),
                onclick: () => {
                  act = id;
                  pintar();
                }
              },
              n
            )
          )
        ),
        (() => {
          const c = h('div');
          APARTADOS.find(a => a[0] === act)[2](c, pintar);
          return c;
        })()
      );
    };
    pintar();
    modal(cuerpo, [{ t: 'Cerrar', cls: 'btn-sec' }]);
  }
  // la primera vez que se abre una versión nueva salen las novedades
  let avisado = false;
  if (GM.bus)
    GM.bus.on('pantalla:abierta', () => {
      if (avisado || !GM.state || !novedadesPendientes()) return;
      avisado = true;
      if (vista() === null) {
        marcarNovedades();
        return;
      }
      setTimeout(() => abrir('novedades'), 600);
    });
  function selfTest() {
    const a = vista();
    marcarNovedades();
    const ok = !novedadesPendientes() && APARTADOS.length === 6 && NOVEDADES[0].t.length > 0;
    try {
      if (a === null) window.localStorage.removeItem(KEY);
      else window.localStorage.setItem(KEY, a);
    } catch (e) {
      /* sin almacenamiento */
    }
    return ok;
  }
  GM.ajustes = { abrir, NOVEDADES, novedadesPendientes, marcarNovedades, selfTest };
  GM.register && GM.register('ajustes', GM.ajustes);
})();
