// Capturas de las pantallas de la partida (PC 1280x800 y móvil 390x844). Uso: node tools/ui_capturas.js [carpeta]
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', process.argv[2] || 'ui'); fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' }), errs = [];
  for (const [w, h, suf, mov] of [[1280, 800, 'pc', false], [390, 844, 'movil', true]]) {
    const p = await (await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mov ? 2 : 1, isMobile: mov, hasTouch: mov })).newPage();
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(600);
    await p.evaluate(() => { localStorage.clear(); const pj = GM.mods.personaje.crear(); pj.nombre = 'Marc'; pj.apellido = 'Soler'; GM.newGame('joventut-badalona', undefined, { modo: 'gestor', personaje: pj }); for (let i = 0; i < 12; i++) GM.mods.competiciones.jugarDia(GM.state); GM.ui.start(document.getElementById('app')); });
    for (const id of ['inicio', 'plantilla', 'calendario', 'finanzas', 'mercado']) { await p.evaluate(id => GM.ui.navegar(id), id); await sleep(500); await p.screenshot({ path: path.join(DIR, id + '_' + suf + '.png') }); }
    await p.evaluate(() => { const b = [...document.querySelectorAll('.cab button')].pop(); b.click(); }); await sleep(400); await p.screenshot({ path: path.join(DIR, 'menu_partida_' + suf + '.png') });
    await p.close();
  }
  console.log('errores:', errs.length ? errs : 'ninguno'); await b.close();
})();
