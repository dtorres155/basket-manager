// Prueba la vida de la sede: tiros a canasta (gesto, vuelo, aciertos) y charlas con bocadillos.
// Uso: node tools/sede_vida.js   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'sede_vida'); fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  await p.evaluate(() => { localStorage.clear(); const pj = GM.mods.personaje.crear(); pj.nombre = 'Marc'; GM.newGame('joventut-badalona', undefined, { modo: 'gestor', personaje: pj }); GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state); });
  await sleep(8000);
  // Cuatro tiradores en la canasta derecha y dos charlando en el pasillo
  await p.evaluate(() => {
    const S = GM.sede._estado(), P = GM.sedePlano.puntos, libres = S.gente.filter(n => !n.fijo);
    document.querySelectorAll('.sede-ayuda').forEach(e => e.style.display = 'none');
    const tiros = P.pista.filter(q => q[2] === 'tiro' && q[0] > -8);
    libres.slice(0, 4).forEach((n, i) => { const q = tiros[i]; n.camino = null; n.espera = 999; n.punto = q; n.obj.position.set(q[0], 0, q[1]); n.actual = null; GM.sede._anim(n, 'idle'); GM.sede._tiro(n); n.tiro.t = -i * 0.6; });
    libres.slice(4, 6).forEach((n, i) => { const q = P.charla[i]; n.camino = null; n.espera = 999; n.punto = q; n.obj.position.set(q[0], 0, q[1]); n.obj.rotation.y = q[3] * Math.PI / 180; n.actual = null; GM.sede._anim(n, 'idle'); });
    libres.slice(6).forEach(n => { n.obj.position.set(40, 0, 40); n.camino = null; n.espera = 999; });
    S.yo.obj.visible = false; S.yo.obj.position.set(-4, 0, -3); S.zoom = 11; S.yawObj = S.yaw = 0.5;
  });
  const fases = [];
  for (let i = 0; i < 6; i++) { await sleep(i ? 520 : 1500); await p.evaluate(() => GM.sede._estado().foco.set(-3, 0, -5.5)); await p.screenshot({ path: path.join(DIR, 'tiro_' + i + '.png') }); fases.push(await p.evaluate(() => GM.sede._estado().gente.filter(n => n.tiro).map(n => n.tiro.fase).join(','))); }
  // Cuenta de aciertos durante 20 s
  const r = await p.evaluate(() => new Promise(res => { const S = GM.sede._estado(); let canastas = 0, tiros = 0; const vis = new Set(); const iv = setInterval(() => { S.gente.forEach(n => { if (n.tiro && n.tiro.fase === 'suelto' && !vis.has(n.tiro.ini)) { vis.add(n.tiro.ini); tiros++; if (n.tiro.mete) canastas++; } }); }, 50); setTimeout(() => { clearInterval(iv); res({ tiros, canastas }); }, 20000); }));
  await p.evaluate(() => { const S = GM.sede._estado(); S.foco.set(-11, 0, 3.6); S.zoom = 9; S.tCharla = 0; }); await sleep(900);
  await p.evaluate(() => GM.sede._estado().foco.set(-11, 0, 3.6)); await p.screenshot({ path: path.join(DIR, 'charla.png') });
  const bocadillos = await p.evaluate(() => [...document.querySelectorAll('.sede-bocadillo')].map(e => e.textContent));
  console.log(JSON.stringify({ fases, ...r, bocadillos }, null, 1), '\nerrores:', errs.length ? errs : 'ninguno');
  await b.close();
})();
