// Fachadas por tipología (punto 35): vistas de varios barrios de la ciudad piloto con sol, para comparar ensanche, bloques, casas y naves. Uso: node tools/barrios_capturas.js [club]   (requiere `npm run serve`)
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const club = process.argv[2] || 'joventut-badalona', DIR = path.join(__dirname, '..', 'capturas', 'barrios'); fs.mkdirSync(DIR, { recursive: true });
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }), p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(), errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); await p.goto('http://localhost:8080/'); await sleep(800);
  await p.evaluate(c => { GM.newGame(c, undefined, { modo: 'carrera', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'M', apellido: 'S' }), carrera: { origen: 'europa', clubId: c, pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 } }); GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, 'calle'); }, club); await sleep(16000);
  await p.evaluate(() => { GM.sede._clima('sol'); }); await sleep(1000);
  const conteo = await p.evaluate(() => { const S = GM.sede._estado(), c = {}; (S.edificiosDatos || []).forEach(b => { c[b.tipo] = (c[b.tipo] || 0) + 1; }); return c; }); console.log('tipologías:', JSON.stringify(conteo));
  const vistas = JSON.parse(process.env.VISTAS || '[["centro",[0,40,90],-0.25,0],["oeste",[-170,45,-60],-0.22,1.2],["este",[170,40,80],-0.22,-1.2],["sur",[-40,35,200],-0.2,0.3]]');
  for (const [n, pos, pitch, yaw] of vistas) { await p.evaluate(([pos, pi, ya]) => { const S = GM.sede._estado(); S.foco.set(pos[0], 0, pos[2]); S.enFoto = true; S.camLibre = { pos: new THREE.Vector3(...pos), yaw: ya, pitch: pi }; S.camera.fov = 62; S.camera.updateProjectionMatrix(); }, [pos, pitch, yaw]); await sleep(3500); await p.screenshot({ path: path.join(DIR, n + '.png') }); }
  console.log('errores:', errs.length ? errs.slice(0, 4) : 'ninguno'); await b.close();
})();
