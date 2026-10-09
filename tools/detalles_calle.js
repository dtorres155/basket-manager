// Detalles de la calle: fachadas con carteles y grafitis, gatos en los tejados, manchas del asfalto y un coche de cerca. Uso: node tools/detalles_calle.js
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'detalles_calle'); fs.mkdirSync(DIR, { recursive: true }); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => { const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' }); const p = await (await b.newContext({ viewport: { width: 1280, height: 760 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  await p.evaluate(() => { GM.newGame('joventut-badalona', undefined, { modo: 'gestor', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }) }); window.__sinAdaptar = true; GM.campus.config.calidad = 'alta'; GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, 'calle'); });
  await sleep(14000);
  const info = await p.evaluate(() => { const S = GM.sede._estado(); GM.sede._clima('sol'); let gatos = [], carteles = 0; S.mundo.traverse(o => { if (o.userData && o.userData.gato) { const v = new THREE.Vector3(); o.getWorldPosition(v); gatos.push([+v.x.toFixed(1), +v.y.toFixed(1), +v.z.toFixed(1)]); } }); return { gatos, coches: S.coches.length }; });
  console.log(JSON.stringify(info));
  const vista = (x, z, yaw, zoom, inc) => p.evaluate(([x, z, yaw, zoom, inc]) => { const S = GM.sede._estado(); S.hora = 11; S.tLuz = 0; S.yo.obj.position.set(x, 0, z); S.yo.camino = null; S.foco.set(x, 0, z); S.yaw = S.yawObj = yaw; S.zoom = zoom; S.inc = inc; document.querySelectorAll('.sede-ayuda,.sede-sala').forEach(e => e.style.display = 'none'); }, [x, z, yaw, zoom, inc]);
  for (const [nombre, ancho] of [['cartel', 0.62], ['grafiti', 1.7]]) {
    const d = await p.evaluate(nombre => { const L = (GM.kit.calcomanias || []).filter(c => c[4] === nombre && Math.abs(c[0]) < 60 && Math.abs(c[2]) < 30); const c = L[0]; return c ? [c[0], c[2], c[3]] : null; }, nombre);
    if (!d) { console.log('sin', nombre); continue; }
    await vista(d[0] + Math.sin(d[2]) * 2.2, d[1] + Math.cos(d[2]) * 2.2, d[2], 5, 0.12); await sleep(1800); await p.screenshot({ path: path.join(DIR, nombre + '.png') }); }
  if (info.gatos.length) { const g = info.gatos[0]; await vista(g[0], g[2], 0.6, 7, 0.95); await p.evaluate(y => { GM.sede._estado().foco.y = y; }, g[1]); await sleep(1500); await p.screenshot({ path: path.join(DIR, 'gato.png') }); }
  await p.evaluate(() => { const S = GM.sede._estado(), c = S.coches.find(c => !c.bus); c.vel = 0; const o = c.obj.position; S.yo.obj.position.set(o.x + 3, 0, o.z + 3); S.foco.set(o.x, 0, o.z); S.yaw = S.yawObj = 0.8; S.zoom = 7; S.inc = 0.35; });
  await sleep(1500); await p.screenshot({ path: path.join(DIR, 'coche.png') });
  console.log('errores:', errs.length ? errs.slice(0, 4) : 'ninguno'); await b.close(); })();
