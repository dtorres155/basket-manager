// Rendimiento de la ciudad real: llamadas de dibujo, triángulos y fotogramas por segundo (CPU x4). Uso: node tools/real_fps.js [club] [normal|alta]   (requiere `npm run serve`)
const { chromium } = require('playwright');
const club = process.argv[2] || 'real-madrid', cal = process.argv[3] || 'normal', sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }), c = await b.newContext({ viewport: { width: 1280, height: 800 } }), p = await c.newPage();
  await p.goto('http://localhost:8080/'); await sleep(700);
  await p.evaluate(([c, cal]) => { GM.newGame(c, undefined, { modo: 'carrera', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'M', apellido: 'S' }), carrera: { origen: 'europa', clubId: c, pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 } }); GM.campus.config.calidad = cal; GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, 'calle'); }, [club, cal]);
  await sleep(16000);
  const cdp = await c.newCDPSession(p); const medir = async x => { await cdp.send('Emulation.setCPUThrottlingRate', { rate: x }); await sleep(800); return p.evaluate(() => new Promise(r => { let n = 0; const t = performance.now(); (function f() { n++; if (performance.now() - t > 4000) r(Math.round(n / 4)); else requestAnimationFrame(f); })(); })); };
  const info = await p.evaluate(() => { const i = GM.sede._estado().renderer.info; return { llamadas: i.render.calls, triangulos: i.render.triangles, geometrias: i.memory.geometries, texturas: i.memory.textures }; });
  console.log(club, cal, JSON.stringify(info), 'fps x1', await medir(1), 'x4', await medir(4)); await b.close();
})();
