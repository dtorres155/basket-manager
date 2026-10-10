// Rendimiento del pueblo paseable: llamadas, triángulos, mallas y fps en tres vistas, con la CPU limitada.
// Uso: node tools/perf_pueblo.js [--lento] [--calidad=normal|alta] [--nivel=max]   (requiere `npm run serve`)
const { chromium } = require('playwright'); const LENTO = process.argv.includes('--lento'), CAL = (process.argv.find(a => a.startsWith('--calidad=')) || '').split('=')[1] || 'alta', sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' }), ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }), p = await ctx.newPage();
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  await p.evaluate(cal => { const pj = Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }); GM.newGame('joventut-badalona', undefined, { modo: 'carrera', personaje: pj, carrera: { origen: 'europa', clubId: 'joventut-badalona', pos: 'SG', perfil: 'tirador', nac: 'ES', agente: 'equilibrado' } }); const st = GM.state, P = st.carrera.pueblo, E = GM.mods.pueblo.EDI; P.cariño = 90; st.carrera.fama = 80; P.aportado = 5000; P.edificios = Object.keys(E).map(k => ({ tipo: k, nivel: E[k].max })); GM.campus.config.calidad = cal; GM.ui.start(document.getElementById('app')); const t0 = performance.now(); GM.sede.abrir(st, 'pueblo'); window.__t0 = t0; }, CAL);
  await sleep(14000); const tc = await p.evaluate(() => performance.now() - window.__t0); console.log('calidad', CAL, '| espera de carga ~', Math.round(tc), 'ms (incluye la espera fija)');
  if (LENTO) await (await ctx.newCDPSession(p)).send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const medir = async n => { await sleep(2500); const r = await p.evaluate(() => new Promise(res => { const S = GM.sede._estado(), R = S.renderer; let f = 0; const t0 = performance.now(); (function k(t) { f++; if (t - t0 < 3000) requestAnimationFrame(k); else { let m = 0, inst = 0, sombra = 0; S.scene.traverse(o => { if (o.isMesh && o.visible) { m++; if (o.isInstancedMesh) inst++; if (o.castShadow) sombra++; } }); res({ fps: Math.round(f * 1000 / (t - t0)), calls: R.info.render.calls, tris: R.info.render.triangles, mallas: m, instanciadas: inst, sombra, geos: R.info.memory.geometries, gente: S.gente.length }); } })(t0); })); console.log(n.padEnd(10), JSON.stringify(r)); };
  await p.evaluate(() => { const S = GM.sede._estado(); S.yo.obj.position.set(0, 0, 8); S.foco.set(0, 0, 8); S.zoom = 30; document.querySelectorAll('.sede-ayuda').forEach(e => e.remove()); }); await medir('plaza');
  await p.evaluate(() => { const S = GM.sede._estado(); S.yo.obj.position.set(0, 0, 0); S.foco.set(0, 0, 0); S.zoom = 110; S.inc = 1.15; }); await medir('general');
  await p.evaluate(() => { const S = GM.sede._estado(); S.yo.obj.position.set(0, 0, 40); S.foco.set(0, 0, 40); S.zoom = 150; S.inc = 0.42; }); await medir('paisaje');
  await b.close();
})();
