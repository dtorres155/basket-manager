/* CONTROLES (punto 74, GM.controles) — teclas remapeables del mundo 3D y mando (Gamepad API).
   Las acciones tienen una tecla por defecto; el jugador puede asignar otra (se guarda en gm1:controles). sede_hud.js pasa cada tecla por canonica(), que devuelve la tecla por defecto de la acción asignada,
   así el resto del código sigue mirando las teclas de siempre (w a s d, q, e, r, m, escape).
   Mando: stick izquierdo = caminar, A = interactuar (e), B = atrás (escape), X = menú radial (clic derecho simulado), Y = mapa (m), bumpers = girar la cámara (q y e de cámara), gatillo derecho = correr.
   Expone: ACCIONES, tecla, asignar, restablecer, canonica, mando (estado del stick para teclado(dt)), sondear, hayMando, selfTest. */
(function () {
  const ACCIONES = [
    ['arriba', 'Caminar adelante', 'w'],
    ['abajo', 'Caminar atrás', 's'],
    ['izq', 'Caminar a la izquierda', 'a'],
    ['der', 'Caminar a la derecha', 'd'],
    ['camIzq', 'Girar la cámara a la izquierda', 'q'],
    ['camDer', 'Interactuar o girar la cámara', 'e'],
    ['rotar', 'Rotar mueble', 'r'],
    ['mapa', 'Mapa', 'm'],
    ['atras', 'Atrás o salir', 'escape']
  ];
  const clave = 'gm1:controles';
  let mapa = {};
  try {
    mapa = JSON.parse(window.localStorage.getItem(clave) || '{}') || {};
  } catch (e) {
    mapa = {};
  }
  const guarda = () => {
    try {
      window.localStorage.setItem(clave, JSON.stringify(mapa));
    } catch (e) {
      /* sin almacenamiento */
    }
  };
  const defecto = id => (ACCIONES.find(a => a[0] === id) || [])[2];
  const tecla = id => mapa[id] || defecto(id);
  // tecla pulsada -> tecla por defecto de la acción asignada (si la tecla por defecto de otra acción se reasignó, queda libre)
  function canonica(k) {
    for (const a of ACCIONES) {
      if (mapa[a[0]] === k) return a[2];
    }
    for (const a of ACCIONES) {
      if (a[2] === k && mapa[a[0]] && mapa[a[0]] !== k) return '\u0000' + k;
    }
    return k;
  }
  function asignar(id, k) {
    k = String(k || '').toLowerCase();
    if (!k || !ACCIONES.some(a => a[0] === id)) return false;
    Object.keys(mapa).forEach(o => {
      if (o !== id && mapa[o] === k) delete mapa[o];
    });
    if (k === defecto(id)) delete mapa[id];
    else mapa[id] = k;
    guarda();
    return true;
  }
  function restablecer() {
    mapa = {};
    guarda();
  }
  // ---------- mando ----------
  const getPads = () => {
    try {
      return (navigator.getGamepads && navigator.getGamepads()) || [];
    } catch (e) {
      return [];
    }
  };
  const hayMando = () => Array.from(getPads()).some(p => p && p.connected);
  const est = { x: 0, y: 0, corre: false },
    previos = {};
  const BOTONES = { 0: 'e', 1: 'escape', 3: 'm', 4: 'q', 5: 'e' };
  function pulsa(key, tipo) {
    try {
      window.dispatchEvent(new KeyboardEvent(tipo, { key }));
    } catch (e) {
      /* sin KeyboardEvent */
    }
  }
  function radial() {
    try {
      const cv = document.querySelector('canvas');
      if (cv) cv.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: innerWidth / 2, clientY: innerHeight / 2 }));
    } catch (e) {
      /* sin lienzo */
    }
  }
  function sondear() {
    const p = Array.from(getPads()).find(x => x && x.connected);
    if (!p) {
      est.x = est.y = 0;
      est.corre = false;
      return est;
    }
    const z = v => (Math.abs(v) < 0.18 ? 0 : v);
    est.x = z(p.axes[0] || 0);
    est.y = z(p.axes[1] || 0);
    est.corre = !!(p.buttons[7] && p.buttons[7].pressed);
    Object.keys(BOTONES).forEach(i => {
      const b = p.buttons[i],
        on = !!(b && b.pressed);
      if (on && !previos[i]) {
        pulsa(BOTONES[i], 'keydown');
        pulsa(BOTONES[i], 'keyup');
      }
      previos[i] = on;
    });
    const x = p.buttons[2],
      xo = !!(x && x.pressed);
    if (xo && !previos.x) radial();
    previos.x = xo;
    return est;
  }
  function mando() {
    return hayMando() ? sondear() : est;
  }
  // ---------- navegación con foco por menús y diálogos (flechas y Enter con el mando se traducen a foco) ----------
  function selfTest() {
    const a = mapa;
    mapa = {};
    const ok0 = canonica('w') === 'w';
    asignar('arriba', 'i');
    const ok1 = canonica('i') === 'w' && canonica('w') !== 'w';
    asignar('arriba', 'w');
    const ok2 = canonica('w') === 'w' && !mapa.arriba;
    mapa = a;
    return ok0 && ok1 && ok2;
  }
  GM.controles = { ACCIONES, tecla, asignar, restablecer, canonica, mando, sondear, hayMando, selfTest };
  GM.register && GM.register('controles', GM.controles);
})();
