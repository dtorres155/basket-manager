// Clima y coches: el mismo cruce soleado, nublado y con lluvia (suelo mojado, charcos), de día y de noche. Uso: node tools/clima.js
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'clima'); fs.mkdirSync(DIR, { recursive: true }); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => { const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' }); const p = await (await b.newContext({ viewport: { width: 1280, height: 760 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  await p.evaluate(() => { GM.newGame('joventut-badalona', undefined, { modo: 'gestor', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }) }); window.__sinAdaptar = true; GM.campus.config.calidad = 'alta'; GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, 'calle'); });
  await sleep(14000);
  console.log('clima del día:', await p.evaluate(() => GM.sede._estado().clima.texto));
  for (const [tipo, hora] of [['sol', 12], ['nubes', 12], ['lluvia', 12], ['lluvia', 21.5]]) {
    await p.evaluate(([tipo, hora]) => { const S = GM.sede._estado(); GM.sede._clima(tipo); S.hora = hora; S.tLuz = 0; S.yo.obj.position.set(-6, 0, 2); S.yo.camino = null; S.foco.set(-6, 0, 2); S.yaw = S.yawObj = 0.5; S.zoom = 16; S.inc = 0.45; document.querySelectorAll('.sede-ayuda,.sede-sala').forEach(e => e.style.display = 'none'); }, [tipo, hora]);
    await sleep(2500); await p.screenshot({ path: path.join(DIR, tipo + '_' + (hora > 20 ? 'noche' : 'dia') + '.png') });
  }
  console.log('errores:', errs.length ? errs.slice(0, 4) : 'ninguno'); await b.close(); })();
