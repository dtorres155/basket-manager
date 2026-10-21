/* Relieve del terreno (punto 32): toda la escena se levanta según la altura real del terreno (Copernicus DEM, datos de osm_relieve.js) con un desplazamiento en los shaders.
   Se parchea una sola vez el trozo común de los shaders de Three (project_vertex, worldpos_vertex y el vertex del sprite): cada vértice sube terrainH(x, z) metros, así
   que calles, edificios, árboles, coches, personas, la multitud de la GPU, las sombras y los carteles siguen el suelo sin tocar el resto del código.
   Los edificios no se inclinan: las paredes siguen verticales y solo el tejado se cizalla con la pendiente. La lógica (caminos, colisiones, posición de las personas) sigue en el plano.
   GM.relieve.fijar(H, c0) pone el relieve (H = { n, p, v } de vendor/osm, c0 = altura de referencia: el centro) o lo quita (null); GM.relieve.altura(x, z) es la misma función en JS
   (la usan la cámara, la luz del sol, las etiquetas y los clics); GM.relieve.activo() dice si hay relieve. Debe cargarse antes de que se compile ningún shader. */
(function () {
  const T = THREE,
    SC = T.ShaderChunk,
    SL = T.ShaderLib;
  const U = { uTerr: { value: null }, uTerrP: { value: new T.Vector4(0, 0, 1, 0) } };
  let datos = null; // { N, paso, x0, z0, v: Float32Array } en la cuadrícula fina
  if (SC && SC.common && !SC.common.includes('terrainH') && !(typeof window !== 'undefined' && window.__sinRelieve)) {
    SC.common =
      SC.common +
      `
uniform sampler2D uTerr;
uniform vec4 uTerrP;
float terrainH( vec2 p ) {
	float N = uTerrP.w; if ( N < 1.5 ) return 0.0;
	vec2 f = clamp( ( p - uTerrP.xy ) / uTerrP.z, vec2( 0.0 ), vec2( N - 1.001 ) );
	ivec2 i = ivec2( floor( f ) ); vec2 u = fract( f );
	float a = texelFetch( uTerr, i, 0 ).r, b = texelFetch( uTerr, i + ivec2( 1, 0 ), 0 ).r, c = texelFetch( uTerr, i + ivec2( 0, 1 ), 0 ).r, d = texelFetch( uTerr, i + ivec2( 1, 1 ), 0 ).r;
	return mix( mix( a, b, u.x ), mix( c, d, u.x ), u.y );
}
`;
    SC.project_vertex = SC.project_vertex.replace(
      'mvPosition = modelViewMatrix * mvPosition;',
      'vec4 wpT = modelMatrix * mvPosition; wpT.y += terrainH( wpT.xz ); mvPosition = viewMatrix * wpT;'
    );
    SC.worldpos_vertex = SC.worldpos_vertex.replace(
      'worldPosition = modelMatrix * worldPosition;',
      'worldPosition = modelMatrix * worldPosition; worldPosition.y += terrainH( worldPosition.xz );'
    );
    if (SL && SL.sprite)
      SL.sprite.vertexShader = SL.sprite.vertexShader.replace(
        'vec4 mvPosition = modelViewMatrix[ 3 ];',
        'vec4 wpS = modelMatrix * vec4( 0.0, 0.0, 0.0, 1.0 ); wpS.y += terrainH( wpS.xz ); vec4 mvPosition = viewMatrix * wpS;'
      );
    // todos los materiales reciben los uniformes del relieve (los que ya redefinen onBeforeCompile lo encadenan con el anterior)
    // Todos los materiales reciben los uniformes del relieve, también los que redefinen onBeforeCompile (se envuelve la función que se les asigna; toString devuelve el de la original para no mezclar la caché de programas).
    // Si algún programa se quedara sin el uniforme, su sampler compartiría unidad con otro de distinto tipo y el dibujo fallaría.
    const base = function (shader) {
      shader.uniforms.uTerr = U.uTerr;
      shader.uniforms.uTerrP = U.uTerrP;
    };
    Object.defineProperty(T.Material.prototype, 'onBeforeCompile', {
      configurable: true,
      get() {
        return this._obcRel || base;
      },
      set(f) {
        if (!f) {
          this._obcRel = null;
          return;
        }
        const w = function (shader, r) {
          shader.uniforms.uTerr = U.uTerr;
          shader.uniforms.uTerrP = U.uTerrP;
          return f.call(this, shader, r);
        };
        w.toString = () => f.toString();
        this._obcRel = w;
      }
    });
    const dummy = new T.DataTexture(new Float32Array([0]), 1, 1, T.RedFormat, T.FloatType);
    dummy.needsUpdate = true;
    U.uTerr.value = dummy;
  }
  // spline de Catmull-Rom entre cuatro valores
  const cr = (a, b, c, d, t) => b + 0.5 * t * (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a)));
  function fijar(H, c0) {
    if (!H || !H.v || !H.n || H.n < 3) {
      datos = null;
      U.uTerrP.value.set(0, 0, 1, 0);
      return;
    }
    const n = H.n,
      p = H.p,
      R = 4,
      N = (n - 1) * R + 1,
      v = new Float32Array(N * N),
      g = (i, j) => H.v[Math.max(0, Math.min(n - 1, j)) * n + Math.max(0, Math.min(n - 1, i))];
    const ref = c0 === undefined ? g((n - 1) / 2, (n - 1) / 2) : c0;
    for (let J = 0; J < N; J++)
      for (let I = 0; I < N; I++) {
        const fi = I / R,
          fj = J / R,
          i = Math.min(n - 2, Math.floor(fi)),
          j = Math.min(n - 2, Math.floor(fj)),
          u = fi - i,
          w = fj - j,
          fila = [];
        for (let dj = -1; dj <= 2; dj++) fila.push(cr(g(i - 1, j + dj), g(i, j + dj), g(i + 1, j + dj), g(i + 2, j + dj), u));
        v[J * N + I] = cr(fila[0], fila[1], fila[2], fila[3], w) - ref;
      }
    const paso = p / R,
      x0 = (-(n - 1) / 2) * p;
    datos = { N, paso, x0, z0: x0, v };
    const tx = new T.DataTexture(v, N, N, T.RedFormat, T.FloatType);
    tx.minFilter = tx.magFilter = T.NearestFilter;
    tx.needsUpdate = true;
    U.uTerr.value = tx;
    U.uTerrP.value.set(x0, x0, paso, N);
  }
  function altura(x, z) {
    if (!datos) return 0;
    const { N, paso, x0, z0, v } = datos,
      fx = Math.max(0, Math.min(N - 1.001, (x - x0) / paso)),
      fz = Math.max(0, Math.min(N - 1.001, (z - z0) / paso)),
      i = Math.floor(fx),
      j = Math.floor(fz),
      u = fx - i,
      w = fz - j;
    return (v[j * N + i] * (1 - u) + v[j * N + i + 1] * u) * (1 - w) + (v[(j + 1) * N + i] * (1 - u) + v[(j + 1) * N + i + 1] * u) * w;
  }
  GM.relieve = { fijar, altura, activo: () => !!datos };
})();
