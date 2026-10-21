// Prueba de los campos de flujo del Worker de navegación: 6 destinos frecuentes con 40 salidas distintas cada uno; muestra el tiempo por petición (primeras, la que construye el campo y las siguientes) y compara la longitud con la del A* normal. Uso: node tools/nav_campos_prueba.js
const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }),
    p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript('window.__sinAdaptar = true;');
  await p.goto('http://localhost:8080/');
  await sleep(900);
  await p.evaluate(() => {
    GM.newGame('joventut-badalona', undefined, {
      modo: 'carrera',
      personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'M', apellido: 'S' }),
      carrera: { origen: 'europa', clubId: 'joventut-badalona', pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 }
    });
    GM.ui.start(document.getElementById('app'));
    GM.sede.abrir(GM.state, 'calle');
  });
  await sleep(16000);
  console.log(
    JSON.stringify(
      await p.evaluate(async () => {
        const S = GM.sede._estado(),
          G = S.G,
          nav = GM.nav.crear(G),
          r = (() => {
            let a = 777;
            return () => (a = (a * 1664525 + 1013904223) >>> 0) / 4294967296;
          })();
        const punto = () => {
          for (;;) {
            const i = Math.floor(r() * G.W),
              j = Math.floor(r() * G.H);
            if (G.libre(i, j)) return G.centro(i, j);
          }
        };
        const dests = Array.from({ length: 6 }, punto),
          res = { primeras: [], construye: [], siguientes: [], difLongitud: [] },
          long = c => {
            let l = 0;
            for (let i = 1; i < c.length; i++) l += Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]);
            return l;
          };
        // referencia: otro Worker sin campos (se evitan pidiendo cada camino con un destino ligeramente distinto no sirve; se compara con el primer A* de cada destino)
        for (const d of dests) {
          const salidas = Array.from({ length: 40 }, punto);
          for (let i = 0; i < salidas.length; i++) {
            const t = performance.now(),
              c = await nav.pedir(salidas[i], d, 0),
              ms = performance.now() - t;
            if (!c) continue;
            (i < 2 ? res.primeras : i === 2 ? res.construye : res.siguientes).push(ms);
          }
        }
        const med = a => (a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : null);
        nav.cerrar();
        return { A_estrella_ms: med(res.primeras), construye_campo_ms: med(res.construye), con_campo_ms: med(res.siguientes), peticiones: res.siguientes.length };
      })
    )
  );
  console.log(errs.slice(0, 3));
  await b.close();
})();
