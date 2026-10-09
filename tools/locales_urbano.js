// Mobiliario urbano de la calle y los locales nuevos (restaurante, gimnasio y barbería) por dentro, con sus acciones. Uso: node tools/locales_urbano.js
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'locales_urbano'); fs.mkdirSync(DIR, { recursive: true }); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => { const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' }); const p = await (await b.newContext({ viewport: { width: 1280, height: 760 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  await p.evaluate(() => { const pj = Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }); GM.newGame('joventut-badalona', undefined, { modo: 'carrera', personaje: pj, carrera: { origen: 'europa', clubId: 'joventut-badalona', pos: 'SG', perfil: 'tirador', nac: 'ES', agente: 'equilibrado' } }); GM.state.carrera.dinero = 50; window.__sinAdaptar = true; GM.campus.config.calidad = 'alta'; GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, 'calle'); });
  await sleep(16000);
  console.log(await p.evaluate(() => { const S = GM.sede._estado(); let inst = 0; S.mundo.traverse(o => { if (o.isInstancedMesh) inst += o.count; }); return 'instancias ' + inst + ', árboles pos ' + (S.arbolesPos || []).length + ', locales: ' + S.zonas.filter(z => /^local_/.test(z.sala.id)).map(z => z.sala.id + '@' + z.obj.position.x.toFixed(0) + ',' + z.obj.position.z.toFixed(0)).join(' '); }));
  await p.evaluate(() => { const S = GM.sede._estado(); GM.sede._clima('sol'); S.hora = 11; S.tLuz = 0; S.yo.obj.position.set(24, 0, 44); S.yo.camino = null; S.foco.set(24, 0, 44); S.yaw = S.yawObj = 0.5; S.zoom = 18; S.inc = 0.6; document.querySelectorAll('.sede-ayuda,.sede-sala').forEach(e => e.style.display = 'none'); });
  await sleep(2000); await p.screenshot({ path: path.join(DIR, 'parque.png') });
  await p.evaluate(() => { const S = GM.sede._estado(); S.yo.obj.position.set(-14, 0, 6); S.foco.set(-14, 0, 6); S.yaw = S.yawObj = 0.3; S.zoom = 10; S.inc = 0.5; });
  await sleep(1800); await p.screenshot({ path: path.join(DIR, 'acera.png') });
  for (const tipo of ['restaurante', 'gimnasio_barrio', 'barberia']) {
    await p.evaluate(t => GM.sede._escena('interior:' + t), tipo); await sleep(9000);
    const acc = await p.evaluate(() => { const S = GM.sede._estado(); document.querySelectorAll('.sede-ayuda,.sede-sala').forEach(e => e.style.display = 'none'); S.zoom = 11; S.inc = 0.8; const z = S.zonas.find(z => z.sala.acciones); return S.interiorNombre + ': ' + (z ? z.sala.acciones(GM.state).map(a => a.t).join(' | ') : 'sin acciones'); });
    console.log(acc); await sleep(1500); await p.screenshot({ path: path.join(DIR, tipo + '.png') });
  }
  console.log('barbería:', await p.evaluate(() => { const S = GM.sede._estado(), z = S.zonas.find(z => z.sala.acciones), a = z.sala.acciones(GM.state).find(x => x.disponible && /Corte/.test(x.t)); const r = a.fn(); return JSON.stringify(r) + ' pelo=' + GM.state.personaje.pelo; }));
  console.log('errores:', errs.length ? errs.slice(0, 4) : 'ninguno'); await b.close(); })();
