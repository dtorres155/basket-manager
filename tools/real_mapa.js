// Mapa de la ciudad real con zoom: vista inicial, acercado con la rueda, arrastre y la ciudad antigua. Uso: node tools/real_mapa.js [club]   (requiere `npm run serve`)
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const club = process.argv[2] || 'real-madrid', DIR = path.join(__dirname, '..', 'capturas', 'real_mapa'); fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }); const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8080/'); await sleep(700);
  await p.evaluate(c => { GM.newGame(c, undefined, { modo: 'carrera', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }), carrera: { origen: 'europa', clubId: c, pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 } }); GM.campus.config.calidad = 'alta'; GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, 'calle'); }, club);
  await sleep(15000);
  const abrir = () => p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent === 'Mapa'); if (b) b.click(); });
  await abrir(); await sleep(900); await p.screenshot({ path: path.join(DIR, '1_inicio.png') });
  const c = await p.evaluate(() => { const r = document.querySelector('.mapa-cv').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await p.mouse.move(c[0], c[1]); for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, -300); await sleep(120); } await sleep(500); await p.screenshot({ path: path.join(DIR, '2_zoom.png') });
  await p.mouse.down(); await p.mouse.move(c[0] - 150, c[1] + 80, { steps: 8 }); await p.mouse.up(); await sleep(400);
  for (let i = 0; i < 4; i++) { await p.mouse.wheel(0, -300); await sleep(120); } await sleep(400); await p.screenshot({ path: path.join(DIR, '3_detalle.png') });
  for (let i = 0; i < 14; i++) { await p.mouse.wheel(0, 400); await sleep(60); } await sleep(400); await p.screenshot({ path: path.join(DIR, '4_lejos.png') });
  console.log('errores:', errs.length ? errs.slice(0, 5) : 'ninguno'); await b.close();
})();
