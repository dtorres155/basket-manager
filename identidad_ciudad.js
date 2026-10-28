/* IDENTIDAD DE CADA CIUDAD (GM.identidad, punto 148 de la hoja de ruta 2): lo que hace reconocible una ciudad y no sale de los datos
   generales: el pavimento de sus aceras, las banderas en los balcones, dónde hay palmeras. Una ficha por región o por ciudad; lo que no
   está en la ficha sigue las reglas generales. La usan calle_real.js (aceras, palmeras) y calle_real_detalle.js (banderas).
   - acera: 'panot' (la baldosa gris de 20 cm con cuatro pastillas de Barcelona y su área; se dibuja en el shader con las coordenadas del
     mundo) o null (losas o adoquín del país, como hasta ahora).
   - bandera: 'senyera' (cuatro barras rojas sobre amarillo) o null; una parte de los balcones la lleva colgada.
   - palmerasCosta: metros desde la costa en los que los árboles de la calle son palmeras (paseo marítimo) o 0.
   ficha(club) devuelve la ficha; panot(material) le añade el dibujo de la baldosa. */
(function () {
  const CATALUNYA = ['joventut-badalona', 'fc-barcelona', 'girona', 'manresa', 'hiopos-lleida'];
  const FICHAS = {
    cat: { acera: 'panot', bandera: 'senyera', palmerasCosta: 140 },
    es: { acera: null, bandera: null, palmerasCosta: 120 },
    mediterraneo: { acera: null, bandera: null, palmerasCosta: 120 },
    otro: { acera: null, bandera: null, palmerasCosta: 0 }
  };
  function ficha(club) {
    if (!club) return FICHAS.otro;
    if (CATALUNYA.indexOf(club.id) >= 0) return FICHAS.cat;
    if (club.pais === 'ES') return FICHAS.es;
    if (['IT', 'GR', 'TR'].indexOf(club.pais) >= 0) return FICHAS.mediterraneo;
    return FICHAS.otro;
  }
  // Panot: baldosa de 20 x 20 cm con cuatro pastillas cuadradas en relieve y juntas finas; las pastillas, un poco más claras por arriba y
  // con sombra en el borde (se hace con el color: el relieve de verdad sería caro en toda la acera). Se ve de cerca y se funde de lejos.
  function panot(m) {
    const prev = m.onBeforeCompile,
      clave = m.customProgramCacheKey ? m.customProgramCacheKey.bind(m) : null;
    m.onBeforeCompile = function (sh, r) {
      if (prev) prev.call(this, sh, r);
      sh.vertexShader =
        'varying vec3 vWPan;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vWPan = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader =
        'varying vec3 vWPan;\n' +
        sh.fragmentShader.replace(
          '#include <color_fragment>',
          `#include <color_fragment>
{
  vec2 tP = fract(vWPan.xz / 0.2);
  float jP = 1.0 - smoothstep(0.0, 0.035, min(min(tP.x, 1.0 - tP.x), min(tP.y, 1.0 - tP.y)));
  vec2 qP = fract(tP * 2.0) - 0.5;
  float dP = max(abs(qP.x), abs(qP.y));
  float paP = 1.0 - smoothstep(0.28, 0.33, dP);
  float luzP = clamp((qP.x - qP.y) * 2.0, -1.0, 1.0);
  float lejosP = smoothstep(14.0, 32.0, distance(vWPan, cameraPosition));
  vec3 cP = diffuseColor.rgb * (0.94 + 0.1 * paP * (0.6 + 0.4 * luzP)) * (1.0 - 0.32 * jP) * (1.0 - 0.12 * smoothstep(0.24, 0.33, dP) * (1.0 - paP * 0.0));
  diffuseColor.rgb = mix(cP, diffuseColor.rgb * 0.97, lejosP);
}`
        );
    };
    m.customProgramCacheKey = () => (clave ? clave() : '') + '-panot';
    m.needsUpdate = true;
    return m;
  }
  GM.identidad = { ficha, panot, FICHAS };
})();
