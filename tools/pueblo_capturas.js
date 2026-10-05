// Capturas del pueblo 3D por nivel y estilo. Uso: node tools/pueblo_capturas.js [carpeta] [--lento]  (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'pueblo'); fs.mkdirSync(DIR, { recursive: true });
const LENTO = process.argv.includes('--lento'), sleep = ms => new Promise(r => setTimeout(r, ms));
const CASOS = [
  ['castellano', 'Torrelles del Monte', 'ES', [1, 2, 3, 4, 5]],
  ['catalan', 'Vilanova de Sau', 'ES', [3, 5]],
  ['andaluz', 'Alcudia de la Sierra', 'ES', [3, 5]],
  ['toscano', 'Borgo San Pietro', 'IT', [5]]
];
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  if (LENTO) await (await ctx.newCDPSession(p)).send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  for (const [estilo, nombre, nac, niveles] of CASOS) for (const nivel of niveles) {
    const info = await p.evaluate(([nombre, nac, nivel]) => {
      const pj = GM.mods.personaje.crear(); pj.nombre = 'Marc'; pj.apellido = 'Soler';
      GM.newGame('joventut-badalona', undefined, { modo: 'carrera', personaje: pj, carrera: { pos: 'SG', perfil: 'tirador', nac: 'ES', origen: 'europa', agente: 'equilibrado', clubId: 'joventut-badalona' } });
      const st = GM.state, P = st.carrera.pueblo, Pm = GM.mods.pueblo; P.nombre = nombre; P.nac = nac; P.cariño = 30 + nivel * 13; st.carrera.fama = 10 + nivel * 12;
      P.aportado = 0; while (Pm.estado(st).nivel < nivel && P.aportado < 5000) P.aportado += 10; while (Pm.estado(st).nivel > nivel && st.carrera.fama > 0) st.carrera.fama -= 2;
      P.edificios = Pm.edificios(st).filter(e => e.req <= nivel).map(e => ({ tipo: e.tipo, nivel: Math.min(e.max, nivel - e.req + 1) }));
      GM.ui.start(document.getElementById('app')); GM.ui.navegar('ciudad');
      const t = [...document.querySelectorAll('.cuerpo .tab')].find(x => x.textContent.includes('Mi pueblo')); t.click();
      return Pm.estado(st).nivel;
    }, [nombre, nac, nivel]);
    await sleep(2500);
    const r = await p.evaluate(() => new Promise(res => { let f = 0; const t0 = performance.now(); (function k(t) { f++; if (t - t0 < 2000) requestAnimationFrame(k); else res(f * 1000 / (t - t0)); })(t0); }));
    const el = await p.$('.cuerpo canvas');
    const f = estilo + '_nivel' + info + '.png'; if (el) await el.screenshot({ path: path.join(DIR, f) });
    console.log(f, r.toFixed(0) + ' fps');
    if (el && info === 5) { const bb = await el.boundingBox(); await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.wheel(0, -640); await sleep(700); await el.screenshot({ path: path.join(DIR, estilo + '_nivel5_cerca.png') }); }
  }
  console.log('errores:', errs.length ? errs.slice(0, 5) : 'ninguno');
  await b.close();
})();
