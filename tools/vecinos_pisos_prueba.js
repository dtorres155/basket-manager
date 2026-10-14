// Pisos de vecinos de la ciudad real: cada portal abre su propio piso (colores y vecinos distintos) y al salir apareces en ese portal. Uso: node tools/vecinos_pisos_prueba.js
const { chromium } = require('playwright'); const { sleep, esperarEscena, irA } = require('./ayudas');
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }), p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(), errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)); });
  await p.goto('http://localhost:8080/'); await sleep(700);
  await p.evaluate(() => { const pj = GM.mods.personaje.crear(); pj.nombre = 'Marc'; GM.newGame('joventut-badalona', undefined, { modo: 'carrera', personaje: pj, carrera: { pos: 'SG', perfil: 'tirador', nac: 'ES', origen: 'europa', agente: 'equilibrado', clubId: 'joventut-badalona' } }); GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state); });
  await esperarEscena(p); await irA(p, 'calle'); const n = await p.evaluate(() => GM.sede._estado().zonas.filter(z => /^vecino/.test(z.sala.id)).length); let ok = n >= 2, filas = ['portales: ' + n];
  const vistos = new Set();
  for (let k = 0; k < Math.min(n, 6); k++) {
    await p.evaluate(k => { const S = GM.sede._estado(), z = S.zonas.find(z => z.sala.id === 'vecino' + k); z.sala.acciones(GM.state)[0].fn(); }, k); await sleep(400); await esperarEscena(p, 'interior');
    const r = await p.evaluate(() => { const S = GM.sede._estado(); return { nombre: S.interiorNombre, vec: S.vecinoVar, gente: S.gente.map(g => g.rol).join('|'), suelo: S.mundo.children.length }; }); vistos.add(r.vec + r.gente); filas.push('portal ' + k + ': ' + JSON.stringify(r));
    await p.screenshot({ path: 'capturas/interiores_ciudad/vecino' + k + '.png' });
    await irA(p, 'calle'); const cerca = await p.evaluate(k => { const S = GM.sede._estado(), z = S.zonas.find(z => z.sala.id === 'vecino' + k), y = S.yo.obj.position; return Math.hypot(z.obj.position.x - y.x, z.obj.position.z - y.z); }, k); filas.push('  vuelve a ' + cerca.toFixed(1) + ' m del portal'); if (cerca > 6) ok = false;
  }
  if (vistos.size < Math.min(n, 6)) ok = false; console.log(filas.join('\n')); console.log((ok ? 'ok' : 'FALLA') + ', errores: ' + (errs.length ? errs.slice(0, 3).join(' | ') : 'ninguno')); await b.close(); process.exit(ok && !errs.length ? 0 : 1);
})();
