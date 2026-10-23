// Capturas con datos: All-Star y rivalidades (febrero) y pretemporada, torneo y selección (septiembre del año siguiente). Uso: node tools/temporada_capturas.js   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'),
  fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'temporada_ui');
fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 430, height: 900 } })).newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8080/');
  await sleep(700);
  await p.evaluate(() => {
    GM.newGame('real-madrid', undefined, { modo: 'gestor', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }) });
    const st = GM.state,
      C = GM.mods.competiciones;
    while (st.fecha < '2027-02-20') C.jugarDia(st);
    GM.ui.start(document.getElementById('app'));
  });
  await sleep(1500);
  const nav = t =>
      p.evaluate(t => {
        const b = [...document.querySelectorAll('.navb')].find(x => x.textContent.trim() === t);
        if (b) b.click();
      }, t),
    tab = t =>
      p.evaluate(t => {
        const b = [...document.querySelectorAll('.tabs .tab')].find(x => x.textContent.trim() === t);
        if (b) b.click();
      }, t);
  const foto = async n => {
    await sleep(600);
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.screenshot({ path: path.join(DIR, 'datos_' + n + '.png'), fullPage: false });
  };
  await nav('Calendario');
  await sleep(400);
  await tab('All-Star');
  await foto('allstar');
  await tab('Rivalidades');
  await foto('rivalidades');
  await p.evaluate(() => {
    const st = GM.state,
      C = GM.mods.competiciones;
    let g = 0;
    while (!st.temporadaTerminada && g++ < 500) C.jugarDia(st);
    C.nuevaTemporada(st);
    st.temporadaTerminada = false;
    while (st.fecha < '2027-09-20') C.jugarDia(st);
    GM.ui.refrescar ? GM.ui.refrescar(true) : null;
  });
  await sleep(800);
  await nav('Calendario');
  await sleep(400);
  await tab('Pretemporada');
  await foto('pretemporada');
  await nav('Club');
  await sleep(400);
  await tab('Prensa');
  await foto('prensa');
  await nav('Ciudad');
  await sleep(400);
  await tab('La ciudad crece');
  await foto('ciudad');
  console.log('errores:', errs.length ? errs.slice(0, 4) : 'ninguno');
  await b.close();
})();
