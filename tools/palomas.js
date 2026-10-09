// Viento y palomas en la calle: capturas de la bandada en la plaza, al acercarte (salen volando) y después. Uso: node tools/palomas.js
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'palomas'); fs.mkdirSync(DIR, { recursive: true }); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => { const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' }); const p = await (await b.newContext({ viewport: { width: 1100, height: 720 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  await p.evaluate(() => { GM.newGame('joventut-badalona', undefined, { modo: 'gestor', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }) }); window.__sinAdaptar = true; GM.campus.config.calidad = 'alta'; GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, 'calle'); });
  await sleep(13000);
  const pos = () => p.evaluate(() => { const A = GM.sede._estado().palomas.aves.slice(0, 9); return A.map(a => a.estado[0] + a.g.position.y.toFixed(1)).join(' '); });
  await p.evaluate(() => { const S = GM.sede._estado(); S.yo.obj.position.set(2, 0, 34); S.yo.camino = null; S.foco.set(2, 0, 38); S.yaw = S.yawObj = 0.3; S.zoom = 9; S.inc = 0.45; S.hora = 11; S.tLuz = 0; document.querySelectorAll('.sede-ayuda,.sede-sala').forEach(e => e.style.display = 'none'); });
  await sleep(2000); await p.screenshot({ path: path.join(DIR, '1_picoteando.png') }); console.log('antes:', await pos());
  await p.evaluate(() => { const S = GM.sede._estado(); GM.sede._motor().irA(S.yo, 2, 40, null); });
  await sleep(2600); await p.screenshot({ path: path.join(DIR, '2_salen_volando.png') }); console.log('al acercarte:', await pos());
  await sleep(7000); console.log('después:', await pos());
  console.log('errores:', errs.length ? errs.slice(0, 4) : 'ninguno'); await b.close(); })();
