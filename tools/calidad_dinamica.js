// Prueba de la calidad dinámica: con la CPU frenada la resolución baja sola y, al soltar el freno, vuelve a subir. Uso: node tools/calidad_dinamica.js   (requiere `npm run serve`; tarda un minuto y medio)
const { chromium } = require('playwright'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }), c = await b.newContext({ viewport: { width: 1280, height: 800 } }), p = await c.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); await p.goto('http://localhost:8080/'); await p.evaluate(() => { localStorage.removeItem('gm1:escalaRes'); localStorage.removeItem('gm1:rendimiento'); }); await p.reload(); await sleep(800);
  await p.evaluate(() => { GM.newGame('joventut-badalona', undefined, { modo: 'carrera', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'M', apellido: 'S' }), carrera: { origen: 'europa', clubId: 'joventut-badalona', pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 } }); GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, 'calle'); });
  await sleep(14000); const cdp = await c.newCDPSession(p); const est = () => p.evaluate(() => { const S = GM.sede._estado(); return { fps: S.fps, res: S.escalaRes || 1, nivelRend: S.nivelRend || 0, pr: +S.renderer.getPixelRatio().toFixed(2) }; });
  console.log('normal       ', JSON.stringify(await est()));
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 }); for (let i = 1; i <= 4; i++) { await sleep(6000); console.log('CPU x6 +' + i * 6 + 's', JSON.stringify(await est())); }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); for (let i = 1; i <= 4; i++) { await sleep(8000); console.log('sin freno +' + i * 8 + 's', JSON.stringify(await est())); }
  console.log('errores:', errs.length ? errs.slice(0, 3) : 'ninguno'); await b.close();
})();
