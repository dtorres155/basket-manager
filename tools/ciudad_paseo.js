// Capturas de la ciudad ampliada: barrios con tus viviendas (compra varias), colegio, hospital, estación y campus; entra en una casa
// y vuelve a su puerta. Uso: node tools/ciudad_paseo.js [club]   (requiere `npm run serve`)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const DIR = path.join(__dirname, '..', 'capturas', 'ciudad'); fs.mkdirSync(DIR, { recursive: true });
const CLUB = process.argv[2] || 'joventut-badalona', sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 760 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  const info = await p.evaluate(club => {
    const pj = Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' });
    GM.newGame(club, undefined, { modo: 'carrera', personaje: pj, carrera: { origen: 'europa', clubId: club, pos: 'SG', perfil: 'tirador', nac: 'ES', agente: 'equilibrado' } });
    const st = GM.state; st.carrera.dinero = 9000; GM.mods.hogar.nivel = () => 5; GM.campus.config.calidad = 'alta';   // solo para las capturas
    [['piso', 3], ['atico', 1], ['casa', 4], ['mansion', 4], ['estudio', 3]].forEach(([t, b]) => GM.mods.carrera.comprarVivienda(st, b, t, 'compra'));
    GM.ui.start(document.getElementById('app')); GM.sede.abrir(st, 'calle');
    return GM.mods.hogar.viviendas(st).map(v => v.nombre + ' (' + v.barrioNombre + ')').join(', ');
  }, CLUB);
  await sleep(14000);
  const t0 = Date.now(), res = await p.evaluate(() => { const S = GM.sede._estado(); return { zonas: S.zonas.map(z => z.sala.id).join(','), puertas: Object.keys(S.puertas || {}).join(','), distritos: (S.distritos || []).length, celdas: S.G.W * S.G.H }; });
  console.log('viviendas:', info); console.log('zonas:', res.zonas); console.log('puertas:', res.puertas, '| barrios:', res.distritos, '| celdas:', res.celdas);
  const vistas = [['1_oeste', -100, 0, 0.3, 60, 0.9], ['2_este', 95, 0, 2.6, 60, 0.9], ['3_norte', 0, -60, 0, 70, 0.95], ['4_chalets', 75, 10, 0.2, 30, 0.6], ['5_ensanche', 20, -36, 3.0, 30, 0.6]];
  for (const [n, x, z, yaw, zoom, inc] of vistas) {
    await p.evaluate(([x, z, yaw, zoom, inc]) => { const S = GM.sede._estado(); S.yo.obj.position.set(x, 0, z); S.yo.camino = null; S.yaw = S.yawObj = yaw; S.zoom = zoom; S.inc = inc; if (S.panel) S.panel.style.display = 'none'; document.querySelectorAll('.sede-ayuda').forEach(e => e.remove()); }, [x, z, yaw, zoom, inc]);
    await sleep(2200); await p.screenshot({ path: path.join(DIR, n + '.png') });
  }
  // andar de la plaza a la estación (camino largo) y medir el cálculo
  const camino = await p.evaluate(() => { const S = GM.sede._estado(), M = GM.sede._motor(); S.yo.obj.position.set(-130, 0, 4.8); const t = performance.now(); const ok = M.irA(S.yo, 137, 4.6, () => {}); return (ok ? 'camino hallado' : 'sin camino') + ' en ' + Math.round(performance.now() - t) + ' ms'; });
  // entrar en la casa del este y volver a la calle por su puerta
  const casa = await p.evaluate(async () => { const S = GM.sede._estado(), z = S.zonas.find(z => /^casa_/.test(z.sala.id) && z.obj.position.x > 40); if (!z) return 'sin casa en el este'; S.yo.camino = null; await GM.sede._escena(z.sala.irA); await new Promise(r => setTimeout(r, 5000)); const n = GM.sede._estado().casaNombre; await GM.sede._escena('calle'); await new Promise(r => setTimeout(r, 12000)); const S2 = GM.sede._estado(), q = S2.yo.obj.position; return n + ' -> vuelta a la calle en ' + q.x.toFixed(1) + ',' + q.z.toFixed(1) + ' (puerta ' + z.obj.position.x.toFixed(1) + ',' + z.obj.position.z.toFixed(1) + ')'; });
  const fps = await p.evaluate(() => new Promise(res => { let f = 0; const t0 = performance.now(); (function k(t) { f++; if (t - t0 < 2000) requestAnimationFrame(k); else res(Math.round(f * 1000 / (t - t0))); })(t0); }));
  const calls = await p.evaluate(() => GM.sede._estado().renderer.info.render.calls);
  console.log('camino largo:', camino, '| casa:', casa, '| fps:', fps, '| llamadas:', calls);
  console.log('errores:', errs.length ? errs.slice(0, 6) : 'ninguno');
  await b.close();
})();
