// Sonido ambiente: arranca con el primer gesto, mezcla capas según la escena y el botón lo silencia. Uso: node tools/sonido_prueba.js
const { chromium } = require('playwright'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => { const b = await chromium.launch({ channel: process.env.CANAL || 'msedge', args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await (await b.newContext()).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  await p.evaluate(() => { GM.newGame('joventut-badalona', undefined, { modo: 'gestor', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'a', apellido: 'b' }) }); GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, 'calle'); });
  await sleep(12000); await p.mouse.click(400, 400); await sleep(2500);
  const est = () => p.evaluate(() => { const c = GM.sonido._ctx(); return c ? c.state + ', tiempo ' + c.currentTime.toFixed(1) + ' s' : 'sin contexto'; });
  console.log('calle:', await est());
  await p.evaluate(() => GM.sede._escena('interior:pena')); await sleep(9000); console.log('peña:', await est());
  console.log('botón:', await p.evaluate(() => { const b = [...document.querySelectorAll('.sede-top button')].find(x => /sonido/i.test(x.textContent)); b.click(); const t1 = b.textContent; b.click(); return t1 + ' -> ' + b.textContent; }));
  console.log('errores:', errs.length ? errs.slice(0, 4) : 'ninguno'); await b.close(); })();
