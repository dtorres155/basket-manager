// Sede con más vida: acciones nuevas de cada sala, personal añadido y detalles con datos (próximo rival, quinteto, clasificación).
// Uso: node tools/sede_vida.js   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'sede_vida'); fs.mkdirSync(DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 760 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  await p.evaluate(() => {
    GM.newGame('real-madrid', undefined, { modo: 'gestor', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }) });
    GM.campus.config.calidad = 'alta'; GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, 'sede');
  });
  await sleep(12000);
  console.log(await p.evaluate(() => {
    const A = GM.mods.sedeAcciones, st = GM.state, out = [];
    ['pista', 'vestuario', 'gimnasio', 'fisio', 'prensa', 'cafeteria', 'recepcion', 'despacho'].forEach(s => { const l = A.acciones(st, s); out.push(s + ': ' + l.length + ' acciones'); l.filter(a => !a.panel).forEach(a => { const r = A.hacer(st, a.id); out.push('   ' + a.t + ' -> ' + (r.ok ? r.texto : 'NO: ' + r.motivo)); }); });
    out.push('personal: ' + GM.sede._estado().gente.filter(n => n.fijo).map(n => n.rol).join(', '));
    return out.join('\n');
  }));
  for (const [n, x, z, yaw, zoom, inc] of [['recepcion', 7.5, 8, -1.3, 7, 0.55], ['despacho', 11.5, 11, 1.4, 6, 0.45], ['pista', -3, -1, -1.5, 9, 0.55], ['fisio', 15, -11, -1.2, 7, 0.6], ['vestuario', 15, -3, 0.3, 7, 0.7]]) {
    await p.evaluate(([x, z, yaw, zoom, inc]) => { const S = GM.sede._estado(); S.yo.obj.position.set(x, 0, z); S.yo.camino = null; S.foco.set(x, 0, z); S.yaw = S.yawObj = yaw; S.zoom = zoom; S.inc = inc; if (S.panel) S.panel.style.display = 'none'; document.querySelectorAll('.sede-ayuda').forEach(e => e.remove()); }, [x, z, yaw, zoom, inc]);
    await sleep(1800); await p.screenshot({ path: path.join(DIR, n + '.png') });
  }
  console.log('errores:', errs.length ? errs.slice(0, 6) : 'ninguno');
  await b.close();
})();
