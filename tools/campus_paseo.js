// Ciudad deportiva para pasear: vistas generales y a pie de calle (capturas/campus_paseo). Uso: node tools/campus_paseo.js [club] [carpeta]
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const club = process.argv[2] || 'joventut-badalona', DIR = path.join(__dirname, '..', 'capturas', process.argv[3] || 'campus_paseo'); fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 720 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  await p.evaluate(club => { GM.newGame(club, undefined, { modo: 'gestor', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }) }); window.__sinAdaptar = true; GM.campus.config.calidad = 'alta'; GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, 'deportiva'); }, club);
  await sleep(14000);
  const info = await p.evaluate(() => { const S = GM.sede._estado(), G = S.G; return { lim: [G.x0, G.z0, G.x0 + G.W * G.c, G.z0 + G.H * G.c], zonas: S.zonas.map(z => z.sala.id + '@' + z.obj.position.x.toFixed(0) + ',' + z.obj.position.z.toFixed(0)), spawn: S.spawnDeportiva, gente: S.gente.length }; });
  console.log(JSON.stringify(info));
  const vistas = [['general', 0, (info.lim[1] + info.lim[3]) / 2, 0.2, 150, 1.0], ['entrada', info.spawn.x, info.spawn.z - 6, 0.3, 30, 0.6], ['centro', 0, (info.lim[1] + info.lim[3]) / 2, 0.6, 40, 0.6], ['pie', 12, (info.lim[1] + info.lim[3]) / 2 + 10, 0.9, 14, 0.4]];
  for (const [n, x, z, yaw, zoom, inc] of vistas) {
    await p.evaluate(([x, z, yaw, zoom, inc]) => { const S = GM.sede._estado(); S.hora = 11; S.tLuz = 0; S.yo.obj.position.set(x, 0, z); S.yo.camino = null; S.foco.set(x, 0, z); S.yaw = S.yawObj = yaw; S.zoom = zoom; S.inc = inc; S.camera.far = 1200; S.camera.updateProjectionMatrix(); document.querySelectorAll('.sede-ayuda').forEach(e => e.remove()); if (S.panel) S.panel.style.display = 'none'; }, [x, z, yaw, zoom, inc]);
    await sleep(1800); await p.screenshot({ path: path.join(DIR, n + '.png') });
  }
  console.log('errores:', errs.length ? errs.slice(0, 5) : 'ninguno');
  await b.close();
})();
