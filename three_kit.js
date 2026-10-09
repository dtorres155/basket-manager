/* KIT 3D (GM.kit)
   Utilidades comunes de los módulos 8 y 9: helper DOM h(), vista Three.js (0.186; intensidades de luz en escala clásica, el kit las multiplica por π) con cámara orbital propia
   (un dedo gira, dos dedos acercan, toque = selección), primitivas low-poly y liberación de recursos.
   Si Three.js o WebGL no están disponibles, disponible() devuelve false y los módulos usan su panel de lista. */
(function () {
  const kit = {};
  kit.h = function (tag, attrs) {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (let i = 2; i < arguments.length; i++) {
      const c = arguments[i];
      if (c === null || c === undefined || c === false) continue;
      if (Array.isArray(c)) c.forEach(x => { if (x !== null && x !== undefined && x !== false) el.append(x.nodeType ? x : document.createTextNode(String(x))); });
      else el.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return el;
  };
  kit.disponible = function () {
    if (typeof THREE === 'undefined' || typeof document === 'undefined') return false;
    try { const c = document.createElement('canvas'); return !!(c.getContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); } catch (e) { return false; }
  };
  const matCache = {};
  kit.mat = function (color, op) {
    const k = color + '|' + (op || 1);
    if (!matCache[k]) matCache[k] = new THREE.MeshLambertMaterial(op && op < 1 ? { color, transparent: true, opacity: op } : { color });
    return matCache[k];
  };
  kit.caja = function (w, h, d, color, x, y, z, op) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), kit.mat(color, op));
    m.position.set(x || 0, (y || 0) + h / 2, z || 0); return m;
  };
  kit.cono = function (r, h, color, x, y, z, seg) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg || 5), kit.mat(color));
    m.position.set(x || 0, (y || 0) + h / 2, z || 0); return m;
  };
  kit.cilindro = function (r, h, color, x, y, z, seg) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg || 6), kit.mat(color));
    m.position.set(x || 0, (y || 0) + h / 2, z || 0); return m;
  };
  kit.arbol = function (x, z, s) {
    const g = new THREE.Group(); s = s || 1;
    g.add(kit.cilindro(0.06 * s, 0.35 * s, 0x6b4a2b, 0, 0, 0, 5));
    g.add(kit.cono(0.32 * s, 0.8 * s, 0x2e7d4f, 0, 0.3 * s, 0, 6));
    g.position.set(x, 0, z); return g;
  };
  // ---------- Formas orgánicas (caminos curvos, manchas irregulares, relieve) ----------
  // Puntos de control de un camino que se curva suavemente entre a y b (desvío lateral en la mitad, según la semilla)
  kit.curvaEntre = function (a, b, desvio, semilla) {
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l, s = Math.sin((semilla || 1) * 12.9898) * 43758.5453, f = (s - Math.floor(s)) * 2 - 1, d = (desvio === undefined ? 0.12 : desvio) * l * f;
    return [a, [a[0] + dx * 0.33 + nx * d * 0.8, a[1] + dz * 0.33 + nz * d * 0.8], [a[0] + dx * 0.66 + nx * d, a[1] + dz * 0.66 + nz * d], b];
  };
  // Cinta plana (camino, carretera, río) que sigue una curva suave por los puntos de control; y: altura (número o función x,z)
  kit.cinta = function (ctrl, ancho, color, y, cerrada, mat) {
    const curva = new THREE.CatmullRomCurve3(ctrl.map(p => new THREE.Vector3(p[0], 0, p[1])), !!cerrada, 'centripetal'), n = Math.max(8, Math.round(curva.getLength() / 0.6)), pts = curva.getSpacedPoints(n);
    const pos = [], uv = [], idx = []; let acc = 0; const alt = typeof y === 'function' ? y : () => (y || 0) + 0.02;
    pts.forEach((p, i) => {
      const q = pts[Math.min(i + 1, pts.length - 1)], o = pts[Math.max(i - 1, 0)], tx = q.x - o.x, tz = q.z - o.z, l = Math.hypot(tx, tz) || 1, nx = -tz / l * ancho / 2, nz = tx / l * ancho / 2;
      if (i) acc += p.distanceTo(pts[i - 1]);
      pos.push(p.x + nx, alt(p.x + nx, p.z + nz), p.z + nz, p.x - nx, alt(p.x - nx, p.z - nz), p.z - nz); uv.push(0, acc / ancho, 1, acc / ancho);
      if (i) { const k = (i - 1) * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat || kit.mat(color)); m.receiveShadow = true; return m;
  };
  // Mancha de contorno irregular (parcela, plaza, estanque, barrio) con el borde redondeado; r: radio medio
  kit.mancha = function (r, color, x, y, z, semilla, sx, sz, alto, irregular) {
    const s = new THREE.Shape(), N = 40, k = irregular === undefined ? 0.12 : irregular, h = (semilla || 1) * 1.37;
    for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2, rr = r * (1 + k * (Math.sin(a * 2 + h) * 0.55 + Math.sin(a * 3 + h * 2.1) * 0.3 + Math.sin(a * 5 + h * 0.7) * 0.15)), px = Math.cos(a) * rr * (sx || 1), pz = Math.sin(a) * rr * (sz || 1); if (i) s.lineTo(px, pz); else s.moveTo(px, pz); }
    const t = alto || 0.05, g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: true, bevelThickness: Math.min(0.04, t), bevelSize: Math.min(0.25, r * 0.06), bevelSegments: 2, curveSegments: 2 });
    g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, typeof color === 'object' ? color : kit.mat(color)); m.position.set(x || 0, (y || 0), z || 0); m.receiveShadow = true; return m;
  };
  // Terreno con relieve: plano de w x d con altura alt(x, z) y color por vértice col(x, z, y) -> [r, g, b] (0-1)
  kit.relieve = function (w, d, seg, alt, col, cx, cz) {
    const g = new THREE.PlaneGeometry(w, d, seg, Math.round(seg * d / w)); g.rotateX(-Math.PI / 2); g.translate(cx || 0, 0, cz || 0);
    const p = g.attributes.position, c = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = alt(x, z); p.setY(i, y); const k = col(x, z, y); c[i * 3] = k[0]; c[i * 3 + 1] = k[1]; c[i * 3 + 2] = k[2]; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true })); m.receiveShadow = true; return m;
  };
  // Ruido suave (valor) para relieves y colores
  kit.ruido = function (x, z) { const h = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); }, xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz); return (h(xi, zi) * (1 - u) + h(xi + 1, zi) * u) * (1 - v) + (h(xi, zi + 1) * (1 - u) + h(xi + 1, zi + 1) * u) * v; };
  // Árbol de copa redonda (frondoso) para variar los conos

  // ---------- Viento: los árboles se mecen y las telas ondean (en el sombreado de vértices, así funciona con geometría fusionada o instanciada) ----------
  kit.vientoU = { value: 0 };
  if (typeof window !== 'undefined' && window.requestAnimationFrame) (function tic() { kit.vientoU.value = performance.now() / 1000; window.requestAnimationFrame(tic); })();
  kit.viento = function (m, tipo, fuerza) {
    if (!m || m.userData.viento || m.onBeforeCompile && m.onBeforeCompile.toString().indexOf('uEscT') >= 0) return m;
    m.userData.viento = tipo; const f = fuerza || (tipo === 'tela' ? 0.07 : 0.12);
    m.onBeforeCompile = sh => {
      sh.uniforms.uVientoT = kit.vientoU; sh.uniforms.uVientoF = { value: f };
      sh.vertexShader = 'uniform float uVientoT;\nuniform float uVientoF;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' +
        '{ vec4 wpV = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\n wpV = instanceMatrix * wpV;\n#endif\n wpV = modelMatrix * wpV;\n' +
        (tipo === 'tela' ? ' float olaV = sin(uVientoT * 4.2 + wpV.x * 2.3 + wpV.z * 2.3 + wpV.y * 3.1) * uVientoF; transformed += objectNormal * olaV; }'
          : ' float hV = clamp((wpV.y - 1.2) / 3.5, 0.0, 1.0); float sV = sin(uVientoT * 1.3 + wpV.x * 0.21 + wpV.z * 0.17) + 0.4 * sin(uVientoT * 2.9 + wpV.x * 0.9); transformed.x += sV * uVientoF * hV; transformed.z += cos(uVientoT * 1.1 + wpV.z * 0.23) * uVientoF * 0.6 * hV; }'));
    };
    m.customProgramCacheKey = () => 'viento-' + tipo; m.needsUpdate = true; return m;
  };
  // ---------- Palomas: bandadas que picotean por el suelo y salen volando cuando alguien se acerca ----------
  // puntos: [[x, z], ...] sitios donde se posan. Devuelve { actualizar(dt, amenazas: [[x, z]]) }.
  kit.palomas = function (W, puntos, n) {
    const T = THREE; if (!puntos || !puntos.length) return null; n = n || 10;
    const mCuerpo = new T.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.9 }), mCabeza = new T.MeshStandardMaterial({ color: 0x4f5866, roughness: 0.6, metalness: 0.2 }), mAla = new T.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.9, side: T.DoubleSide });
    const gC = new T.SphereGeometry(0.09, 8, 6).scale(0.85, 0.8, 1.5), gH = new T.SphereGeometry(0.048, 8, 6), gA = new T.PlaneGeometry(0.2, 0.09).translate(0.1, 0, 0).rotateX(-Math.PI / 2), gCola = new T.PlaneGeometry(0.08, 0.1).rotateX(-Math.PI / 2);
    let s = 911; const rr = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const aves = [];
    puntos.forEach((p, k) => { for (let i = 0; i < n; i++) {
      const g = new T.Group(), c = new T.Mesh(gC, mCuerpo), h = new T.Mesh(gH, mCabeza), a1 = new T.Mesh(gA, mAla), a2 = new T.Mesh(gA, mAla), co = new T.Mesh(gCola, mCuerpo);
      c.position.y = 0.11; h.position.set(0, 0.2, 0.12); a1.position.set(0.05, 0.13, 0); a2.position.set(-0.05, 0.13, 0); a2.scale.x = -1; co.position.set(0, 0.11, -0.16); g.add(c, h, a1, a2, co);
      g.userData = { paloma: true }; const x = p[0] + (rr() - 0.5) * 3, z = p[1] + (rr() - 0.5) * 3; g.position.set(x, 0, z); g.rotation.y = rr() * 6.28; W.add(g);
      aves.push({ g, h, a1, a2, sitio: k, estado: 'suelo', t: rr() * 3, vx: 0, vy: 0, vz: 0, dest: null, paso: rr() * 2 }); } });
    return { aves, actualizar(dt, amenazas) {
      const ahora = kit.vientoU.value;
      aves.forEach(a => { const o = a.g.position; a.t += dt;
        if (a.estado === 'suelo') {
          if ((amenazas || []).some(m => Math.hypot(m[0] - o.x, m[1] - o.z) < 3.2)) { a.estado = 'huye'; a.t = 0; const ang = rr() * 6.28; a.vx = Math.cos(ang) * 3; a.vz = Math.sin(ang) * 3; a.vy = 3 + rr() * 1.5; let d = (a.sitio + 1 + ((rr() * (puntos.length - 1)) | 0)) % puntos.length; a.dest = [puntos[d][0] + (rr() - 0.5) * 3, puntos[d][1] + (rr() - 0.5) * 3]; a.sitio = d; return; }
          a.paso -= dt; if (a.paso <= 0) { a.paso = 0.6 + rr() * 2.4; a.rumbo = rr() < 0.5 ? null : a.g.rotation.y + (rr() - 0.5) * 2; }
          if (a.rumbo !== null && a.rumbo !== undefined) { a.g.rotation.y += (a.rumbo - a.g.rotation.y) * Math.min(1, dt * 4); o.x += Math.sin(a.g.rotation.y) * dt * 0.25; o.z += Math.cos(a.g.rotation.y) * dt * 0.25; }
          const pica = Math.sin(a.t * 7) > 0.6; a.h.position.set(0, pica ? 0.13 : 0.2, pica ? 0.16 : 0.12); a.a1.rotation.z = a.a2.rotation.z = 0; o.y = 0;
        } else {
          const aleteo = Math.sin(ahora * 32 + a.t * 3) * 1.1; a.a1.rotation.z = aleteo; a.a2.rotation.z = -aleteo;
          if (a.estado === 'huye') { o.x += a.vx * dt; o.z += a.vz * dt; o.y += a.vy * dt; a.vy *= 0.985; if (a.t > 1.6) { a.estado = 'vuela'; a.t = 0; } }
          else { const dx = a.dest[0] - o.x, dz = a.dest[1] - o.z, d = Math.hypot(dx, dz), alto = Math.min(9, d * 0.35 + 0.2); o.x += dx / Math.max(d, 0.01) * Math.min(d, 6 * dt); o.z += dz / Math.max(d, 0.01) * Math.min(d, 6 * dt); o.y += (alto - o.y) * Math.min(1, dt * 2.2); a.g.rotation.y = Math.atan2(dx, dz); if (d < 0.15 && o.y < 0.25) { a.estado = 'suelo'; o.y = 0; a.t = 0; } }
        } });
    } };
  };

  // ---------- Coches detallados: carrocería con perfil real (extruida y redondeada), pintura con barniz, lunas, llantas y luces ----------
  // tipo: 'turismo', 'compacto', 'todoterreno', 'furgoneta' o 'taxi'. Mira a +z, mide unos 4 m y las ruedas apoyan en y = 0.
  const PERFILES = {
    turismo: { L: 4.3, cuerpo: [[-2.15, 0.32], [-2.18, 0.78], [-1.55, 0.98], [1.2, 0.98], [2.12, 0.82], [2.15, 0.32]], cabina: [[-1.3, 0.97], [-0.65, 1.42], [0.5, 1.42], [1.2, 0.97]], ancho: 1.78, rueda: 0.34, ejes: [-1.35, 1.35] },
    compacto: { L: 3.9, cuerpo: [[-1.95, 0.32], [-1.98, 0.95], [1.05, 0.95], [1.92, 0.8], [1.95, 0.32]], cabina: [[-1.9, 0.94], [-1.75, 1.45], [0.45, 1.45], [1.05, 0.94]], ancho: 1.72, rueda: 0.32, ejes: [-1.2, 1.25] },
    todoterreno: { L: 4.6, cuerpo: [[-2.3, 0.45], [-2.32, 1.12], [1.35, 1.12], [2.25, 0.98], [2.3, 0.45]], cabina: [[-2.2, 1.1], [-2.1, 1.75], [0.75, 1.75], [1.35, 1.1]], ancho: 1.92, rueda: 0.4, ejes: [-1.45, 1.45] },
    furgoneta: { L: 4.9, cuerpo: [[-2.45, 0.38], [-2.45, 2.15], [1.15, 2.15], [1.85, 1.2], [2.42, 0.95], [2.45, 0.38]], cabina: [[1.12, 2.05], [1.82, 1.22], [1.15, 1.22]], ancho: 1.95, rueda: 0.36, ejes: [-1.6, 1.6] }
  };
  PERFILES.taxi = PERFILES.turismo; PERFILES.ambulancia = PERFILES.furgoneta;
  const cacheCoche = {};
  kit.coche = function (color, tipo) {
    const T = THREE, P = PERFILES[tipo] || PERFILES.turismo, g = new T.Group(), k = (tipo || 'turismo') + color;
    const C = cacheCoche[k] || (cacheCoche[k] = (() => {
      const forma = pts => { const s = new T.Shape(); pts.forEach(([z, y], i) => (i ? s.lineTo(z, y) : s.moveTo(z, y))); s.closePath(); return s; };
      const ext = (pts, ancho, bisel) => { const geo = new T.ExtrudeGeometry(forma(pts), { depth: ancho - bisel * 2, bevelEnabled: true, bevelThickness: bisel, bevelSize: bisel, bevelSegments: 3, curveSegments: 4 }); geo.translate(0, 0, -(ancho - bisel * 2) / 2); geo.rotateY(-Math.PI / 2); return geo; };
      const pintura = new T.MeshPhysicalMaterial({ color, metalness: 0.55, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08 });
      const vidrio = new T.MeshPhysicalMaterial({ color: 0x1a232b, metalness: 0.2, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.88 });
      const goma = new T.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 }), llanta = new T.MeshStandardMaterial({ color: 0xc8ccd0, metalness: 0.9, roughness: 0.25 }), negro = new T.MeshStandardMaterial({ color: 0x1c1f22, roughness: 0.6 });
      const faro = new T.MeshStandardMaterial({ color: 0xf6f3e6, emissive: 0xfff3cf, emissiveIntensity: 0.45, roughness: 0.1 }), piloto = new T.MeshStandardMaterial({ color: 0x9b1010, emissive: 0xc01010, emissiveIntensity: 0.7, roughness: 0.2 });
      return { cuerpo: ext(P.cuerpo, P.ancho, 0.07), cabina: ext(P.cabina, P.ancho - 0.12, 0.05), pintura, vidrio, goma, llanta, negro, faro, piloto };
    })());
    const M = (geo, m, x, y, z) => { const me = new T.Mesh(geo, m); me.position.set(x || 0, y || 0, z || 0); me.castShadow = true; me.receiveShadow = true; g.add(me); return me; };
    M(C.cuerpo, C.pintura); M(C.cabina, C.vidrio);
    // techo pintado sobre la cabina (menos en la furgoneta, que ya lo lleva en el cuerpo)
    if (tipo !== 'furgoneta') { const cb = P.cabina, y = cb[1][1], z0 = cb[1][0] + 0.05, z1 = cb[2][0] - 0.05; M(new T.BoxGeometry(P.ancho - 0.2, 0.06, z1 - z0), C.pintura, 0, y + 0.02, (z0 + z1) / 2); }
    // ruedas con neumático y llanta, y pasos de rueda oscuros
    for (const ez of P.ejes) for (const s of [-1, 1]) { const r = P.rueda, n = M(new T.CylinderGeometry(r, r, 0.26, 20), C.goma, s * (P.ancho / 2 - 0.12), r, ez); n.rotation.z = Math.PI / 2; const ll = M(new T.CylinderGeometry(r * 0.62, r * 0.62, 0.02, 16), C.llanta, s * (P.ancho / 2 + 0.01), r, ez); ll.rotation.z = Math.PI / 2; }
    // parachoques, faros y pilotos
    const zF = P.cuerpo[P.cuerpo.length - 1][0], zR = P.cuerpo[0][0], yL = tipo === 'todoterreno' ? 0.85 : tipo === 'furgoneta' ? 0.8 : 0.68;
    M(new T.BoxGeometry(P.ancho - 0.04, 0.16, 0.12), C.negro, 0, 0.4, zF + 0.02); M(new T.BoxGeometry(P.ancho - 0.04, 0.16, 0.12), C.negro, 0, 0.4, zR - 0.02);
    for (const s of [-1, 1]) { M(new T.BoxGeometry(0.42, 0.13, 0.05), C.faro, s * (P.ancho / 2 - 0.32), yL, zF + 0.02); M(new T.BoxGeometry(0.38, 0.12, 0.05), C.piloto, s * (P.ancho / 2 - 0.3), yL + 0.08, zR - 0.02); }
    M(new T.BoxGeometry(0.5, 0.16, 0.03), new T.MeshStandardMaterial({ color: 0xf0f0f0 }), 0, 0.42, zR - 0.09);   // matrícula
    if (tipo === 'taxi') { const cart = M(new T.BoxGeometry(0.6, 0.18, 0.25), new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0x9cff9c, emissiveIntensity: 0.6 }), 0, P.cabina[1][1] + 0.14, -0.05); void cart; }
    if (tipo === 'ambulancia') { M(new T.BoxGeometry(P.ancho + 0.02, 0.22, 3.4), new T.MeshStandardMaterial({ color: 0xd62d2d }), 0, 1.15, -0.7);
      for (const s of [-1, 1]) { const mz = new T.MeshStandardMaterial({ color: 0x1f5fff, emissive: 0x2a6bff, emissiveIntensity: 2 }), luz = M(new T.BoxGeometry(0.45, 0.14, 0.22), mz, s * 0.45, 2.22, 0.9); luz.onBeforeRender = () => { const tt = kit.vientoU.value; mz.emissiveIntensity = Math.sin(tt * 14 + (s > 0 ? Math.PI : 0)) > 0 ? 3.5 : 0.15; }; } }
    g.userData = { coche: true, tipo: tipo || 'turismo', largo: P.L }; return g;
  };

  // ---------- Calcomanías: carteles pegados y grafitis en las paredes, manchas y parches en el suelo (texturas hechas por código) ----------
  const CALC = {};
  function lienzoCalc(clave, w, h, dib) { if (CALC[clave] !== undefined) return CALC[clave]; if (typeof document === 'undefined') return (CALC[clave] = null); const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext && c.getContext('2d'); if (!x) return (CALC[clave] = null); dib(x, w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return (CALC[clave] = new THREE.MeshStandardMaterial({ map: t, transparent: true, depthWrite: false, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); }
  const CARTELES = [['CONCIERTO', 'SÁBADO 21:00', '#c0392b', '#fff4d6'], ['FIESTA MAYOR', 'DEL 12 AL 15', '#1d4f91', '#f2d27a'], ['CLASES DE GUITARRA', 'LLAMA YA', '#f4efe3', '#2a2a2a'], ['SE ALQUILA', 'PISO 2 HAB.', '#ffffff', '#c0392b'], ['MERCADILLO', 'TODOS LOS JUEVES', '#2e5d3a', '#ffffff'], ['GRAN DERBI', 'DOMINGO', '#111111', '#ffb81c'], ['CIRCO', 'ÚLTIMOS DÍAS', '#e8590c', '#ffffff'], ['SE BUSCA GATO', 'RECOMPENSA', '#fff9c4', '#333333']];
  const SPRAY = ['#e8590c', '#2f80ed', '#27ae60', '#c0392b', '#8e44ad', '#f1c40f', '#ffffff', '#111111'];
  kit.calcomania = function (W, tipo, x, y, z, ry, r) {
    r = r || Math.random; let m, w = 0.62, h = 0.85;
    if (tipo === 'cartel') { const k = (r() * CARTELES.length) | 0, C = CARTELES[k];
      m = lienzoCalc('cartel' + k, 192, 256, (q, cw, ch) => { q.fillStyle = C[2]; q.beginPath(); q.moveTo(4, 6); q.lineTo(cw - 3, 2); q.lineTo(cw - 6, ch - 4); q.lineTo(cw * 0.6, ch - 12); q.lineTo(2, ch - 2); q.closePath(); q.fill(); q.fillStyle = C[3]; q.textAlign = 'center'; q.font = 'bold 30px sans-serif';
        const pal = C[0].split(' '); pal.forEach((p, i) => q.fillText(p, cw / 2, 70 + i * 34)); q.font = '18px sans-serif'; q.fillText(C[1], cw / 2, ch - 50); q.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 40; i++) q.fillRect((i * 37) % cw, (i * 53) % ch, 2, 2); }); }
    else if (tipo === 'grafiti') { const k = (r() * 6) | 0; w = 1.7; h = 0.85;
      m = lienzoCalc('grafiti' + k, 512, 256, (q, cw, ch) => { const TAGS = ['KRS', 'ZEN', 'MOK', 'RAY', 'BDN', 'OKE'], c1 = SPRAY[k % SPRAY.length], c2 = SPRAY[(k + 3) % SPRAY.length], tag = TAGS[k % TAGS.length];
        q.save(); q.translate(cw / 2, ch / 2 + 10); q.rotate(-0.08 + (k % 3) * 0.05); q.transform(1, 0, -0.25, 1, 0, 0); q.textAlign = 'center'; q.textBaseline = 'middle'; q.font = 'bold 150px Impact, "Arial Black", sans-serif'; q.lineJoin = 'round';
        q.lineWidth = 26; q.strokeStyle = '#111'; q.strokeText(tag, 0, 0); q.lineWidth = 12; q.strokeStyle = '#fff'; q.strokeText(tag, 0, 0);
        const g = q.createLinearGradient(0, -70, 0, 70); g.addColorStop(0, c2); g.addColorStop(1, c1); q.fillStyle = g; q.fillText(tag, 0, 0);
        q.fillStyle = 'rgba(255,255,255,0.55)'; q.fillRect(-150, -45, 300, 6); q.restore();
        let s = 3 + k * 7; const rr = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
        q.fillStyle = c1; for (let i = 0; i < 7; i++) { const x = 90 + rr() * 330, y = 150 + rr() * 20, l = 15 + rr() * 45; q.fillRect(x, y, 4, l); q.beginPath(); q.arc(x + 2, y + l, 3.5, 0, 7); q.fill(); } }); }
    else { const k = (r() * 4) | 0; w = 1.4 + r() * 1.6; h = w * (0.6 + r() * 0.5);   // mancha o parche del suelo
      m = lienzoCalc('mancha' + k, 128, 128, (q, cw, ch) => { let s = 5 + k * 13; const rr = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
        if (k === 3) { q.fillStyle = 'rgba(40,42,46,0.55)'; q.beginPath(); q.moveTo(10, 20); q.lineTo(118, 12); q.lineTo(112, 110); q.lineTo(16, 116); q.closePath(); q.fill(); return; }   // parche de asfalto nuevo
        for (let i = 0; i < 14; i++) { const cx = 64 + (rr() - 0.5) * 60, cy = 64 + (rr() - 0.5) * 60, rad = 10 + rr() * 26, g = q.createRadialGradient(cx, cy, 0, cx, cy, rad); g.addColorStop(0, k === 1 ? 'rgba(20,20,20,0.35)' : 'rgba(30,25,20,0.22)'); g.addColorStop(1, 'rgba(0,0,0,0)'); q.fillStyle = g; q.fillRect(0, 0, cw, ch); }
        if (k === 2) { q.strokeStyle = 'rgba(15,15,15,0.5)'; q.lineWidth = 1.5; q.beginPath(); q.moveTo(10, 64); for (let i = 0; i < 10; i++) q.lineTo(10 + i * 12, 64 + (rr() - 0.5) * 30); q.stroke(); } }); }
    if (!m) return null; const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    if (tipo === 'suelo') { p.rotation.x = -Math.PI / 2; p.rotation.z = r() * 6.28; p.position.set(x, y, z); } else { p.position.set(x, y, z); p.rotation.y = ry || 0; p.rotation.z = (r() - 0.5) * (tipo === 'cartel' ? 0.12 : 0.05); }
    p.receiveShadow = true; W.add(p); if (tipo !== 'suelo') { (kit.calcomanias = kit.calcomanias || []).push([x, y, z, ry || 0, tipo]); if (kit.calcomanias.length > 400) kit.calcomanias.shift(); } return p;
  };

  // ---------- Gato sentado (para tejados y muros): mueve la cola y gira la cabeza de vez en cuando ----------
  kit.gato = function (color) {
    const T = THREE, g = new T.Group(), m = new T.MeshStandardMaterial({ color: color || 0x3b3b3b, roughness: 0.95 }), ojo = new T.MeshStandardMaterial({ color: 0xc9e36b, emissive: 0x6a7a20, emissiveIntensity: 0.4 });
    const B = (geo, x, y, z, mt) => { const me = new T.Mesh(geo, mt || m); me.position.set(x, y, z); me.castShadow = true; g.add(me); return me; };
    B(new T.SphereGeometry(0.12, 10, 8).scale(1, 1.25, 1.1), 0, 0.15, 0); B(new T.SphereGeometry(0.1, 10, 8).scale(1.05, 0.7, 1.2), 0, 0.06, 0.06);
    const cab = new T.Group(); cab.position.set(0, 0.33, 0.04); g.add(cab); const c = new T.Mesh(new T.SphereGeometry(0.075, 10, 8), m); c.castShadow = true; cab.add(c);
    for (const s of [-1, 1]) { const o = new T.Mesh(new T.ConeGeometry(0.03, 0.07, 4), m); o.position.set(s * 0.045, 0.07, 0); cab.add(o); const e = new T.Mesh(new T.SphereGeometry(0.012, 6, 4), ojo); e.position.set(s * 0.028, 0.012, 0.066); cab.add(e); }
    const cola = new T.Group(); cola.position.set(0, 0.05, -0.1); g.add(cola); const cm = new T.Mesh(new T.CylinderGeometry(0.018, 0.012, 0.3, 6), m); cm.rotation.x = Math.PI / 2.4; cm.position.set(0, -0.02, -0.14); cola.add(cm);
    const fase = Math.random() * 10; c.onBeforeRender = () => { const t = kit.vientoU.value + fase; cola.rotation.y = Math.sin(t * 1.8) * 0.6; cab.rotation.y = Math.sin(t * 0.37) > 0.8 ? 0.7 : Math.sin(t * 0.29) < -0.85 ? -0.6 : 0; };
    g.userData = { gato: true }; return g;
  };
  kit.arbolRedondo = function (x, z, s, color) {
    const g = new THREE.Group(); s = s || 1;
    g.add(kit.cilindro(0.07 * s, 0.45 * s, 0x6b4a2b, 0, 0, 0, 5));
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42 * s, 1), kit.mat(color || 0x4f8f45)); c.position.y = 0.72 * s; c.scale.y = 0.85; g.add(c);
    g.position.set(x, 0, z); return g;
  };
  // ---------- Público de grada (instanciado) ----------
  // Personas sentadas de verdad (torso, brazos, cabeza con pelo y piernas dobladas) con una malla instanciada por pieza: miles
  // de espectadores en 5 llamadas de dibujo. sitios: [{ x, y, z, ry, ropa, piel, pelo }] (y: altura del asiento; ry: hacia dónde mira).
  // colocar(fn): fn(i) -> { salto (m), brazos (0 abajo, 1 arriba) }; llamarlo en cada fotograma solo si algo se mueve.
  kit.publico = function (sitios, escala, dePie) {
    const T = THREE, s = escala || 1, n = sitios.length, mat = () => new T.MeshLambertMaterial();
    const caja = (w, h, d, x, y, z) => new T.BoxGeometry(w, h, d).translate(x, y, z);
    const une = gs => { const g = T.mergeGeometries ? T.mergeGeometries(gs) : (T.BufferGeometryUtils && T.BufferGeometryUtils.mergeGeometries(gs)); return g || gs[0]; };
    // medidas en metros con el asiento en y = 0 y la persona mirando a +z
    const geo = {
      torso: une([caja(0.4, 0.5, 0.24, 0, 0.27, 0), caja(0.14, 0.08, 0.14, 0, 0.55, 0)]),
      brazos: une([caja(0.1, 0.44, 0.11, -0.25, -0.2, 0), caja(0.1, 0.44, 0.11, 0.25, -0.2, 0)]),      // pivote en los hombros
      cabeza: new T.IcosahedronGeometry(0.12, 1).translate(0, 0.7, 0),
      pelo: new T.SphereGeometry(0.128, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55).translate(0, 0.72, -0.012),
      piernas: dePie ? une([caja(0.14, 0.86, 0.16, -0.1, -0.43, 0), caja(0.14, 0.86, 0.16, 0.1, -0.43, 0)]) : une([caja(0.34, 0.14, 0.42, 0, 0.02, 0.2), caja(0.3, 0.45, 0.12, 0, -0.2, 0.4)])
    };
    const g = new T.Group(), M = {}, c = new T.Color(), m4 = new T.Matrix4(), q = new T.Quaternion(), qx = new T.Quaternion(), e = new T.Euler(), p = new T.Vector3(), sc = new T.Vector3(s, s, s), hombro = new T.Vector3();
    Object.keys(geo).forEach(k => { M[k] = new T.InstancedMesh(geo[k], mat(), n); M[k].instanceMatrix.setUsage(T.DynamicDrawUsage); M[k].castShadow = false; M[k].frustumCulled = false; g.add(M[k]); });
    sitios.forEach((st, i) => { M.torso.setColorAt(i, c.set(st.ropa)); M.brazos.setColorAt(i, c.set(st.ropa)); M.cabeza.setColorAt(i, c.set(st.piel)); M.pelo.setColorAt(i, c.set(st.pelo || '#2a1f18')); M.piernas.setColorAt(i, c.set(st.pantalon || '#2f3640')); });
    Object.values(M).forEach(m => { if (m.instanceColor) m.instanceColor.needsUpdate = true; });
    function colocar(fn) {
      sitios.forEach((st, i) => {
        const r = fn ? fn(i) : null, dy = r ? r.salto || 0 : 0, br = r ? r.brazos || 0 : 0;
        q.setFromEuler(e.set(0, st.ry || 0, 0)); p.set(st.x, st.y + dy * s, st.z); m4.compose(p, q, sc);
        M.torso.setMatrixAt(i, m4); M.cabeza.setMatrixAt(i, m4); M.pelo.setMatrixAt(i, m4); M.piernas.setMatrixAt(i, m4);
        hombro.set(0, 0.5 * s, 0).applyQuaternion(q).add(p); qx.setFromEuler(e.set(-br * 2.7, 0, 0)); m4.compose(hombro, q.clone().multiply(qx), sc); M.brazos.setMatrixAt(i, m4);
      });
      Object.values(M).forEach(m => { m.instanceMatrix.needsUpdate = true; });
    }
    colocar(null);
    g.userData = { publico: true };
    return { grupo: g, colocar, mallas: M };
  };
  // Fusiona la geometría estática: reduce cientos de mallas a una por material (menos llamadas de dibujo).
  // Convención: un nodo con userData (anim, lugar, slot, tipo...) es un «ancla»: no se fusiona con nada externo
  // y su contenido se fusiona dentro de él, así siguen funcionando las animaciones y la selección por toque
  // (que sube por los padres buscando userData). Llamar después de construir el mundo y antes del primer render.
  kit.fusionar = function (root) {
    const T = THREE; let antes = 0, despues = 0;
    // (userData.name no cuenta: el cargador de glTF guarda ahí el nombre original de cada pieza)
    const ancla = o => o === root || (o.userData && Object.keys(o.userData).some(k => k !== 'name'));
    const apta = c => c.isMesh && !c.isInstancedMesh && !c.isSkinnedMesh && !Array.isArray(c.material) && c.visible && !c.children.length &&
      c.geometry && c.geometry.isBufferGeometry && c.geometry.attributes.position && !(c.geometry.morphAttributes && c.geometry.morphAttributes.position);
    function unir(lista) {
      const geos = lista.map(it => { let g = it.mesh.geometry.index ? it.mesh.geometry.toNonIndexed() : it.mesh.geometry.clone(); g.applyMatrix4(it.m); return g; });
      const out = new T.BufferGeometry();
      Object.keys(geos[0].attributes).forEach(n => {
        const a0 = geos[0].attributes[n], tot = geos.reduce((s, g) => s + g.attributes[n].array.length, 0), arr = new a0.array.constructor(tot);
        let off = 0; geos.forEach(g => { arr.set(g.attributes[n].array, off); off += g.attributes[n].array.length; g.dispose(); });
        out.setAttribute(n, new T.BufferAttribute(arr, a0.itemSize, a0.normalized));
      });
      out.computeBoundingSphere(); return out;
    }
    function procesar(nodo) {
      nodo.updateMatrixWorld(true);
      const inv = new T.Matrix4().copy(nodo.matrixWorld).invert(), cubos = new Map();
      (function rec(o) {
        o.children.slice().forEach(c => {
          if (!c.visible) return;
          if (ancla(c)) { procesar(c); return; }
          if (apta(c)) {
            const m = new T.Matrix4().multiplyMatrices(inv, c.matrixWorld); if (m.determinant() <= 0) return;
            const k = c.material.uuid + '|' + Object.keys(c.geometry.attributes).sort().join(',') + '|' + c.renderOrder;
            if (!cubos.has(k)) cubos.set(k, []); cubos.get(k).push({ mesh: c, m });
          } else if (c.children.length) rec(c);
        });
      })(nodo);
      cubos.forEach(lista => {
        antes += lista.length;
        if (lista.length < 2) { despues += 1; return; }
        const m0 = lista[0].mesh, mesh = new T.Mesh(unir(lista), m0.material);
        mesh.castShadow = lista.some(it => it.mesh.castShadow); mesh.receiveShadow = lista.some(it => it.mesh.receiveShadow); mesh.renderOrder = m0.renderOrder;
        lista.forEach(it => it.mesh.parent.remove(it.mesh));
        nodo.add(mesh); despues += 1;
      });
    }
    procesar(root);
    return { antes, despues };
  };
  kit.sombrear = function (obj) { obj.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } }); };
  kit.color = function (hex) { return parseInt(String(hex).replace('#', ''), 16); };

  kit.crear = function (el, o) {
    o = o || {};
    const T = THREE;
    const w = el.clientWidth || 360, hgt = el.clientHeight || 300;
    const renderer = new T.WebGLRenderer({ antialias: true });
    const altaQ = !GM.campus || GM.campus.config.calidad === 'alta'; // en «normal», menos píxeles: va más fluido en móvil
    renderer.setPixelRatio(Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, altaQ ? 2 : 1.5));
    renderer.setSize(w, hgt);
    renderer.setClearColor(o.fondo !== undefined ? o.fondo : 0xa9d6f2);
    if (o.sombras && renderer.shadowMap) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFShadowMap; renderer.shadowMap.radius = 3; }
    const cv = renderer.domElement;
    cv.style.display = 'block'; cv.style.width = '100%'; cv.style.height = '100%'; cv.style.touchAction = 'none';
    el.appendChild(cv);
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(45, w / hgt, 0.1, 300);
    const amb = new T.AmbientLight(0xffffff, 0.78); scene.add(amb);
    const sun = new T.DirectionalLight(0xffffff, 0.65); sun.position.set(8, 14, 6); scene.add(sun);
    // Los módulos fijan las intensidades en la escala clásica de r128; con la iluminación física de r155+ equivalen a ×π
    [amb, sun].forEach(l => { let i = l.intensity; Object.defineProperty(l, 'intensity', { get: () => i * Math.PI, set: x => { i = x; }, configurable: true }); });
    if (o.sombras) { sun.castShadow = true; sun.shadow.mapSize.set(1536, 1536); const sc = sun.shadow.camera; sc.left = -52; sc.right = 52; sc.top = 52; sc.bottom = -52; sc.near = 1; sc.far = 140; sun.shadow.bias = -0.0008; }
    const v = { scene, camera, renderer, el, sun, amb, anim: null, theta: o.theta !== undefined ? o.theta : 0.8, phi: o.phi || 1.0, radio: o.radio || 16, target: new T.Vector3(0, 0, 0), need: true, dead: false, onTap: null };
    const rmin = o.min || 5, rmax = o.max || 40;
    const sin = Math.sin, cos = Math.cos;
    function place() {
      v.phi = Math.max(0.25, Math.min(1.45, v.phi)); v.radio = Math.max(rmin, Math.min(rmax, v.radio));
      camera.position.set(v.target.x + v.radio * sin(v.phi) * sin(v.theta), v.target.y + v.radio * cos(v.phi), v.target.z + v.radio * sin(v.phi) * cos(v.theta));
      camera.lookAt(v.target); v.need = true;
    }
    v.place = place; place();
    const ptrs = new Map(); let pinch = 0;
    const raycaster = new T.Raycaster();
    v.pick = function (cx, cy, objs) {
      const r = cv.getBoundingClientRect();
      raycaster.setFromCamera(new T.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), camera);
      return raycaster.intersectObjects(objs || scene.children, true);
    };
    function dist() { const a = Array.from(ptrs.values()); return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); }
    const down = e => { cv.setPointerCapture && cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: Date.now() }); if (ptrs.size === 2) pinch = dist(); };
    const move = e => {
      const p = ptrs.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (ptrs.size === 1) { v.theta -= dx * 0.008; v.phi -= dy * 0.006; place(); }
      else if (ptrs.size === 2) { const d = dist(); if (pinch) { v.radio *= pinch / d; place(); } pinch = d; }
    };
    const up = e => {
      const p = ptrs.get(e.pointerId); ptrs.delete(e.pointerId); pinch = 0;
      if (p && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 8 && Date.now() - p.t < 450 && v.onTap) v.onTap(e.clientX, e.clientY);
    };
    const wheel = e => { e.preventDefault(); v.radio *= 1 + e.deltaY * 0.001; place(); };
    cv.addEventListener('pointerdown', down); cv.addEventListener('pointermove', move); cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up); cv.addEventListener('wheel', wheel, { passive: false });
    function resize() {
      const W = el.clientWidth, H = el.clientHeight; if (!W || !H) return;
      renderer.setSize(W, H); camera.aspect = W / H; camera.updateProjectionMatrix(); v.need = true;
    }
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(resize); ro.observe(el); }
    let raf = 0, last = 0;
    (function loop(ts) {
      if (v.dead) return;
      raf = requestAnimationFrame(loop);
      const t = ts || Date.now();
      if (v.anim && t - last >= 33) { last = t; try { v.anim(t / 1000); } catch (e) { v.anim = null; } v.need = true; }
      if (v.need) { v.need = false; renderer.render(scene, camera); }
    })();
    v.dibujar = function () { v.need = true; };
    v.limpiar = function (grupo) {
      while (grupo.children.length) {
        const c = grupo.children[0]; grupo.remove(c);
        c.traverse && c.traverse(n => { if (n.geometry) n.geometry.dispose(); });
      }
    };
    v.dispose = function () {
      v.dead = true; cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      cv.removeEventListener('pointerdown', down); cv.removeEventListener('pointermove', move); cv.removeEventListener('pointerup', up);
      cv.removeEventListener('pointercancel', up); cv.removeEventListener('wheel', wheel);
      scene.traverse(n => { if (n.geometry) n.geometry.dispose(); });
      renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss();
      if (cv.parentNode) cv.parentNode.removeChild(cv);
    };
    return v;
  };
  GM.kit = kit;
  GM.h = kit.h;
})();
