// Prueba la hora del día, el autobús, ceder el paso, el cambio de día y los petos del 3x3.
// Uso: node tools/calle_hora.js   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'calle_hora'); fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(), errs = [], out = {};
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(700);
  await p.evaluate(() => { localStorage.clear(); const pj = GM.mods.personaje.crear(); pj.nombre = 'Marc'; GM.newGame('joventut-badalona', undefined, { modo: 'gestor', personaje: pj }); GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state); });
  await sleep(8000);
  // 3x3 con petos
  await p.evaluate(() => { const S = GM.sede._estado(); S.ultimoGrupo = 'rueda'; GM.sede._grupo(); }); await sleep(16000);
  out.petos = await p.evaluate(() => { const G = GM.sede._estado().grupo; return G ? G.tipo + ', con peto: ' + G.miembros.filter(n => n.conPeto || (() => { let x = false; n.obj.traverse(m => { if (m._matOriginal) x = true; }); return x; })()).length : 'sin grupo'; });
  await p.evaluate(() => { const S = GM.sede._estado(); document.querySelectorAll('.sede-ayuda').forEach(e => e.style.display = 'none'); S.yo.obj.visible = false; S.yo.obj.position.set(-13.5, 0, -5.5); S.foco.set(-13.5, 0, -5.5); S.zoom = 12; S.yawObj = S.yaw = 0.5; }); await sleep(1200);
  await p.screenshot({ path: path.join(DIR, '1_petos.png') });
  // Calle a mediodía: autobús hacia la parada
  await p.evaluate(() => { GM.sede._estado().yo.obj.visible = true; GM.sede._escena('calle'); }); await sleep(9000);
  await p.evaluate(() => { const S = GM.sede._estado(); S.hora = 13; const bus = S.coches.find(c => c.bus); bus.pos = -44; bus.vel = 5; S.yo.obj.position.set(-33, 0, 4.6); S.zoom = 20; S.yawObj = S.yaw = 0.3; }); await sleep(6500);
  out.bus = await p.evaluate(() => { const c = GM.sede._estado().coches.find(c => c.bus); return 'pos ' + c.pos.toFixed(1) + ', vel ' + c.vel.toFixed(1) + ', parada ' + c.tParada.toFixed(1); });
  await p.screenshot({ path: path.join(DIR, '2_autobus.png') });
  // Ceder el paso: tu personaje sobre el paso de peatones de la avenida (x 7-9) y un coche acercándose por el carril x=-1.5 hacia -x
  await p.evaluate(() => { const S = GM.sede._estado(); S.yo.camino = null; S.yo.obj.position.set(8, 0, -1.5); S.coches.filter(c => c.eje === 'x' && c.dir === -1).forEach((c, i) => { c.pos = 22 + i * 12; c.vel = 7; }); S.zoom = 18; S.yawObj = S.yaw = 0.8; }); await sleep(4500);
  out.cede = await p.evaluate(() => GM.sede._estado().coches.filter(c => c.eje === 'x' && c.dir === -1).map(c => 'x ' + c.pos.toFixed(1) + ' v ' + c.vel.toFixed(1)).join(' | '));
  await p.screenshot({ path: path.join(DIR, '3_cede_paso.png') });
  // Noche
  await p.evaluate(() => { const S = GM.sede._estado(); S.hora = 21.5; S.tLuz = 0; S.yo.obj.position.set(-10, 0, -4.4); S.zoom = 26; S.yawObj = S.yaw = 0.4; }); await sleep(2500);
  out.reloj = await p.evaluate(() => document.querySelector('.sede-hora').textContent);
  await p.screenshot({ path: path.join(DIR, '4_noche.png') });
  // Cambio de día con tarjeta
  await p.evaluate(() => { const b = [...document.querySelectorAll('.sede-top button')].find(x => x.textContent.includes('Avanzar')); b.click(); }); await sleep(900);
  await p.screenshot({ path: path.join(DIR, '5_dia_nuevo.png') });
  out.tarjeta = await p.evaluate(() => { const v = document.querySelector('.sede-dia-nuevo'); return v ? v.innerText.replace(/\n/g, ' | ') : null; });
  await sleep(2500); out.horaTras = await p.evaluate(() => GM.sede._estado().hora.toFixed(1) + ', ' + GM.state.fecha);
  console.log(JSON.stringify(out, null, 1), '\nerrores:', errs.length ? errs.slice(0, 6) : 'ninguno');
  await b.close();
})();
