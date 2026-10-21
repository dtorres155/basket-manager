// Puntos 70 a 74 en el navegador: galería de componentes (claro, noche y móvil), tabla ordenable de la plantilla, HUD del mundo, idioma catalán, accesibilidad y tifo del clásico. Uso: node tools/tanda33_ui.js (con npm run serve)
const { chromium } = require('playwright');
const { sleep, esperarEscena } = require('./ayudas');
const fs = require('fs');
(async () => {
  fs.mkdirSync('capturas/tanda33', { recursive: true });
  const b = await chromium.launch({ channel: 'msedge' }),
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
    shot = n => p.screenshot({ path: 'capturas/tanda33/' + n + '.png', fullPage: true });
  const nueva = (modo, club) =>
    p.evaluate(
      ([modo, club]) => {
        GM.ui._.ui.pantalla = 'inicio';
        const pj = GM.mods.personaje.crear();
        pj.nombre = 'Marc';
        GM.newGame(club || 'joventut-badalona', 11, { modo, personaje: pj });
        GM.ui.start(document.getElementById('app'));
        GM.ui.navegar('inicio');
      },
      [modo, club]
    );
  await nueva('gestor');
  // galería
  await p.evaluate(() => GM.ui.navegar('muestra'));
  await sleep(600);
  let x = await texto();
  chk(/Sistema de diseño|Galería/.test(x), 'galería de componentes');
  await shot('galeria_claro');
  await p.evaluate(() => GM.diseno.setTema('noche'));
  await sleep(300);
  await shot('galeria_noche');
  await p.setViewportSize({ width: 390, height: 844 });
  await sleep(300);
  await shot('galeria_movil');
  const sc = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2);
  chk(!sc, 'galería sin scroll horizontal en móvil');
  await p.setViewportSize({ width: 1000, height: 900 });
  await p.evaluate(() => GM.diseno.setTema('dia'));
  // plantilla con tabla ordenable
  await p.evaluate(() => {
    GM.ui._.ui.tab.plantilla = 'plantilla';
    GM.ui.navegar('plantilla');
  });
  await sleep(600);
  const ord = await p.evaluate(() => !!document.querySelector('input[placeholder="Buscar jugador"]'));
  chk(ord, 'plantilla con tabla ordenable');
  await shot('plantilla');
  // cesiones y ascensos (LEB Oro y Plata)
  await p.evaluate(() => {
    GM.ui._.ui.tab.plantilla = 'cesiones';
    GM.ui.navegar('plantilla');
  });
  await sleep(600);
  x = await texto();
  chk(/Ceder a un joven/.test(x) && /Club de destino/.test(x), 'cesiones: candidatos y destino');
  await shot('cesiones');
  await p.evaluate(() => {
    GM.ui._.ui.tab.club = 'ascensos';
    GM.ui.navegar('club');
  });
  await sleep(600);
  x = await texto();
  chk(/LEB Oro/.test(x) && /Palencia/.test(x), 'ascensos: tabla de LEB Oro con Palencia');
  await shot('ascensos');
  // finanzas con evolución
  await p.evaluate(() => {
    const st = GM.state;
    for (let i = 0; i < 20; i++) {
      st.fecha = GM.util.addDays(st.fecha, 1);
      GM.bus.emit('dia:avanzado', {});
    }
    GM.ui._.ui.tab.finanzas = 'resumen';
    GM.ui.navegar('finanzas');
  });
  await sleep(500);
  x = await texto();
  chk(/Evolución reciente/.test(x), 'finanzas: evolución reciente');
  // idioma catalán
  await p.evaluate(() => {
    GM.i18n.setIdioma('ca');
    GM.ui.navegar('inicio');
  });
  await sleep(600);
  x = await texto();
  chk(/Mercat|Plantilla|Calendari/.test(x), 'catalán en el menú');
  await shot('catalan');
  await p.evaluate(() => {
    GM.i18n.setIdioma('en');
    GM.ui.navegar('inicio');
  });
  await sleep(600);
  x = await texto();
  chk(/Market|Squad|Calendar/.test(x), 'inglés en el menú');
  await shot('ingles');
  await p.evaluate(() => {
    GM.i18n.setIdioma('es');
    GM.ui.navegar('inicio');
  });
  // accesibilidad
  await p.evaluate(() => GM.ui._.accesModal());
  await sleep(400);
  x = await texto();
  chk(/Daltonismo/.test(x) && /Controles/.test(x) && /Idioma/.test(x), 'panel de accesibilidad con idioma, daltonismo y controles');
  await shot('accesibilidad');
  await p.evaluate(() => GM.ui._.cerrarModales());
  await p.evaluate(() => GM.accesibilidad.set('dalton', 'deuteranopia'));
  chk(await p.evaluate(() => document.documentElement.dataset.dalton === 'deuteranopia'), 'daltonismo aplicado');
  await p.evaluate(() => GM.accesibilidad.set('dalton', 'ninguno'));
  // HUD del mundo
  await p.evaluate(() => GM.sede.abrir(GM.state, 'calle'));
  chk(await esperarEscena(p, 'calle', 120000), 'calle cargada');
  await sleep(1500);
  const hud = await p.evaluate(() => ({
    capa: !!document.querySelector('.hm'),
    bru: !!document.querySelector('.hm [class*=brujula], .hm-brujula'),
    reloj: !!document.querySelector('.hm [class*=reloj], .hm-reloj')
  }));
  chk(hud.capa && hud.bru && hud.reloj, 'HUD del mundo: ' + JSON.stringify(hud));
  await p.screenshot({ path: 'capturas/tanda33/hud_calle.png' });
  await p.evaluate(() => {
    GM.sede._estado().velTiempo = 4;
  });
  const h0 = await p.evaluate(() => GM.sede._estado().hora);
  await sleep(1500);
  chk(await p.evaluate(h => GM.sede._estado().hora !== h, h0), 'el reloj avanza con velocidad x4');
  await p.evaluate(() => GM.sede.cerrar && GM.sede.cerrar());
  await sleep(500);
  // tifo del clásico
  await nueva('gestor', 'real-madrid');
  await p.evaluate(() => {
    const st = GM.state,
      g = st.calendario.find(x => x.local === 'real-madrid');
    GM.mods.directo.abrir(st, Object.assign({}, g, { local: 'real-madrid', visitante: 'fc-barcelona' }), { control: true, onFin: () => {} });
  });
  await sleep(1500);
  await p.evaluate(() => {
    [...document.querySelectorAll('.directo button')].find(b => /Empezar el partido|Siguiente cuarto/.test(b.textContent)).click();
  });
  await sleep(4000);
  await p.screenshot({ path: 'capturas/tanda33/directo_tifo.png' });
  console.log(filas.join('\n'));
  console.log((ok ? 'ok' : 'FALLA') + ', errores: ' + (errs.length ? errs.slice(0, 5).join(' | ') : 'ninguno'));
  await b.close();
  process.exit(ok && !errs.length ? 0 : 1);
})();
