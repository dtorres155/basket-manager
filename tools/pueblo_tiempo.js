// Tiempo de construcción del pueblo 3D por nivel (primera vez y al volver a abrirlo). Uso: node tools/pueblo_tiempo.js [--lento]  (requiere `npm run serve`)
const { chromium } = require('playwright');
const LENTO = process.argv.includes('--lento'), sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
  if (LENTO) await (await ctx.newCDPSession(p)).send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  await p.evaluate(() => {
    const orig = GM.pueblo3d.construir; window._tiempos = [];
    GM.pueblo3d.construir = function () { const t0 = performance.now(), r = orig.apply(this, arguments); window._tiempos.push(Math.round(performance.now() - t0)); return r; };
  });
  for (const nivel of [1, 3, 5]) {
    const abrir = () => p.evaluate(() => { GM.ui.navegar('inicio'); GM.ui.navegar('ciudad'); [...document.querySelectorAll('.cuerpo .tab')].find(x => x.textContent.includes('Mi pueblo')).click(); });
    await p.evaluate(nivel => {
      const pj = GM.mods.personaje.crear(); pj.nombre = 'Marc'; pj.apellido = 'Soler';
      GM.newGame('joventut-badalona', undefined, { modo: 'carrera', personaje: pj, carrera: { pos: 'SG', perfil: 'tirador', nac: 'ES', origen: 'europa', agente: 'equilibrado', clubId: 'joventut-badalona' } });
      const st = GM.state, P = st.carrera.pueblo, Pm = GM.mods.pueblo; P.nombre = 'Torrelles del Monte'; P.nac = 'ES'; P.cariño = 30 + nivel * 13; st.carrera.fama = 10 + nivel * 12;
      P.aportado = 0; while (Pm.estado(st).nivel < nivel && P.aportado < 5000) P.aportado += 10; while (Pm.estado(st).nivel > nivel && st.carrera.fama > 0) st.carrera.fama -= 2;
      P.edificios = Pm.edificios(st).filter(e => e.req <= nivel).map(e => ({ tipo: e.tipo, nivel: Math.min(e.max, nivel - e.req + 1) }));
      GM.ui.start(document.getElementById('app'));
    }, nivel);
    await abrir(); await sleep(1500); await abrir(); await sleep(1500);
    const t = await p.evaluate(() => window._tiempos.splice(0));
    const acc = await p.evaluate(() => { GM.mods.hogar.dinero && (GM.state.carrera.dinero += 100); const b = [...document.querySelectorAll('.panel3d .tab')].find(x => /Clínic/.test(x.textContent)); if (b) b.click(); return window._tiempos.splice(0).length; });
    console.log('nivel', nivel, 'construir (ms): primera', t[0], ', al volver', t[1], ', reconstrucciones tras una acción del panel:', acc);
  }
  console.log('errores:', errs.length ? errs.slice(0, 5) : 'ninguno');
  await b.close();
})();
