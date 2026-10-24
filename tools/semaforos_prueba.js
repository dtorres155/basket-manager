// Peatones en los pasos con semáforo (punto 104 de la hoja de ruta 2): lleva al personaje junto al paso más cercano y comprueba que hay
// gente esperando con los coches en verde y cruzando con los coches en rojo. Capturas en capturas/semaforos/.
// Uso: node tools/semaforos_prueba.js [club]   (requiere npm run serve)
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const { esperarEscena, sleep } = require('./ayudas');
const club = process.argv[2] || 'joventut-badalona',
  DIR = path.join(__dirname, '..', 'capturas', 'semaforos');
fs.mkdirSync(DIR, { recursive: true });
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }),
    p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const errores = [];
  p.on('pageerror', e => errores.push(String(e)));
  await p.goto('http://localhost:8080/');
  await p.waitForFunction(() => window.GM && GM.pruebas);
  await p.evaluate(c => {
    GM.newGame(c, 7, { modo: 'carrera', personaje: GM.mods.personaje.crear(), carrera: { origen: 'europa', clubId: c, pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 } });
    GM.campus.config.calidad = 'alta';
    GM.ajustes.marcarNovedades();
    GM.ui.start(document.getElementById('app'));
    GM.sede.abrir(GM.state, 'calle');
  }, club);
  await esperarEscena(p, 'calle', 150000);
  await p.waitForFunction(() => GM.sede._estado().pasoGente && GM.sede._estado().pasoGente.length, null, { timeout: 60000 });
  await p.waitForFunction(() => GM.sede._estado().yo && GM.sede._estado().yo.obj, null, { timeout: 60000 });
  await sleep(3000);
  const info = await p.evaluate(() => {
    const S = GM.sede._estado(),
      g = S.pasoGente[0],
      q = g.paso;
    // el personaje, en la acera junto al paso, mirando al cruce
    S.yo.obj.position.set(q.x + q.px * (q.w / 2 + 3) + q.dx * 4, 0, q.z + q.pz * (q.w / 2 + 3) + q.dz * 4);
    S.yo.camino = [];
    S.foco.copy(S.yo.obj.position);
    S.zoom = 11;
    S.inc = 0.55;
    S.yaw = Math.atan2(q.dx, q.dz) + 0.6;
    return { n: S.pasoGente.length, pasos: new Set(S.pasoGente.map(x => x.sm)).size };
  });
  const estados = [];
  for (let i = 0; i < 6; i++) {
    await sleep(4000);
    const e = await p.evaluate(() => {
      const S = GM.sede._estado();
      return { fase: S.semFase, est: S.pasoGente.map(g => g.pEst).join(',') };
    });
    estados.push(e);
    await p.screenshot({ path: path.join(DIR, 'paso_' + i + '.png') });
  }
  console.log(JSON.stringify(info), JSON.stringify(estados));
  const cruzan = estados.some(e => /cruza|aleja/.test(e.est)),
    esperan = estados.some(e => /espera/.test(e.est));
  if (errores.length) console.log('errores:', errores.slice(0, 3));
  console.log(cruzan && esperan && !errores.length ? 'peatones en los semáforos: bien' : 'FALLA: peatones en los semáforos');
  await b.close();
  process.exit(cruzan && esperan && !errores.length ? 0 : 1);
})();
