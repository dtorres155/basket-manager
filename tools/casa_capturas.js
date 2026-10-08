// Prueba la casa y el modo construcción: entrar desde la calle, comprar y colocar, girar, mover, vender, salir.
// Uso: node tools/casa_capturas.js   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'casa'); fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(), errs = [], out = {};
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(700);
  await p.evaluate(() => { localStorage.clear(); const pj = GM.mods.personaje.crear(); pj.nombre = 'Marc'; GM.newGame('joventut-badalona', undefined, { modo: 'carrera', personaje: pj, carrera: { pos: 'SG', perfil: 'tirador', nac: 'ES', origen: 'europa', agente: 'equilibrado', clubId: 'joventut-badalona' } }); GM.state.carrera.dinero = 30; GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state); });
  await sleep(8000); await p.evaluate(() => GM.sede._escena('calle')); await sleep(10000);
  // Portal de casa
  await p.evaluate(() => { const S = GM.sede._estado(), z = S.zonas.find(z => z.sala.id === 'portal'); S.yo.obj.position.set(z.obj.position.x, 0, z.obj.position.z); }); await sleep(1000);
  out.portal = await p.evaluate(() => { const b = document.querySelector('.sp-ir'); if (b) b.click(); return b && b.textContent; }); await sleep(7000);
  out.escena = await p.evaluate(() => GM.sede._estado().escena);
  await p.evaluate(() => document.querySelectorAll('.sede-ayuda').forEach(e => e.style.display = 'none'));
  await p.evaluate(() => { const S = GM.sede._estado(); S.zoom = 13; }); await sleep(1500); await p.screenshot({ path: path.join(DIR, '1_casa.png') });
  // Modo construcción
  await p.click('.casa-btn'); await sleep(2500); await p.screenshot({ path: path.join(DIR, '2_construccion.png') });
  const proyecta = (x, z) => p.evaluate(([x, z]) => { const S = GM.sede._estado(), v = new THREE.Vector3(x, 0, z).project(S.camera), r = S.renderer.domElement.getBoundingClientRect(); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height]; }, [x, z]);
  // Comprar un sofá rinconera y colocarlo
  await p.evaluate(() => [...document.querySelectorAll('.cc-cat')].find(b => b.textContent === 'Salón').click()); await sleep(300);
  await p.evaluate(() => [...document.querySelectorAll('.cc-item')].find(b => b.textContent.includes('Televisor')).click()); await sleep(800);
  let [sx, sy] = await proyecta(-2, 2.6); await p.mouse.move(sx, sy); await sleep(300); await p.screenshot({ path: path.join(DIR, '3_fantasma.png') });
  await p.keyboard.press('r'); await p.mouse.move(sx + 2, sy); await sleep(200); await p.mouse.click(sx, sy); await sleep(800);
  // Fantasma rojo sobre la cama (no cabe)
  await p.evaluate(() => [...document.querySelectorAll('.cc-item')].find(b => b.textContent.includes('Butaca')).click()); await sleep(800);
  [sx, sy] = await proyecta(-2, -1.5); await p.mouse.move(sx, sy); await sleep(300); await p.screenshot({ path: path.join(DIR, '4_no_cabe.png') });
  [sx, sy] = await proyecta(3, 2); await p.mouse.move(sx, sy); await p.mouse.click(sx, sy); await sleep(800);
  out.tras = await p.evaluate(() => ({ muebles: GM.state.sede.casa.muebles.map(m => m.m + '@' + m.x + ',' + m.z + ' r' + m.r).join(' | '), dinero: GM.state.carrera.dinero.toFixed(2), confort: GM.casa.confort(GM.state) }));
  // Seleccionar la nevera y venderla
  await p.evaluate(() => { const b = [...document.querySelectorAll('.cc-item')].find(x => x.classList.contains('on')); });
  await p.evaluate(() => { const S = GM.sede._estado(); });
  await p.evaluate(async () => { const S = GM.sede._estado(); /* soltar el mueble elegido */ });
  [sx, sy] = await proyecta(2.5, -2.3);
  await p.evaluate(() => GM.casa.activar(GM.sede._estado(), GM.sede._motor(), false)); await sleep(300); await p.click('.casa-btn'); await sleep(1500);
  [sx, sy] = await proyecta(2.5, -2.3); await p.mouse.click(sx, sy); await sleep(500); await p.screenshot({ path: path.join(DIR, '5_seleccion.png') });
  out.sel = await p.evaluate(() => { const s = document.querySelector('.cc-sel'); return s ? s.innerText.replace(/\n/g, ' | ') : null; });
  await p.evaluate(() => { const b = [...document.querySelectorAll('.cc-sel button')].find(x => x.textContent.startsWith('Vender')); if (b) b.click(); }); await sleep(500);
  out.trasVender = await p.evaluate(() => GM.state.sede.casa.muebles.length + ' muebles, ' + GM.state.carrera.dinero.toFixed(2) + ' k€');
  // Reformas: paredes terracota, baldosa hidráulica y luz cálida; un tabique y una lámpara que ilumina
  await p.evaluate(() => { GM.state.carrera.dinero = 50; [...document.querySelectorAll('.cc-cat')].find(b => b.textContent === 'Reformas').click(); }); await sleep(400);
  await p.screenshot({ path: path.join(DIR, '7_reformas.png') });
  out.reformas = await p.evaluate(() => { const clic = t => { const b = [...document.querySelectorAll('.cc-reforma .cc-item')].find(x => x.textContent.includes(t)); if (b) b.click(); return !!b; }; return [clic('Terracota'), clic('Baldosa'), clic('Cálida')].join(',') + ' -> ' + JSON.stringify({ pared: GM.state.sede.casa.pared, suelo: GM.state.sede.casa.suelo, luz: GM.state.sede.casa.luz }); });
  await p.evaluate(() => [...document.querySelectorAll('.cc-cat')].find(b => b.textContent === 'Obra').click()); await sleep(300);
  await p.evaluate(() => [...document.querySelectorAll('.cc-item')].find(b => b.textContent.includes('Tabique de 2 m')).click()); await sleep(800);
  [sx, sy] = await proyecta(-1, 0.5); await p.mouse.move(sx, sy); await sleep(200); await p.mouse.click(sx, sy); await sleep(800);
  await p.evaluate(() => [...document.querySelectorAll('.cc-cat')].find(b => b.textContent === 'Decoración').click()); await sleep(300);
  await p.evaluate(() => [...document.querySelectorAll('.cc-item')].find(b => b.textContent.includes('Lámpara de pie')).click()); await sleep(800);
  [sx, sy] = await proyecta(-3.3, -2.3); await p.mouse.move(sx, sy); await sleep(200); await p.mouse.click(sx, sy); await sleep(800);
  out.obra = await p.evaluate(() => GM.state.sede.casa.muebles.filter(m => m.m[0] === '_' || /^lamp/.test(m.m)).map(m => m.m).join(', ') + '; luces: ' + GM.sede._estado().mueblesCasa.filter(o => o.luzCasa).length);
  await p.evaluate(() => GM.casa.activar(GM.sede._estado(), GM.sede._motor(), false)); await sleep(800);
  await p.evaluate(() => { const S = GM.sede._estado(); S.zoom = 12; S.yawObj = S.yaw = 0.5; }); await sleep(1500); await p.screenshot({ path: path.join(DIR, '6_casa_final.png') });
  // Descansar (usa el confort) y salir a la calle
  await p.evaluate(() => { const S = GM.sede._estado(), z = S.zonas.find(z => z.sala.id === 'casa'); S.yo.obj.position.set(z.obj.position.x, 0, z.obj.position.z); }); await sleep(1000);
  out.descanso = await p.evaluate(() => { const b = [...document.querySelectorAll('.sede-sala button')].find(x => x.textContent.includes('Descansar')); if (b) b.click(); return !!b; }); await sleep(500);
  out.toast = await p.evaluate(() => (document.querySelector('.toast') || {}).textContent);
  await p.evaluate(() => GM.sede._escena('calle')); await sleep(9000); out.vuelta = await p.evaluate(() => { const S = GM.sede._estado(); return S.escena + ' en ' + S.yo.obj.position.x.toFixed(1) + ',' + S.yo.obj.position.z.toFixed(1); });
  console.log(JSON.stringify(out, null, 1), '\nerrores:', errs.length ? errs.slice(0, 6) : 'ninguno'); await b.close();
})();
