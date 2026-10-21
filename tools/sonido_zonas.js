// Sonido por zona (punto 44): coloca al jugador en una plaza, en una avenida, junto a unas obras y en una terraza, y compara la mezcla (trafico, gente, fuente, murmullo, musica...). Uso: node tools/sonido_zonas.js [club]   (requiere `npm run serve`)
const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const club = process.argv[2] || 'joventut-badalona';
(async () => {
  const b = await chromium.launch({ channel: 'msedge', args: ['--autoplay-policy=no-user-gesture-required'] }),
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
    GM.state.fecha = '2026-10-14';
    GM.ui.start(document.getElementById('app'));
    GM.sede.abrir(GM.state, 'calle');
  }, club);
  await sleep(16000);
  await p.mouse.click(600, 400);
  await sleep(1500);
  const mezcla = async (nombre, js) => {
    await p.evaluate(js);
    await sleep(2500);
    const m = await p.evaluate(() => {
      const S = GM.sede._estado();
      return { P: GM.sonido._paisaje(), M: GM.sonido._mezcla(), ctx: GM.sonido._ctx() && GM.sonido._ctx().state };
    });
    const f = o =>
      Object.entries(o)
        .map(([k, v]) => k + ' ' + (+v).toFixed(2))
        .join(', ');
    console.log(nombre, '| paisaje:', f(m.P), '| mezcla:', f(m.M), '|', m.ctx);
    return m;
  };
  const pos = (x, z, h) => `(() => { const S = GM.sede._estado(); S.yo.obj.position.set(${x}, 0, ${z}); S.foco.set(${x}, 0, ${z}); S.hora = ${h}; })()`;
  const plaza = await p.evaluate(() => (GM.sede._estado().plazas || [])[0]);
  const av = await p.evaluate(() => {
    const S = GM.sede._estado(),
      c = (S.callesTodas || []).filter(c => c.k <= 1 && Math.hypot(c.p[1][0], c.p[1][1]) < 200)[0] || S.callesTodas.find(c => c.k <= 2),
      q = c.p[Math.floor(c.p.length / 2)];
    return q;
  });
  const A = await mezcla('plaza  ', pos(plaza[0] + 1, plaza[1] + 1, 12));
  const B = await mezcla('avenida', pos(av[0], av[1], 12));
  const C = await mezcla(
    'plaza de noche con terraza',
    `(() => { const S = GM.sede._estado(), z = S.zonas.find(z => /terraza|pena/.test(z.sala.id)); S.yo.obj.position.set(z.obj.position.x, 0, z.obj.position.z); S.foco.copy(S.yo.obj.position); S.hora = 21; })()`
  );
  const ok = A.M.fuente > B.M.fuente && B.M.trafico > A.M.trafico && (C.M.murmullo > B.M.murmullo || C.M.musica > B.M.musica);
  console.log(ok ? 'OK: la plaza suena a fuente y poco tráfico, la avenida a tráfico y el bar a gente y música' : 'FALLA: no se distinguen');
  console.log('errores:', errs.length ? errs.slice(0, 4) : 'ninguno');
  await b.close();
  process.exit(ok ? 0 : 1);
})();
