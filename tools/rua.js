// Rúa de campeones: da un título al club (entrada en el historial), avanza un día y abre la calle para ver el autobús descapotable.
// Uso: node tools/rua.js [club]   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'rua'); fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms)), club = process.argv[2] || 'joventut-badalona';
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 760 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  console.log(await p.evaluate(club => {
    GM.newGame(club, undefined, { modo: 'gestor', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }) });
    const st = GM.state; st.historial.push({ temporada: st.temporada, comp: Object.keys(st.copas || {})[0] || 'ACB', campeon: st.clubId });
    GM.mods.rua.revisar(st);
    GM.campus.config.calidad = 'alta'; GM.ui.start(document.getElementById('app')); GM.sede.abrir(st, 'calle');
    return 'rúa: ' + JSON.stringify(st.rua) + ', activa ' + GM.mods.rua.activa(st) + ', selfTest ' + GM.mods.rua.selfTest() + '\nnoticia: ' + st.noticias[0].texto;
  }, club));
  await sleep(14000);
  console.log(await p.evaluate(() => { const S = GM.sede._estado(); return 'en escena: ' + (S.rua ? 'autobús en x=' + S.rua.x.toFixed(1) + ', ' + S.rua.gente.length + ' jugadores, ' + S.rua.fans.length + ' aficionados' : 'no') + ', coches ' + S.coches.length; }));
  for (const [n, yaw, zoom, inc] of [['rua_cerca', 0.7, 16, 0.45], ['rua_lejos', 0.3, 42, 0.7], ['rua_planta', 0.01, 60, 1.45]]) {
    await p.evaluate(([yaw, zoom, inc]) => { const S = GM.sede._estado(), x = S.rua.x; S.yo.obj.position.set(x + 2, 0, 4.6); S.yo.camino = null; S.foco.set(x + 2, 0, 4.6); S.yaw = S.yawObj = yaw; S.zoom = zoom; S.inc = inc; document.querySelectorAll('.sede-ayuda,.toast').forEach(e => e.remove()); }, [yaw, zoom, inc]);
    await sleep(1500); await p.screenshot({ path: path.join(DIR, n + '.png') });
  }
  console.log('errores:', errs.length ? errs.slice(0, 6) : 'ninguno');
  await b.close();
})();
