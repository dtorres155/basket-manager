// Relieve aplicado al mundo (punto 32): vista aérea de la ciudad y a pie en una cuesta, y comprobación de que la cámara, el personaje y las etiquetas siguen el suelo. Uso: node tools/relieve_capturas.js [club]   (requiere `npm run serve`)
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const club = process.argv[2] || 'joventut-badalona', DIR = path.join(__dirname, '..', 'capturas', 'relieve'); fs.mkdirSync(DIR, { recursive: true });
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }), p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(), errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); await p.goto('http://localhost:8080/'); await sleep(800);
  await p.evaluate(c => { GM.newGame(c, undefined, { modo: 'carrera', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'M', apellido: 'S' }), carrera: { origen: 'europa', clubId: c, pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 } }); GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, 'calle'); }, club); await sleep(16000);
  await p.screenshot({ path: path.join(DIR, '1_inicio.png') });
  console.log(JSON.stringify(await p.evaluate(() => { const S = GM.sede._estado(); return { activo: GM.relieve.activo(), hF: +(S.hF || 0).toFixed(2), alturas: [[0, 0], [0, -250], [-250, 0], [300, 300]].map(([x, z]) => Math.round(GM.relieve.altura(x, z))) }; })));
  // el personaje sube por una cuesta: se coloca a 250 m del centro donde hay desnivel y se mira
  const spot = await p.evaluate(() => { let mejor = null; for (let x = -280; x <= 280; x += 20) for (let z = -280; z <= 280; z += 20) { const S = GM.sede._estado(), pend = Math.hypot(GM.relieve.altura(x + 12, z) - GM.relieve.altura(x - 12, z), GM.relieve.altura(x, z + 12) - GM.relieve.altura(x, z - 12)) / 24; if (S.G && S.G.libre(...S.G.celda(x, z)) && (!mejor || pend > mejor.pend)) mejor = { x, z, pend: +pend.toFixed(3), h: +GM.relieve.altura(x, z).toFixed(1) }; } return mejor; });
  console.log('cuesta:', JSON.stringify(spot));
  if (spot) { await p.evaluate(s => { const S = GM.sede._estado(); S.yo.obj.position.set(s.x, 0, s.z); S.foco.set(s.x, 0, s.z); }, spot); await sleep(3000); await p.screenshot({ path: path.join(DIR, '2_cuesta.png') }); }
  await p.evaluate(() => { const S = GM.sede._estado(); S.enFoto = true; S.camLibre = { pos: new THREE.Vector3(-330, 150, 330), yaw: -0.785, pitch: -0.3 }; S.camera.fov = 55; S.camera.updateProjectionMatrix(); }); await sleep(2500); await p.screenshot({ path: path.join(DIR, '3_aerea.png') });
  console.log('errores:', errs.length ? errs.slice(0, 4) : 'ninguno'); await b.close();
})();
