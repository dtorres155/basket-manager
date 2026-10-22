// Vista de prueba: personajes de Mixamo (glb ya convertidos) con sus animaciones junto a una persona actual de Quaternius. Uso: node tools/mixamo_vista.js [carpeta]
const { chromium } = require('playwright');
const http = require('http'),
  fs = require('fs'),
  path = require('path');
const carpeta = process.argv[2] || 'C:/Users/Dabvid-/mixamo';
const raiz = path.resolve(__dirname, '..');
const srv = http
  .createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0]);
    if (u === '/') {
      r.setHeader('content-type', 'text/html');
      return r.end(
        '<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script><body style="margin:0">'
      );
    }
    const f = u.startsWith('/mix/') ? path.join(carpeta, process.env.SUB || 'glb', u.slice(5)) : path.join(raiz, u);
    fs.readFile(f, (e, d) => {
      if (e) {
        r.statusCode = 404;
        return r.end();
      }
      r.setHeader('content-type', f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream');
      r.end(d);
    });
  })
  .listen(8099);
(async () => {
  const b = await chromium.launch({ channel: 'msedge', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }),
    p = await (await b.newContext({ viewport: { width: 1400, height: 800 } })).newPage();
  p.on('pageerror', e => console.log('ERR', e.message.slice(0, 300)));
  p.on('console', m => {
    if (m.type() === 'error' || /warn/i.test(m.type())) console.log(m.type(), m.text().slice(0, 160));
  });
  await p.goto('http://localhost:8099/');
  const info = await p.evaluate(async () => {
    const THREE = await import('three');
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const { clone } = await import('three/addons/utils/SkeletonUtils.js');
    const ren = new THREE.WebGLRenderer({ antialias: true });
    ren.setSize(1400, 800);
    document.body.append(ren.domElement);
    ren.shadowMap.enabled = true;
    const sc = new THREE.Scene();
    sc.background = new THREE.Color(0xbfd3e6);
    sc.add(new THREE.HemisphereLight(0xffffff, 0x667788, 1.6));
    const sol = new THREE.DirectionalLight(0xffffff, 2.2);
    sol.position.set(3, 6, 4);
    sol.castShadow = true;
    sc.add(sol);
    const suelo = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x8a8f86 }));
    suelo.rotation.x = -Math.PI / 2;
    suelo.receiveShadow = true;
    sc.add(suelo);
    const L = new GLTFLoader(),
      carga = u => new Promise((ok, ko) => L.load(u, ok, null, ko));
    const mix = [],
      info = [];
    const anim = async n => (await carga('/mix/animaciones/' + n + '.glb')).animations[0];
    const poner = async (modelo, x, clip, escala) => {
      const g = await carga(modelo);
      const o = g.scene;
      o.position.set(x, 0, 0);
      if (escala) o.scale.multiplyScalar(escala);
      o.traverse(m => {
        if (m.isMesh) {
          m.castShadow = true;
          m.frustumCulled = false;
        }
      });
      sc.add(o);
      const m = new THREE.AnimationMixer(o);
      if (clip) m.clipAction(clip).play();
      mix.push(m);
      const bb = new THREE.Box3().setFromObject(o);
      info.push({ modelo, alto: +(bb.max.y - bb.min.y).toFixed(2), clips: g.animations.length });
      return o;
    };
    await poner('/mix/personajes/hombre1.glb', -3, await anim('idle'));
    await poner('/mix/personajes/hombre2.glb', -1.5, await anim('walking'));
    await poner('/mix/personajes/mujer1.glb', 0, await anim('talking'));
    await poner('/mix/personajes/hombre1.glb', 1.5, await anim('sitting_idle'));
    await poner('/mix/personajes/hombre2.glb', 3, await anim('dribble'));
    await poner('/vendor/modelos/personas/h-casual_2.glb', 4.5, null);
    const cam = new THREE.PerspectiveCamera(35, 1400 / 800, 0.1, 100);
    cam.position.set(0.8, 1.5, 9.5);
    cam.lookAt(0.8, 0.95, 0);
    window.__paso = t => {
      mix.forEach(m => m.update(t));
      ren.render(sc, cam);
    };
    window.__paso(0.01);
    return info;
  });
  console.log(JSON.stringify(info));
  for (let i = 0; i < 3; i++) {
    await p.evaluate(() => window.__paso(0.5));
    await p.screenshot({ path: 'capturas/mixamo/vista_' + i + '.png' });
  }
  await b.close();
  srv.close();
})();
