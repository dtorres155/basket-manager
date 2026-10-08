// Capturas de Calendario: clasificación (también EuroCup y Champions), eliminatorias y líderes por competición.
// Uso: node tools/clasif_capturas.js [club] [dias]   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const CLUB = process.argv[2] || 'joventut-badalona', DIAS = +process.argv[3] || 80;
const DIR = path.join(__dirname, '..', 'capturas', 'clasificaciones'); fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  const comps = await p.evaluate(([club, dias]) => {
    GM.newGame(club, undefined, { modo: 'gestor', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc' }) });
    for (let i = 0; i < dias; i++) GM.mods.competiciones.jugarDia(GM.state);
    GM.ui.start(document.getElementById('app')); GM.ui.navegar('calendario');
    return GM.ligasDe(GM.state, club).concat(Object.keys(GM.state.continental || {}).filter(id => (GM.mods.continental.de(GM.state, club) || []).indexOf(id) >= 0));
  }, [CLUB, DIAS]);
  const clic = txt => p.evaluate(t => { const b = [...document.querySelectorAll('.cuerpo .tab')].find(x => x.textContent.trim() === t); if (b) b.click(); return !!b; }, txt);
  const CORTO = { EUROCUP: 'EuroCup', BCL: 'Champions', NBA: 'NBA', EUROLIGA: 'Euroliga', ACB: 'ACB', LEGA: 'Lega', GBL: 'Grecia', BBL: 'Alemania', BSL: 'Turquía' };
  for (const [tab, arch] of [['Clasificación', 'tabla'], ['Playoffs', 'playoffs'], ['Líderes', 'lideres']]) {
    await clic(tab); await sleep(300);
    for (const c of comps) { await clic(CORTO[c] || c); await sleep(300); await p.screenshot({ path: path.join(DIR, arch + '_' + c + '.png'), fullPage: true }); }
  }
  console.log('competiciones', comps.join(', '), '| errores:', errs.length ? errs.slice(0, 5) : 'ninguno');
  await b.close();
})();
