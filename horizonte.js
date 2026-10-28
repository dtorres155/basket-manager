/* HORIZONTE (GM.horizonte, puntos 144 y 101 de la hoja de ruta 2): lo que se ve más allá de la ciudad que tiene datos, para que ninguna vista
   acabe en un suelo gris vacío. Es un anillo que acompaña a la cámara (como el cielo), a 150 m, con lo que habría a varios kilómetros a su
   tamaño aparente: los montes, una silueta de ciudad lejana y, por debajo del horizonte, una franja de suelo (o de mar) con bruma que tapa el
   borde del plano del suelo. Todo toma el color de la bruma del momento (perspectiva aérea).
   Con datos de relieve lejano (X.HZ: alturas reales en anillos de 1,5 a 20 km en 72 direcciones, tools/osm_horizonte.js) los montes son los
   de verdad (en Badalona, la Serralada de Marina y Collserola) y en las direcciones con mar no hay ni montes ni ciudad: el horizonte es el
   mar. Sin esos datos se estima con la pendiente de la cuadrícula de relieve de la ciudad (X.H) y una sierra baja y lejana.
   Con datos de costa (X.CO, tools/osm_costa.js) se dibujan también, fijos en el mundo, el mar hasta 3,4 km (cerrando la línea de costa con un
   arco por el lado del agua), las playas, los espigones y los muelles (el Pont del Petroli de Badalona, sobre pilares). Y entre el final de
   los datos y 2,6 km, manzanas generadas de baja resolución (manzanas()).
   montar(S, X, club, o), actualizar(S), quitar(S). Lo llaman calle_real.js y pueblo_mundo.js (al construir) y el bucle de sede3d.js. */
