// Versión de escritorio: árboles reales en la ciudad deportiva y el pueblo, y persianas reales en la calle. Uso: node tools/escritorio_escenas.js
const { _electron: electron } = require('playwright'); const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'escritorio'); fs.mkdirSync(DIR, { recursive: true }); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => { const raiz = path.join(__dirname, '..', 'escritorio');
  const app = await electron.launch({ executablePath: path.join(raiz, 'node_modules', 'electron', 'dist', 'electron.exe'), args: [raiz] }), p = await app.firstWindow(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); await p.waitForLoadState('domcontentloaded'); await sleep(2500);
  const ir = async (escena, vista, nombre) => {
    await p.evaluate(e => { if (GM.sede.activa && GM.sede.activa()) GM.sede.cerrar(); window.__sinAdaptar = true; GM.sede.abrir(GM.state, e); }, escena); await sleep(18000);
    const info = await p.evaluate(v => { const S = GM.sede._estado(); let inst = 0; S.mundo.traverse(o => { if (o.isInstancedMesh && o.visible) inst += o.count; }); GM.sede._clima('sol'); S.hora = 11; S.tLuz = 0; S.yo.obj.position.set(v[0], 0, v[1]); S.yo.camino = null; S.foco.set(v[0], 0, v[1]); S.yaw = S.yawObj = v[2]; S.zoom = v[3]; S.inc = v[4]; document.querySelectorAll('.sede-ayuda,.sede-sala').forEach(e => e.style.display = 'none'); return 'instancias visibles ' + inst + ', persianas ' + (S.persianas || []).length; }, vista);
    await sleep(2500); await p.screenshot({ path: path.join(DIR, nombre + '.png') }); console.log(nombre + ':', info); };
  await p.evaluate(() => { const pj = Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }); GM.newGame('joventut-badalona', undefined, { modo: 'carrera', personaje: pj, carrera: { origen: 'europa', clubId: 'joventut-badalona', pos: 'SG', perfil: 'tirador', nac: 'ES', agente: 'equilibrado' } }); GM.ui.start(document.getElementById('app')); });
  await ir('deportiva', [-30, -30, 0.5, 40, 0.6], 'deportiva_arboles');
  await ir('pueblo', [0, 30, 0.4, 40, 0.55], 'pueblo_arboles');
  await ir('calle', [-36, -2, 3.14, 14, 0.4], 'calle_persianas');
  console.log('errores:', errs.slice(0, 4)); await app.close(); })();
