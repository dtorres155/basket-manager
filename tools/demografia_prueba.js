// Demografía (punto 43) en la ciudad real: residentes, empleos y cómo se reparte la gente en la calle por horas (centro, resto y periferia). Uso: node tools/demografia_prueba.js [club]   (requiere `npm run serve`)
const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const club = process.argv[2] || 'joventut-badalona';
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }),
    p = await (await b.newContext({ viewport: { width: 1000, height: 700 } })).newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
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
  const r = await p.evaluate(() => {
    const S = GM.sede._estado(),
      D = GM.demografia,
      f = o =>
        Object.entries(o)
          .map(([k, v]) => k + ' ' + Math.round(v * 100) + ' %')
          .join(', ');
    const out = { resumen: D.resumen(S), horas: {} };
    [
      [7, 2],
      [8, 2],
      [11, 2],
      [13, 2],
      [14.2, 2],
      [18, 2],
      [20, 2],
      [22.5, 2],
      [12, 0]
    ].forEach(([h, d]) => {
      out.horas[h + (d === 0 ? ' domingo' : '')] = f(D.perfil(S, h, d));
    });
    let a = 5;
    const r = () => {
      a = (a * 1664525 + 1013904223) >>> 0;
      return a / 4294967296;
    };
    const pts = S.paseo.slice(),
      c = h => {
        let cen = 0,
          per = 0;
        for (let i = 0; i < 400; i++) {
          const q = D.elegir(S, pts, h, r, 2),
            d = Math.hypot(q[0], q[1]);
          if (d < 150) cen++;
          else if (d > 220) per++;
        }
        return { centro: cen / 4, periferia: per / 4 };
      };
    out.destinos = { 8: c(8), 13: c(13), 19: c(19) };
    return out;
  });
  console.log(JSON.stringify(r.resumen));
  Object.entries(r.horas).forEach(([h, v]) => console.log(' ', h.padEnd(12), v));
  console.log('destinos elegidos (% en el centro y en las afueras):', JSON.stringify(r.destinos));
  console.log('errores:', errs.length ? errs.slice(0, 4) : 'ninguno');
  await b.close();
})();
