// Día de partido en casa en la ciudad real: previa (cola y peña), autobús del equipo y salida. Uso: node tools/real_partido.js [club]   (requiere `npm run serve`)
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs');
const club = process.argv[2] || 'real-madrid', DIR = path.join(__dirname, '..', 'capturas', 'real_partido'); fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }); const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(), errs = []; let mal = 0;
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8080/'); await sleep(700);
  await p.evaluate(c => { GM.newGame(c, undefined, { modo: 'gestor', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }) }); const st = GM.state, g = st.calendario.find(x => !x.resultado && x.local === st.clubId); st.fecha = g.fecha; GM.campus.config.calidad = 'alta'; GM.ui.start(document.getElementById('app')); GM.sede.abrir(st, 'calle'); }, club);
  await sleep(15000);
  for (const [hora, espera, foto] of [[10, 3, null], [18.5, 8, 'previa'], [19.05, 14, 'autobus'], [22.4, 8, 'salida']]) {
    await p.evaluate(h => { const S = GM.sede._estado(); S.hora = h; S.tLuz = 0; S.tFase = 0; }, hora); await sleep(espera * 1000);
    const info = await p.evaluate(() => { const S = GM.sede._estado(), P = S.partidoObj || {}; return { partidoCasa: S.partidoCasa, fase: S.fasePartido, cola: !!P.cola, bares: !!P.bares, salida: !!P.salida, bus: S.busEquipo && S.busEquipo.fase, ptoPab: S.ptoPab && S.ptoPab.map(Math.round) }; });
    console.log(hora, JSON.stringify(info));
    if (hora === 18.5 && !(info.cola && info.partidoCasa)) mal++;
    if (hora === 22.4 && !info.salida) mal++;
    if (foto) { await p.evaluate(zoom => { const S = GM.sede._estado(), q = S.busEquipo && S.busEquipo.obj ? S.busEquipo.obj.position : { x: S.ptoPab[0], z: S.ptoPab[1] }; S.yo.camino = null; S.yo.obj.position.set(S.ptoPab[0] + 3, 0, S.ptoPab[1] + 3); S.foco.set((q.x + S.ptoPab[0]) / 2, 0, (q.z + S.ptoPab[1]) / 2); S.zoom = zoom; if (S.panel) S.panel.style.display = 'none'; document.querySelectorAll('.sede-ayuda').forEach(e => e.remove()); }, foto === 'autobus' ? 26 : 22); await sleep(1500); await p.screenshot({ path: path.join(DIR, foto + '.png') }); }
  }
  if (errs.length) { console.log('ERRORES', errs.slice(0, 4)); mal++; }
  await b.close(); console.log(mal ? 'FALLOS ' + mal : 'día de partido correcto');
})();
