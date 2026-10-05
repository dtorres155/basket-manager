// Perfil de las escenas 3D: llamadas de dibujo, triángulos, objetos, tiempo de render y de animación por fotograma.
// Uso: node tools/perfil.js [--lento] [--calidad=normal|alta]   (requiere `npm run serve`; --lento simula CPU x4)
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://localhost:8080/', LENTO = process.argv.includes('--lento'), CAL = (process.argv.find(a => a.startsWith('--calidad=')) || '').split('=')[1];
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  if (LENTO) await (await ctx.newCDPSession(p)).send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.goto(URL); if (CAL) { await p.evaluate(c => localStorage.setItem('gm1:calidad', c), CAL); await p.reload(); } await sleep(1000);
  // Instrumenta el render para medir su coste
  await p.evaluate(() => {
    // En r128 render es una propiedad de cada instancia: se envuelve el constructor
    const Orig = THREE.WebGLRenderer; window.__perf = { n: 0, ms: 0, info: null, escena: null };
    THREE.WebGLRenderer = function (o) { const r = new Orig(o), r0 = r.render.bind(r);
      r.render = function (s, c) { const t = performance.now(); r0(s, c); const P = window.__perf; P.n++; P.ms += performance.now() - t; P.info = { calls: r.info.render.calls, tris: r.info.render.triangles, geos: r.info.memory.geometries, tex: r.info.memory.textures }; P.escena = s; };
      return r; };
  });
  const medir = async (nombre) => {
    await sleep(2500);
    const r = await p.evaluate(() => new Promise(res => {
      const P = window.__perf; P.n = 0; P.ms = 0; let f = 0; const t0 = performance.now();
      (function tick(t) { f++; if (t - t0 < 3000) requestAnimationFrame(tick); else {
        let obj = 0, mallas = 0, luces = 0, sombras = 0; if (P.escena) P.escena.traverse(o => { obj++; if (o.isMesh) { mallas++; if (o.castShadow) sombras++; } if (o.isLight) luces++; });
        res({ fps: f * 1000 / (t - t0), renders: P.n, msRender: P.n ? P.ms / P.n : 0, info: P.info, obj, mallas, luces, sombras });
      } })(t0);
    }));
    console.log(nombre.padEnd(18), (r.fps.toFixed(0) + ' fps').padEnd(8), 'render', r.msRender.toFixed(1) + ' ms x' + r.renders, '| calls', r.info && r.info.calls, 'tris', r.info && r.info.tris, '| mallas', r.mallas, 'objetos', r.obj, 'con sombra', r.sombras, 'luces', r.luces);
  };
  await p.evaluate(() => { const pj = GM.mods.personaje.crear(); pj.nombre = 'Marc'; pj.apellido = 'Soler'; GM.newGame('joventut-badalona', undefined, { modo: 'gestor', personaje: pj }); GM.ui.start(document.getElementById('app')); });
  const tab = async t => p.evaluate(t => { const b = [...document.querySelectorAll('.cuerpo .tab')].find(x => x.textContent.includes(t)); if (b) b.click(); }, t);
  await p.evaluate(() => GM.ui.navegar('club')); await medir('ciudad deportiva');
  await tab('Estadio'); await medir('pabellón');
  await p.evaluate(() => GM.ui.navegar('ciudad')); await tab('Mapa 3D'); await medir('mapa ciudad');
  await p.evaluate(() => { const b = [...document.querySelectorAll('.cuerpo button')].find(x => x.textContent.includes('Calle')); if (b) b.click(); }); await medir('calle');
  await p.evaluate(() => { const pj = GM.mods.personaje.crear(); pj.nombre = 'Marc'; pj.apellido = 'Soler'; GM.newGame('joventut-badalona', undefined, { modo: 'carrera', personaje: pj, carrera: { pos: 'SG', perfil: 'tirador', nac: 'ES', origen: 'europa', agente: 'equilibrado', clubId: 'joventut-badalona' } }); GM.ui.start(document.getElementById('app')); GM.ui.navegar('ciudad'); });
  await tab('Mi pueblo'); await medir('pueblo');
  await tab('Mi casa'); await medir('casa');
  await b.close();
})();