(function () {
  const R = 150, // radio del anillo (dentro del plano lejano de la cámara)
    N = 720, // muestras alrededor
    RS = 3400, // radio del mar dibujado (los datos de costa llegan a 3,5 km)
    // altura del mar sobre el suelo: más allá de la cuadrícula de relieve (1 km) las alturas se estiran desde el borde y cada malla las
    // interpola con triángulos distintos (varios metros de diferencia): el mar va 3 m por encima para que el suelo no lo tape
    MAR_Y = 3;
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
  // Horizonte real (X.HZ): para cada dirección de los datos, la tangente del ángulo de elevación más alto (con la curvatura de la Tierra y la
  // refracción) y la parte de los anillos que es mar. h0: altura de los ojos sobre el nivel del mar (el centro de la cuadrícula de relieve)
  function real(X) {
    const Z = X && X.HZ;
    if (!Z || !Z.v || !Z.a || !Z.d) return null;
    const A = Z.a,
      D = Z.d,
      H = X.H,
      h0 = (H && H.v && H.n ? H.v[(H.n * H.n - 1) >> 1] || 0 : 0) + 1.7,
      alt = new Float32Array(A),
      mar = new Float32Array(A);
    for (let a = 0; a < A; a++) {
      let mx = -1,
        agua = 0;
      for (let r = 0; r < D.length; r++) {
        const h = Z.v[r * A + a],
          d = D[r],
          caida = ((d * d) / (2 * 6371000)) * 0.87;
        mx = Math.max(mx, (h - h0 - caida) / d);
        if (h <= 0) agua++;
      }
      alt[a] = mx;
      mar[a] = agua / D.length;
    }
    // ángulo del anillo (x = sin a, z = cos a, con z hacia el sur) a dirección de los datos (0 = norte, crece hacia el este): θ = π − a
    const muestra = (L, a) => {
      const th = ((((Math.PI - a) / (Math.PI * 2)) % 1) + 1) % 1,
        f = th * A,
        i = Math.floor(f) % A,
        t = f - Math.floor(f);
      return L[i] * (1 - t) + L[(i + 1) % A] * t;
    };
    return { alt: a => muestra(alt, a), mar: a => muestra(mar, a) };
  }
  function franja(perfil, abajo, color, tinte) {
    // malla de una franja vertical alrededor: arriba la altura del perfil, abajo «abajo» (en coordenadas locales del anillo); tinte(a)
    // multiplica el color en cada dirección (el mar es más azul que la tierra)
    const P = new Float32Array((N + 1) * 2 * 3),
      C = new Float32Array((N + 1) * 2 * 3),
      I = [];
    for (let k = 0; k <= N; k++) {
      const a = (k / N) * Math.PI * 2,
        x = Math.sin(a) * R,
        z = Math.cos(a) * R,
        y = perfil(a),
        t = tinte ? tinte(a) : [1, 1, 1];
      P.set([x, y, z, x, abajo, z], k * 6);
      C.set([t[0], t[1], t[2], t[0], t[1], t[2]], k * 6);
      if (k < N) I.push(k * 2, k * 2 + 1, k * 2 + 2, k * 2 + 1, k * 2 + 3, k * 2 + 2);
    }
    const g = new (T().BufferGeometry)();
    g.setAttribute('position', new (T().BufferAttribute)(P, 3));
    g.setAttribute('color', new (T().BufferAttribute)(C, 3));
    g.setIndex(I);
    const m = new (T().MeshBasicMaterial)({ color, vertexColors: true, side: T().DoubleSide, depthWrite: false, fog: false });
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
      pe = pendiente(X),
      RE = real(X);
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
    const mar = a => (RE ? Math.max(0, Math.min(1, (RE.mar(a) - 0.45) / 0.35)) : 0); // 1 donde todo es mar
    // con datos reales: el perfil medido (con un poco de detalle para que la cresta no sea lisa) y, detrás, la cordillera lejana solo sobre tierra
    const montes = RE ? a => Math.max(R * RE.alt(a) * (0.92 + 0.16 * r3(a * 23)), lejana(a) * 0.55 * (1 - mar(a))) + 0.02 : a => Math.max(sierra(a), lejana(a)) + 0.02;
    // silueta de ciudad: escalones de 0,4 a 1,6 grados de ancho y 6 a 28 m de alto a unos 2,5 km (nunca sobre el mar)
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
      return (e ? e[2] : 0.1) * (mar(a) > 0.5 ? 0 : 1);
    };
    // el mar, más azul y oscuro que el suelo (multiplica el color del suelo, que se funde con la bruma en actualizar)
    const tinteMar = a => {
      const m = mar(a);
      return [1 - 0.45 * m, 1 - 0.12 * m, 1 + 0.12 * m];
    };
    const g = new (T().Group)();
    g.userData = { horizonte: true };
    const conCiudad = o.ciudad !== false;
    const mM = franja(montes, -R * 0.02, 0x8fa0ae),
      mC = franja(conCiudad ? ciudad : () => 0, -R * 0.02, 0x9aa1a8),
      mS = franja(() => -R * 0.004, -R * 0.2, 0x8c9088, tinteMar); // suelo o mar con bruma bajo el horizonte
    mM.renderOrder = -1.6;
    mC.renderOrder = -1.5;
    mS.renderOrder = -1.4;
    g.add(mM, mC, mS);
    S.scene.add(g);
    // suelo real de 780 m a 3 km alrededor (el plano del suelo de la ciudad acaba a 800 m): con la bruma de la escena, se funde con el horizonte
    const mSueloL = new (T().MeshStandardMaterial)({ color: 0x7d7a70, roughness: 1 });
    if (X && X.OR) ortoMaterial(mSueloL, club);
    const suelo = new (T().Mesh)(new (T().RingGeometry)(780, 3000, 96, 30).rotateX(-Math.PI / 2), mSueloL);
    suelo.position.y = -0.06;
    suelo.userData = { horizonte: true };
    S.scene.add(suelo);
    S.horizonte = { g, mM, mC, mS, suelo, costa: costa(S, X) };
    S.horizonte.manzanas = o.ciudad === false ? null : manzanas(S, X, club, X && X.CO ? mares(X) : null);
    return true;
  }
  // ---------- Costa (punto 101) ----------
  const pipT = (x, z, p) => {
    let c = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) if (p[i][1] > z !== p[j][1] > z && x < ((p[j][0] - p[i][0]) * (z - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) c = !c;
    return c;
  };
  const puntos = (v, desde) => {
    const l = [];
    for (let i = desde || 0; i + 1 < v.length; i += 2) l.push([v[i] / 10, v[i + 1] / 10]);
    return l;
  };
  // corte del segmento a-b (a dentro, b fuera, o al revés) con el círculo de radio RS
  function alCirculo(a, b) {
    const dx = b[0] - a[0],
      dz = b[1] - a[1],
      A = dx * dx + dz * dz,
      B = 2 * (a[0] * dx + a[1] * dz),
      C = a[0] * a[0] + a[1] * a[1] - RS * RS,
      d = Math.sqrt(Math.max(0, B * B - 4 * A * C)),
      t1 = (-B + d) / (2 * A),
      t2 = (-B - d) / (2 * A),
      t = t1 >= 0 && t1 <= 1 ? t1 : t2;
    return [a[0] + dx * t, a[1] + dz * t];
  }
  // polígono de mar: el tramo de costa más largo dentro del círculo se cierra con el arco del lado del agua (a la derecha de la línea, que
  // en OpenStreetMap va con la tierra a la izquierda). Si los dos arcos dejan el agua dentro (un tramo corto junto al borde), el pequeño.
  const area = pol => {
    let a = 0;
    for (let i = 0; i < pol.length; i++) {
      const p = pol[i],
        q = pol[(i + 1) % pol.length];
      a += p[0] * q[1] - q[0] * p[1];
    }
    return Math.abs(a / 2);
  };
  function mares(X) {
    const L = (X.CO.c || []).map(v => puntos(v)),
      dentro = q => Math.hypot(q[0], q[1]) < RS,
      tramos = [],
      res = [];
    L.forEach(l => {
      let i = 0;
      while (i < l.length) {
        if (!dentro(l[i])) {
          i++;
          continue;
        }
        let f = i;
        while (f + 1 < l.length && dentro(l[f + 1])) f++;
        const tramo = l.slice(i, f + 1);
        if (i > 0) tramo.unshift(alCirculo(l[i], l[i - 1]));
        if (f + 1 < l.length) tramo.push(alCirculo(l[f], l[f + 1]));
        i = f + 1;
        // un tramo que acaba dentro del círculo (la línea se corta en los datos) no se puede cerrar con seguridad
        if (tramo.length < 2 || Math.abs(Math.hypot(tramo[0][0], tramo[0][1]) - RS) > 1 || Math.abs(Math.hypot(tramo[tramo.length - 1][0], tramo[tramo.length - 1][1]) - RS) > 1)
          continue;
        let largo = 0;
        for (let k = 1; k < tramo.length; k++) largo += Math.hypot(tramo[k][0] - tramo[k - 1][0], tramo[k][1] - tramo[k - 1][1]);
        if (largo > 400) tramos.push({ tramo, largo });
      }
    });
    tramos.sort((a, b) => b.largo - a.largo);
    tramos.slice(0, 1).forEach(({ tramo }) => {
      {
        const a0 = Math.atan2(tramo[0][1], tramo[0][0]),
          a1 = Math.atan2(tramo[tramo.length - 1][1], tramo[tramo.length - 1][0]);
        // punto de prueba a la derecha del tramo, en su mitad
        const m = Math.max(1, tramo.length >> 1),
          p = tramo[m - 1],
          q = tramo[m],
          ll = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1,
          prueba = [(p[0] + q[0]) / 2 - ((q[1] - p[1]) / ll) * 25, (p[1] + q[1]) / 2 + ((q[0] - p[0]) / ll) * 25];
        const cand = [];
        for (const sentido of [1, -1]) {
          let d = (a0 - a1) * sentido;
          while (d <= 0) d += Math.PI * 2;
          const pol = tramo.slice(),
            n = Math.ceil(d / (Math.PI / 72));
          for (let k = 1; k < n; k++) {
            const a = a1 + (d * k * sentido) / n;
            pol.push([Math.cos(a) * RS, Math.sin(a) * RS]);
          }
          if (pipT(prueba[0], prueba[1], pol)) cand.push(pol);
        }
        cand.sort((a, b) => area(a) - area(b));
        if (cand.length) res.push(cand[0]);
      }
    });
    return res;
  }
  function costa(S, X) {
    if (!X || !X.CO || typeof document === 'undefined') return null;
    const g = new (T().Group)(),
      V2 = T().Vector2;
    g.userData = { costa: true };
    const malla = (pols, mat, y) => {
      const P = [],
        I = [];
      pols.forEach(pol => {
        if (pol.length < 3) return;
        const tri = T().ShapeUtils.triangulateShape(
            pol.map(q => new V2(q[0], q[1])),
            []
          ),
          b = P.length / 3;
        pol.forEach(q => P.push(q[0], y, q[1]));
        tri.forEach(t => I.push(b + t[0], b + t[2], b + t[1]));
      });
      if (!I.length) return null;
      // con relieve, el desplazamiento se calcula en los vértices: los triángulos de kilómetros quedaban por debajo del suelo
      if (GM.relieve && GM.relieve.activo() && GM.mods.calleReal && GM.mods.calleReal._int) {
        const A = { P, I, N: [] };
        for (let i = 0; i < P.length / 3; i++) A.N.push(0, 1, 0);
        GM.mods.calleReal._int.subdividir(A, 60); // añade los vértices nuevos al mismo P y devuelve los triángulos en A.I
        I.length = 0;
        for (const k of A.I) I.push(k);
      }
      const geo = new (T().BufferGeometry)();
      geo.setAttribute('position', new (T().Float32BufferAttribute)(P, 3));
      geo.setIndex(I);
      geo.computeVertexNormals();
      // las normales hacia arriba (el sentido de los polígonos depende de los datos)
      const nn = geo.attributes.normal;
      for (let i = 0; i < nn.count; i++) nn.setXYZ(i, 0, 1, 0);
      const me = new (T().Mesh)(geo, mat);
      me.receiveShadow = true;
      me.userData = { costa: true };
      g.add(me);
      return me;
    };
    // mar
    const ms = mares(X);
    if (ms.length) {
      // color propio y poco reflejo: a ras, el reflejo del cielo del entorno lo dejaba rosado
      const agua = new (T().MeshStandardMaterial)({ color: 0x2c6683, roughness: 0.32, metalness: 0, envMapIntensity: 0.35 });
      agua.side = T().DoubleSide;
      agua.polygonOffset = true;
      agua.polygonOffsetFactor = -3;
      agua.polygonOffsetUnits = -3;
      malla(ms, agua, MAR_Y);
    }
    // playas
    const playas = (X.CO.p || []).map(v => puntos(v)).filter(p => p.length >= 3 && p.some(q => Math.hypot(q[0], q[1]) < RS));
    if (playas.length) {
      const arena = new (T().MeshStandardMaterial)({ color: 0xe2cfa6, roughness: 1, side: T().DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      if (GM.texturas) GM.texturas.aplicar(arena, 'Ground054', { tinte: 0xf0dfba, relieve: 0.4 });
      malla(playas, arena, 0.25);
    }
    // muelles y espigones: tablero sobre pilares (el Pont del Petroli, a 5 m; los pantalanes del puerto, a ras de agua) y escolleras
    const partes = { tablero: [], pilar: [], roca: [] },
      m4 = new (T().Matrix4)(),
      q = new (T().Quaternion)(),
      up = new (T().Vector3)(0, 1, 0);
    (X.CO.m || []).forEach(m => {
      const l = puntos(m, 2).filter(p => Math.hypot(p[0], p[1]) < RS);
      if (l.length < 2) return;
      const petroli = /petroli/i.test(m[1] || ''),
        muelle = m[0] === 0,
        ancho = muelle ? (petroli ? 7 : 2.6) : 9,
        alto = MAR_Y + (muelle ? (petroli ? 5 : 0.6) : 1.6);
      for (let i = 0; i + 1 < l.length; i++) {
        const a = l[i],
          b = l[i + 1],
          d = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (d < 0.5) continue;
        const ry = Math.atan2(b[0] - a[0], b[1] - a[1]);
        q.setFromAxisAngle(up, ry);
        if (muelle) {
          m4.compose(new (T().Vector3)((a[0] + b[0]) / 2, alto, (a[1] + b[1]) / 2), q, new (T().Vector3)(ancho, 0.5, d + 0.3));
          partes.tablero.push(m4.clone());
          if (petroli)
            for (let s = 0; s <= d; s += 10)
              for (const lado of [-1, 1]) {
                const t = s / d;
                m4.compose(
                  new (T().Vector3)(
                    a[0] + (b[0] - a[0]) * t + Math.cos(ry) * lado * (ancho / 2 - 0.6),
                    alto / 2 - 1,
                    a[1] + (b[1] - a[1]) * t - Math.sin(ry) * lado * (ancho / 2 - 0.6)
                  ),
                  q,
                  new (T().Vector3)(0.8, alto + 2, 0.8)
                );
                partes.pilar.push(m4.clone());
              }
        } else {
          m4.compose(new (T().Vector3)((a[0] + b[0]) / 2, alto / 2 - 0.5, (a[1] + b[1]) / 2), q, new (T().Vector3)(ancho, alto + 1, d + ancho * 0.6));
          partes.roca.push(m4.clone());
        }
      }
    });
    const caja = new (T().BoxGeometry)(1, 1, 1);
    [
      ['tablero', 0xb9b2a6],
      ['pilar', 0x8f8a82],
      ['roca', 0x77736c]
    ].forEach(([k, c]) => {
      if (!partes[k].length) return;
      const mat = new (T().MeshStandardMaterial)({ color: c, roughness: 0.9 });
      if (GM.texturas) GM.texturas.aplicar(mat, 'Concrete034', { tinte: c, relieve: 0.6 });
      const im = new (T().InstancedMesh)(caja, mat, partes[k].length);
      partes[k].forEach((mm, i) => im.setMatrixAt(i, mm));
      im.userData = { costa: k };
      im.castShadow = false;
      im.receiveShadow = true;
      g.add(im);
    });
    if (!g.children.length) return null;
    S.scene.add(g);
    return g;
  }
  // ---------- Manzanas lejanas (punto 144) ----------
  // Más allá de los edificios con datos (el anillo lejano llega a 1 km) y hasta 2,6 km: manzanas de baja resolución con la orientación de las
  // calles de la ciudad y la altura del barrio (más bajas cuanto más lejos, con alguna torre), nunca en el mar ni en las laderas empinadas
  // (alturas reales de X.HZ). Un solo instanciado de cajas con ventanas por metros (encendidas de noche a medias); la bruma las funde con
  // el horizonte. Las ventanas: la coordenada de textura sale de la posición dentro de cada caja ya escalada, en el shader.
  const RM = 2600;
  function manzanas(S, X, club, mars) {
    if (!X || typeof document === 'undefined' || !X.C || !X.C.length) return null;
    const sem = GM.util && GM.util.hash ? GM.util.hash((club && club.id) || 'ciudad') : 7;
    let s = sem >>> 0 || 1;
    const azar = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
    // hasta dónde llegan los datos y altura del barrio (mediana de plantas)
    let r0 = 0;
    const lv = [],
      lejos = (e, desde) => {
        let r = 0;
        for (let i = desde; i + 1 < e.length; i += 2) r = Math.max(r, Math.hypot(e[i], e[i + 1]));
        return r;
      };
    const rs = [];
    if (X.L && X.L.e)
      X.L.e.forEach(e => {
        rs.push(lejos(e, 1));
        if (e[0]) lv.push(e[0]);
      });
    (X.B || []).forEach(b => {
      if (b.p) rs.push(Math.max(...b.p.map(q => Math.hypot(q[0], q[1]))));
      if (b.lv) lv.push(b.lv);
    });
    // donde acaba el 95 % de los edificios con datos (uno suelto más lejos no cuenta)
    rs.sort((a, b) => a - b);
    r0 = rs.length ? rs[Math.floor(rs.length * 0.95)] : 0;
    lv.sort((a, b) => a - b);
    const med = lv.length ? lv[lv.length >> 1] : 4,
      ini = Math.max(420, Math.min(r0, 1300) + 50);
    // orientación dominante de las calles (histograma de ángulos módulo 90 grados, pesado por longitud)
    const hist = new Float32Array(36);
    X.C.forEach(c => {
      for (let i = 0; i + 1 < c.p.length; i++) {
        const dx = c.p[i + 1][0] - c.p[i][0],
          dz = c.p[i + 1][1] - c.p[i][1],
          l = Math.hypot(dx, dz);
        if (l < 5) continue;
        const a = (((Math.atan2(dz, dx) % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2)) / (Math.PI / 2);
        hist[Math.min(35, Math.floor(a * 36))] += l;
      }
    });
    let mejor = 0;
    for (let i = 1; i < 36; i++) if (hist[i] > hist[mejor]) mejor = i;
    const ang = ((mejor + 0.5) / 36) * (Math.PI / 2),
      ca = Math.cos(ang),
      sa = Math.sin(ang);
    // alturas reales alrededor: la ladera (más de 90 m sobre el centro) no se edifica
    const RE = X.HZ && X.HZ.v ? X.HZ : null,
      H = X.H,
      hc = H && H.v && H.n ? H.v[(H.n * H.n - 1) >> 1] || 0 : 0,
      ladera = (x, z) => {
        if (!RE) return false;
        const A = RE.a,
          th = (((Math.atan2(x, -z) / (Math.PI * 2)) % 1) + 1) % 1, // 0 al norte, hacia el este
          f = th * A,
          i = Math.floor(f) % A,
          t = f - Math.floor(f),
          r = Math.hypot(x, z),
          alt = k => RE.v[k * A + i] * (1 - t) + RE.v[k * A + ((i + 1) % A)] * t,
          D = RE.d;
        let h;
        if (r <= D[0]) h = alt(0);
        else {
          let k = 0;
          while (k + 1 < D.length && D[k + 1] < r) k++;
          const u = Math.min(1, (r - D[k]) / ((D[k + 1] || D[k] + 1) - D[k]));
          h = alt(k) * (1 - u) + alt(Math.min(D.length - 1, k + 1)) * u;
        }
        return h - hc > 90;
      };
    const pip = (x, z, p) => {
        let c = false;
        for (let i = 0, j = p.length - 1; i < p.length; j = i++)
          if (p[i][1] > z !== p[j][1] > z && x < ((p[j][0] - p[i][0]) * (z - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) c = !c;
        return c;
      },
      enMar = (x, z) => (mars || []).some(p => pip(x, z, p));
    const PASO = 95,
      M4 = new (T().Matrix4)(),
      Q = new (T().Quaternion)().setFromAxisAngle(new (T().Vector3)(0, 1, 0), -ang),
      lista = [],
      COL = ['#e8dcc6', '#ddd0b8', '#efe6d6', '#d6c3a4', '#e3d6c0', '#c9b79a', '#f1ece2'];
    const n = Math.ceil(RM / PASO);
    for (let j = -n; j <= n; j++)
      for (let i = -n; i <= n; i++) {
        const u = i * PASO,
          v = j * PASO,
          x = u * ca - v * sa,
          z = u * sa + v * ca,
          r = Math.hypot(x, z);
        if (r < ini || r > RM) continue;
        if (enMar(x, z) || enMar(x + 45, z) || enMar(x - 45, z) || enMar(x, z + 45) || enMar(x, z - 45) || ladera(x, z)) continue;
        if (azar() < 0.08) continue; // algún hueco: parque o solar
        const t = (r - ini) / (RM - ini),
          partes = azar() < 0.5 ? 4 : 2;
        for (let k = 0; k < partes; k++) {
          const torre = azar() < 0.025,
            pl = Math.max(1, Math.round(med * (1.15 - 0.45 * t) * (0.65 + 0.7 * azar()) * (torre ? 2.6 : 1))),
            h = pl * 3.1 + 0.4,
            // 4 bloques de 38 x 38 m o 2 de 80 x 38 m, con 4 m de separación
            w = partes === 4 ? 38 : 80,
            d = 38,
            ou = partes === 4 ? (k % 2 ? 21 : -21) : 0,
            ov = k < 2 && partes === 4 ? -21 : partes === 4 ? 21 : k ? 21 : -21,
            px = x + ou * ca - ov * sa,
            pz = z + ou * sa + ov * ca;
          M4.compose(new (T().Vector3)(px, h / 2, pz), Q, new (T().Vector3)(w, h, d));
          lista.push({ m: M4.clone(), c: COL[Math.floor(azar() * COL.length)] });
        }
      }
    if (!lista.length) return null;
    // ventanas: 4 por 4 en la textura (12,8 m de ancho y 4 plantas); unas encendidas y otras no
    const tex = (clave, luz) => {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 256;
      const x = cv.getContext('2d');
      x.fillStyle = luz ? '#000000' : '#ffffff';
      x.fillRect(0, 0, 256, 256);
      let sd = 11;
      const az = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      for (let f = 0; f < 4; f++)
        for (let c = 0; c < 4; c++) {
          const on = az() < 0.55;
          x.fillStyle = luz ? (on ? (az() < 0.3 ? '#cfe0ff' : '#ffd9a0') : '#000000') : '#3a4552';
          x.fillRect(c * 64 + 20, f * 64 + 14, 24, 34);
        }
      const t = new (T().CanvasTexture)(cv);
      t.wrapS = t.wrapT = T().RepeatWrapping;
      t.colorSpace = luz ? T().SRGBColorSpace : T().SRGBColorSpace;
      t.anisotropy = 4;
      t.name = clave;
      return t;
    };
    const mat = new (T().MeshStandardMaterial)({ map: tex('manzanas'), emissive: 0xffffff, emissiveMap: tex('manzanas-luz', true), emissiveIntensity: 0, roughness: 0.92 });
    mat.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader.replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
{
  vec2 uvM = vec2( 0.06, 0.03 );
#ifdef USE_INSTANCING
  float sxM = length( instanceMatrix[ 0 ].xyz ), szM = length( instanceMatrix[ 2 ].xyz );
  float yM = ( instanceMatrix * vec4( transformed, 1.0 ) ).y;
  if ( abs( objectNormal.y ) < 0.5 ) uvM = vec2( ( transformed.x * sxM + transformed.z * szM ) / 12.8, yM / 12.4 );
#endif
#ifdef USE_MAP
  vMapUv = uvM;
#endif
#ifdef USE_EMISSIVEMAP
  vEmissiveMapUv = uvM;
#endif
}`
      );
    };
    mat.customProgramCacheKey = () => 'manzanas-lejanas';
    const im = new (T().InstancedMesh)(new (T().BoxGeometry)(1, 1, 1), mat, lista.length),
      cc = new (T().Color)();
    lista.forEach((o, i) => {
      im.setMatrixAt(i, o.m);
      im.setColorAt(i, cc.set(o.c));
    });
    im.userData = { manzanasLejanas: true };
    im.castShadow = false;
    im.receiveShadow = false;
    im.computeBoundingSphere();
    S.scene.add(im);
    if (S.ventanas) S.ventanas.push(mat);
    return im;
  }
  // ---------- Ortofoto en el suelo lejano (punto 146) ----------
  // Si la ciudad tiene foto aérea (vendor/orto/<id>.jpg, 4 x 4 km centrada en el pabellón, tools/ortofoto.js), el suelo se funde con ella
  // a partir de 400 m: desde arriba y en el horizonte se ve la ciudad de verdad; junto al pabellón siguen las calles del juego. La textura
  // se pide una vez por ciudad; hasta que llega, el uniforme vale 0 y el suelo queda como estaba.
  const ORTO = {};
  function ortoMaterial(mat, club) {
    if (!mat || !club || typeof document === 'undefined') return mat;
    let o = ORTO[club.id];
    if (!o) {
      o = ORTO[club.id] = { tex: { value: null }, k: { value: 0 } };
      new (T().TextureLoader)().load(
        'orto/' + club.id + '.jpg',
        t => {
          t.colorSpace = T().SRGBColorSpace;
          t.anisotropy = 8;
          o.tex.value = t;
          o.k.value = 1;
        },
        undefined,
        () => {
          o.k.value = 0;
        }
      );
    }
    const prev = mat.onBeforeCompile,
      clave = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : null;
    mat.onBeforeCompile = function (sh, r) {
      if (prev) prev.call(this, sh, r);
      sh.uniforms.uOrto = o.tex;
      sh.uniforms.uOrtoK = o.k;
      sh.vertexShader = 'varying vec2 vWOr;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vWOr = (modelMatrix * vec4(transformed, 1.0)).xz;');
      sh.fragmentShader =
        'uniform sampler2D uOrto;\nuniform float uOrtoK;\nvarying vec2 vWOr;\n' +
        sh.fragmentShader.replace(
          '#include <color_fragment>',
          '#include <color_fragment>\n if (uOrtoK > 0.0) { float fO = smoothstep(380.0, 470.0, length(vWOr)) * (1.0 - smoothstep(1950.0, 2040.0, max(abs(vWOr.x), abs(vWOr.y)))) * uOrtoK; if (fO > 0.0) diffuseColor.rgb = mix(diffuseColor.rgb, texture2D(uOrto, vec2((vWOr.x + 2048.0) / 4096.0, 1.0 - (vWOr.y + 2048.0) / 4096.0)).rgb * 0.92, fO); }'
        );
    };
    mat.customProgramCacheKey = () => (clave ? clave() : '') + '-orto';
    mat.needsUpdate = true;
    return mat;
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
    if (H.manzanas) {
      if (H.manzanas.parent) H.manzanas.parent.remove(H.manzanas);
      H.manzanas.geometry.dispose();
      if (S.ventanas) S.ventanas = S.ventanas.filter(m => m !== H.manzanas.material);
      H.manzanas.material.map.dispose();
      H.manzanas.material.emissiveMap.dispose();
      H.manzanas.material.dispose();
    }
    if (H.costa) {
      if (H.costa.parent) H.costa.parent.remove(H.costa);
      H.costa.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
    }
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
      .lerp(bruma, 0.86)
      .multiplyScalar(1 - noche * 0.75);
  }
  GM.horizonte = { montar, actualizar, quitar, ortoMaterial, _pendiente: pendiente, _mares: mares, _real: real };
})();
