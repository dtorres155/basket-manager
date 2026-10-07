// Capturas del barrio (plaza, mercado, parque, terrazas). Uso: node tools/barrio_capturas.js  (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'barrio'); fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(700);
  await p.evaluate(() => { localStorage.clear(); const pj = GM.mods.personaje.crear(); pj.nombre = 'Marc'; GM.newGame('joventut-badalona', undefined, { modo: 'gestor', personaje: pj }); GM.state.ciudad[GM.state.clubId].aficion = 70; GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state); });
  await sleep(8000); await p.evaluate(() => GM.sede._escena('calle')); await sleep(10000);
  await p.evaluate(() => document.querySelectorAll('.sede-ayuda').forEach(e => e.style.display = 'none'));
  const vista = async (n, x, z, zoom, yaw, extra) => { await p.evaluate(([x, z, zoom, yaw]) => { const S = GM.sede._estado(); S.yo.camino = null; S.yo.obj.position.set(x, 0, z); S.foco.set(x, 0, z); S.zoom = zoom; S.yawObj = S.yaw = yaw; }, [x, z, zoom, yaw]); await sleep(extra || 2200); await p.screenshot({ path: path.join(DIR, n + '.png') }); };
  await vista('1_plaza_general', -2, 42, 36, 0.3);
  await vista('2_mercado', -24, 43, 15, 0.25);
  await vista('3_parque', 24, 44, 17, -0.4);
  await vista('4_terrazas', -4, 51.5, 15, Math.PI - 0.2);
  await vista('5_fuente_palomas', -4, 46.5, 10, 0.2, 600);
  await vista('5b_palomas_vuelan', -4, 44.2, 10, 0.2, 900);
  const fps = Math.round(await p.evaluate(() => new Promise(res => { let f = 0; const t0 = performance.now(); (function k(t) { f++; if (t - t0 < 2000) requestAnimationFrame(k); else res(f * 1000 / (t - t0)); })(t0); })));
  const info = await p.evaluate(() => { const S = GM.sede._estado(); return { calls: S.renderer.info.render.calls, tris: S.renderer.info.render.triangles, perros: S.perros.length }; });
  console.log(JSON.stringify({ fps, ...info }), '\nerrores:', errs.length ? errs.slice(0, 6) : 'ninguno'); await b.close();
})();
