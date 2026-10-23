/* PRUEBAS DENTRO DEL JUEGO (GM.pruebas), puntos 86 a 88 y 90 de docs/HOJA_DE_RUTA_2.md. Sirven para que el usuario solo tenga que jugar:
   - medir(): recorrido automático por la calle, el pabellón por dentro, la sede y el pueblo; mide la carga, los fps (8 s girando la cámara),
     las llamadas de dibujo y los triángulos, y lo compara con PRESUPUESTO. Informe en rendimiento/<fecha>.json.
   - anotar() (tecla F8): captura de la ventana, una frase (se puede dictar con Win + H) y una nota del 1 al 5, con el contexto (pantalla,
     escena, posición, hora, fps). Se guarda en notas/<fecha>.png y notas/<fecha>.json.
   - usos(): «¿Qué usas?»: las pestañas añadidas de tu modo con «Me gusta», «Me da igual» o «Quitar»; las de «Quitar» se ocultan
     (GM.ui.ocultas). Se guarda en localStorage (gm1:usos) y en usos/usos.json.
   En la versión de escritorio todo va a Documentos\BasketManager\ (window.escritorio, escritorio/preload.js); en el navegador se descarga. */
(function () {
  const PRESUPUESTO = { exterior: { fps: 50, cargaMs: 4000 }, interior: { fps: 57, cargaMs: 4000 } };
  const RECORRIDO = [
    ['calle', 'Calle', 'exterior'],
    ['interior:pabellon', 'Pabellón por dentro', 'interior'],
    ['sede', 'Sede del club', 'interior'],
    ['pueblo', 'Pueblo', 'exterior']
  ];
  const KEY_USOS = 'gm1:usos';
  const esc = () => (typeof window !== 'undefined' && window.escritorio) || null;
  const marca = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const U = () => GM.ui._;
  const mundo = () => (GM.sede && GM.sede.activa && GM.sede.activa() ? GM.sede._estado() : null);

  // Guarda un texto en la carpeta compartida (escritorio) o lo descarga (navegador)
  async function guardar(apartado, nombre, texto) {
    const e = esc();
    if (e) return e.guardar(apartado, nombre, texto);
    if (typeof document === 'undefined' || typeof Blob === 'undefined') return null;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
    a.download = nombre;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    return nombre;
  }
  const version = () => (GM.ajustes && GM.ajustes.NOVEDADES ? GM.ajustes.NOVEDADES[0].v : '?');
  function gpu() {
    const S = mundo();
    try {
      const gl = S && S.renderer.getContext(),
        ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null;
    } catch (e) {
      return null;
    }
  }
  // Fotogramas por segundo durante ms milisegundos (sin tocar nada)
  function fpsRapido(ms) {
    if (typeof requestAnimationFrame !== 'function') return Promise.resolve(null);
    return new Promise(ok => {
      let n = 0;
      const t0 = performance.now();
      const paso = () => {
        n++;
        if (performance.now() - t0 < ms) requestAnimationFrame(paso);
        else ok(Math.round((n * 1000) / (performance.now() - t0)));
      };
      requestAnimationFrame(paso);
    });
  }
  // Dónde estás: pantalla, pestaña, escena, posición y hora del mundo
  function contexto() {
    const st = GM.state,
      ui = U() && U().ui,
      S = mundo();
    return {
      version: version(),
      fechaReal: new Date().toISOString(),
      modo: st && st.modo,
      club: st && st.clubId,
      fechaJuego: st && st.fecha,
      pantalla: ui && ui.pantalla,
      pestana: ui && ui.tab && ui.pantalla ? ui.tab[ui.pantalla] || null : null,
      escena: S ? S.escena + (S.escenaArg ? ':' + S.escenaArg : '') : null,
      posicion: S && S.yo ? [Math.round(S.yo.obj.position.x * 10) / 10, Math.round(S.yo.obj.position.z * 10) / 10] : null,
      horaMundo: S ? Math.round((S.hora || 0) * 100) / 100 : null,
      calidad: GM.campus ? GM.campus.config.calidad + ', ' + GM.campus.config.nivel : null,
      ventana: typeof window !== 'undefined' ? window.innerWidth + 'x' + window.innerHeight + ' a ' + (window.devicePixelRatio || 1) : null,
      gpu: gpu()
    };
  }

  // ---------- Notas de prueba (punto 87) ----------
  let anotando = false;
  async function anotar() {
    if (anotando || !U()) return;
    anotando = true;
    const id = marca(),
      e = esc();
    let foto = null;
    try {
      if (e) foto = await e.captura('notas', id + '.png');
    } catch (err) {
      foto = null;
    }
    const ctx = contexto();
    ctx.fps = await fpsRapido(500);
    const { h, modal, toast } = U();
    let nota = 0;
    const area = h('textarea', { rows: 4, style: { width: '100%' }, placeholder: 'Qué ves y qué esperabas. Puedes dictar con Win + H.' });
    const estrellas = h('div', { class: 'seg' });
    const pintar = () =>
      estrellas.replaceChildren(
        ...[1, 2, 3, 4, 5].map(n =>
          h(
            'button',
            {
              class: 'tab' + (nota === n ? ' on' : ''),
              onclick: () => {
                nota = nota === n ? 0 : n;
                pintar();
              }
            },
            String(n)
          )
        )
      );
    pintar();
    modal(
      h(
        'div',
        null,
        h('h3', null, 'Anotar'),
        h(
          'p',
          { class: 'muted' },
          (foto ? 'Captura hecha. ' : '') +
            (ctx.escena ? 'Escena: ' + ctx.escena + '. ' : 'Pantalla: ' + (ctx.pantalla || '') + '. ') +
            'Nota de 1 (mal) a 5 (muy bien), si quieres.'
        ),
        estrellas,
        area
      ),
      [
        {
          t: 'Guardar',
          fn: () => {
            const datos = Object.assign({ id, texto: area.value.trim(), nota: nota || null, captura: foto ? id + '.png' : null }, ctx);
            guardar('notas', id + '.json', JSON.stringify(datos, null, 1)).then(() => toast('Nota guardada'));
            anotando = false;
          }
        },
        {
          t: 'Cancelar',
          cls: 'btn-sec',
          fn: () => {
            anotando = false;
          }
        }
      ]
    );
    setTimeout(() => area.focus && area.focus(), 50);
    // si se cierra tocando fuera, se puede volver a anotar
    setTimeout(() => {
      anotando = false;
    }, 400);
  }

  // ---------- Medir rendimiento (puntos 86 y 90) ----------
  let midiendo = false;
  function aviso(txt) {
    if (typeof document === 'undefined') return;
    let el = document.getElementById('pruebas-midiendo');
    if (!txt) {
      if (el) el.remove();
      return;
    }
    if (!el) {
      el = document.createElement('div');
      el.id = 'pruebas-midiendo';
      el.className = 'aviso med';
      el.style.cssText = 'position:fixed;left:50%;top:76px;transform:translateX(-50%);z-index:9999;padding:10px 16px;border-radius:10px;font-weight:600';
      document.body.appendChild(el);
    }
    el.textContent = txt;
  }
  async function esperarEscena(base, max) {
    const fin = Date.now() + max;
    while (Date.now() < fin) {
      const S = mundo();
      if (S && S.yo && !S.cambiando && !document.querySelector('.sede-cargando') && (!base || S.escena === base)) return true;
      await espera(120);
    }
    return false;
  }
  // Tras aparecer, la escena puede quedarse parada unos segundos mientras prepara la tarjeta gráfica: espera a 30 fotogramas seguidos de menos de 100 ms
  function hastaFluido(max) {
    return new Promise(ok => {
      const t0 = performance.now();
      let ant = t0,
        seguidos = 0;
      const paso = () => {
        const t = performance.now();
        seguidos = t - ant < 100 ? seguidos + 1 : 0;
        ant = t;
        if (seguidos >= 30 || t - t0 > max) ok(Math.round(t - t0));
        else requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
    });
  }
  // 8 s girando la cámara despacio: fps medio, el 1 % más lento, el peor fotograma, llamadas y triángulos por fotograma
  function muestrear(ms) {
    return new Promise(ok => {
      const S = mundo(),
        inf = S.renderer.info,
        dts = [],
        llam = [],
        tri = [];
      inf.autoReset = false;
      inf.reset();
      let t0 = performance.now(),
        ant = t0;
      const yaw0 = S.yawObj || 0;
      const paso = () => {
        const S2 = mundo();
        if (!S2 || S2 !== S) return ok(null);
        const t = performance.now();
        dts.push(t - ant);
        llam.push(inf.render.calls);
        tri.push(inf.render.triangles);
        inf.reset();
        ant = t;
        S.yawObj = yaw0 + ((t - t0) / ms) * Math.PI * 2;
        if (t - t0 < ms) requestAnimationFrame(paso);
        else {
          inf.autoReset = true;
          const orden = dts.slice(1).sort((a, b) => a - b),
            media = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
          ok({
            fps: Math.round((orden.length * 1000) / (t - t0)),
            fps1: Math.round(1000 / orden[Math.floor(orden.length * 0.99)] || 0),
            peorMs: Math.round(orden[orden.length - 1] || 0),
            llamadas: Math.round(media(llam.slice(1))),
            llamadasMax: Math.max(...llam.slice(1)),
            triangulos: Math.round(media(tri.slice(1))),
            gente: (S.gente || []).length,
            mixamo: (S.gente || []).filter(n => n.mixamo).length,
            pixeles: Math.round(S.renderer.getPixelRatio() * 100) / 100
          });
        }
      };
      requestAnimationFrame(paso);
    });
  }
  async function medir() {
    const st = GM.state;
    if (midiendo || !st || !GM.sede) return null;
    midiendo = true;
    const ui = U().ui,
      pantalla0 = ui.pantalla,
      S0 = mundo(),
      escena0 = S0 ? S0.escena + (S0.escenaArg ? ':' + S0.escenaArg : '') : null,
      resultados = [];
    U().cerrarModales();
    for (let i = 0; i < RECORRIDO.length; i++) {
      const [escena, nombre, tipo] = RECORRIDO[i];
      aviso('Midiendo el rendimiento: ' + nombre + ' (' + (i + 1) + ' de ' + RECORRIDO.length + '). No toques nada.');
      const t0 = performance.now();
      try {
        if (!mundo()) GM.sede.abrir(st, escena);
        else GM.sede._escena(escena);
      } catch (e) {
        resultados.push({ escena, nombre, error: e.message });
        continue;
      }
      await espera(250);
      const ok = await esperarEscena(escena.split(':')[0], 90000);
      const carga = Math.round(performance.now() - t0);
      if (!ok) {
        resultados.push({ escena, nombre, error: 'no cargó en 90 s' });
        continue;
      }
      const S = mundo(),
        vel = S.velTiempo;
      S.velTiempo = 0;
      if (S.panel) S.panel.style.display = 'none';
      const listo = carga + (await hastaFluido(30000));
      await espera(1500);
      const m = await muestrear(8000);
      if (mundo() === S) S.velTiempo = vel;
      const P = PRESUPUESTO[tipo];
      resultados.push(
        Object.assign({ escena, nombre, tipo, cargaMs: carga, listoMs: listo }, m || { error: 'se cerró la escena' }, m ? { ok: m.fps >= P.fps && listo <= P.cargaMs } : {})
      );
    }
    aviso(null);
    // volver a donde estabas
    if (escena0) GM.sede._escena(escena0);
    else if (mundo()) {
      GM.sede.cerrar();
      if (pantalla0) GM.ui.navegar(pantalla0);
    }
    const informe = Object.assign({ presupuesto: PRESUPUESTO, resultados }, contexto(), { escena: null, posicion: null });
    const nombre = marca() + '.json';
    await guardar('rendimiento', nombre, JSON.stringify(informe, null, 1));
    midiendo = false;
    mostrarInforme(informe);
    return informe;
  }
  function mostrarInforme(inf) {
    const { h, modal } = U();
    modal(
      h(
        'div',
        null,
        h('h3', null, 'Rendimiento'),
        h(
          'p',
          { class: 'muted' },
          'Guardado en la carpeta del juego. Objetivo: exteriores a 50 fps o más, interiores a 60, y cada escena fluida en 4 s o menos desde que la pides.'
        ),
        h(
          'table',
          { class: 'tabla' },
          h(
            'tr',
            null,
            ['Escena', 'Carga', 'fps', '1 % lento', 'Llamadas', 'Triángulos', 'Gente', ''].map(t => h('th', null, t))
          ),
          inf.resultados.map(r =>
            h(
              'tr',
              null,
              h('td', null, r.nombre),
              r.error
                ? h('td', { colspan: 8 }, r.error)
                : [
                    h('td', null, (r.cargaMs / 1000).toFixed(1) + ' s'),
                    h('td', null, (r.listoMs / 1000).toFixed(1) + ' s'),
                    h('td', null, String(r.fps)),
                    h('td', null, String(r.fps1)),
                    h('td', null, String(r.llamadas)),
                    h('td', null, Math.round(r.triangulos / 1000) + ' mil'),
                    h('td', null, r.gente + (r.mixamo ? ' (' + r.mixamo + ' realistas)' : '')),
                    h('td', null, r.ok ? 'bien' : 'por debajo')
                  ]
            )
          )
        ),
        inf.gpu ? h('p', { class: 'muted' }, 'Tarjeta: ' + inf.gpu) : null
      ),
      [{ t: 'Cerrar', cls: 'btn-sec' }]
    );
  }

  // ---------- ¿Qué usas? (punto 88) ----------
  function leerUsos() {
    try {
      return JSON.parse(window.localStorage.getItem(KEY_USOS) || '{}') || {};
    } catch (e) {
      return {};
    }
  }
  function aplicarUsos(u) {
    if (!GM.ui || !GM.ui.ocultas) return;
    GM.ui.ocultas.clear();
    const ui = GM.ui._ && GM.ui._.ui;
    Object.keys(u.marcas || {}).forEach(k => {
      if (u.marcas[k] !== 'quitar') return;
      GM.ui.ocultas.add(k);
      const [p, id] = k.split(':');
      if (ui && ui.tab && ui.tab[p] === id) delete ui.tab[p];
    });
  }
  // Pestañas añadidas que se ven en tu modo: [pantalla:id, 'Pantalla, Pestaña']
  function catalogo(st) {
    const nav = GM.ui._NAV ? GM.ui._NAV() : [],
      todas = [];
    nav.forEach(([p, nombre]) => {
      (GM.ui.tabsExtra(p, st, true) || []).forEach(([id, t]) => todas.push([p + ':' + id, nombre + ', ' + t]));
    });
    return todas;
  }
  function usos() {
    const st = GM.state;
    if (!st || !U()) return;
    const { h, modal, toast, refrescar } = U(),
      u = leerUsos(),
      marcas = Object.assign({}, u.marcas || {}),
      lista = catalogo(st);
    const OPC = [
      ['gusta', 'Me gusta'],
      ['igual', 'Me da igual'],
      ['quitar', 'Quitar']
    ];
    const filas = h('div');
    const pintar = () =>
      filas.replaceChildren(
        ...lista.map(([k, nombre]) =>
          h(
            'div',
            { class: 'fila', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '6px 0' } },
            h('span', null, nombre),
            h(
              'div',
              { class: 'seg' },
              OPC.map(([v, t]) =>
                h(
                  'button',
                  {
                    class: 'tab' + ((marcas[k] || 'igual') === v ? ' on' : ''),
                    onclick: () => {
                      marcas[k] = v;
                      pintar();
                    }
                  },
                  t
                )
              )
            )
          )
        )
      );
    pintar();
    const libre = h('textarea', { rows: 3, style: { width: '100%' }, placeholder: '¿Algo más que te sobre o que eches de menos? (opcional)' }, u.libre || '');
    modal(
      h(
        'div',
        null,
        h('h3', null, '¿Qué usas?'),
        h('p', { class: 'muted' }, 'Pestañas añadidas que ves en el modo ' + st.modo + '. Lo que marques con «Quitar» se oculta; lo que te guste se cuidará primero.'),
        filas,
        libre
      ),
      [
        {
          t: 'Guardar',
          fn: () => {
            const datos = {
              modo: st.modo,
              fecha: new Date().toISOString(),
              marcas,
              libre: libre.value.trim(),
              pestanas: lista.map(([k, n]) => ({ clave: k, nombre: n, marca: marcas[k] || 'igual' }))
            };
            try {
              window.localStorage.setItem(KEY_USOS, JSON.stringify({ marcas, libre: datos.libre }));
            } catch (e) {
              /* sin almacenamiento */
            }
            aplicarUsos(datos);
            guardar('usos', 'usos_' + st.modo + '.json', JSON.stringify(datos, null, 1)).then(() => toast('Guardado'));
            if (refrescar) refrescar();
          }
        },
        { t: 'Cancelar', cls: 'btn-sec' }
      ],
      { alta: true }
    );
  }

  // F8 en cualquier pantalla (también dentro del mundo 3D)
  if (typeof document !== 'undefined' && document.addEventListener)
    document.addEventListener(
      'keydown',
      e => {
        if (e.key === 'F8') {
          e.preventDefault();
          anotar();
        }
      },
      true
    );
  if (typeof window !== 'undefined' && window.localStorage) aplicarUsos(leerUsos());

  function selfTest() {
    const c = contexto();
    return typeof c.version === 'string' && RECORRIDO.length === 4 && PRESUPUESTO.exterior.fps === 50 && typeof guardar === 'function';
  }
  GM.pruebas = { medir, anotar, usos, contexto, guardar, catalogo, PRESUPUESTO, RECORRIDO, escritorio: () => !!esc(), selfTest };
  GM.register && GM.register('pruebas', GM.pruebas);
})();
