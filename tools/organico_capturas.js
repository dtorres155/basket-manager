// Capturas del campus (ciudad deportiva) y del mapa 3D de la ciudad, para revisar las formas orgánicas (caminos curvos,
// relieve, parcelas y estanque con contorno irregular). Uso: node tools/organico_capturas.js [club] [carpeta]  (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const CLUB = process.argv[2] || 'joventut-badalona', DIR = path.join(__dirname, '..', 'capturas', process.argv[3] || 'organico'); fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 900, height: 760 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  await p.evaluate(club => { GM.campus.config.calidad = 'alta'; GM.newGame(club, undefined, { modo: 'gestor', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }) }); GM.ui.start(document.getElementById('app')); }, CLUB);
  await sleep(600);
  // Ciudad deportiva (pestaña del club)
  await p.evaluate(() => GM.ui.navegar('club')); await sleep(500);
  await p.evaluate(() => { const t = [...document.querySelectorAll('.tab')].find(x => /ciudad deportiva/i.test(x.textContent)); if (t) t.click(); }); await sleep(3000);
  let el = await p.$('.cuerpo canvas'); if (el) await el.screenshot({ path: path.join(DIR, 'campus.png') });
  // Mapa de la ciudad
  await p.evaluate(() => GM.ui.navegar('ciudad')); await sleep(500);
  await p.evaluate(() => { const t = [...document.querySelectorAll('.tab')].find(x => /mapa 3d/i.test(x.textContent)); if (t) t.click(); }); await sleep(3000);
  el = await p.$('.cuerpo canvas'); if (el) await el.screenshot({ path: path.join(DIR, 'ciudad_mapa.png') });
  await p.evaluate(() => { const t = [...document.querySelectorAll('button')].find(x => /^calles?$/i.test(x.textContent.trim()) || /vista calle/i.test(x.textContent)); if (t) t.click(); }); await sleep(3000);
  el = await p.$('.cuerpo canvas'); if (el) await el.screenshot({ path: path.join(DIR, 'ciudad_calles.png') });
  console.log('capturas en', DIR, '| errores:', errs.length ? errs.slice(0, 5) : 'ninguno');
  await b.close();
})();
