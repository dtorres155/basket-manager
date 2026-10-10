// Ir en bici: coger una bici compartida, sentarse en el sillín, pedalear al avanzar y dejarla. Capturas de cerca.
// Uso: node tools/bici_prueba.js [carpeta]   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', process.argv[2] || 'bici'); fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 760 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  await p.evaluate(() => {
    GM.newGame('joventut-badalona', undefined, { modo: 'carrera', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }), carrera: { origen: 'europa', clubId: 'joventut-badalona', pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 } });
    GM.campus.config.calidad = 'alta'; GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, 'calle');
  });
  await sleep(13000);
  const foto = async (n, yaw, zoom) => { await p.evaluate(([yaw, zoom]) => { const S = GM.sede._estado(); S.yaw = S.yawObj = yaw; S.zoom = zoom; if (S.panel) S.panel.style.display = 'none'; document.querySelectorAll('.sede-ayuda').forEach(e => e.remove()); }, [yaw, zoom]); await sleep(900); await p.screenshot({ path: path.join(DIR, n + '.png') }); };
  await p.evaluate(() => { const S = GM.sede._estado(); S.yo.camino = null; S.yo.obj.position.set(-30, 0, 4.5); });
  await p.evaluate(() => { const S = GM.sede._estado(), z = S.zonas.find(z => z.sala.id === 'bici_centro') || S.zonas.find(z => /bici/.test(z.sala.id)); z.sala.acciones(GM.state)[0].fn(); });
  await sleep(800); await foto('1_montada', 0.6, 5);
  const e = await p.evaluate(() => { const y = GM.sede._estado().yo; return { bici: y.bici, actual: y.actual, y: +y.obj.position.y.toFixed(2), objBici: !!y.biciObj }; }); console.log('estado', JSON.stringify(e));
  await p.evaluate(() => { const S = GM.sede._estado(); GM.sede._motor().irA(S.yo, 10, 4.5); });
  for (let i = 0; i < 4; i++) { await sleep(700); await foto('2_pedaleando_' + i, 0.6 + i * 0.35, 5); }
  await p.evaluate(() => { const S = GM.sede._estado(); S.yo.camino = null; }); await sleep(500); for (const [i, a] of [0, 1.57, 3.14, 4.71].entries()) await foto('3_parado_' + i, a, 4);
  const fase = await p.evaluate(() => GM.sede._estado().yo.fase); console.log('fase de pedaleo', fase);
  await p.evaluate(() => { GM.ciudadBarrios.bici(false); }); await sleep(900); await foto('4_a_pie', 0.6, 5);
  console.log('a pie:', await p.evaluate(() => { const y = GM.sede._estado().yo; return { bici: y.bici, actual: y.actual, y: y.obj.position.y, sentado: y.sentado }; }));
  console.log('errores:', errs.filter(e => !/404/.test(e)).slice(0, 6));
  await b.close();
})();
