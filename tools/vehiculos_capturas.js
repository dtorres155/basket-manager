// Punto 76: todos los vehículos del catálogo (GM.vehiculos) en fila, con los colores de Barcelona, Madrid y Atenas. Uso: node tools/vehiculos_capturas.js (con npm run serve)
const { chromium } = require('playwright');
const { sleep } = require('./ayudas');
const fs = require('fs');
(async () => {
  fs.mkdirSync('capturas/vehiculos', { recursive: true });
  const b = await chromium.launch({ channel: 'msedge' }),
    p = await (await b.newContext({ viewport: { width: 1200, height: 600 } })).newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => {
    if (m.type() === 'error' && !/404|Failed to load/.test(m.text())) errs.push(m.text().slice(0, 160));
  });
  await p.goto('http://localhost:8080/');
  await sleep(700);
  for (const [ciudad, nombre] of [
    ['ES-CT', 'barcelona'],
    ['ES-MD', 'madrid'],
    ['GR', 'atenas']
  ]) {
    const r = await p.evaluate(ciudad => {
      document.body.innerHTML = '';
      const cv = document.createElement('canvas');
      cv.width = 1200;
      cv.height = 600;
      cv.style.cssText = 'position:fixed;inset:0;width:1200px;height:600px';
      document.body.append(cv);
      const R = new THREE.WebGLRenderer({ canvas: cv, antialias: true }),
        S = new THREE.Scene();
      S.background = new THREE.Color(0xb7d4ea);
      S.add(new THREE.HemisphereLight(0xffffff, 0x888888, 1.1));
      const d = new THREE.DirectionalLight(0xffffff, 1.6);
      d.position.set(10, 20, 15);
      S.add(d);
      const suelo = new THREE.Mesh(new THREE.PlaneGeometry(200, 60), new THREE.MeshStandardMaterial({ color: 0x555a5f }));
      suelo.rotation.x = -Math.PI / 2;
      S.add(suelo);
      let x = -40,
        n = 0;
      GM.vehiculos.tipos().forEach(t => {
        const o = GM.vehiculos.crear(t.tipo, ciudad, { linea: 'H16' });
        o.rotation.y = -Math.PI / 2 + 0.5;
        x += t.largo / 2 + 1.2;
        o.position.set(x, 0, (n % 2) * 7 - 3.5);
        x += (t.largo / 2) * 0.5;
        S.add(o);
        n++;
      });
      const C = new THREE.PerspectiveCamera(40, 2, 0.1, 400);
      C.position.set(0, 38, 46);
      C.lookAt(0, 0, 0);
      R.render(S, C);
      return GM.vehiculos.tipos().length;
    }, ciudad);
    await sleep(300);
    await p.screenshot({ path: 'capturas/vehiculos/' + nombre + '.png' });
    console.log(nombre, r + ' tipos');
  }
  console.log(errs.length ? 'ERRORES ' + errs.join(' | ') : 'ok, sin errores');
  await b.close();
  process.exit(errs.length ? 1 : 0);
})();
