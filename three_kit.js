/* KIT 3D (GM.kit)
   Utilidades comunes de los módulos 8 y 9: helper DOM h(), vista Three.js r128 con cámara orbital propia
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
  kit.sombrear = function (obj) { obj.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } }); };
  kit.color = function (hex) { return parseInt(String(hex).replace('#', ''), 16); };

  kit.crear = function (el, o) {
    o = o || {};
    const T = THREE;
    const w = el.clientWidth || 360, hgt = el.clientHeight || 300;
    const renderer = new T.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2));
    renderer.setSize(w, hgt);
    renderer.setClearColor(o.fondo !== undefined ? o.fondo : 0xa9d6f2);
    if (o.sombras && renderer.shadowMap) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap; }
    const cv = renderer.domElement;
    cv.style.display = 'block'; cv.style.width = '100%'; cv.style.height = '100%'; cv.style.touchAction = 'none';
    el.appendChild(cv);
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(45, w / hgt, 0.1, 300);
    const amb = new T.AmbientLight(0xffffff, 0.78); scene.add(amb);
    const sun = new T.DirectionalLight(0xffffff, 0.65); sun.position.set(8, 14, 6); scene.add(sun);
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
