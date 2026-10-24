/* HORIZONTE (GM.horizonte, punto 144 de la hoja de ruta 2): lo que se ve más allá de la ciudad que tiene datos, para que ninguna vista acabe en
   un suelo gris vacío. Es un anillo que acompaña a la cámara (como el cielo), a 150 m, con lo que habría a varios kilómetros a su tamaño
   aparente: montes hacia donde sube el terreno (pendiente de la cuadrícula de relieve de la ciudad, X.H) y una sierra baja y lejana alrededor,
   una silueta de ciudad lejana, y por debajo del horizonte una franja de suelo con bruma que tapa el borde del plano del suelo. Todo toma el
   color de la bruma del momento (perspectiva aérea) y de noche la silueta de la ciudad enciende ventanas.
   Sin datos de relieve lejano: cuando haya alturas de 15 a 20 km alrededor (pendiente de tu permiso para descargarlas) se usarán en lugar
   de la estimación. montar(S, X, club), actualizar(S), quitar(S). Lo llaman calle_real.js (al construir) y moverClima de sede3d.js. */
(function () {
  const R = 150, // radio del anillo (dentro del plano lejano de la cámara)
    N = 720; // muestras alrededor
  const T = () => THREE;
  // ruido 1D periódico (para perfiles alrededor del horizonte)
  function ruido(sem) {
    const v = [];
    let s = sem >>> 0 || 1;
    for (let i = 0; i < 64; i++) {
      s = (s * 1664525 + 1013904223) >>> 0;
      v.push(s / 4294967296);
    }
    return a => {
      const x = (((a / (Math.PI * 2)) % 1) + 1) % 1,
        f = x * 64,
        i = Math.floor(f),
        t = f - i,
        k = t * t * (3 - 2 * t);
      return v[i % 64] * (1 - k) + v[(i + 1) % 64] * k;
    };
  }
  // pendiente media del relieve de la ciudad (ajuste de un plano a la cuadrícula X.H): dirección y metros por metro
  function pendiente(X) {
    const H = X && (X.H || X.h);
    if (!H || !H.v || !H.n) return null;
    const n = H.n,
      paso = H.p || 125;
    let sx = 0,
      sz = 0,
      sh = 0,
      sxx = 0,
      szz = 0,
      sxh = 0,
      szh = 0,
      c = 0;
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const h = H.v[j * n + i];
        if (h == null) continue;
        const x = (i - (n - 1) / 2) * paso,
          z = (j - (n - 1) / 2) * paso;
        sx += x;
        sz += z;
        sh += h;
        sxx += x * x;
        szz += z * z;
        sxh += x * h;
        szh += z * h;
        c++;
      }
    if (c < 9) return null;
    const mx = sx / c,
      mz = sz / c,
      mh = sh / c,
      gx = (sxh / c - mx * mh) / Math.max(1, sxx / c - mx * mx),
      gz = (szh / c - mz * mh) / Math.max(1, szz / c - mz * mz);
    return { gx, gz, g: Math.hypot(gx, gz), media: mh };
  }
  function franja(perfil, abajo, color) {
    // malla de una franja vertical alrededor: arriba la altura del perfil, abajo «abajo» (en coordenadas locales del anillo)
    const P = new Float32Array((N + 1) * 2 * 3),
      I = [];
    for (let k = 0; k <= N; k++) {
      const a = (k / N) * Math.PI * 2,
        x = Math.sin(a) * R,
        z = Math.cos(a) * R,
        y = perfil(a);
      P.set([x, y, z, x, abajo, z], k * 6);
      if (k < N) I.push(k * 2, k * 2 + 1, k * 2 + 2, k * 2 + 1, k * 2 + 3, k * 2 + 2);
    }
    const g = new (T().BufferGeometry)();
    g.setAttribute('position', new (T().BufferAttribute)(P, 3));
    g.setIndex(I);
    const m = new (T().MeshBasicMaterial)({ color, side: T().DoubleSide, depthWrite: false, fog: false });
    const me = new (T().Mesh)(g, m);
    me.frustumCulled = false;
    return me;
  }
  // o.ciudad = false: sin silueta de ciudad (el pueblo)
  function montar(S, X, club, o) {
    o = o || {};
    quitar(S);
    if (!S || !S.scene || typeof document === 'undefined') return false;
    const sem = GM.util && GM.util.hash ? GM.util.hash((club && club.id) || 'ciudad') : 7,
      r1 = ruido(sem),
      r2 = ruido(sem + 17),
      r3 = ruido(sem + 41),
      pe = pendiente(X);
    // dirección cuesta arriba (ángulo alrededor del anillo, con la misma convención que la cámara: x = sin a, z = cos a)
    const aSube = pe && pe.g > 0.004 ? Math.atan2(pe.gx, pe.gz) : null,
      hSierra = pe ? Math.max(60, Math.min(650, pe.g * 6000)) : 0,
      Dsierra = 5000;
    // altura aparente en el anillo de algo de h metros a d metros: R * h / d
    const sierra = a => {
      let h = 0;
      if (aSube !== null) {
        const c = Math.cos(a - aSube);
        if (c > 0) h = hSierra * Math.pow(c, 1.3) * (0.55 + 0.45 * r1(a * 3) + 0.2 * r2(a * 9));
      }
      return (R * h) / Dsierra;
    };
    const lejana = a => (R * (35 + 70 * r2(a * 2) + 25 * r3(a * 7))) / 9000; // cordillera baja muy lejana, en todas direcciones
    const montes = a => Math.max(sierra(a), lejana(a)) + 0.02;
    // silueta de ciudad: escalones de 0,4 a 1,6 grados de ancho y 8 a 40 m de alto a unos 2 km
    const escal = [];
    {
      let a = 0,
        s = sem;
      while (a < Math.PI * 2) {
        s = (s * 1664525 + 1013904223) >>> 0;
        const w = (0.4 + (s / 4294967296) * 1.2) * (Math.PI / 180);
        s = (s * 1664525 + 1013904223) >>> 0;
        const h = 6 + (s / 4294967296) ** 2 * 22;
        escal.push([a, a + w, (R * h) / 2500]);
        a += w;
      }
    }
    const ciudad = a => {
      const e = escal.find(q => a >= q[0] && a < q[1]);
      return e ? e[2] : 0.1;
    };
    const g = new (T().Group)();
    g.userData = { horizonte: true };
    const conCiudad = o.ciudad !== false;
    const mM = franja(montes, -R * 0.02, 0x8fa0ae),
      mC = franja(conCiudad ? ciudad : () => 0, -R * 0.02, 0x9aa1a8),
      mS = franja(() => -R * 0.004, -R * 0.2, 0x8c9088); // suelo con bruma bajo el horizonte
    mM.renderOrder = -1.6;
    mC.renderOrder = -1.5;
    mS.renderOrder = -1.4;
    g.add(mM, mC, mS);
    S.scene.add(g);
    // suelo real de 780 m a 3 km alrededor (el plano del suelo de la ciudad acaba a 800 m): con la bruma de la escena, se funde con el horizonte
    const suelo = new (T().Mesh)(new (T().RingGeometry)(780, 3000, 64, 1).rotateX(-Math.PI / 2), new (T().MeshStandardMaterial)({ color: 0x7d7a70, roughness: 1 }));
    suelo.position.y = -0.06;
    suelo.userData = { horizonte: true };
    S.scene.add(suelo);
    S.horizonte = { g, mM, mC, mS, suelo };
    return true;
  }
  function quitar(S) {
    const H = S && S.horizonte;
    if (!H) return;
    if (H.g.parent) H.g.parent.remove(H.g);
    if (H.suelo && H.suelo.parent) H.suelo.parent.remove(H.suelo);
    [H.mM, H.mC, H.mS].concat(H.suelo ? [H.suelo] : []).forEach(m => {
      m.geometry.dispose();
      m.material.dispose();
    });
    S.horizonte = null;
  }
  const _c = { bruma: null, monte: null, casa: null, suelo: null };
  function actualizar(S) {
    const H = S && S.horizonte;
    if (!H || !S.camera) return;
    H.g.position.copy(S.camera.position);
    // el anillo se hunde un poco con la altura de la cámara (lo lejano baja un ángulo minúsculo respecto al horizonte)
    H.g.position.y -= Math.min(6, S.camera.position.y * 0.03);
    const C = T().Color;
    if (!_c.bruma) {
      _c.bruma = new C();
      _c.monte = new C(0x55705a);
      _c.casa = new C(0x7f7a74);
      _c.suelo = new C(0x7d7a70);
    }
    const bruma = S.scene.fog ? _c.bruma.copy(S.scene.fog.color) : _c.bruma.setHex(0xb2cce2),
      noche = S.noche || 0;
    // perspectiva aérea: lo más lejano (el suelo junto al horizonte) casi del color de la bruma; la silueta de ciudad y los montes, algo menos
    H.mM.material.color
      .copy(_c.monte)
      .lerp(bruma, 0.6)
      .multiplyScalar(1 - noche * 0.75);
    H.mC.material.color
      .copy(_c.casa)
      .lerp(bruma, 0.72)
      .multiplyScalar(1 - noche * 0.7);
    H.mS.material.color
      .copy(_c.suelo)
      .lerp(bruma, 0.92)
      .multiplyScalar(1 - noche * 0.75);
  }
  GM.horizonte = { montar, actualizar, quitar, _pendiente: pendiente };
})();
