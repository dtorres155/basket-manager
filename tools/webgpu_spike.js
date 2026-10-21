// Prueba técnica (punto 24): ¿gana algo WebGPU frente a WebGL2 con Three.js? Dibuja la misma escena (N cubos instanciados con material estándar, una luz con sombras y muchas llamadas de dibujo
// sueltas) con WebGLRenderer y con WebGPURenderer y mide tiempo de CPU por fotograma y fps. Uso: node tools/webgpu_spike.js   (el paquete sale de recursos/webgpu/bundle.js: ver docs/RENDIMIENTO.md)
const { chromium } = require('playwright');
const fs = require('fs'),
  path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const bundle = fs.readFileSync(path.join(__dirname, '..', 'recursos', 'webgpu', 'bundle.js'), 'utf8');
(async () => {
  const b = await chromium.launch({ channel: 'msedge', args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan'] }),
    p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8080/manifest.webmanifest');
  await p.evaluate(() => {
    document.body.innerHTML = '';
    document.body.style.margin = '0';
  });
  await p.addScriptTag({ content: bundle });
  const disp = await p.evaluate(async () => {
    if (!navigator.gpu) return 'sin navigator.gpu';
    const a = await navigator.gpu.requestAdapter();
    if (!a) return 'sin adaptador';
    const i = a.info || (a.requestAdapterInfo && (await a.requestAdapterInfo())) || {};
    return 'WebGPU disponible: ' + (i.vendor || '') + ' ' + (i.architecture || '') + ' ' + (i.description || '');
  });
  console.log(disp);
  const prueba = (modo, nInst, nSueltos) =>
    p.evaluate(
      async ([modo, nInst, nSueltos]) => {
        const T = modo === 'webgpu' ? window.THREE_WEBGPU : window.THREE_GL,
          cv = document.createElement('canvas');
        cv.width = 1280;
        cv.height = 800;
        document.body.append(cv);
        const r = modo === 'webgpu' ? new T.WebGPURenderer({ canvas: cv, antialias: true }) : new T.WebGLRenderer({ canvas: cv, antialias: true });
        if (r.init) await r.init();
        r.shadowMap.enabled = true;
        const sc = new T.Scene(),
          cam = new T.PerspectiveCamera(50, 1.6, 0.1, 1000);
        cam.position.set(0, 120, 160);
        cam.lookAt(0, 0, 0);
        const luz = new T.DirectionalLight(0xffffff, 2);
        luz.position.set(80, 120, 40);
        luz.castShadow = true;
        luz.shadow.mapSize.set(2048, 2048);
        Object.assign(luz.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, far: 400 });
        sc.add(luz, new T.HemisphereLight(0xdfe8f2, 0x6b5a48, 1));
        const suelo = new T.Mesh(new T.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({ color: 0x888888 }));
        suelo.receiveShadow = true;
        sc.add(suelo);
        const im = new T.InstancedMesh(new T.BoxGeometry(1, 3, 1), new T.MeshStandardMaterial({ color: 0xcc8844 }), nInst),
          m4 = new T.Matrix4();
        for (let i = 0; i < nInst; i++) {
          m4.makeTranslation((Math.random() - 0.5) * 300, 1.5, (Math.random() - 0.5) * 300);
          im.setMatrixAt(i, m4);
        }
        im.castShadow = true;
        sc.add(im);
        const g = new T.BoxGeometry(1, 2, 1),
          mats = [0xaa3333, 0x3366aa, 0x33aa66, 0xaaaa33].map(c => new T.MeshStandardMaterial({ color: c }));
        for (let i = 0; i < nSueltos; i++) {
          const o = new T.Mesh(g, mats[i % 4]);
          o.position.set((Math.random() - 0.5) * 300, 1, (Math.random() - 0.5) * 300);
          o.castShadow = true;
          sc.add(o);
        }
        const tiempos = [];
        let n = 0;
        const t0 = performance.now();
        await new Promise(res => {
          const f = async () => {
            const t = performance.now();
            cam.position.x = Math.sin(t / 2000) * 40;
            cam.lookAt(0, 0, 0);
            if (modo === 'webgpu') await r.renderAsync(sc, cam);
            else r.render(sc, cam);
            tiempos.push(performance.now() - t);
            n++;
            if (performance.now() - t0 > 6000) res();
            else requestAnimationFrame(f);
          };
          f();
        });
        tiempos.splice(0, 20);
        tiempos.sort((a, b) => a - b);
        const med = tiempos[tiempos.length >> 1],
          p95 = tiempos[Math.floor(tiempos.length * 0.95)],
          fps = n / ((performance.now() - t0) / 1000);
        r.dispose();
        cv.remove();
        return { modo, instancias: nInst, sueltos: nSueltos, medianaMs: +med.toFixed(2), p95Ms: +p95.toFixed(2), fps: +fps.toFixed(0) };
      },
      [modo, nInst, nSueltos]
    );
  for (const [i, s] of [
    [20000, 500],
    [20000, 3000]
  ])
    for (const m of ['webgl', 'webgpu']) {
      try {
        console.log(JSON.stringify(await prueba(m, i, s)));
      } catch (e) {
        console.log(m, 'falló:', String(e).slice(0, 200));
      }
    }
  console.log('errores:', errs.length ? errs.slice(0, 3) : 'ninguno');
  await b.close();
})();
