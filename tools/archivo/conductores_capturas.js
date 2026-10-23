// Conductores en los coches, patinetes y metro (punto 26b): cámara libre junto a un coche con conductor y junto a un chaval en patinete. Uso: node tools/conductores_capturas.js [club]   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const club = process.argv[2] || 'joventut-badalona',
  DIR = path.join(__dirname, '..', 'capturas', 'vida26b');
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
  await p.evaluate(c => {
    GM.newGame(c, undefined, {
      modo: 'carrera',
      personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }),
      carrera: { origen: 'europa', clubId: c, pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 }
    });
    GM.ui.start(document.getElementById('app'));
    GM.sede.abrir(GM.state, 'calle');
  }, club);
  await sleep(16000);
  console.log(
    await p.evaluate(() => {
      const S = GM.sede._estado();
      return { conductores: S.coches.filter(c => c.conductor).length, patinetes: S.gente.filter(g => g.patinete).length, perros: S.perros.length, agregados: S.nAgregados || 0 };
    })
  );
  const ver = async (nombre, js) => {
    await p.evaluate(js);
    await sleep(250);
    await p.screenshot({ path: path.join(DIR, nombre + '.png') });
  };
  await ver('coche', () => {
    const S = GM.sede._estado(),
      c = S.coches.find(c => c.conductor),
      q = c.obj.position;
    S.enFoto = true;
    S.camLibre = { pos: new THREE.Vector3(q.x + 3.2, 1.9, q.z + 2.2), yaw: 0.97, pitch: -0.3 };
    S.camera.fov = 45;
    S.camera.updateProjectionMatrix();
    c.vel = 0;
    c.parado = true;
  });
  await ver('patinete', () => {
    const S = GM.sede._estado(),
      g = S.gente.find(g => g.patinete),
      y = S.yo.obj.position;
    g.agregado = null;
    g.oculto = false;
    g.enCasa = false;
    g.dentro = false;
    g.obj.position.set(y.x + 8, 0, y.z - 5);
    g.camino = [[y.x + 40, y.z - 5]];
    g.alLlegar = null;
    g.rapido = false;
    GM.sede._anim(g, 'walk');
    const q = g.obj.position;
    S.camLibre = { pos: new THREE.Vector3(q.x + 0.2, 1.3, q.z + 3.4), yaw: 0, pitch: -0.08 };
  });
  console.log('errores:', errs.length ? errs.slice(0, 5) : 'ninguno');
  await b.close();
})();
