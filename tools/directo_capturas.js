// Partido en directo con animaciones de baloncesto (punto 30): empieza el partido a velocidad normal y saca capturas cada pocos segundos (tiros, botes, defensa, árbitros, banquillo).
// Uso: node tools/directo_capturas.js [n=8] [segundos=2.5]   (requiere `npm run serve`; CAL=alta para la calidad alta, con las personas de Mixamo)
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const N = +(process.argv[2] || 8),
  DT = +(process.argv[3] || 2.5) * 1000,
  DIR = path.join(__dirname, '..', 'capturas', 'directo');
fs.mkdirSync(DIR, { recursive: true });
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }),
    p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => {
    if (m.type() === 'error') errs.push(m.text());
  });
  await p.goto('http://localhost:8080/');
  await sleep(800);
  await p.evaluate(cal => {
    const st = GM.newGame('joventut-badalona');
    if (cal) GM.campus.config.calidad = cal;
    GM.ui.start(document.getElementById('app'));
    const g = st.calendario.find(x => !x.resultado && (x.local === st.clubId || x.visitante === st.clubId));
    window._ctl = GM.mods.directo.abrir(st, g, {
      control: true,
      onFin: r => {
        window._fin = r;
      }
    });
    [...document.querySelectorAll('.dir-ctrl button')].find(x => /Empezar/.test(x.textContent)).click();
    window._ctl.ES.vel = 1;
  }, process.env.CAL || '');
  await sleep(6000);
  for (let i = 0; i < N; i++) {
    await p.screenshot({ path: path.join(DIR, 'directo_' + i + '.png') });
    await sleep(DT);
  }
  console.log('errores:', errs.length ? errs.slice(0, 6) : 'ninguno');
  await b.close();
})();
