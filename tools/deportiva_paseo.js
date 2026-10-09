// La ciudad deportiva para pasear (escena 'deportiva'): el mismo campus del menú a tamaño real, zonas por edificio y salida a la calle.
// Uso: node tools/deportiva_paseo.js [modo] [club]   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'deportiva'); fs.mkdirSync(DIR, { recursive: true });
const MODO = process.argv[2] || 'gestor', CLUB = process.argv[3] || 'joventut-badalona', sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 760 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  await p.evaluate(([modo, club]) => { const pj = Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' }); GM.newGame(club, undefined, modo === 'carrera' ? { modo, personaje: pj, carrera: { origen: 'europa', clubId: club, pos: 'SG', perfil: 'tirador', nac: 'ES', agente: 'equilibrado' } } : { modo, personaje: pj }); GM.campus.config.calidad = 'alta'; GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, 'calle'); }, [MODO, CLUB]);
  await sleep(12000);
  const entrada = await p.evaluate(async () => { const S = GM.sede._estado(), z = S.zonas.find(z => z.sala.id === 'lugar_campus'); if (!z || z.sala.irA !== 'deportiva') return 'sin puerta'; await GM.sede._escena('deportiva'); await new Promise(r => setTimeout(r, 7000)); const S2 = GM.sede._estado(); return S2.escena + ', ' + S2.zonas.length + ' zonas, ' + S2.gente.length + ' personas, ' + S2.calleNombre; });
  console.log('entrada:', entrada);
  const vistas = [['1_general', 0, 0, 0.4, 150, 1.0], ['2_entrada', 0, 80, 0, 40, 0.55], ['3_edificio', null]];
  for (const [n, x, z, yaw, zoom, inc] of vistas) {
    await p.evaluate(([x, z, yaw, zoom, inc]) => { const S = GM.sede._estado(); if (x === null) { const zz = S.zonas.find(q => /^cd_pista/.test(q.sala.id)) || S.zonas[0]; S.yo.obj.position.copy(zz.obj.position); S.zoom = 30; S.inc = 0.6; return; } S.yo.obj.position.set(x, 0, z); S.yo.camino = null; S.yaw = S.yawObj = yaw; S.zoom = zoom; S.inc = inc; if (S.panel) S.panel.style.display = 'none'; document.querySelectorAll('.sede-ayuda').forEach(e => e.remove()); }, [x, z, yaw, zoom, inc]);
    await sleep(2200); await p.screenshot({ path: path.join(DIR, n + '.png') });
  }
  const panel = await p.evaluate(() => [...document.querySelectorAll('.sede-sala .sp-accion b')].map(b => b.textContent).join(' | '));
  const anda = await p.evaluate(() => new Promise(res => { const S = GM.sede._estado(), M = GM.sede._motor(), z = S.zonas.find(q => q.sala.id === 'salir_deportiva'), zo = S.zonas[3]; S.yo.obj.position.set(z.obj.position.x, 0, z.obj.position.z - 3); const t = performance.now(); const ok = M.irA(S.yo, zo.obj.position.x, zo.obj.position.z, () => res('llega a ' + zo.sala.nombre)); if (!ok) res('sin camino'); else setTimeout(() => res('camino en ' + Math.round(performance.now() - t) + ' ms, no llega en 25 s'), 25000); }));
  const vuelta = await p.evaluate(async () => { await GM.sede._escena('calle'); await new Promise(r => setTimeout(r, 11000)); const q = GM.sede._estado().yo.obj.position; return q.x.toFixed(1) + ',' + q.z.toFixed(1); });
  console.log('panel del pabellón de entrenamiento:', panel, '| andar de la puerta a un edificio:', anda, '| vuelta a la calle en', vuelta);
  console.log('errores:', errs.length ? errs.slice(0, 6) : 'ninguno');
  await b.close();
})();
