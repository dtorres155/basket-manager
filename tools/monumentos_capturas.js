// Punto 78: los iconos de las ciudades (GM.monumentos) en dos filas. Uso: node tools/monumentos_capturas.js (con npm run serve)
const { chromium } = require('playwright');
const { sleep } = require('./ayudas');
const fs = require('fs');
(async () => {
  fs.mkdirSync('capturas/monumentos', { recursive: true });
  const b = await chromium.launch({ channel: 'msedge' }),
    p = await (await b.newContext({ viewport: { width: 1400, height: 700 } })).newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => {
    if (m.type() === 'error' && !/404|Failed to load/.test(m.text())) errs.push(m.text().slice(0, 160));
  });
  await p.goto('http://localhost:8080/');
  await sleep(700);
  const n = await p.evaluate(() => {
    document.body.innerHTML = '';
    const cv = document.createElement('canvas');
    cv.width = 1400;
    cv.height = 700;
    cv.style.cssText = 'position:fixed;inset:0;width:1400px;height:700px';
    document.body.append(cv);
    const R = new THREE.WebGLRenderer({ canvas: cv, antialias: true }),
      S = new THREE.Scene();
    S.background = new THREE.Color(0xb7d4ea);
    S.add(new THREE.HemisphereLight(0xffffff, 0x888888, 1.2));
    const d = new THREE.DirectionalLight(0xffffff, 1.6);
    d.position.set(30, 50, 40);
    S.add(d);
    const suelo = new THREE.Mesh(new THREE.PlaneGeometry(400, 150), new THREE.MeshStandardMaterial({ color: 0x8a9a6a }));
    suelo.rotation.x = -Math.PI / 2;
    S.add(suelo);
    const nombres = Object.keys(GM.monumentos.NOMBRES);
    nombres.forEach((k, i) => {
      const o = GM.monumentos.crear(k);
      o.position.set(-100 + (i % 7) * 34, 0, i < 7 ? -18 : 22);
      S.add(o);
    });
    const C = new THREE.PerspectiveCamera(40, 2, 0.1, 600);
    C.position.set(0, 70, 190);
    C.lookAt(0, 14, 0);
    R.render(S, C);
    return nombres.length;
  });
  await sleep(300);
  await p.screenshot({ path: 'capturas/monumentos/iconos.png' });
  console.log(n + ' iconos');
  console.log(errs.length ? 'ERRORES ' + errs.join(' | ') : 'ok, sin errores');
  await b.close();
  process.exit(errs.length ? 1 : 0);
})();
