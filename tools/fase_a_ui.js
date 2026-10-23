// Fase A en el navegador: apartado «Pruebas» de Ajustes, «¿Qué usas?» oculta pestañas, F8 guarda una nota y «Medir» recorre las cuatro escenas.
// Uso: node tools/fase_a_ui.js [--sin-medir]   (requiere `npm run serve`). En el navegador los informes se descargan; aquí se leen esas descargas.
const { chromium } = require('playwright');
const fs = require('fs');
const { sleep, esperar } = require('./ayudas');
(async () => {
  const b = await chromium.launch({ channel: 'msedge' }),
    ctx = await b.newContext({ viewport: { width: 1600, height: 900 }, acceptDownloads: true }),
    p = await ctx.newPage(),
    errs = [],
    filas = [];
  let ok = true;
  const chk = (c, t) => {
    filas.push((c ? 'ok    ' : 'FALLA ') + t);
    if (!c) ok = false;
  };
  p.on('pageerror', e => errs.push(e.message));
  const descargas = [];
  p.on('download', async d => {
    const f = await d.path();
    descargas.push({ nombre: d.suggestedFilename(), texto: f ? fs.readFileSync(f, 'utf8') : '' });
  });
  await p.goto('http://localhost:8080/');
  await p.waitForFunction(() => window.GM && GM.ui && GM.pruebas);
  await p.evaluate(() => {
    GM.newGame('joventut-badalona', 7, {
      modo: 'carrera',
      personaje: GM.mods.personaje.crear(),
      carrera: { origen: 'europa', clubId: 'joventut-badalona', pos: 'SG', perfil: 'tirador', nac: 'ES', age: 20 }
    });
    GM.campus.config.calidad = 'alta';
    GM.ajustes.marcarNovedades();
    GM.ui.start(document.getElementById('app'));
  });
  await sleep(500);
  // Ajustes, Pruebas
  await p.evaluate(() => GM.ajustes.abrir('pruebas'));
  await sleep(300);
  const txt = await p.evaluate(() => document.body.innerText);
  chk(/Pruebas/.test(txt) && /Medir ahora/.test(txt) && /Anotar ahora/.test(txt), 'Ajustes tiene el apartado Pruebas con sus tres herramientas');
  await p.evaluate(() => GM.ui._.cerrarModales());
  // ¿Qué usas?: quitar Colección
  const cat = await p.evaluate(() => GM.pruebas.catalogo(GM.state).map(x => x[0]));
  chk(cat.length >= 5, '«¿Qué usas?» lista las pestañas añadidas del modo carrera (' + cat.length + ')');
  const clave = cat.find(k => /coleccion/.test(k)) || cat[0];
  await p.evaluate(() => GM.pruebas.usos());
  await sleep(300);
  await p.evaluate(k => {
    const filas = [...document.querySelectorAll('.hoja .fila')];
    const nombre = GM.pruebas.catalogo(GM.state).find(x => x[0] === k)[1];
    const f = filas.find(x => x.firstChild.textContent === nombre);
    [...f.querySelectorAll('button')].find(bt => bt.textContent === 'Quitar').click();
    [...document.querySelectorAll('.hoja .acciones button')].find(bt => bt.textContent === 'Guardar').click();
  }, clave);
  await sleep(500);
  for (let i = 0; i < 40 && !descargas.some(d => d.nombre === 'usos_carrera.json'); i++) await sleep(100);
  const [pant, id] = clave.split(':');
  const sigue = await p.evaluate(([pt, i]) => GM.ui.tabsExtra(pt, GM.state).some(x => x[0] === i), [pant, id]);
  chk(!sigue, '«Quitar» oculta la pestaña ' + clave);
  chk(
    descargas.some(d => /^usos_carrera\.json$/.test(d.nombre) && JSON.parse(d.texto).marcas[clave] === 'quitar'),
    '«¿Qué usas?» guarda usos_carrera.json con la marca (' + descargas.map(d => d.nombre).join(', ') + ')'
  );
  // F8: nota
  await p.keyboard.press('F8');
  await esperar(p, () => !!document.querySelector('.hoja textarea'), null, 5000);
  await p.fill('.hoja textarea', 'El banco amarillo parece una caja');
  await p.evaluate(() => {
    [...document.querySelectorAll('.hoja .seg button')].find(bt => bt.textContent === '2').click();
    [...document.querySelectorAll('.hoja .acciones button')].find(bt => bt.textContent === 'Guardar').click();
  });
  for (let i = 0; i < 40 && !descargas.some(d => /banco amarillo/.test(d.texto)); i++) await sleep(100);
  const nota = descargas.find(d => /^\d{4}-.*\.json$/.test(d.nombre) && /banco amarillo/.test(d.texto));
  const nj = nota ? JSON.parse(nota.texto) : {};
  chk(!!nota && nj.nota === 2 && nj.modo === 'carrera' && nj.pantalla === 'inicio', 'F8 guarda la nota con texto, nota y contexto');
  // Medir
  if (!process.argv.includes('--sin-medir')) {
    const t0 = Date.now();
    const inf = await p.evaluate(() => GM.pruebas.medir());
    const res = (inf && inf.resultados) || [];
    chk(res.length === 4 && res.every(r => !r.error && r.fps > 0 && r.llamadas > 0), 'Medir recorre las cuatro escenas (' + Math.round((Date.now() - t0) / 1000) + ' s)');
    res.forEach(r =>
      filas.push(
        '      ' +
          r.nombre +
          ': ' +
          (r.error ||
            r.cargaMs +
              ' ms hasta verse, ' +
              r.listoMs +
              ' ms hasta ir fluida, ' +
              r.fps +
              ' fps, ' +
              r.llamadas +
              ' llamadas, ' +
              Math.round(r.triangulos / 1000) +
              ' mil triángulos, gente ' +
              r.gente)
      )
    );
    chk(await p.evaluate(() => !GM.sede.activa() && /Rendimiento/.test(document.body.innerText)), 'al acabar se cierra el mundo y sale el informe');
    await sleep(800);
    chk(
      descargas.some(d => /^\d{4}-.*\.json$/.test(d.nombre) && /resultados/.test(d.texto)),
      'el informe de rendimiento se guarda'
    );
  }
  console.log(filas.join('\n'));
  console.log((ok && !errs.length ? 'ok' : 'FALLA') + ', errores: ' + (errs.length ? errs.slice(0, 4).join(' | ') : 'ninguno'));
  await b.close();
  process.exit(ok && !errs.length ? 0 : 1);
})();
