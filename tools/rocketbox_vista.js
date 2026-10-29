// Vista de los personajes de Rocketbox convertidos (tools/rocketbox_convertir.js) con las animaciones pasadas desde Mixamo: cada uno en
// reposo, andando, corriendo y sentado (con más de dos, solo en reposo y andando), de seis en seis. Uso: node tools/rocketbox_vista.js [carpeta glb] [desde]
// -> capturas/rocketbox/vista_<desde>.png
const { chromium } = require('playwright');
const http = require('http'),
  fs = require('fs'),
  path = require('path');
const raiz = path.resolve(__dirname, '..'),
  G = process.argv[2] || path.join(raiz, 'recursos/rocketbox/glb');
const srv = http
  .createServer((q, r) => {
    const u = decodeURIComponent(q.url.split('?')[0]);
    if (u === '/') {
      r.setHeader('content-type', 'text/html');
      return r.end(
        '<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script><body style="margin:0">'
      );
    }
    if (u === '/lista') return r.end(JSON.stringify(fs.readdirSync(path.join(G, 'personajes')).filter(f => f.endsWith('.glb'))));
    const f = u.startsWith('/g/') ? path.join(G, u.slice(3)) : path.join(raiz, u);
    fs.readFile(f, (e, d) => {
      if (e) {
        r.statusCode = 404;
        return r.end();
      }
      r.setHeader('content-type', f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream');
      r.end(d);
    });
  })
  .listen(8096);
(async () => {
  fs.mkdirSync(path.join(raiz, 'capturas/rocketbox'), { recursive: true });
  const b = await chromium.launch({ channel: 'msedge' }),
    p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  p.on('pageerror', e => console.log('ERR', e.message.slice(0, 300)));
  const desde = +(process.argv[3] || 0);
  await p.goto('http://localhost:8096/#' + desde);
  const info = await p.evaluate(async () => {
    const THREE = await import('three');
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const SU = await import('three/addons/utils/SkeletonUtils.js');
    const d0 = +(location.hash.slice(1) || 0),
      lista = (await (await fetch('/lista')).json()).slice(d0, d0 + 6);
    const gl = new GLTFLoader(),
      cargar = u => new Promise((ok, ko) => gl.load(u, ok, undefined, ko));
    const ren = new THREE.WebGLRenderer({ antialias: true });
    ren.setSize(1600, 900);
    ren.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(ren.domElement);
    const esc = new THREE.Scene();
    esc.background = new THREE.Color(0xdfe5ec);
    esc.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.6));
    const sol = new THREE.DirectionalLight(0xffffff, 2.2);
    sol.position.set(2, 4, 5);
    esc.add(sol);
    const clips = {};
    for (const c of ['idle', 'walking', 'running', 'sitting_idle']) clips[c] = (await cargar('/g/anim/' + c + '.glb')).animations[0];
    const cols = lista.length > 2 ? ['idle', 'walking'] : Object.keys(clips),
      out = [];
    for (let fi = 0; fi < lista.length; fi++) {
      const g = await cargar('/g/personajes/' + lista[fi]);
      cols.forEach((c, ci) => {
        const o = SU.clone(g.scene);
        o.position.set((ci - (cols.length - 1) / 2) * 0.9 + (fi - (lista.length - 1) / 2) * (cols.length * 0.9 + 0.5), 0, 0);
        const mx = new THREE.AnimationMixer(o);
        mx.clipAction(clips[c]).play();
        mx.update(clips[c].duration * 0.3);
        esc.add(o);
      });
      out.push(lista[fi]);
    }
    const cam = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 100);
    const ancho = lista.length * (cols.length * 0.9 + 0.5);
    cam.position.set(0, 1.3, Math.max(5, ancho * 0.95));
    cam.lookAt(0, 0.9, 0);
    ren.render(esc, cam);
    return out;
  });
  console.log('vista:', info.join(', '));
  await p.screenshot({ path: path.join(raiz, 'capturas/rocketbox/vista_' + desde + '.png') });
  await b.close();
  srv.close();
})();
