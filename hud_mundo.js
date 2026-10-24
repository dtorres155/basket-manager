/* INTERFAZ DENTRO DEL MUNDO 3D (punto 72, GM.hudMundo) — una capa HTML sobre el canvas con piezas del sistema de diseño, para jugar una hora sin abrir un menú clásico:
   - Brújula: franja con los puntos cardinales y los grados según hacia dónde mira la cámara.
   - Reloj y velocidad del tiempo: la hora del mundo con pausa y ×1, ×2 y ×4 (S.velTiempo; sede3d.js la usa al avanzar S.hora).
   - Tarjeta del lugar: el sitio más cercano con su distancia y lo que se puede hacer allí (tecla E o clic).
   - Objetivos con marcadores: los encargos y sitios importantes (sala.encargo, el destino fijado en el mapa) aparecen como chinchetas sobre el mundo y, fuera de pantalla, como flechas en el borde con la distancia.
   - Notificaciones apiladas: las noticias del juego (GM.noticia) y los avisos salen abajo a la izquierda, hasta cuatro a la vez, y se van solos.
   - Menú radial: clic derecho (o pulsación larga) sobre el mundo abre un círculo con las acciones del sitio más cercano; se elige con un clic y se ejecuta sin abrir el panel.
   - Barra de necesidades: energía, comida y ánimo (rutina.js, carrera) o caja y ambiente del club en los demás modos.
   - Indicador de transporte: mientras viajas, una barra con el avance y los minutos que faltan (se suma al chip de movilidad.js).
   Se monta desde sede_hud.js (GM.hudMundo.montar(S)); su estado vive en S.hm. Expone: montar, notificar, objetivos, brujula, cercano, abrirRadial, fijarObjetivo, selfTest. Prueba: tools/hud_mundo_prueba.js. */
