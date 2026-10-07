/* PORTADA 3D (GM.portada3d) — fondo animado del menú principal
   Pabellón en penumbra con la pista iluminada por focos, dos jugadores (personas de Quaternius), un balón que bota,
   polvo en el aire y una cámara que gira despacio. Si no hay WebGL no hace nada (el menú se ve igual con su degradado).
   Expone: montar(el, colores) -> devuelve una función para desmontar. No toca el estado. */
(function () {
  let activo = null;
  function montar(el, colores) {
    desmontar();
    if (!GM.kit || !GM.kit.disponible() || typeof window === 'undefined') return () => {};
    const c1 = new THREE.Color(colores && colores[0] || '#e8590c');
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1; renderer.shadowMap.enabled = true;
    const cv = renderer.domElement; cv.className = 'portada-3d'; el.prepend(cv);
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x07090d); scene.fog = new THREE.Fog(0x07090d, 14, 34);
    const cam = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
    scene.add(new THREE.HemisphereLight(0x8aa0b8, 0x101010, 0.35));
    // Focos cenitales sobre la pista
    [[-4, 0], [4, 0], [0, -3]].forEach(([x, z], i) => { const f = new THREE.SpotLight(i === 2 ? 0xffe2b8 : 0xffffff, 120, 30, 0.45, 0.55, 1.6); f.position.set(x, 11, z + 2); f.target.position.set(x * 0.4, 0, z); f.castShadow = i < 2; f.shadow.mapSize.set(1024, 1024); scene.add(f, f.target); });
    // Suelo de parqué con líneas
    const c = document.createElement('canvas'); c.width = c.height = 1024; const x = c.getContext('2d');
    if (x) {
      for (let f = 0; f < 32; f++) for (let k = -1; k < 8; k++) { const t = 0.8 + ((f * 7 + k * 13) % 10) / 30; x.fillStyle = 'rgb(' + (190 * t | 0) + ',' + (132 * t | 0) + ',' + (80 * t | 0) + ')'; x.fillRect(k * 128 + (f % 2) * 64, f * 32, 127, 31); }
      x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = 7; x.beginPath(); x.arc(512, 512, 120, 0, 6.3); x.stroke(); x.beginPath(); x.moveTo(512, 0); x.lineTo(512, 1024); x.stroke();
      x.strokeRect(-10, 330, 260, 364); x.beginPath(); x.arc(0, 512, 430, -1.2, 1.2); x.stroke();
      x.fillStyle = '#' + c1.getHexString(); x.globalAlpha = 0.85; x.beginPath(); x.arc(512, 512, 116, 0, 6.3); x.fill(); x.globalAlpha = 1;
    }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const suelo = new THREE.Mesh(new THREE.PlaneGeometry(24, 24).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.38, metalness: 0.05 })); suelo.receiveShadow = true; scene.add(suelo);
    // Canasta
    const metal = new THREE.MeshStandardMaterial({ color: 0x2b3036, metalness: 0.6, roughness: 0.4 }), g = new THREE.Group();
    const poste = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3.6, 0.25), metal); poste.position.set(-0.6, 1.8, 0); g.add(poste);
    const brazo = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.15, 0.15), metal); brazo.position.set(-0.15, 3.4, 0); g.add(brazo);
    const tablero = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.05, 1.8), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.6, roughness: 0.1, transparent: true, opacity: 0.55 })); tablero.position.set(0.35, 3.3, 0); g.add(tablero);
    const aro = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.02, 8, 24), new THREE.MeshStandardMaterial({ color: 0xe8590c, metalness: 0.4 })); aro.rotation.x = Math.PI / 2; aro.position.set(0.62, 3.05, 0); g.add(aro);
    g.position.set(-7.2, 0, 0); g.traverse(n => { if (n.isMesh) n.castShadow = true; }); scene.add(g);
    // Balón que bota
    const bt = document.createElement('canvas'); bt.width = 256; bt.height = 128; const bx = bt.getContext('2d');
    if (bx) { bx.fillStyle = '#d9692b'; bx.fillRect(0, 0, 256, 128); bx.strokeStyle = '#2a1a10'; bx.lineWidth = 4; [[0, 64, 256, 64], [64, 0, 64, 128], [192, 0, 192, 128]].forEach(([a, b, c2, d]) => { bx.beginPath(); bx.moveTo(a, b); bx.lineTo(c2, d); bx.stroke(); }); bx.beginPath(); bx.arc(128, 64, 52, 0, 6.3); bx.stroke(); }
    const bTex = new THREE.CanvasTexture(bt); bTex.colorSpace = THREE.SRGBColorSpace;
    const balon = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 16), new THREE.MeshStandardMaterial({ map: bTex, roughness: 0.7 })); balon.castShadow = true; scene.add(balon);
    // Polvo en el aire, visible en los haces de luz
    const n = 400, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 16; pos[i * 3 + 1] = Math.random() * 8; pos[i * 3 + 2] = (Math.random() - 0.5) * 10; }
    const polvoG = new THREE.BufferGeometry(); polvoG.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const polvo = new THREE.Points(polvoG, new THREE.PointsMaterial({ color: 0xffeccc, size: 0.035, transparent: true, opacity: 0.55, depthWrite: false })); scene.add(polvo);
    // Dos jugadores con la camiseta en los colores del club
    const mixers = [];
    const L = new THREE.GLTFLoader();
    Promise.all([L.loadAsync('modelos/personas/h-casual_hoodie.glb'), L.loadAsync('modelos/personas/h-beach.glb'), L.loadAsync('modelos/personas/animaciones.glb')]).then(([a, b, an]) => {
      if (!activo || activo.renderer !== renderer) return;
      [[a, -3.6, 0.6, 'Interact', 1.55], [b, -1.4, -1.6, 'Idle', -2.2]].forEach(([m, px, pz, clip, ry]) => {
        const o = THREE.clonarEsqueleto(m.scene); const h = new THREE.Box3().setFromObject(m.scene).getSize(new THREE.Vector3()).y; o.scale.setScalar(2.0 / h);
        o.traverse(q => { if (q.isMesh) { q.castShadow = true; if (/^(Purple|Red_Dark|LightBrown)$/.test(q.material.name)) { q.material = q.material.clone(); q.material.color.copy(c1); } } });
        o.position.set(px, 0, pz); o.rotation.y = ry; scene.add(o);
        const mx = new THREE.AnimationMixer(o), cl = an.animations.find(x => x.name === clip); if (cl) mx.clipAction(cl).play(); mixers.push(mx);
      });
    }).catch(() => {});
    const tam = () => { const w = el.clientWidth || window.innerWidth, h = el.clientHeight || window.innerHeight; renderer.setSize(w, h, false); cv.style.width = '100%'; cv.style.height = '100%'; cam.aspect = w / h; cam.updateProjectionMatrix(); };
    tam(); window.addEventListener('resize', tam);
    const reloj = new THREE.Timer(); let raf = 0;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    (function bucle() {
      raf = requestAnimationFrame(bucle); reloj.update(); const dt = Math.min(0.05, reloj.getDelta()), t = reloj.getElapsed() * (reduce ? 0.15 : 1);
      const a = 0.6 + t * 0.06; cam.position.set(Math.cos(a) * 9.5 - 2, 2.6 + Math.sin(t * 0.2) * 0.3, Math.sin(a) * 9.5); cam.lookAt(-3, 1.4, 0);
      const fase = (t * 1.6) % 1, alto = 4 * fase * (1 - fase); balon.position.set(-3.1, 0.12 + alto * 1.1, 1.1); balon.rotation.z -= dt * 3;
      polvo.rotation.y += dt * 0.01; mixers.forEach(m => m.update(dt));
      renderer.render(scene, cam);
    })();
    activo = { renderer, fin: () => { cancelAnimationFrame(raf); window.removeEventListener('resize', tam); scene.traverse(o => { if (o.geometry) o.geometry.dispose(); }); renderer.dispose(); cv.remove(); } };
    return desmontar;
  }
  function desmontar() { if (activo) { activo.fin(); activo = null; } }
  GM.portada3d = { montar, desmontar };
})();
