// Prueba de la calle: salir de la sede, vista general, puertas con sus paneles, tráfico, aficionados y volver.
// Uso: node tools/calle_capturas.js [--partido]   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'calle'); fs.mkdirSync(DIR, { recursive: true });
const PARTIDO = process.argv.includes('--partido'), sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(), errs = [], out = {};
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(700);
  await p.evaluate(partido => { localStorage.clear(); const pj = GM.mods.personaje.crear(); pj.nombre = 'Marc'; GM.newGame('joventut-badalona', undefined, { modo: 'gestor', personaje: pj }); const st = GM.state; if (partido) st.fecha = GM.mods.competiciones.proximoPartido(st, st.clubId).fecha; GM.ui.start(document.getElementById('app')); GM.sede.abrir(st); }, PARTIDO);
  await sleep(8000);
  // Ir a la salida (anillo amarillo) y pulsar «Salir a la calle»
  await p.evaluate(() => { const S = GM.sede._estado(), z = S.zonas.find(z => z.sala.id === 'salida'); S.yo.obj.position.set(z.obj.position.x, 0, z.obj.position.z); S.zoom = 14; }); await sleep(900);
  await p.screenshot({ path: path.join(DIR, '1_salida_sede.png') });
  out.boton = await p.evaluate(() => { const b = document.querySelector('.sp-ir'); if (b) b.click(); return b && b.textContent; });
  await sleep(9000); out.escena = await p.evaluate(() => GM.sede._estado().escena);
  const suf = PARTIDO ? '_partido' : '';
  await p.evaluate(() => { const S = GM.sede._estado(); document.querySelectorAll('.sede-ayuda').forEach(e => e.style.display = 'none'); S.zoom = 42; S.yawObj = S.yaw = 0.35; S.yo.obj.position.set(0, 0, -4.5); }); await sleep(2500);
  await p.screenshot({ path: path.join(DIR, '2_calle_general' + suf + '.png') });
  await p.evaluate(() => { const S = GM.sede._estado(); S.zoom = 20; S.yawObj = S.yaw = 0.2; S.yo.obj.position.set(15, 0, -4.4); }); await sleep(2000); await p.screenshot({ path: path.join(DIR, '3_calle_sede' + suf + '.png') });
  // Caminar a la peña (A* por los pasos de peatones) y abrir su panel
  const llegada = await p.evaluate(() => new Promise(res => { const S = GM.sede._estado(), z = S.zonas.find(z => z.sala.id === 'pena'); S.yo.rapido = true; const c = GM.sede.aEstrella(S.G, [S.yo.obj.position.x, S.yo.obj.position.z], [z.obj.position.x, z.obj.position.z]); if (!c) return res('sin camino'); S.yo.camino = c.slice(1).concat([[z.obj.position.x, z.obj.position.z]]); const t0 = Date.now(); const iv = setInterval(() => { if (!S.yo.camino || !S.yo.camino.length) { clearInterval(iv); res('llega en ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s, ' + c.length + ' puntos'); } }, 100); setTimeout(() => { clearInterval(iv); res('no llega'); }, 20000); }));
  out.pena = llegada; await sleep(800);
  await p.evaluate(() => { const S = GM.sede._estado(); S.zoom = 14; S.yawObj = S.yaw = Math.PI + 0.3; }); await sleep(1500);
  out.panelPena = await p.evaluate(() => { const s = document.querySelector('.sede-sala'); return s && s.style.display !== 'none' ? s.innerText.replace(/\n+/g, ' | ').slice(0, 160) : null; });
  await p.evaluate(() => { const b = [...document.querySelectorAll('.sede-sala button')].find(x => x.textContent.includes('Tomar algo')); if (b) b.click(); }); await sleep(700);
  await p.screenshot({ path: path.join(DIR, '4_pena' + suf + '.png') });
  // Quiosco
  await p.evaluate(() => { const S = GM.sede._estado(), z = S.zonas.find(z => z.sala.id === 'kiosco'); S.yo.camino = null; S.yo.obj.position.set(z.obj.position.x, 0, z.obj.position.z); S.zoom = 12; S.yawObj = S.yaw = 0.3; }); await sleep(1200);
  await p.evaluate(() => { const b = [...document.querySelectorAll('.sede-sala button')].find(x => x.textContent.includes('periódicos')); if (b) b.click(); }); await sleep(500);
  await p.screenshot({ path: path.join(DIR, '5_quiosco' + suf + '.png') });
  // Tráfico en el cruce
  await p.evaluate(() => { const S = GM.sede._estado(); S.panel.style.display = 'none'; S.yo.obj.position.set(-5, 0, -4.5); S.zoom = 22; S.yawObj = S.yaw = 0.7; }); await sleep(2500);
  await p.screenshot({ path: path.join(DIR, '6_cruce' + suf + '.png') });
  out.coches = await p.evaluate(() => { const S = GM.sede._estado(); return S.coches.map(c => c.vel.toFixed(1)).join(' '); });
  out.gente = await p.evaluate(() => { const S = GM.sede._estado(); return { vecinos: S.gente.length, hinchas: S.gente.filter(n => n.hincha).length, calls: S.renderer.info.render.calls, tris: S.renderer.info.render.triangles }; });
  out.fps = Math.round(await p.evaluate(() => new Promise(res => { let f = 0; const t0 = performance.now(); (function k(t) { f++; if (t - t0 < 2000) requestAnimationFrame(k); else res(f * 1000 / (t - t0)); })(t0); })));
  // Volver a la sede
  await p.evaluate(() => GM.sede._escena('sede')); await sleep(9000); out.vuelta = await p.evaluate(() => GM.sede._estado().escena + ', gente ' + GM.sede._estado().gente.length);
  console.log(JSON.stringify(out, null, 1), '\nerrores:', errs.length ? errs.slice(0, 6) : 'ninguno');
  await b.close();
})();
