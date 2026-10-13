// Andar más allá de 480 m (punto 18c): el jugador va andando hasta el borde del anillo de la ciudad piloto, comprobando que la rejilla cubre el radio, que el camino existe y los fps. Uso: node tools/paseo_lejano.js [club]   (requiere `npm run serve`)
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const club = process.argv[2] || 'joventut-badalona', DIR = path.join(__dirname, '..', 'capturas', 'paseo_lejano'); fs.mkdirSync(DIR, { recursive: true });
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }), p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(), errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); await p.goto('http://localhost:8080/'); await sleep(800);
  const t0 = Date.now(); await p.evaluate(c => { GM.newGame(c, undefined, { modo: 'carrera', personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'M', apellido: 'S' }), carrera: { origen: 'europa', clubId: c, pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 } }); GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, 'calle'); }, club); await sleep(16000);
  console.log(JSON.stringify(await p.evaluate(() => { const S = GM.sede._estado(); return { RW: S.RW, rejilla: S.G.W + 'x' + S.G.H, celdasM: +(S.G.W * S.G.H / 1e6).toFixed(2) }; })));
  // ruta larga con el jugador hacia el borde (varios destinos), midiendo cuánto tarda cada cálculo
  for (const [i, ang] of [0, 2.1, 4.2].entries()) {
    const r = await p.evaluate(async ang => { const S = GM.sede._estado(), RW = S.RW - 30, dest = [Math.cos(ang) * RW * 0.9, Math.sin(ang) * RW * 0.9]; const t = performance.now(); const ok = S.nav ? await S.nav.pedir([S.yo.obj.position.x, S.yo.obj.position.z], dest, 0) : null; return { dest: dest.map(Math.round), ms: +(performance.now() - t).toFixed(0), puntos: ok && ok.camino ? ok.camino.length : ok === null ? 'sin worker' : 'sin ruta', llega: ok && ok.llega }; }, ang);
    console.log('ruta', i, JSON.stringify(r));
  }
  await p.evaluate(() => { const S = GM.sede._estado(); S.yo.obj.position.set(S.RW * 0.8, 0, 0); S.foco.copy(S.yo.obj.position); }); await sleep(5000); await p.screenshot({ path: path.join(DIR, 'lejos.png') });
  console.log(JSON.stringify(await p.evaluate(() => { const i = GM.sede._estado().renderer.info; return { yo: GM.sede._estado().yo.obj.position.toArray().map(Math.round), llamadas: i.render.calls, triangulos: i.render.triangles }; })), 'errores:', errs.length ? errs.slice(0, 4) : 'ninguno'); await b.close();
})();
