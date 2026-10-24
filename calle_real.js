/* LA CIUDAD REAL (GM.calleReal) — la calle del club con el plano de verdad (OpenStreetMap)
   Para cada club con datos (vendor/osm/<id>.json, que tools/osm_generar.js saca de OpenStreetMap, © colaboradores, ODbL) se pasea la ciudad real
   en 300 m alrededor del pabellón: sus calles con su nombre y su ancho, sus manzanas, la huella y las plantas de cada edificio, parques, ríos
   y lagos. El pabellón es el edificio real; la sede, la tienda, la peña, el ayuntamiento, el colegio, el hospital, tus viviendas y los locales
   se colocan en edificios reales (con su puerta hacia la calle más cercana). Usa el motor de sede3d.js y las mismas piezas que calle3d.js.
   Expone: cargar(id), datos(id), construir(S, M, st), poblar(S, M, st), actualizar(S, M, dt). */
(function () {
  const U = GM.util,
    R = 300,
    CELDA = 0.75;
  const ANCHO = [16, 12, 10, 8.5, 7, 5.5, 4],
    ACERA = 2.3;
  const CACHE = {};
  function cargar(id, st) {
    if (id in CACHE) return Promise.resolve(CACHE[id]);
    // sin datos de OpenStreetMap (o sin conexión) se genera una ciudad con el mismo formato (calle_sintetica.js); en las pruebas de Node sigue la calle antigua
    const sint = () => {
      const c = st && st.equipos && st.equipos[id];
      return GM.calleSintetica && typeof location !== 'undefined' ? casasSinteticas(GM.calleSintetica.plano(id, c && c.pais, c && c.ciudad), id) : null;
    };
    if (typeof window !== 'undefined' && window.__sinOSM && typeof location !== 'undefined') return Promise.resolve((CACHE[id] = sint()));
    if (typeof fetch !== 'function' || typeof location === 'undefined' || !/^(https?|app|file):$/.test(location.protocol || '')) return Promise.resolve((CACHE[id] = null));
    return fetch('osm/' + id + '.json')
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null)
      .then(d => (CACHE[id] = d && d.e && d.c && ((d.e.length >= 10 && d.c.length >= 6) || d.c.length >= 30) ? casasSinteticas(d, id) : sint()));
  }
  // Huecos (punto 97 de la hoja de ruta 2; antes solo en ciudades con menos de 90 edificios): se añaden edificios a ambos lados de las calles
  // donde el frente está vacío, sin pisar edificios ni sus partes, parques, agua, aparcamientos, pistas, plazas, usos del suelo, vías del tren
  // ni otras calles. Su altura es la de los edificios reales de alrededor (bloques donde son altos, casas donde son bajos).
  // Entran en el mismo formato que los edificios de OpenStreetMap (clase 1 vivienda o 0 bloque), así que reciben fachadas, tejados y papeles como los reales; `d.sint` guarda cuántos hay.
  function casasSinteticas(d, id) {
    if (!d || d.sint !== undefined) return d;
    const pocos = d.e.length < 90;
    const r = rnd(GM.util.hash('casas' + id)),
      RAD = 2900,
      segs = [],
      poli = [],
      cajas = [];
    d.c.forEach(c => {
      for (let i = 3; i + 3 < c.length; i += 2) segs.push([c[i], c[i + 1], c[i + 2], c[i + 3], c[0]]);
    });
    const areas = (L, desde, ok) =>
      (L || []).forEach(a => {
        if (ok && !ok(a)) return;
        const p = [];
        for (let i = desde; i + 1 < a.length; i += 2) p.push([a[i], a[i + 1]]);
        if (p.length >= 3) poli.push(p);
      });
    areas(d.p, 1);
    areas(d.a, 1);
    areas(d.k, 1);
    areas(d.pl, 1);
    areas(d.u, 1, a => a[0] !== 2 && a[0] !== 3 && a[0] !== 4);
    (d.bp || []).forEach(a => {
      const p = [];
      for (let i = 4; i + 1 < a.length; i += 2) p.push([a[i], a[i + 1]]);
      if (p.length >= 3) poli.push(p);
    });
    // vías del tren: como una calle de 6 m a cada lado
    (d.v || []).forEach(v => {
      for (let i = 1; i + 3 < v.length; i += 2) segs.push([v[i], v[i + 1], v[i + 2], v[i + 3], -1]);
    });
    // altura del barrio: plantas de los edificios reales (los que la tienen) con su posición
    const reales = d.e
      .filter(e => e[0] > 0)
      .map(e => {
        let x = 0,
          z = 0,
          n = 0;
        for (let i = 5; i + 1 < e.length; i += 2) {
          x += e[i];
          z += e[i + 1];
          n++;
        }
        return [x / n, z / n, e[0]];
      });
    const plantasCerca = (x, z) => {
      const l = reales.filter(q => Math.hypot(q[0] - x, q[1] - z) < 1200).map(q => q[2]);
      if (!l.length) return null;
      l.sort((a, b) => a - b);
      return l[l.length >> 1];
    };
    d.e.forEach(b => {
      const p = [];
      for (let i = 5; i + 1 < b.length; i += 2) p.push([b[i], b[i + 1]]);
      if (p.length >= 3) {
        poli.push(p);
        let x0 = 1e9,
          x1 = -1e9,
          z0 = 1e9,
          z1 = -1e9;
        p.forEach(q => {
          x0 = Math.min(x0, q[0]);
          x1 = Math.max(x1, q[0]);
          z0 = Math.min(z0, q[1]);
          z1 = Math.max(z1, q[1]);
        });
        cajas.push([x0 - 70, z0 - 70, x1 + 70, z1 + 70]);
      }
    });
    const dentro = (x, z) =>
      poli.some(p => {
        let c = false;
        for (let i = 0, j = p.length - 1; i < p.length; j = i++)
          if (p[i][1] > z !== p[j][1] > z && x < ((p[j][0] - p[i][0]) * (z - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) c = !c;
        return c;
      });
    const dSeg = (x, z, s) => {
      const dx = s[2] - s[0],
        dz = s[3] - s[1],
        l2 = dx * dx + dz * dz || 1,
        t = Math.max(0, Math.min(1, ((x - s[0]) * dx + (z - s[1]) * dz) / l2));
      return Math.hypot(x - s[0] - t * dx, z - s[1] - t * dz);
    };
    const nuevos = [];
    let intentos = 0;
    // Ciudades con edificios: hileras continuas (como una manzana) en los frentes vacíos de calles que ya tienen edificios cerca, a más de
    // 90 m del pabellón (su plaza y su aparcamiento no se tocan). Las casas sueltas de abajo quedan para los pabellones aislados.
    const realesCaja = cajas.slice(),
      cercaReal = (x, z, m) => realesCaja.some(b => x > b[0] - m && x < b[2] + m && z > b[1] - m && z < b[3] + m);
    if (!pocos)
      for (const sg of segs) {
        const clase = sg[4];
        if (clase === 0 || clase === 5 || clase === -1) continue;
        const L = Math.hypot(sg[2] - sg[0], sg[3] - sg[1]);
        if (L < 300) continue;
        const ux = (sg[2] - sg[0]) / L,
          uz = (sg[3] - sg[1]) / L;
        for (const lado of [-1, 1]) {
          const fondo = 120 + r() * 30,
            off = (ANCHO[clase] || 6) * 5 + ACERA * 10 + 12 + fondo / 2,
            en = t => [sg[0] + ux * t - uz * lado * off, sg[1] + uz * t + ux * lado * off];
          const libre = t => {
            const [cx, cz] = en(t);
            if (Math.hypot(cx, cz) < 900 || Math.hypot(cx, cz) > RAD) return false;
            if (cajas.some(b => cx > b[0] && cx < b[2] && cz > b[1] && cz < b[3]) || dentro(cx, cz)) return false;
            return !segs.some(o => o !== sg && dSeg(cx, cz, o) < (o[4] === -1 ? 60 : (ANCHO[o[4]] || 6) * 5 + ACERA * 10) + fondo / 2 + 5);
          };
          let t = 60;
          while (t < L - 60 && nuevos.length < 160) {
            if (!libre(t)) {
              t += 20;
              continue;
            }
            let t1 = t;
            while (t1 + 20 < L - 60 && libre(t1 + 20)) t1 += 20;
            const [mx, mz] = en((t + t1) / 2);
            if (t1 - t >= 80 && cercaReal(mx, mz, 300)) {
              const pc = plantasCerca(mx, mz),
                bloque = pc ? pc >= 4 : r() < 0.5;
              for (let a = t; a < t1 - 60;) {
                const w = Math.min(t1 - a, 80 + r() * 80),
                  [cx, cz] = en(a + w / 2),
                  hx = w / 2,
                  hz = fondo / 2,
                  pts = [
                    [-hx, -hz],
                    [hx, -hz],
                    [hx, hz],
                    [-hx, hz]
                  ].map(q => [Math.round(cx + q[0] * ux - q[1] * uz), Math.round(cz + q[0] * uz + q[1] * ux)]),
                  plantas = pc ? Math.max(2, Math.min(12, pc + Math.round((r() - 0.5) * 2))) : bloque ? 3 + Math.floor(r() * 3) : 2 + Math.floor(r() * 2);
                nuevos.push([plantas, bloque ? 0 : 1, -1, -1, bloque ? 1 : 2].concat(...pts));
                cajas.push([cx - w / 2 - 10, cz - w / 2 - 10, cx + w / 2 + 10, cz + w / 2 + 10]);
                a += w;
              }
            }
            t = t1 + 40;
          }
        }
      }
    if (pocos)
      for (const sg of segs) {
        const clase = sg[4];
        if (clase === 0 || clase === 5 || clase === -1) continue;
        const L = Math.hypot(sg[2] - sg[0], sg[3] - sg[1]);
        if (L < 180) continue;
        const ux = (sg[2] - sg[0]) / L,
          uz = (sg[3] - sg[1]) / L;
        for (let t = 90 + r() * 120; t < L - 90; t += 160 + r() * 90)
          for (const lado of [-1, 1]) {
            if (nuevos.length >= (pocos ? 150 : 120) || intentos++ > 4000) break;
            if (r() < 0.2) continue;
            const ancho = 100 + r() * 70,
              fondo = 90 + r() * 40,
              off = (ANCHO[clase] || 6) * 5 + ACERA * 10 + 12 + fondo / 2;
            const cx = sg[0] + ux * t - uz * lado * off,
              cz = sg[1] + uz * t + ux * lado * off;
            if (Math.hypot(cx, cz) > RAD) continue;
            if (cajas.some(b => cx > b[0] && cx < b[2] && cz > b[1] && cz < b[3]) || dentro(cx, cz)) continue;
            if (segs.some(o => dSeg(cx, cz, o) < (o[4] === -1 ? 60 : (ANCHO[o[4]] || 6) * 5 + ACERA * 10) + fondo / 2 + 5)) continue;
            const pc = pocos ? null : plantasCerca(cx, cz),
              bloque = pc ? pc >= 4 : r() < 0.3,
              hx = ancho / 2,
              hz = fondo / 2,
              pts = [
                [-hx, -hz],
                [hx, -hz],
                [hx, hz],
                [-hx, hz]
              ].map(q => [Math.round(cx + q[0] * ux - q[1] * uz), Math.round(cz + q[0] * uz + q[1] * ux)]);
            const plantas = pc ? Math.max(2, Math.min(12, pc + Math.round((r() - 0.5) * 2))) : bloque ? 3 + Math.floor(r() * 3) : 2 + Math.floor(r() * 2);
            nuevos.push([plantas, bloque ? 0 : 1, -1, -1, bloque ? 1 : 2].concat(...pts));
            cajas.push([cx - ancho / 2 - 70, cz - ancho / 2 - 70, cx + ancho / 2 + 70, cz + ancho / 2 + 70]);
          }
      }
    d.e = d.e.concat(nuevos);
    d.sint = nuevos.length;
    return d;
  }
  const datos = id => CACHE[id] || null;
  const rnd = seed => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const PALETA = {
    ES: ['#ead9bd', '#dcc3a0', '#f2e6d2', '#d1b38c', '#e6cfae', '#cdb497'],
    IT: ['#d9a86c', '#c98f58', '#e2bb85', '#cf9c63', '#dcb79a'],
    GR: ['#f4f2ec', '#ebe8e0', '#f7f6f1', '#e3ddd0'],
    TR: ['#ddd2bd', '#c9bba2', '#e5dccb', '#d6c6ad'],
    DE: ['#d8d4cc', '#c3ccd2', '#e2d6c2', '#bfc6c0', '#cfc7bb'],
    US: ['#9c4a35', '#b5654a', '#7d3b2c', '#a85a40', '#8f8a82', '#b9b2a6']
  };
  const TEJAS = { ES: '#a65a3e', IT: '#b0603f', GR: '#a8553a', TR: '#9a4f36', DE: '#6a5448', US: '#5a5551' };
  const col = h => new THREE.Color(h);
  const pip = (x, z, p) => {
    let d = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      if (p[i][1] > z !== p[j][1] > z && x < ((p[j][0] - p[i][0]) * (z - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) d = !d;
    }
    return d;
  };
  const dSeg = (x, z, a, b) => {
    const dx = b[0] - a[0],
      dz = b[1] - a[1],
      l = dx * dx + dz * dz || 1e-9,
      t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l));
    return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
  };
  const pts = (a, h) => {
    const o = [];
    for (let i = h; i + 1 < a.length; i += 2) o.push([a[i] / 10, a[i + 1] / 10]);
    return o;
  };

  // ---------- Materiales ----------
  function suelo(id, o, color, nivel) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.93, side: THREE.DoubleSide });
    if (GM.texturas) GM.texturas.aplicar(m, id, o);
    m.polygonOffset = true;
    m.polygonOffsetFactor = -nivel;
    m.polygonOffsetUnits = -nivel;
    return m;
  }
  // Reglas de material de fachada (punto 94 de la hoja de ruta 2): por país y estilo de fachada (0 casa, 1 balconera, 2 oficinas y torres,
  // 3 ensanche, 4 bloque, 5 nave). Cada casilla es una lista de preferencia: se usa el primer material que esté cargado.
  // Los de ladrillo, hormigón y chapa llevan su color propio (el edificio no se pinta); los revoques se pintan con la paleta del barrio.
  // Fase B (punto 94) con los materiales descargados. Casa y balconera pintadas; oficinas y torres de hormigón; ensanche de estuco (de
  // ladrillo beige en EE. UU.); bloques de ladrillo visto en España y EE. UU., de hormigón en Grecia, Turquía y Alemania; naves de chapa.
  const MED = ['Plaster003'],
    PINT = ['PaintedPlaster017', 'Plaster003'],
    CHAPA = ['CorrugatedSteel009', 'Metal055A'],
    REGLAS_FACHADA = {
      ES: [PINT, MED, ['Concrete046', 'Concrete034'], MED, ['Bricks085'], CHAPA],
      IT: [PINT, MED, ['Concrete046', 'Concrete034'], MED, MED, CHAPA],
      GR: [PINT, PINT, ['Concrete045', 'Concrete034'], MED, ['Concrete046', 'Concrete034'], CHAPA],
      TR: [PINT, PINT, ['Concrete045', 'Concrete034'], MED, ['Concrete046', 'Concrete034'], CHAPA],
      DE: [MED, MED, ['Concrete046', 'Concrete034'], MED, ['Concrete048', 'Concrete034'], CHAPA],
      US: [['Bricks085'], ['Bricks085'], ['Concrete046', 'Concrete034'], ['Bricks105', 'Bricks085'], ['Bricks085'], CHAPA]
    };
  // Cubiertas y suelos por país: azotea de losas en el Mediterráneo y de grava en el norte y EE. UU.; teja árabe en el sur, gris en
  // Alemania y oscura (tipo pizarra) en EE. UU.; aceras de losa de hormigón en las ciudades y adoquín donde ya lo había
  const MEDITERRANEO = ['ES', 'IT', 'GR', 'TR'];
  const cubiertaDe = pais => (MEDITERRANEO.indexOf(pais) >= 0 ? ['PavingStones136', 'Concrete034'] : ['Gravel040', 'Concrete034']);
  const tejaDe = pais => (pais === 'DE' ? ['RoofingTiles015A', 'RoofingTiles013A'] : pais === 'US' ? ['RoofingTiles003', 'RoofingTiles013A'] : ['RoofingTiles013A']);
  const primero = lista => {
    const T = GM.texturas;
    return (T && T.tiene && lista.find(id => T.tiene(id))) || lista[0];
  };
  function paredDe(pais, est) {
    const lista = (REGLAS_FACHADA[pais] || REGLAS_FACHADA.ES)[est] || MED,
      T = GM.texturas;
    return (T && T.tiene && lista.find(id => T.tiene(id))) || lista[0];
  }
  const conColorPropio = id => /^(Bricks|Concrete|Metal|CorrugatedSteel|Facade)/.test(id);
  // Recorte: la pared, el techo y lo que hay entre la cámara y tu personaje se perfora (con borde difuminado) para no perderte detrás de un edificio
  function recortable(S, m) {
    m.userData = m.userData || {};
    if (m.userData.recortable) {
      m.userData.recS = S;
      return m;
    } // un material compartido no se envuelve dos veces (cada vuelta guardaba la escena anterior)
    m.userData.recortable = true;
    m.userData.recS = S;
    const previo = m.onBeforeCompile,
      clave = m.customProgramCacheKey ? m.customProgramCacheKey() : '';
    m.onBeforeCompile = sh => {
      if (previo) previo(sh);
      const S = m.userData.recS;
      sh.uniforms.uRecP = S.rec.p;
      sh.uniforms.uRecC = S.rec.c;
      sh.uniforms.uRecR = S.rec.r;
      sh.vertexShader = 'varying vec3 vWp;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader =
        'varying vec3 vWp; uniform vec3 uRecP; uniform vec3 uRecC; uniform float uRecR; float recK = 1.0;\n' +
        sh.fragmentShader
          .replace(
            '#include <clipping_planes_fragment>',
            '#include <clipping_planes_fragment>\n' +
              ' { vec3 ab = uRecP - uRecC; float t = clamp(dot(vWp - uRecC, ab) / max(dot(ab, ab), 0.001), 0.0, 1.0); float d = distance(vWp, uRecC + ab * t);\n' +
              '   if (t < 0.96 && d < uRecR && vWp.y > 0.9) recK = smoothstep(uRecR * 0.82, uRecR, d); }'
          )
          // (punto 103) antes: trama de puntos (descarte con patrón de Bayer); ahora transparencia por cobertura: borde suave con
          // antialiasing y un círculo limpio sin él
          .replace('#include <alphatest_fragment>', 'diffuseColor.a *= recK;\n#include <alphatest_fragment>');
    };
    m.alphaToCoverage = true;
    m.customProgramCacheKey = () => clave + 'recorte2';
    return m;
  }
  function texFachada(M) {
    const base = M.textura('real-fachada', 128, (x, n) => {
      x.fillStyle = '#ffffff';
      x.fillRect(0, 0, n, n);
      x.fillStyle = 'rgba(0,0,0,.07)';
      x.fillRect(0, 0, n, 5);
      x.fillStyle = '#36424f';
      x.fillRect(n * 0.3, n * 0.28, n * 0.4, n * 0.46);
      x.fillStyle = 'rgba(255,255,255,.2)';
      x.fillRect(n * 0.32, n * 0.3, n * 0.16, n * 0.18);
      x.fillStyle = '#e9e4da';
      x.fillRect(n * 0.27, n * 0.74, n * 0.46, n * 0.05);
      x.fillStyle = '#d2ccc0';
      x.fillRect(n * 0.49, n * 0.28, n * 0.02, n * 0.46);
    });
    const luz = M.textura('real-fachada-luz', 128, (x, n) => {
      x.fillStyle = '#000';
      x.fillRect(0, 0, n, n);
      x.fillStyle = '#ffd9a0';
      x.fillRect(n * 0.31, n * 0.29, n * 0.38, n * 0.44);
    });
    const tienda = M.textura('real-tienda', 128, (x, n) => {
      x.fillStyle = '#ffffff';
      x.fillRect(0, 0, n, n);
      x.fillStyle = '#26323b';
      x.fillRect(n * 0.06, n * 0.16, n * 0.88, n * 0.72);
      x.fillStyle = 'rgba(255,240,200,.35)';
      x.fillRect(n * 0.08, n * 0.18, n * 0.84, n * 0.68);
      x.fillStyle = 'rgba(0,0,0,.28)';
      for (let i = 1; i < 3; i++) x.fillRect(n * 0.06 + i * n * 0.29, n * 0.16, 3, n * 0.74);
      x.fillStyle = 'rgba(0,0,0,.2)';
      x.fillRect(0, n * 0.92, n, n * 0.08);
    });
    // estilo 1: balconera alta con contraventanas; estilo 2: cinta de ventanas de oficina
    const base1 = M.textura('real-fachada1', 128, (x, n) => {
      x.fillStyle = '#ffffff';
      x.fillRect(0, 0, n, n);
      x.fillStyle = 'rgba(0,0,0,.06)';
      x.fillRect(0, 0, n, 4);
      x.fillStyle = '#3a4653';
      x.fillRect(n * 0.36, n * 0.16, n * 0.28, n * 0.64);
      x.fillStyle = 'rgba(255,255,255,.18)';
      x.fillRect(n * 0.38, n * 0.18, n * 0.1, n * 0.24);
      x.fillStyle = '#e4dfd3';
      x.fillRect(n * 0.33, n * 0.8, n * 0.34, n * 0.04);
      x.fillRect(n * 0.49, n * 0.16, n * 0.02, n * 0.64);
      x.fillStyle = '#8f9a86';
      for (const sx of [0.18, 0.64]) {
        x.fillRect(n * sx, n * 0.16, n * 0.18, n * 0.64);
        x.fillStyle = 'rgba(0,0,0,.25)';
        for (let k = 0; k < 9; k++) x.fillRect(n * sx, n * (0.18 + k * 0.07), n * 0.18, 2);
        x.fillStyle = '#8f9a86';
      }
    });
    const luz1 = M.textura('real-fachada1-luz', 128, (x, n) => {
      x.fillStyle = '#000';
      x.fillRect(0, 0, n, n);
      x.fillStyle = '#ffd9a0';
      x.fillRect(n * 0.38, n * 0.18, n * 0.24, n * 0.6);
    });
    const base2 = M.textura('real-fachada2', 128, (x, n) => {
      x.fillStyle = '#ffffff';
      x.fillRect(0, 0, n, n);
      x.fillStyle = '#3d4d5c';
      x.fillRect(0, n * 0.22, n, n * 0.5);
      x.fillStyle = 'rgba(255,255,255,.18)';
      x.fillRect(0, n * 0.24, n, n * 0.14);
      x.fillStyle = '#cfd3d6';
      for (let k = 0; k <= 2; k++) x.fillRect(k * n * 0.5 - 2, n * 0.22, 4, n * 0.5);
      x.fillStyle = '#c6c9cc';
      x.fillRect(0, n * 0.72, n, n * 0.05);
    });
    const luz2 = M.textura('real-fachada2-luz', 128, (x, n) => {
      x.fillStyle = '#000';
      x.fillRect(0, 0, n, n);
      x.fillStyle = '#f2f0d0';
      x.fillRect(n * 0.02, n * 0.24, n * 0.46, n * 0.46);
      x.fillRect(n * 0.52, n * 0.24, n * 0.46, n * 0.46);
    });
    // Tipologías (punto 35): ensanche (balcón corrido de forja, ventanas altas con jambas y cornisa), bloque de los 60 (dos ventanas apaisadas y losa de balcón) y nave (chapa ondulada con tira de ventanas altas)
    const base3 = M.textura('real-fachada3', 128, (x, n) => {
      x.fillStyle = '#ffffff';
      x.fillRect(0, 0, n, n);
      x.fillStyle = 'rgba(0,0,0,.10)';
      x.fillRect(0, 0, n, 6);
      x.fillStyle = 'rgba(0,0,0,.05)';
      x.fillRect(0, 0, 7, n);
      x.fillRect(n - 7, 0, 7, n);
      x.fillStyle = '#efe8da';
      x.fillRect(n * 0.3, n * 0.1, n * 0.4, n * 0.72);
      x.fillStyle = '#2f3b47';
      x.fillRect(n * 0.34, n * 0.14, n * 0.32, n * 0.64);
      x.fillStyle = 'rgba(255,255,255,.18)';
      x.fillRect(n * 0.36, n * 0.16, n * 0.1, n * 0.22);
      x.fillStyle = '#efe8da';
      x.fillRect(n * 0.49, n * 0.14, n * 0.02, n * 0.64);
      x.fillStyle = '#d9d2c2';
      x.fillRect(n * 0.14, n * 0.8, n * 0.72, n * 0.05);
      x.fillStyle = '#1f2326';
      for (let k = 0; k < 9; k++) x.fillRect(n * (0.16 + k * 0.083), n * 0.66, 2, n * 0.14);
      x.fillRect(n * 0.14, n * 0.66, n * 0.72, 2);
    });
    const luz3 = M.textura('real-fachada3-luz', 128, (x, n) => {
      x.fillStyle = '#000';
      x.fillRect(0, 0, n, n);
      x.fillStyle = '#ffd9a0';
      x.fillRect(n * 0.34, n * 0.14, n * 0.32, n * 0.52);
    });
    const base4 = M.textura('real-fachada4', 128, (x, n) => {
      x.fillStyle = '#ffffff';
      x.fillRect(0, 0, n, n);
      x.fillStyle = '#d6d2ca';
      x.fillRect(0, n * 0.74, n, n * 0.14);
      x.fillStyle = 'rgba(0,0,0,.18)';
      x.fillRect(0, n * 0.88, n, n * 0.03);
      x.fillStyle = '#3d4852';
      x.fillRect(n * 0.07, n * 0.2, n * 0.4, n * 0.5);
      x.fillRect(n * 0.53, n * 0.2, n * 0.4, n * 0.5);
      x.fillStyle = 'rgba(255,255,255,.2)';
      x.fillRect(n * 0.09, n * 0.22, n * 0.14, n * 0.2);
      x.fillRect(n * 0.55, n * 0.22, n * 0.14, n * 0.2);
      x.fillStyle = '#b9b4aa';
      x.fillRect(n * 0.49, n * 0.2, n * 0.02, n * 0.5);
      x.fillStyle = '#7d8a93';
      x.fillRect(0, n * 0.74, n, 3);
    });
    const luz4 = M.textura('real-fachada4-luz', 128, (x, n) => {
      x.fillStyle = '#000';
      x.fillRect(0, 0, n, n);
      x.fillStyle = '#ffd9a0';
      x.fillRect(n * 0.08, n * 0.21, n * 0.38, n * 0.48);
      x.fillRect(n * 0.54, n * 0.21, n * 0.38, n * 0.48);
    });
    const base5 = M.textura('real-fachada5', 128, (x, n) => {
      x.fillStyle = '#ffffff';
      x.fillRect(0, 0, n, n);
      x.fillStyle = 'rgba(0,0,0,.10)';
      for (let i = 0; i < n; i += 8) x.fillRect(i, 0, 3, n);
      x.fillStyle = '#4a5560';
      x.fillRect(0, n * 0.12, n, n * 0.1);
      x.fillStyle = 'rgba(255,255,255,.2)';
      x.fillRect(0, n * 0.13, n, n * 0.03);
      x.fillStyle = 'rgba(0,0,0,.2)';
      x.fillRect(0, n * 0.9, n, n * 0.1);
    });
    const luz5 = M.textura('real-fachada5-luz', 128, (x, n) => {
      x.fillStyle = '#000';
      x.fillRect(0, 0, n, n);
      x.fillStyle = '#e8f0ff';
      x.fillRect(0, n * 0.13, n, n * 0.08);
    });
    return { base, luz, tienda, base1, luz1, base2, luz2, base3, luz3, base4, luz4, base5, luz5 };
  }

  // ---------- Geometría ----------
  function geo(P, I, N, UV, C) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    if (N) g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    else g.computeVertexNormals();
    if (UV) g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
    if (C) g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    if (I) g.setIndex(I);
    g.computeBoundingSphere();
    return g;
  }
  function cinta(q, w, y, A) {
    // cinta de ancho w por la poligonal q, con esquinas en inglete
    const n = q.length;
    if (n < 2) return;
    const b = A.P.length / 3,
      h = w / 2;
    for (let i = 0; i < n; i++) {
      const p = q[Math.max(0, i - 1)],
        c = q[i],
        s = q[Math.min(n - 1, i + 1)];
      let d1x = c[0] - p[0],
        d1z = c[1] - p[1],
        l1 = Math.hypot(d1x, d1z);
      if (l1 < 1e-6) {
        d1x = s[0] - c[0];
        d1z = s[1] - c[1];
        l1 = Math.hypot(d1x, d1z) || 1;
      }
      d1x /= l1;
      d1z /= l1;
      let d2x = s[0] - c[0],
        d2z = s[1] - c[1],
        l2 = Math.hypot(d2x, d2z);
      if (l2 < 1e-6) {
        d2x = d1x;
        d2z = d1z;
        l2 = 1;
      } else {
        d2x /= l2;
        d2z /= l2;
      }
      let mx = -d1z - d2z,
        mz = d1x + d2x,
        ml = Math.hypot(mx, mz);
      if (ml < 1e-3) {
        mx = -d1z;
        mz = d1x;
        ml = 1;
      }
      mx /= ml;
      mz /= ml;
      const k = h / Math.max(0.55, mx * -d1z + mz * d1x);
      A.P.push(c[0] + mx * k, y, c[1] + mz * k, c[0] - mx * k, y, c[1] - mz * k);
      A.N.push(0, 1, 0, 0, 1, 0);
    }
    for (let i = 0; i < n - 1; i++) {
      const a = b + i * 2;
      A.I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  function rellenar(q, y, A) {
    // polígono plano triangulado
    const v = q.map(p => new THREE.Vector2(p[0], p[1])),
      t = THREE.ShapeUtils.triangulateShape(v, []),
      b = A.P.length / 3;
    v.forEach(p => {
      A.P.push(p.x, y, p.y);
      A.N.push(0, 1, 0);
    });
    t.forEach(k => A.I.push(b + k[0], b + k[1], b + k[2]));
  }
  const nuevo = () => ({ P: [], N: [], I: [] });
  // Una malla grande (calzadas, aceras, plazas, marcas, parques...) se parte en trozos de 90 m por el centro de cada triángulo: así el navegador solo dibuja los trozos que se ven (y solo los cercanos entran en las sombras)
  function dividirEnCeldas(me, celda) {
    const g = me.geometry,
      ix = g.index.array,
      pos = g.attributes.position,
      nombres = Object.keys(g.attributes),
      grupos = new Map();
    for (let t = 0; t < ix.length; t += 3) {
      const a = ix[t],
        b = ix[t + 1],
        c = ix[t + 2],
        k = Math.floor((pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3 / celda) + ',' + Math.floor((pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3 / celda);
      let l = grupos.get(k);
      if (!l) grupos.set(k, (l = []));
      l.push(a, b, c);
    }
    if (grupos.size < 2) return me;
    const gr = new THREE.Group();
    gr.userData = me.userData;
    gr.receiveShadow = true;
    grupos.forEach(tri => {
      const remap = new Map(),
        orig = [];
      const idx = tri.map(v => {
        let n = remap.get(v);
        if (n === undefined) {
          n = orig.length;
          remap.set(v, n);
          orig.push(v);
        }
        return n;
      });
      const ng = new THREE.BufferGeometry();
      nombres.forEach(nm => {
        const at = g.attributes[nm],
          arr = new Float32Array(orig.length * at.itemSize);
        orig.forEach((v, i) => {
          for (let q = 0; q < at.itemSize; q++) arr[i * at.itemSize + q] = at.array[v * at.itemSize + q];
        });
        ng.setAttribute(nm, new THREE.BufferAttribute(arr, at.itemSize));
      });
      ng.setIndex(idx);
      ng.computeBoundingSphere();
      const m2 = new THREE.Mesh(ng, me.material);
      m2.userData = me.userData;
      m2.receiveShadow = true;
      gr.add(m2);
    });
    g.dispose();
    return gr;
  }
  // Con relieve, los triángulos largos se parten (por la arista más larga) hasta que ninguna pasa de maxL metros: así calzadas, aceras y parques siguen las cuestas aunque el desplazamiento se calcule en los vértices
  function subdividir(A, maxL) {
    const P = A.P,
      N = A.N,
      U2 = A.U && A.U.length ? A.U : null,
      C2 = A.C && A.C.length ? A.C : null,
      I = [],
      mid = new Map(),
      nP = P.length / 3;
    const medio = (a, b) => {
      const k = a < b ? a + '_' + b : b + '_' + a;
      let m = mid.get(k);
      if (m !== undefined) return m;
      m = P.length / 3;
      P.push((P[a * 3] + P[b * 3]) / 2, (P[a * 3 + 1] + P[b * 3 + 1]) / 2, (P[a * 3 + 2] + P[b * 3 + 2]) / 2);
      if (N) N.push((N[a * 3] + N[b * 3]) / 2, (N[a * 3 + 1] + N[b * 3 + 1]) / 2, (N[a * 3 + 2] + N[b * 3 + 2]) / 2);
      if (U2) U2.push((U2[a * 2] + U2[b * 2]) / 2, (U2[a * 2 + 1] + U2[b * 2 + 1]) / 2);
      if (C2) C2.push((C2[a * 3] + C2[b * 3]) / 2, (C2[a * 3 + 1] + C2[b * 3 + 1]) / 2, (C2[a * 3 + 2] + C2[b * 3 + 2]) / 2);
      mid.set(k, m);
      return m;
    };
    const d = (a, b) => Math.hypot(P[a * 3] - P[b * 3], P[a * 3 + 2] - P[b * 3 + 2]),
      pila = [];
    for (let t = 0; t < A.I.length; t += 3) pila.push([A.I[t], A.I[t + 1], A.I[t + 2]]);
    while (pila.length) {
      const [a, b, c] = pila.pop(),
        ab = d(a, b),
        bc = d(b, c),
        ca = d(c, a),
        mx = Math.max(ab, bc, ca);
      if (mx <= maxL || I.length > 1500000) {
        I.push(a, b, c);
        continue;
      }
      if (mx === ab) {
        const m = medio(a, b);
        pila.push([a, m, c], [m, b, c]);
      } else if (mx === bc) {
        const m = medio(b, c);
        pila.push([a, b, m], [a, m, c]);
      } else {
        const m = medio(c, a);
        pila.push([a, b, m], [m, b, c]);
      }
    }
    A.I = I;
    void nP;
    return A;
  }
  const malla = (A, m, nom) => {
    if (!A.P.length) return null;
    if (GM.relieve && GM.relieve.activo()) subdividir(A, 22);
    const me = new THREE.Mesh(geo(A.P, A.I, A.N), m);
    me.userData = { real: nom || 1 };
    me.receiveShadow = true;
    return A.I.length > 4500 ? dividirEnCeldas(me, 90) : me;
  };

  // ---------- Preparar datos ----------
  function preparar(D) {
    const B = D.e
      .map((e, i) => {
        let p = pts(e, 5),
          s = 0;
        for (let k = 0; k < p.length; k++) {
          const a = p[k],
            b = p[(k + 1) % p.length];
          s += a[0] * b[1] - b[0] * a[1];
        }
        if (s < 0) p = p.reverse();
        const ar = Math.abs(s) / 2;
        let x0 = 1e9,
          z0 = 1e9,
          x1 = -1e9,
          z1 = -1e9,
          cx = 0,
          cz = 0;
        p.forEach(q => {
          x0 = Math.min(x0, q[0]);
          x1 = Math.max(x1, q[0]);
          z0 = Math.min(z0, q[1]);
          z1 = Math.max(z1, q[1]);
          cx += q[0];
          cz += q[1];
        });
        const ex = (D.ex && D.ex[i]) || [0, 0, 0];
        return {
          i,
          era: ex[0],
          mat: ex[1],
          patrimonio: !!ex[2],
          p,
          lv: e[0],
          cl: e[1],
          nom: e[2] >= 0 ? D.s[e[2]] : '',
          color: e[3] >= 0 ? D.s[e[3]] : '',
          tm: e[4] || 0,
          ar,
          bb: [x0, z0, x1, z1],
          cx: cx / p.length,
          cz: cz / p.length,
          dc: 0,
          rol: null
        };
      })
      .filter(b => Math.hypot(b.cx, b.cz) < R + 5);
    B.forEach(b => {
      b.dc = Math.hypot(b.cx, b.cz);
    });
    const C = D.c
      .map((c, i) => {
        const x = (D.cx && D.cx[i]) || [0, 0, 0, 0],
          lanes = x[0],
          w = lanes ? Math.min(22, Math.max(4.2, lanes * 3.05 + 0.4)) : 0;
        return {
          k: c[0],
          nom: c[1] >= 0 ? D.s[c[1]] : '',
          uno: c[2],
          p: pts(c, 3),
          lanes,
          w,
          sup: x[1],
          puente: !!(x[2] & 1),
          bici: !!(x[2] & 2),
          bus: !!(x[2] & 4),
          rot: !!(x[2] & 32),
          acera: !!(x[2] & 8),
          vel: x[3] * 10
        };
      })
      .filter(c => c.p.length > 1);
    const lista = (v, h) => (v || []).map(a => ({ t: a[0], p: pts(a, h) })).filter(a => a.p.length >= 2),
      punto = (v, i, j) => (v || []).map(a => ({ t: a[0], x: a[i] / 10, z: a[j] / 10 }));
    return {
      B,
      C,
      A: D.a.map(a => ({ t: a[0], p: pts(a, 1) })),
      P: D.p.map(a => ({ t: a[0], p: pts(a, 1) })),
      BP: (D.bp || []).map(a => ({ h: a[0] / 10, mh: a[1] / 10, color: a[2] >= 0 ? D.s[a[2]] : '', roof: a[3], p: pts(a, 4) })).filter(a => a.p.length >= 3),
      RB: (D.rb || []).map(a => ({ ref: a[0] >= 0 ? D.s[a[0]] : '', p: pts(a, 1) })).filter(a => a.p.length >= 2),
      PL: (D.pl || []).map(a => ({ t: a[0], p: pts(a, 1) })).filter(a => a.p.length >= 3),
      H: D.h || null,
      TR: (D.tr || []).map(a => ({ t: a[0], p: pts(a, 1) })).filter(a => a.p.length >= 2),
      L: D.l || null,
      N: (D.n || []).map(a => ({ t: a[0], nom: a[1] >= 0 ? D.s[a[1]] : '', x: a[2] / 10, z: a[3] / 10 })).filter(a => a.nom),
      T: (D.t || []).map(a => [a[0] / 10, a[1] / 10]),
      PT: punto(D.pt, 1, 2),
      K: lista(D.k, 1).filter(a => a.p.length >= 3),
      U: lista(D.u, 1).filter(a => a.p.length >= 3),
      V: lista(D.v, 1),
      F: lista(D.f, 1)
    };
  }

  // Plano vectorial para el mapa de la sede3d (calles con su nombre y tramo más largo, edificios, parques y agua)
  function vectorial(X) {
    const bb = p => {
      let a = 1e9,
        b = 1e9,
        c = -1e9,
        d = -1e9;
      p.forEach(q => {
        a = Math.min(a, q[0]);
        c = Math.max(c, q[0]);
        b = Math.min(b, q[1]);
        d = Math.max(d, q[1]);
      });
      return [a, b, c, d];
    };
    return {
      B: X.B.map(b => ({ p: b.p, cl: b.cl, nom: b.nom, cx: b.cx, cz: b.cz, bb: b.bb })),
      C: X.C.map(c => {
        let mi = 0,
          ml = 0;
        for (let i = 0; i + 1 < c.p.length; i++) {
          const l = Math.hypot(c.p[i + 1][0] - c.p[i][0], c.p[i + 1][1] - c.p[i][1]);
          if (l > ml) {
            ml = l;
            mi = i;
          }
        }
        const a = c.p[mi],
          b = c.p[mi + 1] || a;
        return { k: c.k, nom: c.nom, p: c.p, bb: bb(c.p), mx: (a[0] + b[0]) / 2, mz: (a[1] + b[1]) / 2, ang: Math.atan2(b[1] - a[1], b[0] - a[0]), len: ml };
      }).sort((a, b) => b.k - a.k),
      P: X.P.map(q => ({ t: q.t, p: q.p, bb: bb(q.p) })),
      A: X.A.map(q => ({ t: q.t, p: q.p, bb: bb(q.p) }))
    };
  }
  // ---------- Construcción ----------
  const fase = (S, n) => {
    if (typeof window !== 'undefined' && window.__medirFases) {
      (S.fases = S.fases || []).push([n, +performance.now().toFixed(0)]);
    }
  };
  function construir(S, M, st) {
    S.fases = [];
    fase(S, 'inicio');
    const D = datos(st.clubId),
      club = st.equipos[st.clubId],
      W = S.mundo,
      T = M;
    const rr = rnd(U.hash(club.id + 'real')),
      c1 = club.colores[0] === '#000000' ? '#222222' : club.colores[0],
      c2 = club.colores[1] || '#ffffff';
    const ciu = (st.ciudad && st.ciudad[st.clubId]) || { aficion: 50 },
      afi = ciu.aficion || 50;
    const alta = !GM.campus || !GM.campus.config || GM.campus.config.calidad !== 'normal';
    S.real = true;
    S.ventanas = [];
    S.persianas = [];
    S.obrasRect = [];
    S.oclusores = [];
    S.distritos = null;
    S.reales = false;
    S.rec = { p: { value: new THREE.Vector3(0, 0, 0) }, c: { value: new THREE.Vector3(0, 50, 50) }, r: { value: 1.7 } };
    const X = preparar(D),
      { B } = X;
    // Radio por el que se puede andar: los 300 m de datos completos y, si hay anillo lejano, hasta casi su borde (se anda entre los prismas del anillo)
    let RW = R;
    if (X.L) {
      let mx = 0;
      X.L.e.forEach(e => {
        for (let i = 1; i + 1 < e.length; i += 2) mx = Math.max(mx, Math.hypot(e[i], e[i + 1]));
      });
      RW = Math.max(R, Math.min(1000, Math.floor(mx - 12)));
    }
    // relieve real (Copernicus DEM, cuadrícula de 125 m): S.altura(x, z) da los metros sobre el pabellón; todavía no se aplica al suelo (punto 32)
    S.relieve = X.H || null;
    if (GM.horizonte) GM.horizonte.montar(S, X, club); // más allá de los datos: montes, sierra lejana y silueta de ciudad (punto 144)
    if (GM.relieve) {
      GM.relieve.fijar(X.H || null);
      S.altura = GM.relieve.altura;
    } else
      S.altura = (x, z) => {
        const H = X.H;
        if (!H) return 0;
        const n = H.n,
          p = H.p,
          fx = Math.min(n - 1.001, Math.max(0, x / p + (n - 1) / 2)),
          fz = Math.min(n - 1.001, Math.max(0, z / p + (n - 1) / 2)),
          i = Math.floor(fx),
          j = Math.floor(fz),
          u = fx - i,
          v = fz - j,
          g = (a, b) => H.v[b * n + a],
          c0 = g((n - 1) / 2, (n - 1) / 2);
        return g(i, j) * (1 - u) * (1 - v) + g(i + 1, j) * u * (1 - v) + g(i, j + 1) * (1 - u) * v + g(i + 1, j + 1) * u * v - c0;
      };
    S.edificiosDatos = X.B;
    S.datosX = X;
    S.gasolineras = X.N.filter(n => n.t === 'fuel').map(n => ({ x: n.x, z: n.z }));
    S.tranvia = X.TR;
    S.plazasDatos = X.PL;
    S.RW = RW;
    const G = M.rejilla({ limites: [-RW - 20, -RW - 20, RW + 20, RW + 20], CELDA });
    S.G = G;
    // fuera del círculo de datos no se anda
    for (let j = 0; j < G.H; j++)
      for (let i = 0; i < G.W; i++) {
        const [x, z] = G.centro(i, j);
        if (x * x + z * z > (RW - 4) * (RW - 4)) G.b[G.idx(i, j)] = 1;
      }
    const bloquearPoli = (p, margen) => {
      const x0 = Math.min(...p.map(q => q[0])) - margen,
        x1 = Math.max(...p.map(q => q[0])) + margen,
        z0 = Math.min(...p.map(q => q[1])) - margen,
        z1 = Math.max(...p.map(q => q[1])) + margen;
      const [ia, ja] = G.celda(x0, z0),
        [ib, jb] = G.celda(x1, z1);
      if ((ib - ia + 1) * (jb - ja + 1) > 30000) {
        // polígono enorme (lago, mar): relleno por líneas de barrido en vez de probar cada celda
        const n = p.length;
        for (let j = Math.max(0, ja); j <= Math.min(G.H - 1, jb); j++) {
          const z = G.centro(0, j)[1],
            xs = [];
          for (let k = 0; k < n; k++) {
            const a = p[k],
              b = p[(k + 1) % n];
            if (a[1] > z !== b[1] > z) xs.push(a[0] + ((z - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
          }
          xs.sort((u, v) => u - v);
          for (let m = 0; m + 1 < xs.length; m += 2) {
            const i0 = Math.max(0, G.celda(xs[m] - margen, z)[0]),
              i1 = Math.min(G.W - 1, G.celda(xs[m + 1] + margen, z)[0]);
            for (let i = i0; i <= i1; i++) G.b[G.idx(i, j)] = 1;
          }
        }
        return;
      }
      for (let j = Math.max(0, ja); j <= Math.min(G.H - 1, jb); j++)
        for (let i = Math.max(0, ia); i <= Math.min(G.W - 1, ib); i++) {
          const [x, z] = G.centro(i, j);
          let b = pip(x, z, p);
          if (!b && margen > 0) for (let k = 0; k < p.length && !b; k++) if (dSeg(x, z, p[k], p[(k + 1) % p.length]) < margen) b = true;
          if (b) G.b[G.idx(i, j)] = 1;
        }
    };
    fase(S, 'datos y rejilla');
    // Suelo general (adoquín gris), parques, agua, aceras y calzadas
    const mSuelo = suelo('Concrete034', { color: false, relieve: 0.5 }, 0x77746e, 0),
      mAsf = suelo('Asphalt010', { tinte: 0xb4b4b4 }, 0x4a4c50, 3),
      // acera de losas de hormigón (de adoquín pequeño en Grecia y Turquía), punto 94
      mAcera = suelo(
        primero(['GR', 'TR'].indexOf(club.pais) >= 0 ? ['PavingStones146', 'PavingStones070'] : ['PavingStones136', 'PavingStones070']),
        { tinte: 0xd6d2ca },
        0x8c8982,
        1
      );
    mSuelo.polygonOffset = false;
    const base = new THREE.Mesh(
      new THREE.PlaneGeometry(1600, 1600, GM.relieve && GM.relieve.activo() ? 160 : 1, GM.relieve && GM.relieve.activo() ? 160 : 1).rotateX(-Math.PI / 2),
      mSuelo
    );
    base.position.y = -0.02;
    base.receiveShadow = true;
    base.userData = { real: 'suelo' };
    W.add(base);
    const verde = suelo('Grass004', { tinte: 0xb8d0a0 }, 0x6f9a4a, 1.6),
      pista = suelo('Ground054', { tinte: 0xb9806a }, 0x9a6a58, 1.6);
    {
      const AV = nuevo(),
        AP = nuevo(),
        AG = nuevo();
      X.P.forEach(a => {
        if (a.p.length >= 3) rellenar(a.p, 0, a.t === 1 ? AP : AV);
      });
      [
        [AV, verde, 'parques'],
        [AP, pista, 'pistas']
      ].forEach(([A, m, n]) => {
        const me = malla(A, m, n);
        if (me) {
          me.receiveShadow = true;
          W.add(me);
        }
      });
      X.A.forEach(a => {
        if (a.t === 1) {
          for (let i = 0; i + 1 < a.p.length; i++) {
            /* río: cinta de 9 m */
          }
          cinta(a.p, 9, 0, AG);
        } else if (a.p.length >= 3) rellenar(a.p, 0, AG);
      });
      const mAgua =
        GM.arquitectura && GM.arquitectura.agua ? GM.arquitectura.agua({ color: 0x3f7f9f, opacidad: 0.93 }) : new THREE.MeshStandardMaterial({ color: 0x3f7f9f, roughness: 0.2 });
      mAgua.side = THREE.DoubleSide;
      mAgua.polygonOffset = true;
      mAgua.polygonOffsetFactor = -2;
      mAgua.polygonOffsetUnits = -2;
      const ag = malla(AG, mAgua, 'agua');
      if (ag) {
        ag.position.y = -0.01;
        ag.receiveShadow = false;
        W.add(ag);
      }
      X.A.forEach(a => {
        if (a.t === 0 && a.p.length >= 3) bloquearPoli(a.p, 0.2);
        else if (a.t === 1)
          for (let i = 0; i + 1 < a.p.length; i++) {
            const f = a.p[i],
              g = a.p[i + 1];
            bloquearPoli(
              [
                [f[0] - 3.5, f[1] - 3.5],
                [g[0] + 3.5, g[1] - 3.5],
                [g[0] + 3.5, g[1] + 3.5],
                [f[0] - 3.5, f[1] + 3.5]
              ],
              0
            );
          }
      });
    }
    {
      const PA = [nuevo(), nuevo(), nuevo()],
        PR = nuevo(),
        PR2 = nuevo(),
        PZ = nuevo(),
        MR = nuevo(),
        MK = nuevo();
      X.C.forEach(c => {
        const w = c.w || ANCHO[c.k] || 4;
        if (c.k === 0) return;
        if (c.k <= 5) cinta(c.p, w + ACERA * 2, 0, c.k === 5 ? PZ : PA[(U.hash(club.id + (c.nom || 'x') + c.k) >>> 0) % 3]);
        if (c.k !== 5) cinta(c.p, w, 0, c.k >= 4 ? PR2 : PR);
      }); // principales: asfalto oscuro; residenciales y de servicio: asfalto gastado más claro; peatonales: adoquín de granito
      // tres aceras posibles por calle: la principal del país, la otra de losa o adoquín, y hormigón (antes una era Tiles074, una baldosa de
      // mármol de interior en damero: el «tablero de ajedrez» de las aceras)
      const otraAcera = primero(['GR', 'TR'].indexOf(club.pais) >= 0 ? ['PavingStones136', 'Concrete034'] : ['PavingStones146', 'Concrete034']);
      [mAcera, suelo(otraAcera, { tinte: 0xd6d2ca }, 0xb0aca2, 1), suelo('Concrete034', { tinte: 0xa8a59d }, 0x9a978f, 1)].forEach((m, i) => {
        const mp = malla(PA[i], m, 'aceras');
        if (mp) W.add(mp);
      });
      const ma = malla(PR, mAsf, 'calzadas');
      if (ma) W.add(ma);
      {
        const mp2 = malla(PR2, suelo('Asphalt031', { tinte: 0x8e8e90 }, 0x55585c, 3), 'calzadas2');
        if (mp2) W.add(mp2);
        const mz = malla(PZ, suelo('PavingStones150', { tinte: 0xb9b5ad }, 0xb0aca2, 1), 'plazas');
        if (mz) W.add(mz);
      }
      // marcas viales: línea discontinua en el eje de las calles de doble sentido
      const mBl = new THREE.MeshStandardMaterial({ color: 0xf1efe8, roughness: 0.8, side: THREE.DoubleSide });
      mBl.polygonOffset = true;
      mBl.polygonOffsetFactor = -5;
      mBl.polygonOffsetUnits = -5;
      X.C.forEach(c => {
        if (c.k > 4 || c.uno) return;
        let acum = 0;
        for (let i = 0; i + 1 < c.p.length; i++) {
          const a = c.p[i],
            b = c.p[i + 1],
            l = Math.hypot(b[0] - a[0], b[1] - a[1]);
          if (l < 1) continue;
          const ux = (b[0] - a[0]) / l,
            uz = (b[1] - a[1]) / l;
          for (let s = (3 - (acum % 5) + 5) % 5; s + 2 < l; s += 5)
            cinta(
              [
                [a[0] + ux * s, a[1] + uz * s],
                [a[0] + ux * (s + 2), a[1] + uz * (s + 2)]
              ],
              0.14,
              0,
              MK
            );
          acum += l;
        }
      });
      // carriles reales (punto 31): separadores entre carriles, carril bici verde y carril bus rojizo, a partir de las etiquetas de OpenStreetMap
      {
        const desp = (p, d) =>
            p.map((q, i) => {
              const a = p[Math.max(0, i - 1)],
                b = p[Math.min(p.length - 1, i + 1)],
                ux = b[0] - a[0],
                uz = b[1] - a[1],
                l = Math.hypot(ux, uz) || 1;
              return [q[0] - (uz / l) * d, q[1] + (ux / l) * d];
            }),
          BK = nuevo(),
          BS = nuevo();
        X.C.forEach(c => {
          if (c.k > 4) return;
          const w = c.w || ANCHO[c.k] || 4;
          if (c.lanes >= 2) {
            const n = c.lanes,
              uno = c.uno;
            for (let i = 1; i < n; i++) {
              const off = -w / 2 + (i * w) / n;
              if (!uno && i === n / 2) continue;
              let acum = 0;
              for (let j = 0; j + 1 < c.p.length; j++) {
                const a = c.p[j],
                  b = c.p[j + 1],
                  l = Math.hypot(b[0] - a[0], b[1] - a[1]);
                if (l < 1) continue;
                const ux = (b[0] - a[0]) / l,
                  uz = (b[1] - a[1]) / l,
                  ox = -uz * off,
                  oz = ux * off;
                for (let s = (2 - (acum % 6) + 6) % 6; s + 2.5 < l; s += 6)
                  cinta(
                    [
                      [a[0] + ux * s + ox, a[1] + uz * s + oz],
                      [a[0] + ux * (s + 2.5) + ox, a[1] + uz * (s + 2.5) + oz]
                    ],
                    0.12,
                    0,
                    MK
                  );
                acum += l;
              }
            }
          }
          if (c.k >= 3 && c.k <= 5 && !(c.lanes > 2) && c.p.length >= 2) {
            let Lc = 0;
            for (let j = 0; j + 1 < c.p.length; j++) Lc += Math.hypot(c.p[j + 1][0] - c.p[j][0], c.p[j + 1][1] - c.p[j][1]);
            if (Lc > 25)
              for (const lado of [1, -1]) {
                const off = lado * (w / 2 - 2.1);
                cinta(desp(c.p, off), 0.1, 0, MK);
                let acum = 0;
                for (let j = 0; j + 1 < c.p.length; j++) {
                  const a = c.p[j],
                    b = c.p[j + 1],
                    l = Math.hypot(b[0] - a[0], b[1] - a[1]);
                  if (l < 1) continue;
                  const ux = (b[0] - a[0]) / l,
                    uz = (b[1] - a[1]) / l,
                    nx = -uz,
                    nz = ux;
                  for (let s = 6.2 - (acum % 6.2); s < l - 1; s += 6.2) {
                    const x = a[0] + ux * s,
                      z = a[1] + uz * s;
                    cinta(
                      [
                        [x + nx * off, z + nz * off],
                        [x + nx * lado * (w / 2), z + nz * lado * (w / 2)]
                      ],
                      0.1,
                      0,
                      MK
                    );
                  }
                  acum += l;
                }
              }
          }
          if (c.bici) cinta(desp(c.p, w / 2 - 0.95), 1.3, 0, BK);
          if (c.bus) cinta(desp(c.p, -(w / 2 - 1.5)), 2.8, 0, BS);
        });
        const mdec = (color, n) => {
          const m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, side: THREE.DoubleSide });
          m.polygonOffset = true;
          m.polygonOffsetFactor = -n;
          m.polygonOffsetUnits = -n;
          return m;
        };
        const mb = malla(BK, mdec(0x2f9a57, 4), 'carrilbici');
        if (mb) {
          mb.receiveShadow = false;
          W.add(mb);
        }
        const ms = malla(BS, mdec(0xa5473a, 4), 'carrilbus');
        if (ms) {
          ms.receiveShadow = false;
          W.add(ms);
        }
      }
      const mk = malla(MK, mBl, 'marcas');
      if (mk) {
        mk.receiveShadow = false;
        W.add(mk);
      }
    }
    fase(S, 'suelo, aceras y calzadas');
    // Edificios: paredes y tejados por cuadrantes de 90 m (se dibujan solo los visibles)
    const tex = texFachada(M),
      pal = (PALETA[club.pais] || PALETA.ES).map(col),
      teja = col(TEJAS[club.pais] || TEJAS.ES);
    // cada ventana se enciende o no según un número al azar (más apagadas cuanto más tarde) y con luz cálida, blanca o de televisión
    const varVentanas = m => {
      S.ventU = S.ventU || { value: 0.75 };
      const prev = m.onBeforeCompile,
        key0 = m.customProgramCacheKey;
      m.onBeforeCompile = function (sh, r) {
        if (prev) prev.call(this, sh, r);
        sh.uniforms.uVentU = S.ventU;
        sh.fragmentShader =
          'uniform float uVentU;\n' +
          sh.fragmentShader.replace(
            '#include <emissivemap_fragment>',
            '#include <emissivemap_fragment>\n{ vec2 cv = floor(vMapUv) + floor(vWPt.xz * 0.37); float hv = fract(sin(dot(cv, vec2(12.9898, 78.233))) * 43758.5453); float enc = step(hv, uVentU); float hv2 = fract(hv * 7.31 + 0.17); vec3 tinte = hv2 < 0.18 ? vec3(0.75, 0.88, 1.0) : hv2 < 0.5 ? vec3(1.0, 0.86, 0.62) : vec3(1.0, 0.74, 0.45); vec3 dpx = dFdx(vWPt), dpy = dFdy(vWPt); vec2 dux = dFdx(vMapUv), duy = dFdy(vMapUv); vec3 Tt = normalize(dpx * duy.y - dpy * dux.y), Bt = normalize(dpy * dux.x - dpx * duy.x), Nt = normalize(vWNt); vec3 vd = normalize(vWPt - cameraPosition); vec3 dt = vec3(dot(vd, Tt), dot(vd, Bt), dot(vd, Nt)); vec2 cu = fract(vMapUv); float tz = dt.z < -0.01 ? -0.9 / dt.z : 9.0; float tx = dt.x > 0.0 ? (1.0 - cu.x) / dt.x : (dt.x < 0.0 ? -cu.x / dt.x : 9.0); float ty = dt.y > 0.0 ? (1.0 - cu.y) / dt.y : (dt.y < 0.0 ? -cu.y / dt.y : 9.0); float tm = min(tz, min(tx, ty)); vec3 hp = vec3(cu, 0.0) + dt * tm; vec3 pared = mix(vec3(0.95, 0.8, 0.6), vec3(0.8, 0.88, 0.95), step(0.72, fract(hv * 5.3))); float fh = tm == tz ? 1.0 : (tm == ty ? (dt.y > 0.0 ? 1.3 : 0.3) : 0.62); if (tm == tz && hp.y < 0.42 && hp.x > 0.1 + 0.3 * fract(hv * 3.1) && hp.x < 0.75) fh *= 0.22; vec3 hab = pared * fh * (1.3 - 0.7 * tm) + vec3(1.0, 0.85, 0.55) * 0.55 * smoothstep(0.55, 0.0, length(hp.xy - vec2(0.5, 1.0)) + 0.25 * tm); if (tm == tz) { float px = 0.28 + 0.44 * fract(hv * 9.1); vec2 q = hp.xy - vec2(px, 0.42); float sil = fract(hv * 17.3) < 0.24 ? max(step(abs(q.x), 0.07) * step(q.y, 0.04) * step(-0.42, q.y), step(length(q - vec2(0.0, 0.14)), 0.06)) : 0.0; hab *= 1.0 - 0.8 * sil; } float cort = fract(hv * 11.7) < 0.4 ? step(hp.x, 0.17) + step(0.83, hp.x) : 0.0; hab = mix(hab, (hv2 < 0.5 ? vec3(0.75, 0.28, 0.22) : vec3(0.3, 0.45, 0.7)) * (0.55 + 0.45 * fract(hv * 3.3)), clamp(cort, 0.0, 1.0) * 0.85); totalEmissiveRadiance *= enc * mix(tinte * 0.8, hab * 1.5, 0.92) * (0.55 + 0.7 * fract(hv * 13.7)); }'
          );
      };
      m.customProgramCacheKey = () => (key0 ? key0.call(m) : '') + '-vv';
      return m;
    };
    // Material real de la pared por estilo (punto 94): se ve en lo que la fachada pintada tiene en blanco (máscara) y la ventana queda encima
    const pared0 = (map, luz, est) => {
      const m = new THREE.MeshStandardMaterial({ map, vertexColors: true, roughness: 0.9, emissive: 0xffc98a, emissiveMap: luz, emissiveIntensity: 0, side: THREE.DoubleSide });
      if (GM.texturas) GM.texturas.aplicar(m, paredDe(club.pais, est), { mascara: true, relieve: 0.9, rugMin: 0.55 });
      return varVentanas(recortable(S, m));
    };
    const LUCES = [tex.luz, tex.luz1, tex.luz2, tex.luz3, tex.luz4, tex.luz5],
      PAREDES = [tex.base, tex.base1, tex.base2, tex.base3, tex.base4, tex.base5].map((bs, i) => pared0(bs, LUCES[i], i)),
      mPared = PAREDES[0];
    const mTienda = recortable(
      S,
      new THREE.MeshStandardMaterial({
        map: tex.tienda,
        vertexColors: true,
        roughness: 0.7,
        emissive: 0xffd9a0,
        emissiveMap: tex.tienda,
        emissiveIntensity: 0,
        side: THREE.DoubleSide
      })
    );
    const mTecho = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide });
    if (GM.texturas) GM.texturas.aplicar(mTecho, primero(cubiertaDe(club.pais)), { color: false, relieve: 0.6, rugMin: 0.8 });
    recortable(S, mTecho);
    const mMetal = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.35, side: THREE.DoubleSide });
    if (GM.texturas) GM.texturas.aplicar(mMetal, primero(CHAPA), { tinte: 0xd8dde2, rugMin: 0.35 });
    recortable(S, mMetal); // tejados de naves industriales: chapa
    const mTejas = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide });
    if (GM.texturas) GM.texturas.aplicar(mTejas, primero(tejaDe(club.pais)), { tinte: club.pais === 'DE' || club.pais === 'US' ? 0xe2e2e2 : 0xe9b9a0, relieve: 0.9 });
    recortable(S, mTejas);
    S.ventanas.push(...PAREDES.slice(0, 5), mTienda); // de noche se encienden las ventanas de todos los estilos menos las naves
    const chunks = {};
    const ch = b => {
      const k = Math.floor(b.cx / 90) + ',' + Math.floor(b.cz / 90);
      return (
        chunks[k] ||
        (chunks[k] = {
          w: [0, 1, 2, 3, 4, 5].map(() => ({ P: [], N: [], U: [], C: [], I: [] })),
          g: { P: [], N: [], C: [], I: [] },
          t: { P: [], N: [], U: [], C: [], I: [] },
          r: { P: [], N: [], C: [], I: [] },
          m: { P: [], N: [], C: [], I: [] }
        })
      );
    };
    const altura = b => {
      const h = U.hash(club.id + b.i),
        a = (h % 1000) / 1000;
      const lv =
        b.lv ||
        {
          1: b.ar < 220 ? 2 + (a < 0.3 ? 1 : 0) : 4 + Math.floor(a * 4),
          2: 2 + Math.floor(a * 2.4),
          3: 4 + Math.floor(a * 5),
          4: 3,
          5: 6,
          6: 4,
          7: 1,
          8: 6,
          9: 2,
          10: 1,
          11: 1,
          12: 2,
          13: 2,
          0: b.ar > 700 ? 5 : 3 + Math.floor(a * 3)
        }[b.cl] ||
        3;
      b.lv = lv;
      return b.cl === 7 ? 13 : b.cl === 10 ? 17 : b.cl === 9 ? Math.min(9, lv * 4) : lv * 3.1 + (b.cl === 2 || b.cl === 12 || b.cl === 11 ? 0.4 : 0.3);
    };
    const color = b => {
      // ladrillo, hormigón y chapa llevan su color propio: el edificio no se pinta (casi blanco, con un poco de variación)
      if (b.cl !== 10 && conColorPropio(paredDe(club.pais, estilo(b)))) return col(['#f6f2ec', '#eee8de', '#faf8f4', '#e9e4dc'][U.hash(club.id + 'cp' + b.i) % 4]);
      if (b.color && b.cl !== 10) return col(b.color).offsetHSL(0, 0, (((U.hash(club.id + 'k' + b.i) >>> 8) % 100) / 100 - 0.5) * 0.04);
      if (Math.floor((b.tm || 0) / 10) === 1 && b.cl !== 10) return col(['#9c5a45', '#8f4f3c', '#a8664c', '#7d4636'][U.hash(club.id + 'br' + b.i) % 4]);
      if (b.cl === 10) return col(c1).lerp(col('#e8e8ea'), 0.5);
      if (b.cl === 5) return col('#e4e9ee');
      if (b.cl === 4) return col('#d9b08a');
      if (b.cl === 7) return col('#d9d0bd');
      if (b.cl === 9) return col('#b7b9bb');
      if (b.cl === 3 && b.lv > 4) return col('#aeb9c4');
      const h = U.hash(club.id + 'c' + b.i);
      if (b.mat === 2) return col(['#cfc6b4', '#bdb29c', '#d8cfbd'][h % 3]);
      if (b.mat === 3) return col('#b9b6b0');
      if (b.mat === 7) return col(['#efe9dc', '#e8d9c0'][h % 2]);
      if (b.tipo && PAL_TIPO[b.tipo] && !(club.pais === 'US' && b.tipo !== 'nave' && !PAL_PAIS.US[b.tipo])) {
        const pp = (PAL_PAIS[club.pais] && PAL_PAIS[club.pais][b.tipo]) || PAL_TIPO[b.tipo];
        return col(pp[h % pp.length]).offsetHSL(0, 0, (((h >>> 8) % 100) / 100 - 0.5) * 0.06);
      }
      return pal[h % pal.length].clone().offsetHSL(0, 0, (((h >>> 8) % 100) / 100 - 0.5) * 0.07);
    };
    // Tipología del edificio (punto 35): decide la fachada, el color y los detalles. Por plantas, superficie, uso y distancia al centro
    const tipo = b => {
      if (typeof window !== 'undefined' && window.__sinTipos) return 'singular';
      const lv = b.lv || 3,
        ar = b.ar,
        k = U.hash(club.id + 'ty' + b.i) % 100;
      if (b.cl === 10 || (b.cl >= 4 && b.cl <= 7) || b.cl === 13) return 'singular';
      if (lv >= 14) return 'torre';
      if (b.cl === 3 || b.cl === 8) return 'oficinas';
      if ((ar > 1100 && lv <= 3 && b.cl !== 1) || b.cl === 9) return 'nave';
      if (lv >= 5 && ar > 350) return 'bloque';
      if (b.era && b.era < 193 && lv >= 3 && lv <= 9) return 'ensanche';
      if (b.era >= 195 && b.era <= 199 && lv >= 4) return 'bloque';
      if (b.mat === 4 && lv >= 3) return 'oficinas';
      if (lv >= 4 && lv <= 7 && ar <= 700 && b.dc < 280) return 'ensanche';
      if (lv <= 3) return 'casa';
      return k < 50 ? 'ensanche' : 'bloque';
    };
    const PAL_TIPO = {
      ensanche: ['#d9c4a0', '#cdb48e', '#e3d3b4', '#c9a98a', '#d8cbb0'],
      bloque: ['#c9b9a6', '#b5a799', '#a68f7e', '#9c6f55', '#bdb3a4'],
      casa: ['#efe9dc', '#e8d9c0', '#f0e2c8', '#d9c7a8', '#e6d3c4'],
      nave: ['#b7bec5', '#a9b3bb', '#c4c9ce'],
      oficinas: ['#aeb9c4', '#9fb0c0', '#bcc6cf'],
      torre: ['#a8b6c4', '#b8c2cc']
    };
    // variación por país: casas de madera pintada en EE UU, calles encaladas en Grecia y Turquía, revoques pastel en Alemania y el norte
    const PAL_PAIS = {
      US: { casa: ['#c9b79c', '#a9b8c4', '#d9c5a0', '#8f9b7a', '#cdbfae'], ensanche: ['#8a5a46', '#a06a50', '#7d4f3e', '#95664d'], bloque: ['#9c5a45', '#8f4f3c', '#a8664c'] },
      GR: { casa: ['#f2efe8', '#efe9dc', '#e8e2d2'], ensanche: ['#efe6d2', '#e6dcc4', '#f2efe8'], bloque: ['#e9e3d4', '#dcd6c6', '#f0ece2', '#cfc9ba'] },
      TR: { casa: ['#efe0c8', '#e6cfae', '#f0e6d4'], ensanche: ['#e3cfae', '#d9c3a0'], bloque: ['#e2d3b8', '#d8c6a4', '#cdbd9c'] },
      DE: { casa: ['#ecdcc0', '#d9e0c8', '#e8cfc0', '#dcd2b4'], ensanche: ['#e6d5a8', '#d9c3a0', '#c9d4c0', '#e8c9b0'], bloque: ['#d3cdc0', '#c4c1b8', '#bdb7aa'] }
    };
    const estilo = b => {
      const k = U.hash(club.id + 'e' + b.i) % 100;
      if (b.tipo === 'ensanche') return 3;
      if (b.tipo === 'bloque') return 4;
      if (b.tipo === 'nave') return 5;
      if (b.tipo === 'torre' || b.tipo === 'oficinas') return 2;
      return b.cl === 3 || b.cl === 8 ? (k < 70 ? 2 : 0) : b.cl === 5 || b.cl === 4 ? 2 : ['ES', 'IT', 'GR', 'TR'].indexOf(club.pais) >= 0 ? (k < 52 ? 1 : 0) : k < 25 ? 1 : 0;
    };
    const pared = (b, h, k) => {
      const c = b.col,
        est = (b.estilo = estilo(b)),
        oscuro = c.clone().multiplyScalar(0.78),
        tienda = b.cl === 2 || b.cl === 12 || b.cl === 11,
        A = ch(b),
        p = b.p;
      let u = 0;
      for (let i = 0; i < p.length; i++) {
        const a = p[i],
          e = p[(i + 1) % p.length],
          l = Math.hypot(e[0] - a[0], e[1] - a[1]);
        if (l < 0.25) continue;
        const nx = (e[1] - a[1]) / l,
          nz = -(e[0] - a[0]) / l;
        const quad = (S0, y0, y1, ua, ub, v0, v1, cc) => {
          const v = S0.P.length / 3;
          S0.P.push(a[0], y0, a[1], e[0], y0, e[1], e[0], y1, e[1], a[0], y1, a[1]);
          for (let j = 0; j < 4; j++) {
            S0.N.push(nx, 0, nz);
            S0.C.push(cc.r, cc.g, cc.b);
          }
          S0.U.push(ua, v0, ub, v0, ub, v1, ua, v1);
          S0.I.push(v, v + 1, v + 2, v, v + 2, v + 3);
        };
        if (tienda) {
          quad(A.t, 0, 3.4, u / 3, (u + l) / 3, 0, 1, b.colBajo);
          quad(A.w[est], 3.4, h, u / 3, (u + l) / 3, 0, (h - 3.4) / 3.1, c);
        } else {
          quad(A.w[est], 0, 0.9, u / 3, (u + l) / 3, 0, 0.9 / 3.1, oscuro);
          quad(A.w[est], 0.9, h, u / 3, (u + l) / 3, 0.9 / 3.1, h / 3.1, c);
        }
        u += l;
      }
    };
    const techo = (b, h) => {
      const A = ch(b).g,
        R0 = b.cl === 9 ? ch(b).m : ch(b).r,
        p = b.p,
        tc =
          b.cl === 10
            ? col('#9aa3ab')
            : col(['#5b5753', '#6d6a66', '#8a7f73', '#7a8087', '#9a9088', '#6a5d52'][U.hash(b.i + 'rf') % 6]).offsetHSL(0, 0, ((U.hash(b.i + 'r') % 100) / 100 - 0.5) * 0.06);
      const rf = (b.tm || 0) % 10;
      if (rf !== 1 && ((b.cl === 1 && b.ar < 420 && b.lv <= 4 && p.length <= 12) || ((rf === 2 || rf === 3) && p.length <= 14 && b.ar < 900 && b.cl !== 10))) {
        // tejado a dos aguas sobre el rectángulo orientado de la casa
        let li = 0,
          ml = 0;
        for (let i = 0; i < p.length; i++) {
          const a = p[i],
            e = p[(i + 1) % p.length],
            l = Math.hypot(e[0] - a[0], e[1] - a[1]);
          if (l > ml) {
            ml = l;
            li = i;
          }
        }
        const a0 = p[li],
          e0 = p[(li + 1) % p.length],
          ux = (e0[0] - a0[0]) / ml,
          uz = (e0[1] - a0[1]) / ml,
          vx = -uz,
          vz = ux;
        let u0 = 1e9,
          u1 = -1e9,
          v0 = 1e9,
          v1 = -1e9;
        p.forEach(q => {
          const u = (q[0] - a0[0]) * ux + (q[1] - a0[1]) * uz,
            v = (q[0] - a0[0]) * vx + (q[1] - a0[1]) * vz;
          u0 = Math.min(u0, u);
          u1 = Math.max(u1, u);
          v0 = Math.min(v0, v);
          v1 = Math.max(v1, v);
        });
        u0 -= 0.35;
        u1 += 0.35;
        v0 -= 0.35;
        v1 += 0.35;
        const vm = (v0 + v1) / 2,
          rh = Math.min(2.4, (v1 - v0) * 0.32),
          P = (u, v, y) => [a0[0] + ux * u + vx * v, y, a0[1] + uz * u + vz * v];
        const tj = col('#ffffff').multiplyScalar(0.8 + ((U.hash(b.i + 't') % 100) / 100) * 0.2),
          vs = [P(u0, v0, h), P(u1, v0, h), P(u1, vm, h + rh), P(u0, vm, h + rh), P(u0, v1, h), P(u1, v1, h)],
          base = A.P.length / 3;
        vs.forEach(q => {
          A.P.push(...q);
          A.N.push(0, 1, 0);
          A.C.push(tj.r, tj.g, tj.b);
        });
        A.I.push(base, base + 1, base + 2, base, base + 2, base + 3, base + 3, base + 2, base + 5, base + 3, base + 5, base + 4);
        const gb = R0.P.length / 3,
          cg = col('#e9e2d4');
        [P(u0, v0, h), P(u0, v1, h), P(u0, vm, h + rh), P(u1, v0, h), P(u1, v1, h), P(u1, vm, h + rh)].forEach(q => {
          R0.P.push(...q);
          R0.N.push(1, 0, 0);
          R0.C.push(cg.r, cg.g, cg.b);
        });
        R0.I.push(gb, gb + 1, gb + 2, gb + 3, gb + 5, gb + 4);
        b.gable = { ux, uz, vx, vz, u0, u1, v0, v1, vm, rh, a0 };
        return;
      }
      const v = p.map(q => new THREE.Vector2(q[0], q[1])),
        t = THREE.ShapeUtils.triangulateShape(v, []),
        base = R0.P.length / 3;
      v.forEach(q => {
        R0.P.push(q.x, h, q.y);
        R0.N.push(0, 1, 0);
        R0.C.push(tc.r, tc.g, tc.b);
      });
      t.forEach(k => R0.I.push(base + k[0], base + k[1], base + k[2]));
    };
    const roles = asignar(X, st, club); // qué edificio hace de qué (cambia la clase del edificio: la peña lleva escaparates, el pabellón es grande…)
    B.forEach(b => {
      const h = altura(b);
      b.h = h;
      b.tipo = tipo(b);
      b.col = color(b);
      b.colBajo = col(['#3a3f45', '#5a3b26', '#2f4f6e', '#7a2f22', '#2e5d3a', '#6b4a3a'][U.hash(club.id + 'b' + b.i) % 6]);
    });
    if (GM.demografia) {
      try {
        GM.demografia.construir(S, X);
      } catch (e) {
        S.demo = null;
      }
    }
    // Los edificios se agrupan por celdas de 90 m: aquí solo se prepara el estilo y se bloquea el paso (la rejilla de navegación necesita toda la ciudad);
    // la geometría de cada celda se crea más abajo, por trozos, según la distancia al personaje y a la cámara
    const claveChunk = b => Math.floor(b.cx / 90) + ',' + Math.floor(b.cz / 90),
      porChunk = {};
    if (X.L && RW > R) {
      X.L.e.forEach(e => {
        const p = [];
        for (let i = 1; i + 1 < e.length; i += 2) p.push([e[i], e[i + 1]]);
        if (p.length >= 3 && Math.hypot(p[0][0], p[0][1]) > R - 30) bloquearPoli(p, 0.3);
      });
      X.L.a.forEach(a => {
        if (a[0] !== 1) return;
        const p = [];
        for (let i = 1; i + 1 < a.length; i += 2) p.push([a[i], a[i + 1]]);
        if (p.length >= 3) bloquearPoli(p, 0);
      });
    }
    B.forEach(b => {
      b.estilo = estilo(b);
      bloquearPoli(b.p, 0.35);
      (porChunk[claveChunk(b)] = porChunk[claveChunk(b)] || []).push(b);
    });
    {
      const b = roles.pabellon,
        [x0, z0, x1, z1] = b.bb,
        hx = (x1 - x0) / 2,
        hz = (z1 - z0) / 2,
        alto = Math.min(9, Math.max(hx, hz) * 0.22);
      const cu = new THREE.Mesh(
        new THREE.SphereGeometry(1, 48, 14, 0, Math.PI * 2, 0, Math.PI / 2),
        recortable(
          S,
          new THREE.MeshStandardMaterial({
            map: M.textura('real-cupula', 512, (x, n) => {
              x.fillStyle = '#d6dadd';
              x.fillRect(0, 0, n, n);
              x.strokeStyle = '#9aa1a8';
              x.lineWidth = 2;
              for (let i = 0; i <= 24; i++) {
                x.beginPath();
                x.moveTo((i * n) / 24, 0);
                x.lineTo((i * n) / 24, n);
                x.stroke();
              }
              for (let j = 0; j <= 8; j++) {
                x.beginPath();
                x.moveTo(0, (j * n) / 8);
                x.lineTo(n, (j * n) / 8);
                x.stroke();
              }
              x.fillStyle = 'rgba(0,0,0,.06)';
              for (let i = 0; i < 24; i += 2) x.fillRect((i * n) / 24, 0, n / 24, n);
            }),
            color: 0xffffff,
            metalness: 0.4,
            roughness: 0.42
          })
        )
      );
      cu.scale.set(hx * 0.97, alto, hz * 0.97);
      cu.position.set((x0 + x1) / 2, b.h, (z0 + z1) / 2);
      cu.castShadow = alta;
      cu.userData = { cupula: true };
      W.add(cu);
      const aro = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 64).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: c1, roughness: 0.6 }));
      aro.scale.set(hx * 0.97, 1, hz * 0.97);
      aro.position.set((x0 + x1) / 2, b.h + 0.15, (z0 + z1) / 2);
      aro.userData = { cupula: true };
      W.add(aro);
    }
    // Ciudad por trozos: cada celda de 90 m se construye cuando el personaje o la cámara se acercan (a menos de 340 m, la más cercana primero y con un presupuesto de milisegundos por fotograma) y se descarta al alejarse (más de 520 m).
    // Al abrir la escena solo se crean las celdas del centro; el resto va apareciendo en los fotogramas siguientes. Con ciudades más grandes que la actual (punto 31) este es el mecanismo que evita construirlo todo de golpe.
    const vivos = {},
      tri0 = {},
      PRESUPUESTO = 45000,
      centroChunk = k => {
        const [i, j] = k.split(',').map(Number);
        return [(i + 0.5) * 90, (j + 0.5) * 90];
      };
    const construirChunk = k => {
      delete chunks[k];
      (porChunk[k] || []).forEach(b => {
        pared(b, b.h, 0);
        if (b !== roles.pabellon) techo(b, b.h);
      });
      const c = chunks[k],
        lista = (vivos[k] = []);
      if (!c) return;
      const me = A => mat => {
        if (!A.P.length) return;
        const g = geo(A.P, A.I, A.N, A.U, A.C),
          m = new THREE.Mesh(g, mat);
        m.userData = { real: 'edif', chunk: k };
        m.matrixAutoUpdate = false;
        m.castShadow = false;
        m.receiveShadow = alta;
        W.add(m);
        lista.push(m);
      };
      c.w.forEach((A, i) => me(A)(PAREDES[i]));
      me(c.t)(mTienda);
      me(c.r)(mTecho);
      me(c.m)(mMetal);
      me(c.g)(mTejas);
      delete chunks[k];
      tri0[k] = lista.reduce((a, m) => a + m.geometry.index.count / 3, 0);
    };
    // Nivel de detalle 1 (celdas a más de 230 m): una sola malla de prismas con color por vértice y un material sencillo, sin texturas, ventanas con interior ni sombras
    // (el coste de una celda lejana está en el shader de fachada y no en los triángulos). Se vuelve al nivel 0 al acercarse a menos de 200 m.
    const mLejos = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, side: THREE.DoubleSide });
    const construirLejano = k => {
      const Pp = [],
        Nn = [],
        Cc = [],
        Ii = [],
        tc = col('#6f6b66'),
        lista = (vivos[k] = []);
      (porChunk[k] || []).forEach(b => {
        const p = b.p,
          h = b.h,
          c = b.col;
        for (let i = 0; i < p.length; i++) {
          const a = p[i],
            e = p[(i + 1) % p.length],
            dx = e[0] - a[0],
            dz = e[1] - a[1],
            l = Math.hypot(dx, dz);
          if (l < 0.25) continue;
          let nx = dz / l,
            nz = -dx / l;
          if (((a[0] + e[0]) / 2 - b.cx) * nx + ((a[1] + e[1]) / 2 - b.cz) * nz < 0) {
            nx = -nx;
            nz = -nz;
          }
          const o = Pp.length / 3,
            sh = 0.88 + 0.12 * Math.abs(nx);
          Pp.push(a[0], 0, a[1], e[0], 0, e[1], e[0], h, e[1], a[0], h, a[1]);
          for (let q = 0; q < 4; q++) {
            Nn.push(nx, 0, nz);
            Cc.push(c.r * sh, c.g * sh, c.b * sh);
          }
          Ii.push(o, o + 1, o + 2, o, o + 2, o + 3);
        }
        const v = p.map(q => new THREE.Vector2(q[0], q[1])),
          t = THREE.ShapeUtils.triangulateShape(v, []),
          base = Pp.length / 3;
        v.forEach(q => {
          Pp.push(q.x, h, q.y);
          Nn.push(0, 1, 0);
          Cc.push(tc.r, tc.g, tc.b);
        });
        t.forEach(q => Ii.push(base + q[0], base + q[1], base + q[2]));
      });
      if (Pp.length) {
        const m = new THREE.Mesh(geo(Pp, Ii, Nn, null, Cc), mLejos);
        m.userData = { real: 'edif', chunk: k, lod: 1 };
        m.castShadow = false;
        m.receiveShadow = false;
        W.add(m);
        lista.push(m);
      }
      lista.lod = 1;
    };
    const quitarChunk = k => {
      (vivos[k] || []).forEach(m => {
        W.remove(m);
        m.geometry.dispose();
      });
      delete vivos[k];
    };
    S.chunks = {
      claves: Object.keys(porChunk),
      vivos,
      construidos: () => Object.keys(vivos).length,
      total: () => Object.keys(porChunk).length,
      paso(focos, presupuesto) {
        const t0 = performance.now();
        (W.userData.celdasArb || []).forEach(a => {
          const dd = Math.min(...focos.map(f => Math.hypot(a.x - f[0], a.z - f[1]))),
            cerca = dd < 200,
            lejos = dd >= 200 && dd < 460;
          if (a.tr.visible !== cerca) a.tr.visible = a.co.visible = cerca;
          if (a.bb && a.bb.visible !== lejos) a.bb.visible = lejos;
        }); // árboles: de cerca modelo completo; de 200 a 460 m, dos planos con su silueta; más lejos, nada
        const d = k => {
          const c = centroChunk(k);
          return Math.min(...focos.map(f => Math.hypot(c[0] - f[0], c[1] - f[1])));
        };
        let rehechos = 0;
        Object.keys(vivos).forEach(k => {
          const dk = d(k);
          const lod = (vivos[k] && vivos[k].lod) || 0,
            lim = (tri0[k] || (porChunk[k] || []).length * 400) > PRESUPUESTO ? 150 : 230,
            meta = dk > lim ? 1 : dk < lim - 30 ? 0 : lod;
          if (dk <= 520 && meta !== lod && rehechos < 2) {
            quitarChunk(k);
            if (meta) construirLejano(k);
            else construirChunk(k);
            rehechos++;
          }
        });
        Object.keys(vivos).forEach(k => {
          const dk = d(k);
          if (dk > 520) quitarChunk(k);
          else if (alta && !vivos[k].lod) {
            const cerca = dk < 110;
            (vivos[k] || []).forEach(m => {
              if (m.castShadow !== cerca) m.castShadow = cerca;
            });
          }
        });
        const pend = this.claves.filter(k => !vivos[k] && d(k) < 340).sort((a, b) => d(a) - d(b));
        let n = 0;
        for (const k of pend) {
          if (n && performance.now() - t0 > (presupuesto || 4)) break;
          if (d(k) > ((tri0[k] || (porChunk[k] || []).length * 400) > PRESUPUESTO ? 150 : 230)) construirLejano(k);
          else construirChunk(k);
          n++;
        }
        return n;
      },
      todos() {
        this.claves.forEach(k => {
          if (!vivos[k]) construirChunk(k);
        });
      }
    };
    S.chunks.claves.forEach(k => {
      const c = centroChunk(k);
      if (Math.hypot(c[0], c[1]) < 150) construirChunk(k);
    }); // al abrir solo las celdas a menos de 150 m del centro; las demás llegan por trozos
    S.mapaVec = vectorial(X);
    montar(S, M, st, X, roles, { W, G, club, c1, c2, afi, alta, rr, bloquearPoli, mAsf });
    fase(S, 'edificios (geometría)');
    if (GM.mods.calleRealDetalle) {
      try {
        GM.mods.calleRealDetalle.detallar(S, M, st, X, roles, { W, G, club, c1, c2, afi, alta, rr, bloquearPoli, mAsf, mSuelo, mTecho, recortable, PALETA: pal });
      } catch (e) {
        console.warn('detalle de la ciudad real', e);
      }
    }
    fase(S, 'detalle, zonas y mobiliario');
    GM.kit.fusionar(W);
    fase(S, 'fusionar');
    S.congelados = GM.kit.congelar(W);
    fase(S, 'congelar');
    return W;
  }
  // ---------- Frente de cada edificio: qué lado da a la calle y dónde se pone la puerta ----------
  let SEGS = null;
  function segmentos(X) {
    if (SEGS && SEGS.X === X) return SEGS.L;
    const L = [];
    X.C.forEach(c => {
      if (c.k > 5) return;
      for (let i = 0; i + 1 < c.p.length; i++) L.push([c.p[i], c.p[i + 1], c.k]);
    });
    SEGS = { X, L };
    return L;
  }
  function frente(b, X) {
    if (b._fr !== undefined) return b._fr;
    const L = segmentos(X);
    let mejor = null;
    for (let i = 0; i < b.p.length; i++) {
      const a = b.p[i],
        e = b.p[(i + 1) % b.p.length],
        l = Math.hypot(e[0] - a[0], e[1] - a[1]);
      if (l < 2.4) continue;
      const nx = (e[1] - a[1]) / l,
        nz = -(e[0] - a[0]) / l,
        mx = (a[0] + e[0]) / 2,
        mz = (a[1] + e[1]) / 2,
        px = mx + nx * 2.5,
        pz = mz + nz * 2.5;
      let d = 1e9;
      for (let k = 0; k < L.length; k++) {
        const s = L[k],
          dd = dSeg(px, pz, s[0], s[1]) - ANCHO[s[2]] / 2;
        if (dd < d) d = dd;
      }
      const sc = d - Math.min(l, 14) * 0.12;
      if (!mejor || sc < mejor.sc) mejor = { i, mx, mz, nx, nz, d, l, sc, ax: a[0], az: a[1], ex: e[0], ez: e[1] };
    }
    return (b._fr = mejor || { i: 0, mx: b.cx, mz: b.cz, nx: 0, nz: 1, d: 99, l: 3, sc: 99, ax: b.cx, az: b.cz, ex: b.cx, ez: b.cz });
  }
  // Punto libre delante de la puerta (en la acera), o el libre más cercano
  function puntoPuerta(b, X, G, fuera) {
    const fr = frente(b, X),
      libre = (x, z) => {
        const [i, j] = G.celda(x, z);
        return G.libre(i, j) && G.libre(i + 1, j) && G.libre(i - 1, j) && G.libre(i, j + 1) && G.libre(i, j - 1);
      };
    for (const dd of [fuera || 1.4, 1.9, 2.5, 3.2])
      for (const t of [0, 0.25, -0.25, 0.4, -0.4]) {
        const ux = (fr.ex - fr.ax) / fr.l,
          uz = (fr.ez - fr.az) / fr.l,
          x = fr.mx + ux * fr.l * t + fr.nx * dd,
          z = fr.mz + uz * fr.l * t + fr.nz * dd;
        if (libre(x, z)) return { x, z, nx: fr.nx, nz: fr.nz, mx: fr.mx + ux * fr.l * t, mz: fr.mz + uz * fr.l * t, l: fr.l, ry: Math.atan2(fr.nx, fr.nz) };
      }
    return { x: fr.mx + fr.nx * 2, z: fr.mz + fr.nz * 2, nx: fr.nx, nz: fr.nz, mx: fr.mx, mz: fr.mz, l: fr.l, ry: Math.atan2(fr.nx, fr.nz) };
  }

  // ---------- Qué edificio hace de qué ----------
  // Si en la zona no hay un edificio adecuado para un papel (alrededor de un pabellón en las afueras suele haber aparcamientos), se levanta uno junto a una calle real
  function sintetizar(X, rol, cl, dMin, dMax, w, d, lv, azar) {
    const B = X.B,
      rr = azar || Math.random,
      N =
        X.muestras ||
        (X.muestras = (() => {
          const L = [];
          X.C.forEach(c => {
            if (c.k < 1) return;
            let acum = 0;
            for (let i = 0; i + 1 < c.p.length; i++) {
              const a = c.p[i],
                b = c.p[i + 1],
                l = Math.hypot(b[0] - a[0], b[1] - a[1]);
              if (l < 1) continue;
              for (let s = 6 - (acum % 12); s < l; s += 12) {
                if (s < 0) continue;
                L.push({ x: a[0] + ((b[0] - a[0]) * s) / l, z: a[1] + ((b[1] - a[1]) * s) / l, tx: (b[0] - a[0]) / l, tz: (b[1] - a[1]) / l, k: c.k });
              }
              acum += l;
            }
          });
          return L;
        })());
    const orden = N.map((m, i) => [Math.hypot(m.x, m.z), i])
      .filter(q => q[0] >= dMin && q[0] <= dMax)
      .sort((a, b) => Math.abs(a[0] - (dMin + dMax) / 2) - Math.abs(b[0] - (dMin + dMax) / 2) + (rr() - 0.5) * 60);
    for (const [, i] of orden)
      for (const lado of [1, -1]) {
        const m = N[i],
          nx = -m.tz * lado,
          nz = m.tx * lado,
          off = ANCHO[m.k] / 2 + ACERA + d / 2 + 0.4,
          cx = m.x + nx * off,
          cz = m.z + nz * off;
        const ux = m.tx,
          uz = m.tz,
          P = [
            [-1, -1],
            [1, -1],
            [1, 1],
            [-1, 1]
          ].map(([a, b]) => [cx + (ux * a * w) / 2 + (nx * b * d) / 2, cz + (uz * a * w) / 2 + (nz * b * d) / 2]);
        if (Math.hypot(cx, cz) > R - 25) continue;
        const x0 = Math.min(...P.map(q => q[0])) - 1.2,
          x1 = Math.max(...P.map(q => q[0])) + 1.2,
          z0 = Math.min(...P.map(q => q[1])) - 1.2,
          z1 = Math.max(...P.map(q => q[1])) + 1.2;
        if (B.some(b => b.bb[0] < x1 && b.bb[2] > x0 && b.bb[1] < z1 && b.bb[3] > z0)) continue;
        if (X.P.some(q => q.t === 0 && P.some(pp => pip(pp[0], pp[1], q.p))) || X.A.some(q => q.p.length >= 3 && P.some(pp => pip(pp[0], pp[1], q.p)))) continue;
        const pol = P.slice();
        let s2 = 0;
        for (let k = 0; k < 4; k++) {
          const a = pol[k],
            e = pol[(k + 1) % 4];
          s2 += a[0] * e[1] - e[0] * a[1];
        }
        if (s2 < 0) pol.reverse();
        const b = { i: B.length + 2000, p: pol, lv, cl, nom: '', ar: w * d, bb: [x0 + 1.2, z0 + 1.2, x1 - 1.2, z1 - 1.2], cx, cz, dc: Math.hypot(cx, cz), rol, sint: true };
        B.push(b);
        return b;
      }
    return null;
  }
  function asignar(X, st, club) {
    const { B } = X,
      R = { viviendas: [], locales: [] },
      ELIGE = {},
      rs = rnd(U.hash(club.id + 'sint')),
      sint = (rol, cl, dMin, dMax, w, d, lv) => {
        const b = sintetizar(X, rol, cl, dMin, dMax, w, d, lv, rs) || sintetizar(X, rol, cl, 15, 270, w, d, lv, rs);
        if (b) R[rol] = b;
        return b;
      };
    const acc = b => frente(b, X).d < 15 && frente(b, X).l >= 4;
    const tomar = (rol, filtro, puntos, cl) => {
      let mejor = null,
        mp = 1e18;
      for (const b of B) {
        if (b.rol || !filtro(b)) continue;
        const p = puntos(b);
        if (p < mp) {
          mp = p;
          mejor = b;
        }
      }
      if (mejor) {
        mejor.rol = rol;
        if (cl !== undefined) mejor.cl = cl;
        R[rol] = mejor;
      }
      return mejor;
    };
    const rr = rnd(U.hash(club.id + 'roles'));
    // pabellón: el edificio que contiene el origen, o el deportivo más cercano, o uno inventado
    let pab =
      B.filter(b => pip(0, 0, b.p) && b.ar > 350).sort((a, b) => b.ar - a.ar)[0] ||
      B.filter(b => b.cl === 10 && b.dc < 160 && b.ar > 300).sort((a, b) => a.dc - b.dc)[0] ||
      B.filter(b => b.dc < 90 && b.ar > 1100).sort((a, b) => a.dc - b.dc)[0];
    if (!pab) {
      const p = [];
      for (let k = 0; k < 16; k++) p.push([Math.cos((k / 16) * Math.PI * 2) * 26, Math.sin((k / 16) * Math.PI * 2) * 19]);
      pab = { i: B.length + 1000, p: p.reverse(), lv: 0, cl: 10, nom: '', ar: 1500, bb: [-26, -19, 26, 19], cx: 0, cz: 0, dc: 0, rol: null };
      B.push(pab);
    }
    pab.rol = 'pabellon';
    pab.cl = 10;
    R.pabellon = pab;
    pab._fr = undefined;
    tomar(
      'sede',
      b => acc(b) && b.ar > 140 && b.ar < 1500 && [0, 1, 2, 3].indexOf(b.cl) >= 0 && b.dc > 40 && b.dc < 200,
      b => Math.abs(b.dc - 70) + (b.lv >= 2 ? 0 : 40),
      3
    ) || sint('sede', 3, 45, 120, 16, 10, 4);
    tomar(
      'tienda',
      b => acc(b) && b.ar > 70 && b.ar < 900 && [0, 1, 2, 3, 12, 9].indexOf(b.cl) >= 0 && b.dc > 20 && b.dc < 230,
      b => b.dc + (b.cl === 2 ? -30 : 0),
      2
    ) || sint('tienda', 2, 25, 110, 12, 9, 2);
    tomar(
      'pena',
      b => acc(b) && b.ar > 55 && b.ar < 600 && [0, 1, 2, 12].indexOf(b.cl) >= 0 && b.dc > 25 && b.dc < 190,
      b => b.dc + (b.cl === 12 ? -60 : 0),
      12
    ) || sint('pena', 12, 30, 130, 10, 8, 2);
    tomar(
      'ayuntamiento',
      b => b.cl === 6 && b.ar > 150,
      b => b.dc,
      6
    ) ||
      tomar(
        'ayuntamiento',
        b => acc(b) && b.ar > 350 && b.ar < 1800 && [0, 3].indexOf(b.cl) >= 0 && b.dc > 60 && b.dc < 210,
        b => Math.abs(b.dc - 130),
        6
      ) ||
      sint('ayuntamiento', 6, 70, 200, 20, 12, 4);
    tomar(
      'kiosco',
      b => b.cl === 11 && b.dc < 220 && acc(b),
      b => b.dc,
      11
    );
    tomar(
      'mercado',
      b => acc(b) && b.ar > 500 && b.ar < 2500 && [0, 2].indexOf(b.cl) >= 0 && b.dc > 60 && b.dc < 230,
      b => b.dc,
      2
    ) || sint('mercado', 2, 80, 210, 22, 14, 1);
    tomar(
      'terraza',
      b => acc(b) && b.cl === 12 && b.ar > 40 && b.dc > 30 && b.dc < 220,
      b => b.dc,
      12
    ) ||
      tomar(
        'terraza',
        b => acc(b) && [0, 2].indexOf(b.cl) >= 0 && b.ar > 60 && b.ar < 500 && b.dc > 40 && b.dc < 220,
        b => b.dc,
        12
      ) ||
      sint('terraza', 12, 40, 160, 9, 8, 2);
    tomar(
      'heladeria',
      b => acc(b) && [12, 2, 0].indexOf(b.cl) >= 0 && b.ar > 40 && b.ar < 450 && b.dc > 30 && b.dc < 230,
      b => 100 + b.dc * (rr() * 0.5 + 0.7),
      12
    ) || sint('heladeria', 12, 40, 190, 8, 8, 1);
    tomar(
      'colegio',
      b => b.cl === 4 && b.ar > 200 && acc(b),
      b => b.dc,
      4
    ) ||
      tomar(
        'colegio',
        b => acc(b) && b.ar > 600 && b.ar < 3000 && [0, 9].indexOf(b.cl) >= 0 && b.dc > 100,
        b => b.dc,
        4
      ) ||
      sint('colegio', 4, 90, 220, 28, 14, 2);
    tomar(
      'hospital',
      b => b.cl === 5 && b.ar > 250 && acc(b),
      b => b.dc,
      5
    ) ||
      tomar(
        'hospital',
        b => acc(b) && b.ar > 1200 && [0, 3].indexOf(b.cl) >= 0 && b.dc > 120,
        b => b.dc,
        5
      ) ||
      sint('hospital', 5, 120, 230, 30, 16, 6);
    tomar(
      'estacion',
      b => b.cl === 13 && acc(b),
      b => b.dc,
      13
    );
    tomar(
      'campus',
      b => acc(b) && b.ar > 500 && [0, 9, 3].indexOf(b.cl) >= 0 && b.dc > 150 && b.dc < 265,
      b => -b.dc,
      9
    ) || sint('campus', 9, 150, 250, 22, 12, 2);
    tomar(
      'bus',
      b => acc(b) && b.ar > 80 && b.dc > 130 && b.dc < 230,
      b => Math.abs(b.dc - 190),
      undefined
    ) || sint('bus', 0, 130, 230, 9, 7, 2);
    // hitos de la ciudad que crece (crecimiento.js): el hotel y el museo ocupan edificios cerca del pabellón
    const crH = GM.mods.crecimiento && st.ciudad && st.ciudad[st.clubId] && st.ciudad[st.clubId].crec ? st.ciudad[st.clubId].crec.hitos : {};
    if (crH.hotel && crH.hotel.estado === 'hecho')
      tomar(
        'hotel',
        b => acc(b) && b.ar > 250 && b.ar < 1800 && [0, 1, 3, 8].indexOf(b.cl) >= 0 && b.dc > 40 && b.dc < 190,
        b => Math.abs(b.dc - 90) + (b.lv >= 4 ? 0 : 30),
        8
      ) || sint('hotel', 8, 40, 170, 22, 14, 6);
    if (crH.museo && crH.museo.estado === 'hecho')
      tomar(
        'museo',
        b => acc(b) && b.ar > 200 && b.ar < 1500 && [0, 1, 3, 6].indexOf(b.cl) >= 0 && b.dc > 40 && b.dc < 190 && !b.rol,
        b => Math.abs(b.dc - 70),
        6
      ) || sint('museo', 6, 40, 160, 18, 12, 3);
    // tus viviendas
    const vivs = GM.mods.hogar && GM.mods.hogar.viviendas ? GM.mods.hogar.viviendas(st) : [];
    vivs.forEach((v, k) => {
      const casa =
        ['casa', 'mansion'].indexOf(
          {
            residencia: 'bloque',
            loft: 'bloque',
            buhardilla: 'bloque',
            bloque: 'bloque',
            'bloque-moderno': 'bloque',
            moderno: 'atico',
            rustico: 'atico',
            mediterranea: 'casa',
            piedra: 'casa',
            moderna: 'casa',
            clasica: 'mansion',
            'mansion-moderna': 'mansion',
            villa: 'mansion'
          }[v.ext] || 'bloque'
        ) >= 0;
      const b =
        tomar(
          'viv' + k,
          b => acc(b) && b.cl === 1 && b.dc > 50 + (v.actual ? 0 : 20) && (casa ? b.ar < 260 : b.ar >= 120),
          b => (casa ? b.dc * 0.6 + b.ar * 0.2 : -b.ar * 0.1 + b.dc * 0.5) + (v.actual ? 0 : rr() * 90),
          undefined
        ) ||
        tomar(
          'viv' + k,
          b => acc(b) && b.dc > 40 && b.ar > 80 && [0, 1].indexOf(b.cl) >= 0,
          b => b.dc,
          undefined
        ) ||
        sint('viv' + k, 1, 50, 200, casa ? 10 : 16, casa ? 9 : 12, casa ? 2 : 5);
      if (b) {
        R.viviendas.push({ v, b });
        if (GM.casasProd && GM.casasProd.fachadaPropia(st, v)) b.color = GM.casasProd.fachadaColor(st, v);
      }
    });
    R.vecinos = [];
    for (let k = 0; k < 8; k++) {
      const vb = tomar(
        'vecino' + k,
        b => acc(b) && b.cl === 1 && b.ar > 60 && b.dc > 45 && b.dc < 200,
        b => b.dc * (0.7 + rr() * 0.6),
        1
      );
      if (vb) R.vecinos.push(vb);
    }
    // locales con interior
    if (GM.interiores)
      [
        ['restaurante', 'RESTAURANTE EL TAPÓN', '#5a1020', 'Entrar en el restaurante', [12, 2, 0]],
        ['gimnasio_barrio', 'GIMNASIO', '#1d2024', 'Entrar en el gimnasio', [2, 0, 3]],
        ['cine_ciudad', 'CINE', '#7a1a22', 'Entrar en el cine', [2, 0]],
        ['bolera', 'BOLERA STRIKE', '#1d4f91', 'Entrar en la bolera', [2, 0, 9]],
        ['barberia', 'BARBERÍA PACO', '#1d4f91', 'Entrar en la barbería', [2, 12, 0]]
      ].forEach(([tipo, txt, fondo, boton, cls], k) => {
        const b =
          tomar(
            'local_' + tipo,
            b => acc(b) && cls.indexOf(b.cl) >= 0 && b.ar > 90 && b.ar < 1100 && b.dc > 30 && b.dc < 240,
            b => b.dc * (0.6 + rr() * 0.8) + k * 6,
            2
          ) || sint('local_' + tipo, 2, 30, 210, 11, 9, 2);
        if (b) R.locales.push({ tipo, txt, fondo, boton, b });
      });
    // negocios propios abiertos: un local con su interior (punto 55)
    R.negocios = [];
    if (GM.interiores && GM.negocios && st.negocios)
      GM.negocios
        .activos(st)
        .filter(n => n.abierto)
        .slice(0, 6)
        .forEach((n, k) => {
          const b =
            tomar(
              'negocio_' + n.id,
              b => acc(b) && [2, 12, 0, 3].indexOf(b.cl) >= 0 && b.ar > 70 && b.ar < 1200 && b.dc > 25 && b.dc < 260,
              b => b.dc * (0.6 + rr() * 0.8) + k * 5,
              2
            ) || sint('negocio_' + n.id, 2, 25, 230, 10, 8, 2);
          if (b) R.negocios.push({ n, b });
        });
    return R;
  }
  // ---------- Carteles, zonas y puertas ----------
  function cartel(W, M, txt, fondo, letra, x, y, z, ry, ancho) {
    const t = M.textura('real-cartel-' + txt + fondo, 512, (c, n) => {
      c.fillStyle = fondo;
      c.fillRect(0, 0, n, n / 4);
      c.fillStyle = letra;
      let fs = 64;
      c.font = 'bold ' + fs + 'px sans-serif';
      while (c.measureText(txt).width > n * 0.92 && fs > 18) {
        fs -= 4;
        c.font = 'bold ' + fs + 'px sans-serif';
      }
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(txt, n / 2, n / 8);
    });
    const g = new THREE.PlaneGeometry(ancho, ancho / 4.2);
    {
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setY(i, 0.75 + uv.getY(i) * 0.25);
    } // el rótulo ocupa el cuarto de arriba del lienzo
    const mRot = new THREE.MeshStandardMaterial({
      map: t,
      roughness: 0.6,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
      emissive: 0xffffff,
      emissiveMap: t,
      emissiveIntensity: 0
    }); // de noche los rótulos brillan (neón)
    {
      const S0 = GM.sede && GM.sede._estado && GM.sede._estado();
      if (S0 && S0.ventanas) S0.ventanas.push(mRot);
    }
    const m = new THREE.Mesh(g, mRot);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.userData = { cartel: true };
    W.add(m);
    return m;
  }
  function puertaVisual(W, p, ancho, color, S) {
    const a = ancho || 1.8,
      m = new THREE.Mesh(
        new THREE.PlaneGeometry(a, 2.5),
        new THREE.MeshStandardMaterial({ color: 0x23272c, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
      );
    m.position.set(p.mx + p.nx * 0.05, 1.25, p.mz + p.nz * 0.05);
    m.rotation.y = p.ry;
    m.userData = { puerta: true };
    W.add(m);
    const t = new THREE.Mesh(
      new THREE.BoxGeometry(a + 0.4, 0.06, 0.55).translate(0, 0, 0.28).rotateX(0.3),
      (S ? recortable : (S2, m) => m)(S, new THREE.MeshStandardMaterial({ color: new THREE.Color(color || '#2a2f35').multiplyScalar(0.75), roughness: 0.9 }))
    );
    t.position.set(p.mx + p.nx * 0.05, 2.65, p.mz + p.nz * 0.05);
    t.rotation.y = p.ry;
    t.userData = { puerta: true };
    W.add(t);
  }
  function montar(S, M, st, X, R, c) {
    const { W, G, club, c1, c2 } = c,
      C3 = GM.mods.ciudad3d;
    const bar = C3 && C3.barrios ? C3.barrios(st).map(b => b.nombre) : [];
    S.plazaNombre = bar[2] || club.ciudad;
    const zonas = {},
      SALAS = {},
      paseo = [];
    S.puertas = {};
    const lugar = tipo => {
      const l = C3 && C3.lugares ? C3.lugares(st).find(x => x.tipo === tipo) : null;
      return l ? l.id : null;
    };
    const salaLugar = (id, nombre, tipo) => {
      const lid = lugar(tipo),
        nada = () => [{ id: 'nada', t: nombre, d: '', disponible: false, motivo: 'Sin actividades', fn: () => ({ ok: false }) }];
      SALAS[id] = {
        id,
        nombre,
        accion: '',
        destino: {},
        acciones: s2 => {
          if (!lid) return nada();
          const L = C3.acciones(s2, lid);
          return L.length
            ? L.map(a => ({
                id: a.id,
                t: a.t,
                d: (a.coste ? (a.jugador ? a.coste + ' mil €' : U.eur(a.coste)) : 'Gratis') + (a.ef && a.ef.barrio ? ', cariño del barrio' : ''),
                disponible: a.disponible,
                motivo: a.motivo || 'No disponible',
                fn: () => {
                  const r2 = C3.hacer(s2, lid, a.id);
                  return r2.ok ? { ok: true, texto: a.t } : r2;
                }
              }))
            : nada();
        }
      };
    };
    const poner = (clave, b, txt, fondo, letra, o) => {
      o = o || {};
      const p = puntoPuerta(b, X, G, o.fuera),
        fr = frente(b, X);
      const ancho = Math.min(o.ancho || 6, Math.max(2.5, fr.l * 0.85)),
        y = o.y || (b.cl === 2 || b.cl === 12 ? 3.05 : 3.7);
      cartel(W, M, txt, fondo, letra, p.mx + p.nx * 0.07, y, p.mz + p.nz * 0.07, p.ry, ancho);
      puertaVisual(W, p, 1.8, fondo, S);
      zonas[clave] = [p.x, p.z];
      paseo.push([p.x, p.z]);
      b.puerta = p;
      return p;
    };
    const entrada = (id, p) => {
      S.puertas[id] = { x: p.x + p.nx * 0.5, z: p.z + p.nz * 0.5, ry: p.ry };
    };
    const nombreCalle = b => {
      const fr = frente(b, X);
      let m = null,
        md = 1e9;
      X.C.forEach(cc => {
        if (!cc.nom) return;
        for (let i = 0; i + 1 < cc.p.length; i++) {
          const d = dSeg(fr.mx, fr.mz, cc.p[i], cc.p[i + 1]);
          if (d < md) {
            md = d;
            m = cc.nom;
          }
        }
      });
      return m;
    };
    // Pabellón: el edificio real con su rótulo grande y las banderas del club
    {
      const b = R.pabellon,
        p = poner('pabellon', b, club.pabellon.nombre.toUpperCase(), '#14181d', '#ffffff', { ancho: 12, y: 6.2, fuera: 2.2 });
      S.ptoPab = [p.x, p.z];
      entrada('interior:pabellon', p);
      S.puertas.pabellon = S.puertas['interior:pabellon'];
      const ux = p.nz,
        uz = -p.nx;
      for (const s of [-3.4, 3.4]) {
        const pl = new THREE.Mesh(
          new THREE.PlaneGeometry(1.6, 4.4),
          GM.kit.viento(new THREE.MeshStandardMaterial({ color: s < 0 ? c1 : c2, side: THREE.DoubleSide, roughness: 0.85 }), 'tela')
        );
        pl.position.set(p.mx + p.nx * 0.12 + ux * s, 4.2, p.mz + p.nz * 0.12 + uz * s);
        pl.rotation.y = p.ry;
        pl.userData = { bandera: true };
        W.add(pl);
      }
    }
    SALAS.pabellon = { id: 'pabellon', nombre: club.pabellon.nombre, accion: 'Taquillas y estado del pabellón', destino: { todos: 'club' } };
    if (R.sede) {
      const p = poner('sede', R.sede, club.nombre.toUpperCase(), c1, '#ffffff', { ancho: 8, y: 3.6 });
      S.spawnCalle = { x: p.x, z: p.z, ry: p.ry };
      entrada('sede', p);
      SALAS.sede = { id: 'sede_calle', nombre: 'Sede del club', accion: 'Volver a las instalaciones', destino: {}, irA: 'sede', boton: 'Entrar en la sede' };
    } else {
      const p = puntoPuerta(R.pabellon, X, G, 5);
      S.spawnCalle = { x: p.x, z: p.z, ry: p.ry };
    }
    const crM = st.ciudad && st.ciudad[st.clubId] && st.ciudad[st.clubId].crec ? st.ciudad[st.clubId].crec.hitos : {},
      hecho = id => !!(crM[id] && crM[id].estado === 'hecho');
    if (R.hotel) {
      poner('hotel', R.hotel, 'HOTEL ' + club.siglas, '#1f2f4a', '#f2d27a', { ancho: 7, y: 4.2 });
      SALAS.hotel = { id: 'hotel', nombre: 'Hotel ' + club.siglas, accion: 'El hotel del club: llena los fines de semana de partido', destino: {} };
    }
    if (R.museo) {
      poner('museo', R.museo, 'MUSEO DEL ' + club.siglas, c1, '#ffffff', { ancho: 7, y: 4 });
      SALAS.museo = { id: 'museo', nombre: 'Museo del club', accion: 'Copas, camisetas históricas y un paseo por la historia del club', destino: {} };
    }
    if (R.tienda) {
      poner('tienda', R.tienda, (hecho('tienda') ? 'MEGATIENDA ' : 'TIENDA OFICIAL ') + club.siglas, '#14181d', '#ffffff', { ancho: hecho('tienda') ? 8 : 6.2 });
      SALAS.tienda = { id: 'tienda', nombre: 'Tienda oficial', accion: 'Camisetas, bufandas y aficionados', destino: {} };
    }
    if (R.pena) {
      const p = poner('pena', R.pena, 'BAR LA PEÑA', '#5a3b26', '#f2d27a', { ancho: 5.5 });
      S.ptoPena = [p.x, p.z];
      SALAS.pena = { id: 'pena', nombre: 'Bar La Peña', accion: 'Donde se reúne la afición', destino: {} };
    }
    if (R.ayuntamiento) {
      poner('ayuntamiento', R.ayuntamiento, 'AYUNTAMIENTO DE ' + club.ciudad.toUpperCase(), '#1d4f91', '#ffffff', { ancho: 9, y: 4.4 });
      SALAS.ayuntamiento = { id: 'ayuntamiento', nombre: 'Ayuntamiento de ' + club.ciudad, accion: 'Convenios y relación con la ciudad', destino: { todos: 'ciudad' } };
    }
    if (R.kiosco) {
      poner('kiosco', R.kiosco, 'PRENSA', '#2a2f35', '#ffffff', { ancho: 3 });
      SALAS.kiosco = {
        id: 'kiosco',
        nombre: 'Quiosco de prensa',
        accion: 'Lo que dicen los periódicos',
        destino: {},
        acciones: s2 => (GM.traspasos && s2.modo === 'gestor' ? GM.traspasos.accionesPrensa(s2) : []).concat(GM.coleccionables ? GM.coleccionables.acciones(s2) : [])
      };
    }
    if (R.mercado) {
      poner('mercado', R.mercado, 'MERCADO DE ' + S.plazaNombre.toUpperCase(), '#2e5d3a', '#f2d27a', { ancho: 8 });
      SALAS.mercado = { id: 'mercado', nombre: 'Mercado de ' + S.plazaNombre, accion: 'Fruta, pescado y charla con los tenderos', destino: {} };
    }
    if (R.terraza) {
      poner('terraza', R.terraza, 'CAFÉ CENTRAL', '#6b3a2a', '#ffffff', { ancho: 5 });
      SALAS.terraza = { id: 'terraza', nombre: 'Terraza del Café Central', accion: 'Un café y escuchar a la gente', destino: {} };
      terrazaMesas(W, R.terraza, X, G, S);
    }
    if (R.heladeria) {
      poner('heladeria', R.heladeria, 'HELADERÍA LA OLA', '#d86a8a', '#ffffff', { ancho: 5 });
      SALAS.heladeria = { id: 'heladeria', nombre: 'Heladería La Ola', accion: 'Helados artesanos', destino: {} };
    }
    if (R.colegio) {
      poner('lugar_colegio', R.colegio, (R.colegio.nom || 'COLEGIO ' + (bar[3] || club.ciudad)).toUpperCase().slice(0, 28), '#f4efe3', '#2a2a2a', { ancho: 9 });
      salaLugar('lugar_colegio', 'Colegio ' + (bar[3] || club.ciudad), 'colegio');
    }
    if (R.hospital) {
      poner('lugar_hospital', R.hospital, 'HOSPITAL ' + (R.hospital.nom || bar[1] || club.ciudad).toUpperCase().slice(0, 22), '#ffffff', '#c0392b', { ancho: 9 });
      salaLugar('lugar_hospital', 'Hospital ' + (bar[1] || club.ciudad), 'hospital');
    }
    if (R.estacion) {
      poner('lugar_estacion', R.estacion, (R.estacion.nom || 'ESTACIÓN').toUpperCase().slice(0, 24), '#1d4f91', '#ffffff', { ancho: 8 });
      salaLugar('lugar_estacion', R.estacion.nom || 'Estación', 'estacion');
    }
    if (R.campus) {
      const nom = club.ciudadDeportiva && club.ciudadDeportiva.nombre ? club.ciudadDeportiva.nombre : 'Ciudad deportiva',
        p = poner('lugar_campus', R.campus, nom.toUpperCase().slice(0, 26), c1, '#ffffff', { ancho: 10, y: 4.2 });
      salaLugar('lugar_campus', nom, 'campus');
      if (GM.deportivaMundo) {
        Object.assign(SALAS.lugar_campus, { irA: 'deportiva', boton: 'Entrar en la ciudad deportiva' });
        S.puertas.deportiva = { x: p.x + p.nx * 0.5, z: p.z + p.nz * 0.5, ry: p.ry };
      }
    }
    R.viviendas.forEach(({ v, b }) => {
      const id = 'casa_' + v.id.replace(/[^a-zA-Z0-9]/g, ''),
        p = poner(id, b, (v.nombre || 'Tu casa').toUpperCase().slice(0, 24), GM.casasProd ? GM.casasProd.fachadaColor(st, v) : '#f4efe3', '#2a2a2a', { ancho: 3.6, y: 2.7 });
      SALAS[id] = {
        id,
        nombre: v.nombre + (v.actual ? ' (vives aquí)' : ' (tuya)'),
        accion: v.barrioNombre ? 'Tu casa en ' + v.barrioNombre : 'Tu casa',
        destino: {},
        irA: 'casa:' + v.id,
        boton: 'Entrar en casa'
      };
      entrada('casa:' + v.id, p);
      if (v.actual) S.puertas.casa = S.puertas['casa:' + v.id];
    });
    R.locales.forEach(l => {
      const p = poner('local_' + l.tipo, l.b, l.txt, l.fondo, '#ffffff', { ancho: 5.5 });
      SALAS['local_' + l.tipo] = {
        id: 'local_' + l.tipo,
        nombre:
          l.txt.charAt(0) +
          l.txt.slice(1).toLowerCase() +
          (GM.negocios && GM.negocios.tiene(st, { restaurante: 'restaurante', gimnasio_barrio: 'gimnasio' }[l.tipo]) ? ' (tuyo)' : ''),
        accion: '',
        destino: {},
        irA: 'interior:' + l.tipo,
        boton: l.boton
      };
      entrada('interior:' + l.tipo, p);
    });
    if (GM.interiores)
      [
        ['pabellon', 'Entrar al pabellón'],
        ['tienda', 'Entrar en la tienda'],
        ['pena', 'Entrar en el bar'],
        ['ayuntamiento', 'Entrar en el ayuntamiento']
      ].forEach(([k, bt]) => {
        if (!SALAS[k]) return;
        SALAS[k] = Object.assign({}, SALAS[k], { irA: 'interior:' + k, boton: bt });
        const p = R[k] && R[k].puerta;
        if (p && k !== 'pabellon') entrada('interior:' + k, p);
      });
    // Interiores de los edificios con puerta de la ciudad (punto 49): hospital, colegio, estación, hotel, museo, mercado, heladería y ciudad deportiva
    if (GM.interiores)
      [
        ['lugar_hospital', 'hospital', 'hospital', 'Entrar en el hospital'],
        ['lugar_colegio', 'colegio', 'colegio', 'Entrar en el colegio'],
        ['lugar_estacion', 'estacion', 'estacion', 'Entrar en la estación'],
        ['hotel', 'hotel', 'hotel_ciudad', 'Entrar en el hotel'],
        ['museo', 'museo', 'museo', 'Entrar en el museo'],
        ['mercado', 'mercado', 'mercado', 'Entrar en el mercado'],
        ['heladeria', 'heladeria', 'heladeria', 'Entrar en la heladería'],
        ['kiosco', 'kiosco', 'kiosco', 'Entrar en el quiosco']
      ].forEach(([sid, rol, tipo, bt]) => {
        const b = R[rol];
        if (!SALAS[sid] || !b || !b.puerta) return;
        SALAS[sid] = Object.assign({}, SALAS[sid], { irA: 'interior:' + tipo, boton: bt });
        entrada('interior:' + tipo, b.puerta);
      });
    // el café de la terraza y dos pisos de vecinos tienen interior (los vecinos reutilizan la casa con gente)
    if (GM.interiores && R.terraza && R.terraza.puerta && SALAS.terraza) {
      SALAS.terraza = Object.assign({}, SALAS.terraza, { irA: 'interior:bar_pueblo', boton: 'Entrar en el café' });
      entrada('interior:bar_pueblo', R.terraza.puerta);
    }
    if (GM.interiores && R.vecinos)
      R.vecinos.forEach((vb, k) => {
        const id = 'vecino' + k,
          p = poner(id, vb, 'PORTAL', '#4a4f55', '#ffffff', { ancho: 2.6, y: 2.7 });
        entrada(id, p);
        if (k === Math.min((st.sede && st.sede.vecinoK) || 0, R.vecinos.length - 1)) entrada('interior:casa_amigos', p);
        SALAS[id] = {
          id,
          nombre: 'Piso de un vecino',
          accion: 'Llamar al timbre',
          destino: {},
          acciones: s2 => [
            {
              id: 'timbre',
              t: 'Llamar al timbre',
              d: 'Un vecino te abre y te deja pasar.',
              disponible: true,
              fn: () => {
                s2.sede = s2.sede || { charlas: {} };
                s2.sede.vecinoK = k;
                S.puertas['interior:casa_amigos'] = S.puertas[id];
                setTimeout(() => GM.sede._escena('interior:casa_amigos'), 50);
                return { ok: true, texto: 'Llamas al timbre' };
              }
            }
          ]
        };
      });
    (R.negocios || []).forEach(({ n, b }) => {
      const id = 'negocio_' + n.id,
        T = GM.negocios.TIPOS[n.tipo],
        p = poner(id, b, n.nombre.toUpperCase().slice(0, 24), '#2b3a4a', '#f2d27a', { ancho: 5.2 });
      entrada(id, p);
      SALAS[id] = {
        id,
        nombre: n.nombre + ' (tuyo)',
        accion: T.n + ' en ' + n.barrio,
        destino: {},
        acciones: s2 => [
          {
            id: 'entrar',
            t: 'Entrar en tu negocio',
            d: 'Ves cómo va el día con tu plantilla.',
            disponible: true,
            fn: () => {
              s2.sede = s2.sede || { charlas: {} };
              s2.sede.negocioId = n.id;
              S.puertas['interior:negocio'] = S.puertas[id];
              setTimeout(() => GM.sede._escena('interior:negocio'), 50);
              return { ok: true, texto: 'Entras en ' + n.nombre };
            }
          }
        ]
      };
    });
    // Autobús a tu pueblo
    if (st.modo === 'carrera' && st.carrera && st.carrera.pueblo && R.bus) {
      const P = st.carrera.pueblo,
        carr = (P.edificios.find(b => b.tipo === 'carretera') || {}).nivel || 0,
        p = puntoPuerta(R.bus, X, G, 2.2);
      cartel(W, M, 'AUTOBÚS A ' + P.nombre.toUpperCase().slice(0, 18), '#2a8a4a', '#ffffff', p.mx + p.nx * 0.07, 3.0, p.mz + p.nz * 0.07, p.ry, 5);
      zonas.bus_pueblo = [p.x, p.z];
      paseo.push([p.x, p.z]);
      {
        const pe = GM.mods.pueblo && GM.mods.pueblo.estado ? GM.mods.pueblo.estado(st) : null;
        if (pe)
          cartel(
            W,
            M,
            (pe.poblacion.toLocaleString('es-ES') + ' HAB., ' + pe.etiqueta).toUpperCase().slice(0, 30),
            '#14301f',
            '#f2d27a',
            p.mx + p.nx * 0.07,
            2.2,
            p.mz + p.nz * 0.07,
            p.ry,
            5
          );
      }
      SALAS.bus_pueblo = {
        id: 'bus_pueblo',
        nombre: 'Autobús a ' + P.nombre,
        accion: '',
        destino: {},
        irA: 'pueblo',
        boton: carr >= 2 ? 'Coger la línea diaria a ' + P.nombre : 'Coger el autobús a ' + P.nombre
      };
      S.puertas.pueblo = { x: p.x, z: p.z, ry: p.ry };
    }
    // Parque: el más grande cerca del centro, con su canasta
    {
      const ps = X.P.filter(q => q.t === 0 && q.p.length >= 3)
        .map(q => {
          let cx = 0,
            cz = 0,
            s = 0;
          q.p.forEach(p => {
            cx += p[0];
            cz += p[1];
          });
          cx /= q.p.length;
          cz /= q.p.length;
          for (let i = 0; i < q.p.length; i++) {
            const a = q.p[i],
              e = q.p[(i + 1) % q.p.length];
            s += a[0] * e[1] - e[0] * a[1];
          }
          return { q, cx, cz, ar: Math.abs(s) / 2 };
        })
        .filter(q => q.ar > 500 && Math.hypot(q.cx, q.cz) > 30 && Math.hypot(q.cx, q.cz) < 230 && pip(q.cx, q.cz, q.q.p))
        .sort((a, b) => Math.hypot(a.cx, a.cz) - Math.hypot(b.cx, b.cz))[0];
      if (ps) {
        S.parqueReal = ps;
        canasta(W, G, S, ps.cx, ps.cz);
        zonas.parque = [ps.cx - 3, ps.cz + 2];
        SALAS.parque = { id: 'parque', nombre: 'Canasta del parque', accion: 'Donde juegan los chavales del barrio', destino: {} };
        paseo.push(zonas.parque);
      }
    }
    // Quiosco y músico inventados si no hay datos reales
    S.paseoBase = muestreoAceras(X, G);
    const sitioAcera = (dMin, dMax, k) => {
      const L = S.paseoBase.filter(q => {
        const d = Math.hypot(q[0], q[1]);
        return d >= dMin && d < dMax;
      });
      return L.length ? L[(k * 7919) % L.length] : null;
    };
    if (!zonas.kiosco) {
      const q = sitioAcera(40, 110, 3);
      if (q) {
        const k = new THREE.Group(),
          cu = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.3, 1.6), new THREE.MeshStandardMaterial({ color: 0x2f5d8a, roughness: 0.6 }));
        cu.position.y = 1.15;
        k.add(cu);
        const te = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 2.0), new THREE.MeshStandardMaterial({ color: 0xc43d3d }));
        te.position.y = 2.4;
        k.add(te);
        k.position.set(q[0], 0, q[1]);
        k.userData = { kiosco: true };
        W.add(k);
        G.bloquea(q[0] - 1.2, q[1] - 0.9, q[0] + 1.2, q[1] + 0.9);
        zonas.kiosco = [q[0], q[1] + 1.8];
        SALAS.kiosco = {
          id: 'kiosco',
          nombre: 'Quiosco de prensa',
          accion: 'Lo que dicen los periódicos',
          destino: {},
          acciones: s2 => (GM.coleccionables ? GM.coleccionables.acciones(s2) : [])
        };
        paseo.push(zonas.kiosco);
      }
    }
    {
      const q = sitioAcera(30, 120, 11);
      if (q) {
        zonas.musico = [q[0], q[1]];
        S.musicoPos = [q[0], q[1]];
        SALAS.musico = { id: 'musico', nombre: 'Músico callejero', accion: 'Toca en la plaza', destino: {} };
      }
    }
    transporte(S, M, X, G, W, c, SALAS, zonas, paseo, bar);
    anclasVida(S, X, G);
    S.zonas = Object.keys(SALAS)
      .filter(k => zonas[k])
      .map(k => M.zona(W, SALAS[k], zonas[k][0], zonas[k][1], club));
    S.paseo = S.paseoBase.concat(paseo);
    S.portales = S.paseoBase.filter((_, i) => i % 6 === 0);
    S.calles = X.C.filter(cc => cc.nom && cc.k <= 5);
    S.vias = X.C.filter(cc => cc.k >= 1 && cc.k <= 4);
    S.callesTodas = X.C.filter(cc => cc.p && cc.p.length > 1);
    // rutas reales de autobús: el tramo más largo de cada ruta que cabe en la ciudad pasa a ser una vía más (el autobús elige la que más paradas tiene)
    (X.RB || [])
      .slice()
      .sort((a, b) => b.p.length - a.p.length)
      .slice(0, 6)
      .forEach(rt => {
        let mejor = [],
          run = [];
        const den = [];
        rt.p.forEach((q, i) => {
          if (i) {
            const o = rt.p[i - 1],
              l = Math.hypot(q[0] - o[0], q[1] - o[1]),
              n = Math.max(1, Math.ceil(l / 8));
            for (let k = 1; k < n; k++) den.push([o[0] + ((q[0] - o[0]) * k) / n, o[1] + ((q[1] - o[1]) * k) / n]);
          }
          den.push(q);
        });
        den.forEach(q => {
          if (Math.hypot(q[0], q[1]) < 282) run.push(q);
          else {
            if (run.length > mejor.length) mejor = run;
            run = [];
          }
        });
        if (run.length > mejor.length) mejor = run;
        if (mejor.length >= 3) S.vias.unshift({ k: 3, nom: 'Línea ' + rt.ref, uno: false, p: mejor, ruta: rt.ref });
      });
    S.calleNombre = nombreCalle(R.sede || R.pabellon) || 'Calle de ' + club.ciudad;
    mobiliario(S, M, X, G, W, c);
    S.cielo = true;
    S.scene.background = new THREE.Color(0xa9c6dc);
    // bruma atmosférica (punto 144): con la cámara a ras de suelo se ve la ciudad lejana hasta el anillo, fundiéndose; antes 60-170 m (todo acababa a 100 m)
    S.scene.fog = new THREE.Fog(0xa9c6dc, 140, 950);
  }
  // ---------- Metro y bicis compartidas ----------
  function transporte(S, M, X, G, W, c, SALAS, zonas, paseo, bar) {
    const T = {
      letrero: (txt, fondo, letra, clave) =>
        M.textura('letrero-' + clave + txt, 512, (x, n) => {
          x.fillStyle = fondo;
          x.fillRect(0, 0, n, n / 4);
          x.fillStyle = letra;
          let fs = 64;
          x.font = 'bold ' + fs + 'px sans-serif';
          while (x.measureText(txt).width > n * 0.92 && fs > 20) {
            fs -= 4;
            x.font = 'bold ' + fs + 'px sans-serif';
          }
          x.textAlign = 'center';
          x.textBaseline = 'middle';
          x.fillText(txt, n / 2, n / 8);
        })
    };
    const base = S.paseoBase || muestreoAceras(X, G),
      U3 = GM.urbano,
      hechoM = st => {
        const h = st.ciudad && st.ciudad[st.clubId] && st.ciudad[st.clubId].crec ? st.ciudad[st.clubId].crec.hitos : {};
        return !!(h.metro && h.metro.estado === 'hecho');
      },
      nom = { oeste: bar[3] || 'Oeste', este: bar[4] || 'Este', norte: bar[1] || 'Norte', centro: hechoM(S.st || {}) ? c.club.nombre : bar[0] || c.club.ciudad };
    const OBJ = [
        ['centro', 0, 70],
        ['oeste', -170, 10],
        ['este', 170, 10],
        ['norte', 10, -170]
      ],
      elegidas = [];
    OBJ.forEach(([k, tx, tz]) => {
      const L = base.map(q => [Math.hypot(q[0] - tx, q[1] - tz), q]).sort((a, b) => a[0] - b[0]);
      for (const [d, q] of L) {
        if (d > 120) break;
        if (elegidas.some(e => Math.hypot(e[1][0] - q[0], e[1][1] - q[1]) < 60)) continue;
        if (!U3.libre(G, q[0] - 3.4, q[1] - 3.2, q[0] + 3.4, q[1] + 4.2)) continue;
        elegidas.push([k, q]);
        break;
      }
    });
    const est = {};
    S.estacionesReal = est;
    elegidas.forEach(([k, q]) => {
      const nombre = 'Metro ' + nom[k],
        bm = U3.bocaMetro(W, G, M, T, q[0], q[1], nombre, k),
        sid = 'metro_' + k;
      est[k] = { x: bm.acceso[0], z: bm.acceso[1] - 0.8, nombre };
      SALAS[sid] = {
        id: sid,
        nombre,
        accion: '',
        destino: {},
        acciones: s2 =>
          elegidas
            .filter(e => e[0] !== k)
            .map(e => ({
              id: 'a_' + e[0],
              t: 'Ir a ' + nom[e[0]],
              d: 'Metro, 2 minutos' + (s2.modo === 'carrera' ? ', 2 €' : ''),
              disponible: true,
              fn: () => GM.ciudadBarrios.viajar(s2, est[e[0]], 'Llegas en metro a ' + nom[e[0]])
            }))
      };
      zonas[sid] = [bm.acceso[0], bm.acceso[1]];
      paseo.push([q[0] + 2, q[1] + 2.6]);
      const bid = 'bici_' + k,
        pb = U3.paradaBici(W, G, M, T, q[0], q[1], [q[0] - 40, q[1] - 40, q[0] + 40, q[1] + 40], 'xz', k);
      SALAS[bid] = {
        id: bid,
        nombre: 'Bicis compartidas',
        accion: '',
        destino: {},
        acciones: s2 => {
          const S2 = GM.sede._estado && GM.sede._estado(),
            en = S2 && S2.yo && S2.yo.bici;
          return [
            en
              ? { id: 'dejar', t: 'Dejar la bici', d: 'Vuelves a ir andando.', disponible: true, fn: () => GM.ciudadBarrios.bici(false) }
              : {
                  id: 'coger',
                  t: 'Coger una bici',
                  d: 'Vas unas dos veces y media más rápido' + (s2.modo === 'carrera' ? ', 1 €' : '') + '.',
                  disponible: true,
                  fn: () => GM.ciudadBarrios.bici(true, s2)
                }
          ];
        }
      };
      zonas[bid] = pb ? pb.acceso : [q[0] - 3.2, q[1] + 1.8];
    });
  }
  // Sitios libres para la vida de la calle (mercadillo, obras, fiesta) sobre el plano real
  function anclasVida(S, X, G) {
    const U3 = GM.urbano,
      base = S.paseoBase || [],
      A = (S.vidaAnc = { puestos: null, obra: null, fiesta: [] });
    const cerca = base.filter(q => {
      const d = Math.hypot(q[0], q[1]);
      return d > 30 && d < 150;
    });
    for (const q of cerca) {
      if (U3.libre(G, q[0] - 1, q[1] - 3.2, q[0] + 19, q[1] + 3.6)) {
        A.puestos = [0, 1, 2, 3].map(i => [q[0] + i * 4.8, q[1] + 1]);
        break;
      }
    }
    for (const q of cerca.slice().reverse()) {
      if (A.puestos && Math.abs(q[0] - A.puestos[0][0]) < 30 && Math.abs(q[1] - A.puestos[0][1]) < 12) continue;
      if (U3.libre(G, q[0] - 1, q[1] - 1.2, q[0] + 10.5, q[1] + 3.2)) {
        A.obra = [q[0], q[1], q[0] + 8.5, q[1] + 1.2];
        break;
      }
    }
    X.C.filter(cc => cc.k >= 1 && cc.k <= 4)
      .map(v => ({ v, d: Math.min(...v.p.map(q => Math.hypot(q[0], q[1]))) }))
      .filter(o => o.d < 120)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2)
      .forEach(o => {
        const p = o.v.p;
        let acum = 0;
        const rec = [p[0]];
        for (let i = 1; i < p.length && acum < 80; i++) {
          acum += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
          rec.push(p[i]);
        }
        A.fiesta.push({ w: ANCHO[o.v.k] || 7, p: rec });
      });
  }
  function muestreoAceras(X, G) {
    const out = [],
      libre = (x, z) => {
        const [i, j] = G.celda(x, z);
        return G.libre(i, j) && G.libre(i + 1, j) && G.libre(i, j + 1) && G.libre(i - 1, j) && G.libre(i, j - 1);
      };
    X.C.forEach(c => {
      if (c.k > 5) return;
      const off = c.k === 5 ? 0 : ANCHO[c.k] / 2 + 1.1;
      let acum = 0;
      for (let i = 0; i + 1 < c.p.length; i++) {
        const a = c.p[i],
          b = c.p[i + 1],
          l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (l < 0.5) continue;
        const ux = (b[0] - a[0]) / l,
          uz = (b[1] - a[1]) / l;
        for (let s = 7 - (acum % 7); s < l; s += 7)
          for (const lado of off ? [1, -1] : [0]) {
            const x = a[0] + ux * s - uz * off * lado,
              z = a[1] + uz * s + ux * off * lado;
            if (x * x + z * z < (R - 12) * (R - 12) && libre(x, z)) out.push([x, z]);
          }
        acum += l;
      }
    });
    return out;
  }
  function terrazaMesas(W, b, X, G, S) {
    const p = puntoPuerta(b, X, G, 3.2),
      ux = p.nz,
      uz = -p.nx,
      mesa = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.6 }),
      pata = new THREE.MeshStandardMaterial({ color: 0x2a2f35 });
    [-2.2, 2.2].forEach(s => {
      const x = p.x + p.nx * 1.3 + ux * s,
        z = p.z + p.nz * 1.3 + uz * s,
        [i, j] = G.celda(x, z);
      if (!G.libre(i, j)) return;
      const g = new THREE.Group(),
        t = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.05, 14), mesa);
      t.position.y = 0.75;
      g.add(t);
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.75, 6), pata);
      l.position.y = 0.37;
      g.add(l);
      g.position.set(x, 0, z);
      g.userData = { mesa: true };
      W.add(g);
      G.bloquea(x - 0.5, z - 0.5, x + 0.5, z + 0.5);
      S.sitios = S.sitios || [];
      const silla = new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 0.7 });
      for (const k of [-1, 1]) {
        const sx = x + ux * 0.8 * k,
          sz = z + uz * 0.8 * k,
          ry = Math.atan2(-ux * k, -uz * k),
          c = new THREE.Group();
        const as = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.42).translate(0, 0.45, 0), silla),
          re = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 0.04).translate(0, 0.7, -0.2), silla);
        c.add(as, re);
        for (const [lx, lz] of [
          [-0.18, -0.18],
          [0.18, -0.18],
          [-0.18, 0.18],
          [0.18, 0.18]
        ])
          c.add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.04).translate(lx, 0.22, lz), silla));
        c.position.set(sx, 0, sz);
        c.rotation.y = ry;
        c.userData = { silla: true };
        W.add(c);
        S.sitios.push({ x: sx, z: sz, ry });
      }
    });
  }
  function canasta(W, G, S, x, z) {
    const g = new THREE.Group(),
      met = new THREE.MeshStandardMaterial({ color: 0x3a3f45, metalness: 0.5, roughness: 0.5 }),
      p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.1, 8), met);
    p.position.set(0, 1.55, 0);
    g.add(p);
    const tab = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.06), new THREE.MeshStandardMaterial({ color: 0xf2f2f2 }));
    tab.position.set(0, 3.0, 0.3);
    g.add(tab);
    const aro = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.02, 6, 16).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xe8590c }));
    aro.position.set(0, 2.85, 0.6);
    g.add(aro);
    g.position.set(x, 0, z);
    g.userData = { canasta: true };
    W.add(g);
    S.aroParque = new THREE.Vector3(x, 2.85, z + 0.6);
    const pista = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 9).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x4a6b8a, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })
    );
    pista.position.set(x, 0, z + 3.2);
    pista.userData = { pista: true };
    W.add(pista);
  }
  // Árboles por especie: copa redonda (plátano, tilo), ciprés, pino y palmera, según el país y el sitio. lista: [[x, z]]; forzar: 'pino' para bosques y 'cipres' para cementerios
  const PALMERAS = [
    'miami-heat',
    'los-angeles-lakers',
    'phoenix-suns',
    'houston-rockets',
    'san-antonio-spurs',
    'orlando-magic',
    'new-orleans-pelicans',
    'dubai-basketball',
    'golden-state-warriors'
  ];
  const ESPECIES = {
    ES: [0.6, 0.14, 0.06, 0.2],
    IT: [0.52, 0.26, 0.16, 0.06],
    GR: [0.46, 0.2, 0.17, 0.17],
    TR: [0.52, 0.2, 0.18, 0.1],
    DE: [0.78, 0.02, 0.2, 0],
    US: [0.74, 0.02, 0.2, 0.04]
  }; // [redondo, ciprés, pino, palmera]
  let GEOARB = null;
  const TEXARB = {}; // materiales de las imágenes planas de los árboles lejanos (uno por especie)
  function plantar(W, G, lista, club, alta, rr, forzar) {
    if (!lista.length) return;
    const T3 = THREE;
    if (!GEOARB) {
      const m = (g, c) => {
        const x = g.index ? g.toNonIndexed() : g;
        const n = x.attributes.position.count,
          col = new Float32Array(n * 3),
          k = new T3.Color(c);
        for (let i = 0; i < n; i++) {
          col[i * 3] = k.r;
          col[i * 3 + 1] = k.g;
          col[i * 3 + 2] = k.b;
        }
        x.setAttribute('color', new T3.BufferAttribute(col, 3));
        x.deleteAttribute('uv');
        return x;
      };
      const tronco = (h, r) => m(new T3.CylinderGeometry(r * 0.7, r, h, 6).translate(0, h / 2, 0), '#6b5136');
      const frondas = [];
      for (let i = 0; i < 9; i++) {
        const f = new T3.BoxGeometry(2.3, 0.05, 0.5).translate(1.15, 0, 0);
        f.rotateZ(-0.42);
        f.rotateY((i / 9) * Math.PI * 2);
        f.translate(0, 5.1, 0);
        frondas.push(m(f, '#ffffff'));
      }
      GEOARB = {
        redondo: [tronco(2.4, 0.17), m(new T3.IcosahedronGeometry(1.5, alta ? 1 : 0).translate(0, 3.4, 0), '#ffffff')],
        cipres: [tronco(1.0, 0.14), m(new T3.ConeGeometry(0.85, 5.4, 8).translate(0, 3.5, 0), '#ffffff')],
        pino: [
          tronco(3.2, 0.15),
          T3.mergeGeometries([
            m(new T3.ConeGeometry(1.5, 2.6, 8).translate(0, 3.2, 0), '#ffffff'),
            m(new T3.ConeGeometry(1.15, 2.3, 8).translate(0, 4.7, 0), '#ffffff'),
            m(new T3.ConeGeometry(0.75, 2.0, 8).translate(0, 6.0, 0), '#ffffff')
          ])
        ],
        palmera: [m(new T3.CylinderGeometry(0.12, 0.2, 5.2, 6).translate(0, 2.6, 0), '#8a7a5a'), T3.mergeGeometries(frondas)]
      };
    }
    const grupos = { redondo: [], cipres: [], pino: [], palmera: [] },
      T = ESPECIES[club.pais] || ESPECIES.ES,
      pal = club.pais === 'US' ? PALMERAS.indexOf(club.id) >= 0 : false;
    // Regla (punto 95): en la calle la especie se decide por tramos de 60 m (una hilera es de una sola especie) y solo entre árbol de
    // sombra y palmera; cipreses y pinos solo donde se fuerzan (cementerios, bosques y parques de OpenStreetMap)
    const pPal = pal ? 0.45 : T[3] > 0 ? Math.min(0.25, T[3]) : 0;
    lista.forEach(p => {
      let e = forzar;
      if (!e) {
        const h = (U.hash(club.id + 'sp' + Math.floor(p[0] / 60) + ',' + Math.floor(p[1] / 60)) % 1000) / 1000;
        e = h < pPal ? 'palmera' : 'redondo';
      }
      grupos[e].push(p);
    });
    const tint = { redondo: [0.25, 0.38, 0.2], cipres: [0.3, 0.3, 0.14], pino: [0.33, 0.3, 0.15], palmera: [0.27, 0.45, 0.27] },
      m4 = new T3.Matrix4(),
      cc = new T3.Color();
    const celdasArb = (W.userData.celdasArb = W.userData.celdasArb || []),
      porCelda = [];
    Object.keys(grupos).forEach(e0 => {
      const mp = {};
      grupos[e0].forEach(p => {
        const k = Math.floor(p[0] / 90) + ',' + Math.floor(p[1] / 90);
        (mp[k] = mp[k] || []).push(p);
      });
      Object.keys(mp).forEach(k => porCelda.push([e0, mp[k], k]));
    });
    porCelda.forEach(([e, L, kc]) => {
      const [gt, gc] = GEOARB[e];
      const tr = new T3.InstancedMesh(gt, new T3.MeshStandardMaterial({ vertexColors: true, roughness: 1 }), L.length),
        co = new T3.InstancedMesh(
          gc,
          GM.kit.viento(new T3.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: e === 'palmera' ? T3.DoubleSide : T3.FrontSide }), 'copa'),
          L.length
        );
      L.forEach(([x, z], i) => {
        const sc = (e === 'palmera' ? 0.9 : 0.8) + rr() * 0.6;
        m4.compose(new T3.Vector3(x, 0, z), new T3.Quaternion().setFromAxisAngle(new T3.Vector3(0, 1, 0), rr() * 6.28), new T3.Vector3(sc, sc * (0.9 + rr() * 0.3), sc));
        tr.setMatrixAt(i, m4);
        co.setMatrixAt(i, m4);
        const t = tint[e];
        cc.setHSL(t[0] + (rr() - 0.5) * 0.06, t[1] + rr() * 0.12, t[2] + rr() * 0.1);
        co.setColorAt(i, cc);
        G.bloquea(x - 0.3, z - 0.3, x + 0.3, z + 0.3);
      });
      tr.userData = { arboles: e };
      co.userData = { arboles: e };
      tr.castShadow = co.castShadow = alta;
      W.add(tr);
      W.add(co);
      const cs = kc.split(',').map(Number);
      let bb = null;
      if (typeof document !== 'undefined') {
        if (!TEXARB[e]) {
          const cv = document.createElement('canvas');
          cv.width = 64;
          cv.height = 128;
          const x = cv.getContext('2d'),
            t = tint[e],
            cl = new T3.Color().setHSL(t[0], t[1] * 0.9, t[2] * 0.85).getStyle();
          x.fillStyle = '#6b5136';
          if (e === 'palmera') {
            x.fillRect(30, 40, 4, 88);
            x.strokeStyle = cl;
            x.lineWidth = 4;
            for (let a = 0; a < 8; a++) {
              x.beginPath();
              x.moveTo(32, 40);
              x.lineTo(32 + Math.cos(a * 0.8) * 28, 40 + Math.sin(a * 0.8) * 14 - 4);
              x.stroke();
            }
          } else {
            x.fillRect(29, 88, 6, 40);
            x.fillStyle = cl;
            if (e === 'redondo') {
              x.beginPath();
              x.ellipse(32, 56, 26, 30, 0, 0, 6.3);
              x.fill();
            } else if (e === 'cipres') {
              x.beginPath();
              x.ellipse(32, 62, 13, 58, 0, 0, 6.3);
              x.fill();
            } else {
              for (let i = 0; i < 3; i++) {
                x.beginPath();
                x.moveTo(32, 14 + i * 22);
                x.lineTo(32 + 26 - i * 5, 56 + i * 22);
                x.lineTo(32 - 26 + i * 5, 56 + i * 22);
                x.fill();
              }
            }
          }
          x.globalCompositeOperation = 'source-atop';
          let sd = 7 + e.length * 13;
          const az = () => {
            sd = (sd * 16807) % 2147483647;
            return sd / 2147483647;
          };
          for (let i = 0; i < 70; i++) {
            x.fillStyle = az() < 0.5 ? 'rgba(255,255,210,0.16)' : 'rgba(0,25,0,0.20)';
            x.beginPath();
            x.arc(8 + az() * 48, 8 + az() * 84, 2 + az() * 5, 0, 6.3);
            x.fill();
          }
          const gr = x.createLinearGradient(0, 0, 64, 0);
          gr.addColorStop(0, 'rgba(255,255,255,0.10)');
          gr.addColorStop(1, 'rgba(0,0,0,0.28)');
          x.fillStyle = gr;
          x.fillRect(0, 0, 64, 128);
          x.globalCompositeOperation = 'source-over';
          const tx = new T3.CanvasTexture(cv);
          tx.colorSpace = T3.SRGBColorSpace;
          tx.anisotropy = 4;
          TEXARB[e] = new T3.MeshLambertMaterial({ map: tx, alphaTest: 0.5, side: T3.DoubleSide });
        }
        const plano = new T3.PlaneGeometry(3.4, 6.8).translate(0, 3.4, 0),
          g2 = T3.mergeGeometries([plano, plano.clone().rotateY(Math.PI / 2)]);
        bb = new T3.InstancedMesh(g2, TEXARB[e], L.length);
        const mm = new T3.Matrix4();
        L.forEach(([x, z], i) => {
          const sc = e === 'palmera' ? 1.0 : 0.9;
          mm.compose(new T3.Vector3(x, 0, z), new T3.Quaternion(), new T3.Vector3(sc, sc, sc));
          bb.setMatrixAt(i, mm);
        });
        bb.userData = { arbolesLejos: e };
        bb.visible = false;
        bb.frustumCulled = true;
        W.add(bb);
      }
      celdasArb.push({ tr, co, bb, x: (cs[0] + 0.5) * 90, z: (cs[1] + 0.5) * 90 });
    });
  }
  // ---------- Árboles y farolas ----------
  function mobiliario(S, M, X, G, W, c) {
    const rr = rnd(U.hash(c.club.id + 'mob')),
      libre = (x, z) => {
        const [i, j] = G.celda(x, z);
        return G.libre(i, j) && G.libre(i + 1, j) && G.libre(i, j + 1) && G.libre(i - 1, j) && G.libre(i, j - 1);
      };
    const zonasP = (S.zonas || []).map(z => [z.obj.position.x, z.obj.position.z]),
      cerca = (x, z) => zonasP.some(q => Math.hypot(q[0] - x, q[1] - z) < 2.2),
      arb = [];
    X.C.forEach(cc => {
      if (cc.k < 1 || cc.k > 5) return;
      const off = ANCHO[cc.k] / 2 + 1.5 + (cc.k === 5 ? 0.5 : 0);
      let acum = 0;
      for (let i = 0; i + 1 < cc.p.length; i++) {
        const a = cc.p[i],
          b = cc.p[i + 1],
          l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (l < 0.5) continue;
        const ux = (b[0] - a[0]) / l,
          uz = (b[1] - a[1]) / l;
        for (let s = 9 - (acum % 9); s < l; s += 9 + rr() * 5) {
          const lado = rr() < 0.5 ? 1 : -1,
            x = a[0] + ux * s - uz * off * lado,
            z = a[1] + uz * s + ux * off * lado;
          if (arb.length < 900 && libre(x, z) && !cerca(x, z) && rr() < 0.75) arb.push([x, z]);
        }
        acum += l;
      }
    });
    X.P.forEach(q => {
      if (q.t === 1 || q.p.length < 3) return;
      let x0 = 1e9,
        z0 = 1e9,
        x1 = -1e9,
        z1 = -1e9;
      q.p.forEach(p => {
        x0 = Math.min(x0, p[0]);
        x1 = Math.max(x1, p[0]);
        z0 = Math.min(z0, p[1]);
        z1 = Math.max(z1, p[1]);
      });
      let n = 0;
      for (let t = 0; t < 120 && n < 28; t++) {
        const x = x0 + rr() * (x1 - x0),
          z = z0 + rr() * (z1 - z0);
        if (pip(x, z, q.p) && libre(x, z) && !cerca(x, z) && arb.length < 1100) {
          arb.push([x, z]);
          n++;
        }
      }
    });
    if (arb.length) {
      plantar(W, G, arb, c.club, c.alta, rr);
      S.arbolesPos = arb
        .slice()
        .sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]))
        .map(q => [q[0], q[1], 0]);
      S.arbolesN = arb.length;
    }
    // farolas, sobre todo cerca del centro
    GM.urbano.luz(S, M);
    let nf = 0;
    const tope = c.alta ? 90 : 50;
    X.C.forEach(cc => {
      if (cc.k < 1 || cc.k > 4) return;
      const off = ANCHO[cc.k] / 2 + 0.9;
      let acum = 0,
        lado = 1;
      for (let i = 0; i + 1 < cc.p.length && nf < tope; i++) {
        const a = cc.p[i],
          b = cc.p[i + 1],
          l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (l < 0.5) continue;
        const ux = (b[0] - a[0]) / l,
          uz = (b[1] - a[1]) / l;
        for (let s = 14 - (acum % 14); s < l && nf < tope; s += 28) {
          const x = a[0] + ux * s - uz * off * lado,
            z = a[1] + uz * s + ux * off * lado,
            hx = -(-uz * lado),
            hz = -(ux * lado);
          lado = -lado;
          if (Math.hypot(x, z) < 190 && libre(x, z) && !cerca(x, z)) {
            GM.urbano.farola(W, G, S, x, z, Math.atan2(hx, hz));
            nf++;
          }
        }
        acum += l;
      }
    });
  }

  GM.register('calleReal', {
    cargar,
    datos,
    cargado: id => id in CACHE,
    construir,
    preparar,
    _int: { subdividir, plantar, cartel, frente, puntoPuerta, pip, dSeg, ANCHO, ACERA, R, rnd, geo, cinta, rellenar, nuevo, malla, suelo }
  });
})();
