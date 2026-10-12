// Prueba de la ciudad por trozos: cuántas celdas de edificios hay al abrir, cuántas a los 3 y 10 s, y qué pasa al ir al otro extremo (se construyen las cercanas y se descartan las lejanas). Uso: node tools/chunks_ciudad.js [club]
const { chromium } = require('playwright'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const club = process.argv[2] || 'joventut-badalona';
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }), p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/X4122|Program Info|404/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  await p.addInitScript('window.__sinAdaptar = true;'); await p.goto('http://localhost:8080/'); await sleep(900);
  await p.evaluate(c => { GM.newGame(c, undefined, { modo: 'carrera', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'M', apellido: 'S' }), carrera: { origen: 'europa', clubId: c, pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 } }); GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, 'calle'); }, club);
  const est = () => p.evaluate(() => { const S = GM.sede._estado(); return S && S.chunks ? S.chunks.construidos() + '/' + S.chunks.total() : 'sin'; });
  for (let i = 0; i < 40; i++) { await sleep(500); if (await p.evaluate(() => { const S = GM.sede.activa() && GM.sede._estado(); return !!(S && S.yo && !S.sinDibujar && S.gente && S.gente.length); })) break; }
  console.log('al abrir (juego listo):', await est()); await sleep(3000); console.log('a los 3 s:', await est()); await sleep(7000); console.log('a los 10 s:', await est());
  // al extremo: se mueve el foco 280 m lejos para ver cómo se construyen y descartan las celdas
  await p.evaluate(() => { const S = GM.sede._estado(); S.pausa = false; S.yo.obj.position.set(-230, 0, -230); S.foco.set(-230, 0, -230); }); await sleep(4000); console.log('con el personaje en un extremo (-230, -230):', await est());
  await p.evaluate(() => { const S = GM.sede._estado(); S.yo.obj.position.set(230, 0, 230); S.foco.set(230, 0, 230); }); await sleep(4000); console.log('con el personaje en el extremo opuesto (230, 230):', await est());
  console.log('errores:', errs.length ? errs.slice(0, 4) : 'ninguno'); await b.close();
})();
