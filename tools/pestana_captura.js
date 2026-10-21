// Abre una pestaña de una pantalla del juego en modo carrera y la captura (para revisar paneles nuevos). Uso: node tools/pestana_captura.js <pantalla> <pestaña> [sub] [carpeta] [semilla JS]
// Ejemplo: node tools/pestana_captura.js ciudad patrimonio mercado   (semilla opcional: código que se ejecuta antes en la página con GM.state)
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const { sleep } = require('./ayudas');
(async () => {
  const [pantalla, tab, sub, carpeta, semilla] = process.argv.slice(2),
    DIR = path.join(__dirname, '..', 'capturas', carpeta || 'pestanas');
  fs.mkdirSync(DIR, { recursive: true });
  const b = await chromium.launch({ channel: 'msedge' }),
    p = await (await b.newContext({ viewport: { width: 520, height: 1000 } })).newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => {
    if (m.type() === 'error') errs.push(m.text().slice(0, 200));
  });
  await p.goto('http://localhost:8080/');
  await sleep(700);
  await p.evaluate(
    ([pant, tab, sub, semilla]) => {
      const pj = GM.mods.personaje.crear();
      pj.nombre = 'Marc';
      GM.newGame('joventut-badalona', undefined, {
        modo: 'carrera',
        personaje: pj,
        carrera: { pos: 'SG', perfil: 'tirador', nac: 'ES', origen: 'europa', agente: 'equilibrado', clubId: 'joventut-badalona' }
      });
      GM.state.carrera.dinero = 600;
      GM.ui.start(document.getElementById('app'));
      if (semilla) (0, eval)(semilla);
      const U = GM.ui._;
      U.ui.tab[pant] = tab;
      if (sub) U.ui.subPatr = sub;
      GM.ui.navegar(pant);
    },
    [pantalla, tab, sub, semilla]
  );
  await sleep(900);
  const txt = await p.evaluate(() => document.body.innerText.slice(0, 200));
  await p.screenshot({ path: path.join(DIR, [pantalla, tab, sub].filter(Boolean).join('_') + '.png'), fullPage: true });
  console.log(txt.replace(/\n+/g, ' / ').slice(0, 160));
  console.log('errores: ' + (errs.length ? errs.slice(0, 3).join(' | ') : 'ninguno'));
  await b.close();
  process.exit(errs.length ? 1 : 0);
})();
