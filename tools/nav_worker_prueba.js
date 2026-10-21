// Prueba de la navegación en el Worker: las personas se mueven, el Worker responde y no hay errores. Uso: node tools/nav_worker_prueba.js [escena=calle]   (requiere `npm run serve`)
const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = process.argv[2] || 'calle';
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
  await p.evaluate(e => {
    GM.newGame('joventut-badalona', undefined, {
      modo: 'carrera',
      personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'M', apellido: 'S' }),
      carrera: { origen: 'europa', clubId: 'joventut-badalona', pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 }
    });
    GM.ui.start(document.getElementById('app'));
    GM.sede.abrir(GM.state, e);
  }, esc);
  await sleep(16000);
  const foto = () =>
    p.evaluate(() => {
      const S = GM.sede._estado();
      return {
        n: S.gente.length,
        pos: S.gente.map(n => [n.obj.position.x, n.obj.position.z]),
        conCamino: S.gente.filter(n => n.camino && n.camino.length).length,
        worker: !!(S.nav && S.nav.activo())
      };
    });
  const a = await foto();
  await sleep(8000);
  const c = await foto();
  let movidos = 0;
  a.pos.forEach((q, i) => {
    if (c.pos[i] && Math.hypot(q[0] - c.pos[i][0], q[1] - c.pos[i][1]) > 1) movidos++;
  });
  console.log(
    'personas',
    c.n,
    '| con camino ahora',
    c.conCamino,
    '| se han movido más de 1 m en 8 s:',
    movidos,
    '| worker activo:',
    c.worker,
    '| errores:',
    errs.length ? errs.slice(0, 3) : 'ninguno'
  );
  await b.close();
})();
