// Rendimiento del mundo explorable (sede, cruce y barrio): fps, ms de render, llamadas y desglose de mallas.
// Uso: node tools/perf_mundo.js [--lento] [--calidad=normal|alta]   (requiere `npm run serve`; --lento simula CPU x4)
const { chromium } = require('playwright');
const LENTO = process.argv.includes('--lento'), CAL = (process.argv.find(a => a.startsWith('--calidad=')) || '').split('=')[1], sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }), p = await ctx.newPage();
  await p.goto(process.env.URL || 'http://localhost:8080/'); if (CAL) { await p.evaluate(c => localStorage.setItem('gm1:calidad', c), CAL); await p.reload(); } await sleep(700);
  await p.evaluate(() => { localStorage.clear(); const pj = GM.mods.personaje.crear(); pj.nombre = 'Marc'; GM.newGame('joventut-badalona', undefined, { modo: 'gestor', personaje: pj }); GM.state.ciudad[GM.state.clubId].aficion = 70; GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state); });
  await sleep(9000);
  if (LENTO) await (await ctx.newCDPSession(p)).send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const medir = async (nombre) => {
    await sleep(2500);
    const r = await p.evaluate(() => new Promise(res => {
      const S = GM.sede._estado(), R = S.renderer, r0 = R.render.bind(R); let n = 0, ms = 0; R.render = (a, c) => { const t = performance.now(); r0(a, c); ms += performance.now() - t; n++; };
      let f = 0; const t0 = performance.now();
      (function k(t) { f++; if (t - t0 < 3000) requestAnimationFrame(k); else {
        R.render = r0; let piel = 0, estat = 0, sombra = 0; S.scene.traverse(o => { if (o.isMesh && o.visible) { if (o.isSkinnedMesh) piel++; else estat++; if (o.castShadow) sombra++; } });
        res({ fps: Math.round(f * 1000 / (t - t0)), msRender: +(ms / Math.max(1, n)).toFixed(1), calls: R.info.render.calls, tris: R.info.render.triangles, piel, estat, sombra, gente: S.gente.filter(g => g.obj.visible).length + '/' + S.gente.length });
      } })(t0);
    }));
    console.log(nombre.padEnd(8), JSON.stringify(r));
  };
  await p.evaluate(() => { const S = GM.sede._estado(); S.yo.obj.position.set(0, 0, 3.5); S.zoom = 30; }); await medir('sede');
  await p.evaluate(() => GM.sede._escena('calle')); await sleep(11000);
  await p.evaluate(() => { const S = GM.sede._estado(); S.yo.obj.position.set(0, 0, -4.5); S.zoom = 30; }); await medir('cruce');
  await p.evaluate(() => { const S = GM.sede._estado(); S.yo.obj.position.set(-2, 0, 44); S.zoom = 30; }); await medir('barrio');
  await b.close();
})();
