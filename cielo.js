/* CIELO (GM.cielo, punto 102 de la hoja de ruta 2): en calidad alta y en exteriores, una cúpula de cielo calculada (THREE.Sky de Three 0.186)
   con el sol real de la fecha y la hora, y sus nubes integradas (iluminadas por el sol, con borde plateado a contraluz y que se funden con la
   bruma del horizonte): pocas con sol y más densas con nubes, lluvia o nieve, movidas por el viento. Sustituye al color liso de fondo y a las
   nubes planas (que quedan para calidad normal). Sigue a la cámara y no escribe profundidad. El cielo de Three se calibra para una exposición
   de 0,5; el juego usa casi 1, así que se atenúa con uBrillo.
   montar(S) la crea si toca (devuelve false si no), actualizar(S, t) cada fotograma, quitar(S). Lo llaman montarClima y moverClima de sede3d.js. */
(function () {
  const alta = () => !!(GM.campus && GM.campus.config.calidad === 'alta');
  // cobertura y densidad de las nubes según el tiempo del día
  const NUBES = { sol: [0.22, 0.35], nubes: [0.62, 0.6], lluvia: [0.88, 0.85], nieve: [0.82, 0.75] };
  function montar(S) {
    quitar(S);
    if (!alta() || !THREE.Sky || !S || !S.scene) return false;
    const sky = new THREE.Sky();
    sky.scale.setScalar(170); // dentro del plano lejano de la cámara (200 m desde arriba)
    sky.frustumCulled = false;
    sky.renderOrder = -2;
    sky.userData = { cielo: true, cieloDomo: true };
    const m = sky.material;
    m.depthWrite = false;
    m.uniforms.uBrillo = { value: 0.55 };
    m.fragmentShader = 'uniform float uBrillo;\n' + m.fragmentShader.replace('gl_FragColor = vec4( texColor, 1.0 );', 'gl_FragColor = vec4( texColor * uBrillo, 1.0 );');
    const u = m.uniforms;
    u.turbidity.value = 4;
    u.rayleigh.value = 1.2;
    u.mieCoefficient.value = 0.004;
    u.mieDirectionalG.value = 0.82;
    if (u.showSunDisc) u.showSunDisc.value = 1;
    S.scene.add(sky);
    S.cieloDomo = { sky };
    return true;
  }
  function quitar(S) {
    const C = S && S.cieloDomo;
    if (!C) return;
    if (C.sky.parent) C.sky.parent.remove(C.sky);
    C.sky.geometry.dispose();
    C.sky.material.dispose();
    S.cieloDomo = null;
  }
  function actualizar(S, t) {
    const C = S && S.cieloDomo;
    if (!C || !S.camera) return;
    C.sky.position.copy(S.camera.position);
    const el = S.solElev == null ? 0.6 : S.solElev,
      az = S.solAzim == null ? 3.5 : Math.PI - S.solAzim,
      tipo = (S.clima && S.clima.tipo) || 'sol',
      u = C.sky.material.uniforms,
      N = NUBES[tipo] || NUBES.sol;
    u.sunPosition.value.setFromSphericalCoords(1, Math.PI / 2 - el, az);
    u.turbidity.value = tipo === 'sol' ? 4 : 10;
    u.rayleigh.value = tipo === 'sol' ? 1.2 : 2.4;
    if (u.cloudCoverage) {
      u.cloudCoverage.value += (N[0] - u.cloudCoverage.value) * 0.02;
      u.cloudDensity.value += (N[1] - u.cloudDensity.value) * 0.02;
      u.time.value = t * 1000;
    }
    // de noche el cielo de Three es casi negro: un poco más de brillo para que se vea el azul oscuro y las estrellas encima
    u.uBrillo.value = (S.noche || 0) > 0.5 ? 0.9 : 0.55;
  }
  GM.cielo = { montar, actualizar, quitar };
})();
