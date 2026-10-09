// Rutinas por hora y día de partido en casa en la calle: gente visible a cada hora, previa (bares y cola en taquillas),
// llegada del autobús del equipo, partido y salida del público. Uso: node tools/dia_partido.js [--normal]   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'dia_partido'); fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms)), normal = process.argv.includes('--normal');
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 720 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split(String.fromCharCode(10)).slice(1, 3).join(' '))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  await p.evaluate(normal => {
    GM.newGame('joventut-badalona', undefined, { modo: 'gestor', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }) });
    const st = GM.state, g = st.calendario.find(x => !x.resultado && x.local === st.clubId); st.fecha = g.fecha; window.__sinAdaptar = true;
    GM.campus.config.calidad = normal ? 'normal' : 'alta'; GM.ui.start(document.getElementById('app')); GM.sede.abrir(st, 'calle');
  }, normal);
  await sleep(14000);
  const vista = (x, z, yaw, zoom, inc) => p.evaluate(([x, z, yaw, zoom, inc]) => { const S = GM.sede._estado(); S.yo.obj.position.set(x, 0, z); S.yo.camino = null; S.foco.set(x, 0, z); S.yaw = S.yawObj = yaw; S.zoom = zoom; S.inc = inc; document.querySelectorAll('.sede-ayuda,.toast').forEach(e => e.remove()); if (S.panel) S.panel.style.display = 'none'; }, [x, z, yaw, zoom, inc]);
  for (const [hora, espera, foto] of [[8, 25, 'manana'], [12, 25, null], [14, 25, 'comida'], [18.5, 20, 'previa'], [19.05, 9, 'autobus'], [21, 10, null], [22.4, 18, 'salida']]) {
    await p.evaluate(h => { const S = GM.sede._estado(); S.hora = h; S.tLuz = 0; S.tFase = 0; S.gente.forEach(n => { if (n.peaton) n.espera = Math.min(n.espera || 0, 0.5); }); }, hora);
    await sleep(espera * 1000);
    const info = await p.evaluate(() => { const S = GM.sede._estado(), vis = S.gente.filter(n => n.peaton && !n.oculto).length, tot = S.gente.filter(n => n.peaton).length, dest = {}; S.gente.filter(n => n.peaton && !n.oculto && n.destino).forEach(n => { dest[n.destino] = (dest[n.destino] || 0) + 1; }); return Math.floor(S.hora) + ':' + String(Math.round((S.hora % 1) * 60)).padStart(2, '0') + ' gente en la calle ' + vis + ' de ' + tot + ' ' + JSON.stringify(dest) + ', fase ' + S.fasePartido + (S.busEquipo ? ', autobús ' + S.busEquipo.fase + ' x=' + S.busEquipo.obj.position.x.toFixed(0) : ''); });
    console.log(info);
    if (foto === 'previa') { await vista(-6, 2, 0.35, 26, 0.7); await sleep(1500); await p.screenshot({ path: path.join(DIR, 'previa_taquillas.png') }); await vista(19, 9, 0.5, 18, 0.65); await sleep(1500); await p.screenshot({ path: path.join(DIR, 'previa_pena.png') }); }
    else if (foto === 'autobus') { await vista(-12, 2, 1.25, 22, 0.55); await sleep(1500); await p.screenshot({ path: path.join(DIR, 'autobus.png') }); }
    else if (foto) { await vista(0, 10, 0.4, 42, 0.85); await sleep(1500); await p.screenshot({ path: path.join(DIR, foto + '.png') }); }
  }
  console.log('errores:', errs.length ? errs.slice(0, 6) : 'ninguno');
  await b.close();
})();
