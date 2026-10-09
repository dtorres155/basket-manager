// Momento decisivo del partido en directo: fuerza un final apretado (empate antes del último cuarto) hasta que aparece la jugada y elige Tirar.
// Uso: node tools/momento_clave.js [gestor|carrera]   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'momento_clave'); fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms)), modo = process.argv[2] || 'gestor';
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  let ok = false;
  for (let intento = 0; intento < 25 && !ok; intento++) {
    ok = await p.evaluate(modo => {
      if (!window._st) { const pj = Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }); window._st = modo === 'carrera' ? GM.newGame('joventut-badalona', undefined, { modo: 'carrera', personaje: pj, carrera: { origen: 'europa', clubId: 'joventut-badalona', pos: 'SG', perfil: 'tirador', nac: 'ES', agente: 'equilibrado' } }) : GM.newGame('joventut-badalona', undefined, { modo: 'gestor', personaje: pj }); GM.ui.start(document.getElementById('app')); }
      if (window._ctl) window._ctl.cerrar();
      if (modo === 'carrera') { const st = GM.state, e = st.equipos[st.clubId], t = GM.mods.partidos.tacticaValida(st, st.clubId); if (t.quinteto.indexOf('yo') < 0) t.quinteto[0] = 'yo'; e.tactica = t; GM.state.jugadores.yo.ovr = 88; }
      const st = GM.state, g = st.calendario.find(x => !x.resultado && (x.local === st.clubId || x.visitante === st.clubId));
      const ctl = window._ctl = GM.mods.directo.abrir(st, g, { control: modo !== 'carrera', onFin: r => { window._fin = r; } });
      for (let q = 0; q < 3; q++) ctl.D.jugarCuarto(); ctl.D.B.score = ctl.D.A.score; ctl.D.prevB = ctl.D.prevA;
      [...document.querySelectorAll('.dir-ctrl button')].find(x => /Empezar/.test(x.textContent)).click();
      return !!ctl.ES.clave;
    }, modo);
  }
  console.log('momento decisivo:', ok);
  if (ok) {
    await p.evaluate(() => { window._ctl.ES.vel = 16; });
    for (let i = 0; i < 60; i++) { if (await p.evaluate(() => window._ctl.ES.fase === 'clave')) break; await sleep(500); }
    await sleep(600); await p.screenshot({ path: path.join(DIR, 'decision_' + modo + '.png') });
    console.log(await p.evaluate(() => document.querySelector('.dir-clave') ? document.querySelector('.dir-clave').innerText.replace(/\n+/g, ' | ') : 'sin panel'));
    await p.evaluate(() => [...document.querySelectorAll('.dir-clave button')][0].click()); await sleep(1500);
    console.log('narración:', await p.evaluate(() => [...document.querySelectorAll('.dir-linea')].slice(0, 2).map(e => e.textContent).join(' / ')));
    for (let i = 0; i < 60; i++) { if (await p.evaluate(() => window._ctl.ES.fase !== 'jugando')) break; await sleep(500); }
    await p.screenshot({ path: path.join(DIR, 'despues_' + modo + '.png') });
    console.log('fase:', await p.evaluate(() => window._ctl.ES.fase + ', marcador ' + window._ctl.ES.marcador.join('-') + ', terminado ' + window._ctl.D.terminado));
  }
  console.log('errores:', errs.length ? errs.slice(0, 6) : 'ninguno');
  await b.close();
})();
