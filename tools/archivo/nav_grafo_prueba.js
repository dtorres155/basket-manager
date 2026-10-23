// Grafo de calles (punto 21d): tamaño y tiempo de construcción, tiempo de ruta de más de 1 km, desvío frente a la línea recta y un vecino que recorre 280 m por el grafo. Uso: node tools/nav_grafo_prueba.js [club]   (requiere `npm run serve`)
const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const club = process.argv[2] || 'joventut-badalona';
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }),
    p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => {
    if (m.type() === 'error') errs.push(m.text());
  });
  await p.goto('http://localhost:8080/');
  await sleep(800);
  await p.evaluate(c => {
    GM.newGame(c, undefined, {
      modo: 'carrera',
      personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'M', apellido: 'S' }),
      carrera: { origen: 'europa', clubId: c, pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 }
    });
    GM.ui.start(document.getElementById('app'));
    GM.sede.abrir(GM.state, 'calle');
  }, club);
  await sleep(16000);
  console.log(
    JSON.stringify(
      await p.evaluate(() => {
        const S = GM.sede._estado(),
          g = S.grafo;
        if (!g) return 'sin grafo';
        const N = g.nodos.length;
        let aristas = 0;
        g.ady.forEach(a => {
          aristas += a.length;
        });
        const rs = [];
        let desvio = 0,
          n = 0,
          largas = 0;
        const t0 = performance.now();
        for (let i = 0; i < 300; i++) {
          const a = g.nodos[(i * 7919) % N],
            b = g.nodos[(i * 104729 + 13) % N],
            d = Math.hypot(a[0] - b[0], a[1] - b[1]);
          const t = performance.now();
          const r = GM.nav.rutaGrafo(g, a, b);
          rs.push(performance.now() - t);
          if (r && d > 200) {
            let L = 0;
            for (let k = 1; k < r.length; k++) L += Math.hypot(r[k][0] - r[k - 1][0], r[k][1] - r[k - 1][1]);
            desvio += L / d;
            n++;
            if (L > 1000) largas++;
          }
        }
        rs.sort((x, y) => x - y);
        return {
          nodos: N,
          aristas: aristas / 2,
          construccionMs: +S.grafoMs.toFixed(1),
          rutaMediaMs: +(rs.reduce((x, y) => x + y, 0) / rs.length).toFixed(2),
          rutaP95Ms: +rs[Math.floor(rs.length * 0.95)].toFixed(2),
          desvioMedio: +(desvio / n).toFixed(2),
          rutasLargas: largas
        };
      })
    )
  );
  const r = await p.evaluate(async () => {
    const S = GM.sede._estado(),
      M = GM.sede.motor(),
      g = S.gente.find(x => !x.fijo && x.idV && !x.sigue);
    g.agregado = null;
    g.oculto = false;
    g.enCasa = false;
    g.dentro = false;
    const y = S.yo.obj.position;
    g.obj.position.set(y.x - 120, 0, y.z + 20);
    const dest = [y.x + 150, y.z - 40];
    const t0 = performance.now();
    window.__llegada = null;
    const ok = M.irA(g, dest[0], dest[1], () => {
      window.__llegada = (performance.now() - t0) / 1000;
    });
    return { ok, dist: Math.hypot(dest[0] - g.obj.position.x, dest[1] - g.obj.position.z) | 0 };
  });
  console.log('viaje de un vecino (aprox. 270 m):', JSON.stringify(r));
  for (let i = 0; i < 40 && !(await p.evaluate(() => window.__llegada)); i++) await sleep(5000);
  console.log('llegó en (s):', await p.evaluate(() => window.__llegada), '(a 2,1 m/s en línea recta serían ~130 s)');
  console.log('errores:', errs.length ? errs.slice(0, 5) : 'ninguno');
  await b.close();
})();
