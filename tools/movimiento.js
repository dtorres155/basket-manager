// Movimiento del personaje: destinos al azar (también dentro de edificios o inalcanzables) en una escena.
// Comprueba que siempre hay camino, que no se pisa ninguna celda bloqueada y cuánto se tarda en calcular.
// Uso: node tools/movimiento.js [calle|deportiva|pueblo|sede] [n]   (requiere `npm run serve`)
const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms)), escena = process.argv[2] || 'calle', N = +process.argv[3] || 40;
(async () => {
  const b = await chromium.launch({ channel: process.env.CANAL || 'msedge' });
  const p = await (await b.newContext({ viewport: { width: 900, height: 700 } })).newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(process.env.URL || 'http://localhost:8080/'); await sleep(800);
  await p.evaluate(escena => {
    const pj = Object.assign(GM.mods.personaje.crear(), { nombre: 'Marc', apellido: 'Soler' });
    if (escena === 'pueblo') GM.newGame('joventut-badalona', undefined, { modo: 'carrera', personaje: pj, carrera: { origen: 'europa', clubId: 'joventut-badalona', pos: 'SG', perfil: 'tirador', nac: 'ES', agente: 'equilibrado' } });
    else GM.newGame('joventut-badalona', undefined, { modo: 'gestor', personaje: pj });
    GM.ui.start(document.getElementById('app')); GM.sede.abrir(GM.state, escena);
  }, escena);
  await sleep(12000);
  const r = await p.evaluate(async N => {
    const S = GM.sede._estado(), M = GM.sede._motor(), G = S.G, yo = S.yo, out = { n: 0, sinCamino: 0, pisaBloqueo: 0, lejos: 0, ms: 0, msMax: 0 };
    let a = 12345; const rnd = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
    const libre = (x, z) => { const [i, j] = G.celda(x, z); return G.libre(i, j); };
    for (let k = 0; k < N; k++) {
      const tx = G.x0 + rnd() * G.W * G.c, tz = G.z0 + rnd() * G.H * G.c, t0 = performance.now(), ok = M.irA(yo, tx, tz, null), dt = performance.now() - t0;
      out.ms += dt; out.msMax = Math.max(out.msMax, dt); out.n++;
      if (!ok || !yo.camino) { out.sinCamino++; continue; }
      // recorre el camino a saltos de 0,1 m comprobando que todo se puede pisar
      let px = yo.obj.position.x, pz = yo.obj.position.z, malo = false;
      for (const [x, z] of yo.camino) { const d = Math.hypot(x - px, z - pz), n = Math.ceil(d / 0.1); for (let s = 1; s <= n; s++) if (!libre(px + (x - px) * s / n, pz + (z - pz) * s / n)) malo = true; px = x; pz = z; }
      if (malo) out.pisaBloqueo++;
      // el final queda cerca de lo pedido si lo pedido era pisable
      if (libre(tx, tz) && Math.hypot(px - tx, pz - tz) > 1) out.lejos++;
      yo.obj.position.set(px, 0, pz); yo.camino = null;
    }
    out.ms = Math.round(out.ms / out.n * 10) / 10; out.msMax = Math.round(out.msMax); return out;
  }, N);
  console.log(escena + ': ' + JSON.stringify(r));
  console.log('errores:', errs.length ? errs.slice(0, 4) : 'ninguno');
  await b.close();
})();
