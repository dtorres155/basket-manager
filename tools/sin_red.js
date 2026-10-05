// Comprueba que dist/ funciona sin conexión: bloquea todo lo que no sea localhost y verifica Three.js, fuentes y una escena 3D.
// Uso: node tools/sin_red.js   (requiere `npm run serve` en marcha)
const { chromium } = require('playwright');
const path = require('path');
const URL = process.env.URL || 'http://localhost:8080/';
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const fuera = [];
  await ctx.route('**/*', r => { const u = r.request().url(); if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(u)) return r.continue(); fuera.push(u); return r.abort(); });
  const p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL); await p.waitForTimeout(1500);
  const r = await p.evaluate(async () => {
    await Promise.all(['Graduate', 'Bricolage Grotesque', 'Doto'].map(n => document.fonts.load('16px "' + n + '"', 'Basket')));
    const f = n => document.fonts.check('16px "' + n + '"', 'Basket');
    return { three: typeof THREE !== 'undefined' && THREE.REVISION, graduate: f('Graduate'), bricolage: f('Bricolage Grotesque'), doto: f('Doto'), cargadas: [...document.fonts].filter(x => x.status === 'loaded').map(x => x.family) };
  });
  await p.screenshot({ path: path.join(__dirname, '..', 'capturas', 'sin_red_menu.png') });
  console.log(JSON.stringify(r), '\npeticiones externas bloqueadas:', fuera.length ? fuera : 'ninguna', '\nerrores:', errs.length ? errs : 'ninguno');
  await b.close();
  process.exit(r.three === '128' && r.graduate && r.bricolage && r.doto && !fuera.length && !errs.length ? 0 : 1);
})();