(function () {
  const U = GM.util,
    clamp = U.clamp;
  const RUMBOS = [
    ['N', 0],
    ['NE', 45],
    ['E', 90],
    ['SE', 135],
    ['S', 180],
    ['SO', 225],
    ['O', 270],
    ['NO', 315]
  ];
  // Grados hacia donde mira la cámara (0 = norte = -z, sentido horario)
  function brujula(S) {
    try {
      const d = new THREE.Vector3();
      S.camera.getWorldDirection(d);
      const g = (Math.atan2(d.x, -d.z) * 180) / Math.PI;
      return (g + 360) % 360;
    } catch (e) {
      return 0;
    }
  }
  function etiquetaRumbo(g) {
    const r = RUMBOS.reduce(
      (m, x) => {
        const d = Math.min(Math.abs(g - x[1]), 360 - Math.abs(g - x[1]));
        return d < m.d ? { d, n: x[0] } : m;
      },
      { d: 999, n: 'N' }
    );
    return r.n;
  }
  const dist = (S, z) => {
    const p = S.yo.obj.position,
      q = z.obj.position;
    return Math.hypot(p.x - q.x, p.z - q.z);
  };
  function cercano(S, max) {
    if (!S || !S.zonas || !S.yo) return null;
    let m = null,
      d0 = max || 40;
    S.zonas.forEach(z => {
      if (!z.sala || !z.obj) return;
      const d = dist(S, z);
      if (d < d0) {
        d0 = d;
        m = z;
      }
    });
    return m ? { zona: m, d: Math.round(d0) } : null;
  }
  function objetivos(S) {
    const out = [];
    (S.zonas || []).forEach(z => {
      if (!z.sala || !z.obj) return;
      if (z.sala.encargo) out.push({ id: z.sala.id, nombre: z.sala.nombre, zona: z, tipo: 'encargo' });
    });
    if (S.objetivoId) {
      const z = (S.zonas || []).find(q => q.sala && q.sala.id === S.objetivoId);
      if (z && !out.some(o => o.id === z.sala.id)) out.unshift({ id: z.sala.id, nombre: z.sala.nombre, zona: z, tipo: 'destino' });
    }
    return out.slice(0, 5);
  }
  function fijarObjetivo(S, id) {
    S.objetivoId = S.objetivoId === id ? null : id;
    return S.objetivoId;
  }
  // ---------- Notificaciones ----------
  const COLA = [];
  let activo = null;
  function notificar(texto, tipo) {
    const S = activo && activo.S();
    if (!S || !S.raiz || !S.hm || !S.hm.notis) {
      COLA.push([texto, tipo]);
      if (COLA.length > 6) COLA.shift();
      return false;
    }
    const n = GM.h('div', { class: 'hm-noti ' + (tipo || '') }, texto);
    S.hm.notis.append(n);
    while (S.hm.notis.children.length > 4) S.hm.notis.firstChild.remove();
    setTimeout(() => {
      n.classList.add('sale');
      setTimeout(() => n.remove(), 300);
    }, 5200);
    return true;
  }
  // Las noticias del juego salen también como notificación mientras estás en el mundo
  if (!GM.__noticiaHud) {
    const orig = GM.noticia;
    GM.__noticiaHud = true;
    GM.noticia = function (st, texto) {
      const r = orig.apply(this, arguments);
      try {
        if (activo && activo.S() && st === activo.S().st)
          notificar(
            String(texto)
              .replace(/^[^\w¡¿«"(]+/, '')
              .slice(0, 140)
          );
      } catch (e) {
        /* sin mundo */
      }
      return r;
    };
  }
  // ---------- Menú radial ----------
  function abrirRadial(S, x, y) {
    cerrarRadial(S);
    const c = cercano(S, 14);
    const h = GM.h;
    if (!c) {
      notificar('No hay nada cerca con lo que interactuar.');
      return null;
    }
    let acc = [];
    try {
      acc = c.zona.sala.acciones
        ? c.zona.sala
            .acciones(S.st)
            .filter(a => a.disponible !== false)
            .slice(0, 6)
        : [];
    } catch (e) {
      acc = [];
    }
    if (c.zona.sala.irA)
      acc.unshift({
        id: 'entrar',
        t: c.zona.sala.boton || 'Entrar',
        d: c.zona.sala.accion || '',
        fn: () => {
          GM.sede._escena(c.zona.sala.irA);
          return { ok: true, texto: 'Entras en ' + c.zona.sala.nombre };
        }
      });
    acc = acc.slice(0, 5);
    acc.push({
      id: 'fijar',
      t: S.objetivoId === c.zona.sala.id ? 'Quitar destino' : 'Fijar destino',
      d: 'Marca este sitio en el mundo',
      fn: () => {
        const o = fijarObjetivo(S, c.zona.sala.id);
        return { ok: true, texto: o ? 'Destino fijado: ' + c.zona.sala.nombre : 'Destino quitado' };
      }
    });
    if (!acc.length) {
      notificar(c.zona.sala.nombre + ': ' + (c.zona.sala.accion || 'nada que hacer ahora mismo.'));
      return null;
    }
    const R = 92,
      raiz = S.raiz.getBoundingClientRect(),
      cx = clamp(x - raiz.left, R + 50, raiz.width - R - 50),
      cy = clamp(y - raiz.top, R + 50, raiz.height - R - 50),
      rad = h('div', { class: 'hm-radial', style: { left: cx + 'px', top: cy + 'px' }, role: 'menu', 'aria-label': 'Acciones de ' + c.zona.sala.nombre });
    rad.append(
      h(
        'button',
        { class: 'hm-r-centro', 'aria-label': 'Cerrar', onclick: () => cerrarRadial(S) },
        c.zona.sala.nombre.length > 18 ? c.zona.sala.nombre.slice(0, 17) + '…' : c.zona.sala.nombre
      )
    );
    acc.forEach((a, i) => {
      const ang = -Math.PI / 2 + (i / acc.length) * Math.PI * 2;
      rad.append(
        h(
          'button',
          {
            class: 'hm-r-item',
            role: 'menuitem',
            title: a.d || a.t,
            style: { transform: 'translate(' + Math.round(Math.cos(ang) * R) + 'px,' + Math.round(Math.sin(ang) * R) + 'px)' },
            onclick: () => {
              cerrarRadial(S);
              let r = { ok: false };
              try {
                r = a.fn() || { ok: true };
              } catch (e) {
                r = { ok: false, motivo: 'No se ha podido' };
              }
              notificar(r.ok === false ? r.motivo || 'No se puede ahora' : r.texto || a.t, r.ok === false ? 'mal' : 'bien');
              if (GM.diseno) GM.diseno.sonido(r.ok === false ? 'error' : 'ok');
            }
          },
          h('b', null, a.t.length > 22 ? a.t.slice(0, 21) + '…' : a.t)
        )
      );
    });
    S.raiz.append(rad);
    S.hm.radial = rad;
    if (GM.diseno) GM.diseno.sonido('abrir');
    return rad;
  }
  function cerrarRadial(S) {
    if (S && S.hm && S.hm.radial) {
      S.hm.radial.remove();
      S.hm.radial = null;
    }
  }
  // ---------- Montaje ----------
  function montar(S) {
    if (!S || !S.raiz || !GM.h) return null;
    const h = GM.h,
      st = S.st;
    if (S.hm && S.hm.iv) clearInterval(S.hm.iv);
    if (S.hm && S.hm.el) S.hm.el.remove();
    const mundo = ['calle', 'pueblo', 'deportiva', 'sede'].indexOf(S.escena) >= 0 || S.escena === 'interior';
    const el = h('div', { class: 'sede-hud hm' }),
      brj = h('div', { class: 'hm-brujula', role: 'img', 'aria-label': 'Brújula' }, h('div', { class: 'hm-brj-tira' }), h('b', { class: 'hm-brj-g' }, 'N')),
      reloj = h(
        'div',
        { class: 'hm-reloj' },
        h('b', { class: 'hm-hora' }, '8:00'),
        h(
          'div',
          { class: 'hm-vel' },
          [
            [0, '⏸'],
            [1, '×1'],
            [2, '×2'],
            [4, '×4']
          ].map(([v, t]) =>
            h(
              'button',
              {
                class: 'hm-v',
                'data-v': v,
                'aria-label': v === 0 ? 'Pausar el tiempo' : 'Tiempo ×' + v,
                onclick: () => {
                  S.velTiempo = v;
                  pinta();
                }
              },
              t
            )
          )
        )
      );
    const lugar = h('div', { class: 'hm-lugar', style: { display: 'none' } }),
      pins = h('div', { class: 'hm-pins' }),
      notis = h('div', { class: 'hm-notis', 'aria-live': 'polite' }),
      nec = h('div', { class: 'hm-nec' }),
      viaje = h('div', { class: 'hm-viaje', style: { display: 'none' } }, h('i'));
    el.append(brj, reloj, lugar, pins, notis, nec, viaje);
    S.raiz.append(el);
    S.hm = { el, notis, brj, reloj, lugar, pins, nec, viaje, radial: null };
    activo = { S: () => S };
    // la hora del reloj abre/cierra el rastro: clic derecho o pulsación larga sobre el mundo = menú radial
    const cv = S.renderer && S.renderer.domElement;
    let largo = null;
    if (cv && mundo) {
      cv.addEventListener('contextmenu', e => {
        e.preventDefault();
        abrirRadial(S, e.clientX, e.clientY);
      });
      cv.addEventListener('pointerdown', e => {
        if (e.pointerType === 'touch') largo = setTimeout(() => abrirRadial(S, e.clientX, e.clientY), 650);
        else cerrarRadial(S);
      });
      ['pointerup', 'pointermove', 'pointercancel'].forEach(t =>
        cv.addEventListener(t, e => {
          if (largo && (t !== 'pointermove' || Math.abs(e.movementX) + Math.abs(e.movementY) > 3)) {
            clearTimeout(largo);
            largo = null;
          }
        })
      );
    }
    function proyecta(z) {
      const v = z.obj.position.clone();
      v.y += 2.4;
      v.project(S.camera);
      const r = S.raiz.getBoundingClientRect();
      return { x: (v.x * 0.5 + 0.5) * r.width, y: (-v.y * 0.5 + 0.5) * r.height, detras: v.z > 1 };
    }
    function pinta() {
      const barra = document.querySelector('.sede-top'),
        raiz = document.querySelector('.hm'); // el HUD baja si la barra de arriba ocupa más de una línea
      if (barra && raiz) raiz.style.setProperty('--hm-top', Math.round(barra.getBoundingClientRect().bottom + 6) + 'px');
      if (!GM.sede || GM.sede._estado() !== S || !S.raiz.contains(el)) {
        clearInterval(S.hm && S.hm.iv);
        if (activo && activo.S() === S) activo = null;
        return;
      }
      // brújula
      const g = brujula(S),
        rumbos = RUMBOS.map(([n, a]) => {
          let d = ((a - g + 540) % 360) - 180;
          return Math.abs(d) < 75 ? '<i style="left:' + (50 + (d / 75) * 46).toFixed(1) + '%">' + n + '</i>' : '';
        }).join('');
      brj.firstChild.innerHTML = rumbos;
      brj.lastChild.textContent = Math.round(g) + '° ' + etiquetaRumbo(g);
      // reloj y velocidad
      const hh = Math.floor(S.hora || 8),
        mm = Math.floor((((S.hora || 8) - hh) * 60) / 5) * 5;
      reloj.firstChild.textContent = hh + ':' + String(mm).padStart(2, '0');
      reloj.querySelectorAll('.hm-v').forEach(b => b.classList.toggle('on', +b.getAttribute('data-v') === (S.velTiempo === undefined ? 1 : S.velTiempo)));
      // tarjeta del lugar
      const c = cercano(S, 30);
      if (c && !S.construccion) {
        lugar.style.display = '';
        lugar.innerHTML = '';
        // (append(null) escribe «null»: solo se añade la descripción si la hay)
        lugar.append(h('b', null, c.zona.sala.nombre), h('span', { class: 'muted' }, c.d + ' m' + (c.d <= 4 ? ', pulsa E o toca el círculo' : '')));
        if (c.zona.sala.accion) lugar.append(h('span', { class: 'hm-lugar-d' }, c.zona.sala.accion));
      } else lugar.style.display = 'none';
      // objetivos
      pins.innerHTML = '';
      const r = S.raiz.getBoundingClientRect();
      objetivos(S).forEach(o => {
        const p = proyecta(o.zona),
          d = Math.round(dist(S, o.zona));
        let x = p.x,
          y = p.y,
          fuera = p.detras || x < 8 || x > r.width - 8 || y < 70 || y > r.height - 70,
          giro = 0;
        if (fuera) {
          const ang = Math.atan2(y - r.height / 2, x - r.width / 2) + (p.detras ? Math.PI : 0);
          x = clamp(r.width / 2 + Math.cos(ang) * (r.width / 2 - 36), 36, r.width - 36);
          y = clamp(r.height / 2 + Math.sin(ang) * (r.height / 2 - 90), 80, r.height - 90);
          giro = ang;
        }
        pins.append(
          h(
            'div',
            { class: 'hm-pin ' + o.tipo + (fuera ? ' borde' : ''), style: { left: x + 'px', top: y + 'px' } },
            fuera ? h('span', { class: 'hm-flecha', style: { transform: 'rotate(' + giro + 'rad)' } }, '➤') : h('span', { class: 'hm-punto' }),
            h('b', null, o.nombre.length > 20 ? o.nombre.slice(0, 19) + '…' : o.nombre),
            h('span', null, d + ' m')
          )
        );
      });
      // necesidades
      nec.innerHTML = '';
      try {
        if (st.modo === 'carrera' && GM.rutina && GM.rutina.estado(st)) {
          const q = GM.rutina.estado(st),
            mor = st.carrera.moral;
          [
            ['Energía', q.energia],
            ['Comida', q.hambre],
            ['Ánimo', mor]
          ].forEach(([t, v]) =>
            nec.append(
              h(
                'div',
                { class: 'hm-n' },
                h('span', null, t),
                GM.diseno
                  ? GM.diseno.medidor(v, 100, {
                      umbrales: [
                        [25, 'rojo'],
                        [55, 'ambar'],
                        [100, 'verde']
                      ]
                    })
                  : h('b', null, Math.round(v))
              )
            )
          );
        } else if (st.finanzas && st.finanzas[st.clubId]) {
          const ci = st.ciudad && st.ciudad[st.clubId];
          nec.append(
            h('div', { class: 'hm-n' }, h('span', null, 'Caja'), h('b', null, U.eur(st.finanzas[st.clubId].caja))),
            ci ? h('div', { class: 'hm-n' }, h('span', null, 'Afición'), GM.diseno ? GM.diseno.medidor(ci.aficion, 100, {}) : h('b', null, Math.round(ci.aficion))) : null
          );
        }
      } catch (e) {
        /* sin datos */
      }
      // transporte
      if (S.viajando && S.viaje) {
        viaje.style.display = '';
        viaje.firstChild.style.width = Math.round(clamp(S.viaje.t / Math.max(0.1, S.viaje.dur), 0, 1) * 100) + '%';
      } else viaje.style.display = 'none';
    }
    S.hm.iv = setInterval(pinta, 250);
    pinta();
    while (COLA.length) {
      const [t, tp] = COLA.shift();
      notificar(t, tp);
    }
    return S.hm;
  }
  function selfTest() {
    return (
      etiquetaRumbo(10) === 'N' &&
      etiquetaRumbo(100) === 'E' &&
      etiquetaRumbo(200) === 'S' &&
      etiquetaRumbo(260) === 'O' &&
      typeof montar === 'function' &&
      cercano({ zonas: [], yo: {} }) === null
    );
  }
  GM.hudMundo = { montar, notificar, objetivos, brujula, cercano, abrirRadial, cerrarRadial, fijarObjetivo, selfTest };
  GM.register && GM.register('hudMundo', GM.hudMundo);
})();
