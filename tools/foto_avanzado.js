// Modo foto avanzado: panel de ajustes (hora, clima, exposición, enfoque, apertura), cámara libre y ocultar la interfaz. Uso: node tools/foto_avanzado.js [club]   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const club = process.argv[2] || 'joventut-badalona',
  DIR = path.join(__dirname, '..', 'capturas', 'foto_avanzado');
fs.mkdirSync(DIR, { recursive: true });
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }),
    p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => {
    if (m.type() === 'error' && !/X4122|Program Info|404/.test(m.text())) errs.push(m.text().slice(0, 200));
  });
  await p.addInitScript('window.__sinAdaptar = true;');
  await p.goto('http://localhost:8080/');
  await sleep(900);
  await p.evaluate(c => {
    GM.newGame(c, undefined, {
      modo: 'carrera',
      personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }),
      carrera: { origen: 'europa', clubId: c, pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 }
    });
    GM.ui.start(document.getElementById('app'));
    GM.sede.abrir(GM.state, 'calle');
  }, club);
  await sleep(15000);
  const clic = txt =>
    p.evaluate(t => {
      [...document.querySelectorAll('.sede-foto button, .sede-foto-panel button, .sede-hud button')].filter(b => b.textContent === t).forEach(b => b.click());
    }, txt);
  const rango = (i, v) =>
    p.evaluate(
      ([i, v]) => {
        const r = document.querySelectorAll('.sede-foto-panel input[type=range]')[i];
        r.value = v;
        r.dispatchEvent(new Event('input'));
      },
      [i, v]
    );
  await clic('Más'); // desde el punto 103, Foto está en el menú «Más»
  await clic('Foto');
  await sleep(600);
  await clic('Ajustes');
  await sleep(500);
  await p.screenshot({ path: path.join(DIR, '1_panel.png') });
  await rango(0, 19.6);
  await clic('Despejado');
  await sleep(2500);
  await p.screenshot({ path: path.join(DIR, '2_hora_19_6.png') });
  await rango(1, 0.8);
  await sleep(1500);
  await p.screenshot({ path: path.join(DIR, '3_exposicion_mas.png') });
  await clic('Nieve');
  await rango(0, 12.5);
  await sleep(3000);
  await p.screenshot({ path: path.join(DIR, '4_nieve_mediodia.png') });
  await clic('Cámara libre: no');
  await sleep(300);
  await p.keyboard.down('w');
  await sleep(1200);
  await p.keyboard.up('w');
  await p.keyboard.down('e');
  await sleep(900);
  await p.keyboard.up('e');
  await p.mouse.move(640, 400);
  await p.mouse.down();
  await p.mouse.move(520, 380, { steps: 6 });
  await p.mouse.up();
  await sleep(800);
  await p.screenshot({ path: path.join(DIR, '5_camara_libre.png') });
  // guardar a doble resolución con marco y sello
  await clic('2x');
  await clic('Marco');
  await clic('Sello');
  await p.evaluate(() => {
    const S = GM.sede._estado();
    S.camLibre = null;
    S.zoom = 18;
    S.inc = 0.5;
  });
  const dl = p.waitForEvent('download', { timeout: 20000 });
  await clic('Guardar foto');
  const d = await dl;
  const f = path.join(DIR, 'guardada_2x.png');
  await d.saveAs(f);
  const hd = fs.readFileSync(f);
  console.log('foto guardada', hd.readUInt32BE(16) + 'x' + hd.readUInt32BE(20), Math.round(hd.length / 1024) + ' KB');
  await p.keyboard.press('h');
  await sleep(500);
  await p.screenshot({ path: path.join(DIR, '6_sin_interfaz.png') });
  console.log(
    JSON.stringify(
      await p.evaluate(() => {
        const S = GM.sede._estado();
        return { hora: +S.hora.toFixed(1), libre: !!S.camLibre, pos: S.camLibre && S.camLibre.pos.toArray().map(v => +v.toFixed(1)), clima: S.clima.tipo, expFoto: S.expFoto };
      })
    ),
    'errores:',
    errs.length ? errs.slice(0, 5) : 'ninguno'
  );
  await b.close();
})();
