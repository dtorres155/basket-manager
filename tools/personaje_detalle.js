// Personaje principal con más detalle (punto 29): escudo y dorsal en la camiseta, ojos, pendientes, reloj, cadena y manguitos; de frente, de espaldas y de lado. Uso: node tools/personaje_detalle.js   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DIR = path.join(__dirname, '..', 'capturas', 'personaje');
fs.mkdirSync(DIR, { recursive: true });
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }),
    p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => {
    if (m.type() === 'error') errs.push(m.text());
  });
  await p.goto('http://localhost:8080/');
  await sleep(800);
  await p.evaluate(() => {
    const c = 'joventut-badalona';
    GM.newGame(c, undefined, {
      modo: 'carrera',
      personaje: Object.assign(GM.mods.personaje.crear(), {
        nombre: 'Marc',
        apellido: 'Soler',
        ojos: 1,
        pendientes: 2,
        reloj: 1,
        cadena: 1,
        mangas: 1,
        tatuaje: 1,
        barba: 2,
        accesorio: 1,
        zapas: 2
      }),
      carrera: { origen: 'europa', clubId: c, pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 }
    });
    GM.ui.start(document.getElementById('app'));
    GM.sede.abrir(GM.state, 'calle');
  });
  await sleep(14000);
  await p.evaluate(async () => {
    const S = GM.sede._estado(),
      y = S.yo.obj.position,
      a = GM.sede.aspecto(GM.state);
    for (let i = 0; i < 3; i++) {
      const q = await GM.sede.personaje(a);
      q.obj.position.set(y.x - 0.9 + i * 0.9, 80, y.z - 3);
      q.obj.rotation.y = [0, Math.PI, Math.PI / 2][i];
      S.mundo.add(q.obj);
      GM.sede.animar(q, 'idle');
      q.mixer.update(0.3);
    }
    S.enFoto = true;
    S.camLibre = { pos: new THREE.Vector3(y.x - 0.9, 81.62, y.z + 1.6), yaw: 0, pitch: 0.0 };
    S.camera.fov = 12;
    S.camera.updateProjectionMatrix();
  });
  await sleep(1500);
  await p.screenshot({ path: path.join(DIR, 'detalle.png') });
  console.log('errores:', errs.length ? errs.slice(0, 5) : 'ninguno');
  await b.close();
})();
