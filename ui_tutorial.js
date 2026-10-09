/* TUTORIAL GUIADO (GM.ui.tutorial) — la primera vez que juegas cada modo
   Una tarjeta abajo con pasos cortos que señalan (con un aro de luz) la parte de la pantalla de la que hablan: la cabecera, el botón
   del mundo 3D, cada sección de la barra inferior y, en la carrera, tu estilo y el móvil. Se puede saltar; se recuerda por modo en este
   dispositivo (localStorage gm1:tutorial:<modo>) y se puede volver a ver desde el menú de la partida. */
(function () {
  const { h, S } = GM.ui._;
  const nav = id => '.nav .navb[data-id="' + id + '"]';
  const COMUN_FIN = [{ sel: '.cab .btn-ic:last-child', t: 'El menú', d: 'Guardar, cargar, copia de seguridad, tema, accesibilidad y volver a ver este tutorial.' }];
  const PASOS = {
    gestor: [
      { t: 'Eres el director deportivo', d: 'Fichas, renuevas, mejoras el club y decides el día a día. Te enseño dónde está cada cosa en un minuto.' },
      { sel: '.cab', t: 'Tu club', d: 'Arriba ves la fecha y la caja del club. Si la caja se pone en rojo, la directiva se impacienta.' },
      { sel: '.sede-entrar', t: 'La sede en 3D', d: 'Entra y camina por las instalaciones: cada sala tiene sus acciones y puedes salir a la calle.' },
      { sel: nav('plantilla'), t: 'Plantilla', d: 'Tus jugadores, el quinteto, la táctica y la cantera.' },
      { sel: nav('mercado'), t: 'Mercado', d: 'Agentes libres, ofertas, traspasos y renovaciones.' },
      { sel: nav('calendario'), t: 'Calendario', d: 'Partidos, clasificaciones y líderes de todas las competiciones.' },
      { sel: nav('club'), t: 'Club', d: 'Ciudad deportiva, pabellón y directiva.' },
      { sel: nav('ciudad'), t: 'Ciudad', d: 'Afición, ayuntamiento, convenios y el mapa de la ciudad.' },
      { sel: nav('finanzas'), t: 'Finanzas', d: 'Ingresos, gastos y patrocinadores.' },
      { sel: nav('inicio'), t: 'Avanzar', d: 'Desde Inicio avanzas día a día o hasta el próximo partido. ¡Suerte!' }
    ],
    presidente: [
      { t: 'Eres el presidente', d: 'No eliges jugadores: marcas el rumbo, el presupuesto y a quién contratas para dirigir.' },
      { sel: '.cab', t: 'Tu club', d: 'La fecha y la caja del club.' },
      { sel: nav('directiva'), t: 'Directiva', d: 'Tus directores, sus objetivos y su confianza.' },
      { sel: nav('club'), t: 'Club', d: 'Instalaciones y pabellón: las grandes inversiones son tuyas.' },
      { sel: nav('legado'), t: 'Legado', d: 'Lo que vas dejando en la historia del club.' },
      { sel: nav('finanzas'), t: 'Finanzas', d: 'Presupuesto, deuda y patrocinadores.' },
      { sel: nav('inicio'), t: 'Avanzar', d: 'Desde Inicio avanzas el calendario. ¡Suerte, presi!' }
    ],
    entrenador: [
      { t: 'Eres el entrenador', d: 'Decides quién juega y cómo; la directiva te mide por los resultados.' },
      { sel: '.cab', t: 'Tu confianza', d: 'Arriba ves la confianza de la directiva. Si baja mucho, te despiden.' },
      { sel: nav('plantilla'), t: 'Plantilla', d: 'Quinteto, rotaciones y táctica.' },
      { sel: nav('junta'), t: 'Directiva', d: 'Lo que te piden y cómo vas.' },
      { sel: nav('calendario'), t: 'Calendario', d: 'Partidos y clasificaciones.' },
      { sel: nav('inicio'), t: 'Avanzar', d: 'Desde Inicio avanzas y juegas los partidos, en directo si quieres.' }
    ],
    carrera: [
      { t: 'Eres un jugador', d: 'Tu carrera, de la cantera o la universidad a donde llegues. El club lo lleva la IA; tú decides tu vida.' },
      { sel: '.cab', t: 'Tú', d: 'Arriba, tus ahorros. Toca tu cara para ver tu jugador.' },
      { sel: '.movil-btn', t: 'Tu móvil', d: 'Mensajes de tu representante, el entrenador, la prensa, la familia y los amigos. Muchos traen decisiones.' },
      { sel: '.estilo', t: 'Tu estilo', d: 'De chico malo a profesional ejemplar: los planes y tus decisiones lo mueven, y tiene consecuencias.' },
      { sel: nav('jugador'), t: 'Jugador', d: 'Tu nivel, potencial y entrenamiento de cada semana.' },
      { sel: nav('agente'), t: 'Agente', d: 'Ofertas de contrato, el draft y tu representante.' },
      { sel: nav('ciudad'), t: 'Ciudad', d: 'Tu casa, tu vida social y tu pueblo.' },
      { sel: nav('trayectoria'), t: 'Carrera', d: 'Tu historial, tus logros y tu legado.' },
      { sel: nav('inicio'), t: 'Avanzar', d: 'Desde Inicio avanzas los días. ¡A por todas!' }
    ]
  };
  const clave = m => 'gm1:tutorial:' + m;
  const hecho = m => { try { return window.localStorage.getItem(clave(m)) === 'hecho'; } catch (e) { return true; } };
  let abierto = null;
  function cerrar(m) { const f = abierto && abierto.recolocar; if (abierto) { abierto.forEach(e => e.remove()); abierto = null; } if (f) window.removeEventListener('resize', f); try { window.localStorage.setItem(clave(m), 'hecho'); } catch (e) { } }
  function tutorial(modo) {
    const st = S(); modo = modo || (st && st.modo); const pasos = (PASOS[modo] || PASOS.gestor).concat(COMUN_FIN); if (abierto) cerrar(modo);
    const velo = h('div', { class: 'tuto-velo' }), aro = h('div', { class: 'tuto-aro' }), carta = h('div', { class: 'tuto-carta', role: 'dialog', 'aria-live': 'polite' });
    document.body.append(velo, aro, carta); abierto = [velo, aro, carta];
    let i = 0;
    const pintar = () => {
      const p = pasos[i], el = p.sel && document.querySelector(p.sel);
      if (p.sel && !el) { i++; if (i >= pasos.length) return cerrar(modo); return pintar(); }   // si no está en pantalla, se salta
      if (el) { el.scrollIntoView && el.scrollIntoView({ block: 'nearest' }); const r = el.getBoundingClientRect(); Object.assign(aro.style, { display: 'block', left: (r.left - 6) + 'px', top: (r.top - 6) + 'px', width: (r.width + 12) + 'px', height: (r.height + 12) + 'px' }); }
      else aro.style.display = 'none';
      const arriba = el && el.getBoundingClientRect().top > window.innerHeight * 0.55; carta.classList.toggle('arriba', !!arriba);
      carta.innerHTML = '';
      carta.append(h('div', { class: 'tuto-paso' }, (i + 1) + ' de ' + pasos.length), h('b', null, p.t), h('p', null, p.d),
        h('div', { class: 'par' }, h('button', { class: 'btn btn-sec peq', onclick: () => cerrar(modo) }, 'Saltar'),
          i > 0 ? h('button', { class: 'btn btn-sec peq', onclick: () => { i--; pintar(); } }, 'Atrás') : null,
          h('button', { class: 'btn peq', onclick: () => { i++; if (i >= pasos.length) cerrar(modo); else pintar(); } }, i === pasos.length - 1 ? 'Empezar' : 'Siguiente')));
    };
    abierto.recolocar = pintar; window.addEventListener('resize', pintar);
    pintar();
  }
  // Se lanza solo la primera vez de cada modo (lo llama ui.js al montar la partida)
  function auto() { const st = S(); if (!st || hecho(st.modo) || navigator.webdriver) return; setTimeout(() => { if (S() === st && !document.querySelector('.fondo')) tutorial(st.modo); }, 900); }
  GM.ui.tutorial = tutorial; GM.ui.tutorialAuto = auto; GM.ui.tutorialPasos = PASOS;
})();
