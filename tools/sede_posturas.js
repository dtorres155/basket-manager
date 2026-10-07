// Comprueba posturas: sienta/coloca a la gente en todos los puntos de actividad y hace capturas de cerca sin paneles.
// Uso: node tools/sede_posturas.js   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'sede_posturas'); fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  await p.evaluate(() => { localStorage.clear(); const pj = GM.mods.personaje.crear(); pj.nombre = 'Marc'; pj.apellido = 'Soler'; GM.newGame('joventut-badalona', undefined, { modo: 'gestor', personaje: pj }); GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state); });
  await sleep(8000);
  const salas = [['cafeteria', -3, 10, 9, 2.6], ['vestuario', 15.5, -2, 9, 0.4], ['prensa', -14, 10, 10, 2.8], ['gimnasio', 6, -6, 11, 0.3], ['fisio', 16, -10, 9, -0.5]];
  for (const [sala, x, z, zoom, yaw] of salas) {
    await p.evaluate(([sala, x, z, zoom, yaw]) => {
      const S = GM.sede._estado(), P = GM.sedePlano.puntos[sala], libres = S.gente.filter(n => !n.fijo);
      document.querySelectorAll('.sede-hud').forEach(e => { if (!e.classList.contains('sede-top')) e.style.display = 'none'; });
      libres.forEach((n, i) => { const q = P[i % P.length]; if (i >= P.length) { n.obj.position.set(30, 0, 30); n.espera = 999; return; } n.camino = null; n.espera = 999; n.obj.position.set(q[0], 0, q[1]); n.obj.rotation.y = q[3] * Math.PI / 180; n.asiento = q[4] || 0.48; n.actual = null; GM.sede._anim(n, q[2]); });
      S.yo.obj.position.set(x, 0, z); S.yo.obj.visible = false; S.foco.set(x, 0, z); S.zoom = zoom; S.yawObj = yaw; S.yaw = yaw;
    }, [sala, x, z, zoom, yaw]);
    await sleep(1200); await p.evaluate(([x, z]) => { const S = GM.sede._estado(); S.foco.set(x, 0, z); }, [x, z]); await sleep(300);
    await p.screenshot({ path: path.join(DIR, sala + '.png') });
  }
  console.log('errores:', errs.length ? errs : 'ninguno'); await b.close();
})();
