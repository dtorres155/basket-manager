// Modo foto con profundidad de campo y rayos de luz: captura la calle con el sol delante, con y sin efectos. Uso: node tools/foto_posproceso.js [club]   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const club = process.argv[2] || 'joventut-badalona',
  DIR = path.join(__dirname, '..', 'capturas', 'foto');
fs.mkdirSync(DIR, { recursive: true });
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }),
    p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => {
    if (m.type() === 'error' && !/X4122|Program Info|404/.test(m.text())) errs.push(m.text().slice(0, 200));
  });
  await p.goto('http://localhost:8080/');
  await sleep(900);
  await p.evaluate(c => {
    window.__sinAdaptar = true;
    GM.newGame(c, undefined, {
      modo: 'carrera',
      personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }),
      carrera: { origen: 'europa', clubId: c, pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 }
    });
    GM.ui.start(document.getElementById('app'));
    GM.sede.abrir(GM.state, 'calle');
  }, club);
  await sleep(15000);
  await p.evaluate(process_yaw => {
    const S = GM.sede._estado();
    S.hora = 17.6;
    S.clima = Object.assign(S.clima || {}, { tipo: 'sol', texto: 'Soleado' });
    S.yaw = S.yawObj = +process_yaw;
    S.zoom = 38;
    S.inc = 0.12;
  }, process.env.YAW || '1.57');
  await sleep(2500);
  await p.evaluate(() => {
    document.querySelectorAll('.sede-hud button').forEach(b => {
      if (b.textContent === 'Foto') b.click();
    });
  });
  await sleep(800);
  await p.screenshot({ path: path.join(DIR, '1_foto_normal.png') });
  await p.evaluate(() => {
    document.querySelectorAll('.sede-foto button').forEach(b => {
      if (b.textContent === 'Desenfoque') b.click();
    });
  });
  await sleep(900);
  await p.screenshot({ path: path.join(DIR, '2_desenfoque.png') });
  await p.evaluate(() => {
    document.querySelectorAll('.sede-foto button').forEach(b => {
      if (b.textContent === 'Rayos de luz') b.click();
    });
  });
  await sleep(900);
  await p.screenshot({ path: path.join(DIR, '3_desenfoque_y_rayos.png') });
  console.log(
    JSON.stringify(
      await p.evaluate(() => {
        const S = GM.sede._estado();
        return { bokeh: !!S.bokeh, rayos: !!S.rayos, luzSol: S.luces.sol.intensity };
      })
    ),
    'errores:',
    errs.length ? errs.slice(0, 5) : 'ninguno'
  );
  await b.close();
})();
