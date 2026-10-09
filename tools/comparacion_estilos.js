// Comparación de estilos en tu casa 3D: el mismo salón con muebles estilizados (Kenney) y con muebles realistas (Poly Haven, 2K),
// con tu personaje, la misma luz y las texturas reales. Requiere `npm run serve` y los modelos en recursos/polyhaven/modelos.
// Uso: node tools/comparacion_estilos.js   -> capturas/comparacion_estilos/
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const RAIZ = path.join(__dirname, '..'), DIR = path.join(RAIZ, 'capturas', 'comparacion_estilos'); fs.mkdirSync(DIR, { recursive: true });
// los modelos de prueba se sirven desde dist/_comparacion (no forman parte del juego)
(function copia(src, dst) { fs.mkdirSync(dst, { recursive: true }); fs.readdirSync(src, { withFileTypes: true }).forEach(e => e.isDirectory() ? copia(path.join(src, e.name), path.join(dst, e.name)) : fs.copyFileSync(path.join(src, e.name), path.join(dst, e.name))); })(path.join(RAIZ, 'recursos', 'polyhaven', 'modelos'), path.join(RAIZ, 'dist', '_comparacion'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  await p.evaluate(() => {
    GM.newGame('joventut-badalona', undefined, { modo: 'gestor', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }) });
    window.__sinAdaptar = true; GM.campus.config.calidad = 'alta'; GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, 'casa:' + GM.casa.idActual(GM.state));
  });
  await sleep(12000);
  // salón vacío y punto de referencia
  const ref = await p.evaluate(() => {
    const S = GM.sede._estado(), PL = S.casaPlano, hab = PL.habs.find(r => r.id === 'salon' || r.id === 'estudio') || PL.habs[0];
    S.mundo.traverse(o => { if (o.userData && o.userData.muebleCasa) o.visible = false; });
    window.__ref = { x: (hab.x0 + hab.x1) / 2, z: (hab.z0 + hab.z1) / 2, w: hab.x1 - hab.x0, d: hab.z1 - hab.z0, z0: hab.z0 }; window.__grupo = null; return window.__ref;
  });
  console.log('salón', JSON.stringify(ref));
  // [nombre, x, z, giro en grados] relativo al centro del salón (el sofá contra la pared del fondo)
  const SITIOS = { sofa: [0, -1.5, 0], mesa: [0, 0, 0], butaca: [1.9, 0.2, -90], mesita: [-1.45, -1.6, 0], estanteria: [-2.2, 0.4, 90], alfombra: [0, -0.2, 0] };
  const montar = async (juego) => p.evaluate(async ([juego, SITIOS]) => {
    const S = GM.sede._estado(), R = window.__ref; if (window.__grupo) S.mundo.remove(window.__grupo); const g = new THREE.Group(); S.mundo.add(g); window.__grupo = g;
    const L = new THREE.GLTFLoader();
    const ph = async id => { const r = await L.loadAsync('_comparacion/' + id + '/' + id + '_2k.gltf'); const o = r.scene; o.traverse(n => { if (n.isMesh) { n.castShadow = n.receiveShadow = true; } }); const w = new THREE.Group(), bb = new THREE.Box3().setFromObject(o), c = bb.getCenter(new THREE.Vector3()); o.position.set(-c.x, -bb.min.y, -c.z); w.add(o); return w; };
    const KEN = { sofa: 'loungeSofa', mesa: 'tableCoffee', butaca: 'loungeChair', mesita: 'sideTable', estanteria: 'bookcaseOpen', alfombra: 'rugRectangle' };
    const PH = { sofa: 'sofa_02', mesa: 'modern_coffee_table_01', butaca: 'modern_arm_chair_01', mesita: 'side_table_01', estanteria: 'wooden_display_shelves_01' };
    const ponga = (o, k) => { const [x, z, r] = SITIOS[k]; o.position.set(R.x + x, 0, R.z + z); o.rotation.y = r * Math.PI / 180; g.add(o); };
    for (const k of Object.keys(SITIOS)) {
      if (juego === 'kenney' || !PH[k]) { const o = await GM.sede.modeloMueble(KEN[k]); ponga(o, k); }
      else { const o = await ph(PH[k]); ponga(o, k); if (o.userData) o.userData.giroPH = true; }
    }
    // tu personaje junto a la butaca y la cámara mirando al sofá
    S.yo.camino = null; S.yo.obj.position.set(R.x + 1.1, 0, R.z + 1.2); S.yo.obj.rotation.y = Math.PI * 0.85; S.foco.set(R.x, 0, R.z - 0.3); S.yaw = S.yawObj = 0.35; S.zoom = 5.6; S.inc = 0.5; S.hora = 18.5; S.tLuz = 0;
    document.querySelectorAll('.sede-ayuda,.sede-sala').forEach(e => { e.style.display = 'none'; }); return g.children.length;
  }, [juego, SITIOS]);
  for (const juego of ['kenney', 'polyhaven']) {
    const n = await montar(juego); await sleep(3500);
    await p.evaluate(() => { const S = GM.sede._estado(); S.mundo.traverse(o => { if (o.isSprite || (o.userData && o.userData.etiqueta)) o.visible = false; }); if (S.panel) S.panel.style.display = 'none'; S.zonaActual = S.zonas[1]; document.querySelectorAll('.casa-btn-cont,.sede-ayuda').forEach(e => { e.style.display = 'none'; }); }); await sleep(600);
    await p.screenshot({ path: path.join(DIR, juego + '.png') });
    console.log(juego, n, 'piezas');
  }
  console.log('errores:', errs.length ? errs.slice(0, 5) : 'ninguno');
  await b.close();
})();
