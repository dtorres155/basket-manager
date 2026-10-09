// Prueba de la calidad adaptable del mundo 3D: con la CPU limitada (x6, como un Android modesto) la escena debe bajar de escalón
// sola y quedarse por encima de 30 fps o en el escalón más bajo. Uso: node tools/rendimiento_auto.js [escena] [x]   (requiere `npm run serve`)
const { chromium } = require('playwright');
const ESC = process.argv[2] || 'calle', X = +(process.argv[3] || 6), sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true }), p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  await p.evaluate(() => localStorage.removeItem('gm1:rendimiento'));
  await (await ctx.newCDPSession(p)).send('Emulation.setCPUThrottlingRate', { rate: X });
  await p.evaluate(esc => { GM.campus.config.calidad = 'alta'; GM.newGame('joventut-badalona', undefined, { modo: 'gestor', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }) }); GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, esc); }, ESC);
  const med = [];
  for (let i = 0; i < 8; i++) { await sleep(3000); med.push(await p.evaluate(() => { const S = GM.sede._estado(); return (S.fps || '?') + ' fps, escalón ' + (S.nivelRend || 0) + ', resolución ' + S.renderer.getPixelRatio().toFixed(2); })); }
  console.log(ESC, 'CPU x' + X + ':\n  ' + med.join('\n  '), '\nguardado:', await p.evaluate(() => localStorage.getItem('gm1:rendimiento')), '| errores:', errs.length ? errs.slice(0, 3) : 'ninguno');
  await p.evaluate(() => localStorage.removeItem('gm1:rendimiento'));
  await b.close();
})();
