// Ciudad inventada (punto 36): fuerza el plano sintético (window.__sinOSM) en un club y saca vistas aérea y a pie. Uso: node tools/ciudad_sintetica.js [club=zalgiris-kaunas]   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const club = process.argv[2] || 'zalgiris-kaunas',
  DIR = path.join(__dirname, '..', 'capturas', 'sintetica');
fs.mkdirSync(DIR, { recursive: true });
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }),
    p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => {
    if (m.type() === 'error') errs.push(m.text());
  });
  await p.addInitScript('window.__sinOSM = true;');
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
  console.log(
    JSON.stringify(
      await p.evaluate(() => {
        const S = GM.sede._estado(),
          t = {};
        (S.edificiosDatos || []).forEach(b => {
          t[b.tipo] = (t[b.tipo] || 0) + 1;
        });
        return {
          real: S.real,
          sintetica: !!(GM.mods.calleReal.datos(GM.state.clubId) || {}).sintetica,
          edificios: (S.edificiosDatos || []).length,
          tipos: t,
          zonas: (S.zonas || []).length,
          gente: S.gente.length,
          plazas: (S.plazas || []).length
        };
      })
    )
  );
  await p.evaluate(() => {
    GM.sede._clima('sol');
  });
  await sleep(800);
  for (const [n, pos, pitch, yaw] of [
    ['aerea', [-260, 150, 260], -0.4, -0.78],
    ['avenida', [-150, 22, 120], -0.12, -1.57],
    ['barrio', [170, 30, -120], -0.2, 2.4]
  ]) {
    await p.evaluate(
      ([pos, pi, ya]) => {
        const S = GM.sede._estado();
        S.foco.set(pos[0], 0, pos[2]);
        S.enFoto = true;
        S.camLibre = { pos: new THREE.Vector3(...pos), yaw: ya, pitch: pi };
        S.camera.fov = 62;
        S.camera.updateProjectionMatrix();
      },
      [pos, pitch, yaw]
    );
    await sleep(3500);
    await p.screenshot({ path: path.join(DIR, n + '.png') });
  }
  console.log('errores:', errs.length ? errs.slice(0, 5) : 'ninguno');
  await b.close();
})();
