/* MISIONES DE INICIO Y AYUDA CONTEXTUAL (punto 81, GM.misiones) — además del tutorial guiado (ui_tutorial.js):
   - Misiones de inicio por modo: una lista corta de cosas que hacer para entender el bucle del juego (mirar la plantilla, avanzar un día, jugar el primer partido, hacer un fichaje, mejorar el club…). Se marcan solas al hacerlas (por los eventos del juego y por las pantallas que abres)
     y salen en Inicio como una tarjeta con barra de progreso y la siguiente misión resaltada. Al acabarlas aparece un mensaje de enhorabuena y la tarjeta se oculta. Estado: st.misiones = { hechas: { id: fecha }, cont: { evento: n }, oculta: bool }.
   - Ayuda contextual: la primera vez que entras en cada pantalla sale una tarjeta corta que explica para qué sirve (descartable, se recuerda en este dispositivo; AYUDA tiene los textos). «Mostrar ayudas otra vez» en Ajustes las reinicia (GM.misiones.reiniciarAyudas()).
   Expone: MISIONES, AYUDA, lista(st), progreso(st), marcar(st, id), comprobar(st), reiniciarAyudas, selfTest. Prueba: t_misiones.js (Node) y tools/tanda35_ui.js (navegador). */
(function () {
  const cont = (st, k) => (st.misiones && st.misiones.cont && st.misiones.cont[k]) || 0;
  const ve = id => st => cont(st, 'pantalla:' + id) > 0;
  const TODOS = ['gestor', 'presidente', 'entrenador', 'carrera'];
  const MISIONES = [
    { id: 'plantilla', t: 'Mira tu plantilla', d: 'Abre Plantilla y toca a un jugador para ver su ficha.', modos: ['gestor', 'presidente', 'entrenador'], ok: ve('plantilla') },
    { id: 'perfil', t: 'Revisa tu jugador', d: 'En Jugador están tus atributos, tu contrato y tu progreso.', modos: ['carrera'], ok: ve('jugador') },
    { id: 'sede', t: 'Entra en la sede en 3D', d: 'Desde Inicio, camina por las instalaciones y entra en una sala.', modos: TODOS, ok: st => cont(st, 'sala:abierta') > 0 },
    { id: 'mercado', t: 'Visita el mercado', d: 'Mercado tiene agentes libres, otros clubes y tus renovaciones.', modos: ['gestor', 'presidente'], ok: ve('mercado') },
    { id: 'directiva', t: 'Habla con la directiva', d: 'En Directiva ves el objetivo de la temporada y la confianza.', modos: ['entrenador'], ok: ve('junta') },
    { id: 'agente', t: 'Conoce a tu representante', d: 'En Agente verás las ofertas de contrato y tu historial.', modos: ['carrera'], ok: ve('agente') },
    { id: 'dia', t: 'Avanza un día', d: 'Desde Inicio, «Avanzar un día» o «Hasta el día del partido».', modos: TODOS, ok: st => cont(st, 'dia:avanzado') > 0 },
    { id: 'partido', t: 'Juega tu primer partido', d: 'Puedes verlo en directo o simularlo.', modos: TODOS, ok: st => cont(st, 'partido:jugado') > 0 },
    {
      id: 'fichaje',
      t: 'Ficha a alguien',
      d: 'Un agente libre sirve para empezar. Cuida la masa salarial.',
      modos: ['gestor', 'presidente'],
      ok: st => cont(st, 'fichaje:hecho') > 0
    },
    {
      id: 'mejora',
      t: 'Mejora una instalación',
      d: 'En Club, la ciudad deportiva mejora la cantera, la recuperación y los ingresos.',
      modos: ['gestor', 'presidente'],
      ok: st => cont(st, 'instalacion:mejorada') > 0
    },
    {
      id: 'finanzas',
      t: 'Echa un vistazo a las finanzas',
      d: 'Ingresos, gastos y patrocinadores; si la caja se pone en rojo, la directiva se impacienta.',
      modos: ['gestor', 'presidente'],
      ok: ve('finanzas')
    },
    {
      id: 'tactica',
      t: 'Toca la táctica',
      d: 'En Plantilla, Táctica: elige quinteto, ritmo y defensa.',
      modos: ['gestor', 'entrenador'],
      ok: st => cont(st, 'pestana:tactica') > 0
    },
    { id: 'ciudad', t: 'Sal a la ciudad', d: 'Pasea por la calle: la ciudad reacciona a cómo juegas y a quien eres.', modos: TODOS, ok: st => cont(st, 'escena:calle') > 0 },
    {
      id: 'movil',
      t: 'Mira el móvil',
      d: 'El botón del teléfono tiene tus mensajes y decisiones, el banco y las apps.',
      modos: ['carrera', 'gestor', 'entrenador', 'presidente'],
      ok: st => cont(st, 'movil:abierto') > 0
    }
  ];
  const AYUDA = {
    inicio: 'Aquí ves lo siguiente que te toca: el próximo partido, avisos y lo que ha pasado. Desde aquí avanzas el tiempo.',
    plantilla: 'Tus jugadores. Toca un nombre para ver su ficha, renovarle o venderle; en Táctica eliges el quinteto y el estilo.',
    mercado: 'Agentes libres, jugadores de otros clubes y traspasos. Solo se cierran traspasos entre clubes con el mercado abierto.',
    calendario: 'Partidos, clasificaciones y líderes de todas las competiciones.',
    club: 'La ciudad deportiva, el pabellón y la directiva: aquí se mejora el club a largo plazo.',
    ciudad: 'La afición, el ayuntamiento y tus negocios. Una ciudad contenta llena el pabellón.',
    finanzas: 'Ingresos, gastos y patrocinadores. Vigila la masa salarial.',
    junta: 'La directiva te marca un objetivo y mide su confianza en ti.',
    agente: 'Tu representante gestiona ofertas y contratos.',
    jugador: 'Tus atributos, contrato y progreso.',
    legado: 'Lo que dejarás en el club: alma, influencia y decisiones largas.',
    directiva: 'Las decisiones de la presidencia.',
    muestra: 'Los componentes de la interfaz, para quien esté curioseando.'
  };
  const datos = st => (st.misiones = st.misiones || { hechas: {}, cont: {}, oculta: false });
  const lista = st => MISIONES.filter(m => m.modos.indexOf(st.modo) >= 0).map(m => ({ id: m.id, t: m.t, d: m.d, hecha: !!datos(st).hechas[m.id] }));
  function progreso(st) {
    const l = lista(st);
    return { hechas: l.filter(x => x.hecha).length, total: l.length, siguiente: l.find(x => !x.hecha) || null };
  }
  function marcar(st, id) {
    const D = datos(st);
    if (D.hechas[id]) return false;
    D.hechas[id] = st.fecha;
    const p = progreso(st);
    GM.noticia &&
      GM.noticia(
        st,
        p.siguiente ? 'Misión cumplida: ' + (MISIONES.find(m => m.id === id) || {}).t + '.' : '¡Ya conoces el bucle del juego! Has cumplido todas las misiones de inicio.'
      );
    return true;
  }
  function comprobar(st) {
    if (!st || !st.modo || (!st.misiones && !st.modo)) return 0;
    let n = 0;
    MISIONES.forEach(m => {
      if (m.modos.indexOf(st.modo) >= 0 && !datos(st).hechas[m.id]) {
        let v = false;
        try {
          v = m.ok(st);
        } catch (e) {
          v = false;
        }
        if (v && marcar(st, m.id)) n++;
      }
    });
    return n;
  }
  const cuenta = k => {
    const st = GM.state;
    if (!st || !st.modo) return;
    const D = datos(st);
    D.cont[k] = (D.cont[k] || 0) + 1;
    comprobar(st);
  };
  ['dia:avanzado', 'fichaje:hecho', 'instalacion:mejorada', 'sala:abierta'].forEach(e => GM.bus.on(e, () => cuenta(e)));
  GM.bus.on('partido:jugado', d => {
    const st = GM.state;
    if (!st || !d || !d.partido) return;
    if (d.partido.local === st.clubId || d.partido.visitante === st.clubId || st.modo === 'carrera') cuenta('partido:jugado');
  });
  GM.bus.on('pantalla:abierta', d => {
    if (d && d.id) cuenta('pantalla:' + d.id);
    if (d && d.id) ayuda(d.id);
  });
  GM.bus.on('pestana:abierta', d => {
    if (d && d.id) cuenta('pestana:' + d.id);
  });
  GM.bus.on('escena:abierta', d => {
    if (d && d.id) cuenta('escena:' + d.id);
  });
  GM.bus.on('movil:abierto', () => cuenta('movil:abierto'));
  // ---------- tarjeta de Inicio y ayuda contextual ----------
  function bloque(el, st) {
    if (!GM.ui || !GM.ui._ || !st.modo) return;
    const D = datos(st),
      p = progreso(st);
    if (D.oculta || p.total === 0) return;
    const { h, seccion, barra } = GM.ui._;
    if (!p.siguiente) {
      el.append(
        seccion(
          'Misiones de inicio',
          h(
            'div',
            { class: 'tarjeta' },
            h('p', null, 'Has cumplido todas las misiones de inicio. Ya conoces el bucle del juego.'),
            h(
              'button',
              {
                class: 'btn btn-sec',
                onclick: () => {
                  D.oculta = true;
                  GM.ui.navegar('inicio');
                }
              },
              'Ocultar'
            )
          )
        )
      );
      return;
    }
    el.append(
      seccion(
        'Misiones de inicio, ' + p.hechas + ' de ' + p.total,
        h(
          'div',
          { class: 'tarjeta' },
          barra(p.hechas, p.total),
          h('p', null, h('b', null, p.siguiente.t), ' ' + p.siguiente.d),
          h(
            'details',
            null,
            h('summary', { class: 'muted' }, 'Ver todas'),
            h(
              'ul',
              { class: 'cronica' },
              lista(st).map(m => h('li', null, (m.hecha ? '✔ ' : '') + m.t))
            )
          ),
          h(
            'button',
            {
              class: 'btn btn-sec peq',
              onclick: () => {
                D.oculta = true;
                GM.ui.navegar('inicio');
              }
            },
            'Ocultar las misiones'
          )
        )
      )
    );
  }
  function ayuda(id) {
    const st = GM.state;
    if (!st || !AYUDA[id] || !GM.diseno || !GM.ui || !GM.ui._ || !GM.ui._.ui || !GM.ui._.ui.cuerpo) return;
    if (st.modo === 'carrera' && id === 'junta') return;
    const c = GM.diseno.consejo('ayuda-' + id, AYUDA[id], 'Para qué sirve esto');
    if (c) GM.ui._.ui.cuerpo.prepend(c);
  }
  function reiniciarAyudas() {
    try {
      const v = JSON.parse(window.localStorage.getItem('gm1:consejos') || '{}');
      Object.keys(v).forEach(k => {
        if (/^ayuda-/.test(k)) delete v[k];
      });
      window.localStorage.setItem('gm1:consejos', JSON.stringify(v));
    } catch (e) {
      /* sin almacenamiento */
    }
    if (GM.state) datos(GM.state).oculta = false;
  }
  if (GM.ui && GM.ui._ && GM.ui._.inicioBloques) GM.ui._.inicioBloques.push(bloque);
  function selfTest() {
    const st = { modo: 'gestor', fecha: '2026-09-24', noticias: [] };
    const n0 = lista(st).length;
    marcar(st, 'dia');
    const p = progreso(st);
    return n0 >= 6 && p.hechas === 1 && p.total === n0 && !!p.siguiente && lista({ modo: 'carrera' }).some(m => m.id === 'agente') && MISIONES.every(m => m.modos.length > 0);
  }
  ['movil', 'movilMensajes'].forEach(k => {
    const f0 = GM.ui && GM.ui[k];
    if (typeof f0 === 'function' && !f0._mis) {
      GM.ui[k] = function () {
        if (GM.bus) GM.bus.emit('movil:abierto', {});
        return f0.apply(this, arguments);
      };
      GM.ui[k]._mis = true;
    }
  });
  GM.misiones = { MISIONES, AYUDA, lista, progreso, marcar, comprobar, reiniciarAyudas, bloque, selfTest };
  GM.register && GM.register('misiones', GM.misiones);
})();
