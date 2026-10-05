// Comprueba la PWA en Edge: manifiesto válido, instalable (Page.getInstallabilityErrors), service worker activo
// y que, tras la primera visita, el juego arranca SIN RED y conserva la partida.
// Uso: node tools/pwa.js   (requiere `npm run serve` en marcha)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os');
const URL = process.env.URL || 'http://localhost:8080/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'bm-pwa-'));
  const ctx = await chromium.launchPersistentContext(perfil, { channel: process.env.CANAL || 'msedge', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = ctx.pages()[0] || await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  const cdp = await ctx.newCDPSession(p);
  await p.goto(URL); await p.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 15000 }).catch(() => {});
  if (!(await p.evaluate(() => !!navigator.serviceWorker.controller))) { await p.reload(); await sleep(1500); }
  const inst = await cdp.send('Page.getInstallabilityErrors');
  const man = await cdp.send('Page.getAppManifest');
  const sw = await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return { activo: !!(r && r.active), controla: !!navigator.serviceWorker.controller, cachés: await caches.keys() }; });
  // Crea una partida (se autoguarda al crearla), corta la red y recarga
  await p.evaluate(() => { localStorage.clear(); });
  await p.evaluate(() => { const pj = GM.mods.personaje.crear(); pj.nombre = 'Marc'; pj.apellido = 'Soler'; GM.newGame('joventut-badalona', undefined, { modo: 'gestor', personaje: pj }); GM.mods.guardado.guardar(0); });
  await ctx.setOffline(true);
  await p.reload(); await sleep(2500);
  const sinRed = await p.evaluate(() => ({ three: typeof THREE !== 'undefined', menu: !!document.querySelector('.menu'), continuar: [...document.querySelectorAll('button')].some(b => b.textContent.includes('Continuar partida')) }));
  await p.screenshot({ path: path.join(__dirname, '..', 'capturas', 'fase1', 'pwa_sin_red.png') });
  console.log(JSON.stringify({ instalable: inst.installabilityErrors.length ? inst.installabilityErrors : 'sí', erroresManifiesto: man.errors, sw, sinRed, errs }, null, 1));
  await ctx.close(); fs.rmSync(perfil, { recursive: true, force: true });
  process.exit(!inst.installabilityErrors.length && sw.controla && sinRed.three && sinRed.continuar && !errs.length ? 0 : 1);
})();
