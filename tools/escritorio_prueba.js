// Prueba de la versión de escritorio (Electron): arranca escritorio/main.js, entra en la calle con calidad alta y hace capturas.
// Requiere `cd escritorio && npm install && node preparar.js`. Uso: node tools/escritorio_prueba.js
const { _electron: electron } = require('playwright'); const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'escritorio'); fs.mkdirSync(DIR, { recursive: true }); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => { const raiz = path.join(__dirname, '..', 'escritorio');
  const app = await electron.launch({ executablePath: path.join(raiz, 'node_modules', 'electron', 'dist', 'electron.exe'), args: [raiz] }), p = await app.firstWindow(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.waitForLoadState('domcontentloaded'); await sleep(2500); await p.setViewportSize({ width: 1600, height: 900 }).catch(() => {});
  await p.screenshot({ path: path.join(DIR, 'portada.png') });
  console.log('url:', p.url(), 'GM:', await p.evaluate(() => typeof GM));
  await p.evaluate(() => { GM.newGame('joventut-badalona', undefined, { modo: 'gestor', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }) }); window.__sinAdaptar = true; GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, 'calle'); });
  await sleep(20000);
  console.log(await p.evaluate(() => { const S = GM.sede._estado(); let inst = 0; S.mundo.traverse(o => { if (o.isInstancedMesh) inst += o.count; }); GM.sede._clima('sol'); S.hora = 11; S.tLuz = 0; S.yo.obj.position.set(4, 0, 0); S.yo.camino = null; S.foco.set(4, 0, 0); S.yaw = S.yawObj = 0.15; S.zoom = 34; S.inc = 0.62; document.querySelectorAll('.sede-ayuda,.sede-sala').forEach(e => e.style.display = 'none'); return 'calidad ' + GM.campus.config.calidad + ', posprocesado ' + (S.composer ? 'sí' : 'no') + ', instancias ' + inst + ', fps ' + S.fps; }));
  await sleep(3000); await p.screenshot({ path: path.join(DIR, 'calle.png') });
  console.log('errores:', errs.filter(e => !/X4122/.test(e)).slice(0, 4)); await app.close(); })();
