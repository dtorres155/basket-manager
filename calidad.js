/* CALIDAD GRÁFICA (GM.calidad): «normal» (móvil y equipos flojos: sin sombras ni posprocesado) o «alta» (ordenador), y dentro de cada una
   el nivel bajo, medio, alto o ultra (gente, resolución, sombras; docs/PRESUPUESTOS.md). La elección se guarda en gm1:calidad y gm1:nivel.
   Antes vivía dentro de campus.js; GM.campus.config sigue siendo la misma configuración (alias), así que el resto del juego no cambia. */
(function () {
  // Calidad por defecto: «normal» en pantallas táctiles (móvil), «alta» en ordenador. La elección del usuario se guarda.
  const tactil = (() => {
    try {
      return window.matchMedia('(pointer: coarse)').matches;
    } catch (e) {
      return false;
    }
  })();
  // Perfiles (docs/PRESUPUESTOS.md): bajo y medio usan calidad «normal»; alto y ultra, «alta». `nivel` afina dentro de cada una (gente, resolución, sombras).
  const NIVELES = ['bajo', 'medio', 'alto', 'ultra'],
    DE = { bajo: 'normal', medio: 'normal', alto: 'alta', ultra: 'alta' };
  const C = { calidad: tactil ? 'normal' : 'alta', nivel: tactil ? 'medio' : 'alto', hora: 'dia' };
  try {
    const n = window.localStorage.getItem('gm1:nivel'),
      q = window.localStorage.getItem('gm1:calidad');
    if (DE[n]) {
      C.nivel = n;
      C.calidad = DE[n];
    } else if (q === 'normal' || q === 'alta') {
      C.calidad = q;
      C.nivel = q === 'alta' ? 'alto' : 'medio';
    }
  } catch (e) {}

  function setCalidad(q) {
    C.calidad = q;
    C.nivel = q === 'alta' ? 'alto' : 'medio';
    try {
      window.localStorage.setItem('gm1:calidad', q);
      window.localStorage.setItem('gm1:nivel', C.nivel);
    } catch (e) {}
  }
  function setNivel(n) {
    if (!DE[n]) return;
    C.nivel = n;
    C.calidad = DE[n];
    try {
      window.localStorage.setItem('gm1:nivel', n);
      window.localStorage.setItem('gm1:calidad', C.calidad);
    } catch (e) {}
  }
  // Factor de gente y de detalle del nivel actual (bajo 0,5; medio 0,8; alto 1; ultra 1,3)
  const factorGente = () => ({ bajo: 0.5, medio: 0.8, alto: 1, ultra: 1.3 })[C.nivel] || 1;
  const alta = () => C.calidad === 'alta';
  GM.calidad = { config: C, setCalidad, setNivel, NIVELES, factorGente, alta, tactil };
  GM.register && GM.register('calidad', GM.calidad);
})();
