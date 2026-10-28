// Puntos 80 a 82 en el navegador: ajustes (seis apartados), misiones de inicio y ayuda contextual, música por escena, informe de errores y novedades. Uso: node tools/tanda35_ui.js (con npm run serve)
const { chromium } = require('playwright');
const { sleep, esperarEscena } = require('./ayudas');
const fs = require('fs');
(async () => {
  fs.mkdirSync('capturas/tanda35', { recursive: true });
  const b = await chromium.launch({ channel: 'msedge', args: ['--autoplay-policy=no-user-gesture-required'] }),
    ctx = await b.newContext({ viewport: { width: 1000, height: 900 } }),
    p = await ctx.newPage(),
    errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => {
    if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 160));
  });
  await p.goto('http://localhost:8080/');
  await sleep(700);
  const filas = [];
  let ok = true;
  const chk = (c, t) => {
    filas.push((c ? 'ok    ' : 'FALLA ') + t);
    if (!c) ok = false;
  };
  const texto = () => p.evaluate(() => document.body.innerText),
    shot = n => p.screenshot({ path: 'capturas/tanda35/' + n + '.png', fullPage: true });
  await p.evaluate(() => {
    try {
      localStorage.clear();
    } catch (e) {}
  });
  await p.reload();
  await sleep(700);
  await p.evaluate(() => {
    const pj = GM.mods.personaje.crear();
    pj.nombre = 'Marc';
    GM.newGame('joventut-badalona', 11, { modo: 'gestor', personaje: pj });
    GM.ui.start(document.getElementById('app'));
    GM.ui.navegar('inicio');
  });
  await sleep(900);
  let x = await texto();
  chk(/Misiones de inicio/.test(x), 'Inicio muestra las misiones de inicio');
  chk(/Para qué sirve esto/.test(x), 'ayuda contextual de Inicio');
  await shot('inicio_misiones');
  await p.evaluate(() => {
    GM.ui._.ui.tab.plantilla = 'plantilla';
    GM.ui.navegar('plantilla');
  });
  await sleep(500);
  x = await texto();
  chk(/Para qué sirve esto/.test(x) && /Tus jugadores/.test(x), 'ayuda contextual de Plantilla');
  chk(await p.evaluate(() => GM.misiones.progreso(GM.state).hechas >= 1), 'abrir Plantilla cuenta como misión');
  // ajustes
  for (const [ap, re] of [
    ['graficos', /Calidad gráfica/],
    ['sonido', /Música/],
    ['controles', /Restablecer teclas/],
    ['idioma', /Daltonismo/],
    ['datos', /Informe de errores/],
    ['novedades', /Versión 0.9.152/]
  ]) {
    await p.evaluate(a => {
      GM.ui._.cerrarModales();
      GM.ajustes.abrir(a);
    }, ap);
    await sleep(300);
    x = await texto();
    chk(re.test(x), 'ajustes: ' + ap);
    await shot('ajustes_' + ap);
  }
  await p.evaluate(() => GM.ui._.cerrarModales());
  // informe de errores
  await p.evaluate(() => console.error('error de prueba de la herramienta'));
  const inf = await p.evaluate(async () => JSON.parse(await GM.registro.informe()));
  chk(
    inf.partida && inf.partida.club === 'joventut-badalona' && inf.errores.some(e => /prueba de la herramienta/.test(e.m)) && /^bm-|sin caché/.test(inf.version),
    'el informe lleva versión, partida y errores'
  );
  // música por escena (el contexto de audio arranca con un gesto)
  await p.mouse.click(500, 450);
  await p.evaluate(() => GM.sede.abrir(GM.state, 'calle'));
  chk(await esperarEscena(p, 'calle', 120000), 'calle cargada');
  await sleep(1200);
  const m1 = await p.evaluate(() => GM.musica.estado());
  chk(m1.actual === 'calle' && m1.contexto, 'música de la calle: ' + JSON.stringify(m1));
  await p.evaluate(() => GM.sede.cerrar && GM.sede.cerrar());
  await sleep(500);
  const m2 = await p.evaluate(() => GM.musica.estado());
  chk(m2.actual === null, 'la música para al salir del mundo');
  console.log(filas.join('\n'));
  console.log((ok ? 'ok' : 'FALLA') + ', errores: ' + (errs.length ? errs.slice(0, 5).join(' | ') : 'ninguno'));
  await b.close();
  process.exit(ok ? 0 : 1);
})();
