// Hoja de contacto de las personas de Mixamo optimizadas (id bajo cada una) para etiquetarlas. Uso: node tools/mixamo_hoja.js [carpeta]
const { chromium } = require('playwright');
const http = require('http'),
  fs = require('fs'),
  path = require('path');
const carpeta = process.argv[2] || 'C:/Users/Dabvid-/mixamo',
  raiz = path.resolve(__dirname, '..');
const srv = http
  .createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0]);
    if (u === '/') {
      r.setHeader('content-type', 'text/html');
      return r.end(
        '<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script><body style="margin:0">'
      );
    }
    if (u === '/lista')
      return r.end(
        JSON.stringify(
          fs
            .readdirSync(path.join(carpeta, 'opt/personajes'))
            .filter(f => f.endsWith('.glb'))
            .map(f => f.replace('.glb', ''))
        )
      );
    const f = u.startsWith('/mix/') ? path.join(carpeta, 'opt', u.slice(5)) : path.join(raiz, u);
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
    p = await (await b.newContext({ viewport: { width: 1500, height: 760 } })).newPage();
  p.on('pageerror', e => console.log('ERR', e.message.slice(0, 300)));
  await p.goto('http://localhost:8099/');
  await p.evaluate(async () => {
    const THREE = await import('three');
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const ids = await (await fetch('/lista')).json();
    const ren = new THREE.WebGLRenderer({ antialias: true });
    ren.setSize(1500, 760);
    document.body.append(ren.domElement);
    const sc = new THREE.Scene();
    sc.background = new THREE.Color(0xdfe6ee);
    sc.add(new THREE.HemisphereLight(0xffffff, 0x778899, 2));
    const sol = new THREE.DirectionalLight(0xffffff, 2);
    sol.position.set(2, 4, 5);
    sc.add(sol);
    const L = new GLTFLoader(),
      carga = u => new Promise((ok, ko) => L.load(u, ok, null, ko));
    const idle = (await carga('/mix/animaciones/idle.glb')).animations[0];
    const mix = [],
      n = ids.length,
      cols = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      const g = await carga('/mix/personajes/' + ids[i] + '.glb'),
        o = g.scene;
      o.position.set((i % cols) * 1.5 - (cols - 1) * 0.75, (i < cols ? 1 : 0) * 0 + 0, i < cols ? -2.2 : 0);
      o.position.y = i < cols ? 1.5 : -1.9;
      o.position.z = 0;
      o.traverse(m => {
        if (m.isMesh) m.frustumCulled = false;
      });
      sc.add(o);
      const m = new THREE.AnimationMixer(o);
      m.clipAction(idle).play();
      m.update(0.3);
      // etiqueta
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 64;
      const x = c.getContext('2d');
      x.fillStyle = '#111';
      x.font = 'bold 40px sans-serif';
      x.textAlign = 'center';
      x.fillText(ids[i], 128, 46);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c) }));
      sp.scale.set(0.8, 0.2, 1);
      sp.position.set(o.position.x, o.position.y - 0.12, 0.3);
      sc.add(sp);
    }
    const cam = new THREE.OrthographicCamera(-(cols * 0.75), cols * 0.75, 3.5, -3.34, 0.1, 50);
    cam.position.set(0, 0, 10);
    ren.render(sc, cam);
  });
  await p.screenshot({ path: 'capturas/mixamo/hoja.png' });
  await b.close();
  srv.close();
})();
