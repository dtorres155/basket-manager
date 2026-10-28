// Tanda 37 en el navegador: tarjeta «Qué ha pasado» tras avanzar, aviso de contratos que vencen, autoguardado en segundo plano. Uso: node tools/tanda37_ui.js (con npm run serve)
const { chromium } = require('playwright');
const { sleep } = require('./ayudas');
const fs = require('fs');
(async () => {
  fs.mkdirSync('capturas/tanda37', { recursive: true });
  const b = await chromium.launch({ channel: 'msedge' }),
    p = await (await b.newContext({ viewport: { width: 1000, height: 900 } })).newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8080/');
  await sleep(700);
  await p.evaluate(() => {
    try {
      localStorage.setItem('gm1:novedades', '0.9.999');
    } catch (e) {}
  });
  const filas = [];
  let ok = true;
  const chk = (c, t) => {
    filas.push((c ? 'ok    ' : 'FALLA ') + t);
    if (!c) ok = false;
  };
  const texto = () => p.evaluate(() => document.body.innerText);
  await p.evaluate(() => {
    GM.newGame('joventut-badalona', 11, { modo: 'gestor', personaje: GM.mods.personaje.crear() });
    GM.state.misiones = { hechas: {}, cont: {}, oculta: true };
    GM.ui.start(document.getElementById('app'));
    GM.state.vistaInicio = GM.state.fecha;
    GM.ui.navegar('inicio');
  });
  await sleep(500);
  let x = await texto();
  chk(!/Qué ha pasado/.test(x), 'sin novedades no sale «Qué ha pasado»');
  chk(/Contratos que vencen/.test(x), 'aviso de contratos que vencen en Inicio');
  await p.evaluate(() => {
    for (let i = 0; i < 3; i++) GM.mods.competiciones.jugarDia(GM.state);
    GM.ui.navegar('inicio');
  });
  await sleep(500);
  x = await texto();
  chk(/Qué ha pasado/.test(x), 'tras avanzar días sale «Qué ha pasado»');
  await p.screenshot({ path: 'capturas/tanda37/inicio_resumen.png', fullPage: true });
  await p.evaluate(() => {
    const s = [...document.querySelectorAll('section')].find(e => /Qué ha pasado/.test(e.textContent));
    [...s.querySelectorAll('button')].find(b => /Entendido/.test(b.textContent)).click();
  });
  await sleep(400);
  x = await p.evaluate(() => document.querySelector('[data-pantalla=inicio]').innerText);
  const k = x.indexOf('Qué ha pasado');
  chk(
    k < 0,
    '«Entendido» oculta la tarjeta' +
      (k >= 0
        ? ' [' +
          x
            .slice(Math.max(0, k - 60), k + 80)
            .split('\n')
            .join(' ') +
          ']'
        : '')
  );
  const ms = await p.evaluate(() => {
    const t = performance.now();
    GM.mods.guardado.guardarAuto(0);
    return Math.round(performance.now() - t);
  });
  chk(ms < 120, 'el autoguardado no bloquea la interfaz (' + ms + ' ms)');
  // el autoguardado comprime en un Worker: se espera a que escriba (con la máquina cargada tarda más de 2 s)
  const escrito = await p
    .waitForFunction(() => !!localStorage.getItem('gm1:slot0'), null, { timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  chk(escrito, 'el autoguardado llega a escribir la partida');
  await p.evaluate(() => GM.i18n.setIdioma('ca'));
  await p.evaluate(() => GM.ui.navegar('inicio'));
  await sleep(500);
  x = await texto();
  chk(/Contractes que venen|Contracte/.test(x), 'el aviso de contratos sale en catalán');
  console.log(filas.join('\n'));
  console.log((ok && !errs.length ? 'ok' : 'FALLA') + ', errores: ' + (errs.length ? errs.slice(0, 3).join(' | ') : 'ninguno'));
  await b.close();
  process.exit(ok && !errs.length ? 0 : 1);
})();
