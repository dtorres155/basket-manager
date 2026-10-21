// Sonido real: las muestras (Kenney, CC0) se cargan y suenan, los pasos salen al caminar y los efectos sustituyen a los pitidos sintéticos. Uso: node tools/audio_prueba.js (con npm run serve)
const { chromium } = require('playwright');
const { sleep, esperarEscena } = require('./ayudas');
(async () => {
  const b = await chromium.launch({ channel: 'msedge', args: ['--autoplay-policy=no-user-gesture-required'] }),
    p = await (await b.newContext({ viewport: { width: 1000, height: 800 } })).newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8080/');
  await sleep(700);
  const filas = [];
  let ok = true;
  const chk = (c, t) => {
    filas.push((c ? 'ok    ' : 'FALLA ') + t);
    if (!c) ok = false;
  };
  await p.evaluate(() => {
    const pj = GM.mods.personaje.crear();
    GM.newGame('joventut-badalona', 11, { modo: 'gestor', personaje: pj });
    GM.ui.start(document.getElementById('app'));
  });
  await p.keyboard.press('Shift');
  await sleep(2500);
  chk(await p.evaluate(() => GM.muestras.listo()), 'las muestras se han cargado');
  const n = await p.evaluate(() => Object.keys(GM.muestras.NOMBRES).filter(k => GM.muestras.tocar(k, { vol: 0.01 })).length);
  chk(n >= 15, 'suenan ' + n + ' de ' + (await p.evaluate(() => Object.keys(GM.muestras.NOMBRES).length)) + ' efectos');
  await p.evaluate(() => {
    window.__pasos = 0;
    const f = GM.muestras.paso;
    GM.muestras.paso = function () {
      window.__pasos++;
      return f.apply(this, arguments);
    };
    GM.sede.abrir(GM.state, 'calle');
  });
  chk(await esperarEscena(p, 'calle', 120000), 'calle cargada');
  await sleep(4000);
  await p.keyboard.down('w');
  await sleep(5000);
  await p.keyboard.up('w');
  console.log(
    'posición',
    JSON.stringify(
      await p.evaluate(() => {
        const o = GM.sede._estado().yo.obj.position;
        return [o.x.toFixed(1), o.z.toFixed(1)];
      })
    )
  );
  const pasos = await p.evaluate(() => window.__pasos);
  chk(pasos >= 3, 'pasos al caminar: ' + pasos);
  console.log(filas.join('\n'));
  console.log((ok && !errs.length ? 'ok' : 'FALLA') + ', errores: ' + (errs.length ? errs.slice(0, 3).join(' | ') : 'ninguno'));
  await b.close();
  process.exit(ok && !errs.length ? 0 : 1);
})();
