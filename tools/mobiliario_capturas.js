// Punto 77: el juego de mobiliario y vegetación de cada país (GM.mobiliario). Uso: node tools/mobiliario_capturas.js (con npm run serve)
const { chromium } = require('playwright'); const { sleep } = require('./ayudas'); const fs = require('fs');
(async () => {
  fs.mkdirSync('capturas/mobiliario', { recursive: true });
  const b = await chromium.launch({ channel: 'msedge' }), p = await (await b.newContext({ viewport: { width: 1200, height: 500 } })).newPage(), errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/404|Failed to load/.test(m.text())) errs.push(m.text().slice(0, 160)); });
  await p.goto('http://localhost:8080/'); await sleep(700);
  for (const pais of ['ES', 'DE', 'LT']) {
    await p.evaluate(pais => {
      document.body.innerHTML = ''; const cv = document.createElement('canvas'); cv.width = 1200; cv.height = 500; cv.style.cssText = 'position:fixed;inset:0;width:1200px;height:500px'; document.body.append(cv);
      const R = new THREE.WebGLRenderer({ canvas: cv, antialias: true }), S = new THREE.Scene(); S.background = new THREE.Color(0xb7d4ea); S.add(new THREE.HemisphereLight(0xffffff, 0x888888, 1.2)); const d = new THREE.DirectionalLight(0xffffff, 1.6); d.position.set(10, 20, 15); S.add(d);
      const suelo = new THREE.Mesh(new THREE.PlaneGeometry(80, 30), new THREE.MeshStandardMaterial({ color: 0x9a9a92 })); suelo.rotation.x = -Math.PI / 2; S.add(suelo);
      const M = GM.mobiliario, P = M.PAISES[pais], fila = [M.buzon(pais), M.cabina(pais), M.valla(4), M.senal('stop'), M.senal('obligatorio'), M.flores('#e8b6c8', 12)].concat(P.contenedor.map(c => M.contenedorReciclaje(c)), P.especies.map(e => e === 'palmera' ? M.palmera() : e === 'abeto' ? M.abeto() : e === 'abedul' ? M.abedul() : GM.arboles ? GM.arboles.mesh(e, 'verano', 0, 1) : new THREE.Group()));
      fila.forEach((o, i) => { o.position.set(-19 + i * 2.8, 0, 0); S.add(o); });
      const C = new THREE.PerspectiveCamera(35, 2.4, 0.1, 200); C.position.set(0, 7, 20); C.lookAt(0, 2.5, 0); R.render(S, C);
    }, pais); await sleep(300); await p.screenshot({ path: 'capturas/mobiliario/' + pais + '.png' });
  }
  console.log(errs.length ? 'ERRORES ' + errs.join(' | ') : 'ok, sin errores'); await b.close(); process.exit(errs.length ? 1 : 0);
})();
