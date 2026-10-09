// Muebles realistas (Poly Haven) frente a los de Kenney que sustituyen: cada pareja en fila (Kenney delante, realista detrás),
// para comprobar orientación y tamaño. Uso: node tools/muebles_reales.js   (requiere `npm run serve`) -> capturas/muebles_reales/
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'muebles_reales'); fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  await p.evaluate(() => { GM.newGame('joventut-badalona', undefined, { modo: 'gestor', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }) }); window.__sinAdaptar = true; GM.campus.config.calidad = 'alta'; GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, 'calle'); });
  await sleep(12000);
  const nombres = await p.evaluate(async () => {
    const S = GM.sede._estado(), g = new THREE.Group(), X0 = 500, Z0 = 500; S.mundo.add(g); window.__expo = g;
    const suelo = new THREE.Mesh(new THREE.PlaneGeometry(80, 80).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xbdb8ae })); suelo.position.set(X0 + 12, 0, Z0 + 14); suelo.receiveShadow = true; g.add(suelo);
    const L = ['loungeSofa', 'loungeSofaLong', 'loungeDesignSofa', 'loungeChair', 'loungeChairRelax', 'loungeDesignChair', 'chair', 'chairCushion', 'chairModernCushion', 'stoolBar', 'table', 'tableRound', 'tableCoffee', 'tableCoffeeGlass', 'tableCross', 'sideTable', 'sideTableDrawers', 'desk', 'bookcaseOpen', 'bookcaseClosed', 'bookcaseClosedWide', 'cabinetTelevision', 'televisionModern', 'televisionVintage', 'lampRoundTable', 'pottedPlant', 'plantSmall1', 'plantSmall2', 'books', 'trashcan', 'cardboardBoxClosed', 'radio', 'laptop', 'bench', 'bedDouble', 'bedSingle', 'kitchenStove', 'kitchenMicrowave'];
    const etiqueta = GM.sede._motor().etiqueta;
    for (let i = 0; i < L.length; i++) { const x = X0 + (i % 8) * 3.6, z = Z0 + Math.floor(i / 8) * 6;
      window.__sinReales = true; const k = await GM.sede.modeloMueble(L[i]); k.position.set(x, 0, z + 1.6); g.add(k);
      window.__sinReales = false; const r = await GM.sede.modeloMueble(L[i]); r.position.set(x, 0, z - 0.6); g.add(r);
      const e = etiqueta(L[i] + (r.userData.real ? '' : ' (sin real)')); e.scale.multiplyScalar(0.5); e.position.set(x, 2.6, z); g.add(e); }
    S.yo.obj.position.set(X0 + 12, 0, Z0 + 13); S.yo.camino = null; S.foco.set(X0 + 12, 0, Z0 + 13); S.yo.obj.visible = false; return L.length;
  });
  for (const [n, yaw, zoom, inc, fz] of [['todo', 0, 34, 0.9, 13], ['fila1', 0, 13, 0.55, 0], ['fila2', 0, 13, 0.55, 6], ['fila3', 0, 13, 0.55, 12], ['fila4', 0, 13, 0.55, 18], ['fila5', 0, 13, 0.55, 24]]) {
    await p.evaluate(([yaw, zoom, inc, fz]) => { const S = GM.sede._estado(); S.yo.obj.position.set(512.6, 0, 500 + fz); S.foco.set(512.6, 0, 500 + fz); S.yaw = S.yawObj = yaw; S.zoom = zoom; S.inc = inc; S.hora = 12; S.tLuz = 0; document.querySelectorAll('.sede-ayuda,.sede-sala').forEach(e => { e.style.display = 'none'; }); }, [yaw, zoom, inc, fz]);
    await sleep(2500); await p.screenshot({ path: path.join(DIR, n + '.png') });
  }
  console.log(nombres, 'parejas; errores:', errs.length ? errs.slice(0, 5) : 'ninguno');
  await b.close();
})();
