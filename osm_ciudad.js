/* LA CIUDAD REAL DE ALREDEDOR (GM.osmCiudad) — edificios, calles, agua y parques de OpenStreetMap
   Alrededor de la zona jugable de la calle se extiende la ciudad real del club: la huella de cada edificio (con sus plantas
   si OSM las conoce), las calles con su ancho según su clase, los ríos, lagos y parques. Los datos (datos_osm.js, © colaboradores
   de OpenStreetMap, ODbL) los genera tools/osm_generar.js; solo hay lo que queda fuera de la zona jugable.
   Todo va en pocas mallas (edificios, tejados, calles, agua, parques) para no costar dibujo.
   Expone: construir(S, M, club, c1) -> grupo o null. */
(function () {
  const U = GM.util;
  const ORIGEN = { x: 0, z: -23 };             // centro de la zona jugable de la calle
  const ANCHO = [12, 9, 6.5, 3.5];             // autovía, principal, calle, peatonal
  const PALETA = {
    ES: ['#ead9bd', '#dcc3a0', '#f2e6d2', '#d1b38c', '#e6cfae', '#cdb497'], IT: ['#d9a86c', '#c98f58', '#e2bb85', '#cf9c63', '#dcb79a'],
    GR: ['#f4f2ec', '#ebe8e0', '#f7f6f1', '#e3ddd0'], TR: ['#ddd2bd', '#c9bba2', '#e5dccb', '#d6c6ad'],
    DE: ['#d8d4cc', '#c3ccd2', '#e2d6c2', '#bfc6c0', '#cfc7bb'], US: ['#9c4a35', '#b5654a', '#7d3b2c', '#a85a40', '#8f8a82', '#b9b2a6']
  };
  const col = h => new THREE.Color(h);

  function construir(S, M, club, c1) {
    const D = GM.osm && GM.osm[club.id];
    if (!D) return null;
    const alta = !GM.campus || !GM.campus.config || GM.campus.config.calidad !== 'normal';
    const g = new THREE.Group(); g.name = 'osm-ciudad';
    const rnd = (() => { let a = U.hash(club.id + 'osm') >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
    const pal = (PALETA[club.pais] || PALETA.ES).map(col);
    const pts = a => { const o = []; for (let i = 1; i + 1 < a.length; i += 2) o.push([a[i] / 10 + ORIGEN.x, a[i + 1] / 10 + ORIGEN.z]); return o; };

    // Suelo de fondo (bajo todo lo jugable, que lleva sus propios suelos)
    const suelo = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x8d8b83, roughness: 1 }));
    suelo.position.set(ORIGEN.x, -0.34, ORIGEN.z); suelo.receiveShadow = false; g.add(suelo);

    const geoDe = (P, I, N, UV, C) => {
      const ge = new THREE.BufferGeometry();
      ge.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
      if (N) ge.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); if (UV) ge.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); if (C) ge.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
      if (I) ge.setIndex(I); if (!N) ge.computeVertexNormals(); return ge;
    };
    const relleno = (arr, y, P, I, C, color) => {   // polígono plano triangulado
      const q = arr.map(p => new THREE.Vector2(p[0], p[1])), tri = THREE.ShapeUtils.triangulateShape(q, []), b = P.length / 3;
      q.forEach(v => { P.push(v.x, y, v.y); if (C) C.push(color.r, color.g, color.b); });
      tri.forEach(t => I.push(b + t[0], b + t[2], b + t[1]));   // hacia arriba
    };

    // Edificios: paredes con UV en metros (ventanas) y tejados planos aparte
    { const P = [], N = [], UV = [], C = [], I = [], PT = [], IT = [], CT = [];
      D.e.forEach(e => {
        let q = pts(e); if (q.length < 3) return;
        let s = 0; for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length]; s += a[0] * b[1] - b[0] * a[1]; }
        if (s < 0) q = q.reverse();
        const cx = q.reduce((t, p) => t + p[0], 0) / q.length, cz = q.reduce((t, p) => t + p[1], 0) / q.length, dc = Math.hypot(cx - ORIGEN.x, cz - ORIGEN.z);
        const pl = e[0] || Math.max(2, Math.round(2 + rnd() * 3 + (dc < 220 ? rnd() * 3 : 0) + (rnd() < 0.06 ? 4 : 0))), h = pl * 3.1 + 0.4;
        const c = pal[(rnd() * pal.length) | 0].clone().offsetHSL(0, 0, (rnd() - 0.5) * 0.06), ct = new THREE.Color(0x5b5753).offsetHSL(0, 0, (rnd() - 0.5) * 0.08);
        let u = 0;
        for (let i = 0; i < q.length; i++) {
          const a = q[i], b = q[(i + 1) % q.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 0.3) continue;
          const nx = (b[1] - a[1]) / l, nz = -(b[0] - a[0]) / l, v0 = P.length / 3;   // normal hacia fuera (polígono en sentido horario visto desde arriba con z al sur)
          P.push(a[0], 0, a[1], b[0], 0, b[1], b[0], h, b[1], a[0], h, a[1]);
          for (let k = 0; k < 4; k++) { N.push(nx, 0, nz); C.push(c.r, c.g, c.b); }
          UV.push(u / 3, 0, (u + l) / 3, 0, (u + l) / 3, h / 3.1, u / 3, h / 3.1); u += l;
          I.push(v0, v0 + 1, v0 + 2, v0, v0 + 2, v0 + 3);
        }
        relleno(q, h, PT, IT, CT, ct);
      });
      if (P.length) {
        const tex = M.textura('osm-fachada', 128, (x, n) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, n, n); x.fillStyle = '#3d4a58'; x.fillRect(n * 0.2, n * 0.3, n * 0.6, n * 0.46); x.fillStyle = 'rgba(255,255,255,.22)'; x.fillRect(n * 0.22, n * 0.32, n * 0.26, n * 0.18); x.fillStyle = 'rgba(0,0,0,.14)'; x.fillRect(0, n * 0.92, n, n * 0.08); });
        const mp = new THREE.Mesh(geoDe(P, I, N, UV, C), new THREE.MeshStandardMaterial({ map: tex, vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }));
        mp.castShadow = false; mp.receiveShadow = alta; g.add(mp);
        const mt = new THREE.Mesh(geoDe(PT, IT, null, null, CT), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide }));
        g.add(mt);
      }
    }
    // Calles (cintas planas con su ancho) y su marca central
    { const P = [], I = [];
      D.c.forEach(c => {
        const q = pts(c), w = ANCHO[c[0]] || 4;
        for (let i = 0; i + 1 < q.length; i++) {
          const a = q[i], b = q[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); if (l < 0.2) continue;
          const nx = -dz / l * w / 2, nz = dx / l * w / 2, v0 = P.length / 3, ex = dx / l * w * 0.3, ez = dz / l * w * 0.3;
          P.push(a[0] - ex + nx, 0, a[1] - ez + nz, b[0] + ex + nx, 0, b[1] + ez + nz, b[0] + ex - nx, 0, b[1] + ez - nz, a[0] - ex - nx, 0, a[1] - ez - nz);
          I.push(v0, v0 + 2, v0 + 1, v0, v0 + 3, v0 + 2);
        }
      });
      if (P.length) { const m = new THREE.Mesh(geoDe(P, I), new THREE.MeshStandardMaterial({ color: 0x4a4c50, roughness: 0.95, side: THREE.DoubleSide })); m.position.y = -0.3; m.receiveShadow = alta; g.add(m); }
    }
    // Parques y agua
    const plano = (lista, color, y, rug, an) => {
      const P = [], I = [];
      lista.forEach(e => {
        const q = pts(e);
        if (an && e[0] === 1) {   // río o canal: cinta ancha
          for (let i = 0; i + 1 < q.length; i++) { const a = q[i], b = q[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l * 5, nz = dx / l * 5, v0 = P.length / 3; P.push(a[0] + nx, 0, a[1] + nz, b[0] + nx, 0, b[1] + nz, b[0] - nx, 0, b[1] - nz, a[0] - nx, 0, a[1] - nz); I.push(v0, v0 + 2, v0 + 1, v0, v0 + 3, v0 + 2); }
        } else if (q.length >= 3) relleno(q, 0, P, I);
      });
      if (!P.length) return;
      const m = new THREE.Mesh(geoDe(P, I), new THREE.MeshStandardMaterial({ color, roughness: rug, metalness: an ? 0.1 : 0, side: THREE.DoubleSide })); m.position.y = y; g.add(m);
      return m;
    };
    plano(D.p, 0x5f8f4f, -0.31, 1);
    const agua = plano(D.a, 0x3f7f9f, -0.28, 0.25, true);
    if (agua && GM.arquitectura && GM.arquitectura.agua) { try { agua.material = GM.arquitectura.agua({ color: 0x3f7f9f, opacidad: 0.92 }); agua.material.side = THREE.DoubleSide; } catch (e) { /* sin ondas: queda el color */ } }
    // Los edificios no se dibujan más allá de cierta distancia de la cámara por el propio far de la cámara
    return g;
  }

  GM.register('osmCiudad', { construir });
})();
