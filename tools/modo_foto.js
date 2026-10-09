// Modo foto: abrirlo, cambiar de filtro, viñeta, guardar (descarga) y salir. Uso: node tools/modo_foto.js
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'modo_foto'); fs.mkdirSync(DIR, { recursive: true }); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => { const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' }); const ctx = await b.newContext({ viewport: { width: 1280, height: 760 }, acceptDownloads: true }), p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  await p.evaluate(() => { GM.newGame('joventut-badalona', undefined, { modo: 'gestor', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }) }); window.__sinAdaptar = true; GM.campus.config.calidad = 'alta'; GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, 'calle'); });
  await sleep(14000);
  await p.getByRole('button', { name: 'Foto', exact: true }).click(); await sleep(800);
  for (let i = 0; i < 4; i++) await p.locator('.sede-foto button').nth(1).click();
  await p.locator('.sede-foto button', { hasText: 'Viñeta' }).click(); await sleep(800); await p.screenshot({ path: path.join(DIR, 'modo_foto.png') });
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }).catch(() => null), p.locator('.sede-foto button', { hasText: 'Guardar foto' }).click()]);
  if (dl) { await dl.saveAs(path.join(DIR, 'foto_guardada.png')); console.log('descarga:', dl.suggestedFilename(), fs.statSync(path.join(DIR, 'foto_guardada.png')).size, 'bytes'); } else console.log('sin descarga');
  await p.locator('.sede-foto button', { hasText: 'Salir' }).click(); await sleep(400);
  console.log('interfaz de vuelta:', await p.evaluate(() => !document.querySelector('.sede.en-foto') && !!document.querySelector('.sede-top')));
  console.log('errores:', errs.length ? errs.slice(0, 4) : 'ninguno'); await b.close(); })();
