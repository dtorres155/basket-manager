// Cielo y clima de la calle: despejado, nieve, lluvia y noche con estrellas y luna (fase según la fecha). Uso: node tools/clima_cielo.js [club] [fecha=2026-12-14]   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const club = process.argv[2] || 'joventut-badalona',
  fecha = process.argv[3] || '2026-12-14',
  DIR = path.join(__dirname, '..', 'capturas', 'clima_cielo');
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
  await p.evaluate(
    ([c, f]) => {
      GM.newGame(c, undefined, {
        modo: 'carrera',
        personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }),
        carrera: { origen: 'europa', clubId: c, pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 }
      });
      GM.state.fecha = f;
      GM.ui.start(document.getElementById('app'));
      GM.sede.abrir(GM.state, 'calle');
    },
    [club, fecha]
  );
  await sleep(15000);
  const vista = async (n, tipo, hora, cam) => {
    await p.evaluate(
      ([t, h, cam]) => {
        const S = GM.sede._estado();
        GM.sede._clima(t);
        S.hora = h;
        S.tLuz = 0;
        document.querySelectorAll('.sede-ayuda').forEach(e => e.remove());
        S.zoom = cam.zoom;
        S.inc = cam.inc;
        S.yaw = S.yawObj = cam.yaw;
      },
      [tipo, hora, cam]
    );
    await sleep(3500);
    await p.screenshot({ path: path.join(DIR, n + '.png') });
  };
  await vista('1_sol_dia', 'sol', 12, { zoom: 24, inc: 0.6, yaw: 0.6 });
  await vista('2_nieve_dia', 'nieve', 12, { zoom: 24, inc: 0.6, yaw: 0.6 });
  await vista('3_lluvia_tarde', 'lluvia', 18.5, { zoom: 24, inc: 0.6, yaw: 0.6 });
  await vista('4_noche_despejada', 'sol', 22.2, { zoom: 40, inc: 0.45, yaw: 3.6 });
  await vista('5_nieve_noche', 'nieve', 22.2, { zoom: 24, inc: 0.5, yaw: 0.6 });
  console.log(
    JSON.stringify(
      await p.evaluate(() => {
        const S = GM.sede._estado();
        return { fecha: GM.state.fecha, cielo: !!S.cieloNoche, nieveObj: !!S.nieveObj };
      })
    ),
    'errores:',
    errs.length ? errs.slice(0, 5) : 'ninguno'
  );
  await b.close();
})();
