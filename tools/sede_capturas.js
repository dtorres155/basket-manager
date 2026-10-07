// Capturas y prueba de la sede 3D. Uso: node tools/sede_capturas.js [carpeta] [--movil]  (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'sede'); fs.mkdirSync(DIR, { recursive: true });
const MOVIL = process.argv.includes('--movil'), sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const ctx = await b.newContext(MOVIL ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  const shot = n => p.screenshot({ path: path.join(DIR, n + '.png') });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  await p.evaluate(() => { localStorage.clear(); const pj = GM.mods.personaje.crear(); pj.nombre = 'Marc'; pj.apellido = 'Soler'; GM.newGame('joventut-badalona', undefined, { modo: 'gestor', personaje: pj }); GM.ui.start(document.getElementById('app')); const st = GM.state; const j = st.jugadores[st.equipos[st.clubId].plantilla[3]]; j.estado.lesion = { tipo: 'Esguince', dias: 12 }; });
  await sleep(500); await shot('01_inicio_boton');
  await p.click('.sede-entrar'); await sleep(6000); await shot('02_sede_entrada');
  const fps = await p.evaluate(() => new Promise(res => { let f = 0; const t0 = performance.now(); (function k(t) { f++; if (t - t0 < 2000) requestAnimationFrame(k); else res(f * 1000 / (t - t0)); })(t0); }));
  // Vista amplia de todo el edificio
  await p.evaluate(() => { const S = GM.sede._estado(); S.zoom = 42; S.foco.set(0, 0, 0); S.yo.obj.position.set(0, 0, 3.5); }); await sleep(1500); await shot('03_sede_general');
  // Caminar hasta el despacho tocando su anillo
  await p.evaluate(() => { const S = GM.sede._estado(); S.zoom = 20; S.yo.obj.position.set(6, 0, 12); }); await sleep(800);
  const llega = await p.evaluate(() => new Promise(res => { const S = GM.sede._estado(), z = S.zonas.find(z => z.sala.id === 'despacho'); const ok = (function () { const P = z.obj.position; return S.yo && GM.sede._estado() && true; })(); const c = GM.sede.aEstrella(S.G, [S.yo.obj.position.x, S.yo.obj.position.z], [z.obj.position.x, z.obj.position.z]); res(c ? c.length : 0); }));
  await p.evaluate(() => { const S = GM.sede._estado(), z = S.zonas.find(z => z.sala.id === 'vestuario'); const yo = S.yo; const P = z.obj.position; yo.camino = null; });
  await p.keyboard.down('w'); await sleep(1200); await p.keyboard.up('w'); await sleep(300); await shot('04_caminando_wasd');
  // Ir al vestuario por camino (A*) y ver el aviso de la sala
  await p.evaluate(() => { const S = GM.sede._estado(), z = S.zonas.find(z => z.sala.id === 'vestuario'); const yo = S.yo; GM.sede._estado().yo.rapido = true; (function () { const P = z.obj.position; const c = GM.sede.aEstrella(S.G, [yo.obj.position.x, yo.obj.position.z], [P.x, P.z]); yo.camino = c ? c.slice(1).concat([[P.x, P.z]]) : null; })(); });
  for (let i = 0; i < 30; i++) { await sleep(400); if (await p.evaluate(() => !(GM.sede._estado().yo.camino || []).length)) break; }
  await p.evaluate(() => { GM.sede._estado().yo.rapido = false; GM.sede._estado().yo.actual = null; }); await sleep(1500); await shot('05_vestuario_aviso');
  const aviso = await p.evaluate(() => { const a = document.querySelector('.sede-aviso'); return a && a.style.display !== 'none' ? a.innerText : null; });
  // Tocar a un jugador
  const npc = await p.evaluate(() => { const S = GM.sede._estado(), r = S.renderer.domElement.getBoundingClientRect(); for (const n of S.gente) { const v = n.obj.position.clone(); v.y = 0.8; v.project(S.camera); const x = r.left + (v.x + 1) / 2 * r.width, y = r.top + (1 - v.y) / 2 * r.height; if (x > 80 && x < r.width - 80 && y > 160 && y < r.height - 120) return [x, y]; } return [r.width / 2, r.height / 2]; });
  await p.mouse.click(npc[0], npc[1]); await sleep(600); await shot('06_ficha_jugador');
  const ficha = await p.evaluate(() => { const a = document.querySelector('.sede-ficha'); return a && a.style.display !== 'none' ? a.innerText.replace(/\n/g, ' | ') : null; });
  // Entrar en la sala (abre la pantalla clásica) y volver
  await p.keyboard.press('e'); await sleep(700); await shot('07_pantalla_plantilla');
  const enPantalla = await p.evaluate(() => document.querySelector('.sede').style.display === 'none' && !!document.querySelector('.sede-volver'));
  await p.click('.sede-volver'); await sleep(1500);
  // Vista cercana de la pista y el gimnasio
  await p.evaluate(() => { const S = GM.sede._estado(); S.zoom = 16; S.yo.obj.position.set(-4, 0, 3.5); S.yawObj = 0.6; }); await sleep(2500); await shot('08_pista');
  await p.evaluate(() => { const S = GM.sede._estado(); S.zoom = 14; S.yo.obj.position.set(9, 0, 3.6); S.yawObj = -0.5; }); await sleep(2500); await shot('09_gimnasio_vestuario');
  await p.evaluate(() => { const S = GM.sede._estado(); S.zoom = 14; S.yo.obj.position.set(-8, 0, 4); S.yawObj = Math.PI; }); await sleep(2500); await shot('10_prensa_cafeteria');
  await p.evaluate(() => { const S = GM.sede._estado(); S.zoom = 13; S.yo.obj.position.set(12, 0, 6); S.yawObj = Math.PI - 0.4; }); await sleep(2500); await shot('11_despacho_recepcion');
  const info = await p.evaluate(() => { const S = GM.sede._estado(); return { gente: S.gente.length, enFisio: S.gente.filter(n => n.punto && GM.sedePlano.puntos.fisio.includes(n.punto)).length, calls: S.renderer.info.render.calls, tris: S.renderer.info.render.triangles }; });
  console.log(JSON.stringify({ fps: Math.round(fps), caminoDespacho: llega, aviso, ficha, enPantalla, info }, null, 1), '\nerrores:', errs.slice(0, 8));
  await b.close();
})();
