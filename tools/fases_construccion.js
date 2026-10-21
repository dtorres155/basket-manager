// Tiempo de cada fase al abrir una escena del mundo (texturas, geometría de la ciudad, detalle, personas, shaders...). Uso: node tools/fases_construccion.js [club] [escena=calle] [nivel=alto]   (requiere `npm run serve`)
const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const club = process.argv[2] || 'joventut-badalona',
  esc = process.argv[3] || 'calle',
  nivel = process.argv[4] || 'alto';
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }),
    p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await p.addInitScript('window.__sinAdaptar = true; window.__medirFases = true;');
  await p.goto('http://localhost:8080/');
  await p.evaluate(n => localStorage.setItem('gm1:nivel', n), nivel);
  await p.reload();
  await sleep(900);
  await p.evaluate(
    ([c, e]) => {
      GM.newGame(c, undefined, {
        modo: 'carrera',
        personaje: Object.assign(GM.mods.personaje.crear(), { nombre: 'M', apellido: 'S' }),
        carrera: { origen: 'europa', clubId: c, pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 }
      });
      GM.ui.start(document.getElementById('app'));
      GM.sede.abrir(GM.state, e);
    },
    [club, esc]
  );
  for (let i = 0; i < 80; i++) {
    await sleep(500);
    if (
      await p.evaluate(() => {
        const S = GM.sede._estado();
        return S && S.fasesAbrir && S.fasesAbrir.some(f => f[0] === 'compilar shaders');
      })
    )
      break;
  }
  const f = await p.evaluate(() => {
    const S = GM.sede._estado();
    return { abrir: S.fasesAbrir, ciudad: S.fases, poblar: S.fasesPoblar };
  });
  const imp = (nombre, l) => {
    console.log(nombre);
    (l || []).forEach((x, i) => {
      if (i) console.log('  ' + x[0].padEnd(34), String(Math.round(x[1] - l[i - 1][1])).padStart(6), 'ms');
    });
  };
  imp('Apertura de la escena', f.abrir);
  imp('Poblar la calle real', f.poblar);
  imp('Construcción de la ciudad real', f.ciudad);
  await b.close();
})();
