// Capturas de la ciudad deportiva con todos los edificios a un nivel dado. Uso: node tools/campus_capturas.js [nivel] [club]  (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const NIVEL = +process.argv[2] || 3, CLUB = process.argv[3] || 'joventut-badalona';
const DIR = path.join(__dirname, '..', 'capturas', 'campus'); fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  const n = await p.evaluate(([club, nivel]) => {
    GM.newGame(club, undefined, { modo: 'gestor' });
    const CD = GM.mods.ciudadDeportiva, st = GM.state, cd = st.instalaciones[club].ciudadDeportiva;
    GM.campus.config.calidad = 'alta';
    cd.edificios = CD.parcelas(st, club).map(s => ({ slot: s.id, tipo: s.tipo, nivel: Math.min(nivel, CD.catalogo().find(c => c.tipo === s.tipo).nivelMax), obra: null }));
    GM.ui.start(document.getElementById('app')); GM.ui.navegar('club');
    const t = [...document.querySelectorAll('.cuerpo .tab')].find(x => x.textContent.includes('Ciudad deportiva')); if (t) t.click();
    return cd.edificios.length;
  }, [CLUB, NIVEL]);
  await sleep(2500);
  const el = await p.$('.cuerpo canvas');
  if (el) {
    await el.screenshot({ path: path.join(DIR, CLUB + '_nivel' + NIVEL + '.png') });
    const bb = await el.boundingBox(); await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.wheel(0, -500); await sleep(800);
    await el.screenshot({ path: path.join(DIR, CLUB + '_nivel' + NIVEL + '_cerca.png') });
  }
  console.log('edificios', n, 'canvas', !!el, 'errores:', errs.length ? errs.slice(0, 5) : 'ninguno');
  await b.close();
})();
