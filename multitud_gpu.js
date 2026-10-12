/* MULTITUD EN LA GPU (GM.multGPU) — cientos de peatones lejanos dibujados con una sola llamada y sin coste de CPU por fotograma.
   Cada peatón es una figura de unos 100 triángulos (piernas, torso, brazos, cabeza) en una malla instanciada; su camino, su velocidad, su fase, sus colores y su altura
   son atributos por instancia y el vertex shader calcula dónde está en cada momento (avanza por un tramo de acera a su velocidad, balancea las piernas y el cuerpo).
   Quien está a menos de 14 m del personaje se oculta (ahí caminan las personas de verdad, con esqueleto y animación). Se pinta con la luz y la niebla del mundo.
   Uso: GM.multGPU.crear(S, vias, n) -> { malla, actualizar(t, foco), quitar() }; vias: [{ v: { p: [[x, z], ...], k }, L }] como las de calle_real_vida.js. */
(function () {
  const ROPA = ['#c0392b', '#2f6f9e', '#2e7d32', '#e8b923', '#f4efe3', '#1d2024', '#7a3b69', '#e67e22', '#8a8f94', '#3a5a3a', '#d9534f', '#4a6fa5'], PANT = ['#1d2430', '#2b2f36', '#3b4a6b', '#5a4a3a', '#7a7468', '#222222'], PIEL = ['#f1c9a5', '#e0ac82', '#c68642', '#8d5524', '#5c3a21'];
  function figura() {
    // partes: 0 piernas, 1 torso, 2 brazos, 3 cabeza; lado: -1/1 para piernas y brazos, 0 para el resto; cada pieza lleva su altura de cadera para el balanceo
    const P = [], I = [], parte = [], lado = [], N = [];
    const caja = (w, h, d, x, y, z, pa, la) => { const g = new THREE.BoxGeometry(w, h, d).translate(x, y, z), p = g.attributes.position, n = g.attributes.normal, ix = g.index.array, o = P.length / 3; for (let i = 0; i < p.count; i++) { P.push(p.getX(i), p.getY(i), p.getZ(i)); N.push(n.getX(i), n.getY(i), n.getZ(i)); parte.push(pa); lado.push(la); } for (let i = 0; i < ix.length; i++) I.push(ix[i] + o); };
    caja(0.14, 0.85, 0.16, -0.1, 0.425, 0, 0, -1); caja(0.14, 0.85, 0.16, 0.1, 0.425, 0, 0, 1);
    caja(0.42, 0.55, 0.22, 0, 1.12, 0, 1, 0);
    caja(0.09, 0.5, 0.11, -0.26, 1.15, 0, 2, -1); caja(0.09, 0.5, 0.11, 0.26, 1.15, 0, 2, 1);
    { const g = new THREE.SphereGeometry(0.115, 8, 6).translate(0, 1.55, 0), p = g.attributes.position, n = g.attributes.normal, ix = g.index.array, o = P.length / 3; for (let i = 0; i < p.count; i++) { P.push(p.getX(i), p.getY(i), p.getZ(i)); N.push(n.getX(i), n.getY(i), n.getZ(i)); parte.push(3); lado.push(0); } for (let i = 0; i < ix.length; i++) I.push(ix[i] + o); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('aParte', new THREE.Float32BufferAttribute(parte, 1)); g.setAttribute('aLado', new THREE.Float32BufferAttribute(lado, 1)); g.setIndex(I); return g;
  }
  function crear(S, vias, n) {
    if (!n || !vias || !vias.length || typeof THREE === 'undefined' || !S.mundo) return null;
    const ANCHO = (GM.mods.calleReal && GM.mods.calleReal._int && GM.mods.calleReal._int.ANCHO) || [16, 12, 10, 8.5, 7, 5.5, 4], U = GM.util, r = (() => { let a = U.hash('multitud-gpu' + S.st.clubId + S.st.fecha) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
    // tramos de calle con su longitud (solo calles con acera: de las principales a las peatonales)
    const tr = []; let total = 0; vias.forEach(vi => { const p = vi.v.p; if (vi.v.k > 5) return; for (let i = 0; i + 1 < p.length; i++) { const l = Math.hypot(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]); if (l < 8 || Math.hypot(p[i][0], p[i][1]) > 330) continue; tr.push({ a: p[i], b: p[i + 1], l, k: vi.v.k }); total += l; } });
    if (!tr.length) return null;
    const g0 = figura(), geo = new THREE.InstancedBufferGeometry(); geo.index = g0.index; ['position', 'normal', 'aParte', 'aLado'].forEach(k => geo.setAttribute(k, g0.getAttribute(k))); geo.instanceCount = n;
    const aRuta = new Float32Array(n * 4), aInfo = new Float32Array(n * 4), aRopa = new Float32Array(n * 3), aPant = new Float32Array(n * 3), aPiel = new Float32Array(n * 3), c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      let u = r() * total, t = tr[0]; for (const q of tr) { if (u < q.l) { t = q; break; } u -= q.l; }
      const dir = r() < 0.5 ? 1 : -1, a = dir > 0 ? t.a : t.b, b = dir > 0 ? t.b : t.a, ux = (b[0] - a[0]) / t.l, uz = (b[1] - a[1]) / t.l, lat = (ANCHO[t.k] || 6) / 2 + 0.9 + r() * 1.1, lado = r() < 0.5 ? 1 : -1;
      aRuta.set([a[0], a[1], ux, uz], i * 4); aInfo.set([t.l, 0.9 + r() * 0.9, r() * 100, lat * lado], i * 4);
      c.set(ROPA[(r() * ROPA.length) | 0]); aRopa.set([c.r, c.g, c.b], i * 3); c.set(PANT[(r() * PANT.length) | 0]); aPant.set([c.r, c.g, c.b], i * 3); c.set(PIEL[(r() * PIEL.length) | 0]); aPiel.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('iRuta', new THREE.InstancedBufferAttribute(aRuta, 4)); geo.setAttribute('iInfo', new THREE.InstancedBufferAttribute(aInfo, 4)); geo.setAttribute('iRopa', new THREE.InstancedBufferAttribute(aRopa, 3)); geo.setAttribute('iPant', new THREE.InstancedBufferAttribute(aPant, 3)); geo.setAttribute('iPiel', new THREE.InstancedBufferAttribute(aPiel, 3));
    const U_T = { value: 0 }, U_F = { value: new THREE.Vector3(1e5, 0, 1e5) }, mat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 });
    mat.onBeforeCompile = sh => {
      sh.uniforms.uT = U_T; sh.uniforms.uFoco = U_F;
      sh.vertexShader = 'uniform float uT; uniform vec3 uFoco; attribute float aParte; attribute float aLado; attribute vec4 iRuta; attribute vec4 iInfo; attribute vec3 iRopa; attribute vec3 iPant; attribute vec3 iPiel; varying vec3 vCol;\n' + sh.vertexShader
        .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n float _s = mod(uT * iInfo.y + iInfo.z, iInfo.x); float _paso = uT * iInfo.y * 3.2 + iInfo.z; float _sw = sin(_paso);')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
 vec3 _l = position; float _alt = 0.92 + 0.16 * fract(iInfo.z * 0.137);
 if (aParte < 0.5) { _l.z += aLado * _sw * 0.22 * (1.0 - _l.y / 0.85); } else if (aParte < 1.5) { _l.x += 0.0; } else if (aParte < 2.5) { _l.z -= aLado * _sw * 0.18 * (_l.y - 0.9) * 1.2; }
 _l.y *= _alt; _l.y += abs(sin(_paso)) * 0.035;
 vec2 _ruta = iRuta.xy + iRuta.zw * _s + vec2(-iRuta.w, iRuta.z) * iInfo.w;
 transformed = vec3(_ruta.x + _l.z * iRuta.z + _l.x * iRuta.w, _l.y, _ruta.y + _l.z * iRuta.w - _l.x * iRuta.z);
 vCol = aParte < 0.5 ? iPant : (aParte < 1.5 ? iRopa : (aParte < 2.5 ? iRopa * 0.9 : iPiel));
 if (distance(_ruta, uFoco.xz) < 14.0) transformed = vec3(0.0, -50.0, 0.0);`)
        .replace('#include <defaultnormal_vertex>', 'vec3 transformedNormal = normalMatrix * normalize(vec3(objectNormal.z * iRuta.z + objectNormal.x * iRuta.w, objectNormal.y, objectNormal.z * iRuta.w - objectNormal.x * iRuta.z));');
      sh.fragmentShader = 'varying vec3 vCol;\n' + sh.fragmentShader.replace('#include <color_fragment>', 'diffuseColor.rgb *= vCol;');
    };
    mat.customProgramCacheKey = () => 'multitud-gpu';
    const malla = new THREE.Mesh(geo, mat); malla.frustumCulled = false; malla.userData = { multitudGPU: true, anim: true }; S.mundo.add(malla);
    return { malla, n, actualizar(t, foco) { U_T.value = t; U_F.value.set(foco.x, 0, foco.z); }, quitar() { S.mundo.remove(malla); geo.dispose(); mat.dispose(); } };
  }
  GM.multGPU = { crear };
})();
