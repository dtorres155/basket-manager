/* SISTEMA DE DISEÑO (punto 70, GM.diseno) — las piezas con las que se monta cualquier pantalla nueva, documentadas en la galería (pantalla «muestra», menú Ajustes) y probadas con tools/diseno_prueba.js.
   - Tokens (estilos.css, capa «Sistema de diseño»): espaciado --e1 a --e6, radios --r1 a --r3, sombras --sh1 a --sh3, movimiento --t-rapido 150 ms, --t-medio 200 ms y --t-lento 250 ms con la curva --curva, y los colores de siempre
     (--bg, --bg2, --bg3, --tinta, --mut, --linea, --ok, --mal, --amb) en claro y noche. Los colores del club (--club, --club2) los pone cada partida.
   - Tema: claro, noche o automático (sigue el del sistema); se guarda en este dispositivo (setTema, tema).
   - Componentes que devuelven DOM (con GM.h): vacio (estado vacío con acción), tablaOrd (lista ordenable con búsqueda y filtros), spark (mini gráfico), medidor, panel (plegable), dato (cifra con tendencia), segmentado, cinta (resumen en chips),
     aviso y lista. Los gráficos grandes siguen siendo GM.ui.grafico.
   - Atajos de teclado: registrarAtajo(tecla, descripción, función, ámbito) y la ayuda con «?». Por defecto, 1 a 9 abren el apartado del menú, «/» busca, «m» abre el móvil, «Esc» cierra.
   - Sonidos de interfaz: clic, ok, error y abrir (WebAudio, muy suaves; se pueden quitar en Accesibilidad). Se enganchan solos a botones y pestañas.
   Expone: tema, setTema, tokens, vacio, tablaOrd, spark, medidor, panel, dato, segmentado, cinta, registrarAtajo, atajos, ayudaAtajos, sonido, sonidoActivo, setSonido, selfTest. */
