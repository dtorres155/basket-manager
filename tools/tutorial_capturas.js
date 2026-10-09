// Capturas del tutorial guiado de cada modo y de la accesibilidad (letra grande, contraste alto).
// Uso: node tools/tutorial_capturas.js   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'tutorial'); fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  for (const modo of ['gestor', 'carrera']) {
    await p.evaluate(modo => {
      const pj = Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' });
      GM.newGame('joventut-badalona', undefined, modo === 'carrera' ? { modo, personaje: pj, carrera: { origen: 'europa', clubId: 'joventut-badalona', pos: 'SG', perfil: 'tirador', nac: 'ES', agente: 'equilibrado' } } : { modo, personaje: pj });
      GM.ui.start(document.getElementById('app')); GM.ui.tutorial(modo);
    }, modo);
    const pasos = [];
    for (let i = 0; i < 12; i++) {
      await sleep(400); const txt = await p.evaluate(() => { const c = document.querySelector('.tuto-carta'); return c ? c.querySelector('b').textContent : null; }); if (!txt) break; pasos.push(txt);
      if (i === 1 || i === 3) await p.screenshot({ path: path.join(DIR, modo + '_' + i + '.png') });
      await p.evaluate(() => { const bs = [...document.querySelectorAll('.tuto-carta .btn')]; bs[bs.length - 1].click(); });
    }
    console.log(modo + ':', pasos.join(' > '));
  }
  // Accesibilidad
  await p.evaluate(() => { const s = { letra: 'muy-grande', contraste: 'alto', animaciones: 'reducidas' }; localStorage.setItem('gm1:accesibilidad', JSON.stringify(s)); location.reload(); });
  await sleep(1500);
  await p.evaluate(() => { GM.newGame('joventut-badalona', undefined, { modo: 'gestor', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }) }); GM.ui.start(document.getElementById('app')); });
  await sleep(800); await p.screenshot({ path: path.join(DIR, 'accesibilidad.png') });
  const attrs = await p.evaluate(() => ['data-letra', 'data-contraste', 'data-animaciones'].map(a => document.documentElement.getAttribute(a)).join(', '));
  await p.evaluate(() => localStorage.removeItem('gm1:accesibilidad'));
  console.log('accesibilidad:', attrs, '| errores:', errs.length ? errs.slice(0, 5) : 'ninguno');
  await b.close();
})();
