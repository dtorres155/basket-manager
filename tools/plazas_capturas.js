// Plazas (punto 34): lista las plazas generadas en la ciudad piloto y saca una vista de cada una. Uso: node tools/plazas_capturas.js [club]   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const club = process.argv[2] || 'joventut-badalona',
  DIR = path.join(__dirname, '..', 'capturas', 'plazas');
fs.mkdirSync(DIR, { recursive: true });
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }),
    p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => {
    if (m.type() === 'error') errs.push(m.text());
  });
  await p.goto('http://localhost:8080/');
  await sleep(800);
  await p.evaluate(c => {
    GM.newGame(c, undefined, {
      modo: 'carrera',
      personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'M', apellido: 'S' }),
      carrera: { origen: 'europa', clubId: c, pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 }
    });
    GM.ui.start(document.getElementById('app'));
    GM.sede.abrir(GM.state, 'calle');
  }, club);
  await sleep(16000);
  await p.evaluate(() => {
    GM.sede._clima('sol');
  });
  const pl = await p.evaluate(() => (GM.sede._estado().plazas || []).map(q => q.map(v => +v.toFixed(1))));
  console.log('plazas:', JSON.stringify(pl));
  for (const [i, q] of pl.entries()) {
    await p.evaluate(([x, z]) => {
      const S = GM.sede._estado();
      S.yo.obj.position.set(x + 7, 0, z + 5);
      S.foco.set(x, 0, z);
      S.zoom = 24;
      S.enFoto = false;
      S.camLibre = null;
    }, q);
    await sleep(3500);
    await p.screenshot({ path: path.join(DIR, 'plaza' + i + '.png') });
  }
  console.log('errores:', errs.length ? errs.slice(0, 4) : 'ninguno');
  await b.close();
})();