(function () {
  const h = (...a) => GM.h(...a),
    U = GM.util;
  const TOKENS = {
    espaciado: [
      ['--e1', '4 px'],
      ['--e2', '8 px'],
      ['--e3', '12 px'],
      ['--e4', '16 px'],
      ['--e5', '24 px'],
      ['--e6', '32 px']
    ],
    radios: [
      ['--r1', '4 px'],
      ['--r2', '8 px'],
      ['--r3', '14 px']
    ],
    sombras: [
      ['--sh1', 'tarjetas'],
      ['--sh2', 'paneles y menús'],
      ['--sh3', 'ventanas']
    ],
    movimiento: [
      ['--t-rapido', '150 ms: pulsaciones y chips'],
      ['--t-medio', '200 ms: pestañas y listas'],
      ['--t-lento', '250 ms: ventanas y paneles']
    ],
    color: [
      ['--bg', 'fondo'],
      ['--bg2', 'tarjetas'],
      ['--bg3', 'fondo de controles'],
      ['--tinta', 'texto'],
      ['--mut', 'texto secundario'],
      ['--linea', 'bordes'],
      ['--ok', 'correcto'],
      ['--mal', 'error'],
      ['--amb', 'aviso'],
      ['--club', 'color del club']
    ]
  };
  // ---------- Tema ----------
  const tema = () => {
    try {
      return window.localStorage.getItem('gm1:tema') || 'auto';
    } catch (e) {
      return 'auto';
    }
  };
  function aplicaTema(t) {
    const r = document.documentElement;
    let real = t;
    if (t === 'auto') {
      try {
        real = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'noche' : 'dia';
      } catch (e) {
        real = 'dia';
      }
    }
    r.setAttribute('data-tema', real === 'noche' ? 'noche' : 'dia');
    r.setAttribute('data-tema-pref', t);
  }
  function setTema(t) {
    if (['auto', 'dia', 'noche'].indexOf(t) < 0) t = 'auto';
    try {
      window.localStorage.setItem('gm1:tema', t);
    } catch (e) {
      /* sin almacenamiento */
    }
    aplicaTema(t);
  }
  try {
    aplicaTema(tema());
    if (window.matchMedia)
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (tema() === 'auto') aplicaTema('auto');
      });
  } catch (e) {
    /* sin matchMedia */
  }
  // ---------- Componentes ----------
  const vacio = o =>
    h(
      'div',
      { class: 'dz-vacio' },
      h('div', { class: 'dz-vacio-ic' }, o.icono || '○'),
      h('b', null, o.titulo || 'Aquí no hay nada todavía'),
      o.texto ? h('p', { class: 'muted' }, o.texto) : null,
      o.accion ? h('button', { class: 'btn peq', onclick: o.accion.fn }, o.accion.t) : null
    );
  const ESTADO_TABLA = {};
  // columnas: [{ k, t, fmt(fila), num (orden numérico), corto (se oculta en pantallas estrechas), cls }]; filas: objetos; onFila(fila); filtros: [{ k, t, ops:[[valor, texto]] }]
  function tablaOrd(o) {
    const id = o.id || 'tabla',
      E = ESTADO_TABLA[id] || (ESTADO_TABLA[id] = { k: o.orden ? o.orden.k : null, dir: o.orden ? o.orden.dir : -1, q: '', f: {} }),
      cont = h('div', { class: 'dz-tabla' });
    const val = (f, c) => (c.valor ? c.valor(f) : f[c.k]);
    function pinta() {
      cont.innerHTML = '';
      let L = o.filas.slice();
      const q = E.q.toLowerCase().trim();
      if (q)
        L = L.filter(f =>
          o.columnas.some(
            c =>
              String(val(f, c) === undefined ? '' : val(f, c))
                .toLowerCase()
                .indexOf(q) >= 0
          )
        );
      (o.filtros || []).forEach(fl => {
        if (E.f[fl.k]) L = L.filter(f => String(f[fl.k]) === E.f[fl.k]);
      });
      if (E.k) {
        const c = o.columnas.find(x => x.k === E.k);
        if (c)
          L.sort((a, b) => {
            const x = val(a, c),
              y = val(b, c);
            return (c.num ? x - y : String(x).localeCompare(String(y), 'es')) * E.dir;
          });
      }
      const barra = h('div', { class: 'dz-tabla-barra' });
      if (o.buscar !== false)
        barra.append(
          h('input', {
            class: 'sel',
            type: 'search',
            placeholder: o.placeholder || 'Buscar',
            value: E.q,
            'aria-label': 'Buscar',
            oninput: e => {
              E.q = e.target.value;
              clearTimeout(E.t);
              E.t = setTimeout(() => {
                pinta();
                const i = cont.querySelector('input[type=search]');
                if (i) {
                  i.focus();
                  i.setSelectionRange(i.value.length, i.value.length);
                }
              }, 200);
            }
          })
        );
      (o.filtros || []).forEach(fl =>
        barra.append(
          h(
            'select',
            {
              class: 'sel',
              'aria-label': fl.t,
              onchange: e => {
                E.f[fl.k] = e.target.value;
                pinta();
              }
            },
            [h('option', { value: '' }, fl.t)].concat(fl.ops.map(([v, t]) => h('option', { value: v, selected: E.f[fl.k] === String(v) }, t)))
          )
        )
      );
      cont.append(barra);
      const cab = h(
        'div',
        { class: 'dz-fila dz-cab', role: 'row' },
        o.columnas.map(c =>
          h(
            'button',
            {
              class: 'dz-celda ' + (c.cls || '') + (c.corto ? ' dz-corto' : '') + (E.k === c.k ? ' on' : ''),
              'aria-sort': E.k === c.k ? (E.dir > 0 ? 'ascending' : 'descending') : 'none',
              onclick: () => {
                if (E.k === c.k) E.dir = -E.dir;
                else {
                  E.k = c.k;
                  E.dir = c.num ? -1 : 1;
                }
                pinta();
              }
            },
            c.t + (E.k === c.k ? (E.dir > 0 ? ' ▲' : ' ▼') : '')
          )
        )
      );
      cont.append(cab);
      if (!L.length) {
        cont.append(
          vacio(
            o.vacio || {
              titulo: 'Sin resultados',
              texto: 'Prueba con otra búsqueda o quita algún filtro.',
              accion: {
                t: 'Quitar filtros',
                fn: () => {
                  E.q = '';
                  E.f = {};
                  pinta();
                }
              }
            }
          )
        );
        return;
      }
      L.slice(0, o.max || 200).forEach(f =>
        cont.append(
          h(
            o.onFila ? 'button' : 'div',
            { class: 'dz-fila' + (o.onFila ? ' dz-clic' : ''), onclick: o.onFila ? () => o.onFila(f) : null },
            o.columnas.map(c =>
              h('span', { class: 'dz-celda ' + (c.cls || '') + (c.corto ? ' dz-corto' : '') }, c.fmt ? c.fmt(f) : val(f, c) === undefined ? '' : String(val(f, c)))
            )
          )
        )
      );
      cont.append(h('div', { class: 'muted dz-pie' }, L.length + (L.length === 1 ? ' resultado' : ' resultados')));
    }
    pinta();
    return cont;
  }
  // Mini gráfico de línea (SVG): valores numéricos, color y relleno opcionales
  function spark(vals, o) {
    o = o || {};
    const w = o.w || 96,
      hh = o.h || 28,
      v = (vals || []).filter(x => typeof x === 'number' && isFinite(x)),
      ns = 'http://www.w3.org/2000/svg',
      svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + hh);
    svg.setAttribute('width', w);
    svg.setAttribute('height', hh);
    svg.setAttribute('class', 'dz-spark');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', o.etq || 'Evolución');
    if (v.length < 2) return svg;
    const mn = Math.min.apply(null, v),
      mx = Math.max.apply(null, v),
      r = mx - mn || 1,
      pt = (x, i) => [Math.round((i / (v.length - 1)) * (w - 4) * 10) / 10 + 2, Math.round((hh - 4 - ((x - mn) / r) * (hh - 8)) * 10) / 10 + 2];
    const P = v.map(pt),
      d = P.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' '),
      col = o.color || (v[v.length - 1] >= v[0] ? 'var(--ok)' : 'var(--mal)');
    if (o.relleno !== false) {
      const a = document.createElementNS(ns, 'path');
      a.setAttribute('d', d + ' L' + P[P.length - 1][0] + ' ' + hh + ' L' + P[0][0] + ' ' + hh + ' Z');
      a.setAttribute('fill', col);
      a.setAttribute('opacity', '0.15');
      svg.appendChild(a);
    }
    const l = document.createElementNS(ns, 'path');
    l.setAttribute('d', d);
    l.setAttribute('fill', 'none');
    l.setAttribute('stroke', col);
    l.setAttribute('stroke-width', '1.6');
    l.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(l);
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', P[P.length - 1][0]);
    c.setAttribute('cy', P[P.length - 1][1]);
    c.setAttribute('r', '2.2');
    c.setAttribute('fill', col);
    svg.appendChild(c);
    return svg;
  }
  // Medidor con etiqueta y tramos de color: umbrales [[hasta, clase]]
  function medidor(valor, max, o) {
    o = o || {};
    max = max || 100;
    const p = U.clamp((valor / max) * 100, 0, 100),
      um = o.umbrales || [
        [33, 'rojo'],
        [66, 'ambar'],
        [100, 'verde']
      ],
      cl = (um.find(u => p <= u[0]) || um[um.length - 1])[1];
    return h(
      'div',
      { class: 'dz-medidor', role: 'meter', 'aria-valuenow': Math.round(valor), 'aria-valuemin': 0, 'aria-valuemax': max, 'aria-label': o.etq || 'Medidor' },
      o.etq ? h('div', { class: 'dz-medidor-cab' }, h('span', { class: 'muted' }, o.etq), h('b', null, o.texto !== undefined ? o.texto : Math.round(valor) + ' / ' + max)) : null,
      h('span', { class: 'barra ' + cl }, h('i', { style: { width: p + '%' } }))
    );
  }
  const panel = (titulo, contenido, o) => {
    o = o || {};
    const abierto = o.abierto !== false,
      cont = h('div', { class: 'dz-panel-c' }, contenido),
      cab = h(
        'button',
        {
          class: 'dz-panel-cab',
          'aria-expanded': String(abierto),
          onclick: () => {
            const a = cab.getAttribute('aria-expanded') !== 'true';
            cab.setAttribute('aria-expanded', String(a));
            cont.style.display = a ? '' : 'none';
          }
        },
        h('b', null, titulo),
        h('span', { class: 'muted' }, o.resumen || ''),
        h('i', { class: 'dz-flecha' }, '▾')
      );
    if (!abierto) cont.style.display = 'none';
    return h('div', { class: 'dz-panel' }, cab, cont);
  };
  const dato = (etq, valor, o) => {
    o = o || {};
    const d = o.delta;
    return h(
      'div',
      { class: 'dz-dato' },
      h('span', { class: 'muted' }, etq),
      h('b', null, valor),
      d !== undefined && d !== null
        ? h('span', { class: 'dz-delta ' + (d > 0 ? 'sube' : d < 0 ? 'baja' : '') }, (d > 0 ? '▲ ' : d < 0 ? '▼ ' : '= ') + (o.fmtDelta ? o.fmtDelta(d) : Math.abs(d)))
        : null,
      o.spark ? spark(o.spark, { w: 72, h: 22 }) : null
    );
  };
  const segmentado = (ops, valor, fn, etq) =>
    h(
      'div',
      { class: 'seg', role: 'group', 'aria-label': etq || 'Opciones' },
      ops.map(([v, t]) => h('button', { class: 'tab' + (valor === v ? ' on' : ''), 'aria-pressed': String(valor === v), onclick: () => fn(v) }, t))
    );
  const cinta = items =>
    h(
      'div',
      { class: 'chips' },
      items.map(([t, c]) => h('span', { class: 'chip' + (c ? ' ' + c : '') }, t))
    );
  // Consejo contextual: una tarjeta que explica la pantalla la primera vez y se cierra para siempre (se guarda en este dispositivo)
  function consejo(id, texto, titulo) {
    let vistos = {};
    try {
      vistos = JSON.parse(window.localStorage.getItem('gm1:consejos') || '{}');
    } catch (e) {
      vistos = {};
    }
    if (vistos[id]) return null;
    const c = h(
      'div',
      { class: 'dz-consejo', role: 'note' },
      h('div', { class: 'ct' }, h('b', null, titulo || 'Consejo'), h('span', null, texto)),
      h(
        'button',
        {
          class: 'btn btn-sec peq',
          'aria-label': 'Entendido',
          onclick: () => {
            vistos[id] = 1;
            try {
              window.localStorage.setItem('gm1:consejos', JSON.stringify(vistos));
            } catch (e) {
              /* sin almacenamiento */
            }
            c.remove();
          }
        },
        'Entendido'
      )
    );
    return c;
  }
  // ---------- Sonidos de interfaz ----------
  let ctxAudio = null;
  const sonidoActivo = () => {
    try {
      return window.localStorage.getItem('gm1:sonidoui') !== 'no';
    } catch (e) {
      return true;
    }
  };
  const setSonido = on => {
    try {
      window.localStorage.setItem('gm1:sonidoui', on ? 'si' : 'no');
    } catch (e) {
      /* sin almacenamiento */
    }
  };
  const NOTAS = {
    clic: [[520, 0.035, 0.05]],
    ok: [
      [520, 0.06, 0.06],
      [780, 0.09, 0.07]
    ],
    error: [
      [220, 0.12, 0.07],
      [165, 0.14, 0.07]
    ],
    abrir: [
      [390, 0.05, 0.05],
      [585, 0.07, 0.05]
    ]
  };
  function sonido(tipo) {
    if (!sonidoActivo()) return false;
    if (GM.muestras && GM.muestras.tocar({ clic: 'clic', ok: 'confirmar', error: 'error', abrir: 'abrir', cerrar: 'cerrar' }[tipo] || 'clic')) return true; // efecto real si está cargado (muestras.js)
    try {
      const A = window.AudioContext || window.webkitAudioContext;
      if (!A) return false;
      ctxAudio = ctxAudio || new A();
      if (ctxAudio.state === 'suspended') ctxAudio.resume();
      let t = ctxAudio.currentTime;
      (NOTAS[tipo] || NOTAS.clic).forEach(([f, d, v]) => {
        const o = ctxAudio.createOscillator(),
          g = ctxAudio.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(v, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.02);
        o.connect(g);
        g.connect(ctxAudio.destination);
        o.start(t);
        o.stop(t + d + 0.05);
        t += d * 0.7;
      });
      return true;
    } catch (e) {
      return false;
    }
  }
  if (typeof document !== 'undefined')
    document.addEventListener(
      'click',
      e => {
        const b = e.target && e.target.closest ? e.target.closest('button, .tab, .jug, .navb') : null;
        if (b && !b.disabled && !b.hasAttribute('data-mudo')) sonido(b.classList.contains('peligro') ? 'error' : 'clic');
      },
      true
    );
  // ---------- Atajos de teclado ----------
  const ATAJOS = [];
  function registrarAtajo(tecla, desc, fn, ambito) {
    const i = ATAJOS.findIndex(a => a.tecla === tecla && a.ambito === (ambito || 'general'));
    const a = { tecla, desc, fn, ambito: ambito || 'general' };
    if (i >= 0) ATAJOS[i] = a;
    else ATAJOS.push(a);
    return a;
  }
  const atajos = () => ATAJOS.slice();
  function ayudaAtajos() {
    const cuerpo = h(
      'div',
      null,
      h('h3', null, 'Atajos de teclado'),
      h(
        'div',
        { class: 'lista' },
        ATAJOS.map(a =>
          h('div', { class: 'item' }, h('kbd', { class: 'dz-tecla' }, a.tecla), h('div', { class: 'ct' }, h('span', null, a.desc), h('span', { class: 'muted' }, a.ambito)))
        )
      )
    );
    if (GM.ui && GM.ui._ && GM.ui._.modal) GM.ui._.modal(cuerpo, [{ t: 'Cerrar', cls: 'btn-sec' }]);
    return cuerpo;
  }
  function manejaTecla(e) {
    const t = e.target,
      tag = t && t.tagName ? t.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || (t && t.isContentEditable) || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const mundo = GM.sede && GM.sede.activa && GM.sede.activa();
    const a = ATAJOS.find(x => x.tecla === k && (x.ambito === 'general' || (x.ambito === 'mundo') === !!mundo));
    if (!a) return;
    if (a.ambito === 'general' && mundo && /^[1-9]$/.test(k)) return;
    if (a.fn(e) !== false) e.preventDefault();
  }
  if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('keydown', manejaTecla);
  function selfTest() {
    const st = tablaOrd({
        id: 'prueba',
        columnas: [
          { k: 'n', t: 'Nombre' },
          { k: 'v', t: 'Valor', num: true }
        ],
        filas: [
          { n: 'b', v: 2 },
          { n: 'a', v: 9 },
          { n: 'c', v: 5 }
        ],
        orden: { k: 'v', dir: -1 }
      }),
      filas = st.querySelectorAll('.dz-fila:not(.dz-cab)');
    delete ESTADO_TABLA.prueba;
    const sp = spark([1, 3, 2, 5]),
      v = vacio({ titulo: 'x' }),
      m = medidor(70, 100, { etq: 'Forma' });
    let fired = 0;
    registrarAtajo(
      'ñ',
      'prueba',
      () => {
        fired++;
        return false;
      },
      'general'
    );
    manejaTecla({ key: 'ñ', target: document.body });
    ATAJOS.splice(
      ATAJOS.findIndex(a => a.tecla === 'ñ'),
      1
    );
    return (
      filas.length === 3 &&
      filas[0].textContent.indexOf('a') >= 0 &&
      !!sp.querySelector('path') &&
      !!v.querySelector('b') &&
      m.getAttribute('role') === 'meter' &&
      fired === 1 &&
      ['auto', 'dia', 'noche'].indexOf(tema()) >= 0
    );
  }
  GM.diseno = {
    consejo,
    TOKENS,
    tema,
    setTema,
    vacio,
    tablaOrd,
    spark,
    medidor,
    panel,
    dato,
    segmentado,
    cinta,
    registrarAtajo,
    atajos,
    ayudaAtajos,
    sonido,
    sonidoActivo,
    setSonido,
    selfTest
  };
  GM.register && GM.register('diseno', GM.diseno);
})();
